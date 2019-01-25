const fs = require("mz/fs")
const path = require("path")

const {
    QUIET,
} = process.env

const log = QUIET ? () => {} : console.log

/**
 * @typedef {Object} OperatorState
 */
/**
 * @param {String} stateStorePath
 */
module.exports = (stateStorePath, treeDir) => ({
    /** @returns {OperatorState} Operator state from the file */
    loadState: async () => {
        log(`Loading state from ${stateStorePath}...`)
        const raw = await fs.readFile(stateStorePath).catch(() => "{}")
        return JSON.parse(raw)
    },

    /**
     * @param {OperatorState} state Operator state to save
     */
    saveState: async state => {
        const raw = JSON.stringify(state)
        log(`Saving state to ${stateStorePath}: ${raw.slice(0, 1000)}${raw.length > 1000 ? "... TOTAL LENGTH: " + raw.length : ""}`)
        const dir = path.dirname(stateStorePath)
        await fs.mkdir(dir, { recursive: true })
        return fs.writeFile(stateStorePath, raw)
    },

    /**
     * @param {number} blockNumber Root-chain block number corresponding to a published side-chain block
     */
    loadBlock: async blockNumber => {
        const treePath = path.join(treeDir, blockNumber + ".json")
        log(`Loading block ${blockNumber} from ${treePath}...`)
        const raw = await fs.readFile(stateStorePath).catch(() => "{}")
        return JSON.parse(raw)
    },

    /**
     * @param {number} blockNumber Root-chain block number corresponding to a published side-chain block
     */
    blockExists: async blockNumber => {
        await fs.mkdir(treeDir, { recursive: true })
        const treePath = path.join(treeDir, blockNumber + ".json")
        return fs.exists(treePath)
    },

    /**
     * @param {Array<MonoplasmaMember>} members MonoplasmaMembers with their earnings etc.
     * @param {number} blockNumber Root-chain block number corresponding to a published side-chain block
     */
    saveBlock: async (members, blockNumber) => {
        const raw = JSON.stringify(members)
        const treePath = path.join(treeDir, blockNumber + ".json")
        log(`Saving block ${blockNumber} to ${treePath}: ${raw.slice(0, 1000)}${raw.length > 1000 ? "... TOTAL LENGTH: " + raw.length : ""}`)
        return fs.writeFile(stateStorePath, raw)
    },
})