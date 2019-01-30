/*global describe it */

const assert = require("assert")
const path = require("path")
const { spawn } = require("child_process")

const Channel = require("../../src/joinPartChannel")

const sleep = require("../utils/sleep-promise")

const helperFile = path.normalize(path.join(__dirname, "..", "utils", "joinPartChannel"))

const log = () => {} // console.log

describe("joinPartChannel", () => {
    it("gets messages through", async function () {
        const client0 = spawn("node", [`${helperFile}-client.js`])
        const client1 = spawn("node", [`${helperFile}-client.js`])

        const server = spawn("node", [`${helperFile}-server.js`])

        let serverDone = false
        server.stdout.on("data", data => {
            log("Server: " + data.toString())
            if (data.indexOf("[OK]") > -1) {
                serverDone = true
            }
        })

        let client0Done = false
        client0.stdout.on("data", data => {
            log("Client 0: " + data.toString())
            if (data.indexOf("[OK]") > -1) {
                client0Done = true
            }
        })

        let client1Done = false
        client1.stdout.on("data", data => {
            log("Client 1: " + data.toString())
            if (data.indexOf("[OK]") > -1) {
                client1Done = true
            }
        })

        await sleep(500)

        server.kill()
        client1.kill()
        client0.kill()

        assert(serverDone, "Server fails")
        assert(client0Done, "Client 0 fails")
        assert(client1Done, "Client 1 fails")
    })

    it("can't double-start server", () => {
        const channel = new Channel()
        channel.startServer()
        assert.throws(() => channel.startServer(), new Error("Already started as server"))
        assert.throws(() => channel.listen(), new Error("Already started as server"))
        channel.close()
    })

    it("can't double-start client", () => {
        const channel = new Channel()
        channel.listen()
        assert.throws(() => channel.startServer(), new Error("Already started as client"))
        assert.throws(() => channel.listen(), new Error("Already started as client"))
        channel.close()
    })
})
