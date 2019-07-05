const assert = require("assert")
const sinon = require("sinon")
const MonoplasmaOperator = require("../../src/operator")

const getMockStore = require("../utils/mockStore")
const MockChannel = require("../utils/mockChannel")
const getMockWeb3 = require("../utils/mockWeb3")

const log = () => {} // console.log
function error(e, ...args) {
    console.error(e.stack, args)
    process.exit(1)
}

const initialBlock = {
    blockNumber: 3,
    members: [
        { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
        { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
    ],
    totalEarnings: 70,
}

const startState = {
    lastBlockNumber: 5,
    lastPublishedBlock: 3,
    contractAddress: "0x0000000000000000000000000000000000000001",
    operatorAddress: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1"
}

describe("MonoplasmaOperator", () => {
    it("start() calls playback() with correct block numbers", async () => {
        const web3 = getMockWeb3(10)
        const channel = new MockChannel()
        const store = getMockStore(startState, initialBlock, log)
        const operator = new MonoplasmaOperator(web3, channel, startState, store, log, error)
        const spyPlayback = sinon.spy(operator, "playback")
        await operator.start()
        assert(spyPlayback.withArgs(6, 10).calledOnce)
    })

    it("Monoplasma member is saved to the state", async () => {
        const web3 = getMockWeb3(10)
        const channel = new MockChannel()
        const store = getMockStore(startState, initialBlock, log)
        const operator = new MonoplasmaOperator(web3, channel, startState, store, log, error)
        await operator.start()
        channel.publish("join", ["0x5ffe8050112448ed2e4409be47e1a50ebac0b299"])
        await web3.mockTransfer(30)
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "60" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "30" },
            { address: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1", earnings: "0", name: "admin" },
            { address: "0x5ffe8050112448ed2e4409be47e1a50ebac0b299", earnings: "10" },
        ]
        assert.deepStrictEqual(store.lastSavedBlock.members, newBalances)
    })

    it("Monoplasma member is removed from the state", async () => {
        const web3 = getMockWeb3(10)
        const channel = new MockChannel()
        const store = getMockStore(startState, initialBlock, log)
        const operator = new MonoplasmaOperator(web3, channel, startState, store, log, error)
        await operator.start()
        channel.publish("part", ["0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"])
        await web3.mockTransfer(10)
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "60" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
            { address: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1", earnings: "0", name: "admin" },
        ]
        assert.deepStrictEqual(store.lastSavedBlock.members, newBalances)
    })

    it("Tokens are shared between members and the state is updated during playback", async () => {
        const web3 = getMockWeb3(10, {
            Transfer: [{ event: "Transfer", returnValues: { value: 100 }}]
        }, [])
        const channel = new MockChannel()
        const store = getMockStore(startState, initialBlock, log)
        const operator = new MonoplasmaOperator(web3, channel, startState, store, log, error)
        await operator.start()
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "100" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "70" },
            { address: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1", earnings: "0", name: "admin" },
        ]
        assert.deepStrictEqual(operator.plasma.members.map(m => m.toObject()), newBalances)
    })

    it("Admin fee changes are replayed correctly", () => {

    })

    // TODO: test channel (Join/Part events) playback, too
})
