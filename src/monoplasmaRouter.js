const express = require("express")

/** @type {(plasma: Monoplasma) => Function} */
module.exports = plasma => {
    const router = express.Router()

    router.get("/status", (req, res) => {
        const memberCount = plasma.getMemberCount()
        const totalEarnings = plasma.getTotalRevenue()
        const latestBlock = plasma.getLatestBlock()
        const latestWithdrawableBlock = plasma.getLatestWithdrawableBlock()
        res.send({
            memberCount,
            totalEarnings,
            latestBlock,
            latestWithdrawableBlock,
        })
    })

    router.get("/members", (req, res) => {
        res.send(plasma.getMembers())
    })

    router.get("/members/:address", (req, res) => {
        res.send(plasma.getMember(req.params.address))
    })

    return router
}
