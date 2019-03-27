const os = require("os")
const path = require("path")
const assert = require("assert")

const tmpDir = path.join(os.tmpdir(), `fileStore-test-${+new Date()}`)
const fileStore = require("../../src/fileStore")(tmpDir)

describe("File system implementation of Monoplasma storage", () => {
    it("Correctly loads and saves state", async () => {
        const saved = {testing: "yes"}
        await fileStore.saveState(saved)
        const loaded = await fileStore.loadState()
        assert.deepStrictEqual(saved, loaded)
    })

    it("Correctly loads and saves blocks", async () => {
        const saved = {blockNumber: 42, members: [], timeStamp: +new Date(), totalEarnings: "1"}
        await fileStore.saveBlock(saved)
        const exists = await fileStore.blockExists(42)
        assert(exists)
        const loaded = await fileStore.loadBlock(42)
        assert.deepStrictEqual(saved, loaded)
    })

    it("Checks block existence correctly", async () => {
        const exists = await fileStore.blockExists(68)
        assert(!exists)
    })

    it("Correctly loads and saves events", async () => {
        await fileStore.saveEvents(42, [
            { blockNumber: 42, event: "Join", addressList: ["0x6dde58bf01e320de32aa69f6daf9ba3c887b4db6"] },
            { blockNumber: 42, event: "Join", addressList: ["0x47262e0936ec174b7813941ee57695e3cdcd2043"] },
        ])
        await fileStore.saveEvents(44, [
            { blockNumber: 44, event: "Part", addressList: ["0x6dde58bf01e320de32aa69f6daf9ba3c887b4db6"] },
            { blockNumber: 44, event: "Part", addressList: ["0x47262e0936ec174b7813941ee57695e3cdcd2043"] },
        ])
        await fileStore.saveEvents(46, [
            { blockNumber: 46, event: "Join", addressList: ["0x6dde58bf01e320de32aa69f6daf9ba3c887b4db6"] },
            { blockNumber: 46, event: "Join", addressList: ["0x47262e0936ec174b7813941ee57695e3cdcd2043"] },
        ])
        const loaded = await fileStore.loadEvents(42, 44)
        assert.deepStrictEqual(loaded, [
            { blockNumber: 42, event: "Join", addressList: ["0x6dde58bf01e320de32aa69f6daf9ba3c887b4db6"] },
            { blockNumber: 42, event: "Join", addressList: ["0x47262e0936ec174b7813941ee57695e3cdcd2043"] },
            { blockNumber: 44, event: "Part", addressList: ["0x6dde58bf01e320de32aa69f6daf9ba3c887b4db6"] },
            { blockNumber: 44, event: "Part", addressList: ["0x47262e0936ec174b7813941ee57695e3cdcd2043"] },
        ])
    })
})