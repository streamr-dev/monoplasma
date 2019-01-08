#!/usr/bin/env node
const util = require("util")
const exec = util.promisify(require("child_process").exec)
const { spawn } = require("child_process")

const fs = require("fs")
const assert = require("assert")

// project root dir
const cwd = __dirname.split("/test/e2e")[0]

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve,ms)
    })
}

describe("start_airdrop", () => {
    it("should run correctly", async () => {
        await exec("rm -rf "+cwd+"/static_web/airdrop/0x*") //clean up previously generated files

        const env = Object.create( process.env )
        env.INPUT_FILE = "10_addresses.txt"
        env.GANACHE_PORT = 8546
        const airdrop = spawn("node", ["start_airdrop.js"], { env: env })
        airdrop.stdout.on("data", (data) => {
            console.log(`${data}`)
        })
        airdrop.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`)
        })
        airdrop.on("close", (code) => {
            console.log(`child process exited with code ${code}`)
        })
        airdrop.on("error", (err) => {
            console.log(err)
        })

        await sleep(5000)// need to wait for start_airdrop to generate files before checking their content

        const address = "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab"
        const balance = "3.5"
        const generatedPath = `${cwd}/static_web/airdrop/${address}/index.html`
        const generated = fs.readFileSync(generatedPath)
        assert.ok(generated.indexOf(balance) > -1, "Airdrop token amount not mentioned in " + generatedPath)
    }).timeout(10000)
})
