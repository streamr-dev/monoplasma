const sleep = require("../utils/sleep-promise")

module.exports = function getMockWeb3(bnum, pastEvents) {
    const web3 = {
        eth: {},
        utils: {},
        transferListeners: {},
        blockListeners: {},
        pastEvents: Object.assign({
            Transfer: [],
            BlockCreated: [],
        }, pastEvents)
    }
    web3.eth.getBlockNumber = () => bnum

    web3.utils.isAddress = () => true
    web3.eth.getCode = () => Promise.resolve("")

    web3.eth.Contract = class {
        constructor(abi, address) {
            this.address = address
        }
        getPastEvents(event) {
            return web3.pastEvents[event]
        }
    }
    web3.eth.Contract.prototype.methods = {
        token: () => ({ call: () => "tokenAddress" }),
        blockFreezeSeconds: () => ({ call: () => 1000 }),
        commit: (...args) => ({ send: async () => {
            console.log(`Got ${args}, sleeping...`)
            // simulate tx lag
            sleep(1000).then(() => {
                web3.mockCommit(...args)
            })
        } })
    }
    web3.eth.Contract.prototype.events = {
        Transfer: () => ({ on: (eventCode, func) => {
            if (!web3.transferListeners[eventCode]) { web3.transferListeners[eventCode] = [] }
            web3.transferListeners[eventCode].push(func)
        }}),
        BlockCreated: () => ({ on: (eventCode, func) => {
            if (!web3.blockListeners[eventCode]) { web3.blockListeners[eventCode] = [] }
            web3.blockListeners[eventCode].push(func)
        }})
    }

    web3.mockTransfer = async (value=1, blockNumber=11, from="from", to="contract") => {
        const event = {
            event: "Transfer",
            blockNumber,
            returnValues: { from, to, value },
        }
        web3.pastEvents.Transfer.push(event)
        for (const func of web3.transferListeners.data) {
            await func(event)
        }
    }
    web3.mockCommit = async (blockNumber=11, rootHash="hash", ipfsHash="ipfs") => {
        const event = {
            event: "BlockCreated",
            blockNumber,
            returnValues: {
                blockNumber,
                rootHash,
                ipfsHash
            }
        }
        web3.pastEvents.BlockCreated.push(event)
        for (const func of web3.blockListeners.data) {
            await func(event)
        }
    }

    return web3
}