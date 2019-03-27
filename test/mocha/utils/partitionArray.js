
const assert = require("assert")
const partition = require("../../../src/utils/partitionArray")

describe("Partition array util", () => {
    it("works in small case, with stable order", () => {
        const list = [67, 34, 45, 35, 34, 34, 1]
        const filter = x => x < 40
        const res = partition(list, filter)
        assert.deepStrictEqual(res, [
            [34, 35, 34, 34, 1],
            [67, 45],
        ])
    })

    it("works in large case", () => {
        const list = Array(100000).fill(0).map((_, i)=>i)
        const filter = x => x < 40000
        const res = partition(list, filter)
        assert.deepEqual(res[0].length, 40000)
        assert.deepEqual(res[1].length, 60000)
    })

    it("works also with empty input", () => {
        assert.deepStrictEqual(partition([], x => x < 4), [[], []])
    })

    it("works also with empty outputs", () => {
        assert.deepStrictEqual(partition([1, 2, 3], x => x < 4), [[1, 2, 3], []])
        assert.deepStrictEqual(partition([1, 2, 3], x => x > 4), [[], [1, 2, 3]])
    })
})