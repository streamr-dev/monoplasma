/*global describe it beforeEach */

const Monoplasma = require("../../src/monoplasma")
const assert = require("assert")

describe("Monoplasma", () => {
    it("should return member passed to constructor and then remove it successfully", () => {
        const plasmaAdmin = new Monoplasma([{
            address: "0xff019d79c31114c811e68e68c9863966f22370ef",
            earnings: 10
        }])
        assert.deepStrictEqual(plasmaAdmin.getMembers(), [{
            address: "0xff019d79c31114c811e68e68c9863966f22370ef",
            earnings: "10",
        }])
        plasmaAdmin.removeMember("0xff019d79c31114c811e68e68c9863966f22370ef")
        assert.deepStrictEqual(plasmaAdmin.getMembers(), [])
    })
    describe("getMemberApi", () => {
        let plasma
        beforeEach(() => {
            const plasmaAdmin = new Monoplasma()
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
                proof: ["0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"],
                active: true,
            })
            assert.strictEqual(plasma.getRootHash(), "0xac3f6f6b401eba33db9fc994c90d2bfad208234be3bf4ce11139b5a663834af3")
            assert.deepStrictEqual(
                plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"),
                ["0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"],
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
