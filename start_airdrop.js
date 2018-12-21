#!/usr/bin/env node

const fs = require("mz/fs")
const readline = require("readline")
const BN = require("bn.js")

const Web3 = require("web3")
const Ganache = require("ganache-core")

const Monoplasma = require("./src/monoplasma")

const deployDemoToken = require("./src/deployDemoToken")
const formatDecimals = require("./src/formatDecimals")

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

    // these will be used  1) for demo token  2) if TOKEN_ADDRESS doesn't support name() and symbol()
    TOKEN_SYMBOL,
    TOKEN_NAME,
    TOKEN_DECIMALS,

    // if ETHEREUM_SERVER isn't specified, start a local Ethereum simulator (Ganache) in given port
    GANACHE_PORT,
} = process.env

const log = !QUIET ? console.log : () => {}
const error = e => {
    console.error(e.stack)
    process.exit(1)
}

// Block freeze functionality is kind of pointless for airdrops, since all distributed tokens are operator's to begin with
const blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || 1

// network ids: 1 = mainnet, 2 = morden, 3 = ropsten, 4 = rinkeby (current testnet)
const defaultServers = {
    "1": "wss://mainnet.infura.io/ws",
    "3": "wss://ropsten.infura.io/ws",
    "4": "wss://rinkeby.infura.io/ws",
}

const TokenJson = require("./build/contracts/DemoToken.json")
const AirdropJson = require("./build/contracts/Airdrop.json")

async function start() {
    const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
    log(`Connecting to ${ethereumServer || "Ganache Ethereum simulator"}...`)
    function ganacheLog(msg) { log("        Ganache > " + msg) }
    const web3 = new Web3(ethereumServer || await require("./src/startGanache")(GANACHE_PORT, ganacheLog, error))

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

    const balances = INPUT_FILE ? await readBalances(INPUT_FILE) : {}

    const contractAddress = CONTRACT_ADDRESS || await deployContract(web3, TOKEN_ADDRESS, blockFreezePeriodSeconds, contractDefaults, log)
    const airdrop = new web3.eth.Contract(AirdropJson.abi, contractAddress, contractDefaults)
    const tokenAddress = await airdrop.methods.token().call()
    const token = new web3.eth.Contract(TokenJson.abi, tokenAddress, contractDefaults)

    log("Find token info:")
    const tokenName = await token.methods.name().call().catch(e => {
        log("Token name query failed: " + e.message)
        return TOKEN_NAME || "Ethereum token"
    })
    const tokenSymbol = await token.methods.symbol().call().catch(e => {
        log("Token symbol query failed: " + e.message)
        return TOKEN_SYMBOL || "ERC20"
    })
    const tokenDecimals = await token.methods.decimals().call().catch(e => {
        log("Token decimals query failed: " + e.message)
        return TOKEN_DECIMALS || 18
    })
    log("    Token name:     " + tokenName)
    log("    Token symbol:   " + tokenSymbol)
    log("    Token decimals: " + tokenDecimals)

    log("Checking token numbers match...")
    const totalTokenWei = balances.map(account => account.balance).reduce((sum, x) => sum.add(new BN(x)), new BN(0))
    const adminBalance = await token.methods.balanceOf(contractDefaults.from).call()
    log("    Tokens allocated: " + totalTokenWei.toString())
    log("    Tokens owned:     " + adminBalance.toString())
    if (new BN(adminBalance).lt(totalTokenWei)) {
        throw new Error(`Operator address ${contractDefaults.from} has only ${adminBalance} ${tokenSymbol}, but allocations have been done worth ${totalTokenWei} ${tokenSymbol}`)
    }

    log("Move tokens into the Airdrop contract...")
    const moveResp = await token.methods.transfer(airdrop.options.address, totalTokenWei.toString()).send()
    log("Events produced: " + Object.keys(moveResp.events))
    log(JSON.stringify(moveResp.events.Transfer))

    log("Deployment done, record balances into contract...")
    const plasma = new Monoplasma(balances)
    const blockNumber = await web3.eth.getBlockNumber()
    const recordResp = await airdrop.methods.recordBlock(blockNumber, plasma.getRootHash(), "").send()
    log("Events produced: " + Object.keys(recordResp.events))
    log(JSON.stringify(recordResp.events.BlockCreated.returnValues))

    // instantiate template pages to static_web/airdrop/<address>/index.html
    const template = (await fs.readFile("./static_web/airdrop/template/index.html")).toString()
    for (const account of balances) {
        const proof = plasma.getProof(account.address)
        const html = template
            .replace("TOKENNAME", web3.toWei)
            .replace("TOKENAMOUNT", formatDecimals(account.balance, tokenDecimals))
            .replace("SYMBOL", tokenSymbol)
            .replace("ADDRESS", account.balance)
            .replace("BLOCKNUMBER", blockNumber)
            .replace("WEIAMOUNT", account.balance)
            .replace("PROOFJSON", JSON.stringify(proof))
            .replace("CONTRACTADDR", contractAddress)
            .replace("CONTRACTABI", JSON.stringify(AirdropJson.abi.filter(f => f.name === "proveSidechainBalance")))
            .replace("PROOFSTRING", proof.toString())
        const dir = `./static_web/airdrop/${account.address}`
        if (!fs.existsSync(dir)) { await fs.mkdirSync(dir) }
        await fs.writeFile(`${dir}/index.html`, html)
    }

    log("DONE")
}

async function deployContract(web3, oldTokenAddress, blockFreezePeriodSeconds, sendOptions, log) {
    const tokenAddress = oldTokenAddress || await deployDemoToken(web3, TOKEN_NAME, TOKEN_SYMBOL, sendOptions, log)
    log(`Deploying root chain contract (token @ ${tokenAddress}, blockFreezePeriodSeconds = ${blockFreezePeriodSeconds})...`)
    const Airdrop = new web3.eth.Contract(AirdropJson.abi)
    const airdrop = await Airdrop.deploy({
        data: AirdropJson.bytecode,
        arguments: [tokenAddress, blockFreezePeriodSeconds]
    }).send(sendOptions)
    return airdrop.options.address
}

async function readBalances(path) {
    log(`Reading balances from ${path}...`)
    const balances = []
    return new Promise((done, fail) => {
        const rl = readline.createInterface({
            input: fs.createReadStream(path),
            crlfDelay: Infinity,
        })
        rl.on("line", line => {
            if (line.length < 40) { return }
            const [address, balance] = line.split(/\s/)
            balances.push({ address, balance })
        })
        rl.on("close", () => done(balances))
        rl.on("SIGINT", () => fail(new Error("Interrupted by user")))
    })
}

start().catch(error)
