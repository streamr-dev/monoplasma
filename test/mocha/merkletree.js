const assert = require("assert")
const SortedMap = require("collections/sorted-map")

const MerkleTree = require("../../src/merkletree")
const { hashMember, hashCombined } = MerkleTree.forTesting

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
        ["0x1", { address: "0x1", name: "A", balance: 3 }],
        ["0x2", { address: "0x2", name: "B", balance: 4 }],
        ["0x3", { address: "0x3", name: "C", balance: 5 }],
        ["0x4", { address: "0x4", name: "D", balance: 6 }],
        ["0x5", { address: "0x5", name: "E", balance: 7 }],
    ].slice(0, n))

    const testLarge = n => new SortedMap(Array.from(Array(n)).map((undef, i) => [
        `0x${i}`, { address: `0x${i}`, name: `Acco${i}`, balance: i },
    ]))

    it("is constructed correctly for 3 items", () => {
        const tree = new MerkleTree(testSmall(3))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [4,  // "branchCount", i.e. the index where leaf hashes start
            "0279d8888755db5a2485b0dcf566b46ca6c04f8595a1ab65b0ac7d5a893fc883",     //     root
            "4b4efd86a2cec7174648fca755d3b9caf672051f139e1b37846d357f29e0d889",   //  left
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457",   //            right
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //   A
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //       B
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //              C
            "0000000000000000000000000000000000000000000000000000000000000000", //                 (missing)
        ])

        assert.strictEqual(hashList[1], hashCombined(hashList[2], hashList[3]).toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[4], hashList[5]).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6].toString("hex"))
    })

    it("is constructed correctly for 5 items", () => {
        const tree = new MerkleTree(testSmall(5))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [8,  // "branchCount", i.e. the index where leaf hashes start
            "dcbfdd3352741a745f4f24aa1675f25e5338e5aab737c06b3465b95248b09942",             //       root
            "2a3c055e5aad1f95e094e401d23a52dd4975291cc3ecbaef3a11c98dfdef94b8",         //     left
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457",         //                right
            "4b4efd86a2cec7174648fca755d3b9caf672051f139e1b37846d357f29e0d889",     //    left
            "4b4efd86a2cec7174648fca755d3b9caf672051f139e1b37846d357f29e0d889",     //         right
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457",     //                  left
            "0000000000000000000000000000000000000000000000000000000000000000", //                       (missing)
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //  A
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //    B
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //          C
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //             D
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457", //                  E
            "0000000000000000000000000000000000000000000000000000000000000000", //                   (missing)
        ])

        assert.strictEqual(hashList[1], hashCombined(hashList[2],  hashList[3]).toString("hex"))
        assert.strictEqual(hashList[2], hashCombined(hashList[4],  hashList[5]).toString("hex"))
        assert.strictEqual(hashList[3], hashList[6])    // odd needs no hashing
        assert.strictEqual(hashList[4], hashCombined(hashList[8],  hashList[9]).toString("hex"))
        assert.strictEqual(hashList[5], hashCombined(hashList[10], hashList[11]).toString("hex"))
        assert.strictEqual(hashList[6], hashList[12])    // odd needs no hashing
    })

    it("is constructed correctly for 1 item", () => {
        const tree = new MerkleTree(testSmall(1))
        const { hashes } = tree.getContents()
        const hashList = hashes.map(buf => (typeof buf === "object" ? buf.toString("hex") : buf))
        assert.deepStrictEqual(hashList, [2,
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457",
            "a86d54e9aab41ae5e520ff0062ff1b4cbd0b2192bb01080a058bb170d84e6457",
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
        const path = tree.getPath("0x5")
        const root = tree.getRootHash()
        assert.deepStrictEqual(path, [
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x2a3c055e5aad1f95e094e401d23a52dd4975291cc3ecbaef3a11c98dfdef94b8",
        ])

        const memberHash = hashMember(members.get("0x5"))
        const hash = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hash.toString("hex")}`)
    })

    it("gives a correct path for 100 items", () => {
        const members = testLarge(100)
        const tree = new MerkleTree(members)
        const path = tree.getPath("0x50")
        const root = tree.getRootHash()
        assert.deepStrictEqual(path, [
            "0x19df2509aaea9ec273679075ae265956c6ede0e9fe5367d7c87cf38a017160ff",
            "0x9af819628a42e421415627f5db48cb2f0845512551c08657b58cf0383ea527c1",
            "0x554c73985da4ef12a72d87a57eee40da860f5fbdd29fe7d43ad3217c709acce2",
            "0x6da7faa19c24fd123c70c007cc0759d3aeced783d553269367547ba1a0f48038",
            "0xae68858b0d3eef00eeec11bed8e3d2932e1ef9091e3cd2483a8b19c63e44b1e6",
            "0x05b490f108b22ac29d5c80726c96593d4ad670f35d8100fcd09574af6e8de791",
            "0x070d83f76a4c7035bebc227e4f4e85fd79d5c4c30580445599dc9459497bd6d4",
        ])

        const memberHash = hashMember(members.get("0x50"))
        const hash = calculateRootHash(memberHash, path)
        assert.strictEqual(root, `0x${hash.toString("hex")}`)
    })
})
