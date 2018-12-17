const fs = require("mz/fs")

const {
    QUIET,
} = process.env

const log = QUIET ? () => {} : console.log

module.exports = {
    loadState: async (path) => {
        log(`Loading state from ${path}...`)
        const raw = await fs.readFile(path).catch(() => "{}")
        return JSON.parse(raw)
    },

    saveState: async (path, state) => {
        const raw = JSON.stringify(state)
        log(`Saving state to ${path}: ${raw}`)
        return fs.writeFile(path, raw)
    },
}