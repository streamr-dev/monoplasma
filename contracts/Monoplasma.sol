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
