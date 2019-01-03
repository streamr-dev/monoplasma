const MonoplasmaOperator = require("../../src/monoplasmaOperator")
const assert = require("assert")
const sinon = require("sinon")

describe("monoplasmaOperator", () => {
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
                tokens,
            }
        }
    }
    function initWeb3(blockNumber, tokenEvents, monoplasmaContractEvents) {
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
            allEvents: () => {
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
    function getOperator(savedState, currentRootChainBlock, tokenEvents, monoplasmaContractEvents) {
        const web3 = initWeb3(currentRootChainBlock, tokenEvents, monoplasmaContractEvents)
        const startState = {
            balances: savedState.balances,
            rootChainBlock: savedState.rootChainBlock,
            contractAddress: "contractAddress",
        }
        const error = (e, ...args) => {
            console.error(e.stack, args)
            process.exit(1)
        }
        function saveState(state) {
            console.log("Saving state:")
            console.log(state)
        }
        return new MonoplasmaOperator(web3, startState, saveState, console.log, error)
    }

    const savedState = {
        balances: [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
        ],
        rootChainBlock: 5,
    }

    it("start() calls playback() with correct block numbers", async () => {
        const operator = getOperator(savedState, 10, [], [])
        const spyPlayback = sinon.spy(operator, "playback")
        await operator.start()
        assert(spyPlayback.withArgs(6, 10).calledOnce)
    })

    it("Monoplasma member is saved to the state", async () => {
        const operator = getOperator(savedState, 10, [], [getRecipientAddedEvent("0x5ffe8050112448ed2e4409be47e1a50ebac0b299")])
        const spySaveState = sinon.spy(operator, "saveState")
        await operator.start()
        assert(spySaveState.calledOnce)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
            { address: "0x5ffe8050112448ed2e4409be47e1a50ebac0b299", earnings: "0" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
        ]
        assert.deepStrictEqual(spySaveState.args[0][0].balances, newBalances)
    })

    it("Monoplasma member is removed from the state", async () => {
        const operator = getOperator(savedState, 10, [], [getRecipientRemovedEvent("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2")])
        const spySaveState = sinon.spy(operator, "saveState")
        await operator.start()
        assert(spySaveState.calledOnce)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
        ]
        assert.deepStrictEqual(spySaveState.args[0][0].balances, newBalances)
    })

    it("Tokens are shared between members and the state is updated", async () => {
        const operator = getOperator(savedState, 10, [], [getTransferEvent(100)])
        const spySaveState = sinon.spy(operator, "saveState")
        await operator.start()
        assert(spySaveState.calledOnce)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "100" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "70" },
        ]
        assert.deepStrictEqual(spySaveState.args[0][0].balances, newBalances)
    })
})
