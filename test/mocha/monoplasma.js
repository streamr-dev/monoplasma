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
        it("has all read-only functions", () => {
            assert.deepStrictEqual(plasma.getMembers(), [{
                name: "tester1",
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
                earnings: "50",
            }, {
                name: "tester2",
                address: "0xe5019d79c3fc34c811e68e68c9bd9966f22370ef",
                earnings: "50",
            }])
            assert.deepStrictEqual(plasma.getMember("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"), {
                name: "tester1",
                address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
                earnings: "50",
                proof: ["0xf6109b947fe5e7fac8c205f96618c5c175f3fe5ce55fb3e319030695cb971664"],
                active: true,
            })
            assert.strictEqual(plasma.getRootHash(), "0xee93860ac71d3f1cbdef175a373496b911e9649ad3b2c54ce2305f10d908be64")
            assert.deepStrictEqual(
                plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"),
                ["0xf6109b947fe5e7fac8c205f96618c5c175f3fe5ce55fb3e319030695cb971664"],
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
