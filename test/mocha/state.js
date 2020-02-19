const os = require("os")
const path = require("path")
const assert = require("assert")
const crypto = require("crypto")
const BN = require("bn.js")

const MonoplasmaState = require("../../src/state")
const now = require("../../src/utils/now")

//const sleep = require("../utils/sleep-promise")

// this is a unit test, but still it's better to use the "real" file store and not mock it,
//   since we DO check that the correct values actually come out of it. Mock would be almost as complex as the real thing.
const log = console.log //() => {}
const tmpDir = path.join(os.tmpdir(), `monoplasma-test-${+new Date()}`)
const FileStore = require("../../src/fileStore")
const fileStore = new FileStore(tmpDir, log)
const admin = "0x0000000000000000000000000000000000123564"
describe("MonoplasmaState", () => {
    it("should return member passed to constructor and then remove it successfully", () => {
        const plasmaAdmin = new MonoplasmaState(0, [{
            address: "0xff019d79c31114c811e68e68c9863966f22370ef",
            earnings: 10
        }], fileStore, admin, 0)
        assert.deepStrictEqual(plasmaAdmin.getMembers(), [{
            address: "0xff019d79c31114c811e68e68c9863966f22370ef",
            earnings: "10",
        }])
        plasmaAdmin.removeMember("0xff019d79c31114c811e68e68c9863966f22370ef")
        assert.deepStrictEqual(plasmaAdmin.getMembers(), [])
    })

    it("should return correct members and member count", () => {
        const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
        plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
        plasma.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "tester2")
        plasma.addRevenue(100, 1)
        assert.deepStrictEqual(plasma.getMemberCount(), { total: 2, active: 2, inactive: 0 })
        assert.deepStrictEqual(plasma.getMembers(), [
            {"address": "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "earnings": "50", "name": "tester1"},
            {"address": "0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "earnings": "50", "name": "tester2"},
        ])
        plasma.removeMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef")
        plasma.addRevenue(100, 1)
        assert.deepStrictEqual(plasma.getMemberCount(), { total: 2, active: 1, inactive: 1 })
        assert.deepStrictEqual(plasma.getMembers(), [
            {"address": "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "earnings": "150", "name": "tester1"},
        ])
    })

    it("should not crash with large number of members", () => {
        const initialMembers = []
        while (initialMembers.length < 200000) {
            initialMembers.push({
                address: `0x${crypto.randomBytes(20).toString("hex")}`,
                earnings: 0,
            })
        }
        const plasma = new MonoplasmaState(0, initialMembers, fileStore, admin, 0)
        plasma.addRevenue(100, 1)
    })

    it("should remember past blocks' earnings", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
        plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
        plasma.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "tester2")
        plasma.addRevenue(100, 1)
        await plasma.storeBlock(3, now())
        plasma.addRevenue(100, 1)
        await plasma.storeBlock(5, now())
        plasma.addRevenue(100, 1)
        plasma.addRevenue(100, 1)
        await plasma.storeBlock(7, now())
        plasma.addRevenue(100, 1)
        const m = await plasma.getMemberAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 3)
        assert.strictEqual("50", m.earnings)
        assert.strictEqual("100", (await plasma.getMemberAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 5)).earnings)
        assert.strictEqual("200", (await plasma.getMemberAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 7)).earnings)
        assert.strictEqual("250", (plasma.getMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2")).earnings)
    })

    it("should remember past blocks' proofs", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
        plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
        plasma.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "tester2")
        plasma.addRevenue(100, 9)
        await plasma.storeBlock(10, now())
        plasma.addRevenue(100, 11)
        await plasma.storeBlock(12, now())
        plasma.addRevenue(100, 13)
        plasma.addRevenue(100, 14)
        await plasma.storeBlock(15, now())
        plasma.addRevenue(100, 16)
        assert.deepStrictEqual(await plasma.getProofAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 10), ["0x089254c8faf641cf9b938c3d1be0461a63443bd55e2cb03598ce703383010df3", "0x74c09d0bd49adb55700b8ba22a49efb4a85405d4a7b5e0d62209938fc2363e40"])
        assert.deepStrictEqual(await plasma.getProofAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 12), ["0x712803d7ec3306a51b87884c112aace3bd988b706da2f9719c163f24687bbb87", "0x7dfc3cf2282bbb13a13807621855c3a3be3cb8c6c55bae4bb41443796f50e251"])
        assert.deepStrictEqual(await plasma.getProofAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 15), ["0x40a89ccebd4231e91a8aa0de330d4171fdad906646641d6b90c17da5bf645235", "0xa61fcc503e99bfdc9a3d8aa39113f8b4dfd43647d02e267553dfa17f15f94418"])
        assert.deepStrictEqual(plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"), ["0x8250a23ded43869af026434c294a101b2472238f3a66b3d44a12444c4c6a9e43", "0x81c9d0cbf94585f238d2be1154cdb36c4a68b14d006a363443efdefaf6727885"])
    })

    it("should perform fine with LOTS of members and queries of recent past blocks' proofs", async function() {
        this.timeout(40000)

        const initialMembers = []
        while (initialMembers.length < 5000) {
            initialMembers.push({
                address: `0x${crypto.randomBytes(20).toString("hex")}`,
                earnings: 0,
            })
        }
        const plasma = new MonoplasmaState(0, initialMembers, fileStore, admin, 0)
        plasma.addRevenue(100, 1)
        await plasma.storeBlock(100, now())
        plasma.addRevenue(100, 1)
        await plasma.storeBlock(101, now())
        plasma.addRevenue(100, 1)
        plasma.addRevenue(100, 1)
        await plasma.storeBlock(102, now())
        plasma.addRevenue(100, 1)

        // TODO: use mocha timeouts instead. They didn't seem to work well for CPU bound stuff though...
        // TODO: make this test actually test what the name says
        //         each getProofAt on cold cache (new block) takes about 5s
        const startTime = Date.now()
        for (let i = 0; i < 200; i++) {
            const bnum = 100 + i % 3
            const { address } = initialMembers[(50 * i) % initialMembers.length]
            await plasma.getProofAt(address, bnum)
            const timeTaken = Date.now() - startTime
            assert(timeTaken < 10000, "too slow!")
        }
    })

    it("should give revenue to adminAccount if no members present", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, "0x1234567890123456789012345678901234567890", 0)
        plasma.addRevenue(100, 1)
        assert.strictEqual(plasma.getMember("0x1234567890123456789012345678901234567890").earnings, "100")
    })
    it("should give no revenue to adminAccount if members present", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, "0x1234567890123456789012345678901234567890", 0)
        plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
        plasma.addRevenue(100, 1)
        assert.strictEqual(plasma.getMember("0x1234567890123456789012345678901234567890").earnings, "0")
    })

    describe("changing the admin fee", () => {
        it("should accept valid values", () => {
            const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
            plasma.setAdminFeeFraction(0.3)
            assert.strictEqual(plasma.adminFeeFraction.toString(), "300000000000000000")
            plasma.setAdminFeeFraction("400000000000000000")
            assert.strictEqual(plasma.adminFeeFraction.toString(), "400000000000000000")
            plasma.setAdminFeeFraction(new BN("500000000000000000"))
            assert.strictEqual(plasma.adminFeeFraction.toString(), "500000000000000000")
        })
        it("should not accept numbers from wrong range", () => {
            const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
            assert.throws(() => plasma.setAdminFeeFraction(-0.3))
            assert.throws(() => plasma.setAdminFeeFraction("-400000000000000000"))
            assert.throws(() => plasma.setAdminFeeFraction(new BN("-500000000000000000")))
            assert.throws(() => plasma.setAdminFeeFraction(1.3))
            assert.throws(() => plasma.setAdminFeeFraction("1400000000000000000"))
            assert.throws(() => plasma.setAdminFeeFraction(new BN("1500000000000000000")))
        })
        it("should not accept bad values", () => {
            const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
            assert.throws(() => plasma.setAdminFeeFraction("bad hex"))
            assert.throws(() => plasma.setAdminFeeFraction(""))
            assert.throws(() => plasma.setAdminFeeFraction({}))
            assert.throws(() => plasma.setAdminFeeFraction(plasma))
            assert.throws(() => plasma.setAdminFeeFraction())
        })
    })

    describe("getMemberApi", () => {
        let plasma
        beforeEach(() => {
            const plasmaAdmin = new MonoplasmaState(0, [], fileStore, admin, 0)
            plasmaAdmin.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
            plasmaAdmin.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "tester2")
            plasmaAdmin.addRevenue(100, 1)
            plasma = plasmaAdmin.getMemberApi()
        })
        it("has all read-only functions", async () => {
            assert.deepStrictEqual(plasma.getMembers(), [{
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
                earnings: "50",
                name: "tester1"
            }, {
                address: "0xe5019d79c3fc34c811e68e68c9bd9966f22370ef",
                earnings: "50",
                name: "tester2"
            }])
            assert.deepStrictEqual(plasma.getMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"), {
                name: "tester1",
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
                earnings: "50",
                proof: ["0xd17d3f85df9ac02d64aab3506d2be3cbd03f41c25bd02b0a0052bbf3dc75b2f8", "0x6fc4ac1c069d60a3673b87ceb7f42f73aa0584e662c7d703f7d839e30efea227"],
                active: true,
            })
            assert.strictEqual(plasma.getRootHash(), "0x5c0f1800a33a40e3c259d46e1def43e777bd67a3b85db8ecd4a5a630bf1ad38c")
            assert.deepStrictEqual(
                plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"),
                ["0xd17d3f85df9ac02d64aab3506d2be3cbd03f41c25bd02b0a0052bbf3dc75b2f8", "0x6fc4ac1c069d60a3673b87ceb7f42f73aa0584e662c7d703f7d839e30efea227"],
            )
        })
        it("doesn't have any write functions", () => {
            assert.strictEqual(plasma.addMember, undefined)
            assert.strictEqual(plasma.removeMember, undefined)
            assert.strictEqual(plasma.addRevenue, undefined)
            assert.strictEqual(plasma.getMemberApi, undefined)
        })
    })

})
