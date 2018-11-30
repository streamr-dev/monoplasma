const fs = require('mz/fs')
const readline = require('readline')

const TruffleResolver = require("truffle-resolver")
const Web3 = require("web3")
const Ganache = require("ganache-core")

const Monoplasma = require("./src/monoplasma")

const { mergeEventLists } = require("./src/ethSync")

const {
    ETHEREUM_SERVER,
    ETHEREUM_NETWORK_ID,
    TOKEN_ADDRESS,
    CONTRACT_ADDRESS,
    BLOCK_FREEZE_SECONDS,
    RESET_STATE,
    STORE,
    LOGGING,
} = process.env

const log = LOGGING ? console.log : () => {}

const blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || 3600

// network ids: 1 = mainnet, 2 = morden, 3 = ropsten, 4 = rinkeby (current testnet)
const defaultServers = {
    "1": "wss://mainnet.infura.io/ws",
    "3": "wss://ropsten.infura.io/ws",
    "4": "wss://rinkeby.infura.io/ws",
}

const storePath = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/operator.json"

const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
log(`Connecting to ${ethereumServer || "Ganache Ethereum simulator"}...`)
const web3 = new Web3(ethereumServer || Ganache.provider({
    mnemonic: "testrpc",
}))

// ignore saved state if using ganache
const resetState = RESET_STATE || !ethereumServer

function throwIfSetButNotContract(envVarName) {
    const value = process.env[envVarName]
    if (!value) { return }
    if (!web3.utils.isAddress(value)) {
        throw new Error(`Environment variable ${envVarName}: Bad Ethereum address ${value}`)
    }
    //TODO: move init into async
    //if (await web3.eth.getBytecode(value) === "0x") {
    //    throw new Error(`Environment variable ${envVarName}: No contract at ${value}`)
    //}
}
throwIfSetButNotContract("TOKEN_ADDRESS")
throwIfSetButNotContract("CONTRACT_ADDRESS")

// TODO: figure out signing when run from command-line...
const contractDefaults = {
    from: "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab",
    gas: 4000000,
}

const resolver = new TruffleResolver(Object.assign({
    contracts_build_directory: "build/contracts",
    working_directory: ".",
    provider: web3.currentProvider,
    network_id: 1, // await web3.eth.net.getId(),
}, contractDefaults))
const Token = resolver.require("./ERC20Mintable.sol")
const Airdrop = resolver.require("./Airdrop.sol")

async function getTokenAddress() {
    log("Deploying a dummy token contract...")
    const token = await Token.new()
    return token.address
}

async function getAirdropAddress(oldTokenAddress) {
    const tokenAddress = oldTokenAddress || await getTokenAddress()
    log(`Deploying Airdrop contract (token @ ${tokenAddress}, blockFreezePeriodSeconds = ${blockFreezePeriodSeconds})...`)
    airdrop = await Airdrop.new(tokenAddress, blockFreezePeriodSeconds)
    return airdrop.address
}

async function loadStateFromFile(path) {
    log(`Loading operator state from ${path}...`)
    const raw = await fs.readFile(path).catch(e => "{}")
    log(`Saved state: ${raw}`)
    return JSON.parse(raw)
}

async function saveStateToFile(path) {
    const raw = JSON.stringify(state)
    log(`Saving operator state to ${path}: ${raw}`)
    return fs.writeFile(path, raw)
}

let state
async function start() {
    log("Initializing...")
    state = resetState ? {} : await loadStateFromFile(storePath)
    state.contractAddress = CONTRACT_ADDRESS || state.contractAddress || await getAirdropAddress(TOKEN_ADDRESS || state.tokenAddress)
    const airdrop = new web3.eth.Contract(Airdrop.abi, state.contractAddress, contractDefaults)
    state.tokenAddress = await airdrop.methods.token().call()
    const token = new web3.eth.Contract(Token.abi, state.tokenAddress, contractDefaults)
    const plasma = new Monoplasma(state.balances)

    log("Playing back root chain events...")
    const toBlock = await web3.eth.getBlockNumber()
    const fromBlock = state.rootChainBlock + 1 || 0
    if (fromBlock <= toBlock) {
        log(`  Playing back blocks ${fromBlock}...${toBlock}`)
        const transferEvents = await token.getPastEvents("Transfer", { filter: { to: state.contractAddress }, fromBlock, toBlock })
        const joinPartEvents = await airdrop.getPastEvents("allEvents", { fromBlock, toBlock })
        const allEvents = mergeEventLists(transferEvents, joinPartEvents)
        allEvents.forEach(e => {
            switch (e.event) {
                case "RecipientAdded": {
                    log(` + ${e.returnValues.recipient} joined`)
                    plasma.addMember(e.returnValues.recipient)
                    break
                }
                case "RecipientRemoved": {
                    log(` - ${e.returnValues.recipient} left`)
                    plasma.removeMember(e.returnValues.recipient)
                    break
                }
                case "Transfer": {
                    log(` => ${e.returnValues.tokens} received`)
                    const income = e.returnValues.tokens
                    plasma.addRevenue(income)
                    break
                }
            }
        })
        state.rootChainBlock = toBlock
        await saveStateToFile(storePath)
    }

    log("Init done, let's try recording a block...")
    plasma.addMember("0xdc353aa3d81fc3d67eb49f443df258029b01d8ab")
    const resp = await airdrop.methods.recordBlock(1, plasma.getRootHash(), "").send()
    log("Events produced: " + JSON.stringify(resp.events))

    log("Mint tokens...")
    const tokenAddress = await airdrop.methods.token().call()
    const tokenAddress2 = await getTokenAddress()
    log("Got token at " + tokenAddress + " should be == " + tokenAddress2)
}

start().catch(console.error)
