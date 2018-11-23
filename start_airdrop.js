const fs = require('mz/fs')
const readline = require('readline')

const TruffleResolver = require("truffle-resolver")
const Web3 = require("web3")
const Ganache = require("ganache-core")

const Monoplasma = require("./src/monoplasma")

const {
    INITIAL_BALANCES_FILE,
    ETHEREUM_SERVER,
    ETHEREUM_NETWORK_ID,
    TOKEN_ADDRESS,
    CONTRACT_ADDRESS,
    BLOCK_FREEZE_SECONDS,
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

const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
log(`Connecting to ${ethereumServer || "Ganache Ethereum simulator"}...`)
const web3 = new Web3(ethereumServer || Ganache.provider({
    mnemonic: "testrpc",
}))

function throwIfEnvIsBadEthereumAddress(envVarName) {
    const value = process.env[envVarName]
    if (value && !web3.utils.isAddress(value)) {
        throw new Error(`Environment variable ${envVarName}: Bad Ethereum address ${value}`)
    }
}
throwIfEnvIsBadEthereumAddress("TOKEN_ADDRESS")
throwIfEnvIsBadEthereumAddress("CONTRACT_ADDRESS")

const resolver = new TruffleResolver({
    contracts_build_directory: "build/contracts",
    working_directory: ".",
    provider: web3.currentProvider,
    network_id: 1, // await web3.eth.net.getId(),
    from: "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab",
    gas: 4000000,
})
const Token = resolver.require("./ERC20Mintable.sol")
const Airdrop = resolver.require("./Airdrop.sol")

async function getTokenAddress() {
    const token = await (Token.isDeployed() ? Token.deployed() : deployToken())
    log("Using token deployed @ " + token.address)
    return token.address
}

async function deployToken() {
    log("Deploying a dummy token contract...")
    return Token.new()
}

async function getAirdropAddress(oldTokenAddress) {
    let airdrop
    if (Airdrop.isDeployed()) {
        airdrop = await Airdrop.deployed()
        const deployedTokenAddress = await airdrop.token()
        if (oldTokenAddress && oldTokenAddress != deployedTokenAddress) {
            airdrop = null
        } else {
            log(`Using existing Airdrop contract @ ${airdrop.address}, token @ ${deployedTokenAddress}...`)
        }
    }
    if (!airdrop) {
        const tokenAddress = oldTokenAddress || await getTokenAddress()
        log(`Deploying Airdrop contract (token @ ${tokenAddress}, blockFreezePeriodSeconds = ${blockFreezePeriodSeconds})...`)
        airdrop = await Airdrop.new(tokenAddress, blockFreezePeriodSeconds)
    }
    return airdrop.address
}

async function readBalances(path) {
    log(`Reading balances from ${path}...`)
    const balances = []
    return new Promise((done, fail) => {
        const rl = readline.createInterface({
            input: fs.createReadStream(path),
            crlfDelay: Infinity,
        })
        rl.on('line', line => {
            if (line.length < 40) { return }
            const [address, balance] = line.split(/\s/)
            balances.push([address, { address, balance }])
        })
        rl.on("close", () => done(balances))
        rl.on("SIGINT", () => fail(new Error("Interrupted by user")))
    })
}

async function start() {
    const balances = INITIAL_BALANCES_FILE ? await readBalances(INITIAL_BALANCES_FILE) : {}
    const airdrop = Airdrop.at(CONTRACT_ADDRESS || await getAirdropAddress(TOKEN_ADDRESS))

    log("Deployment done, let's try recording a block...")
    const plasma = new Monoplasma(balances)
    const resp = await airdrop.recordBlock(1, plasma.getRootHash(), "")
    log("Events produced: " + resp.logs.map(log => JSON.stringify(log.args)))
}

start().catch(console.error)
