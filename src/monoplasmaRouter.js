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
        const address = req.params.address
        if (!isAddress(address)) {
            res.status(400).send({error: `Bad Ethereum address: ${address}`})
            return
        }

        const frozenBlock = plasma.getLatestBlock()
        const withdrawableBlock = plasma.getLatestWithdrawableBlock()
        const member = plasma.getMember(address)
        if (!frozenBlock.blockNumber || !withdrawableBlock.blockNumber) {
            return member
        }
        const memberFrozen = plasma.getMemberAt(frozenBlock.blockNumber)
        const memberWithdrawable = plasma.getMemberAt(withdrawableBlock.blockNumber)
        member.frozenEarnings = memberFrozen.earnings
        member.withdrawableEarnings = memberWithdrawable.earnings
        member.withdrawableBlockNumber = withdrawableBlock.blockNumber
        member.proof = memberWithdrawable.proof
        res.send(member)
    })

    return router
}
