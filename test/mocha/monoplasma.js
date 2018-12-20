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
                proof: ["0x0cd8ff0e152617ea9db4349156ef64660037b5c35f2ed7b4db55e5a85ebca4e5"],
                active: true,
            })
            assert.strictEqual(plasma.getRootHash(), "0x47aada6e4397871179b68a2766e5ce2afb02fbef17108755651caf951ff0fe8e")
            assert.deepStrictEqual(
                plasma.getProof("0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2"),
                ["0x0cd8ff0e152617ea9db4349156ef64660037b5c35f2ed7b4db55e5a85ebca4e5"],
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
