const fs = require('mz/fs')
const readline = require('readline')

const Web3 = require("web3")
const Ganache = require("ganache-core")

const Operator = require("./src/monoplasmaOperator")
const { defaultServers, throwIfSetButNotContract } = require("./src/ethSync")

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

let ganacheServer = null
const log = QUIET ? () => {} : console.log
const error = (e, ...args) => {
    console.error(e.stack, args)
    if (ganacheServer) { ganacheServer.close() }
    process.exit(1)
}

const storePath = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/operator.json"

let ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
if (!ethereumServer) {
    const ganachePort = GANACHE_PORT || 3010
    ethereumServer = `http://localhost:${ganachePort}/`
    log(`Starting Ganache Ethereum simulator in port ${ganachePort}...`)
    ganacheServer = Ganache.server({ mnemonic: "testrpc" })
    ganacheServer.listen(ganachePort, log)
}
log(`Connecting to ${ethereumServer}...`)
const web3 = new Web3(ethereumServer)

// with ganache, use account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
const privateKey = !ganacheServer ? ETHEREUM_PRIVATE_KEY : "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"

// ignore config / saved state if using ganache
const resetConfig = RESET || !!ganacheServer

async function loadStateFromFile(path) {
    log(`Loading operator state from ${path}...`)
    const raw = await fs.readFile(path).catch(e => "{}")
    log(`Saved state: ${raw}`)
    return JSON.parse(raw)
}

async function saveStateToFile(path, state) {
    const raw = JSON.stringify(state)
    log(`Saving operator state to ${path}: ${raw}`)
    return fs.writeFile(path, raw)
}

async function start() {
    await throwIfSetButNotContract(web3, TOKEN_ADDRESS, "Environment variable TOKEN_ADDRESS")
    await throwIfSetButNotContract(web3, CONTRACT_ADDRESS, "Environment variable CONTRACT_ADDRESS")

    // augment the config / saved state with variables that may be useful for the validators
    const config = resetConfig ? {} : await loadStateFromFile(storePath)
    config.tokenAddress = TOKEN_ADDRESS || config.tokenAddress
    config.contractAddress = CONTRACT_ADDRESS || config.contractAddress
    config.blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || config.blockFreezePeriodSeconds || 3600
    config.ethereumServer = ethereumServer
    config.ethereumNetworkId = ETHEREUM_NETWORK_ID

    const operator = new Operator(web3, privateKey, config, saveStateToFile.bind(null, storePath), log, error)
    await operator.start()
}

start().catch(error)
