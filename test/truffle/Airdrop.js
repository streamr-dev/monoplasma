const Airdrop = artifacts.require("./Airdrop.sol")
const ERC20Mintable = artifacts.require("openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const { assertEqual, assertFails, increaseTime } = require("./testHelpers")

const Monoplasma = require("../../src/monoplasma")
const plasma = new Monoplasma()

const SortedMap = require("collections/sorted-map")
const MerkleTree = require("../../src/merkletree")

const blockFreezePeriodSeconds = 1000

let market
let token
let airdrop
contract("Airdrop", accounts => {
    const recipient = accounts[1]
    const anotherRecipient = accounts[2]
    const admin = accounts[9]
    before(async () => {
        token = await ERC20Mintable.new({from: admin, gas: 4000000})
        airdrop = await Airdrop.new(token.address, blockFreezePeriodSeconds, {from: admin, gas: 4000000})
        await token.mint(airdrop.address, 1000000, {from: admin})

        // these should be performed by the watcher
        plasma.addMember(recipient)
        plasma.addMember(anotherRecipient)
        plasma.addRevenue(1000)
    })

    // TODO: upgrade to latest truffle and hence web3 1.0, get rid of this kind of wrappers...
    async function getBlockNumber() {
        return new Promise(done => {
            web3.eth.getBlockNumber((err, blockNum) => {
                done(blockNum)
            })
        })
    }

    async function publishBlock(rootHash) {
        const root = rootHash || plasma.getRootHash()
        const rootChainBlockNumber = await web3.eth.getBlockNumber()
        const resp = await airdrop.recordBlock(rootChainBlockNumber, root, "ipfs lol", {from: admin})
        return resp.logs.find(L => L.event === "BlockCreated").args
    }

    describe("Recipient", () => {
        it("can withdraw earnings", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(recipient)
            const { earnings } = plasma.getMember(recipient)
            assertEqual(await token.balanceOf(recipient), 0)
            await airdrop.proveSidechainBalance(block.rootChainBlockNumber, recipient, earnings, proof)
            assertEqual(await token.balanceOf(recipient), earnings)
        })
        it("can not withdraw earnings before freeze period is over", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            const proof = plasma.getProof(recipient)
            const { earnings } = plasma.getMember(recipient)
            await assertFails(airdrop.proveSidechainBalance(block.rootChainBlockNumber, recipient, earnings, proof))
        })
        it("can not withdraw wrong amount", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(recipient)
            const { earnings } = plasma.getMember(recipient)
            await assertFails(airdrop.proveSidechainBalance(block.rootChainBlockNumber, recipient, 100000, proof))
        })
        it("can not withdraw with bad proof", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const { earnings } = plasma.getMember(recipient)
            await assertFails(airdrop.proveSidechainBalance(block.rootChainBlockNumber, recipient, earnings, [
                "0x3e6ef21b9ffee12d86b9ac8713adaba889b551c5b1fbd3daf6c37f62d7f162bc",
                "0x3f2ed4f13f5c1f5274cf624eb1d079a15c3666c97c5403e6e8cf9cea146a8608",
            ]))
        })
    })

    describe("AbstractRootChain", () => {
        // see test/merklepath.js
        it("proveSidechainBalance & proofIsCorrect & calculateRootHash correctly validate a proof", async () => {
            const members = new SortedMap(accounts.map(address => [
                address, { address, earnings: 100 },
            ]))
            const tester = accounts[5]
            const tree = new MerkleTree(members)
            const path = tree.getPath(tester)
            const root = tree.getRootHash()
            const block = await publishBlock(root)
            // check that block was published correctly
            assertEqual(block.rootHash, root)
            // check that contract calculates root correctly
            const hash = "0x" + MerkleTree.forTesting.hashMember(members.get(tester)).toString("hex")
            assertEqual(await airdrop.calculateRootHash(hash, path), root)
            // check that contract checks proof correctly
            assert(await airdrop.proofIsCorrect(block.rootChainBlockNumber, tester, 100, path))
            // check that contract proves earnings correctly (freeze period)
            assertEqual(await token.balanceOf(tester), 0)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await airdrop.proveSidechainBalance(block.rootChainBlockNumber, tester, 100, path)
            assertEqual(await token.balanceOf(tester), 100)
        })
    })
})
