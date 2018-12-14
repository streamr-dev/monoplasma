const assert = require("assert")
const SortedMap = require("collections/sorted-map")
const MonoplasmaMember = require("../../src/monoplasmaMember")
const MerkleTree = require("../../src/merkletree")
const { hash, hashCombined } = MerkleTree.forTesting

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
    const testSmall = n => new SortedMap([
        ["0x1f428050ea2448ed2e4409be47e1a50ebac0b2d2", new MonoplasmaMember("A", "0x1f428050ea2448ed2e4409be47e1a50ebac0b2d2", 3)],
        ["0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", new MonoplasmaMember("B", "0x2f428050ea2448ed2e4409be47e1a50ebac0b2d2", 4)],
        ["0x3f428050ea2448ed2e4409be47e1a50ebac0b2d2", new MonoplasmaMember("C", "0x3f428050ea2448ed2e4409be47e1a50ebac0b2d2", 5)],
        ["0x4f428050ea2448ed2e4409be47e1a50ebac0b2d2", new MonoplasmaMember("D", "0x4f428050ea2448ed2e4409be47e1a50ebac0b2d2", 6)],
        ["0x5f428050ea2448ed2e4409be47e1a50ebac0b2d2", new MonoplasmaMember("E", "0x5f428050ea2448ed2e4409be47e1a50ebac0b2d2", 7)],
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
            "6de0540de150598559546f43a5a5c1f8685976d5771b47784f41308b7e841dd9",     //     root
            "94552b5c198b1e2f33f33567e28db86198ab7ced681db8339bd8888e8876257b",   //  left
            "5afc49476d64ab14995ef9aff58e646ce64a31b12a0cab0cabc3ca183ad94a60",   //            right
            "f319238985761679f0cdd05de8e7669e6a27cbe1a07d9f6564182c6279515b9f", //   A
            "d3abc854ff61e1d3b94e1ddac38a7c01786b0734e428e62697298bbda1407bc1", //       B
            "5afc49476d64ab14995ef9aff58e646ce64a31b12a0cab0cabc3ca183ad94a60", //              C
            "0000000000000000000000000000000000000000000000000000000000000000", //                 (missing)
        ])
        assert.strictEqual(hashList[4], hash("1f428050ea2448ed2e4409be47e1a50ebac0b2d23").toString("hex"))
        assert.strictEqual(hashList[5], hash("2f428050ea2448ed2e4409be47e1a50ebac0b2d24").toString("hex"))
        assert.strictEqual(hashList[6], hash("3f428050ea2448ed2e4409be47e1a50ebac0b2d25").toString("hex"))
        assert.strictEqual(hashList[3], hashList[6].toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[5], hashList[4]).toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[3], hashList[2]).toString("hex"))
    })

    it("is constructed correctly for 5 items", () => {
        const tree = new MerkleTree(testSmall(5))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [8,  // "branchCount", i.e. the index where leaf hashes start
            "f956a4ea65e125da236d15c25689c5714d5d6d0b5738aeae33d15eac5e4ea448",             //       root
            "59262c5ffb889bd187a0f332803cc52041c6a179137f64bf8deb34f58df90f7d",         //     left
            "f87c6364cf884d39d3bb1e48920ab3e9017419e26fb4a446af1531dcc0a0782a",         //                right
            "94552b5c198b1e2f33f33567e28db86198ab7ced681db8339bd8888e8876257b",     //    left
            "eabc4c7d08b0842624437477a28fb499ebf864be4cfe3b1c38ce3217571d886d",     //         right
            "f87c6364cf884d39d3bb1e48920ab3e9017419e26fb4a446af1531dcc0a0782a",     //                  left
            "0000000000000000000000000000000000000000000000000000000000000000", //                       (missing)
            "f319238985761679f0cdd05de8e7669e6a27cbe1a07d9f6564182c6279515b9f", //  A
            "d3abc854ff61e1d3b94e1ddac38a7c01786b0734e428e62697298bbda1407bc1", //    B
            "5afc49476d64ab14995ef9aff58e646ce64a31b12a0cab0cabc3ca183ad94a60", //          C
            "8b1b9c4c7f702bb2d9d18ff0ad2e5f28f7874c1fc32c5973b5a88acb4f106e1f", //             D
            "f87c6364cf884d39d3bb1e48920ab3e9017419e26fb4a446af1531dcc0a0782a", //                  E
            "0000000000000000000000000000000000000000000000000000000000000000", //                   (missing)
        ])

        assert.strictEqual(hashList[8], hash("1f428050ea2448ed2e4409be47e1a50ebac0b2d23").toString("hex"))
        assert.strictEqual(hashList[9], hash("2f428050ea2448ed2e4409be47e1a50ebac0b2d24").toString("hex"))
        assert.strictEqual(hashList[10], hash("3f428050ea2448ed2e4409be47e1a50ebac0b2d25").toString("hex"))
        assert.strictEqual(hashList[11], hash("4f428050ea2448ed2e4409be47e1a50ebac0b2d26").toString("hex"))
        assert.strictEqual(hashList[12], hash("5f428050ea2448ed2e4409be47e1a50ebac0b2d27").toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[2],  hashList[3]).toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[4],  hashList[5]).toString("hex"))
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
            "f319238985761679f0cdd05de8e7669e6a27cbe1a07d9f6564182c6279515b9f",
            "f319238985761679f0cdd05de8e7669e6a27cbe1a07d9f6564182c6279515b9f",
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
            "0x59262c5ffb889bd187a0f332803cc52041c6a179137f64bf8deb34f58df90f7d",
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
            "0xee90e95f66db53f5c58e9159b7c20d0270c3f0fa579da46011da52f480e9a984",
            "0x83013616176c378a3b74fceea5b786d6873790f1192935efeca87d34eead268f",
            "0xf552f7ff80c8e25275e50e0bb4a24e1deada6e71eddf427539052ed4dc996c86",
            "0xecd8232f7a3740f0d85ee8fbd631e9c6e74c25d0ab3aabf9303e9a69305a65de",
            "0xecbab549d4b0ec25849de9349e3bfa35672a1ac09fcac49844ace0f664f6dbed",
            "0xe910a9963579aea927da3fb86df035ad41f904975f332383ba71fa9dfb1b4de0",
            "0x8d95c9ecacf1fedda82ac25aa35c1828484a83654fffb99d7e60903873423038",
        ])

        const memberHash = hash(members.get("0x50428050ea2448ed2e4409be47e1a50ebac0b2d2").toStringData())
        const hashed = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })
})
