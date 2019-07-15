const os = require("os")
const path = require("path")
const assert = require("assert")
var crypto = require("crypto")

const MonoplasmaState = require("../../src/state")

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
        plasma.addRevenue(100)
        assert.deepStrictEqual(plasma.getMemberCount(), { total: 2, active: 2, inactive: 0 })
        assert.deepStrictEqual(plasma.getMembers(), [
            {"address": "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "earnings": "50", "name": "tester1"},
            {"address": "0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "earnings": "50", "name": "tester2"},
        ])
        plasma.removeMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef")
        plasma.addRevenue(100)
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
        plasma.addRevenue(100)
    })

    it("should remember past blocks' earnings", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, admin, 0)
        plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
        plasma.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "tester2")
        plasma.addRevenue(100)
        await plasma.storeBlock(3)
        plasma.addRevenue(100)
        await plasma.storeBlock(5)
        plasma.addRevenue(100)
        plasma.addRevenue(100)
        await plasma.storeBlock(7)
        plasma.addRevenue(100)
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
        plasma.addRevenue(100)
        await plasma.storeBlock(10)
        plasma.addRevenue(100)
        await plasma.storeBlock(12)
        plasma.addRevenue(100)
        plasma.addRevenue(100)
        await plasma.storeBlock(15)
        plasma.addRevenue(100)
        assert.deepStrictEqual(await plasma.getProofAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 10), ["0x8620ab3c4df51cebd7ae1cd533c8824220db518d2a143e603e608eab62b169f7", "0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"])
        assert.deepStrictEqual(await plasma.getProofAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 12), ["0x8620ab3c4df51cebd7ae1cd533c8824220db518d2a143e603e608eab62b169f7", "0x1c3d277e4a94f6fc647ae9ffc2176165d8b90bf954f64fa536b6beedb34301a3"])
        assert.deepStrictEqual(await plasma.getProofAt("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 15), ["0x8620ab3c4df51cebd7ae1cd533c8824220db518d2a143e603e608eab62b169f7", "0xce54ad18b934665680ccc22f7db77ede2144519d5178736111611e745085dec6"])
        assert.deepStrictEqual(plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"), ["0x8620ab3c4df51cebd7ae1cd533c8824220db518d2a143e603e608eab62b169f7", "0x91360deed2f511a8503790083c6de21efbb1006b460d5024863ead9de5448927"])
    })

    it("should give revenue to adminAccount if no members present", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, "0x1234567890123456789012345678901234567890", 0)
        plasma.addRevenue(100)
        assert.strictEqual(plasma.getMember("0x1234567890123456789012345678901234567890").earnings, "100")
    })
    it("should give no revenue to adminAccount if members present", async () => {
        const plasma = new MonoplasmaState(0, [], fileStore, "0x1234567890123456789012345678901234567890", 0)
        plasma.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
        plasma.addRevenue(100)
        assert.strictEqual(plasma.getMember("0x1234567890123456789012345678901234567890").earnings, "0")
    })

    describe("getMemberApi", () => {
        let plasma
        beforeEach(() => {
            const plasmaAdmin = new MonoplasmaState(0, [], fileStore, admin, 0)
            plasmaAdmin.addMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", "tester1")
            plasmaAdmin.addMember("0xe5019d79c3fc34c811e68e68c9bd9966f22370ef", "tester2")
            plasmaAdmin.addRevenue(100)
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
                proof: ["0x8620ab3c4df51cebd7ae1cd533c8824220db518d2a143e603e608eab62b169f7", "0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"],
                active: true,
            })
            assert.strictEqual(plasma.getRootHash(), "0xe259a647fd9c91d31a98daa8185e28181d20ea0aeb9253718b10fcb074794582")
            assert.deepStrictEqual(
                plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"),
                ["0x8620ab3c4df51cebd7ae1cd533c8824220db518d2a143e603e608eab62b169f7", "0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"],
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
