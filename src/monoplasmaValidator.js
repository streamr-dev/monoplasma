const Monoplasma = require("./monoplasma")
const MonoplasmaWatcher = require("./monoplasmaWatcher")
const { replayEvent } = require("./ethSync")
const partition = require("./partitionArray")

module.exports = class MonoplasmaValidator extends MonoplasmaWatcher {
    constructor(watchedAccounts, myAddress, ...args) {
        super(...args)

        this.watchedAccounts = watchedAccounts
        this.address = myAddress
        this.eventQueue = []
        const self = this
        this.validatedPlasma = new Monoplasma(0, [], {
            saveBlock: async () => {},
            saveEvents: (blockNumber, event) => {
                self.eventQueue.push(event)
            }
        })
    }

    async start() {
        await super.start()

        this.log("Starting validator's listeners")
        this.contract.events.BlockCreated({}, (error, event) => this.checkBlock(event.returnValues))
        const self = this
        this.token.events.Transfer({ filter: { to: this.state.contractAddress } },
            (error, event) => self.eventQueue.push(event)
        )
    }

    async checkBlock(block) {
        // add the block to store; this won't be done by Watcher because Operator does it now
        // TODO: move this to Watcher
        const { blockNumber } = block
        this.plasma.storeBlock(blockNumber)

        // update the "validated" version to the block number whose hash was published
        const [events, remaining] = partition(this.eventQueue, e => e.blockNumber <= blockNumber)
        for (const event of events) {
            await replayEvent(this.validatedPlasma, event)
        }
        this.eventQueue = remaining

        // check that the hash at that point in history matches
        const hash = this.validatedPlasma.getRootHash()
        if (hash === block.rootHash) {
            this.log(`Root hash @ ${blockNumber} validated.`)
            this.lastValidatedBlock = blockNumber
            this.lastValidatedMembers = this.watchedAccounts.map(address => this.validatedPlasma.getMember(address))
        } else {
            this.log(`Discrepancy detected @ ${blockNumber}!`)
            // TODO: recovery attempt logic before gtfo and blowing up everything?
            // TODO: needs more research into possible and probable failure modes
            await this.exit(this.lastValidatedBlock, this.lastValidatedMembers)
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
        // TODO: Investigate and compare
        //return Promise.all(members.map(m => contract.methods.withdrawAll(blockNumber, m.earnings, m.proof).send(opts)))
        for (const m of members) {
            await this.contract.methods.proveSidechainBalance(blockNumber, m.address, m.earnings, m.proof).send(opts)
        }
    }

    // TODO: validate also during playback? That would happen automagically if replayEvents would be hooked somehow
    async playback(...args) {
        super.playback(args)
        this.validatedPlasma = new Monoplasma(0, this.plasma.getMembers(), this.validatedPlasma.store)
    }
}
