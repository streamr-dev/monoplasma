#!/usr/bin/env node

const fs = require("fs")

const tokenAbi = JSON.parse(fs.readFileSync("build/contracts/DemoToken.json")).abi
fs.writeFileSync("demo/src/utils/tokenAbi.json", JSON.stringify(tokenAbi))

let monoplasmaAbi = JSON.parse(fs.readFileSync("build/contracts/Monoplasma.json")).abi
fs.writeFileSync("demo/src/utils/monoplasmaAbi.json", JSON.stringify(monoplasmaAbi))
