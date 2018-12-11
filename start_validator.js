const fs = require("mz/fs")
const readline = require("readline")
const prettyjson = require("prettyjson")

const Web3 = require("web3")

const Validator = require("./src/monoplasmaValidator")
const { defaultServers, throwIfNotContract } = require("./src/ethSync")

const {
    CONFIG,
    CONFIG_FILE,
    CONFIG_URL,
    ETHEREUM_NETWORK_ID,
    ETHEREUM_SERVER,
    ETHEREUM_PRIVATE_KEY,
    WATCHED_ACCOUNTS,
    QUIET,
} = process.env

const log = !QUIET ? console.log : () => {}
function error() {
    console.error(arguments)
    process.exit(1)
}

async function start() {
    const config = CONFIG ? JSON.parse(CONFIG)
        : CONFIG_FILE ? await loadStateFromFile(CONFIG_FILE)
        //: CONFIG_URL ? await loadStateFromUrl(CONFIG_URL)
        : {}
    log(`Received config:`)
    log(prettyjson.render(config))

    // TODO: validate config (operator state)
    await throwIfNotContract(config.tokenAddress, "Config variable tokenAddress")
    await throwIfNotContract(config.contractAddress, "Config variable contractAddress")

    const ethereumNetworkId = ETHEREUM_NETWORK_ID || config.ethereumNetworkId
    const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID] || config.ethereumServer
    if (!ethereumServer) { throw new Error("ethereumServer not found in config, please supply ETHEREUM_SERVER or ETHEREUM_NETWORK_ID you'd like to connect to as environment variable!") }

    const accountList = WATCHED_ACCOUNTS ? WATCHED_ACCOUNTS.split(",") : []
    if (accountList.length > 0 && !ETHEREUM_PRIVATE_KEY) { throw new Error("Environment variable ETHEREUM_PRIVATE_KEY is needed to send exit transaction for the WATCHED_ACCOUNTS!") }

    // TODO: guess private key if missing?
    // with ganache, operator uses account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
    // const privateKey = ETHEREUM_PRIVATE_KEY || "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"

    log(`Connecting to ${ethereumServer}...`)
    const web3 = new Web3(ethereumServer)
    const validator = new Validator(web3, ETHEREUM_PRIVATE_KEY, config, accountList, log, error)
    await validator.start()
}

async function loadStateFromFile(path) {
    log(`Loading operator state from ${path}...`)
    const raw = await fs.readFile(path).catch(e => "{}")
    log(`Saved state: ${raw}`)
    return JSON.parse(raw)
}

start().catch(error)
