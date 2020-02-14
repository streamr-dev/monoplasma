const fs = require("mz/fs")
const path = require("path")

/**
 * @typedef {Object} OperatorState
 * @property {string} tokenAddress Ethereum address of token used by Monoplasma
 */
/**
 * @param {String} storeDir where json files are stored
 */
module.exports = class FileStore {

    constructor(storeDir, log, maxLogLen) {
        this.log = log || (() => {})
        this.maxLogLen = maxLogLen || 840

        this.log(`Setting up fileStore directories under ${storeDir}...`)
        const blocksDir = path.join(storeDir, "blocks")
        const eventsDir = path.join(storeDir, "events")
        fs.mkdirSync(storeDir, { recursive: true })
        fs.mkdirSync(blocksDir, { recursive: true })
        fs.mkdirSync(eventsDir, { recursive: true })
        this.blockNameRE = /(\d*)\.json/

        this.stateStorePath = path.join(storeDir, "state.json")
        this.getBlockPath = blockNumber => path.join(blocksDir, blockNumber + ".json")
        this.getEventPath = blockNumber => path.join(eventsDir, blockNumber + ".json")
    }

    sanitize(logEntry) {
        return logEntry.length < this.maxLogLen ? logEntry : logEntry.slice(0, this.maxLogLen) + "... TOTAL LENGTH: " + logEntry.length
    }

    /** @returns {OperatorState} Operator state from the file */
    async loadState() {
        this.log(`Loading state from ${this.stateStorePath}...`)
        const raw = await fs.readFile(this.stateStorePath).catch(() => "{}")
        return JSON.parse(raw)
    }

    /**
     * @param {OperatorState} state Operator state to save
     */
    async saveState(state) {
        const raw = JSON.stringify(state)
        this.log(`Saving state to ${this.stateStorePath}: ${raw.slice(0, 1000)}${raw.length > 1000 ? "... TOTAL LENGTH: " + raw.length : ""}`)
        return fs.writeFile(this.stateStorePath, raw)
    }

    /**
     * @param {number} blockNumber Root-chain block number corresponding to a published side-chain block
     */
    async loadBlock(blockNumber) {
        const path = this.getBlockPath(blockNumber)
        this.log(`Loading block ${blockNumber} from ${path}...`)
        const raw = await fs.readFile(path)
        const memberArray = JSON.parse(raw)
        return memberArray
    }

    /**
     * @param {number} blockNumber Root-chain block number corresponding to a published side-chain block
     */
    async blockExists(blockNumber) {
        const path = this.getBlockPath(blockNumber)
        return fs.exists(path)
    }

    /**
     * @param {number} [maxNumberLatest] of latest blocks to list
     * @returns {Promise<Array<number>>} block numbers that have been stored
     */
    async listBlockNumbers(maxNumberLatest) {
        const fileList = await fs.readdir(this.blocksDir)
        let blockNumbers = fileList
            .map(fname => fname.match(this.blockNameRE))
            .filter(x => x)
            .map(match => +match[1])
        blockNumbers.sort((a, b) => a - b)  // sort as numbers, just sort() converts to strings first
        if (maxNumberLatest) {
            blockNumbers = blockNumbers.slice(-maxNumberLatest)
        }
        return blockNumbers
    }

    /**
     * @typedef {Object} Block Monoplasma side-chain block, see monoplasma.js:storeBlock
     * @property {number} blockNumber Root-chain block number corresponding to a published side-chain block
     * @property {Array<Object>} members MonoplasmaMember.toObject()s with their earnings etc.
     * @property {number} timestamp seconds since epoch, similar to Ethereum block.timestamp
     * @property {number} totalEarnings sum of members.earnings, to avoid re-calculating it (often needed)
     */
    /**
     * @param {Block} block to be stored, called from monoplasma.js:storeBlock
     */
    async saveBlock(block) {
        if (!block || !block.blockNumber) { throw new Error(`Bad block: ${JSON.stringify(block)}`) }
        const path = this.getBlockPath(block.blockNumber)
        const raw = JSON.stringify(block)
        this.log(`Saving block ${block.blockNumber} to ${path}: ${this.sanitize(raw)}`)
        if (await fs.exists(path)) { console.error(`Overwriting block ${block.blockNumber}!`) } // eslint-disable-line no-console
        return fs.writeFile(path, raw)
    }

    /**
     * @typedef {Object} Event join/part events are stored in file for playback, others come from Ethereum
     * @property {number} blockNumber Root-chain block number after which events happened
     * @property {number} transactionIndex index within block, for join/part it should just be large
     * @property {string} event "Join" or "Part" (TODO: could jsdoc enums handle this?)
     * @property {Array<string>} addressList
     */
    /**
     * @param {number} blockNumber Root-chain block number after which events happened
     * @param {Array<Event>} events to be associated with blockNumber
     */
    async saveEvents(blockNumber, events) {
        events = Array.isArray(events) ? events : [events]
        if (events.length < 1) {
            this.log(`Empty events given for block #${blockNumber}, not saving`)
            return
        }
        const path = this.getEventPath(blockNumber)
        const rawOld = await fs.readFile(path).catch(() => "[]")
        const oldEvents = JSON.parse(rawOld)
        this.log(`Saving ${events.length} event(s like) ${this.sanitize(JSON.stringify(events[0]))} to ${path} (appending after ${oldEvents.length} old events in this block)`)
        const newEvents = oldEvents.concat(events)
        const raw = JSON.stringify(newEvents)
        return fs.writeFile(path, raw)
    }

    /**
     * @param {number} fromBlock Sidechain block to load
     * @param {number} [toBlock=fromBlock+1] load blocks until toBlock, INCLUSIVE (just like getPastEvents)
     * @returns {Array<Event>} of events, if blocks found, otherwise []
     */
    async loadEvents(fromBlock, toBlock) {
        let ret = []
        const to = toBlock || fromBlock
        for (let bnum = fromBlock; bnum <= to; bnum++) {
            const path = this.getEventPath(bnum)
            if (await fs.exists(path)) {
                this.log(`Loading events from ${path}`)
                const raw = await fs.readFile(path).catch(() => "[]")
                const eventList = JSON.parse(raw)
                ret = ret.concat(eventList)
            }
        }
        return ret
    }
}
