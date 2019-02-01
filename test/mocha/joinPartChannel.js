/*global describe it */

const assert = require("assert")
const path = require("path")
const { spawn } = require("child_process")

const Channel = require("../../src/joinPartChannel")

const until = require("../utils/await-until")

const helperFile = path.normalize(path.join(__dirname, "..", "utils", "joinPartChannel"))

const log = () => {} // console.log

function assertThrows(fun, reason) {
    let failed = false
    try {
        fun()
    } catch (e) {
        failed = true
        if (reason) {
            assert.strictEqual(e.message, reason)
        }
    }
    if (!failed) {
        throw new Error("Expected call to fail")
    }
}

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

        await until(() => serverDone && client0Done && client1Done, 5000)

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
        assertThrows(() => channel.startServer(), "Already started as server")
        assertThrows(() => channel.listen(), "Already started as server")
        channel.close()
    })

    it("can't double-start client", () => {
        const channel = new Channel()
        channel.listen()
        assertThrows(() => channel.startServer(), new Error("Already started as client"))
        assertThrows(() => channel.listen(), new Error("Already started as client"))
        channel.close()
    })
})
