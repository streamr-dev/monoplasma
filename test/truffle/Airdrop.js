const Airdrop = artifacts.require("./Airdrop.sol")
const MintableToken = artifacts.require("zeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const { assertEqual, assertFails, increaseTime } = require("./testHelpers")

const Monoplasma = require("../src/monoplasma")
const plasma = new Monoplasma()

const blockFreezePeriodSeconds = 1000

let market
let token
let airdrop
contract("Airdrop", [_, recipient, anotherRecipient, admin] => {
    before(async () => {
        token = await MintableToken.new({from: admin, gas: 4000000})
        airdrop = await Airdrop.new(market.address, blockFreezePeriodSeconds, {from: admin, gas: 4000000})
        await token.mint(airdrop.address, 1000000, {from: admin})

        // these should be performed by the watcher
        plasma.addMember(recipient)
        plasma.addMember(anotherRecipient)
        plasma.addRevenue(1000)
    })

    // TODO: upgrade to latest truffle and hence web3 1.0, get rid of this kind of wrappers...
    async function getBlockNumber() {
        return new Promise(done => {
            web3.eth.getBlockNumber((err, blockNum) => {
                done(blockNum)
            })
        })
    }

    async function publishBlock(rootHash) {
        const root = rootHash || plasma.getRootHash()
        const rootChainBlockNumber = await web3.eth.getBlockNumber()
        const resp = await airdrop.recordBlock(rootChainBlockNumber, root, "ipfs lol", {from: admin})
        return resp.logs.find(L => L.event === "BlockCreated").args
    }

    describe("Recipient", () => {
        it("can withdraw earnings", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            const proof = plasma.getProof(recipient)
            const { earnings } = plasma.getMember(recipient)
            assertEqual(await token.balanceOf(recipient), 0)
            await airdrop.withdrawAll(block.rootChainBlockNumber, earnings, proof, {from: recipient})
            assertEqual(await token.balanceOf(recipient), earnings)
        })
        it("can not withdraw wrong amount", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            const proof = plasma.getProof(recipient)
            await assertFails(airdrop.withdrawAll(block.rootChainBlockNumber, 50000, proof))
        })
        it("can not withdraw with bad proof", async () => {
            plasma.addRevenue(1000)
            const block = await publishBlock()
            await increaseTime(blockFreezePeriodSeconds + 1)
            await assertFails(airdrop.withdrawAll(block.rootChainBlockNumber, 500, [
                "0x3e6ef21b9ffee12d86b9ac8713adaba889b551c5b1fbd3daf6c37f62d7f162bc",
                "0x3f2ed4f13f5c1f5274cf624eb1d079a15c3666c97c5403e6e8cf9cea146a8608",
            ], {from: recipient}))
        })
    })
})
