const express = require("express")
const BN = require("bn.js")
const {utils: { isAddress }} = require("web3")

const {
    QUIET,
} = process.env

const log = QUIET ? () => {} : console.log

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
        //log("Requested monoplasma status")  // commented out because demo UI spams it
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
        log("Requested monoplasma members")
        res.send(plasma.getMembers())
    })

    router.get("/members/:address", async (req, res) => {
        const address = req.params.address
        //log(`Requested member ${address}`)  // commented out because demo UI spams it
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

    router.get("/blocks", (req, res) => {
        const maxNumberLatest = req.query.n
        log(`Requested ${maxNumberLatest || "ALL"} latest blocks`)
        plasma.listBlockNumbers(maxNumberLatest).then(blockNumberList => {
            return Promise.all(blockNumberList.map(bnum => {
                return plasma.getBlock(bnum).then(blockToApiObject)
            }))
        }).then(blockList => {
            res.send(blockList)
        })
    })

    router.get("/blocks/:blockNumber", (req, res) => {
        const blockNumber = +req.params.blockNumber
        log(`Requested block ${blockNumber}`)
        if (Number.isNaN(blockNumber)) {
            res.status(400).send({error: `Bad block number: ${req.params.blockNumber}`})
            return
        }

        plasma.getBlock(blockNumber).then(block => {
            // todo: blockToApiObject?
            res.send(block)
        }).catch(error => {
            res.status(404).send(error)
        })
    })

    return router
}
