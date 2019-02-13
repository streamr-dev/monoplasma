/*global describe it */

const assert = require("assert")
const MonoplasmaMember = require("../../src/monoplasmaMember")
const MerkleTree = require("../../src/merkletree")
const { hash, hashCombined } = MerkleTree

// calculate the root hash using the path (sync with SidechainCommunity.sol:rootHash)
function calculateRootHash(hash, path) {
    for (let i = 0; i < path.length; i += 1) {
        if (Number(path[i]) === 0) { continue }                    // eslint-disable-line no-continue
        const other = Buffer.from(path[i].slice(2), "hex")
        if (hash.compare(other) === -1) {
            hash = hashCombined(hash, other)
        } else {
            hash = hashCombined(other, hash)
        }
    }
    return hash
}

describe("Merkle tree", () => {
    const a = new MonoplasmaMember("A", "0x1f428050ea2448ed2e4409be47e1a50ebac0b2d2", 3)
    const b = new MonoplasmaMember("B", "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", 4)
    const c = new MonoplasmaMember("C", "0x3f428050ea2448ed2e4409be47e1a50ebac0b2d2", 5)
    const d = new MonoplasmaMember("D", "0x4f428050ea2448ed2e4409be47e1a50ebac0b2d2", 6)
    const e = new MonoplasmaMember("E", "0x5f428050ea2448ed2e4409be47e1a50ebac0b2d2", 7)
    const testSmall = n => [a, b, c, d, e].slice(0, n)

    function buildValidAddress(i) {
        const nbDigits = i.toString().length
        const rest = "0f428050ea2448ed2e4409be47e1a50ebac0b2d2".substr(nbDigits)
        return `0x${i}${rest}`
    }

    const testLarge = n => Array.from(Array(n)).map((undef, i) => new MonoplasmaMember(`Acco${i}`, buildValidAddress(i), i))

    it("is constructed correctly for 3 items", () => {
        const tree = new MerkleTree(testSmall(3))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [4,  // "branchCount", i.e. the index where leaf hashes start
            "dd9789560ea2c9f1bd696fb348d239063d2bf078902b4c6b5e2ccfc2b45cde21",     //     root
            "2c0851c9ca186c6a34e6b83f056f9cb9121430bf6f04c951a7ba655b513f6059",   //  left
            "00c99bd92a2211cbeaab19380a2aa0b9a36980228b5695c69f8265f9055444e1",   //            right
            "80cbbaa563d509ffd388bd6e716bd85c0c35da5c87bbfb457c9c8cff0d518419", //   A
            "3f37e976185114769bdf46f66cdd0ec8e51a4a81cd378679513fd4ab5645450c", //       B
            "00c99bd92a2211cbeaab19380a2aa0b9a36980228b5695c69f8265f9055444e1", //              C
            "0000000000000000000000000000000000000000000000000000000000000000", //                 (missing)
        ])
        assert.strictEqual(hashList[4], hash(a.toStringData()).toString("hex"))
        assert.strictEqual(hashList[5], hash(b.toStringData()).toString("hex"))
        assert.strictEqual(hashList[6], hash(c.toStringData()).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6].toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[5], hashList[4]).toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[3], hashList[2]).toString("hex"))
    })

    it("is constructed correctly for 5 items", () => {
        const tree = new MerkleTree(testSmall(5))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [8,  // "branchCount", i.e. the index where leaf hashes start
            "68d7d43f9603a819e00ad7a8003eba2a0d96a9c5bd89841c42d62e0bead09b5d",             //       root
            "39720c89aa9c0c443c3c9e9e283a8bf1064c15bb8cd066c78a98fa31573aa95a",         //     left
            "82dd6ef28bf5a82738985884f1d599fc2e15109ab21d3c361c88397c5e36e59f",         //                right
            "2c0851c9ca186c6a34e6b83f056f9cb9121430bf6f04c951a7ba655b513f6059",     //    left
            "006a9f9553ae503d31a22eb2589ac9eafe3740b29c9451210313031fcea49efa",     //         right
            "82dd6ef28bf5a82738985884f1d599fc2e15109ab21d3c361c88397c5e36e59f",     //                  left
            "0000000000000000000000000000000000000000000000000000000000000000", //                       (missing)
            "80cbbaa563d509ffd388bd6e716bd85c0c35da5c87bbfb457c9c8cff0d518419", //  A
            "3f37e976185114769bdf46f66cdd0ec8e51a4a81cd378679513fd4ab5645450c", //    B
            "00c99bd92a2211cbeaab19380a2aa0b9a36980228b5695c69f8265f9055444e1", //          C
            "cf3c370bef592b8da4ad2d1d7ff5085d70be954f2d9f6167d97726ad6b940b1f", //             D
            "82dd6ef28bf5a82738985884f1d599fc2e15109ab21d3c361c88397c5e36e59f", //                  E
            "0000000000000000000000000000000000000000000000000000000000000000", //                   (missing)
        ])

        assert.strictEqual(hashList[8], hash(a.toStringData()).toString("hex"))
        assert.strictEqual(hashList[9], hash(b.toStringData()).toString("hex"))
        assert.strictEqual(hashList[10], hash(c.toStringData()).toString("hex"))
        assert.strictEqual(hashList[11], hash(d.toStringData()).toString("hex"))
        assert.strictEqual(hashList[12], hash(e.toStringData()).toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[2],  hashList[3]).toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[5],  hashList[4]).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6])    // odd needs no hashing
        assert.strictEqual(hashList[4], hashCombined(hashList[9],  hashList[8]).toString("hex"))
        assert.strictEqual(hashList[5], hashCombined(hashList[10], hashList[11]).toString("hex"))
        assert.strictEqual(hashList[6], hashList[12])    // odd needs no hashing
    })

    it("is constructed correctly for 1 item", () => {
        const tree = new MerkleTree(testSmall(1))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [2,
            "80cbbaa563d509ffd388bd6e716bd85c0c35da5c87bbfb457c9c8cff0d518419",
            "80cbbaa563d509ffd388bd6e716bd85c0c35da5c87bbfb457c9c8cff0d518419",
            "0000000000000000000000000000000000000000000000000000000000000000",
        ])
    })

    it("fails for 0 items", () => {
        assert.throws(() => {
            const tree = new MerkleTree(testSmall(0))
            tree.getContents()
        })
    })

    it("gives a correct path for 5 items", () => {
        const members = testSmall(5)
        const tree = new MerkleTree(members)
        const path = tree.getPath("0x5f428050ea2448ed2e4409be47e1a50ebac0b2d2")
        const root = tree.getRootHash()
        assert.deepStrictEqual(path, [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x39720c89aa9c0c443c3c9e9e283a8bf1064c15bb8cd066c78a98fa31573aa95a",
        ])

        const memberHash = hash(e.toStringData())
        const hashed = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })

    it("gives a correct path for 100 items", () => {
        const members = testLarge(100)
        const tree = new MerkleTree(members)
        const path = tree.getPath("0x50428050ea2448ed2e4409be47e1a50ebac0b2d2")
        const root = tree.getRootHash()
        assert.deepStrictEqual(path, [
            "0x3899f1e3196adaca54e5fce47c83478bbc68d82e1c4db340ff4d5be077da5809",
            "0xc27f2d90363c8681b7703d71466b0d29bc971e176548d925e9252568f9b93a4a",
            "0x22a472070f84cb2259fc2dcdf5b7b387390e0fc01fd949dd113f4b2426af24d7",
            "0xc09fb967d65193de64670085a09a814f51be24c9461b361c960f9fe049be724d",
            "0xc49d351e156eedeff8dc29f1414835e8d243d9d98cb8ab0d62b76e4e159fa7c5",
            "0x368cc389cf2618d7c101a854fff75ed5a547d0986bf78da6153da23b8fea16ee",
            "0xa697780bec0c72e7a647f0cc067dd2b30732cbbb362d63f2eccee67dee345690"
        ])

        const memberHash = hash(members.find(m => m.address === "0x50428050ea2448ed2e4409be47e1a50ebac0b2d2").toStringData())
        const hashed = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })
})
