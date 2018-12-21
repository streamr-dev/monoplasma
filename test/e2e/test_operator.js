const startGanache = require("../../src/startGanache")
const deployDemoToken = require("../../src/deployDemoToken")
const { spawn } = require("child_process")

const opts = {
    from: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1",
    gas: 4000000,
    gasPrice: 4000000000
}

async function start() {
    const ganacheUrl = await startGanache()
    const web3 = new Web3(ganacheUrl)

    const tokenAddress = await deployDemoToken(web3, opts, console.log)

    const proc = spawn("./start_operator.js", [], {
        env: {
            TOKEN_ADDRESS: tokenAddress
        }
    })


}

start().catch(e => {
    console.error(e)
    process.exit(1)
})
