
const assert = require("assert")
const MonoplasmaMember = require("../../src/member")
const MerkleTree = require("../../src/merkletree")
const { hash, hashLeaf, hashCombined } = MerkleTree

// calculate the root hash using the path (sync with BalanceVerifier.sol:calculateRootHash)
function calculateRootHash(memberHash, others) {
    let root = Buffer.from(memberHash.slice(2), "hex")
    for (let i = 0; i < others.length; i += 1) {
        const other = Buffer.from(others[i].slice(2), "hex")
        if (root.compare(other) === -1) {
            root = hash(Buffer.concat([root, other]))
        } else {
            root = hash(Buffer.concat([other, root]))
        }
    }
    return root
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
        const tree = new MerkleTree(testSmall(3), 1234)
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [4,  // "branchCount", i.e. the index where leaf hashes start
            "88a894579dc1ac11242da55444d92e406ff2686556630c81162a27965157deac",     //     root
            "e9d23210548554e271f8ff4a5208cf5233bb56d6e7294c78fcad5ecc42e096bd",   //  left
            "814b26e10015a87381c08291f2b16577c101d87fc66157ed237b88f67257c76a",   //            right
            "ed5a0925a9a579df831e5319f7c04a49a7895ebe7c8236546920783b0bad5a4f", //   A
            "d49a469ba14e622f0fa2ff5ec1bed6f967a68cd6886b3bea4a7631fbaaf4bc61", //       B
            "814b26e10015a87381c08291f2b16577c101d87fc66157ed237b88f67257c76a", //              C
            "0000000000000000000000000000000000000000000000000000000000000000"  //                 (missing)
        ])
        assert.strictEqual(hashList[4], hashLeaf(a, tree.salt).toString("hex"))
        assert.strictEqual(hashList[5], hashLeaf(b, tree.salt).toString("hex"))
        assert.strictEqual(hashList[6], hashLeaf(c, tree.salt).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6].toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[4], hashList[5]).toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[2], hashList[3]).toString("hex"))
    })

    it("is constructed correctly for 5 items", () => {
        const tree = new MerkleTree(testSmall(5), 3456)
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [8,  // "branchCount", i.e. the index where leaf hashes start
            "1b6cd614f4f2c86ccc82cd3c8df23c794790e22cf8e56f3255611950a681efe3",             //       root
            "a4eb1454b3e945355a5a23d1562f21c54367f9a315ff2793c530b5c1f9bec559",         //     left
            "f2156cb0dea8913ac515f0c3ad231414ece7dfb23973bb89dbc4ee0049b9e172",         //                right
            "99638428d261a3da604f873c9e2f6779a84aa0b2e001c164c59a3e4377495b80",     //    left
            "db5f253a21520c6be38fda228dc0938e6ac3b6ed61606f4ecccacf4f666c5881",     //         right
            "f2156cb0dea8913ac515f0c3ad231414ece7dfb23973bb89dbc4ee0049b9e172",     //                  left
            "0000000000000000000000000000000000000000000000000000000000000000", //                       (missing)
            "cbd929789577d192c9747193f8ff6be257df5bacb18953d263402b12dde6fbfb", //  A
            "dd49055da64dc81c5c9da9be3792f57c6bb4d9adab124556ad5f06e5837c71c4", //    B
            "b59af9905674879b38932c92d91ee3c978b2b94dc2e097934990edc71f685cfb", //          C
            "64b989e4735794ace37acb89c36db9a97ecb6d2c324c24c1a4e7baa3df307f9c", //             D
            "f2156cb0dea8913ac515f0c3ad231414ece7dfb23973bb89dbc4ee0049b9e172", //                  E
            "0000000000000000000000000000000000000000000000000000000000000000", //                   (missing)
        ])

        assert.strictEqual(hashList[8], hashLeaf(a, tree.salt).toString("hex"))
        assert.strictEqual(hashList[9], hashLeaf(b, tree.salt).toString("hex"))
        assert.strictEqual(hashList[10], hashLeaf(c, tree.salt).toString("hex"))
        assert.strictEqual(hashList[11], hashLeaf(d, tree.salt).toString("hex"))
        assert.strictEqual(hashList[12], hashLeaf(e, tree.salt).toString("hex"))
        assert.strictEqual(hashList[1], hashCombined(hashList[2],  hashList[3]).toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[4],  hashList[5]).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6])    // odd needs no hashing
        assert.strictEqual(hashList[4], hashCombined(hashList[8],  hashList[9]).toString("hex"))
        assert.strictEqual(hashList[5], hashCombined(hashList[10], hashList[11]).toString("hex"))
        assert.strictEqual(hashList[6], hashList[12])    // odd needs no hashing
    })

    it("is constructed correctly for 1 item", () => {
        const tree = new MerkleTree(testSmall(1), 5678)
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [2,
            "0152b424402445bb5c05369975e54ce015caf6142f50f740a8a740182e93da87",
            "0152b424402445bb5c05369975e54ce015caf6142f50f740a8a740182e93da87",
            "0000000000000000000000000000000000000000000000000000000000000000",
        ])
    })

    it("fails for 0 items", () => {
        assert.throws(() => {
            const tree = new MerkleTree(testSmall(0), 123)
            tree.getContents()
        })
    })

    it("gives a correct path for 5 items", () => {
        const members = testSmall(5)
        const tree = new MerkleTree(members, 4321)
        const paths = members.map(m => tree.getPath(m.address))
        const root = tree.getRootHash()
        assert.deepStrictEqual(paths, [
            [
                "0x5c4c79458b136b3102e8785f038c2757aad7a26bfd5300c59e3190c06615bb68",
                "0x2ce424905e0e1614b3639a6814651c36acc28fd7a6be33d8d5fbb6dfdf4c6a01",
                "0x0882200b8014f3ce8cbc72e87b4cdceca89cfb75bff2e34a846cca948738ae04"
            ],
            [
                "0x4ddc37d69d26076eb5241c5c6d82a5a09c7dbae04e7ecba86b1c3e04c344e2a5",
                "0x2ce424905e0e1614b3639a6814651c36acc28fd7a6be33d8d5fbb6dfdf4c6a01",
                "0x0882200b8014f3ce8cbc72e87b4cdceca89cfb75bff2e34a846cca948738ae04"
            ],
            [
                "0x9d03445f44cac137e08067550568f4e415e0c51c81d3586274547208043aa593",
                "0xaa76ab2f486b35fd6d49b79557ad85c4ad60d520665250749efd463a04cfaa3b",
                "0x0882200b8014f3ce8cbc72e87b4cdceca89cfb75bff2e34a846cca948738ae04"
            ],
            [
                "0x8e67188dc47dc839031732d207f245405a790baf1b276f69af172ccb043d0b29",
                "0xaa76ab2f486b35fd6d49b79557ad85c4ad60d520665250749efd463a04cfaa3b",
                "0x0882200b8014f3ce8cbc72e87b4cdceca89cfb75bff2e34a846cca948738ae04"
            ],
            [
                "0xfe71407574dbdb95f250e638be7e9a7ac4a6c53df57b2a7ea54aee4f293510b4"
            ]
        ])

        const memberHash = MerkleTree.hashLeaf(e, tree.salt)
        const hashed = calculateRootHash(memberHash, paths[4])
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })

    it("gives a correct path for 100 items", () => {
        const members = testLarge(100)
        const tree = new MerkleTree(members, 2020)
        const path = tree.getPath("0x50428050ea2448ed2e4409be47e1a50ebac0b2d2")
        const root = tree.getRootHash()
        assert.deepStrictEqual(path, [
            "0xb8c4babc1431a10d6935da7d76278e433a58b9c70304bcb365e7de7fa3f2e6ff",
            "0xd05327947ae0c1f4b26d437a4f5b8150d9f0b2c6729e718982b40a577da85598",
            "0xaa29de5ffc83e24b1a69bb4aa549958357cbdb973bf2db15f1d9c488864f5302",
            "0x0d7c8aa66aabdc0f1a77d3ca80b443b02d250ae955b2e78afde4925a1c1ba7b2",
            "0x44181ef37ba7f9aab650c50cfa7b571465cdbb58e67c0e45fc7e277ac049190d",
            "0xbfb3e4c6f0a7dcef1514359ec11b66e6097090a027c3be07554489b8022802bd",
            "0x583e976f703c0c398f95f8eed803c6dece9153a76d4d22a18f2c3fc8669cc973"
        ])

        const memberHash = hashLeaf(members.find(m => m.address === "0x50428050ea2448ed2e4409be47e1a50ebac0b2d2"), tree.salt)
        const hashed = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hashed.toString("hex")}`)
    })

    it("includes", () => {
        const members = testLarge(100)
        const tree = new MerkleTree(members, 6453)
        for (let i = 0; i < 100; i++) {
            const a = buildValidAddress(i)
            assert(tree.includes(a), "Member not found")
        }
    })
})
