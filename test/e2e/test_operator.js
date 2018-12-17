const startGanache = require("../../src/startGanache")(console.log)
const { spawn } = require("child_process")

async function start() {
    const ganacheUrl = await startGanache()
    const web3 = new Web3(ganacheUrl)

    proc = spawn("./start_operator.js", {
        env: {

        }
    })

}

start().catch(e => {
    console.error(e)
    process.exit(1)
})
