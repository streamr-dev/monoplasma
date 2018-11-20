console.log("Starting IPFS server for syncing the sidechain balances...")
const IPFS = require("ipfs")
const node = new IPFS()

/**
 *
 * @param earnings mapping address => uint totalEarnings since beginning (monotonously increasing)
 * @returns {Promise<string>} IPFS hash of the balances object, to be added to root chain
 */
async function publishEarnings(earnings) {
    const json = JSON.stringify(earnings)
    const filesAdded = await node.files.add({
        path: "",
        content: Buffer.from(json),
    })
    return filesAdded[0].hash
}

async function retrieveBalances(hash) {
    return hash
}

module.exports = {
    publishEarnings,
    retrieveBalances,
}
