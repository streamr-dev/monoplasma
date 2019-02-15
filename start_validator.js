const fs = require("mz/fs")
const fsEx = require("fs-extra")
const path = require("path")

const prettyjson = require("prettyjson")
const Web3 = require("web3")

const Validator = require("./src/monoplasmaValidator")
const { defaultServers, throwIfNotContract } = require("./src/ethSync")
const Channel = require("./src/joinPartChannel")

const {
    CONFIG_JSON,
    CONFIG_FILE,
    CONFIG_URL,
    ETHEREUM_SERVER,
    ETHEREUM_NETWORK_ID,
    ETHEREUM_PRIVATE_KEY,
    WATCHED_ACCOUNTS,
    STORE_DIR,
    PLAYBACK_EVENTS_DIR,
    QUIET,
} = process.env

const log = !QUIET ? console.log : () => {}
function error() {
    console.error(...arguments)
    process.exit(1)
}

const storeDir = fs.existsSync(STORE_DIR) ? STORE_DIR : __dirname + "/temp"
const fileStore = require("./src/fileStore")(storeDir)

// TODO: get rid of this copy hack; past events sync should happen through the monoplasmaRouter and HTTP
const eventsDir = path.join(storeDir, "events")
const pastEventsDir = fs.existsSync(PLAYBACK_EVENTS_DIR) ? PLAYBACK_EVENTS_DIR : __dirname + "/demo/public/data/events"
log(`Channel playback hack: Copying past events ${pastEventsDir} -> ${eventsDir}`)
fsEx.copySync(pastEventsDir, eventsDir)

async function start() {
    const config = CONFIG_JSON ? JSON.parse(CONFIG_JSON)
        : CONFIG_FILE ? await loadStateFromFile(CONFIG_FILE)
            : CONFIG_URL ? await loadStateFromUrl(CONFIG_URL)
                : {}
    log("Received config:")
    log(prettyjson.render(config))

    // TODO: validate config (operator state)

    const ethereumNetworkId = ETHEREUM_NETWORK_ID || config.ethereumNetworkId
    const ethereumServer = ETHEREUM_SERVER || defaultServers[ethereumNetworkId] || config.ethereumServer
    if (!ethereumServer) { throw new Error("ethereumServer not found in config, please supply ETHEREUM_SERVER or ETHEREUM_NETWORK_ID you'd like to connect to as environment variable!") }

    log(`Connecting to ${ethereumServer}...`)
    const web3 = new Web3(ethereumServer)

    let address = null
    const accountList = WATCHED_ACCOUNTS ? WATCHED_ACCOUNTS.split(",") : []
    if (accountList.length > 0) {
        // TODO: guess private key if missing?
        // with ganache, operator uses account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
        // const privateKey = ETHEREUM_PRIVATE_KEY || "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"
        if (!ETHEREUM_PRIVATE_KEY) { throw new Error("Environment variable ETHEREUM_PRIVATE_KEY is needed to send exit transaction for the WATCHED_ACCOUNTS!") }
        const key = ETHEREUM_PRIVATE_KEY.startsWith("0x") ? ETHEREUM_PRIVATE_KEY : "0x" + ETHEREUM_PRIVATE_KEY
        if (key.length !== 66) { throw new Error("Malformed private key, must be 64 hex digits long (optionally prefixed with '0x')") }
        const account = web3.eth.accounts.wallet.add(key)
        address = account.address
    }

    await throwIfNotContract(web3, config.tokenAddress, "Config variable tokenAddress")
    await throwIfNotContract(web3, config.contractAddress, "Config variable contractAddress")

    // full playback
    config.lastBlockNumber = 0
    config.lastPublishedBlock = 0

    log("Starting the joinPartChannel and Validator")
    const channel = new Channel(config.channelPort)
    const validator = new Validator(accountList, address, web3, channel, config, fileStore, log, error)
    await validator.start()
}

async function loadStateFromFile(path) {
    log(`Loading operator state from ${path}...`)
    const raw = await fs.readFile(path)
    return JSON.parse(raw)
}

async function loadStateFromUrl(url) {
    throw new Error("not implemented, url: " + url)
}

start().catch(error)
