const Monoplasma = require("./monoplasma")
const { mergeEventLists, replayEvents, replayEvent, throwIfSetButNotContract } = require("./ethSync")

const TokenJson = require("../build/contracts/ERC20Mintable.json")
const MonoplasmaJson = require("../build/contracts/Monoplasma.json")

/**
 * MonoplasmaWatcher hooks to the root chain contract and keeps a local copy of the Monoplasma state up to date
 * Can be inherited to implement Operator and Validator functionality
 */
module.exports = class MonoplasmaWatcher {

    constructor(web3, startState, store, logFunc, errorFunc) {
        this.web3 = web3
        this.state = startState
        this.store = store
        this.log = logFunc || (() => {})
        this.error = errorFunc || console.error
        this.lastBlockNumber = 0
        this.explorerUrl = this.state.explorerUrl
        this.filters = {}
    }

    async start() {
        await throwIfSetButNotContract(this.web3, this.state.contractAddress, "startState contractAddress")

        this.log("Initializing...")
        this.contract = new this.web3.eth.Contract(MonoplasmaJson.abi, this.state.contractAddress)
        this.state.tokenAddress = await this.contract.methods.token().call()
        this.token = new this.web3.eth.Contract(TokenJson.abi, this.state.tokenAddress)
        this.plasma = new Monoplasma(this.state.balances, this.store)

        this.log("Playing back root chain events...")
        const latestBlock = await this.web3.eth.getBlockNumber()
        const playbackStartingBlock = this.state.rootChainBlock + 1 || 0
        if (playbackStartingBlock <= latestBlock) {
            await this.playback(playbackStartingBlock, latestBlock)
            this.lastBlockNumber = this.state.rootChainBlock + 1
        }

        this.log("Listening to root chain events...")
        this.filters.tokensReceived = this.token.events.Transfer({ filter: { to: this.state.contractAddress } })
        this.filters.recipientAdded = this.contract.events.RecipientAdded({})
        this.filters.recipientRemoved = this.contract.events.RecipientRemoved({})

        Object.values(this.filters).forEach(filter => {
            filter.on("data", event => { this.onEvent(event) })
            filter.on("changed", event => { this.error("Event removed in re-org!", event) })
            filter.on("error", this.error)
        })

        await this.saveState()
    }

    async onEvent(event) {
        replayEvent(this.plasma, event)
    }

    async stop() {
        Object.values(this.filters).forEach(filter => {
            filter.unsubscribe()
        })
    }

    async saveState(){
        this.state.balances = this.plasma.getMembers()
        this.store.saveState(this.state)
    }

    async playback(fromBlock, toBlock) {
        this.log(`Playing back blocks ${fromBlock}...${toBlock}`)
        const transferEvents = await this.token.getPastEvents("Transfer", { filter: { to: this.state.contractAddress }, fromBlock, toBlock })
        const joinPartEvents = await this.contract.getPastEvents("allEvents", { fromBlock, toBlock })
        const allEvents = mergeEventLists(transferEvents, joinPartEvents)
        replayEvents(this.plasma, allEvents)
        this.state.rootChainBlock = toBlock
        this.state.balances = this.plasma.getMembers()
    }
}
