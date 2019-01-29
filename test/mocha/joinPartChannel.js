/*global describe it */

const { spawn } = require("child_process")

describe("joinPartChannel", () => {
    it("gets messages through", done => {
        const server = spawn("node", ["../utils/joinPartChannel-server.js"])
        const client0 = spawn("node", ["../utils/joinPartChannel-client.js"], { env: { TEST_ID: "client0" } })
        const client1 = spawn("node", ["../utils/joinPartChannel-client.js"], { env: { TEST_ID: "client1" } })

        let serverDone = false
        server.stdout.on("data", data => {
            if (data.indexOf("OK") > -1) {
                serverDone = true
            }
        })

        let client0Done = false
        client0.stdout.on("data", data => {
            if (data.indexOf("OK") > -1) {
                client0Done = true
            }
        })

        let client1Done = false
        client1.stdout.on("data", data => {
            if (data.indexOf("OK") > -1) {
                client1Done = true
            }
        })


        setTimeout(() => {
            if (!serverDone) { done(new Error("Server fails")) }
            if (!client0Done) { done(new Error("Client 0 fails")) }
            if (!client1Done) { done(new Error("Client 1 fails")) }
            done()
        }, 1000)
    })
})
