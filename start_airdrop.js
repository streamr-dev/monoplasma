const fs = require('mz/fs')
const readline = require('readline')

const Web3 = require("web3")
const Ganache = require("ganache-core")

const Monoplasma = require("./src/monoplasma")

const {
    INPUT_FILE,
    ETHEREUM_SERVER,
    ETHEREUM_NETWORK_ID,
    ETHEREUM_PRIVATE_KEY,
    TOKEN_ADDRESS,
    CONTRACT_ADDRESS,
    BLOCK_FREEZE_SECONDS,
    GAS_PRICE_GWEI,
    QUIET,
} = process.env

const log = !QUIET ? console.log : () => {}

// Block freeze functionality is kind of pointless for airdrops, since all distributed tokens are operator's to begin with
const blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || 1

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

// with ganache, use account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
const privateKey = ethereumServer ? ETHEREUM_PRIVATE_KEY : "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"
if (!privateKey) { throw new Error("Private key required to deploy the airdrop contract. Deploy transaction must be signed.") }
const key = privateKey.startsWith("0x") ? privateKey : "0x" + privateKey
if (key.length !== 66) { throw new Error("Malformed private key, must be 64 hex digits long (optionally prefixed with '0x')") }
const deployerAccount = web3.eth.accounts.wallet.add(key)

const contractDefaults = {
    from: deployerAccount.address,
    gas: 4000000,
    gasPrice: web3.utils.toWei(GAS_PRICE_GWEI || "10", "Gwei")
}

function throwIfEnvIsBadEthereumAddress(envVarName) {
    const value = process.env[envVarName]
    if (value && !web3.utils.isAddress(value)) {
        throw new Error(`Environment variable ${envVarName}: Bad Ethereum address ${value}`)
    }
}
throwIfEnvIsBadEthereumAddress("TOKEN_ADDRESS")
throwIfEnvIsBadEthereumAddress("CONTRACT_ADDRESS")

const TokenJson = require("./build/contracts/ERC20Mintable.json")
const AirdropJson = require("./build/contracts/Airdrop.json")

async function deployContract(oldTokenAddress) {
    const tokenAddress = oldTokenAddress || await deployToken()
    log(`Deploying root chain contract (token @ ${tokenAddress}, blockFreezePeriodSeconds = ${blockFreezePeriodSeconds})...`)
    const Airdrop = new web3.eth.Contract(AirdropJson.abi)
    const contract = await Airdrop.deploy({
        data: AirdropJson.bytecode,
        arguments: [tokenAddress, blockFreezePeriodSeconds]
    }).send(contractDefaults)
    return contract.options.address
}

async function deployToken() {
    log("Deploying a dummy token contract...")
    const Token = new web3.eth.Contract(TokenJson.abi)
    const token = await Token.deploy({data: TokenJson.bytecode}).send(contractDefaults)
    return token.options.address
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
            balances.push({ address, balance })
        })
        rl.on("close", () => done(balances))
        rl.on("SIGINT", () => fail(new Error("Interrupted by user")))
    })
}

async function start() {
    const balances = INPUT_FILE ? await readBalances(INPUT_FILE) : {}

    const contractAddress = CONTRACT_ADDRESS || await deployContract(TOKEN_ADDRESS)
    const airdrop = new web3.eth.Contract(AirdropJson.abi, contractAddress, contractDefaults)
    const tokenAddress = await airdrop.methods.token().call()
    const token = new web3.eth.Contract(TokenJson.abi, tokenAddress, contractDefaults)

    let resp
    log("Deployment done, let's try recording a block...")
    const plasma = new Monoplasma(balances)
    resp = await airdrop.methods.recordBlock(1, plasma.getRootHash(), "").send()
    log("Events produced: " + Object.keys(resp.events))
    log(JSON.stringify(resp.events.BlockCreated.returnValues))

    log("Mint tokens into the Airdrop contract...")
    const totalTokens = balances.map(account => account.balance).reduce((x, sum) => sum + x, 0)
    resp = await token.methods.mint(airdrop.options.address, totalTokens).send()
    log("Events produced: " + Object.keys(resp.events))
    log(JSON.stringify(resp.events.Transfer.returnValues))

    // TODO: instantiate template pages to static_web/airdrop/<address>/index.html
}

start().catch(e => { console.error(e.stack) })
