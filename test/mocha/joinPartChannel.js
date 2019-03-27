
const assert = require("assert")
const path = require("path")
const { spawn } = require("child_process")

const Channel = require("../../src/joinPartChannel")

const { untilStreamContains } = require("../utils/await-until")

const helperFile = path.normalize(path.join(__dirname, "..", "utils", "joinPartChannel"))

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

        await Promise.all([
            untilStreamContains(client0.stdout, "[OK]"),
            untilStreamContains(client1.stdout, "[OK]"),
            untilStreamContains(server.stdout, "[OK]"),
        ])

        server.kill()
        client1.kill()
        client0.kill()
    }).timeout(2000)

    it("can't double-start server", () => {
        const channel = new Channel(9876)
        channel.startServer()
        assertThrows(() => channel.startServer(), "Already started as server")
        assertThrows(() => channel.listen(), "Already started as server")
        channel.close()
    })

    it("can't double-start client", () => {
        const channel = new Channel(9876)
        channel.listen()
        assertThrows(() => channel.startServer(), "Already started as client")
        assertThrows(() => channel.listen(), "Already started as client")
        channel.close()
    })
})
