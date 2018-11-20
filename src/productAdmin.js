// const fs = require("mz/fs")

module.exports = options => {
    const {
        communityAddress,
        web3,
        // adminServerURL,
        // IpfsServerURL,
    } = options

    const CommunityWatcher = require("./communityWatcher")
    const watcher = new CommunityWatcher(web3, communityAddress)

    watcher.on("PurchaseRegistered", () => {
        publishBlock()
    })

    watcher.start()

    const SidechainCommunity = require("../build/contracts/SidechainCommunity.json")
    const community = new web3.eth.Contract(SidechainCommunity.abi, communityAddress)

    async function publishBlock() {
        community.methods.recordBlock()
    }
}
