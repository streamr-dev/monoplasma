const TruffleResolver = require("truffle-resolver")

const Monoplasma = require("./monoplasma")
const { mergeEventLists, replayEvents, replayEvent, now } = require("./ethSync")

const TokenJson = require("../build/contracts/ERC20Mintable.json")
const MonoplasmaJson = require("../build/contracts/Monoplasma.json")

async function deployContract(web3, oldTokenAddress, blockFreezePeriodSeconds, sendOptions, log) {
    const tokenAddress = oldTokenAddress || await deployToken(web3, sendOptions, log)
    log(`Deploying root chain contract (token @ ${tokenAddress}, blockFreezePeriodSeconds = ${blockFreezePeriodSeconds})...`)
    const Monoplasma = new web3.eth.Contract(MonoplasmaJson.abi)
    const monoplasma = await Monoplasma.deploy({
        data: MonoplasmaJson.bytecode,
        arguments: [tokenAddress, blockFreezePeriodSeconds]
    }).send(sendOptions)
    return monoplasma.options.address
}

async function deployToken(web3, sendOptions, log) {
    log("Deploying a dummy token contract...")
    const Token = new web3.eth.Contract(TokenJson.abi)
    const token = await Token.deploy({data: TokenJson.bytecode}).send(sendOptions)

    /* using ganache as lib, crashes mysteriously; gets txHash but process.exits before receipt call
    const token = await new Promise((done, fail) => {
        Token.deploy({data: TokenJson.bytecode}).send(sendOptions)
            .on("transactionHash", console.log)
            .on("receipt", done)
            .on("error", fail)
    })
    console.log("asdf")
    */

    return token.options.address
}

module.exports = class MonoplasmaOperator {

    constructor(web3, privateKey, startState, saveStateFunc, logFunc, errorFunc) {
        this.web3 = web3
        this.state = startState
        this.saveState = saveStateFunc
        this.log = logFunc || (() => {})
        this.error = errorFunc || console.error

        this.state.gasPrice = this.state.gasPrice || 4000000000  // 4 gwei

        if (!privateKey) { throw new Error("Private key required to run operator. Tx to publish root hash must be signed") }
        const key = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey
        if (key.length !== 66) { throw new Error("Malformed private key, must be 64 hex digits long (optionally prefixed with '0x')") }
        this.account = web3.eth.accounts.wallet.add(key)
        this.contractDefaults = { from: this.account.address, gas: 4000000, gasPrice: this.state.gasPrice }
    }

    async start() {
        this.log("Initializing...")
        const contract = await this.getContract()
        const token = await this.getToken()
        this.plasma = new Monoplasma(this.state.balances)

        this.log("Playing back root chain events...")
        const latestBlock = await this.web3.eth.getBlockNumber()
        const playbackStartingBlock = this.state.rootChainBlock + 1 || 0
        if (playbackStartingBlock <= latestBlock) {
            await this.playback(playbackStartingBlock, latestBlock)
        }

        this.log("Listening to root chain events...")
        const transferFilter = token.events.Transfer({ filter: { to: this.state.contractAddress } })
        transferFilter.on("data", replayEvent.bind(null, this.plasma))
        transferFilter.on("changed", e => { this.error("Event removed in re-org!", e) })
        transferFilter.on("error", this.error)
        const joinPartFilter = contract.events.allEvents()
        joinPartFilter.on("data", replayEvent.bind(null, this.plasma))
        joinPartFilter.on("changed", e => { this.error("Event removed in re-org!", e) })
        joinPartFilter.on("error", this.error)

        await this.saveState(this.state)
    }

    async playback(fromBlock, toBlock) {
        const contract = await this.getContract()
        const token = await this.getToken()
        this.log(`  Playing back blocks ${fromBlock}...${toBlock}`)
        const transferEvents = await token.getPastEvents("Transfer", { filter: { to: this.state.contractAddress }, fromBlock, toBlock })
        const joinPartEvents = await contract.getPastEvents("allEvents", { fromBlock, toBlock })
        const allEvents = mergeEventLists(transferEvents, joinPartEvents)
        replayEvents(this.plasma, allEvents)
        this.state.rootChainBlock = toBlock
    }

    async publishBlock() {
        const contract = await this.getContract()
        const blockNumber = await this.web3.eth.getBlockNumber()
        const rootHash = this.plasma.getRootHash()
        const call = contract.methods.recordBlock(blockNumber, rootHash, ipfsHash)
        const data = call.encodeABI()
        const gas = await call.estimateGas()
        const to = contract.options.address
        const signed = await updaterAccount.signTransaction({ to, data, gas, gasPrice: this.state.gasPrice })
        this.log(`  Publishing block ${blockNumber}: ${rootHash}`)
        contract.events.BlockCreated.once("data", () => this.log(`  Block ${blockNumber} successfully published`))
        const tx = web3.eth.sendSignedTransaction(signed.rawTransaction)
        tx.on("transactionHash", hash => this.log(`  Sent https://${networkId == 1 ? "" : "rinkeby."}etherscan.io/tx/${hash}`))
        return tx
    }

    async getContract() {
        const address = this.state.contractAddress || await deployContract(this.web3, this.state.tokenAddress, this.state.blockFreezePeriodSeconds, this.contractDefaults, this.log)
        this.state.contractAddress = address
        const contract = new this.web3.eth.Contract(MonoplasmaJson.abi, address, this.contractDefaults)
        return contract
    }

    async getToken() {
        const contract = await this.getContract()
        const address = await contract.methods.token().call()
        this.state.tokenAddress = address
        const token = new this.web3.eth.Contract(TokenJson.abi, address, this.contractDefaults)
        return token
    }
}