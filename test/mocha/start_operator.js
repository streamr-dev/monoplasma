#!/usr/bin/env node
const util = require("util")
const exec = util.promisify(require("child_process").exec)
const { spawn } = require("child_process")

const assert = require("assert")

const { loadState } = require("../../src/fileStore")

// project root dir
const cwd = __dirname.split("/test/mocha")[0]

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve,ms)
    })
}

describe("start_operator", () => {
    it("should run correctly", async () => {
        await exec("rm -rf "+cwd+"/static_web/data/operator.json") //clean up previously generated state

        const env = Object.create( process.env )
        const operator = spawn("node", ["start_operator.js"], { env: env })
        operator.stdout.on("data", (data) => {
            console.log(`${data}`)
        })
        operator.stderr.on("data", (data) => {
            console.log(`stderr: ${data}`)
        })
        operator.on("close", (code) => {
            console.log(`child process exited with code ${code}`)
        })
        operator.on("error", (err) => {
            console.log(err)
        })

        await sleep(3500)// need to wait for start_operator to generate the new state

        const generatedPath = `${cwd}/static_web/data/operator.json`
        const generatedState = await loadState(generatedPath)
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
        assert.deepStrictEqual(generatedState.balances, expectedBalances)
    }).timeout(10000)
})
