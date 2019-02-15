/*global describe it */

const assert = require("assert")
const { mergeEventLists } = require("../../src/ethSync")

describe("mergeEventLists", () => {
    it("merges event lists correctly", () => {
        const events1 = [
            { event: "A", blockNumber: 5, transactionIndex: -1, logIndex: 1 },
            { event: "B", blockNumber: 6, transactionIndex: 1, logIndex: 1 },
            { event: "C", blockNumber: 7, transactionIndex: -1, logIndex: 1 },
            { event: "D", blockNumber: 8, transactionIndex: 1, logIndex: 1 },
            { event: "E", blockNumber: 9, transactionIndex: 1, logIndex: 1 },
        ]
        const events2 = [
            { event: "1", blockNumber: 1, transactionIndex: 0, logIndex: 1 },
            { event: "2", blockNumber: 3, transactionIndex: 2, logIndex: 1 },
            { event: "3", blockNumber: 5, transactionIndex: 0, logIndex: 1 },
            { event: "4", blockNumber: 7, transactionIndex: 2, logIndex: 1 },
            { event: "5", blockNumber: 9, transactionIndex: 1, logIndex: 2 },
        ]
        const merged = mergeEventLists(events1, events2)
        assert.strictEqual(merged.map(e => e.event).join(""), "12A3BC4DE5")
    })

    it("handles empty lists correctly", () => {
        const events = [
            { event: "1", blockNumber: 1, transactionIndex: 0, logIndex: 1 },
            { event: "5", blockNumber: 9, transactionIndex: 1, logIndex: 2 },
        ]
        assert.deepStrictEqual(mergeEventLists([], events), events)
        assert.deepStrictEqual(mergeEventLists(events, []), events)
        assert.deepStrictEqual(mergeEventLists([], []), [])
    })

    it("ignores non-lists", () => {
        const events = [
            { event: "1", blockNumber: 1, transactionIndex: 0, logIndex: 1 },
            { event: "5", blockNumber: 9, transactionIndex: 1, logIndex: 2 },
        ]
        assert.deepStrictEqual(mergeEventLists(null, events), events)
        assert.deepStrictEqual(mergeEventLists(events, events.foobar), events)
        assert.deepStrictEqual(mergeEventLists({}, 0), [])
        assert.deepStrictEqual(mergeEventLists("null", events), events)
        assert.deepStrictEqual(mergeEventLists(events, events[0]), events)
        assert.deepStrictEqual(mergeEventLists([], true), [])
    })
})
