// BalanceVerifier cannot be instantiated so "minimal viable implementation" Airdrop is used instead
const Airdrop = artifacts.require("./Airdrop.sol")
const DemoToken = artifacts.require("./DemoToken.sol")

const FailTokenJson = require("./FailToken.json")
const FailToken = new web3.eth.Contract(FailTokenJson.abi)

const { assertEqual, assertFails } = require("../utils/web3Assert")

const MonoplasmaMember = require("../../src/member")
const MonoplasmaState = require("../../src/state")

const admin = "0x0000000000000000000000000000000000000001"

const plasma = new MonoplasmaState(0, [], { saveBlock: () => {} }, admin, 0)

const MerkleTree = require("../../src/merkletree")

let token
let airdrop
contract("BalanceVerifier", accounts => {
    const recipient = accounts[1]
    const anotherRecipient = accounts[2]
    const admin = accounts[9]
    before(async () => {
        token = await DemoToken.new("BalanceVerifier test", "TOK", {from: admin, gas: 4000000})
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
        const resp = await airdrop.commit(blockNumber, root, "ipfs lol", {from: admin})
        return resp.logs.find(L => L.event === "NewCommit").args
    }

    describe("commit & committedHash", () => {
        it("correctly publishes and retrieves a block hash", async () => {
            const root = "0x1234000000000000000000000000000000000000000000000000000000000000"
            const resp = await airdrop.commit(123, root, "ipfs lol", {from: admin})
            const block = resp.logs.find(L => L.event === "NewCommit").args
            assertEqual(block.blockNumber, 123)
            assertEqual(block.rootHash, root)
            assertEqual(await airdrop.committedHash(123), root)
        })
        it("won't let operator overwrite a root hash (with same block number)", async () => {
            await airdrop.commit(124, "0x1234", "ipfs lol", {from: admin})
            await airdrop.commit(125, "0x2345", "ipfs lol", {from: admin})
            await assertFails(airdrop.commit(125, "0x3456", "ipfs lol", {from: admin}), "error_overwrite")
        })
        it("won't let non-admin commit", async () => {
            await assertFails(airdrop.commit(128, "0x3456", "ipfs lol", {from: recipient}), "error_notPermitted")
        })
    })

    describe("prove & proofIsCorrect & calculateRootHash", () => {
        // see test/merklepath.js
        let block, member, proof, root
        it("correctly validate a proof", async () => {
            plasma.addRevenue(1000)
            const memberObj = plasma.getMember(anotherRecipient)
            member = MonoplasmaMember.fromObject(memberObj)
            root = plasma.tree.getRootHash()
            proof = plasma.getProof(anotherRecipient)
            block = await publishBlock(root)
            // check that block was published correctly
            assertEqual(block.rootHash, root)
            // check that contract calculates root correctly
            const hash = "0x" + MerkleTree.hash(member.toHashableString()).toString("hex")
            assertEqual(await airdrop.calculateRootHash(hash, proof), root)
            // check that contract checks proof correctly
            assert(await airdrop.proofIsCorrect(block.blockNumber, member.address, member.earnings, proof), "Contract says: Bad proof")
            // check that contract proves earnings correctly (freeze period)
            assertEqual(await token.balanceOf(member.address), 0)
            await airdrop.prove(block.blockNumber, member.address, member.earnings, proof, {from: admin, gas: 4000000})
            assertEqual(await token.balanceOf(member.address), member.earnings)
        })

        it("fails if you try later with an old (though valid) proof", async () => {
            await assertFails(airdrop.prove(block.blockNumber, member.address, member.earnings, proof, {from: admin, gas: 4000000}), "error_oldEarnings")
        })

        it("fails with error_blockNotFound if block is bad", async () => {
            await assertFails(airdrop.prove(12354678, member.address, member.earnings, proof, {from: admin, gas: 4000000}), "error_blockNotFound")
        })

        it("fails with error_proof if proof is bad", async () => {
            await assertFails(airdrop.prove(block.blockNumber, member.address, member.earnings, [], {from: admin, gas: 4000000}), "error_proof")
        })

        it("fails with error_transfer if token transfer returns false", async () => {
            const token2 = await FailToken.deploy({data: FailTokenJson.bytecode}).send({from: admin, gas: 4000000})
            const airdrop2 = await Airdrop.new(token2.options.address, {from: admin, gas: 4000000})
            await airdrop2.commit(1, root, "ipfs lol", {from: admin})
            assert(await airdrop2.proofIsCorrect(1, member.address, member.earnings, proof))
            await assertFails(airdrop2.prove(1, member.address, member.earnings, proof, {from: admin, gas: 4000000}), "error_transfer")
        })
    })
})
