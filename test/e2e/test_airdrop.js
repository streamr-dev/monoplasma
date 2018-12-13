#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require("fs")
const assert = require("assert")

// project root dir
const cwd = __dirname.split("/test/e2e")[0],

execSync("node start_airdrop.js", [] {
    cwd
    env: {
        "INITIAL_BALANCES_FILE": "10_addresses.txt",
    }
})

// row from 10_addresses.txt
const address = "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab"
const balance = "2888772330386780185465000"
const generatedPath = cwd + "/static_web/airdrop/0xdc353aa3d81fc3d67eb49f443df258029b01d8ab/index.html"
const generated = fs.readFileSync(generatedPath)
assert.ok(generated.indexOf(balance.slice(0, -18)) > -1, "Airdrop token amount not mentioned in " + generatedPath)
