/*global describe it */
/*eslint-disable quotes */
const assert = require("assert")
const formatDecimals = require("../../src/formatDecimals")

describe("formatDecimals", () => {
    it('formatDecimals("10000", 3) === "10"', () => {
        assert.strictEqual(formatDecimals("10000", 3), "10")
    })
    it('formatDecimals("15200", 3) === "15.2"', () => {
        assert.strictEqual(formatDecimals("15200", 3), "15.2")
    })
    it('formatDecimals("10000", 6) === "0.01"', () => {
        assert.strictEqual(formatDecimals("10000", 6), "0.01")
    })
})