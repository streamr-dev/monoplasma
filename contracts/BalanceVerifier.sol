pragma solidity ^0.5.16;

/**
 * Abstract contract, requires implementation to specify who can commit blocks and what
 *   happens when a successful proof is presented
 * Verifies Merkle-tree inclusion proofs that show that certain address has
 *   certain earnings balance, according to hash published ("signed") by a
 *   sidechain operator or similar authority
 *
 * ABOUT Merkle-tree inclusion proof: Merkle-tree inclusion proof is an algorithm to prove memebership
 * in a set using minimal [ie log(N)] inputs. The hashes of the items are arranged by hash value in a binary Merkle tree where
 * each node contains a hash of the hashes of nodes below. The root node (ie "root hash") contains hash information
 * about the entire set, and that is the data that BalanceVerifier posts to the blockchain. To prove membership, you walk up the
 * tree from the node in question, and use the supplied hashes (the "proof") to fill in the hashes from the adjacent nodes. The proof
 * succeeds iff you end up with the known root hash when you get to the top of the tree.
 * See https://medium.com/crypto-0-nite/merkle-proofs-explained-6dd429623dc5
 *
 * Merkle-tree inclusion proof is a RELATED concept to the blockchain Merkle tree, but a somewhat DIFFERENT application.
 * BalanceVerifier posts the root hash of the CURRENT ledger only, and this does NOT depend on the hash of previous ledgers.
 * This is different from the blockchain, where each block contains the hash of the previous block.
 *
 * TODO: see if it could be turned into a library, so many contracts could use it
 */
contract BalanceVerifier {
    event NewCommit(uint blockNumber, bytes32 rootHash, string ipfsHash);

    /**
     * Root hashes of merkle-trees constructed from its balances
     * @param uint root-chain block number after which the balances were committed
     * @return bytes32 root of the balances merkle-tree at that time
     */
    mapping (uint => bytes32) public committedHash;

    /**
     * Handler for proof of off-chain balances
     * It is up to the implementing contract to actually distribute out the balances
     * @param blockNumber the block whose hash was used for verification
     * @param account whose balances were successfully verified
     * @param balance the off-chain account balance
     */
    function onVerifySuccess(uint blockNumber, address account, uint balance) internal;

    /**
     * Implementing contract should should do access controls for committing
     */
    function onCommit(uint blockNumber, bytes32 rootHash, string memory ipfsHash) internal;

    /**
     * Monoplasma operator submits commitments to root-chain.
     * For convenience, also publish the ipfsHash of the balance book JSON object
     * @param blockNumber the root-chain block after which the balances were recorded
     * @param rootHash root of the balances merkle-tree
     * @param ipfsHash where the whole balances object can be retrieved in JSON format
     */
    function commit(uint blockNumber, bytes32 rootHash, string calldata ipfsHash) external {
        require(committedHash[blockNumber] == 0, "error_overwrite");
        string memory _hash = ipfsHash;
        onCommit(blockNumber, rootHash, _hash); // Access control delegated to implementing class
        committedHash[blockNumber] = rootHash;
        emit NewCommit(blockNumber, rootHash, _hash);
    }

    /**
     * Proving can be used to record the sidechain balances permanently into root chain
     * @param blockNumber the block after which the balances were recorded
     * @param account whose balances will be verified
     * @param balance off-chain account balance
     * @param proof list of hashes to prove the totalEarnings
     */
    function prove(uint blockNumber, address account, uint balance, bytes32[] memory proof) public {
        require(proofIsCorrect(blockNumber, account, balance, proof), "error_proof");
        onVerifySuccess(blockNumber, account, balance);
    }

    /**
     * Check the merkle proof of balance in the given commit (after blockNumber in root-chain) for given account
     */
    function proofIsCorrect(uint blockNumber, address account, uint balance, bytes32[] memory proof) public view returns(bool) {
        // TODO: prevent rainbow-tabling leaf nodes by salting with block number
        // bytes32 hash = keccak256(abi.encodePacked(blockNumber, account, balance));
        bytes32 hash = keccak256(abi.encodePacked(account, balance));
        bytes32 rootHash = committedHash[blockNumber];
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
            if (root < other) {
                // TODO: consider hashing in blockNumber and i
                root = keccak256(abi.encodePacked(root, other));
            } else {
                root = keccak256(abi.encodePacked(other, root));
            }
        }
    }
}
