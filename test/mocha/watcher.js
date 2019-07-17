const assert = require("assert")
const sinon = require("sinon")
const Web3 = require("web3")

const MonoplasmaWatcher = require("../../src/watcher")
const TokenJson = require("../../build/contracts/DemoToken.json")
const MonoplasmaJson = require("../../build/contracts/Monoplasma.json")

const getMockStore = require("../utils/mockStore")
const MockChannel = require("../utils/mockChannel")
const ganache = require("ganache-core")

const log = () => {} // console.log
function error(e, ...args) {
    console.error(e.stack, args)
    process.exit(1)
}

const initialBlock = {
    blockNumber: 3,
    members: [
        { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "50" },
        { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "20" },
    ],
    totalEarnings: 70,
}

describe("MonoplasmaWatcher", function () {
    let web3
    let token
    let monoplasma
    let sendOptions
    let admin
    before(async () => {
        const secretKey = "0x1234567812345678123456781234567812345678123456781234567812345678"
        web3 = new Web3(ganache.provider({
            accounts: [{ secretKey, balance: "0xffffffffffffffffffffffffff" }],
            logger: { log },
        }))
        admin = (await web3.eth.getAccounts())[0]
        sendOptions = {
            from: admin,
            gas: 5000000,
            gasPrice: 4000000000,
        }

        const Token = new web3.eth.Contract(TokenJson.abi)
        token = await Token.deploy({
            data: TokenJson.bytecode,
            arguments: [ "Test token", "T" ]
        }).send(sendOptions)

        const Monoplasma = new web3.eth.Contract(MonoplasmaJson.abi)
        monoplasma = await Monoplasma.deploy({
            data: MonoplasmaJson.bytecode,
            arguments: [token.options.address, "1"]
        }).send(sendOptions)

        // "start from" block 10
        for (let i = 0; i < 10; i++) {
            await new Promise (done => {
                web3.currentProvider.sendAsync({
                    jsonrpc: "2.0",
                    method: "evm_mine",
                    params: [],
                    id: new Date().getMilliseconds()
                }, done)
            })
        }
    })

    after(() => {

    })

    it("start() calls playback() with correct block numbers", async () => {
        const channel = new MockChannel()
        const startState = {
            lastBlockNumber: 5,
            lastPublishedBlock: 3,
            contractAddress: monoplasma.options.address,
            operatorAddress: admin
        }
        const currentBlock = await web3.eth.getBlockNumber()
        const store = getMockStore(startState, initialBlock, log)
        const watcher = new MonoplasmaWatcher(web3, channel, startState, store, log, error)
        const spyPlayback = sinon.spy(watcher, "playback")
        await watcher.start()
        assert(spyPlayback.withArgs(startState.lastBlockNumber + 1, currentBlock).calledOnce)
    })

    it("Monoplasma member is saved to the state", async () => {
        const channel = new MockChannel()
        const startState = {
            lastBlockNumber: 5,
            lastPublishedBlock: 3,
            contractAddress: monoplasma.options.address,
            operatorAddress: admin
        }
        const store = getMockStore(startState, initialBlock, log)
        const watcher = new MonoplasmaWatcher(web3, channel, startState, store, log, error)
        await watcher.start()
        channel.publish("join", ["0x5ffe8050112448ed2e4409be47e1a50ebac0b299"])
        await token.methods.transfer(monoplasma.options.address, 30).send(sendOptions)
        const newBalances = [
            {
                address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2",
                earnings: "60"
            },
            {
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
                earnings: "30"
            },
            {
                address: "0x5ffe8050112448ed2e4409be47e1a50ebac0b299",
                earnings: "10"
            }
        ]
        assert.deepStrictEqual(watcher.plasma.getMembers(), newBalances)
    })

    it("Monoplasma member is removed from the state", async () => {
        const channel = new MockChannel()
        const startState = {
            lastBlockNumber: 5,
            lastPublishedBlock: 3,
            contractAddress: monoplasma.options.address,
            operatorAddress: admin
        }
        const store = getMockStore(startState, initialBlock, log)
        const watcher = new MonoplasmaWatcher(web3, channel, startState, store, log, error)
        await watcher.start()
        channel.publish("part", ["0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"])
        await token.methods.transfer(monoplasma.options.address, 10).send(sendOptions)
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "75" }
        ]
        //50 + 15 (from 30 transferred in last test) + 10 = 75
        assert.deepStrictEqual(watcher.plasma.getMembers(), newBalances)
    })

    /*
    // I don't think this tests anything now that web3 isnt mocked
    it("Tokens are shared between members and the state is updated during playback", async () => {
        const channel = new MockChannel()
        const startState = {
            lastBlockNumber: 5,
            lastPublishedBlock: 3,
            contractAddress: monoplasma.options.address,
            operatorAddress: admin
        }
        const store = getMockStore(startState, initialBlock, log)
        const watcher = new MonoplasmaWatcher(web3, channel, startState, store, log, error)
        await watcher.start()
        assert(store.lastSavedState)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "100" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "70" },
            { address: "0xa3d1f77acff0060f7213d7bf3c7fec78df847de1", earnings: "0", name: "admin" },
        ]
        assert.deepStrictEqual(watcher.plasma.members.map(m => m.toObject()), newBalances)
    })
    */

    it("Admin fee changes are replayed correctly", async () => {
        const channel = new MockChannel()
        const startState = {
            lastBlockNumber: 5,
            lastPublishedBlock: 3,
            contractAddress: monoplasma.options.address,
            operatorAddress: admin
        }
        const store = getMockStore(startState, initialBlock, log)
        const watcher = new MonoplasmaWatcher(web3, channel, startState, store, log, error)
        await watcher.start()
        await monoplasma.methods.setAdminFee(Web3.utils.toWei("0.5","ether")).send(sendOptions)
        await token.methods.transfer(monoplasma.options.address, 20).send(sendOptions)
        //startBalance + 20 (previous tests) + 5 (10/2, 10 for admin)
        const newBalances = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "75" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "45" },
        ]
        assert.deepStrictEqual(watcher.plasma.getMembers(), newBalances)

        await monoplasma.methods.setAdminFee(Web3.utils.toWei("0.25","ether")).send(sendOptions)
        await token.methods.transfer(monoplasma.options.address, 40).send(sendOptions)
        //startBalance + 20 (previous tests) + 5 (10/2, 10 for admin) + 15 (30/2, 10 for admin)
        const newBalances2 = [
            { address: "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "90" },
            { address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", earnings: "60" },
        ]
        assert.deepStrictEqual(watcher.plasma.getMembers(), newBalances2)
        
    })

    // TODO: test channel (Join/Part events) playback, too
})
