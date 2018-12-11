const MerkleTree = require("./merkletree")

// TODO: instead of SortedMap, the accounts maybe should have "fixed" indices, e.g. join-order
const SortedMap = require("collections/sorted-map")

/**
 * Member API to Monoplasma object
 */
class Monoplasma {
    /**
     *
     * @param {Array} initialMembers objects: [ { address, earnings }, { address, earnings }, ... ]
     */
    constructor(initialMembers) {
        // SortedMap constructor wants [[key1, value1], [key2, value2], ...]
        this.members = new SortedMap(Array.isArray(initialMembers) ? initialMembers.map(m => [m.address, m]) : [])
        this.tree = new MerkleTree(this.members)
    }

    // ///////////////////////////////////
    //      MEMBER API
    // ///////////////////////////////////

    getMembers() {
        return this.members.filter(m => m.active).map(m => ({
            name: m.name,
            address: m.address,
            earnings: m.earnings,
        }))
    }

    getMember(address) {
        const m = this.members.get(address)
        const proof = m && m.earnings > 0 ? this.getProof(address) : {}
        return Object.assign({}, m, { proof })
    }

    /**
     * Get proof of earnings
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

    // TODO: BigIntegers for earnings
    // TODO: lazy adding: accumulate revenues until someone asks, only then tree.update
    addRevenue(amount) {
        const activeMembers = this.members.filter(m => m.active)
        const activeCount = activeMembers.length
        if (activeCount === 0) {
            console.error("No active members in community!")
            return
        }

        const share = Math.floor(amount / activeCount)
        activeMembers.forEach(m => {
            m.earnings += share
        })
        this.tree.update(this.members)
    }

    addMember(address, name) {
        if (address.length === 40) {
            address = `0x${address}`
        }
        if (Number.isNaN(Number(address)) || address.length !== 42) {
            throw new Error(`Bad Ethereum address: ${address}`)
        }
        this.members.set(address, {address, name, earnings: 0, active: true})
        // tree.update(members)     // no need for update since no revenue allocated
    }

    removeMember(address) {
        const m = this.members.get(address)
        m.active = false
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
