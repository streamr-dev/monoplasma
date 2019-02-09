const MonoplasmaMember = require("./monoplasmaMember")
const MerkleTree = require("./merkletree")
const BN = require("bn.js")
const SortedMap = require("collections/sorted-map")

/** Timestamp is seconds, just like Ethereum block.timestamp */
function now() {
    return Math.round(new Date() / 1000)
}

/**
 * Monoplasma state object
 *
 * Contains the logic of revenue distribution as well as current balances of/and participants
 */
class Monoplasma {
    /**
     * @param {Array} initialMembers objects: [ { address, earnings }, { address, earnings }, ... ]
     */
    constructor(initialMembers, store, blockFreezeSeconds) {
        if (!Array.isArray(initialMembers)) {
            initialMembers = []
        }
        /** @property {fileStore} store persistence for published blocks */
        this.store = store
        /** @property {number} blockFreezeSeconds after which blocks become withdrawable */
        this.blockFreezeSeconds = blockFreezeSeconds
        /** @property {number} totalEarnings by all members together; should equal balanceOf(contract) + contract.totalWithdrawn */
        this.totalEarnings = initialMembers.reduce((sum, m) => sum.iadd(new BN(m.earnings)), new BN(0))

        /** @property {Array<Block>} latestBlocks that have been stored. Kept to figure out  */
        this.latestBlocks = []

        // SortedMap constructor wants [[key1, value1], [key2, value2], ...]
        /** @property {Map<MonoplasmaMember>} members */
        this.members = new SortedMap(initialMembers.map(m => [m.address, new MonoplasmaMember(undefined, m.address, m.earnings)]))
        /** @property {MerkleTree} tree The MerkleTree for calculating the hashes */
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

    getMemberCount() {
        const total = this.members.size
        const active = this.members.filter(m => m.isActive()).size
        return {
            total,
            active,
            inactive: total - active,
        }
    }

    getTotalRevenue() {
        return this.totalEarnings.toString(10)
    }

    getLatestBlock() {
        if (this.latestBlocks.length < 1) { return null }
        const block = this.latestBlocks[0]
        return block
    }

    getLatestWithdrawableBlock() {
        if (this.latestBlocks.length < 1) { return null }
        const nowTimestamp = now()
        const i = this.latestBlocks.findIndex(b => nowTimestamp - b.timestamp > this.blockFreezeSeconds, this)
        if (i === -1) { return null }         // all blocks still frozen
        this.latestBlocks.length = i + 1    // throw away older than latest withdrawable
        const block = this.latestBlocks[i]
        return block
    }

    async getBlock(blockNumber) {
        const cachedBlock = this.latestBlocks.find(b => b.blockNumber === blockNumber)
        if (cachedBlock) {
            return cachedBlock
        }
        if (!await this.store.blockExists(blockNumber)) { throw new Error(`Block #${blockNumber} not found in published blocks`) }
        const block = await this.store.loadBlock(blockNumber)
        return block
    }

    /**
     * Get member's current status (without valid withdrawal proof because it hasn't been recorded)
     * @param {string} address
     */
    getMember(address) {
        const m = this.members.get(address)
        if (!m) { return null }
        const obj = m.toObject()
        obj.active = m.isActive()
        obj.proof = this.getProof(address)
        return obj
    }

    /**
     * Get member's info with withdrawal proof at given block
     * @param {string} address
     * @param {number} blockNumber at which (published) block
     */
    async getMemberAt(address, blockNumber) {
        const block = await this.getBlock(blockNumber)
        const member = block.members.find(m => m.address === address)
        const members = new SortedMap(block.members.map(m => [m.address, MonoplasmaMember.fromObject(m)]))
        const tree = new MerkleTree(members)
        member.proof = tree.getPath(address)
        return member
    }

    /**
     * Get hypothetical proof of earnings from current status
     * @param {string} address with earnings to be verified
     * @returns {Array} of bytes32 hashes ["0x123...", "0xabc..."]
     */
    getProof(address) {
        const path = this.tree.getPath(address)
        return path
    }

    /**
     * Get proof of earnings for withdrawal ("payslip") from specific (published) block
     * @param {string} address with earnings to be verified
     * @param {number} blockNumber at which (published) block
     * @returns {Array} of bytes32 hashes ["0x123...", "0xabc..."]
     */
    async getProofAt(address, blockNumber) {
        const block = await this.getBlock(blockNumber)
        const members = new SortedMap(block.map(m => [m.address, MonoplasmaMember.fromObject(m)]))
        const tree = new MerkleTree(members)
        const path = tree.getPath(address)
        return path
    }

    getRootHash() {
        return this.tree.getRootHash()
    }

    async getRootHashAt(blockNumber) {
        if (!this.store.blockExists(blockNumber)) { throw new Error(`Block #${blockNumber} not found in published blocks`) }
        const block = await this.store.loadBlock(blockNumber)
        const members = new SortedMap(block.map(m => [m.address, MonoplasmaMember.fromObject(m)]))
        const tree = new MerkleTree(members)
        const rootHash = tree.getRootHash()
        return rootHash
    }

    // ///////////////////////////////////
    //      ADMIN API
    // ///////////////////////////////////

    /**
     * @param {number} amount of tokens that was added to the Community revenues
     */
    addRevenue(amount) {
        const activeMembers = this.members.filter(m => m.isActive())
        const activeCount = activeMembers.length
        if (activeCount === 0) {
            console.error("No active members in community!")
            return
        }

        const amountBN = new BN(amount)
        const share = amountBN.divn(activeCount)
        activeMembers.forEach(m => m.addRevenue(share))
        this.tree.update(this.members)
        this.totalEarnings.iadd(amountBN)
    }

    /**
     * Add an active recipient into Community, or re-activate existing one (previously removed)
     * @param {string} address of the new member
     * @param {string} name of the new member
     * @returns {boolean} if the added member was new (previously unseen)
     */
    addMember(address, name) {
        const m = this.members.get(address)
        if (m) {
            m.setActive(true)
        } else {
            this.members.set(address, new MonoplasmaMember(name, address))
        }
        // tree.update(members)     // no need for update since no revenue allocated
        return !m                   // if m wasn't found, it's new
    }

    /**
     * De-activate a member, it will not receive revenues until re-activated
     * @param {string} address
     * @returns {boolean} if the de-activated member was previously active (and existing)
     */
    removeMember(address) {
        const m = this.members.get(address)
        const wasActive = m && m.isActive()
        if (wasActive) {
            m.setActive(false)
        }
        // tree.update(members)     // no need for update since no revenue allocated
        return wasActive
    }

    /**
     * Monoplasma member to be added
     * @typedef {Object<string, string>} IncomingMember
     * @property {string} address Ethereum address of the Community member
     * @property {string} name Human-readable string representation
     */
    /**
     * Add active recipients into Community, or re-activate existing ones (previously removed)
     * @param {Array<IncomingMember|string>} members
     */
    addMembers(members) {
        let added = 0
        members.forEach(member => {
            if (typeof member === "string") {
                member = { address: member }
            }
            const wasNew = this.addMember(member.address, member.name)
            added += wasNew ? 1 : 0
        })
        return added
    }

    /**
     * De-activate members: they will not receive revenues until re-activated
     * @param {Array<string>} addresses
     */
    removeMembers(addresses) {
        let removed = 0
        addresses.forEach(address => {
            const wasActive = this.removeMember(address)
            removed += wasActive ? 1 : 0
        })
        return removed
    }

    /**
     * Stash the merkle tree state for later use
     * @param {number} blockNumber root-chain block number after which this block state is valid
     */
    async storeBlock(blockNumber) {
        const members = this.members.toArray().map(m => m.toObject())
        const timestamp = now()
        const totalEarnings = this.getTotalRevenue()
        const latestBlock = {
            blockNumber,
            members,
            timestamp,
            totalEarnings,
        }
        this.latestBlocks.unshift(latestBlock)  // = insert to beginning
        return this.store.saveBlock(latestBlock, blockNumber)
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
            getTotalRevenue: this.getTotalRevenue.bind(this),
        }
    }
}

module.exports = Monoplasma
