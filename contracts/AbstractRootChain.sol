pragma solidity ^0.4.24;

/**
 * Monoplasma root chain contract
 * TODO: plasma nomenclature to all interfaces!
 */
contract AbstractRootChain {
    event BlockCreated(uint rootChainBlockNumber, uint timestamp, bytes32 rootHash, string ipfsHash);

    /**
     * Freeze period during which all side-chain participants should be able to
     *   acquire the whole balance book from IPFS (or HTTP server, or elsewhere)
     *   and validate that the published rootHash is correct
     * In case of incorrect rootHash, all members should issue withdrawals from the
     *   latest block they have validated (that is older than blockFreezeSeconds)
     * So: too short freeze period + bad availability => ether (needlessly) spent withdrawing earnings
     *     long freeze period == lag between purchase and withdrawal => bad UX
     * Blocks older than blockFreezeSeconds can be used to withdraw funds
     */
    uint public blockFreezeSeconds;

    /**
     * Sidechain "blocks" are simply root hashes merkle-trees constructed from its state
     * @param uint root-chain block number "after" which the balances were recorded
     * @return bytes32 root of the balances merkle-tree at that time
     */
    mapping (uint => bytes32) public blockHash;

    /**
     * Publish time of a block, where the block freeze period starts from.
     */
    mapping (uint => uint) public blockTimestamp;

    /**
     * Handler for proof of sidechain balances
     * It is up to the implementing contract to actually distribute out the balances
     * @param account whose balances were successfully verified
     * @param balance the side-chain account balance
     */
    function onVerifySuccess(address account, uint balance) internal;

    constructor(uint blockFreezePeriodSeconds) public {
        blockFreezeSeconds = blockFreezePeriodSeconds;
    }

    /**
     * Implementing contract should should do access checks for recordBlock
     */
    function canRecordBlock(uint rootChainBlockNumber, bytes32 rootHash, string ipfsHash) internal returns (bool);

    /**
     * For convenience, also publish the ipfsHash of the balance book JSON object
     * @param rootChainBlockNumber the block "after" which the balances were recorded
     * @param rootHash root of the balances merkle-tree
     * @param ipfsHash where the whole balances object can be retrieved in JSON format
     */
    function recordBlock(uint rootChainBlockNumber, bytes32 rootHash, string ipfsHash) external {
        string memory _hash = ipfsHash;
        require(canRecordBlock(rootChainBlockNumber, rootHash, _hash), "error_notPermitted");
        blockTimestamp[rootChainBlockNumber] = now;
        blockHash[rootChainBlockNumber] = rootHash;
        emit BlockCreated(rootChainBlockNumber, now, rootHash, _hash);
    }

    /**
     * proveSidechainBalance can be used to record the sidechain balances into root chain
     * @param rootChainBlockNumber the block "after" which the balances were recorded
     * @param account whose balances will be verified
     * @param balance side-chain account balance
     * @param proof list of hashes to prove the totalEarnings
     */
    function proveSidechainBalance(uint rootChainBlockNumber, address account, uint balance, bytes32[] memory proof) public {
        uint blockFreezeStart = blockTimestamp[rootChainBlockNumber];
        require(now > blockFreezeStart + blockFreezeSeconds, "error_frozen");
        require(proofIsCorrect(rootChainBlockNumber, account, balance, proof), "error_proof");
        onVerifySuccess(account, balance);
    }

    /**
     * Check the merkle proof of balance in the given side-chain block for given account
     */
    function proofIsCorrect(uint rootChainBlockNumber, address account, uint balance, bytes32[] memory proof) public view returns(bool) {
        bytes32 hash = keccak256(abi.encodePacked(account, balance));
        bytes32 rootHash = blockHash[rootChainBlockNumber];
        require(rootHash != 0x0, "error_blockNotFound");
        return rootHash == calculateRootHash(hash, proof);
    }

    /**
     * Calculate root hash of a Merkle tree, given
     * @param hash of the leaf to verify
     * @param others list of hashes of "other" branches
     */
    function calculateRootHash(bytes32 hash, bytes32[] memory others) public pure returns (bytes32 root) {
        root = hash;
        for (uint8 i = 0; i < others.length; i++) {
            bytes32 other = others[i];
            if (other == 0x0) continue;     // odd branch, no need to hash
            if (root < other) {
                root = keccak256(abi.encodePacked(root, other));
            } else {
                root = keccak256(abi.encodePacked(other, root));
            }
        }
    }
}