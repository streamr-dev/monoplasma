const fs = require('mz/fs')
const readline = require('readline')

const Web3 = require("web3")
//const Ganache = require("ganache-core")

const { spawn } = require("child_process")

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
    if (ganacheServer) {
        // ctrl+c
        ganacheServer.kill("SIGINT")
        ganacheServer = null
    } else {
        process.exit(1)
    }
}

process.on("exit", () => {
    console.log("Exiting")  // TODO: trap here the ganache problem?
})

const storePath = fs.existsSync(STORE) ? STORE : __dirname + "/static_web/data/operator.json"

async function start() {
    const ethereumServer = ETHEREUM_SERVER || defaultServers[ETHEREUM_NETWORK_ID] || await startSimulator()
    log(`Connecting to ${ethereumServer}...`)
    const web3 = new Web3(ethereumServer)

    // with ganache, use account 0: 0xa3d1f77acff0060f7213d7bf3c7fec78df847de1
    const privateKey = !ganacheServer ? ETHEREUM_PRIVATE_KEY : "0x5e98cce00cff5dea6b454889f359a4ec06b9fa6b88e9d69b86de8e1c81887da0"

    await throwIfSetButNotContract(web3, TOKEN_ADDRESS, "Environment variable TOKEN_ADDRESS")
    await throwIfSetButNotContract(web3, CONTRACT_ADDRESS, "Environment variable CONTRACT_ADDRESS")

    // ignore the saved config / saved state if using ganache
    // augment the config / saved state with variables that may be useful for the validators
    const config = RESET || ganacheServer ? {} : await loadStateFromFile(storePath)
    config.tokenAddress = TOKEN_ADDRESS || config.tokenAddress
    config.contractAddress = CONTRACT_ADDRESS || config.contractAddress
    config.blockFreezePeriodSeconds = +BLOCK_FREEZE_SECONDS || config.blockFreezePeriodSeconds || 3600
    config.ethereumServer = ethereumServer
    config.ethereumNetworkId = ETHEREUM_NETWORK_ID

    const operator = new Operator(web3, privateKey, config, saveStateToFile.bind(null, storePath), log, error)
    await operator.start()
}

/**
 * Start Ganache Ethereum simulator through CLI
 * @returns Promise<string> HTTP endpoint that the simulator is listening
 */
async function startSimulator() {
    ganacheServer = spawn("./node_modules/.bin/ganache-cli", ["-m", "testrpc"])
    ganacheServer.on("close", code => {
        error(new Error("Ganache ethereum simulator exited with code " + code))
    })
    ganacheServer.stderr.on("data", line => {
        log(" GANACHE STDERR > " + line)
    })

    // Ganache is ready to use when it says "Listening on 127.0.0.1:8545"
    return new Promise((done, fail) => {
        let launching = true
        ganacheServer.stdout.on("data", data => {
            const str = data.toString()
            str.split("\n").forEach(line => { log(" ganache > " + line) })
            if (launching) {
                const match = str.match(/Listening on ([0-9.:]*)/)
                if (match) {
                    launching = false
                    const url = "http://" + match[1]        // "127.0.0.1:8545"
                    done(url)
                }
            }
        })
    })
}

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

start().catch(error)
