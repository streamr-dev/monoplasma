pragma solidity ^0.4.24;

// File: openzeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that revert on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, reverts on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (a == 0) {
      return 0;
    }

    uint256 c = a * b;
    require(c / a == b);

    return c;
  }

  /**
  * @dev Integer division of two numbers truncating the quotient, reverts on division by zero.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b > 0); // Solidity only automatically asserts when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold

    return c;
  }

  /**
  * @dev Subtracts two numbers, reverts on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a);
    uint256 c = a - b;

    return c;
  }

  /**
  * @dev Adds two numbers, reverts on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a);

    return c;
  }

  /**
  * @dev Divides two numbers and returns the remainder (unsigned integer modulo),
  * reverts when dividing by zero.
  */
  function mod(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b != 0);
    return a % b;
  }
}

// File: openzeppelin-solidity/contracts/token/ERC20/IERC20.sol

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
interface IERC20 {
  function totalSupply() external view returns (uint256);

  function balanceOf(address who) external view returns (uint256);

  function allowance(address owner, address spender)
    external view returns (uint256);

  function transfer(address to, uint256 value) external returns (bool);

  function approve(address spender, uint256 value)
    external returns (bool);

  function transferFrom(address from, address to, uint256 value)
    external returns (bool);

  event Transfer(
    address indexed from,
    address indexed to,
    uint256 value
  );

  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}

// File: /Users/jtakalai/Documents/workspace/monoplasma/contracts/AbstractRootChain.sol

/**
 * Monoplasma root chain contract
 * It verifies Merkle-tree inclusion proofs that show that certain address has
 *   certain earnings balance, according to hash published ("signed") by a
 *   sidechain operator or similar authority
 * TODO: plasma nomenclature to all interfaces!
 * TODO: rename this to EarningsVerifier
 * TODO: see if it could be turned into a library, so many contracts could use it
 */
contract AbstractRootChain {
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
     * Implementing contract should should do access checks for recordBlock
     */
    function onRecordBlock(uint blockNumber, bytes32 rootHash, string ipfsHash) internal;

    /**
     * For convenience, also publish the ipfsHash of the balance book JSON object
     * @param blockNumber the block after which the balances were recorded
     * @param rootHash root of the balances merkle-tree
     * @param ipfsHash where the whole balances object can be retrieved in JSON format
     */
    function recordBlock(uint blockNumber, bytes32 rootHash, string ipfsHash) external {
        require(blockHash[blockNumber] == 0, "error_overwrite");
        string memory _hash = ipfsHash;
        onRecordBlock(blockNumber, rootHash, _hash);
        blockHash[blockNumber] = rootHash;
        emit BlockCreated(blockNumber, rootHash, _hash);
    }

    /**
     * proveSidechainBalance can be used to record the sidechain balances into root chain
     * @param blockNumber the block after which the balances were recorded
     * @param account whose balances will be verified
     * @param balance side-chain account balance
     * @param proof list of hashes to prove the totalEarnings
     */
    function proveSidechainBalance(uint blockNumber, address account, uint balance, bytes32[] memory proof) public {
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

// File: /Users/jtakalai/Documents/workspace/monoplasma/contracts/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    address public owner;
    address public pendingOwner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {
        owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "onlyOwner");
        _;
    }

    /**
     * @dev Allows the current owner to set the pendingOwner address.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        pendingOwner = newOwner;
    }

    /**
     * @dev Allows the pendingOwner address to finalize the transfer.
     */
    function claimOwnership() public {
        require(msg.sender == pendingOwner, "onlyPendingOwner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}

// File: contracts/Airdrop.sol

/**
 * Continuous airdrop where recipients can withdraw tokens allocated in side-chain.
 * Simplest root chain contract implementation
 */
contract Airdrop is AbstractRootChain, Ownable {
    using SafeMath for uint256;

    IERC20 public token;
    mapping (address => uint) public withdrawn;

    constructor(address tokenAddress) Ownable() public {
        token = IERC20(tokenAddress);
    }

    /**
     * Owner creates the side-chain blocks
     */
    function onRecordBlock(uint, bytes32, string) internal {
        require(msg.sender == owner, "error_notPermitted");
    }

    /**
     * Called from AbstractRootChain.proveSidechainBalance, perform payout directly
     */
    function onVerifySuccess(uint, address account, uint balance) internal {
        require(withdrawn[account] < balance, "err_oldEarnings");
        uint withdrawable = balance.sub(withdrawn[account]);
        withdrawn[account] = balance;
        require(token.transfer(account, withdrawable), "err_transfer");
    }
}
