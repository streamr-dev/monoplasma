const express = require("express")
const Monoplasma = require("./monoplasma")

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
        })
    })

    router.get("/stealAllTokens", (req, res) => {
        const address = req.params.targetAddress || operator.address
        console.log("Swapping operator's side-chain with something where we have all the tokens")
        const tokenBalance = 1
        const realPlasma = operator.plasma
        operator.plasma = new Monoplasma([{
            address,
            earnings: tokenBalance,
        }])
        operator.publishBlock().then(receipt => {
            console.log("Block published: " + JSON.stringify(receipt))
            operator.plasma = realPlasma
            res.send(receipt)
        })
    })

    return router
}
