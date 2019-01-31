const Monoplasma = require("./monoplasma")
const { throwIfSetButNotContract } = require("./ethSync")

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

        // TODO: playback from joinPartChannel not implemented =>
        //   playback will actually fail if there are joins or parts from the channel in the middle (during downtime)
        //   the failing will probably be quite quickly noticed though, so at least validators would simply restart
        //   if the operator fails though...
        this.log("Playing back root chain events...")
        const latestBlock = await this.web3.eth.getBlockNumber()
        const playbackStartingBlock = this.state.rootChainBlock + 1 || 0
        if (playbackStartingBlock <= latestBlock) {
            await this.playback(playbackStartingBlock, latestBlock)
            this.lastBlockNumber = this.state.rootChainBlock + 1
        }

        this.log("Listening to root chain events...")
        this.tokenFilter = this.token.events.Transfer({ filter: { to: this.state.contractAddress } })
        this.tokenFilter.on("data", event => {
            const income = event.returnValues.value
            this.log(`${income} tokens received`)
            this.plasma.addRevenue(income)
        })
        this.tokenFilter.on("changed", event => { this.error("Event removed in re-org!", event) })
        this.tokenFilter.on("error", this.error)

        this.log("Listening to joins/parts from the channel...")
        this.channel.listen()
        this.channel.on("join", addressList => {
            const count = this.plasma.addMembers(addressList)
            this.log(`Added or activated ${count} new member(s)`)
        })
        this.channel.on("part", addressList => {
            const count = this.plasma.removeMembers(addressList)
            this.log(`De-activated ${count} member(s)`)
        })

        await this.saveState()
    }

    async stop() {
        this.tokenFilter.unsubscribe()
        this.channel.close()
    }

    async saveState(){
        this.state.balances = this.plasma.getMembers()
        await this.store.saveState(this.state)
    }

    async playback(fromBlock, toBlock) {
        this.log(`Playing back blocks ${fromBlock}...${toBlock}`)
        const transferEvents = await this.token.getPastEvents("Transfer", { filter: { to: this.state.contractAddress }, fromBlock, toBlock })
        transferEvents.forEach(event => {
            const income = event.returnValues.value
            this.log(`Playback: ${income} tokens received @ block ${event.blockNumber}`)
            this.plasma.addRevenue(income)
        })
        this.state.rootChainBlock = toBlock
        this.state.balances = this.plasma.getMembers()
    }
}
