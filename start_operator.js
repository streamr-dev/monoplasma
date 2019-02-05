#!/usr/bin/env node

const fs = require("mz/fs")
const path = require("path")
const express = require("express")
const bodyParser = require("body-parser")
const onProcessExit = require("exit-hook")

const Web3 = require("web3")

const Operator = require("./src/monoplasmaOperator")
const { defaultServers, throwIfSetButNotContract } = require("./src/ethSync")
const deployDemoToken = require("./src/deployDemoToken")

const operatorRouter = require("./src/monoplasmaRouter")
const adminRouter = require("./src/adminRouter")
const revenueDemoRouter = require("./src/revenueDemoRouter")
const Channel = require("./src/joinPartChannel")

const MonoplasmaJson = require("./build/contracts/Monoplasma.json")

const {
    ETHEREUM_SERVER,
    ETHEREUM_NETWORK_ID,
    ETHEREUM_PRIVATE_KEY,
    TOKEN_ADDRESS,
    CONTRACT_ADDRESS,
    BLOCK_FREEZE_SECONDS,
    GAS_PRICE_GWEI,
    RESET,
    STORE,
    QUIET,

    // these will be used  1) for demo token  2) if TOKEN_ADDRESS doesn't support name() and symbol()
    TOKEN_SYMBOL,
    TOKEN_NAME,

    // if ETHEREUM_SERVER isn't specified, start a local Ethereum simulator (Ganache) in given port
    GANACHE_PORT,

    // web UI for revenue sharing demo
    WEBSERVER_PORT,
} = process.env

const log = QUIET ? () => {} : console.log
const error = (e, ...args) => {
    console.error(e.stack, args)
    process.exit(1)
}

const stateStorePath = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/operator.json"
const blockStoreDir = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/blocks"
const fileStore = require("./src/fileStore")(stateStorePath, blockStoreDir)

let ganache = null
function stopGanache() {
    if (ganache) {
        log("Shutting down Ethereum simulator...")
        ganache.shutdown()
        ganache = null
    }
}
onProcessExit(stopGanache)

async function start() {
    let privateKey
    let ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
    if (ethereumServer) {
        if (!ETHEREUM_PRIVATE_KEY) { throw new Error("Private key required to deploy the airdrop contract. Deploy transaction must be signed.") }
        privateKey = ETHEREUM_PRIVATE_KEY.startsWith("0x") ? ETHEREUM_PRIVATE_KEY : "0x" + ETHEREUM_PRIVATE_KEY
        if (privateKey.length !== 66) { throw new Error("Malformed private key, must be 64 hex digits long (optionally prefixed with '0x')") }
    } else {
        // use account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
        privateKey = "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"
        log("Starting Ethereum simulator...")
        const ganachePort = GANACHE_PORT || 8545
        const ganacheLog = msg => { log("        Ganache > " + msg) }
        ganache = await require("./src/startGanache")(ganachePort, ganacheLog, error)
        ethereumServer = ganache.url
    }

    log(`Connecting to ${ethereumServer}`)
    const web3 = new Web3(ethereumServer)
    const account = web3.eth.accounts.wallet.add(privateKey)

    await throwIfSetButNotContract(web3, TOKEN_ADDRESS, "Environment variable TOKEN_ADDRESS")
    await throwIfSetButNotContract(web3, CONTRACT_ADDRESS, "Environment variable CONTRACT_ADDRESS")

    const opts = {
        from: account.address,
        gas: 4000000,
        gasPrice: GAS_PRICE_GWEI || 4000000000,
    }

    // ignore the saved config / saved state if using ganache
    // augment the config / saved state with variables that may be useful for the validators
    const config = RESET || !ethereumServer ? {} : await fileStore.loadState()
    config.tokenAddress = TOKEN_ADDRESS || config.tokenAddress || await deployDemoToken(web3, TOKEN_NAME, TOKEN_SYMBOL, opts, log)
    config.blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || config.blockFreezePeriodSeconds || 3600
    config.contractAddress = CONTRACT_ADDRESS || config.contractAddress || await deployContract(web3, config.tokenAddress, config.blockFreezePeriodSeconds, opts, log)
    config.ethereumServer = ethereumServer
    config.ethereumNetworkId = ETHEREUM_NETWORK_ID
    config.operatorAddress = account.address

    log("Starting the joinPartChannel")
    const operatorChannel = new Channel()

    const operator = new Operator(web3, operatorChannel, config, fileStore, log, error)
    await operator.start()

    log("Starting web server...")
    const port = WEBSERVER_PORT || 8080
    const serverURL = `http://localhost:${port}`
    const app = express()
    const adminChannel = new Channel()
    adminChannel.startServer()
    app.use(bodyParser.json())
    app.use("/api", operatorRouter(operator.plasma))
    app.use("/admin", adminRouter(adminChannel))
    app.use("/demo", revenueDemoRouter(operator))
    app.use(express.static(path.join(__dirname, "static_web")))
    app.listen(port, () => log(`Revenue demo UI started at ${serverURL}`))
}

async function deployContract(web3, tokenAddress, blockFreezePeriodSeconds, sendOptions, log) {
    log(`Deploying root chain contract (token @ ${tokenAddress}, blockFreezePeriodSeconds = ${blockFreezePeriodSeconds})...`)
    const Monoplasma = new web3.eth.Contract(MonoplasmaJson.abi)
    const monoplasma = await Monoplasma.deploy({
        data: MonoplasmaJson.bytecode,
        arguments: [tokenAddress, blockFreezePeriodSeconds]
    }).send(sendOptions)
    return monoplasma.options.address
}

start().catch(error)
