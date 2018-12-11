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

// File: contracts/AbstractRootChain.sol

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

// File: contracts/Ownable.sol

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

// File: contracts/Monoplasma.sol

/**
 * Monoplasma that is managed by an owner, likely the side-chain operator
 * Owner can add and remove recipients.
 */
contract Monoplasma is AbstractRootChain, Ownable {
    using SafeMath for uint256;

    event RecipientAdded(address recipient);
    event RecipientRemoved(address recipient);

    uint public recipientCount;
    mapping (address => uint) public earnings;
    mapping (address => uint) public withdrawn;
    mapping (address => bool) public isActive;

    IERC20 public token;

    constructor(address tokenAddress, uint blockFreezePeriodSeconds)
        AbstractRootChain(blockFreezePeriodSeconds)
        Ownable() public {
        token = IERC20(tokenAddress);
    }

    function addRecipient(address addr) public onlyOwner {
        require(!isActive[addr], "error_alreadyExists");
        isActive[addr] = true;
        recipientCount += 1;
        emit RecipientAdded(addr);
    }

    function removeRecipient(address addr) public onlyOwner {
        require(isActive[addr], "error_notFound");
        isActive[addr] = false;
        recipientCount -= 1;
        emit RecipientRemoved(addr);
    }

    /**
     * Owner creates the side-chain blocks
     */
    function canRecordBlock(uint, bytes32, string) internal returns (bool) {
        return msg.sender == owner;
    }

    /**
     * Called from AbstractRootChain.proveSidechainBalance
     * ProveSidechainBalance can be called directly to withdraw less than the whole share,
     *   or just "cement" the earnings so far into root chain even without withdrawing
     *   (though it's probably a lot more expensive than withdrawing itself...)
     */
    function onVerifySuccess(address account, uint totalEarnings) internal {
        require(earnings[account] < totalEarnings, "error_oldEarnings");
        earnings[account] = totalEarnings;
    }

    /**
     * Withdraw the whole revenue share from sidechain in one transaction
     * @param blockTimestamp of the leaf to verify
     * @param totalEarnings in the side-chain
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAll(uint blockTimestamp, uint totalEarnings, bytes32[] proof) external {
        proveSidechainBalance(blockTimestamp, msg.sender, totalEarnings, proof);
        uint withdrawable = totalEarnings.sub(withdrawn[msg.sender]);
        withdraw(withdrawable);
    }

    /**
     * @dev It is up to the sidechain implementation to make sure
     * @dev  always token balance >= sum of earnings - sum of withdrawn
     */
    function withdraw(uint amount) public {
        require(amount > 0, "error_zeroWithdraw");
        uint w = withdrawn[msg.sender].add(amount);
        require(w <= earnings[msg.sender], "error_overdraft");
        withdrawn[msg.sender] = w;
        require(token.transfer(msg.sender, amount), "error_transfer");
    }
}
