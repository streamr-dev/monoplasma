const express = require("express")
const {utils: { isAddress }} = require("web3")

module.exports = channel => {
    const router = express.Router()

    router.post("/members", (req, res) => {
        const newMembers = Array.isArray(req.body) ? req.body : [req.body]
        if (newMembers.length < 1) {
            res.status(400).send({error: "Must provide at least one member object to add!"})
            return
        }
        for (const member of newMembers) {
            if (!isAddress(member.address)) {
                res.status(400).send({error: `Bad Ethereum address: ${member.address}. Every member must have a valid Ethereum address!`})
                return
            }
        }
        channel.publish("join", newMembers)
        res.set("Location", `${req.url}/${newMembers[0].address}`).status(201).send({
            status: "Join sent"
        })
    })

    router.delete("/members/:address", (req, res) => {
        const address = req.params.address
        if (!isAddress(address)) {
            res.status(400).send({error: `Bad Ethereum address: ${address}`})
            return
        }
        channel.publish("part", [address])
        res.status(204).send()
    })

    return router
}