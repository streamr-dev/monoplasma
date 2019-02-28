pragma solidity ^0.4.24;

/**
 * Abstract contract, requires implementation to specify who can commit blocks and what
 *   happens when a successful proof is presented
 * Verifies Merkle-tree inclusion proofs that show that certain address has
 *   certain earnings balance, according to hash published ("signed") by a
 *   sidechain operator or similar authority
 * TODO: see if it could be turned into a library, so many contracts could use it
 */
contract BalanceVerifier {
    event BlockCreated(uint blockNumber, bytes32 rootHash, string ipfsHash);

    /**
     * Sidechain "blocks" are simply root hashes of merkle-trees constructed from its balances
     * @param uint root-chain block number after which the balances were recorded
     * @return bytes32 root of the balances merkle-tree at that time
     */
    mapping (uint => bytes32) public blockHash;

    /**
     * Handler for proof of sidechain balances
     * It is up to the implementing contract to actually distribute out the balances
     * @param blockNumber the block whose hash was used for verification
     * @param account whose balances were successfully verified
     * @param balance the side-chain account balance
     */
    function onVerifySuccess(uint blockNumber, address account, uint balance) internal;

    /**
     * Implementing contract should should do access checks for committing
     */
    function onCommit(uint blockNumber, bytes32 rootHash, string ipfsHash) internal;

    /**
     * Side-chain operator submits commitments to main chain. These
     * For convenience, also publish the ipfsHash of the balance book JSON object
     * @param blockNumber the block after which the balances were recorded
     * @param rootHash root of the balances merkle-tree
     * @param ipfsHash where the whole balances object can be retrieved in JSON format
     */
    function commit(uint blockNumber, bytes32 rootHash, string ipfsHash) external {
        require(blockHash[blockNumber] == 0, "error_overwrite");
        string memory _hash = ipfsHash;
        onCommit(blockNumber, rootHash, _hash);
        blockHash[blockNumber] = rootHash;
        emit BlockCreated(blockNumber, rootHash, _hash);
    }

    /**
     * Proving can be used to record the sidechain balances permanently into root chain
     * @param blockNumber the block after which the balances were recorded
     * @param account whose balances will be verified
     * @param balance side-chain account balance
     * @param proof list of hashes to prove the totalEarnings
     */
    function prove(uint blockNumber, address account, uint balance, bytes32[] memory proof) public {
        require(proofIsCorrect(blockNumber, account, balance, proof), "error_proof");
        onVerifySuccess(blockNumber, account, balance);
    }

    /**
     * Check the merkle proof of balance in the given side-chain block for given account
     */
    function proofIsCorrect(uint blockNumber, address account, uint balance, bytes32[] memory proof) public view returns(bool) {
        bytes32 hash = keccak256(abi.encodePacked(account, balance));
        bytes32 rootHash = blockHash[blockNumber];
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