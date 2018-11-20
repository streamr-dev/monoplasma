/* global before after */

const Monoplasma = require("../../src/monoplasma")
const plasma = new Monoplasma()
const expressApp = require("../../src/expressApp")(plasma)
const fetch = require("node-fetch")
const assert = require("assert")
const http = require("http")

describe("Express app / monoplasma server", () => {
    const port = 3030
    const serverURL = `http://localhost:${port}`
    let server
    before(() => {
        server = http.createServer(expressApp)
        server.listen(port)
    })

    function fetchMembers() {
        return fetch(`${serverURL}/members`)
            .then(res => res.json())
    }

    function fetchMember(address) {
        return fetch(`${serverURL}/members/${address}`)
            .then(res => res.json())
    }

    function postMember(body) {
        fetch(`${serverURL}/members`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        }).then(res => res.json())
    }

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
                earnings: 0,
                name: "Tester",
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
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
