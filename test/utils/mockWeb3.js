const sleep = require("../utils/sleep-promise")

module.exports = function getMockWeb3(bnum, pastEvents) {
    const web3 = {
        eth: {},
        utils: {},
        transferListeners: {},
        blockListeners: {},
        adminFeeListeners: {},
        ownershipListeners: {},
        pastEvents: Object.assign({
            Transfer: [],
            NewCommit: [],
        }, pastEvents)
    }
    web3.eth.getBlockNumber = () => bnum
    web3.eth.getBlock = () => ({
        number: bnum,
        timestamp: Date.now(),
        transactions: [],
    })

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
        adminFee: () => ({ call: () => 0 }),
        owner: () => ({ call: () => "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1" }),
        operator: () => ({ call: () => "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1" }),
        token: () => ({ call: () => "tokenAddress" }),
        freezePeriodSeconds: () => ({ call: () => 1000 }),
        commit: (...args) => ({ send: async () => {
            // simulate tx lag
            sleep(100).then(() => {
                web3.mockCommit(...args)
            })
        } })
    }
    web3.eth.Contract.prototype.events = {
        Transfer: () => ({ on: (eventCode, func) => {
            if (!web3.transferListeners[eventCode]) { web3.transferListeners[eventCode] = [] }
            web3.transferListeners[eventCode].push(func)
        }}),
        OwnershipTransferred: () => ({ on: (eventCode, func) => {
            if (!web3.ownershipListeners[eventCode]) { web3.ownershipListeners[eventCode] = [] }
            web3.ownershipListeners[eventCode].push(func)
        }}),
        NewCommit: () => ({ on: (eventCode, func) => {
            if (!web3.blockListeners[eventCode]) { web3.blockListeners[eventCode] = [] }
            web3.blockListeners[eventCode].push(func)
        }}),
        AdminFeeChanged: () => ({ on: (eventCode, func) => {
            if (!web3.adminFeeListeners[eventCode]) { web3.adminFeeListeners[eventCode] = [] }
            web3.adminFeeListeners[eventCode].push(func)
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
            event: "NewCommit",
            blockNumber,
            returnValues: {
                blockNumber,
                rootHash,
                ipfsHash
            }
        }
        web3.pastEvents.NewCommit.push(event)
        for (const func of web3.blockListeners.data || []) {
            await func(event)
        }
    }

    return web3
}