pragma solidity ^0.5.16;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "./BalanceVerifier.sol";
import "./Ownable.sol";

/**
 * Monoplasma that is managed by an owner, likely the side-chain operator
 * Owner can add and remove recipients.
 */
contract Monoplasma is BalanceVerifier, Ownable {
    using SafeMath for uint256;

    event OperatorChanged(address indexed newOperator);
    event AdminFeeChanged(uint adminFee);
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

    address public operator;

    //fee fraction = adminFee/10^18
    uint public adminFee;

    IERC20 public token;

    mapping (address => uint) public earnings;      // earnings for which proof has been submitted
    mapping (address => uint) public withdrawn;     // earnings that have been sent out already
    uint public totalWithdrawn;
    uint public totalProven;

    constructor(address tokenAddress, uint blockFreezePeriodSeconds, uint _adminFee) public {
        blockFreezeSeconds = blockFreezePeriodSeconds;
        token = IERC20(tokenAddress);
        operator = msg.sender;
        setAdminFee(_adminFee);
    }

    function setOperator(address newOperator) public onlyOwner {
        operator = newOperator;
        emit OperatorChanged(newOperator);
    }

    /**
     * Admin fee as a fraction of revenue
     * Fixed-point decimal in the same way as ether: 50% === 0.5 ether
     * Smart contract doesn't use it, it's here just for storing purposes
     */
    function setAdminFee(uint newAdminFee) public onlyOwner {
        require(newAdminFee <= 1 ether, "error_adminFee");
        adminFee = newAdminFee;
        emit AdminFeeChanged(adminFee);
    }

    /**
     * Operator creates the side-chain blocks
     */
    function onCommit(uint blockNumber, bytes32, string memory) internal {
        require(msg.sender == operator, "error_notPermitted");
        blockTimestamp[blockNumber] = now;
    }

    /**
     * Called from BalanceVerifier.prove
     * Prove can be called directly to withdraw less than the whole share,
     *   or just "cement" the earnings so far into root chain even without withdrawing
     * Missing balance test is an extra layer of defense against fraudulent operator who tries to steal ALL tokens.
     *   If any member can exit within freeze period, that fraudulent commit will fail.
     */
    function onVerifySuccess(uint blockNumber, address account, uint newEarnings) internal {
        uint blockFreezeStart = blockTimestamp[blockNumber];
        require(now > blockFreezeStart + blockFreezeSeconds, "error_frozen");
        require(earnings[account] < newEarnings, "error_oldEarnings");
        totalProven = totalProven.add(newEarnings).sub(earnings[account]);
        require(totalProven.sub(totalWithdrawn) <= token.balanceOf(address(this)), "error_missingBalance");
        earnings[account] = newEarnings;
    }

    /**
     * Prove and withdraw the whole revenue share from sidechain in one transaction
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the side-chain
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAll(uint blockNumber, uint totalEarnings, bytes32[] calldata proof) external {
        withdrawAllFor(msg.sender, blockNumber, totalEarnings, proof);
    }

    /**
     * Prove and withdraw the whole revenue share for someone else
     * Validator needs to exit those it's watching out for, in case
     *   it detects Operator malfunctioning
     * @param recipient the address we're proving and withdrawing
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the side-chain
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAllFor(address recipient, uint blockNumber, uint totalEarnings, bytes32[] memory proof) public {
        prove(blockNumber, recipient, totalEarnings, proof);
        uint withdrawable = totalEarnings.sub(withdrawn[recipient]);
        withdrawFor(recipient, withdrawable);
    }

    /**
     * "Donate withdraw" function that allows you to prove and transfer
     *   your earnings to a another address in one transaction
     * @param recipient the address the tokens will be sent to (instead of msg.sender)
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the side-chain
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAllTo(address recipient, uint blockNumber, uint totalEarnings, bytes32[] calldata proof) external {
        prove(blockNumber, msg.sender, totalEarnings, proof);
        uint withdrawable = totalEarnings.sub(withdrawn[msg.sender]);
        withdrawTo(recipient, withdrawable);
    }

    /**
     * Withdraw a specified amount of your own proven earnings (see `function prove`)
     */
    function withdraw(uint amount) public {
        _withdraw(msg.sender, msg.sender, amount);
    }

    /**
     * Do the withdrawal on behalf of someone else
     * Validator needs to exit those it's watching out for, in case
     *   it detects Operator malfunctioning
     */
    function withdrawFor(address recipient, uint amount) public {
        _withdraw(recipient, recipient, amount);
    }

    /**
     * "Donate withdraw" function that allows you to transfer
     *   proven earnings to a another address in one transaction
     */
    function withdrawTo(address recipient, uint amount) public {
        _withdraw(recipient, msg.sender, amount);
    }

    /**
     * Execute token withdrawal into specified recipient address from specified member account
     * @dev It is up to the sidechain implementation to make sure
     * @dev  always token balance >= sum of earnings - sum of withdrawn
     */
    function _withdraw(address recipient, address account, uint amount) internal {
        require(amount > 0, "error_zeroWithdraw");
        uint w = withdrawn[account].add(amount);
        require(w <= earnings[account], "error_overdraft");
        withdrawn[account] = w;
        totalWithdrawn = totalWithdrawn.add(amount);
        require(token.transfer(recipient, amount), "error_transfer");
    }
}
