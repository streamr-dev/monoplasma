
const RootChainContract = artifacts.require("./Monoplasma.sol")
const ERC20Mintable = artifacts.require("openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const { assertEqual, assertFails } = require("../utils/web3Assert")
const { increaseTime } = require("../utils/increaseTime")

const MonoplasmaState = require("../../src/state")

contract("MonoplasmaState", accounts => {
    let token
    let rootchain
    const producer = accounts[1]
    const anotherProducer = accounts[2]
    const admin = accounts[9]
    const blockFreezePeriodSeconds = 1000
    const plasma = new MonoplasmaState(0, [], { saveBlock: () => {} })
    before(async () => {
        token = await ERC20Mintable.new({from: admin, gas: 4000000})
        rootchain = await RootChainContract.new(token.address, blockFreezePeriodSeconds, {from: admin, gas: 4000000})
        await token.mint(rootchain.address, 1000000, {from: admin})

        // these would be performed by the MonoplasmaWatcher
        plasma.addMember(producer)
        plasma.addMember(anotherProducer)
        plasma.addRevenue(1000)
    })

    async function publishBlock(rootHash) {
        const root = rootHash || plasma.getRootHash()
        const blockNumber = await web3.eth.getBlockNumber()
        const resp = await rootchain.commit(blockNumber, root, "ipfs lol", {from: admin})
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
    })

    describe("Member", () => {
        it("can withdraw earnings", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assertEqual(await token.balanceOf(producer), 0)
            await rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })
        it("can not withdraw earnings before freeze period is over", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            const proof = plasma.getProof(producer)
            await assertFails(rootchain.withdrawAll(block.blockNumber, 500, proof, {from: producer}))
        })
        it("can not withdraw wrong amount", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(producer)
            await assertFails(rootchain.withdrawAll(block.blockNumber, 50000, proof))
        })
        it("can not withdraw with bad proof", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAll(block.blockNumber, 500, [
                "0x3e6ef21b9ffee12d86b9ac8713adaba889b551c5b1fbd3daf6c37f62d7f162bc",
                "0x3f2ed4f13f5c1f5274cf624eb1d079a15c3666c97c5403e6e8cf9cea146a8608",
            ], {from: producer}))
        })
    })
})
