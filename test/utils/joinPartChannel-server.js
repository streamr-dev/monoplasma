const Channel = require("../../src/joinPartChannel")

const sleep = require("./sleep-promise")

async function start() {
    const channel = new Channel(8765)
    console.log("Starting server")
    await channel.startServer()

    await sleep(200)

    //for (let i = 0; i < 2; i++) {
    console.log("Sending joins")
    channel.publish("join", [
        "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab",
        "0x4178babe9e5148c6d5fd431cd72884b07ad855a0",
        "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1",
    ])
    await sleep(50)
    console.log("Sending parts")
    channel.publish("part", [
        "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab",
        "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1",
    ])
    await sleep(50)
    console.log("[OK]")
    //}
    channel.close()
}

start()
