const express = require("express")

/** @type {(plasma: Monoplasma) => Function} */
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

    // TODO: test
    router.get("/memberCount", (req, res) => {
        res.send(plasma.getMemberCount())
    })

    router.get("/members/:address", (req, res) => {
        res.send(plasma.getMember(req.params.address))
    })

    return router
}

