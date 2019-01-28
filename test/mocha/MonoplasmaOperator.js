/*global describe it */

const MonoplasmaOperator = require("../../src/monoplasmaOperator")
const assert = require("assert")
const sinon = require("sinon")

const log = () => {} //console.log

function getRecipientAddedEvent(address) {
    return {
        event: "RecipientAdded",
        returnValues: {
            recipient: address,
        }
    }
}

function getRecipientRemovedEvent(address) {
    return {
        event: "RecipientRemoved",
        returnValues: {
            recipient: address,
        }
    }
}

function getTransferEvent(tokens) {
    return {
        event: "Transfer",
        returnValues: {
            value: tokens,
        }
    }
}

function getMockWeb3(blockNumber, tokenEvents, monoplasmaContractEvents) {
    const web3 = { eth: {}, utils: {} }
    web3.utils.isAddress = () => true
    web3.eth.getCode = () => Promise.resolve("")
    web3.eth.Contract = function(abi, address) {
        this.address = address
    }
    web3.eth.Contract.prototype.methods = {
        token: sinon.stub().returns({
            call: () => "tokenAddress"
        })
    }
    web3.eth.Contract.prototype.getPastEvents = function() {
        if (this.address === "contractAddress") {
            return monoplasmaContractEvents
        } else if (this.address === "tokenAddress") {
            return tokenEvents
        }
    }
    web3.eth.Contract.prototype.events = {
        Transfer: () => {
            const listener = {}
            listener.on = (eventCode, func) => {
                listener.eventCode = func
            }
            return listener
        },
        RecipientAdded: () => {
            const listener = {}
            listener.on = (eventCode, func) => {
                listener.eventCode = func
            }
            return listener
        },
        RecipientRemoved: () => {
            const listener = {}
            listener.on = (eventCode, func) => {
                listener.eventCode = func
            }
            return listener
        }
    }
    web3.eth.getBlockNumber = () => blockNumber
    return web3
}

function getState() {
    return {
        balances: [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
        ],
        rootChainBlock: 5,
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
    store.saveBlock = async (members, blockNumber) => {
        log(`Saving block ${blockNumber}: ${JSON.stringify(members)}`)
        storeObject.lastSavedBlock = members
    }
    store.loadBlock = async blockNumber => {
        const state = getState()
        log(`Loading block ${blockNumber}: ${state.balances}`)
        return state.balances
    }
    store.blockExists = async blockNumber => {
        log(`Checking block ${blockNumber} exists, answering yes`)
        return true
    }
    return store
}

function error(e, ...args) {
    console.error(e.stack, args)
    process.exit(1)
}

describe("monoplasmaOperator", () => {
    it("start() calls playback() with correct block numbers", async () => {
        const web3 = getMockWeb3(10, [], [])
        const operator = new MonoplasmaOperator(web3, getState(), getMockStore({}), log, error)
        const spyPlayback = sinon.spy(operator, "playback")
        await operator.start()
        assert(spyPlayback.withArgs(6, 10).calledOnce)
    })

    it("Monoplasma member is saved to the state", async () => {
        const store = {}
        const web3 = getMockWeb3(10, [], [getRecipientAddedEvent("0x5ffe8050112448ed2e4409be47e1a50ebac0b299")])
        const operator = new MonoplasmaOperator(web3, getState(), getMockStore(store), log, error)
        await operator.start()
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
            { address: "0x5ffe8050112448ed2e4409be47e1a50ebac0b299", earnings: "0" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
        ]
        assert.deepStrictEqual(store.lastSavedState.balances, newBalances)
    })

    it("Monoplasma member is removed from the state", async () => {
        const store = {}
        const web3 = getMockWeb3(10, [], [getRecipientRemovedEvent("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2")])
        const operator = new MonoplasmaOperator(web3, getState(), getMockStore(store), log, error)
        await operator.start()
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
        ]
        assert.deepStrictEqual(store.lastSavedState.balances, newBalances)
    })

    it("Tokens are shared between members and the state is updated", async () => {
        const store = {}
        const web3 = getMockWeb3(10, [], [getTransferEvent(100)])
        const operator = new MonoplasmaOperator(web3, getState(), getMockStore(store), log, error)
        await operator.start()
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "100" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "70" },
        ]
        assert.deepStrictEqual(store.lastSavedState.balances, newBalances)
    })
})
