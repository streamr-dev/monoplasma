const {utils: { isAddress }} = require("web3")

/** @typedef {String} EthereumAddress */

/** Validate contract addresses from user input */
async function throwIfSetButNotContract(web3, address, context) {
    if (!address) { return }
    return throwIfNotContract(web3, address, context)
}

/** Validate contract addresses from user input */
async function throwIfNotContract(web3, address, context) {
    throwIfBadAddress(address, context)
    if (await web3.eth.getCode(address) === "0x") {
        throw new Error(`${context || "Error"}: No contract at ${address}`)
    }
}

function throwIfBadAddress(address, context) {
    if (!isAddress(address)) {
        throw new Error(`${context || "Error"}: Bad Ethereum address ${address}`)
    }
}

module.exports = {
    throwIfNotContract,
    throwIfSetButNotContract,
    throwIfBadAddress,
}
