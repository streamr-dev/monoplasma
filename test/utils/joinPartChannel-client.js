const Channel = require("../../src/joinPartChannel")

const sleep = require("./sleep-promise")

async function start() {
    const channel = new Channel()
    await channel.listen()

    let joinOk = false
    channel.on("join", addressList => {
        joinOk = addressList[0].earnings === 40
        console.log(`Got ${addressList.length} joining addresses, data was ${joinOk ? "OK" : "NOT OK"}`)
    })

    let partOk = false
    channel.on("part", addressList => {
        partOk = addressList[0] === "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab"
        console.log(`Got ${addressList.length} parting addresses, data was ${partOk ? "OK" : "NOT OK"}`)
    })

    await sleep(500)

    if (joinOk && partOk) {
        console.log("[OK]")
    }
    channel.close()
}
start()
