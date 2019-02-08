const Channel = require("../../src/joinPartChannel")

const sleep = require("./sleep-promise")

async function start() {
    const channel = new Channel(8765)
    await channel.listen()

    let joinOk = false
    channel.on("join", addressList => {
        joinOk = addressList[1] === "0x4178babe9e5148c6d5fd431cd72884b07ad855a0"
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
