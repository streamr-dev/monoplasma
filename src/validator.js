// const fs = require("mz/fs")

module.exports = options => {
    const {
        watchedAccounts,
        communityAddress,
        web3,
        // adminServerURL,
        // IpfsServerURL,
    } = options

    const CommunityWatcher = require("./communityWatcher")
    const watcher = new CommunityWatcher(web3, communityAddress)

    const latest = {}
    watcher.on("checkFail", claimTokens)
    watcher.on("newBlock", (timestamp, plasma) => {
        latest.state = watchedAccounts.map(plasma.getMember)    // bind this
        latest.timestamp = timestamp
    })

    watcher.start()

    const SidechainCommunity = require("../build/contracts/SidechainCommunity.json")
    const community = new web3.eth.Contract(SidechainCommunity.abi, communityAddress)

    async function claimTokens() {
        if (!watchedAccounts.length) { return }
        for (const address of watchedAccounts) {    // eslint-disable-line no-restricted-syntax
            const m = latest.state.getMember(address)
            await community.methods.proveSidechainBalance(latest.timestamp, address, m.earnings, m.index, m.proof).send()
        }
    }
}
