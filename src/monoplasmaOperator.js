const Monoplasma = require("./monoplasma")
const { mergeEventLists, replayEvents, replayEvent } = require("./ethSync")

const TokenJson = require("../build/contracts/ERC20Mintable.json")
const MonoplasmaJson = require("../build/contracts/Monoplasma.json")

module.exports = class MonoplasmaOperator {

    constructor(web3, startState, saveStateFunc, logFunc, errorFunc) {
        this.web3 = web3
        this.state = startState
        this.saveState = saveStateFunc
        this.log = logFunc || (() => {})
        this.error = errorFunc || console.error
        this.publishedBlocks = []
        this.lastBlockNumber = 0
        this.minIntervalBlocks = this.state.minIntervalBlocks || 2  // TODO: think about it more closely
        this.explorerUrl = this.state.explorerUrl
        this.address = this.state.operatorAddress

        this.state.gasPrice = this.state.gasPrice || 4000000000  // 4 gwei
    }

    async start(contractAddress) {
        await throwIfSetButNotContract(this.web3, this.state.contractAddress, "startState contractAddress")
        this.state.contractAddress = contractAddress

        this.log("Initializing...")
        this.contract = new this.web3.eth.Contract(MonoplasmaJson.abi, this.state.contractAddress)
        this.state.tokenAddress = await contract.methods.token().call()
        this.token = new this.web3.eth.Contract(TokenJson.abi, this.state.tokenAddress)
        this.plasma = new Monoplasma(this.state.balances)

        this.log("Playing back root chain events...")
        const latestBlock = await this.web3.eth.getBlockNumber()
        const playbackStartingBlock = this.state.rootChainBlock + 1 || 0
        if (playbackStartingBlock <= latestBlock) {
            await this.playback(playbackStartingBlock, latestBlock)
        }

        this.log("Listening to root chain events...")
        const transferFilter = token.events.Transfer({ filter: { to: this.state.contractAddress } })
        transferFilter.on("data", e => { this.onTokensReceived(e).then() })
        transferFilter.on("changed", e => { this.error("Event removed in re-org!", e) })
        transferFilter.on("error", this.error)
        const joinPartFilter = this.contract.events.allEvents()
        joinPartFilter.on("data", replayEvent.bind(null, this.plasma))
        joinPartFilter.on("changed", e => { this.error("Event removed in re-org!", e) })
        joinPartFilter.on("error", this.error)

        await this.saveState(this.state)
    }

    async onTokensReceived(event) {
        replayEvent(this.plasma)
        // TODO: block publishing should be based on value-at-risk, that is, publish after so-and-so many tokens received
        if (event.blockNumber >= this.lastBlockNumber + this.minIntervalBlocks) {
            const ee = this.publishBlock(event.blockNumber)
            if (this.explorerUrl) {
                ee.on("transactionHash", hash => {
                    this.log(`Sent tx to ${this.explorerUrl}${hash}`)
                })
            }
        }
    }

    async playback(fromBlock, toBlock) {
        this.log(`  Playing back blocks ${fromBlock}...${toBlock}`)
        const transferEvents = await this.token.getPastEvents("Transfer", { filter: { to: this.state.contractAddress }, fromBlock, toBlock })
        const joinPartEvents = await this.contract.getPastEvents("allEvents", { fromBlock, toBlock })
        const allEvents = mergeEventLists(transferEvents, joinPartEvents)
        replayEvents(this.plasma, allEvents)
        this.state.rootChainBlock = toBlock
    }

    async publishBlock(blockNumber) {
        const bnum = blockNumber || await this.web3.eth.getBlockNumber()
        const hash = this.plasma.getRootHash()
        const ipfsHash = ""
        return this.contract.methods.recordBlock(bnum, hash, ipfsHash).send({
            from: this.address,
            gas: 4000000,
            gasPrice: this.state.gasPrice
        })
    }
}