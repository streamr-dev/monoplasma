const channel = require("../../src/joinPartChannel")

const sleep = require("./sleep-promise")

const clientId = process.env.TEST_ID
if (!clientId) {
    throw new Error("Please add TEST_ID to environment!")
}

async function start() {
    await channel.listen(clientId)
    let joinOk = false
    channel.on("join", (data, socket) => {
        // TODO: check data
        console.log(data)
        joinOk = true
    })
    let partOk = false
    channel.on("part", (data, socket) => {
        // TODO: check data
        console.log(data)
        partOk = true
    })
    await sleep(50)
    if (joinOk && partOk) {
        console.log("OK")
    }
}
start()
