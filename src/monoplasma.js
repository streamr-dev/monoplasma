const MonoplasmaMember = require("./monoplasmaMember")
const MerkleTree = require("./merkletree")
const BN = require("bn.js")
const SortedMap = require("collections/sorted-map")

/**
 * Monoplasma state object
 *
 * Contains the logic of revenue distribution as well as current balances of/and participants
 */
class Monoplasma {
    /**
     *
     * @param {Array} initialMembers objects: [ { address, earnings }, { address, earnings }, ... ]
     */
    constructor(initialMembers) {
        // SortedMap constructor wants [[key1, value1], [key2, value2], ...]
        this.members = new SortedMap(Array.isArray(initialMembers) ? initialMembers.map(m => [m.address, new MonoplasmaMember(undefined, m.address, m.earnings)]) : [])
        this.tree = new MerkleTree(this.members)
    }

    // ///////////////////////////////////
    //      MEMBER API
    // ///////////////////////////////////

    getMembers() {
        return this.members
            .filter(m => m.isActive())
            .map(m => m.toObject())
    }

    getMember(address) {
        const m = this.members.get(address)
        if (!m) { return {} }
        const obj = m.toObject()
        obj.active = m.isActive()
        obj.proof = m.getProof(this.tree)
        return obj
    }

    /**
     * Get proof of earnings for withdrawal ("payslip")
     * @param address with earnings to be verified
     * @returns {Array} of bytes32 hashes ["0x123...", "0xabc..."]
     */
    getProof(address) {
        const path = this.tree.getPath(address)
        return path
    }

    getRootHash() {
        return this.tree.getRootHash()
    }

    // ///////////////////////////////////
    //      ADMIN API
    // ///////////////////////////////////
    addRevenue(amount) {
        const activeMembers = this.members.filter(m => m.isActive())
        const activeCount = new BN(activeMembers.length)
        if (activeCount === 0) {
            console.error("No active members in community!")
            return
        }

        const share = new BN(amount).divRound(activeCount)
        activeMembers.forEach(m => m.addRevenue(share))
        this.tree.update(this.members)
    }

    addMember(address, name) {
        this.members.set(address, new MonoplasmaMember(name, address))
        // tree.update(members)     // no need for update since no revenue allocated
    }

    removeMember(address) {
        const m = this.members.get(address)
        if (m) {
            m.setInactive()
        }
        // tree.update(members)     // no need for update since no revenue allocated
    }

    /**
     * Return a read-only "member API" that can only query this object
     */
    getMemberApi() {
        return {
            getMembers: this.getMembers.bind(this),
            getMember: this.getMember.bind(this),
            getProof: this.getProof.bind(this),
            getRootHash: this.getRootHash.bind(this),
        }
    }
}

module.exports = Monoplasma
