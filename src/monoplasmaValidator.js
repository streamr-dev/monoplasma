const Monoplasma = require("./monoplasma")
const MonoplasmaWatcher = require("./monoplasmaWatcher")
const { replayEvents } = require("./ethSync")
const partition = require("./partitionArray")

module.exports = class MonoplasmaOperator extends MonoplasmaWatcher {
    constructor(watchedAccounts, myAddress, ...args) {
        super(...args)

        this.watchedAccounts = watchedAccounts
        this.address = myAddress
        this.eventQueue = []
        this.validatedPlasma = new Monoplasma()
    }

    async start() {
        await super.start()

        this.filters.blockFilter = this.contract.events.BlockCreated({})
            .on("data", event => { this.checkBlock(event.arguments) })
            .on("changed", event => { this.error("Event removed in re-org!", event) })
            .on("error", this.error)

        // TODO: listener for all events: this.eventQueue.push(event)
    }

    async checkBlock(block) {
        // update the "validated" version to the block number whose hash was published
        const { blockNumber } = block
        const [events, remaining] = partition(this.eventQueue, e => e.blockNumber <= blockNumber)
        replayEvents(this.validatedPlasma, events)
        this.eventQueue = remaining

        // check that the hash at that point in history matches
        const hash = this.validatedPlasma.getRootHash()
        if (hash === block.rootHash) {
            this.log(`Root hash @ ${blockNum} validated.`)
            this.lastValidatedBlock = blockNum
            this.lastValidatedProofs = this.watchedAccounts.map(this.validatedPlasma.getMember)
        } else {
            this.log(`Discrepancy detected @ ${blockNum}!`)
            // TODO: recovery attempt logic before gtfo and blowing up everything?
            // TODO: needs more research into possible and probable failure modes
            await this.exit(this.lastValidatedBlock, this.lastValidatedProofs)
        }
    }

    /**
     * @param Number blockNumber of the block where exit is attempted
     * @param List<MonoplasmaMember> members during the block where exit is attempted
     */
    async exit(blockNumber, members) {
        const opts = {
            from: this.address,
            gas: 4000000,
            gasPrice: this.state.gasPrice
        }

        // There should be no hurry, so sequential execution is ok, and it might hurt to send() all at once.
        // TODO: Investigate
        //return Promise.all(members.map(m => community.methods.withdrawAll(blockNumber, m.earnings, m.proof).send(opts)))
        for (const m of members) {
            await this.community.methods.withdrawAll(blockNumber, m.earnings, m.proof).send(opts)
        }
    }

    // TODO: validate also during playback
    async playback(...args) {
        super.playback(args)
        this.validatedPlasma = new Monoplasma(this.plasma.getMembers())
    }
}
