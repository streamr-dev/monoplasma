pragma solidity ^0.4.24;

// File: contracts/AbstractRootChain.sol

/**
 * Monoplasma root chain contract
 * TODO: plasma nomenclature to all interfaces!
 */
contract AbstractRootChain {
    event BlockCreated(uint rootChainBlockNumber, bytes32 rootHash, string ipfsHash);

    /**
     * Sidechain "blocks" are simply root hashes merkle-trees constructed from its state
     * @param uint root-chain block number "after" which the balances were recorded
     * @return bytes32 root of the balances merkle-tree at that time
     */
    mapping (uint => bytes32) public blockHash;

    /**
     * Handler for proof of sidechain balances
     * It is up to the implementing contract to actually distribute out the balances
     * @param rootChainBlockNumber the block whose hash was used for verification
     * @param account whose balances were successfully verified
     * @param balance the side-chain account balance
     */
    function onVerifySuccess(uint rootChainBlockNumber, address account, uint balance) internal;

    /**
     * Implementing contract should should do access checks for recordBlock
     */
    function onRecordBlock(uint rootChainBlockNumber, bytes32 rootHash, string ipfsHash) internal;

    /**
     * For convenience, also publish the ipfsHash of the balance book JSON object
     * @param rootChainBlockNumber the block "after" which the balances were recorded
     * @param rootHash root of the balances merkle-tree
     * @param ipfsHash where the whole balances object can be retrieved in JSON format
     */
    function recordBlock(uint rootChainBlockNumber, bytes32 rootHash, string ipfsHash) external {
        require(blockHash[rootChainBlockNumber] == 0, "error_overwrite");
        string memory _hash = ipfsHash;
        onRecordBlock(rootChainBlockNumber, rootHash, _hash);
        blockHash[rootChainBlockNumber] = rootHash;
        emit BlockCreated(rootChainBlockNumber, rootHash, _hash);
    }

    /**
     * proveSidechainBalance can be used to record the sidechain balances into root chain
     * @param rootChainBlockNumber the block "after" which the balances were recorded
     * @param account whose balances will be verified
     * @param balance side-chain account balance
     * @param proof list of hashes to prove the totalEarnings
     */
    function proveSidechainBalance(uint rootChainBlockNumber, address account, uint balance, bytes32[] memory proof) public {
        require(proofIsCorrect(rootChainBlockNumber, account, balance, proof), "error_proof");
        onVerifySuccess(rootChainBlockNumber, account, balance);
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
