const express = require("express")
const {utils: { isAddress }} = require("web3")

module.exports = channel => {
    const router = express.Router()

    router.get("/", (req, res) => {
        res.send({
            status: "ok",
        })
    })

    // TODO: "join" event must include blockNumber
    router.post("/members", (req, res) => {
        const addresses = Array.isArray(req.body) ? req.body : [req.body]
        if (addresses.length < 1) {
            res.status(400).send({error: "Must provide at least one member object to add!"})
            return
        }
        for (const address of addresses) {
            if (!isAddress(address)) {
                res.status(400).send({error: `Bad Ethereum address when adding members: ${address}`})
                return
            }
        }
        channel.publish("join", addresses)
        res.set("Location", `${req.url}/${addresses[0].address}`).status(201).send({
            status: "Join sent"
        })
    })

    // TODO: "part" event must include blockNumber
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