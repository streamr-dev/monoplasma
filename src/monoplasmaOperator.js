const MonoplasmaWatcher = require("./monoplasmaWatcher")

module.exports = class MonoplasmaOperator extends MonoplasmaWatcher {

    constructor(...args) {
        super(...args)

        this.minIntervalBlocks = this.state.minIntervalBlocks || 1  // TODO: think about it more closely
        this.address = this.state.operatorAddress
        this.state.gasPrice = this.state.gasPrice || 4000000000  // 4 gwei
        this.state.lastPublishedBlock = this.state.lastPublishedBlock || 0
    }

    async start() {
        await super.start()
        this.tokenFilter.on("data", event => { this.onTokensReceived(event).catch(this.error) })
    }

    // TODO: block publishing should be based on value-at-risk, that is, publish after so-and-so many tokens received
    async onTokensReceived(event) {
        this.state.lastBlockNumber = +event.blockNumber    // update here too, because there's no guarantee MonoplasmaWatcher's listener gets called first
        if (this.state.lastBlockNumber >= this.state.lastPublishedBlock + this.minIntervalBlocks) {
            const ee = await this.publishBlock()
            if (this.explorerUrl) {
                ee.on("transactionHash", hash => {
                    this.log(`Sent tx to ${this.explorerUrl}${hash}`)
                })
            }
        }
    }

    async publishBlock(blockNumber) {
        const bnum = blockNumber || this.state.lastBlockNumber
        if (blockNumber <= this.state.lastPublishedBlock) {
            throw new Error(`Block #${this.state.lastPublishedBlock} has already been published, can't publish #${blockNumber}`)
        }
        this.log(`Publishing block ${bnum}`)
        const hash = this.plasma.getRootHash()
        const ipfsHash = ""
        await this.contract.methods.recordBlock(bnum, hash, ipfsHash).send({
            from: this.address,
            gas: 4000000,
            gasPrice: this.state.gasPrice
        })
        this.state.lastPublishedBlock = bnum
        return this.plasma.storeBlock(bnum)     // TODO: move this to Watcher
    }
}
