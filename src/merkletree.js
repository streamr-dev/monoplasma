/* eslint-disable no-bitwise */

// TODO: node crypto should have sha3-256 support with openssl 1.1.1
// const crypto = require("crypto")

// TODO: following should also be a more modern drop-in replacement:
//const createKeccakHash = require("keccak")

const { keccak256 } = require("eth-lib").hash

const ZERO = Buffer.alloc(32)

/**
 * Corresponding code in BalanceVerifier.sol: keccak256 Solidity function
 * @param data to hash; a {String} or a {Buffer}
 * @returns {Buffer}
 */
function hash(data) {
    // TODO: following should be drop-in replacement:
    //return createKeccakHash("keccak256").update(data).digest()

    return Buffer.from(keccak256(data).slice(2), "hex")
}

/**
 * Hash a member's data in the merkle tree leaf
 * Corresponding code in BalanceVerifier.sol:
 *   bytes32 leafHash = keccak256(abi.encodePacked(account, balance, blockNumber));
 * @param {MonoplasmaMember} member
 * @param {Number} salt e.g. blockNumber
 * @returns {Buffer}
 */
function hashLeaf(member, salt) {
    const data = member.address + member.earnings.toString(16, 64) + salt
    return hash(data)
}

/**
 * Hash intermediate branch nodes together
 * @param {Buffer} data1
 * @param {Buffer} data2
 */
function hashCombined(data1, data2) {
    if (typeof data1 === "string") {
        data1 = Buffer.from(data1.startsWith("0x") ? data1.slice(2) : data1, "hex")
    }
    if (typeof data2 === "string") {
        data2 = Buffer.from(data2.startsWith("0x") ? data2.slice(2) : data2, "hex")
    }
    return hash(Buffer.concat([data1, data2]))
}

function roundUpToPowerOfTwo(x) {
    let i = 1
    while (i < x) { i <<= 1 }
    return i
}

/** @typedef {String} EthereumAddress */

/**
 * @typedef {Object} MerkleTree
 * @property {Array<Buffer>} hashes
 * @property {Map<EthereumAddress, Number>} indexOf the index of given address in the hashes array
 */

/**
 * Calculate the Merkle tree hashes
 * @param {Array<MonoplasmaMember>} leafContents
 * @returns {MerkleTree} hashes in the tree
 */
// TODO: --omg-optimisation: tree contents could be one big Buffer too! Hash digests are constant 32 bytes in length.
//          Currently the tree contents is Array<MonoplasmaMember>
function buildMerkleTree(leafContents) {
    const leafCount = leafContents.length + (leafContents.length % 2)   // room for zero next to odd leaf
    const branchCount = roundUpToPowerOfTwo(leafCount)
    const treeSize = branchCount + leafCount
    const hashes = new Array(treeSize)
    const indexOf = {}
    hashes[0] = branchCount

    // leaf hashes: hash(blockNumber + address + balance)
    let i = branchCount
    leafContents.forEach(m => {
        indexOf[m.address] = i
        // TODO: move toHashableString back to this file, into a function hashLeaf
        // TODO: add relevant blockNumber everywhere (used for salt)
        // hashes[i++] = hashLeaf(member, blockNumber)
        hashes[i++] = hash(m.toHashableString()) // eslint-disable-line no-plusplus
    })

    // Branch hashes: start from leaves, populate branches with hash(hash of left + right child)
    // Iterate start...end each level in tree, that is, indices 2^(n-1)...2^n
    for (let startI = branchCount, endI = treeSize; startI > 1; endI = startI, startI >>= 1) {
        let sourceI = startI
        let targetI = startI >> 1
        while (sourceI < endI) {
            const hash1 = hashes[sourceI]
            const hash2 = hashes[sourceI + 1]
            if (!hash1) {                   // end of level in tree because rest are missing
                break
            } else if (!hash2) {            // odd node in the end
                hashes[sourceI + 1] = Buffer.alloc(32) // add zero on the path
                hashes[targetI] = hash1     // no need to hash since no new information was added
                break
            } else {
                hashes[targetI] = (hash1.compare(hash2) === -1) ? hashCombined(hash1, hash2) : hashCombined(hash2, hash1)
            }
            sourceI += 2
            targetI += 1
        }
    }

    return { hashes, indexOf }
}

class MerkleTree {
    constructor(initialContents) {
        this.update(initialContents || [])
    }

    /**
     * Lazy update, the merkle tree is recalculated only when info is asked from it
     * @param newContents
     */
    update(newContents) {
        this.isDirty = true
        this.contents = newContents
    }

    getContents() {
        if (this.contents.length === 0) {
            throw new Error("Can't construct a MerkleTree with empty contents!")
        }
        if (this.isDirty) {
            // TODO: sort, to enforce determinism?
            this.cached = buildMerkleTree(this.contents)
            this.isDirty = false
        }
        return this.cached
    }

    includes(address) {
        const { indexOf } = this.getContents()
        return Object.prototype.hasOwnProperty.call(indexOf, address)
    }

    /**
     * Construct a "Merkle path", that is list of "other" hashes along the way from leaf to root
     * This will be sent to the root chain contract as a proof of balance
     * TODO: --omg-optimisation: the path could be compacted for paths containing odd nodes
     *        main benefit from that would be shorter proofs (no need to send 32-byte 0x0's)
     *        second benefit: no need to check for 0x0 in smart contract
     *        drawback: the reported index would not be "real" index (bad for debugging maybe)
     * @param address of the balance that the path is supposed to verify
     * @returns {Array} of bytes32 hashes ["0x123...", "0xabc..."]
     */
    getPath(address) {
        const { hashes, indexOf } = this.getContents()
        const index = indexOf[address]
        if (!index) {
            throw new Error(`Address ${address} not found!`)
        }
        const path = []
        for (let i = index; i > 1; i >>= 1) {
            const otherSibling = hashes[i ^ 1]
            if (otherSibling.compare(ZERO) !== 0) {
                path.push(otherSibling)
            }
        }
        return path.map(buffer => `0x${buffer.toString("hex")}`)
    }

    getRootHash() {
        const { hashes } = this.getContents()
        return `0x${hashes[1].toString("hex")}`
    }
}
MerkleTree.hash = hash
MerkleTree.hashLeaf = hashLeaf
MerkleTree.hashCombined = hashCombined

module.exports = MerkleTree
