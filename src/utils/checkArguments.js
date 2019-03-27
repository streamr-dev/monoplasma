/** Validate contract addresses from user input */
async function throwIfSetButNotContract(web3, address, context) {
    if (!address) { return }
    return throwIfNotContract(web3, address, context)
}

/** Validate contract addresses from user input */
async function throwIfNotContract(web3, address, context) {
    if (!web3.utils.isAddress(address)) {
        throw new Error(`${context || "Error"}: Bad Ethereum address ${address}`)
    }
    if (await web3.eth.getCode(address) === "0x") {
        throw new Error(`${context || "Error"}: No contract at ${address}`)
    }
}

module.exports = {
    throwIfNotContract,
    throwIfSetButNotContract,
}
