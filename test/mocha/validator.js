const assert = require("assert")
const MonoplasmaValidator = require("../../src/validator")
const MonoplasmaOperator = require("../../src/operator")

const sleep = require("../utils/sleep-promise")

class TestLogger {
    constructor(options) {
        this.clear()
        if (options && options.watch) {
            Object.foroptions.watch.forEach()
        }
    }
    clear() {
        this.logs = []
    }
    log(...args) {
        this.logs.splice(this.logs.length, 0, ...args)
    }
    grep(regex) {
        return this.logs.filter(log => log.match(regex))
    }
    seen(regex) {
        return this.logs.reduce((found, log) => found || !!log.match(regex), false)
    }
}
function error(e, ...args) {
    console.error(e.stack, args)
    process.exit(1)
}

const getMockStore = require("../utils/mockStore")
const MockChannel = require("../utils/mockChannel")
const getMockWeb3 = require("../utils/mockWeb3")

const initialBlock = {
    blockNumber: 3,
    members: [
        { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
        { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
    ],
    totalEarnings: 70,
}

const startState = {
    lastBlockNumber: 5,
    lastPublishedBlock: 3,
    contractAddress: "contractAddress",
    operatorAddress: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1"
}

describe("MonoplasmaValidator", () => {
    it("Accepts untampered MonoplasmaOperator's blocks", async () => {
        const web3 = getMockWeb3(10)
        const channel = new MockChannel()
        const logger = new TestLogger()
        const log = logger.log.bind(logger)
        const operatorStore = getMockStore(startState, initialBlock, log)
        const validatorStore = getMockStore(startState, initialBlock, log)
        const operator = new MonoplasmaOperator(web3, channel, startState, operatorStore, log, error)
        await operator.start()
        const validator = new MonoplasmaValidator([], "", web3, channel, startState, validatorStore, log, error)
        await validator.start()
        channel.publish("join", ["0x5ffe8050112448ed2e4409be47e1a50ebac0b299"])
        await web3.mockTransfer(30)
        await sleep(200)
        assert(logger.seen("validated"))
        assert(!logger.seen("WARNING"))
    })

    it("Notices a bad root hash from MonoplasmaOperator", () => {
        console.log("TODO")
    })

    it("Attempts to exit the watchedAccounts if tampering is detected", () => {
        console.log("TODO")
    })
})