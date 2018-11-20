const Community = artifacts.require("./ManagedRootChain.sol")
const MintableToken = artifacts.require("zeppelin-solidity/contracts/token/ERC20/MintableToken.sol")

const { assertEqual, assertFails, increaseTime } = require("./testHelpers")

const SortedMap = require("collections/sorted-map")
const Monoplasma = require("../src/monoplasma")

const MerkleTree = require("../src/merkletree")

contract("ManagedRootChain", accounts => {
    let market
    let token
    let community
    const producer = accounts[1]
    const anotherProducer = accounts[2]
    const nonMember = accounts[5]
    const marketAdmin = accounts[8]
    const admin = accounts[9]
    const blockFreezePeriodSeconds = 1000
    const plasma = new Monoplasma()
    before(async () => {
        token = await MintableToken.new({from: marketAdmin, gas: 4000000})
        market = await Marketplace.new(token.address, marketAdmin, {from: marketAdmin, gas: 4700000})
        community = await Community.new(market.address, blockFreezePeriodSeconds, {from: admin, gas: 4000000})
        await community.addProducer(producer, {from: admin, gas: 4000000})
        await community.addProducer(anotherProducer, {from: admin, gas: 4000000})
        await token.mint(community.address, 1000000, {from: marketAdmin})

        // these should be performed by the watcher
        plasma.addMember(producer)
        plasma.addMember(anotherProducer)
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
        const rootChainBlockNumber = await getBlockNumber()
        const resp = await community.recordBlock(rootChainBlockNumber, root, "ipfs lol", {from: admin})
        return resp.logs.find(L => L.event === "BlockCreated").args
    }

    describe("Admin", () => {
        it("can publish blocks", async () => {
            const block = await publishBlock()
            assertEqual(await community.blockHash(block.rootChainBlockNumber), block.rootHash)
        })
    })

    describe("Member", () => {
        it("can withdraw earnings", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assertEqual(await token.balanceOf(producer), 0)
            await community.withdrawAll(block.rootChainBlockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })
        it("can not withdraw earnings before freeze period is over", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            const proof = plasma.getProof(producer)
            await assertFails(community.withdrawAll(block.rootChainBlockNumber, 500, proof, {from: producer}))
        })
        it("can not withdraw wrong amount", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(producer)
            await assertFails(community.withdrawAll(block.rootChainBlockNumber, 50000, proof))
        })
        it("can not withdraw with bad proof", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(community.withdrawAll(block.rootChainBlockNumber, 500, [
                "0x3e6ef21b9ffee12d86b9ac8713adaba889b551c5b1fbd3daf6c37f62d7f162bc",
                "0x3f2ed4f13f5c1f5274cf624eb1d079a15c3666c97c5403e6e8cf9cea146a8608",
            ], {from: producer}))
        })
    })

    describe("AbstractRootChain", () => {
        // see test/merklepath.js
        it("proveSidechainBalance & proofIsCorrect & calculateRootHash correctly validate a proof", async () => {
            const members = new SortedMap(accounts.map(address => [
                address, { address, earnings: 100 },
            ]))
            const tree = new MerkleTree(members)
            const path = tree.getPath(nonMember)
            const root = tree.getRootHash()
            const block = await publishBlock(root)
            // check that block was published correctly
            assertEqual(block.rootHash, root)
            // check that contract calculates root correctly
            const hash = "0x" + MerkleTree.forTesting.hashMember(members.get(nonMember)).toString("hex")
            assertEqual(await community.calculateRootHash(hash, path), root)
            // check that contract checks proof correctly
            assert(await community.proofIsCorrect(block.rootChainBlockNumber, nonMember, 100, path))
            // check that contract proves earnings correctly (freeze period)
            assertEqual(await community.balanceOf(nonMember), 0)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await community.proveSidechainBalance(block.rootChainBlockNumber, nonMember, 100, path)
            assertEqual(await community.balanceOf(nonMember), 100)
        })
    })
})
