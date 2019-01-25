const express = require("express")
const {utils: { isAddress }} = require("web3")

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

    // TODO: admin auth
    router.post("/members", (req, res) => {
        const newMembers = Array.isArray(req.body) ? req.body : [req.body]
        if (newMembers.length === 0) {
            res.status(400).send({error: "Must provide at least one member object to add!"})
            return
        }
        for (const member of newMembers) {
            if (!isAddress(member.address)) {
                res.status(400).send({error: `Bad Ethereum address: ${member.address}. Every member must have a valid Ethereum address!`})
                return
            }
        }
        const added = plasma.addMembers(newMembers)
        const total = newMembers.length
        res.set("Location", `${req.url}/${newMembers[0].address}`).status(201).send({
            total,
            added,
            activated: total - added,
        })
    })

    // TODO: admin auth
    router.delete("/members/:address", (req, res) => {
        plasma.removeMember(req.params.address)
        res.status(204).send()
    })

    return router
}

