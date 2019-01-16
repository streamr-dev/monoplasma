#!/usr/bin/env node

const fs = require("mz/fs")
const readline = require("readline")
const BN = require("bn.js")
const onProcessExit = require("exit-hook")

const Web3 = require("web3")
const Ganache = require("ganache-core")

const { defaultServers, throwIfSetButNotContract } = require("./src/ethSync")

const Monoplasma = require("./src/monoplasma")

const deployDemoToken = require("./src/deployDemoToken")
const formatDecimals = require("./src/formatDecimals")

const TokenJson = require("./build/contracts/DemoToken.json")
const AirdropJson = require("./build/contracts/Airdrop.json")

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

const log = QUIET ? () => {} : console.log
const error = (e, ...args) => {
    console.error(e.stack, args)
    process.exit(1)
}

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

    log(`Reading the airdropped token amounts from ${INPUT_FILE || "(no INPUT_FILE, generating 1.5 tokens to 0xa3d1F77ACfF0060F7213D7BF3c7fEC78df847De1 for demo)"}...`)
    const balances = INPUT_FILE ? await readBalances(INPUT_FILE) : [{
        address: "0xa3d1F77ACfF0060F7213D7BF3c7fEC78df847De1",
        balance: "1500000000000000000"
    }]

    let privateKey
    let ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID]
    if (ethereumServer) {
        if (!ETHEREUM_PRIVATE_KEY) { throw new Error("ETHEREUM_PRIVATE_KEY environment variable required to deploy the airdrop contract. Deploy transaction must be signed.") }
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
    const deployerAccount = web3.eth.accounts.wallet.add(privateKey)

    await throwIfSetButNotContract(web3, TOKEN_ADDRESS, "Environment variable TOKEN_ADDRESS")
    await throwIfSetButNotContract(web3, CONTRACT_ADDRESS, "Environment variable CONTRACT_ADDRESS")

    const contractDefaults = {
        from: deployerAccount.address,
        gas: 4000000,
        gasPrice: web3.utils.toWei(GAS_PRICE_GWEI || "10", "Gwei")
    }

    const contractAddress = CONTRACT_ADDRESS || await deployContract(web3, TOKEN_ADDRESS, contractDefaults, log)
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
    const totalTokenWei = balances.map(account => account.earnings).reduce((sum, x) => sum.add(new BN(x)), new BN(0))
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
            .replace(/TOKENNAME/g, tokenName)
            .replace(/TOKENAMOUNT/g, formatDecimals(account.earnings, tokenDecimals))
            .replace(/SYMBOL/g, tokenSymbol)
            .replace(/ADDRESS/g, account.address)
            .replace(/BLOCKNUMBER/g, blockNumber)
            .replace(/WEIAMOUNT/g, account.earnings)
            .replace(/PROOFJSON/g, JSON.stringify(proof).replace(/"/g, "'"))
            .replace(/CONTRACTADDR/g, contractAddress)
            .replace(/CONTRACTABI/g, JSON.stringify(AirdropJson.abi.filter(f => f.name === "proveSidechainBalance")))
            .replace(/PROOFSTRING/g, proof.toString())
        const dir = `${__dirname}/static_web/airdrop/${account.address.toLowerCase()}`
        if (!fs.existsSync(dir)) { await fs.mkdirSync(dir) }
        await fs.writeFile(`${dir}/index.html`, html)
        log(`Wrote file://${dir}/index.html`)
    }

    log("DONE")
    process.exit(0)     // also shuts down Ganache
}

async function deployContract(web3, oldTokenAddress, sendOptions, log) {
    const tokenAddress = oldTokenAddress || await deployDemoToken(web3, TOKEN_NAME, TOKEN_SYMBOL, sendOptions, log)
    log(`Deploying root chain contract (token @ ${tokenAddress})...`)
    const Airdrop = new web3.eth.Contract(AirdropJson.abi)
    const airdrop = await Airdrop.deploy({
        data: AirdropJson.bytecode,
        arguments: [tokenAddress]
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
            const [address, earnings] = line.split(/\s/)
            balances.push({ address, earnings })
        })
        rl.on("close", () => done(balances))
        rl.on("SIGINT", () => fail(new Error("Interrupted by user")))
    })
}

start().catch(error)
