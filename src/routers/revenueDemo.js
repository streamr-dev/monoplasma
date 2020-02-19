/* eslint-disable no-console */     // demo file, console logging is ok
const express = require("express")
const MonoplasmaMember = require("../member")

module.exports = operator => {
    const router = express.Router()

    router.get("/", (req, res) => {
        res.send({
            status: "ok",
        })
    })

    router.get("/publishBlock", (req, res) => {
        console.log("Forcing side chain block publish...")
        operator.publishBlock().then(receipt => {
            console.log("Block published: " + JSON.stringify(receipt))
            res.send(receipt)
        }).catch(error => {
            res.status(400).send({ error: error.message })
        })
    })

    router.get("/stealAllTokens", (req, res) => {
        const address = req.query.targetAddress || operator.address
        const realMemberList = operator.plasma.members
        let tokens
        operator.getContractTokenBalance().then(res => {
            tokens = res
            const fakeMemberList = [new MonoplasmaMember("thief", address, tokens)]
            console.log("Swapping operator's balance books with something where we have all the tokens")
            operator.plasma.members = fakeMemberList
            operator.plasma.tree.update(fakeMemberList, 1)
            return operator.publishBlock(operator.state.lastPublishedBlock + 1)
        }).then(block => {
            console.log(`Block published: ${JSON.stringify(block)}`)
            console.log("Swapping back the real balance books like nothing happened.")
            operator.plasma.members = realMemberList
            operator.plasma.tree.update(realMemberList)
            const blockNumber = block.blockNumber
            const proof = []
            res.send({ blockNumber, tokens, proof })
        }).catch(error => {
            operator.plasma = realMemberList
            operator.plasma.tree.update(realMemberList)
            res.status(400).send({ error: error.message })
        })
    })

    return router
}
