const fs = require("mz/fs")
const readline = require("readline")

const Web3 = require("web3")

const Operator = require("./src/monoplasmaOperator")
const { defaultServers, throwIfSetButNotContract } = require("./src/ethSync")
const { loadState, saveState } = require("./src/fileStore")
const deployDemoToken = require("./src/deployDemoToken")

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

    // if ETHEREUM_SERVER isn't specified, start a local Ethereum simulator (Ganache) in given port
    GANACHE_PORT,
} = process.env

const log = QUIET ? () => {} : console.log
const error = (e, ...args) => {
    console.error(e.stack, args)
    process.exit(1)
}
const ganacheLog = (msg) => { log("        Ganache > " + msg) }

process.on("exit", () => {
    console.log("Exiting")  // TODO: trap here the ganache problem?
})

const storePath = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/operator.json"

async function start() {
    const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
    log(`Connecting to ${ethereumServer || "Ganache ethereum simulator"}...`)
    const web3 = new Web3(ethereumServer || await require("./src/startGanache")(GANACHE_PORT, ganacheLog, error))

    // with ganache, use account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
    const privateKey = ethereumServer ? ETHEREUM_PRIVATE_KEY : "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"
    if (!privateKey) { throw new Error("Private key required to run operator. Tx to publish root hash must be signed") }
    const key = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey
    if (key.length !== 66) { throw new Error("Malformed private key, must be 64 hex digits long (optionally prefixed with '0x')") }
    const account = web3.eth.accounts.wallet.add(key)

    await throwIfSetButNotContract(web3, TOKEN_ADDRESS, "Environment variable TOKEN_ADDRESS")
    await throwIfSetButNotContract(web3, CONTRACT_ADDRESS, "Environment variable CONTRACT_ADDRESS")

    const opts = {
        from: account.address,
        gas: 4000000,
        gasPrice:
    }

    // ignore the saved config / saved state if using ganache
    // augment the config / saved state with variables that may be useful for the validators
    const config = RESET || !ethereumServer ? {} : await loadState(storePath)
    config.tokenAddress = TOKEN_ADDRESS || config.tokenAddress || await deployDemoToken(web3, opts, log)
    config.contractAddress = CONTRACT_ADDRESS || config.contractAddress || await deployContract(web3, config.tokenAddress, blockFreezePeriodSeconds, opts, log)
    config.blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || config.blockFreezePeriodSeconds || 3600
    config.ethereumServer = ethereumServer
    config.ethereumNetworkId = ETHEREUM_NETWORK_ID
    config.operatorAddress = account.address

    const operator = new Operator(web3, config, saveState.bind(null, storePath), log, error)
    await operator.start()
}

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

start().catch(error)
