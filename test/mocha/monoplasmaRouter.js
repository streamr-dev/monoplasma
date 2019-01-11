/* global before after */

const express = require("express")
const bodyParser = require("body-parser")

const fetch = require("node-fetch")
const assert = require("assert")
const http = require("http")

const Monoplasma = require("../../src/monoplasma")
const plasma = new Monoplasma()
const router = require("../../src/monoplasmaRouter")(plasma)

describe("Express app / monoplasma server", () => {
    const port = 3030
    const serverURL = `http://localhost:${port}`
    const { fetchMember, fetchMembers, postMember } = require("../utils/operatorApi")(serverURL)

    let server
    before(() => {
        const app = express()
        app.use(bodyParser.json())
        app.use("/", router)
        server = http.createServer(app)
        server.listen(port)
    })

    describe("Admin API", () => {
        it("initially has no members", async () => {
            assert.deepStrictEqual(await fetchMembers(), [])
        })

        it("can add members", async () => {
            await postMember({
                name: "Tester",
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
            })

            assert.deepStrictEqual(await fetchMembers(), [{
                earnings: "0",
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
                name: "Tester",
            }])
        })

        it("can remove members", async () => {
            await fetch(`${serverURL}/members/0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2`, { method: "DELETE" })

            assert.deepStrictEqual(await fetchMembers(), [])
        })
    })

    describe("Member API", () => {
        it("can request for balance proof", async () => {
            // dirty hack? Directly manipulating server's state...
            plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "Tester1")
            plasma.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "Tester2")
            plasma.addRevenue(100)

            const m2 = await fetchMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef")

            const proof = plasma.getProof("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef")
            assert.deepStrictEqual(m2.proof, proof)
        })
    })

    after(() => {
        server.close()
    })
})
