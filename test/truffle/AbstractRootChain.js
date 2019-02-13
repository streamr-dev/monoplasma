/*global contract artifacts assert before describe it web3 */

// AbstractRootChain cannot be instantiated so "minimal viable implementation" Airdrop is used instead
const Airdrop = artifacts.require("./Airdrop.sol")
const ERC20Mintable = artifacts.require("openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const { assertEqual, assertFails } = require("../utils/web3Assert")

const MonoplasmaMember = require("../../src/monoplasmaMember")
const Monoplasma = require("../../src/monoplasma")
const plasma = new Monoplasma()

const MerkleTree = require("../../src/merkletree")

let token
let airdrop
contract("AbstractRootChain", accounts => {
    const recipient = accounts[1]
    const anotherRecipient = accounts[2]
    const admin = accounts[9]
    before(async () => {
        token = await ERC20Mintable.new({from: admin, gas: 4000000})
        airdrop = await Airdrop.new(token.address, {from: admin, gas: 4000000})
        await token.mint(airdrop.address, 1000000, {from: admin})

        // these should be performed by the watcher
        plasma.addMember(recipient)
        plasma.addMember(anotherRecipient)
        plasma.addRevenue(1000)
    })

    async function publishBlock(rootHash) {
        const root = rootHash || plasma.getRootHash()
        const blockNumber = await web3.eth.getBlockNumber()
        const resp = await airdrop.recordBlock(blockNumber, root, "ipfs lol", {from: admin})
        return resp.logs.find(L => L.event === "BlockCreated").args
    }

    describe("recordBlock & blockHash", () => {
        it("correctly publishes and retrieves a block hash", async () => {
            const root = "0x1234000000000000000000000000000000000000000000000000000000000000"
            const resp = await airdrop.recordBlock(123, root, "ipfs lol", {from: admin})
            const block = resp.logs.find(L => L.event === "BlockCreated").args
            assertEqual(block.blockNumber, 123)
            assertEqual(block.rootHash, root)
            assertEqual(await airdrop.blockHash(123), root)
        })
        it("won't let operator overwrite a root hash (with same block number)", async () => {
            await airdrop.recordBlock(124, "0x1234", "ipfs lol", {from: admin})
            await airdrop.recordBlock(125, "0x2345", "ipfs lol", {from: admin})
            assertFails(airdrop.recordBlock(125, "0x3456", "ipfs lol", {from: admin}))
        })
    })

    describe("proveSidechainBalance & proofIsCorrect & calculateRootHash", () => {
        // see test/merklepath.js
        it("correctly validate a proof", async () => {
            plasma.addRevenue(1000)
            const memberObj = plasma.getMember(anotherRecipient)
            const member = MonoplasmaMember.fromObject(memberObj)
            const root = plasma.tree.getRootHash()
            const proof = plasma.getProof(anotherRecipient)
            const block = await publishBlock(root)
            // check that block was published correctly
            assertEqual(block.rootHash, root)
            // check that contract calculates root correctly
            const hash = "0x" + MerkleTree.hash(member.toHashableString()).toString("hex")
            assertEqual(await airdrop.calculateRootHash(hash, proof), root)
            // check that contract checks proof correctly
            assert(await airdrop.proofIsCorrect(block.blockNumber, member.address, member.earnings, proof))
            // check that contract proves earnings correctly (freeze period)
            assertEqual(await token.balanceOf(member.address), 0)
            await airdrop.proveSidechainBalance(block.blockNumber, member.address, member.earnings, proof, {from: admin, gas: 4000000})
            assertEqual(await token.balanceOf(member.address), member.earnings)
        })
    })
})
