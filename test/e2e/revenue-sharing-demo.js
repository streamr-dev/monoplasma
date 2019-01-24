const fs = require("mz/fs")
const util = require("util")
const exec = util.promisify(require("child_process").exec)
const { spawn } = require("child_process")

const assert = require("assert")

const { loadState } = require("../../src/fileStore")

const TokenJson = require("../../build/contracts/ERC20Mintable.json")
const MonoplasmaJson = require("../../build/contracts/Monoplasma.json")

const projectRoot = __dirname.split("/test/e2e")[0]

const STORE = __dirname + "/tmp.json"
const GANACHE_PORT = 8586
const WEBSERVER_PORT = 3030

describe("Revenue sharing demo", () => {
    it("should run correctly", async () => {
        console.log("Cleaning up previously generated state")
        await exec(`rm -f ${STORE}`)    // ignore not found error

        console.log("Running start_operator.js...")
        const operatorProcess = spawn("node", ["start_operator.js"], { env: {
            STORE,
            GANACHE_PORT,
            WEBSERVER_PORT,
        }})
        operatorProcess.stdout.on("data", data => { console.log(`> ${data}`) })
        operatorProcess.stderr.on("data", data => { console.log(`*** ERROR: ${data}`) })
        operatorProcess.on("close", code => { console.log(`start_operator.js exited with code ${code}`) })
        operatorProcess.on("error", err => { console.log(`start_operator.js ERROR: ${err}`) })

        // TODO: watch the STORE instead of sleeping
        await sleep(5000)

        console.log("Getting the init state")
        const state = await loadState(STORE)
        const web3 = new Web3("http://localhost:8588")
        const contract = new web3.eth.Contract(MonoplasmaJson.abi, state.contractAddress)
        const token = new web3.eth.Contract(TokenJson.abi, state.tokenAddress)

        const port = 3030
        const serverURL = `http://localhost:${port}`
        const { fetchMember, fetchMembers, postMember } = require("../utils/operatorApi")(serverURL)

        //    event BlockCreated(uint rootChainBlockNumber, uint timestamp, bytes32 rootHash, string ipfsHash);
        const blockFilter = contract.events.BlockCreated()
        let lastPublished = -1
        blockFilter.on("data", event => {
            lastPublished = event.arguments.rootChainBlockNumber
            console.log("Block published: " + JSON.stringify(event.arguments))
        })

        console.log("Root chain event: Adding member 0xa6743286b55f36afa5f4e7e35b6a80039c452dbd...")
        await contract.methods.addRecipient("0xa6743286b55f36afa5f4e7e35b6a80039c452dbd").send(opts)
        await sleep(100)
        console.log("Current monoplasma members and their earnings: ")
        console.log(plasma.getMembers())

        console.log("Root chain event: Minting 1000 tokens...")
        await token.methods.mint(contract.options.address, 1000).send(opts)
        await sleep(100)
        console.log("Current monoplasma members and their earnings: ")
        console.log(plasma.getMembers())

        console.log("Root chain event: Adding member 0x795063367ebfeb994445d810b94461274e4f109a...")
        await contract.methods.addRecipient("0x795063367ebfeb994445d810b94461274e4f109a").send(opts)
        await sleep(100)
        console.log("Current monoplasma members and their earnings: ")
        console.log(plasma.getMembers())

        console.log("Root chain event: Adding member 0x505d48552ac17ffd0845ffa3783c2799fd4aad78...")
        await contract.methods.addRecipient("0x505d48552ac17ffd0845ffa3783c2799fd4aad78").send(opts)
        await sleep(100)
        console.log("Current monoplasma members and their earnings: ")
        console.log(plasma.getMembers())

        console.log("Root chain event: removing member 0x795063367ebfeb994445d810b94461274e4f109a...")
        await contract.methods.removeRecipient("0x795063367ebfeb994445d810b94461274e4f109a").send(opts)
        await sleep(100)
        console.log("Current monoplasma members and their earnings: ")
        console.log(plasma.getMembers())

        console.log("Root chain event: Minting 500 tokens...")
        await token.methods.mint(contract.options.address, 500).send(opts)
        await sleep(100)
        console.log("Current monoplasma members and their earnings: ")
        console.log(plasma.getMembers())

        const expectedBalances = [
            {
                address: "0x505D48552Ac17FfD0845FFA3783C2799fd4aaD78",
                earnings: "250",
            },
            {
                address: "0xa6743286b55F36AFA5F4e7e35B6a80039C452dBD",
                earnings: "1250",
            }
        ]
        assert.deepStrictEqual(state.balances, expectedBalances)

        // TODO: kill ganache and web server
        await exec("kill")
    }).timeout(10000)
})

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}
