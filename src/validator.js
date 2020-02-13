const MonoplasmaState = require("./state")
const MonoplasmaWatcher = require("./watcher")

module.exports = class MonoplasmaValidator extends MonoplasmaWatcher {
    constructor(watchedAccounts, myAddress, ...args) {
        super(...args)

        this.watchedAccounts = watchedAccounts
        this.address = myAddress
        this.eventQueue = []
        this.lastSavedBlock = null
        this.validatedPlasma = new MonoplasmaState(0, [], {
            saveBlock: async block => {
                this.lastSavedBlock = block
            }
        }, this.state.operatorAddress, this.state.adminFeeFraction)
    }

    async start() {
        await super.start()

        this.log("Starting validator's BlockCreated listener")
        const self = this
        const blockFilter = this.contract.events.BlockCreated({})
        blockFilter.on("data", event => self.checkBlock(event.returnValues).catch(this.error))
    }

    async checkBlock(block) {
        // add the block to store; this won't be done by Watcher because Operator does it now
        // TODO: move this to Watcher
        const blockNumber = +block.blockNumber
        this.plasma.storeBlock(blockNumber, block.timestamp)

        // update the "validated" version to the block number whose hash was published
        await super.playbackOn(this.validatedPlasma, this.lastCheckedBlock + 1, blockNumber)
        this.lastCheckedBlock = blockNumber

        // check that the hash at that point in history matches
        // TODO: get hash from this.lastSavedBlock
        // TODO: if there's a Transfer after BlockCreated in same block, current approach breaks
        const hash = this.validatedPlasma.getRootHash()
        if (hash === block.rootHash) {
            this.log(`Root hash @ ${blockNumber} validated.`)
            this.lastValidatedBlock = blockNumber
            this.lastValidatedMembers = this.watchedAccounts.map(address => this.validatedPlasma.getMember(address))
        } else {
            this.log(`WARNING: Discrepancy detected @ ${blockNumber}!`)
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

        // TODO: sleep until block freeze period is over

        // There should be no hurry, so sequential execution is ok, and it might hurt to send() all at once.
        // TODO: Investigate and compare
        //return Promise.all(members.map(m => contract.methods.withdrawAll(blockNumber, m.earnings, m.proof).send(opts)))
        for (const m of members) {
            this.log(`Recording the earnings for ${m.address}: ${m.earnings}`)
            await this.contract.methods.prove(blockNumber, m.address, m.earnings, m.proof).send(opts).catch(console.error) // eslint-disable-line no-console
        }
    }

    // TODO: validate also during playback? That would happen automagically if replayEvents would be hooked somehow
    async playback(from, to) {
        await super.playback(from, to)
        //await super.playbackOn(this.validatedPlasma, from, to)
        this.lastCheckedBlock = to
        this.validatedPlasma = new MonoplasmaState(0, this.plasma.getMembers(), this.validatedPlasma.store,  this.state.operatorAddress, this.state.adminFeeFraction)
        this.lastValidatedBlock = to
        this.lastValidatedMembers = this.watchedAccounts.map(address => this.validatedPlasma.getMember(address))
    }
}
