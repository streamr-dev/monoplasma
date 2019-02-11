pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "./AbstractRootChain.sol";
import "./Ownable.sol";

/**
 * Monoplasma that is managed by an owner, likely the side-chain operator
 * Owner can add and remove recipients.
 */
contract Monoplasma is AbstractRootChain, Ownable {
    using SafeMath for uint256;

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
     * Block number => timestamp
     * Publish time of a block, where the block freeze period starts from.
     * Note that block number points to the block after which the root hash is calculated,
     *   not the block where BlockCreated was emitted (event must come later)
     */
    mapping (uint => uint) public blockTimestamp;

    mapping (address => uint) public earnings;
    mapping (address => uint) public withdrawn;
    uint public totalWithdrawn;

    IERC20 public token;

    constructor(address tokenAddress, uint blockFreezePeriodSeconds) public {
        blockFreezeSeconds = blockFreezePeriodSeconds;
        token = IERC20(tokenAddress);
    }

    /**
     * Owner creates the side-chain blocks
     */
    function onRecordBlock(uint blockNumber, bytes32, string) internal {
        require(msg.sender == owner, "error_notPermitted");
        blockTimestamp[blockNumber] = now;
    }

    /**
     * Called from AbstractRootChain.proveSidechainBalance
     * ProveSidechainBalance can be called directly to withdraw less than the whole share,
     *   or just "cement" the earnings so far into root chain even without withdrawing
     *   (though it's probably a lot more expensive than withdrawing itself...)
     */
    function onVerifySuccess(uint blockNumber, address account, uint totalEarnings) internal {
        uint blockFreezeStart = blockTimestamp[blockNumber];
        require(now > blockFreezeStart + blockFreezeSeconds, "error_frozen");
        require(earnings[account] < totalEarnings, "error_oldEarnings");
        earnings[account] = totalEarnings;
    }

    /**
     * Withdraw the whole revenue share from sidechain in one transaction
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the side-chain
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAll(uint blockNumber, uint totalEarnings, bytes32[] proof) external {
        proveSidechainBalance(blockNumber, msg.sender, totalEarnings, proof);
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
        totalWithdrawn = totalWithdrawn.add(amount);
        require(token.transfer(msg.sender, amount), "error_transfer");
    }
}
