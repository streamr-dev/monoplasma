const MonoplasmaWatcher = require("./monoplasmaWatcher")

module.exports = class MonoplasmaOperator extends MonoplasmaWatcher {

    constructor(...args) {
        super(...args)

        this.minIntervalBlocks = this.state.minIntervalBlocks || 2  // TODO: think about it more closely
        this.publishedBlocks = []
        this.address = this.state.operatorAddress
        this.state.gasPrice = this.state.gasPrice || 4000000000  // 4 gwei
    }

    async start() {
        await super.start()
        this.tokenFilter.on("data", event => { this.onTokensReceived(event) })
    }

    // TODO: block publishing should be based on value-at-risk, that is, publish after so-and-so many tokens received
    async onTokensReceived(event) {
        if (event.blockNumber >= this.lastBlockNumber + this.minIntervalBlocks) {
            const ee = await this.publishBlock(event.blockNumber)
            if (this.explorerUrl) {
                ee.on("transactionHash", hash => {
                    this.log(`Sent tx to ${this.explorerUrl}${hash}`)
                })
            }
        }
    }

    async publishBlock(blockNumber) {
        if (blockNumber <= this.lastBlockNumber) {
            throw new Error(`Block #${this.lastBlockNumber} has already been published, can't publish #${blockNumber}`)
        }
        this.lastBlockNumber = blockNumber || await this.web3.eth.getBlockNumber()
        const hash = this.plasma.getRootHash()
        const ipfsHash = ""
        await this.plasma.storeBlock()
        return this.contract.methods.recordBlock(this.lastBlockNumber, hash, ipfsHash).send({
            from: this.address,
            gas: 4000000,
            gasPrice: this.state.gasPrice
        })
    }
}
