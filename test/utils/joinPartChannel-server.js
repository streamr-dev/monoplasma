const channel = require("../../src/joinPartChannel")

const sleep = require("./sleep-promise")

async function start() {
    console.log("Starting server")
    await channel.startServer()
    console.log("Sending joins")
    channel.publish("join", [
        { address: "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab", earnings: 40, name: "Test" },
        { address: "0x4178babe9e5148c6d5fd431cd72884b07ad855a0", earnings: 30, name: "Channel" },
        { address: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1", earnings: 20 },
    ])
    await sleep(100)
    console.log("Sending parts")
    channel.publish("part", [
        "0xdc353aa3d81fc3d67eb49f443df258029b01d8ab",
        "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1",
    ])
}

start().then(() => {
    console.log("OK")
})

setTimeout( () => {console.log("lol")}, 10000)
