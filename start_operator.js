const fs = require("mz/fs")
const readline = require("readline")

const Web3 = require("web3")

const Operator = require("./src/monoplasmaOperator")
const { defaultServers, throwIfSetButNotContract } = require("./src/ethSync")
const { loadState, saveState } = require("./src/fileStore")

const {
    ETHEREUM_SERVER,
    ETHEREUM_NETWORK_ID,
    ETHEREUM_PRIVATE_KEY,
    TOKEN_ADDRESS,
    CONTRACT_ADDRESS,
    BLOCK_FREEZE_SECONDS,
    GANACHE_PORT,
    RESET,
    STORE,
    QUIET,
} = process.env

const log = QUIET ? () => {} : console.log
const error = (e, ...args) => {
    console.error(e.stack, args)
    process.exit(1)
}

process.on("exit", () => {
    console.log("Exiting")  // TODO: trap here the ganache problem?
})

const storePath = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/operator.json"

async function start() {
    const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
    log(`Connecting to ${ethereumServer || "Ganache ethereum simulator"}...`)
    function ganacheLog(msg) { log("        Ganache > " + msg) }
    const web3 = new Web3(ethereumServer || await require("./src/startGanache")(ganacheLog, error)())

    // with ganache, use account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
    const privateKey = ethereumServer ? ETHEREUM_PRIVATE_KEY : "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"

    await throwIfSetButNotContract(web3, TOKEN_ADDRESS, "Environment variable TOKEN_ADDRESS")
    await throwIfSetButNotContract(web3, CONTRACT_ADDRESS, "Environment variable CONTRACT_ADDRESS")

    // ignore the saved config / saved state if using ganache
    // augment the config / saved state with variables that may be useful for the validators
    const config = RESET || !ethereumServer ? {} : await loadState(storePath)
    config.tokenAddress = TOKEN_ADDRESS || config.tokenAddress
    config.contractAddress = CONTRACT_ADDRESS || config.contractAddress
    config.blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || config.blockFreezePeriodSeconds || 3600
    config.ethereumServer = ethereumServer
    config.ethereumNetworkId = ETHEREUM_NETWORK_ID

    const operator = new Operator(web3, privateKey, config, saveState.bind(null, storePath), log, error)
    await operator.start()
}

start().catch(error)
