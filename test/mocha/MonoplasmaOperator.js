/*global describe it */

const MonoplasmaOperator = require("../../src/monoplasmaOperator")
const assert = require("assert")
const sinon = require("sinon")
const sleep = require("../utils/sleep-promise")

const log = () => {} // console.log

const initialBlock = {
    blockNumber: 3,
    members: [
        { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
        { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
    ],
    totalEarnings: 70,
}

function getMockWeb3(blockNumber, events) {
    const web3 = { eth: {}, utils: {}, transferListeners: {} }
    web3.utils.isAddress = () => true
    web3.eth.getCode = () => Promise.resolve("")
    web3.eth.Contract = function(abi, address) {
        this.address = address
    }
    web3.eth.Contract.prototype.methods = {
        token: () => ({ call: () => "tokenAddress" }),
        blockFreezeSeconds: () => ({ call: () => 1000 }),
        recordBlock: () => ({ send: async () => {} })
    }
    web3.eth.Contract.prototype.getPastEvents = event => events && events[event] || []
    web3.eth.Contract.prototype.events = {
        Transfer: () => ({ on: (eventCode, func) => {
            if (!web3.transferListeners[eventCode]) { web3.transferListeners[eventCode] = [] }
            web3.transferListeners[eventCode].push(func)
        }})
    }
    web3.eth.getBlockNumber = () => blockNumber

    web3.mockTransfer = async (...args) => {
        for (const func of web3.transferListeners.data) {
            func(...args)
            await sleep(1)  // give the async handler(s) time to finish
        }
    }

    return web3
}

function getMockChannel() {
    class MockChannel {
        startServer() {}
        listen() {}
        close() {}
        publish(topic, addresses) { this[topic](addresses) }
        on(topic, cb) { this[topic] = cb }
    }
    return new MockChannel()
}

function getState() {
    return {
        lastBlockNumber: 5,
        lastPublishedBlock: 3,
        contractAddress: "contractAddress",
    }
}

function getMockStore(storeObject) {
    const store = {}
    store.saveState = async state => {
        log(`Saving state: ${JSON.stringify(state)}`)
        storeObject.lastSavedState = state
    }
    store.loadState = async () => {
        const state = getState()
        log(`Loading state: ${state}`)
        return state
    }
    store.saveBlock = async (data) => {
        log(`Saving block ${data.blockNumber}: ${JSON.stringify(data)}`)
        storeObject.lastSavedBlock = data
    }
    store.loadBlock = async () => initialBlock
    store.blockExists = async () => true
    store.loadEvents = async () => []
    store.saveEvents = async () => {}
    return store
}

function error(e, ...args) {
    console.error(e.stack, args)
    process.exit(1)
}

describe("monoplasmaOperator", () => {
    it("start() calls playback() with correct block numbers", async () => {
        const web3 = getMockWeb3(10, [], [])
        const channel = getMockChannel()
        const operator = new MonoplasmaOperator(web3, channel, getState(), getMockStore({}), log, error)
        const spyPlayback = sinon.spy(operator, "playback")
        await operator.start()
        assert(spyPlayback.withArgs(6, 10).calledOnce)
    })

    it("Monoplasma member is saved to the state", async () => {
        const store = { initialBlock }
        const web3 = getMockWeb3(10, [], [])
        const channel = getMockChannel()
        const operator = new MonoplasmaOperator(web3, channel, getState(), getMockStore(store), log, error)
        await operator.start()
        channel.publish("join", ["0x5ffe8050112448ed2e4409be47e1a50ebac0b299"])
        await web3.mockTransfer({
            event: "Transfer",
            blockNumber: 11,
            returnValues: { value: 30 },
        })
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "60" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "30" },
            { address: "0x5ffe8050112448ed2e4409be47e1a50ebac0b299", earnings: "10" },
        ]
        assert.deepStrictEqual(store.lastSavedBlock.members, newBalances)
    })

    it("Monoplasma member is removed from the state", async () => {
        const store = {}
        const web3 = getMockWeb3(10, [], [])
        const channel = getMockChannel()
        const operator = new MonoplasmaOperator(web3, channel, getState(), getMockStore(store), log, error)
        await operator.start()
        channel.publish("part", ["0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"])
        await web3.mockTransfer({
            event: "Transfer",
            blockNumber: 11,
            returnValues: { value: 10 },
        })
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "60" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
        ]
        assert.deepStrictEqual(store.lastSavedBlock.members, newBalances)
    })

    it("Tokens are shared between members and the state is updated during playback", async () => {
        const store = {}
        const web3 = getMockWeb3(10, {
            Transfer: [{ event: "Transfer", returnValues: { value: 100 }}]
        }, [])
        const channel = getMockChannel()
        const operator = new MonoplasmaOperator(web3, channel, getState(), getMockStore(store), log, error)
        await operator.start()
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "100" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "70" },
        ]
        assert.deepStrictEqual(operator.plasma.members.map(m => m.toObject()), newBalances)
    })

    // TODO: test channel (Join/Part events) playback, too
})
