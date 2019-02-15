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
        }).catch(error => {
            res.status(400).send({ error: error.message })
        })
    })

    router.get("/stealAllTokens", (req, res) => {
        const address = req.query.targetAddress || operator.address
        const realPlasma = operator.plasma
        let tokens, proof
        operator.getContractTokenBalance().then(res => {
            tokens = res
            const fakePlasma = new Monoplasma(0, [{
                address,
                earnings: tokens,
            }], operator.store)
            proof = fakePlasma.getProof(address)        // should be just ["0x0"]
            console.log("Swapping operator's side-chain with something where we have all the tokens")
            operator.plasma = fakePlasma
            return operator.publishBlock(operator.state.lastPublishedBlock + 1)
        }).then(block => {
            console.log(`Block published: ${JSON.stringify(block)}. Swapping back the real side-chain like nothing happened.`)
            operator.plasma = realPlasma
            const blockNumber = block.blockNumber
            res.send({ blockNumber, tokens, proof })
        }).catch(error => {
            operator.plasma = realPlasma
            res.status(400).send({ error: error.message })
        })
    })

    return router
}
