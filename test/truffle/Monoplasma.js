
const RootChainContract = artifacts.require("./Monoplasma.sol")
const ERC20Mintable = artifacts.require("openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const { assertEqual, assertFails, assertEvent } = require("../utils/web3Assert")
const increaseTime = require("../utils/increaseTime")

const MonoplasmaState = require("../../src/state")

let currentBlockNumber = 1

contract("Monoplasma", accounts => {
    let token
    let rootchain
    const producer = accounts[1]
    const anotherProducer = accounts[2]
    const admin = accounts[9]
    const blockFreezePeriodSeconds = 1000
    const plasma = new MonoplasmaState(0, [], { saveBlock: () => {} },admin,0)
    before(async () => {
        token = await ERC20Mintable.new({from: admin, gas: 4000000})
        rootchain = await RootChainContract.new(token.address, blockFreezePeriodSeconds, {from: admin, gas: 4000000})

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
    async function publishBlock(rootHash, operator) {
        const root = rootHash || plasma.getRootHash()
        const blockNumber = currentBlockNumber++
        const resp = await rootchain.commit(blockNumber, root, "ipfs lol", {from: operator || admin})
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
        it("can withdraw earnings", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assertEqual(await token.balanceOf(producer), 0)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })

        it("can withdraw earnings for another", async () => {
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            assertEqual(await token.balanceOf(anotherProducer), 0)
            await rootchain.withdrawAllFor(anotherProducer, block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(anotherProducer), earnings)
        })

        it("can withdraw earnings a second time", async () => {
            const block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            await increaseTime(blockFreezePeriodSeconds + 1)
            await rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
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
    })
})
