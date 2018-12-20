const assert = require("assert")
const SortedMap = require("collections/sorted-map")
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
    const testSmall = n => new SortedMap([
        ["0x1f428050ea2448ed2e4409be47e1a50ebac0b2d2", a],
        ["0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", b],
        ["0x3f428050ea2448ed2e4409be47e1a50ebac0b2d2", c],
        ["0x4f428050ea2448ed2e4409be47e1a50ebac0b2d2", d],
        ["0x5f428050ea2448ed2e4409be47e1a50ebac0b2d2", e],
    ].slice(0, n))

    function buildValidAddress(i) {
        const nbDigits = i.toString().length
        const rest = "0f428050ea2448ed2e4409be47e1a50ebac0b2d2".substr(nbDigits)
        return `0x${i}${rest}`
    }

    const testLarge = n => new SortedMap(Array.from(Array(n)).map((undef, i) => [
        buildValidAddress(i), new MonoplasmaMember(`Acco${i}`, buildValidAddress(i), i),
    ]))

    it("is constructed correctly for 3 items", () => {
        const tree = new MerkleTree(testSmall(3))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [4,  // "branchCount", i.e. the index where leaf hashes start
            "03259737e26ccad0654747913d9dd20fdbd724d04651ee8c3ef605b2dc26c79e",     //     root
            "9ec71b4bdae06e827eaac5c49802bce973069a53a46fec5724fe507820303266",   //  left
            "5c506e31e7f370f5c3afadf8736622d149033bff4c4ddd2b4ee6aeb2d6f04438",   //            right
            "53d7fa621c904c6c5a30ea98308c929b9283779286d9be3c34840312588d7494", //   A
            "caa98b1fec3fffff25b9750cbb0f59ab76285c4dbd64b144300cb8a2787bde5b", //       B
            "5c506e31e7f370f5c3afadf8736622d149033bff4c4ddd2b4ee6aeb2d6f04438", //              C
            "0000000000000000000000000000000000000000000000000000000000000000", //                 (missing)
        ])
        assert.strictEqual(hashList[4], hash(a.toStringData()).toString("hex"))
        assert.strictEqual(hashList[5], hash(b.toStringData()).toString("hex"))
        assert.strictEqual(hashList[6], hash(c.toStringData()).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6].toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[4], hashList[5]).toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[3], hashList[2]).toString("hex"))
    })

    it("is constructed correctly for 5 items", () => {
        const tree = new MerkleTree(testSmall(5))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [8,  // "branchCount", i.e. the index where leaf hashes start
            "3a843aa2841b94762a690ab9e4df54a58a574017b81df2a141521efbe233c6a0",             //       root
            "10cdfe18b6c1ffdb9451269f5da73015b49c7a724101f9550316a286e8ba870d",         //     left
            "3101cc2c511bae4edfff12272ee75ec8ea18f4227f7a4f9a8fbb305b72c67dbc",         //                right
            "9ec71b4bdae06e827eaac5c49802bce973069a53a46fec5724fe507820303266",     //    left
            "64b51bb29c80bcf48d787ec0eccfd916320cb814568026d6072be019d6980ec2",     //         right
            "3101cc2c511bae4edfff12272ee75ec8ea18f4227f7a4f9a8fbb305b72c67dbc",     //                  left
            "0000000000000000000000000000000000000000000000000000000000000000", //                       (missing)
            "53d7fa621c904c6c5a30ea98308c929b9283779286d9be3c34840312588d7494", //  A
            "caa98b1fec3fffff25b9750cbb0f59ab76285c4dbd64b144300cb8a2787bde5b", //    B
            "5c506e31e7f370f5c3afadf8736622d149033bff4c4ddd2b4ee6aeb2d6f04438", //          C
            "1829c27b9f10e6f3f4c3aa120933235087c94f57b75f55072c1f08c2f17a4b0b", //             D
            "3101cc2c511bae4edfff12272ee75ec8ea18f4227f7a4f9a8fbb305b72c67dbc", //                  E
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
        assert.strictEqual(hashList[4], hashCombined(hashList[8],  hashList[9]).toString("hex"))
        assert.strictEqual(hashList[5], hashCombined(hashList[11], hashList[10]).toString("hex"))
        assert.strictEqual(hashList[6], hashList[12])    // odd needs no hashing
    })

    it("is constructed correctly for 1 item", () => {
        const tree = new MerkleTree(testSmall(1))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [2,
            "53d7fa621c904c6c5a30ea98308c929b9283779286d9be3c34840312588d7494",
            "53d7fa621c904c6c5a30ea98308c929b9283779286d9be3c34840312588d7494",
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
            "0x10cdfe18b6c1ffdb9451269f5da73015b49c7a724101f9550316a286e8ba870d",
        ])

        const memberHash = hash(members.get("0x5f428050ea2448ed2e4409be47e1a50ebac0b2d2").toStringData())
        const hashed = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })

    it("gives a correct path for 100 items", () => {
        const members = testLarge(100)
        const tree = new MerkleTree(members)
        const path = tree.getPath("0x50428050ea2448ed2e4409be47e1a50ebac0b2d2")
        const root = tree.getRootHash()
        assert.deepStrictEqual(path, [
            "0x01ab3b81aa6218509022839c00090a438a5ffd21b8e08cce4af9c00d533a7068",
            "0x9faeb8c50f4c5712ea922fea38ff78c3561e27b05cc4c525bf8c12978c7cedb7",
            "0x2b83277cc6f8389f67c0c138a9d4925c2dffb6ce119272a95a36f2cc2f6d0e06",
            "0x896e3c8e09e9b6f02585311b40d95bfe664920b743f77a1bf4f221b530f620c7",
            "0x91bf6440de2f2a3c480d26633f3d121fa4aa0094b8e31c2f169a0702576d8943",
            "0xf497014293ce1ef852bac5f2aa2ace575ba981c3c3a9589c621e813009031d8e",
            "0x3a47c67d2cc03a6ee80d3ca527f5ce47bc24a13ad24d668247bf490aebf47f97",
        ])

        const memberHash = hash(members.get("0x50428050ea2448ed2e4409be47e1a50ebac0b2d2").toStringData())
        const hashed = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })
})
