const express = require("express")

module.exports = plasma => {
    const router = express.Router()

    router.get("/", (req, res) => {
        res.send({
            status: "ok",
        })
    })

    router.get("/members", (req, res) => {
        res.send(plasma.getMembers())
    })

    router.get("/members/:address", (req, res) => {
        res.send(plasma.getMember(req.params.address))
    })

    // TODO: admin auth
    router.post("/members", (req, res) => {
        const { address, name } = req.body
        plasma.addMember(address, name)
        res.status(201).send(plasma.getMember(address))
    })

    // TODO: admin auth
    router.delete("/members/:address", (req, res) => {
        plasma.removeMember(req.params.address)
        res.status(204).send()
    })

    return router
}

