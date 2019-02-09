const express = require("express")
const BN = require("bn.js")
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
        const member = plasma.getMember(address)
        if (!member) {
            res.status(404).send({error: `Member not found: ${address}`})
            return
        }

        const frozenBlock = plasma.getLatestBlock()
        const withdrawableBlock = plasma.getLatestWithdrawableBlock()
        const memberFrozen = frozenBlock ? frozenBlock.members.find(m => m.address === address) || {} : {}
        const memberWithdrawable = withdrawableBlock ? withdrawableBlock.members.find(m => m.address === address) || {} : {}
        member.recordedEarnings = memberFrozen.earnings || "0"
        member.withdrawableEarnings = memberWithdrawable.earnings || "0"
        member.frozenEarnings = new BN(member.recordedEarnings).sub(new BN(member.withdrawableEarnings)).toString(10)
        if (withdrawableBlock) {
            member.withdrawableBlockNumber = withdrawableBlock.blockNumber
            member.proof = await plasma.getProofAt(address, withdrawableBlock.blockNumber)
        }
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
        }).catch(error => {
            res.status(404).send(error)
        })
    })

    return router
}
