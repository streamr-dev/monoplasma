// const plasma = require("./monoplasma")

const express = require("express")

module.exports = plasma => {
    const app = express()

    const bodyParser = require("body-parser")
    app.use(bodyParser.json())

    app.get("/", (req, res) => {
        res.send({
            status: "ok",
        })
    })

    app.get("/members", (req, res) => {
        res.send(plasma.getMembers())
    })

    app.get("/members/:address", (req, res) => {
        res.send(plasma.getMember(req.params.address))
    })

    // TODO: admin auth
    app.post("/members", (req, res) => {
        const { address, name } = req.body
        plasma.addMember(address, name)
        res.status(201).send(plasma.getMember(address))
    })

    // TODO: admin auth
    app.delete("/members/:address", (req, res) => {
        plasma.removeMember(req.params.address)
        res.status(204).send()
    })

    return app
}

