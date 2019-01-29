#!/usr/bin/env node
/*global describe it */
const util = require("util")
const exec = util.promisify(require("child_process").exec)
const { spawn } = require("child_process")

const fs = require("fs")
const assert = require("assert")

const sleep = require("../utils/sleep-promise")

// project root dir
const cwd = __dirname.split("/test/e2e")[0]

describe("Airdrop demo", () => {
    it("should run correctly and produce HTML pages", async () => {
        await exec("rm -rf "+cwd+"/static_web/airdrop/0x*") //clean up previously generated files

        // TODO: don't draw in process.env
        const airdrop = spawn("node", ["start_airdrop.js"], { env: Object.assign({
            INPUT_FILE: "10_addresses.txt",
            GANACHE_PORT: 8585,
        }, process.env) })
        airdrop.stdout.on("data", (data) => { console.log(`${data}`) })
        airdrop.stderr.on("data", (data) => { console.log(`stderr: ${data}`) })
        airdrop.on("close", (code) => { console.log(`child process exited with code ${code}`) })
        airdrop.on("error", (err) => { console.log(err) })

        // TODO: watch the output path instead of sleeping
        await sleep(5000)// need to wait for start_airdrop to generate files before checking their content

        const address = "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab"
        const balance = "3.5"
        const outputPath = `${cwd}/static_web/airdrop/${address}/index.html`
        const outputHtml = fs.readFileSync(outputPath)
        assert.ok(outputHtml.indexOf(balance) > -1, "Airdrop token amount not mentioned in " + outputPath)
    }).timeout(10000)
})
