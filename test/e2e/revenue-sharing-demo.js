/*global describe it */

const fs = require("mz/fs")
const util = require("util")
const exec = util.promisify(require("child_process").exec)
const { spawn } = require("child_process")

const Web3 = require("web3")

const assert = require("assert")

const sleep = require("../utils/sleep-promise")
const { untilStreamContains } = require("../utils/await-until")

const TokenJson = require("../../build/contracts/ERC20Mintable.json")
const MonoplasmaJson = require("../../build/contracts/Monoplasma.json")

const projectRoot = __dirname.split("/test/e2e")[0]

const fetch = require("node-fetch")

const STORE_DIR = __dirname + `/test-store-${+new Date()}`
const GANACHE_PORT = 8586
const WEBSERVER_PORT = 3030

const from = "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1"

const { loadState } = require("../../src/fileStore")(STORE_DIR)

describe("Revenue sharing demo", () => {
    it("should run the happy path demo", async () => {
        console.log("Running start_operator.js...")
        const operatorProcess = spawn(process.execPath, ["start_operator.js"], { env: {
            STORE_DIR,
            GANACHE_PORT,
            WEBSERVER_PORT,
            RESET: "yesplease"
        }})
        operatorProcess.stdout.on("data", data => { console.log(`op> ${data.toString().trim()}`) })
        operatorProcess.stderr.on("data", data => { console.log(`op *** ERROR: ${data}`) })
        operatorProcess.on("close", code => { console.log(`start_operator.js exited with code ${code}`) })
        operatorProcess.on("error", err => { console.log(`start_operator.js ERROR: ${err}`) })

        await untilStreamContains(operatorProcess.stdout, "[DONE]")

        console.log("Getting the init state")
        const state = await loadState()

        const web3 = new Web3("http://localhost:8588")
        const contract = new web3.eth.Contract(MonoplasmaJson.abi, state.contractAddress)
        const token = new web3.eth.Contract(TokenJson.abi, state.tokenAddress)

        const opts = {
            from,
            gas: 4000000,
            gasPrice: 4000000000,
        }

        // 1) click "Add users" button
        const userList = [from,
            "0xeabe498c90fb31f6932ab9da9c4997a6d9f18639",
            "0x4f623c9ef67b1d9a067a8043344fb80ae990c734",
            "0xbb0965a38fcd97b6f34b4428c4bb32875323e012",
            "0x6dde58bf01e320de32aa69f6daf9ba3c887b4db6",
            "0xe04d3d361eb88a67a2bd3a4762f07010708b2811",
            "0x47262e0936ec174b7813941ee57695e3cdcd2043",
            "0xb5fe12f7437dbbc65c53bc9369db133480438f6f",
            "0x3ea97ad9b624acd8784011c3ebd0e07557804e45",
            "0x4d4bb0980c214b8f4e24d7d58ccf5f8a92f70d76",
        ]
        const res1 = await fetch(`http://localhost:${WEBSERVER_PORT}/admin/addUsers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userList),
        })
        console.log(res1)

        // check that there are new users in community
        const res1b = await fetch(`http://localhost:${WEBSERVER_PORT}/api/memberCount`)
        console.log(`Member counts: ${res1b}`)

        /*
        // 2) click "Add revenue" button a couple times
        for (let i = 0; i < 5; i++) {
            console.log("Sending 10 tokens to Monoplasma contract...")
            await token.methods.transfer(contract.options.address, web3.utils.toWei("10", "ether")).send(opts)

            // check total revenue
            const res2 = await fetch(`http://localhost:${WEBSERVER_PORT}/api/totalRevenue`)
            console.log(`Total revenue: ${res2}`)
        }

        // 3) click "View" button
        const res3 = fetch(`/api/members/${from}`).then(resp => resp.json())
        console.log(res3)

        // 4) click "Withdraw button"
        await contract.methods.withdrawAll(res3.blockNumber, res3.earnings, res3.proof).send(opts)

        // check that we got the tokens
        const balanceAfter = await token.methods.balanceOf(from).call()
        console.log(balanceAfter)
        */

        operatorProcess.kill()
    }).timeout(5000)
})
