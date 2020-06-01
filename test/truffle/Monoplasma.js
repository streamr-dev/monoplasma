const BN = require("bn.js")

const MerkleTree = require("../../src/merkletree")
const MonoplasmaMember = require("../../src/member")

const RootChainContract = artifacts.require("./Monoplasma.sol")
const ERC20Mintable = artifacts.require("openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol")

const FailTokenJson = require("./FailToken.json")
const FailToken = new web3.eth.Contract(FailTokenJson.abi)

const { assertEqual, assertFails, assertEvent } = require("../utils/web3Assert")
const increaseTime = require("../utils/increaseTime")
const {utils: { toWei }} = require("web3")

const MonoplasmaState = require("../../src/state")
const MonoplasmaWatcher = require("../../src/watcher")
const JoinPartChannel = require("../../src/joinPartChannel")
const FileStore = require("../../src/fileStore")
const fileStore = new FileStore("/tmp/mono", console.log)
let currentBlockNumber = 1

contract("Monoplasma", accounts => {
    let token
    let rootchain
    const producer = accounts[1]
    const anotherProducer = accounts[2]
    const admin = accounts[9]
    const freezePeriodSeconds = 1000
    const plasma = new MonoplasmaState(0, [], { saveBlock: () => {} }, admin, 0)
    const joinPartChannel = new JoinPartChannel()
    let watcher
    before(async () => {
        token = await ERC20Mintable.new({from: admin, gas: 6000000})
        rootchain = await RootChainContract.new(token.address, freezePeriodSeconds, 0, {from: admin, gas: 6000000})
        const startState = {
            contractAddress: rootchain.address,
            tokenAddress: token.address,
            freezePeriodSeconds: 1
        }
        watcher = new MonoplasmaWatcher(web3, joinPartChannel, startState, fileStore)
        watcher.start()

        // simulate added members, would be performed by the MonoplasmaWatcher
        plasma.addMember(producer)
        plasma.addMember(anotherProducer)
    })

    // simulate added revenue: tokens appear in the contract, MonoplasmaWatcher updates the MonoplasmaState
    async function addRevenue(tokens) {
        await token.mint(rootchain.address, tokens, {from: admin})
        plasma.addRevenue(tokens, currentBlockNumber)
        return publishBlock()
    }

    // simulate a block being published by the MonoplasmaOperator
    async function publishBlock(rootHash, operatorAddress) {
        const blockNumber = currentBlockNumber++
        plasma.setBlockNumber(blockNumber)
        const root = rootHash || plasma.getRootHash()
        const resp = await rootchain.commit(blockNumber, root, "ipfs lol", {from: operatorAddress || admin})
        return resp.logs.find(L => L.event === "NewCommit").args
    }

    describe("Admin", () => {
        it("can set fee and receives correct fee", async () => {
            const adminFee = toWei(".5", "ether")
            assertEvent(await rootchain.setAdminFee(adminFee, {from: admin}), "AdminFeeChanged", [adminFee])
            assertEqual(await rootchain.adminFee(), adminFee)
            assertEvent(await rootchain.setAdminFee(0, {from: admin}), "AdminFeeChanged", [0])
        })

        it("fee can't be set by non-admins", async () => {
            await assertFails(rootchain.setAdminFee(123, {from: producer}), "error_onlyOwner")
        })

        it("can't set fee higher than 100%", async () => {
            await assertFails(rootchain.setAdminFee(toWei("2", "ether"), {from: admin}), "error_adminFee")
        })

        it("can transfer ownership", async () => {
            const newAdmin = accounts[8]
            await rootchain.transferOwnership(newAdmin, {from: admin})
            assertEvent(await rootchain.claimOwnership({from: newAdmin}), "OwnershipTransferred", [admin, newAdmin])

            await rootchain.transferOwnership(admin, {from: newAdmin})
            assertEvent(await rootchain.claimOwnership({from: admin}), "OwnershipTransferred", [newAdmin, admin])
        })

        it("can publish blocks", async () => {
            const block = await publishBlock()
            assertEqual(await rootchain.committedHash(block.blockNumber), block.rootHash)
        })

        it("can change the operator", async () => {
            const operator = accounts[3]
            assertEvent(await rootchain.setOperator(operator, {from: admin}), "OperatorChanged", [operator])
            const root = plasma.getRootHash()
            const blockNumber = currentBlockNumber++
            await assertFails(rootchain.commit(blockNumber, root, "fail", {from: admin}), "error_notPermitted")
            const block = await publishBlock(root, operator)
            assertEqual(await rootchain.committedHash(block.blockNumber), block.rootHash)
        })

        // for the lack of per-testcase cleanup in mocha, made another testcase for cleanup...
        it("can change the operator back", async () => {
            const operator = await rootchain.operator()
            if (operator !== admin) {
                assertEvent(await rootchain.setOperator(admin, {from: admin}), "OperatorChanged", [admin])
            }
            const root = plasma.getRootHash()
            const blockNumber = currentBlockNumber++
            await assertFails(rootchain.commit(blockNumber, root, "fail", {from: accounts[3]}), "error_notPermitted")
        })
    })

    describe("Withdrawing", () => {
        let block
        it("works when done in two steps: prove, then withdraw", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assertEqual(await token.balanceOf(producer), 0)
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.prove(block.blockNumber, producer, earnings, proof, {from: producer})
            await rootchain.withdraw(earnings, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })

        it("works second time around, too", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(producer), earnings)
        })

        it("can be done on behalf of another member", async () => {
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            assertEqual(await token.balanceOf(anotherProducer), 0)
            await rootchain.withdrawAllFor(anotherProducer, block.blockNumber, earnings, proof, {from: producer})
            assertEqual(await token.balanceOf(anotherProducer), earnings)
        })

        it("works on behalf of others in two steps: prove, then withdrawFor", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            const oldEarnings = await token.balanceOf(producer)
            const newEarnings = new BN(earnings).sub(oldEarnings)
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.prove(block.blockNumber, producer, earnings, proof, {from: admin})
            await rootchain.withdrawFor(producer, newEarnings, {from: admin})
            assertEqual(await token.balanceOf(producer), earnings)
        })

        it("works when 'donating' in two steps: prove, then withdrawFor", async () => {
            block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            const oldEarnings = await token.balanceOf(producer)
            const newEarnings = new BN(earnings).sub(oldEarnings)
            const oldEarnings2 = await token.balanceOf(anotherProducer)
            const expectedNewEarnings2 = oldEarnings2.add(newEarnings)
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.prove(block.blockNumber, producer, earnings, proof, {from: producer})
            await rootchain.withdrawTo(anotherProducer, newEarnings, {from: producer})
            assertEqual(await token.balanceOf(anotherProducer), expectedNewEarnings2)
        })

        it("fails if member tries later with an old (though valid) proof", async () => {
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            assert(await rootchain.proofIsCorrect(block.blockNumber, producer, earnings, proof), "Bad proof")
            await assertFails(rootchain.prove(block.blockNumber, producer, earnings, proof, {from: admin, gas: 4000000}), "error_oldEarnings")
        })

        it("can donate earnings to elsewhere", async () => {
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const withdrawable = new BN(earnings).sub(withdrawn)
            const balanceBefore = await token.balanceOf(producer)
            await rootchain.withdrawAllTo(producer, block.blockNumber, earnings, proof, {from: anotherProducer})
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable))
        })

        it("fails before freeze period is over", async () => {
            const block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            await assertFails(rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer}), "error_frozen")
        })

        it("fails for wrong amount", async () => {
            const block = await addRevenue(1000)
            const proof = plasma.getProof(producer)
            const { earnings } = { earnings: 50000 }
            await increaseTime(freezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer}), "error_proof")
        })

        it("fails with bad proof", async () => {
            const block = await addRevenue(1000)
            const proof = [
                "0x3e6ef21b9ffee12d86b9ac8713adaba889b551c5b1fbd3daf6c37f62d7f162bc",
                "0x3f2ed4f13f5c1f5274cf624eb1d079a15c3666c97c5403e6e8cf9cea146a8608",
            ]
            const { earnings } = plasma.getMember(producer)
            await increaseTime(freezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAll(block.blockNumber, earnings, proof, {from: producer}), "error_proof")
        })

        it("fails for zero tokens", async () => {
            await assertFails(rootchain.withdraw(0, {from: producer}), "error_zeroWithdraw")
        })

        it("fails for too many tokens", async () => {
            await assertFails(rootchain.withdraw(10000000, {from: producer}), "error_overdraft")
        })

        it("fails with error_transfer if token transfer returns false", async () => {
            const token2 = await FailToken.deploy({data: FailTokenJson.bytecode}).send({from: admin, gas: 6000000})
            const rootchain2 = await RootChainContract.new(token2.options.address, freezePeriodSeconds, 0, {from: admin, gas: 6000000})
            await token2.methods.transfer(rootchain2.address, toWei("1000", "ether")).send({from: admin})
            const blockNumber = plasma.currentBlock
            const proof = plasma.getProof(producer)
            const { earnings } = plasma.getMember(producer)
            const root = plasma.getRootHash()
            await rootchain2.commit(blockNumber, root, "ipfs lol", {from: admin})
            await increaseTime(freezePeriodSeconds + 1)
            await assertFails(rootchain2.withdrawAll(blockNumber, earnings, proof, {from: producer}), "error_transfer")
        })
    })

    // roles in all signing tests: admin withdraws anotherProducer's earnings to producer's account
    describe("Withdrawing with a signature on behalf of another", () => {
        let commit
        it("works for another member's earnings with a signature (withdrawAllToSigned or 'blank cheque')", async () => {
            commit = await addRevenue(1000)
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)

            const message = producer + "0".repeat(64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)
            assert(await rootchain.signatureIsValid(producer, anotherProducer, "0", signature), "Contract says: bad signature")

            await increaseTime(freezePeriodSeconds + 1)
            const balanceBefore = await token.balanceOf(producer)
            await rootchain.withdrawAllToSigned(producer, anotherProducer, signature, commit.blockNumber, earnings, proof, {from: admin})
            const withdrawable = new BN(earnings).sub(withdrawn)
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable))
        })

        it("fails if (otherwise valid) withdrawAllToSigned is attempted with non-'blank cheque' signature", async () => {
            commit = await addRevenue(1000)
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const amount = new BN(1000)

            const message = producer + amount.toString(16, 64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)
            assert(await rootchain.signatureIsValid(producer, anotherProducer, "1000", signature), "Contract says: bad signature")

            await increaseTime(freezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAllToSigned(producer, anotherProducer, signature, commit.blockNumber, earnings, proof, {from: admin}), "error_badSignature")

            // verify that it was just the amount that was wrong, not e.g. proof
            const message2 = producer + "0".repeat(64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature2 = await web3.eth.sign(message2, anotherProducer)
            await rootchain.withdrawAllToSigned(producer, anotherProducer, signature2, commit.blockNumber, earnings, proof, {from: admin})
        })

        it("fails if reusing the 'blank cheque' signature in withdrawAllToSigned", async () => {
            commit = await addRevenue(1000)
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const message = producer + "0".repeat(64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)

            // first withdraw succeeds...
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.withdrawAllToSigned(producer, anotherProducer, signature, commit.blockNumber, earnings, proof, {from: admin})

            // later, in a new block
            const block2 = await addRevenue(1000)
            const proof2 = plasma.getProof(anotherProducer)
            const { earnings: earnings2 } = plasma.getMember(anotherProducer)

            // second withdraw with the same signature fails
            await increaseTime(freezePeriodSeconds + 1)
            await assertFails(rootchain.withdrawAllToSigned(producer, anotherProducer, signature, block2.blockNumber, earnings2, proof2, {from: admin}), "error_badSignature")
        })

        it("works for another member's earnings with a signature in 1 step: proveAndWithdrawToSigned", async () => {
            commit = await addRevenue(1000)
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const withdrawable = new BN(earnings).sub(withdrawn)

            const message = producer + withdrawable.toString(16, 64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)

            await increaseTime(freezePeriodSeconds + 1)
            const balanceBefore = await token.balanceOf(producer)
            await rootchain.proveAndWithdrawToSigned(producer, anotherProducer, withdrawable, signature, commit.blockNumber, earnings, proof, {from: admin})
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable))
        })

        it("works for another member's earnings with a signature, also in 2 steps: prove, then withdrawToSigned", async () => {
            commit = await addRevenue(1000)
            const proof = plasma.getProof(anotherProducer)
            const { earnings } = plasma.getMember(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const withdrawable = new BN(earnings).sub(withdrawn)

            const message = producer + withdrawable.toString(16, 64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)

            // admin proves anotherProducer's earnings to smart contract (anyone can do this)
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.prove(commit.blockNumber, anotherProducer, earnings, proof, {from: admin})
            assertEqual(await rootchain.earnings(anotherProducer), earnings)

            // then withdraws with signature to producer's account
            const balanceBefore = await token.balanceOf(producer)
            await rootchain.withdrawToSigned(producer, anotherProducer, withdrawable, signature, {from: admin})
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable))
        })

        it("fails for otherwise valid earnings with a signature if attempted in 2 pieces (prove + 2 x withdrawToSigned)", async () => {
            // see the above test before reading this one (keep them in sync if you modify!)
            commit = await addRevenue(1000)
            const { earnings } = plasma.getMember(anotherProducer)
            const proof = plasma.getProof(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const withdrawable = new BN(earnings).sub(withdrawn)
            const amount = withdrawable.subn(100)

            const message = producer + amount.toString(16, 64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)

            // admin proves anotherProducer's earnings to smart contract (anyone can do this)
            await increaseTime(freezePeriodSeconds + 1)
            await rootchain.prove(commit.blockNumber, anotherProducer, earnings, proof, {from: admin})
            assertEqual(await rootchain.earnings(anotherProducer), earnings)

            // then withdraws with signature to producer's account in two pieces, fails, and withdraws the rest to anotherProducer's account
            const balanceBefore = await token.balanceOf(producer)
            const balance2Before = await token.balanceOf(anotherProducer)
            await rootchain.withdrawToSigned(producer, anotherProducer, amount, signature, {from: admin})
            await assertFails(rootchain.withdrawToSigned(producer, anotherProducer, "100", signature, {from: admin}), "error_badSignature")
            await rootchain.withdraw("100", {from: anotherProducer})
            assertEqual(await token.balanceOf(producer), balanceBefore.add(withdrawable).subn(100))
            assertEqual(await token.balanceOf(anotherProducer), balance2Before.addn(100))
        })

        it("fails for badly formed signatures", async () => {
            const { earnings } = plasma.getMember(anotherProducer)
            const proof = plasma.getProof(anotherProducer)
            const withdrawn = await rootchain.withdrawn(anotherProducer)
            const amount = new BN(1000)
            const message = producer + amount.toString(16, 64) + rootchain.address.slice(2) + withdrawn.toString(16, 64)
            const signature = await web3.eth.sign(message, anotherProducer)
            assert(await rootchain.signatureIsValid(producer, anotherProducer, "1000", signature), "Contract says: bad signature")

            await assertFails(rootchain.proveAndWithdrawToSigned(producer, anotherProducer, "1000", signature.slice(0, -10), commit.blockNumber, earnings, proof, {from: admin}), "error_badSignatureLength")
            await assertFails(rootchain.proveAndWithdrawToSigned(producer, anotherProducer, "1000", signature.slice(0, -2) + "30", commit.blockNumber, earnings, proof, {from: admin}), "error_badSignatureVersion")
            await assertFails(rootchain.proveAndWithdrawToSigned(producer, anotherProducer, "100", signature, commit.blockNumber, earnings, proof, {from: admin}), "error_badSignature")

            await assertFails(rootchain.withdrawToSigned(producer, anotherProducer, "1000", signature.slice(0, -10), {from: admin}), "error_badSignatureLength")
            await assertFails(rootchain.withdrawToSigned(producer, anotherProducer, "1000", signature.slice(0, -2) + "30", {from: admin}), "error_badSignatureVersion")
            await assertFails(rootchain.withdrawToSigned(producer, anotherProducer, "100", signature, {from: admin}), "error_badSignature")

            await assertFails(rootchain.signatureIsValid(producer, anotherProducer, "1000", signature.slice(0, -10)), "error_badSignatureLength")
            await assertFails(rootchain.signatureIsValid(producer, anotherProducer, "1000", signature.slice(0, -2) + "30"), "error_badSignatureVersion")
            assert(!await rootchain.signatureIsValid(producer, anotherProducer, "100", signature), "Bad signature was accepted as valid :(")
        })
    })

    describe("Low level stuff", () => {
        it("commit & committedHash correctly saves and retrieves a block timestamp", async () => {
            const root = "0x1234000000000000000000000000000000000000000000000000000000000000"
            const resp = await rootchain.commit(123, root, "ipfs lol", {from: admin})
            const event = resp.logs.find(L => L.event === "NewCommit")
            const timestamp = (await web3.eth.getBlock(event.blockNumber)).timestamp
            assertEqual(event.args.blockNumber, 123)
            assertEqual(event.args.rootHash, root)
            assertEqual(await rootchain.committedHash(123), root)
            assertEqual(await rootchain.commitTimestamp(123), timestamp)
        })

        // see /stealAllTokens route of routers/revenueDemo.js
        it("proving fails with error_missingBalance if there's not enough tokens to cover the purported earnings", async () => {
            const fakeTokens = toWei("1000", "ether")
            const fakeMemberList = [new MonoplasmaMember("thief", producer, fakeTokens)]
            const fakeTree = new MerkleTree(fakeMemberList, currentBlockNumber)
            const fakeProof = []
            const root = fakeTree.getRootHash()
            const block = await publishBlock(root)
            assert(await rootchain.proofIsCorrect(block.blockNumber, producer, fakeTokens, fakeProof), "Bad proof")
            await increaseTime(freezePeriodSeconds + 1)
            await assertFails(rootchain.prove(block.blockNumber, producer, fakeTokens, fakeProof, {from: admin, gas: 4000000}), "error_missingBalance")
        })
    })
})
