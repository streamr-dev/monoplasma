const MonoplasmaState = require("./state")
const { replayEvent, mergeEventLists } = require("./utils/events")
const { throwIfSetButNotContract } = require("./utils/checkArguments")

const TokenJson = require("../build/contracts/ERC20Mintable.json")
const MonoplasmaJson = require("../build/contracts/Monoplasma.json")

/**
 * MonoplasmaWatcher hooks to the root chain contract and keeps a local copy of the Monoplasma state up to date
 * Can be inherited to implement Operator and Validator functionality
 */
module.exports = class MonoplasmaWatcher {

    constructor(web3, joinPartChannel, startState, store, logFunc, errorFunc) {
        this.web3 = web3
        this.channel = joinPartChannel
        this.state = Object.assign({}, startState)
        this.store = store
        this.log = logFunc || (() => {})
        this.error = errorFunc || console.error // eslint-disable-line no-console
        this.explorerUrl = this.state.explorerUrl
        this.filters = {}
        this.eventLogIndex = +new Date()
    }

    async start() {
        await throwIfSetButNotContract(this.web3, this.state.contractAddress, "startState contractAddress")

        this.log("Initializing Monoplasma state...")
        // double-check state from contracts as a sanity check (TODO: alert if there were wrong in startState?)
        this.contract = new this.web3.eth.Contract(MonoplasmaJson.abi, this.state.contractAddress)
        //console.log("abi: "+JSON.stringify(MonoplasmaJson.abi))
        this.state.tokenAddress = await this.contract.methods.token().call()
        //console.log("fee : "+ this.state.adminFeeFraction)
        //this.state.operatorAddress = await this.contract.methods.operator().call()
        this.token = new this.web3.eth.Contract(TokenJson.abi, this.state.tokenAddress)
        this.state.freezePeriodSeconds = await this.contract.methods.freezePeriodSeconds().call()

        const lastBlock = this.state.lastPublishedBlock && await this.store.loadBlock(this.state.lastPublishedBlock)
        const savedMembers = lastBlock ? lastBlock.members : []
        const adminFeeFraction = lastBlock ? lastBlock.adminFeeFraction : 0
        const owner = lastBlock && lastBlock.owner ? lastBlock.owner : await this.contract.methods.owner().call()
        //console.log("owner: "+ owner+ " lastBlock: "+ JSON.stringify(lastBlock))

        this.plasma = new MonoplasmaState(this.state.freezePeriodSeconds, savedMembers, this.store, owner, adminFeeFraction)

        // TODO: playback from joinPartChannel not implemented =>
        //   playback will actually fail if there are joins or parts from the channel in the middle (during downtime)
        //   the failing will probably be quite quickly noticed though, so at least validators would simply restart
        //   if the operator fails though...
        const latestBlock = await this.web3.eth.getBlockNumber()
        const playbackStartingBlock = this.state.lastBlockNumber + 1 || 0
        if (playbackStartingBlock <= latestBlock) {
            this.log("Playing back events from Ethereum and Channel...")
            await this.playback(playbackStartingBlock, latestBlock)
            this.state.lastBlockNumber = latestBlock
        }

        this.log("Listening to Ethereum events...")
        //console.log("state: "+ JSON.stringify(this.state))
        const self = this
        function handleEvent(event) {
            //console.log("seen event: " + JSON.stringify(event))
            self.state.lastBlockNumber = +event.blockNumber
            replayEvent(self.plasma, event).catch(self.error)
            return self.store.saveState(self.state).catch(self.error)
        }

        this.tokenFilter = this.token.events.Transfer({ filter: { to: this.state.contractAddress } })
        this.tokenFilter.on("data", handleEvent)
        this.tokenFilter.on("changed", event => { this.error("Event removed in re-org!", event) })
        this.tokenFilter.on("error", this.error)

        this.adminCutChangeFilter = this.contract.events.AdminFeeChanged({ filter: { to: this.state.contractAddress } })
        this.adminCutChangeFilter.on("data", handleEvent)
        this.adminCutChangeFilter.on("changed", event => { this.error("Event removed in re-org!", event) })
        this.adminCutChangeFilter.on("error", this.error)

        this.ownershipChangeFilter = this.contract.events.OwnershipTransferred({ filter: { to: this.state.contractAddress } })
        this.ownershipChangeFilter.on("data", handleEvent)
        this.ownershipChangeFilter.on("changed", event => { this.error("Event removed in re-org!", event) })
        this.ownershipChangeFilter.on("error", this.error)

        this.log("Listening to joins/parts from the Channel...")
        this.channel.listen()
        this.channel.on("join", addressList => {
            const blockNumber = this.state.lastBlockNumber + 1
            const addedMembers = this.plasma.addMembers(addressList)
            this.log(`Added or activated ${addedMembers.length} new member(s) before block ${blockNumber}`)
            return this.store.saveEvents(blockNumber, {
                blockNumber,
                transactionIndex: -1,              // make sure join/part happens BEFORE real Ethereum tx
                logIndex: this.eventLogIndex++,    // ... but still is internally ordered
                event: "Join",
                addressList: addedMembers,
            }).catch(this.error)
        })
        this.channel.on("part", addressList => {
            const blockNumber = this.state.lastBlockNumber + 1
            const removedMembers = this.plasma.removeMembers(addressList)
            this.log(`De-activated ${removedMembers.length} member(s) before block ${blockNumber}`)
            return this.store.saveEvents(blockNumber, {
                blockNumber,
                transactionIndex: -1,              // make sure join/part happens BEFORE real Ethereum tx
                logIndex: this.eventLogIndex++,    // ... but still is internally ordered
                event: "Part",
                addressList: removedMembers,
            }).catch(this.error)
        })

        await this.store.saveState(this.state)
    }

    async stop() {
        this.tokenFilter.unsubscribe()
        this.channel.close()
    }

    async playback(fromBlock, toBlock) {
        await this.playbackOn(this.plasma, fromBlock, toBlock)
    }

    async playbackOn(plasma, fromBlock, toBlock) {
        // TODO: include joinPartHistory in playback
        // TODO interim solution: take members from a recent block
        this.log(`Playing back blocks ${fromBlock}...${toBlock}`)
        const joinPartEvents = await this.store.loadEvents(fromBlock, toBlock + 1)       // +1 to catch events after the very latest block, see join/part listening above
        const blockCreateEvents = await this.contract.getPastEvents("NewCommit", { fromBlock, toBlock })
        const adminFeeChangeEvents = await this.contract.getPastEvents("AdminFeeChanged", { fromBlock, toBlock })
        const transferEvents = await this.token.getPastEvents("Transfer", { filter: { to: this.state.contractAddress }, fromBlock, toBlock })

        const m1 = mergeEventLists(blockCreateEvents, transferEvents)
        const m2 = mergeEventLists(m1, joinPartEvents)
        const m3 = mergeEventLists(m2, adminFeeChangeEvents)

        const allEvents = mergeEventLists(m3, joinPartEvents)
        for (const event of allEvents) {
            await replayEvent(plasma, event)
        }
        plasma.setBlockNumber(toBlock)
    }

    async getContractTokenBalance() {
        const balance = await this.token.methods.balanceOf(this.state.contractAddress).call()
        return balance
    }
}
