const now = require("../../../src/utils/now")

describe("now", () => {
    it("returns something that could be a block timestamp", () => {
        assert(!Number.isNaN(+now()))
    })
})
