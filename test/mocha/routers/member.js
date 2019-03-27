
const express = require("express")
const bodyParser = require("body-parser")

const assert = require("assert")
const http = require("http")

const MonoplasmaState = require("../../../src/state")
const plasma = new MonoplasmaState(0, [], { saveBlock: () => {} })
const router = require("../../../src/routers/member")(plasma)

describe("Express app / Monoplasma router", () => {
    const port = 3030
    const serverURL = `http://localhost:${port}`
    const { fetchMember } = require("../../utils/operatorApi")(serverURL)

    let server
    before(() => {
        const app = express()
        app.use(bodyParser.json())
        app.use("/", router)
        server = http.createServer(app)
        server.listen(port)
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
