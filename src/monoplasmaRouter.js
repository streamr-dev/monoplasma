const express = require("express")
const {utils: { isAddress }} = require("web3")

/** Don't send the full member list back, only member count */
function blockToApiObject(block) {
    if (!block || !block.members) { block = { members: [] } }
    return {
        blockNumber: block.blockNumber || 0,
        timestamp: block.timestamp || 0,
        memberCount: block.members.length,
        totalEarnings: block.totalEarnings || 0,
    }
}

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
        const latestBlock = blockToApiObject(plasma.getLatestBlock())
        const latestWithdrawableBlock = blockToApiObject(plasma.getLatestWithdrawableBlock())
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

    router.get("/members/:address", async (req, res) => {
        const address = req.params.address
        if (!isAddress(address)) {
            res.status(400).send({error: `Bad Ethereum address: ${address}`})
            return
        }

        const frozenBlock = plasma.getLatestBlock()
        const withdrawableBlock = plasma.getLatestWithdrawableBlock()
        const member = plasma.getMember(address)
        if (!frozenBlock.blockNumber || !withdrawableBlock.blockNumber) {
            res.send(member)
            return
        }
        const memberFrozen = await plasma.getMemberAt(frozenBlock.blockNumber)
        const memberWithdrawable = plasma.getMemberAt(withdrawableBlock.blockNumber)
        member.frozenEarnings = memberFrozen.earnings
        member.withdrawableEarnings = memberWithdrawable.earnings
        member.withdrawableBlockNumber = withdrawableBlock.blockNumber
        member.proof = memberWithdrawable.proof
        res.send(member)
    })

    router.get("/blocks/:blockNumber", (req, res) => {
        const blockNumber = +req.params.blockNumber
        if (Number.isNaN(blockNumber)) {
            res.status(400).send({error: `Bad block number: ${req.params.blockNumber}`})
            return
        }

        plasma.getBlock(blockNumber).then(block => {
            res.send(block)
        })
    })

    return router
}
