const MonoplasmaMember = require("../../src/monoplasmaMember")
const assert = require("assert")
const sinon = require("sinon")

describe("monoplasmaMember", () => {
    it("should add revenue to initially undefined balance", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2")
        m.addRevenue(100)
        assert.strictEqual(m.getEarningsAsInt(), 100)
    })
    it("should add revenue to initially defined balance", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 100)
        m.addRevenue(100)
        assert.strictEqual(m.getEarningsAsInt(), 200)
    })
    it("should initially be active", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2")
        assert(m.isActive())
    })
    it("should return correct object representation", () => {
        const m = new MonoplasmaMember("tester1", "b3428050ea2448ed2e4409be47e1a50ebac0b2d2", 100)
        const obj = {
            name: "tester1",
            address: "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2",
            earnings: "100"
        }
        assert.deepStrictEqual(m.toObject(), obj)
    })
    it("should return correct string data representation (to be hashed in the merkle tree)", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 100)
        const data = "b3428050ea2448ed2e4409be47e1a50ebac0b2d20000000000000000000000000000000000000000000000000000000000000064"
        assert.deepStrictEqual(m.toStringData(), data)
    })
    it("should return empty proof if earnings is zero", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2")
        assert.deepStrictEqual(m.getProof(), [])
    })
    it("should return proof", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 100)
        const tree = {}
        const proof = ["0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"]
        tree.getPath = sinon.stub().returns(proof)
        assert.deepStrictEqual(m.getProof(tree), proof)
    })
    it("should return proof", () => {
        const m = new MonoplasmaMember("tester1", "0xb3428050ea2448ed2e4409be47e1a50ebac0b2d2", 100)
        const tree = {}
        const proof = ["0x30b397c3eb0e07b7f1b8b39420c49f60c455a1a602f1a91486656870e3f8f74c"]
        tree.getPath = sinon.stub().returns(proof)
        assert.deepStrictEqual(m.getProof(tree), proof)
    })
    it("should throw when invalid address", () => {
        assert.throws(() => new MonoplasmaMember("tester1", "0xbe47e1ac0b2d2"))
    })
})
