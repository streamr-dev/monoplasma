const BN = require("bn.js")

const MerkleTree = require("../../src/merkletree")
const MonoplasmaMember = require("../../src/member")

const RootChainContract = artifacts.require("./Monoplasma.sol")
const ERC20Mintable = artifacts.require("openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const FailTokenJson = require("./FailToken.json")
const FailToken = new web3.eth.Contract(FailTokenJson.abi)

const { assertEqual, assertFails, assertEvent } = require("../utils/web3Assert")
const increaseTime = require("../utils/increaseTime")
const {utils: { toWei }} = require("web3")

const MonoplasmaState = require("../../src/state")
const MonoplasmaWatcher = require("../../src/watcher")
const JoinPartChannel = require("../../src/joinPartChannel")
const FileStore = require("../../src/fileStore")
const fileStore = new FileStore("/tmp/mono", console.log)
let currentBlockNumber = 1

contract("Monoplasma", accounts => {
    let token
    let rootchain
    const producer = accounts[1]
    const anotherProducer = accounts[2]
    const admin = accounts[9]
    const blockFreezePeriodSeconds = 1000
    const plasma = new MonoplasmaState(0, [], { saveBlock: () => {} }, admin, 0)
    const joinPartChannel = new JoinPartChannel()
    let watcher
    before(async () => {
        token = await ERC20Mintable.new({from: admin, gas: 4000000})
        rootchain = await RootChainContract.new(token.address, blockFreezePeriodSeconds, 0, {from: admin, gas: 4000000})
        const startState = {
            contractAddress: rootchain.address,
            tokenAddress: token.address,
            blockFreezeSeconds: 1
        }
        watcher = new MonoplasmaWatcher(web3, joinPartChannel, startState, fileStore)
        watcher.start()

        // simulate added members, would be performed by the MonoplasmaWatcher
        plasma.addMember(producer)
        plasma.addMember(anotherProducer)
    })

    // simulate added revenue: tokens appear in the contract, MonoplasmaWatcher updates the MonoplasmaState
    async function addRevenue(tokens) {
        await token.mint(rootchain.address, tokens, {from: admin})
        plasma.addRevenue(tokens)
        return publishBlock()
    }

    // simulate a block being published by the MonoplasmaOperator
    async function publishBlock(rootHash, operatorAddress) {
        const root = rootHash || plasma.getRootHash()
        const blockNumber = currentBlockNumber++
        const resp = await rootchain.commit(blockNumber, root, "ipfs lol", {from: operatorAddress || admin})
        return resp.logs.find(L => L.event === "BlockCreated").args
    }

    describe("commit & blockHash", () => {
        it("correctly saves and retrieves a block timestamp", async () => {
            const root = "0x1234000000000000000000000000000000000000000000000000000000000000"
            const resp = await rootchain.commit(123, root, "ipfs lol", {from: admin})
            const event = resp.logs.find(L => L.event === "BlockCreated")
            const timestamp = (await web3.eth.getBlock(event.blockNumber)).timestamp
            assertEqual(event.args.blockNumber, 123)
            assertEqual(event.args.rootHash, root)
            assertEqual(await rootchain.blockHash(123), root)
            assertEqual(await rootchain.blockTimestamp(123), timestamp)
        })
    })

    describe("Admin", () => {
        it("admin can set fee and receives correct fee", async () => {
            const adminFee = toWei(".5", "ether")
            assertEvent(await rootchain.setAdminFee(adminFee, {from: admin}), "AdminFeeChanged", [adminFee])
            assertEqual(await rootchain.adminFee(), adminFee)
            assertEvent(await rootchain.setAdminFee(0, {from: admin}), "AdminFeeChanged", [0])
        })

        it("non-admin can't set fee", async () => {
            await assertFails(rootchain.setAdminFee(123, {from: producer}), "error_onlyOwner")
        })

        it("can't set fee higher than 100%", async () => {
            await assertFails(rootchain.setAdminFee(toWei("2", "ether"), {from: admin}), "error_adminFee")
        })

        it("ownership can be transferred", async () => {
            const newAdmin = accounts[8]
            await rootchain.transferOwnership(newAdmin, {from: admin})
            assertEvent(await rootchain.claimOwnership({from: newAdmin}), "OwnershipTransferred", [admin, newAdmin])

            await rootchain.transferOwnership(admin, {from: newAdmin})
            assertEvent(await rootchain.claimOwnership({from: admin}), "OwnershipTransferred", [newAdmin, admin])
        })

        it("can publish blocks", async () => {
            const block = await publishBlock()
            assertEqual(await rootchain.blockHash(block.blockNumber), block.rootHash)
        })

        it("can change the operator", async () => {
            const operator = accounts[3]
            assertEvent(await rootchain.setOperator(operator, {from: admin}), "OperatorChanged", [operator])
            const root = plasma.getRootHash()
            const blockNumber = currentBlockNumber++
            await assertFails(rootchain.commit(blockNumber, root, "fail", {from: admin}), "error_notPermitted")
            const block = await publishBlock(root, operator)
            assertEqual(await rootchain.blockHash(block.blockNumber), block.rootHash)
        })

        // for the lack of per-testcase cleanup in mocha, made another testcase for cleanup...
        it("changes the operator back", async () => {
            const operator = await rootchain.operator()
            if (operator !== admin) {
                assertEvent(await rootchain.setOperator(admin, {from: admin}), "OperatorChanged", [admin])
            }
            const root = plasma.getRootHash()
            const blockNumber = currentBlockNumber++
            await assertFails(rootchain.commit(blockNumber, root, "fail", {from: accounts[3]}), "error_notPermitted")
        })
    })

    describe("Member", () => {
        let block
        it("can withdraw earnings (two step: prove, then withdraw)", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assertEqual(await token.balanceOf(producer), 0)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await rootchain.prove(block.blockNumber, producer, earnings, proof, {from: producer})
            await rootchain.withdraw(earnings, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })

        it("fails if member tries later with an old (though valid) proof", async () => {
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assert(await rootchain.proofIsCorrect(block.blockNumber, producer, earnings, proof))
            await assertFails(rootchain.prove(block.blockNumber, producer, earnings, proof, {from: admin, gas: 4000000}), "error_oldEarnings")
        })

        it("can withdraw earnings on behalf of another", async () => {
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            assertEqual(await token.balanceOf(anotherProducer), 0)
            await rootchain.withdrawAllFor(anotherProducer, block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(anotherProducer), earnings)
        })

        it("can withdraw earnings a second time", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })

        it("can donate earnings to another", async () => {
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const withdrawable = new BN(earnings).sub(withdrawn)
            const balanceBefore = await token.balanceOf(producer)
            await rootchain.withdrawAllTo(producer, block.blockNumber, earnings, proof, {from: anotherProducer})
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable))
        })

        it("can not withdraw earnings before freeze period is over", async () => {
            const block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            await assertFails(rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer}), "error_frozen")
        })

        it("can not withdraw wrong amount", async () => {
            const block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = { earnings: 50000 }
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer}), "error_proof")
        })

        it("can not withdraw with bad proof", async () => {
            const block = await addRevenue(1000)
            const proof = [
                "0x3e6ef21b9ffee12d86b9ac8713adaba889b551c5b1fbd3daf6c37f62d7f162bc",
                "0x3f2ed4f13f5c1f5274cf624eb1d079a15c3666c97c5403e6e8cf9cea146a8608",
            ]
            const { earnings } = plasma.getMember(producer)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer}), "error_proof")
        })

        it("can withdraw with a signature", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const withdrawable = new BN(earnings).sub(withdrawn)
            const balanceBefore = await token.balanceOf(producer)

            const message = producer + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)

            await rootchain.withdrawAllToSigned(producer, block.blockNumber, earnings, proof, signature, withdrawn, {from: admin})
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable))
        })

        it("can not withdraw zero tokens", async () => {
            await assertFails(rootchain.withdraw(0, {from: producer}), "error_zeroWithdraw")
        })

        it("can not withdraw too many tokens", async () => {
            await assertFails(rootchain.withdraw(10000000, {from: producer}), "error_overdraft")
        })

        it("withdraw fails with error_transfer if token transfer returns false", async () => {
            const token2 = await FailToken.deploy({data: FailTokenJson.bytecode}).send({from: admin, gas: 4000000})
            const rootchain2 = await RootChainContract.new(token2.options.address, blockFreezePeriodSeconds, 0, {from: admin, gas: 4000000})
            await token2.methods.transfer(rootchain2.address, toWei("1000", "ether")).send({from: admin})
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            const root = plasma.getRootHash()
            await rootchain2.commit(1, root, "ipfs lol", {from: admin})
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(rootchain2.withdrawAll(1, earnings, proof, {from: producer}), "error_transfer")
        })

        // see /stealAllTokens route of routers/revenueDemo.js
        it("proving fails with error_missingBalance if there's not enough tokens to cover the purported earnings", async () => {
            const fakeTokens = toWei("1000", "ether")
            const fakeMemberList = [new MonoplasmaMember("thief", producer, fakeTokens)]
            const fakeTree = new MerkleTree(fakeMemberList)
            const fakeProof = ["0x0000000000000000000000000000000000000000000000000000000000000000"]
            const root = fakeTree.getRootHash()
            const block = await publishBlock(root)
            assert(await rootchain.proofIsCorrect(block.blockNumber, producer, fakeTokens, fakeProof))
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(rootchain.prove(block.blockNumber, producer, fakeTokens, fakeProof, {from: admin, gas: 4000000}), "error_missingBalance")
        })
    })
})
