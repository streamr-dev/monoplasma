pragma solidity ^0.5.16;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "./BalanceVerifier.sol";
import "./Ownable.sol";

/**
 * "Continuous airdrop" where recipients can withdraw tokens allocated in side-chain.
 * Simplest root chain contract implementation.
 * For purposes of illustrating the use of BalanceVerifier, and for testing it.
 */
contract Airdrop is BalanceVerifier, Ownable {
    using SafeMath for uint256;

    IERC20 public token;
    mapping (address => uint) public withdrawn;

    constructor(address tokenAddress) Ownable() public {
        token = IERC20(tokenAddress);
    }

    /**
     * Owner creates the side-chain blocks
     */
    function onCommit(uint, bytes32, string memory) internal {
        require(msg.sender == owner, "error_notPermitted");
    }

    /**
     * Called from BalanceVerifier.prove, perform payout directly
     */
    function onVerifySuccess(uint, address account, uint balance) internal {
        require(withdrawn[account] < balance, "error_oldEarnings");
        uint withdrawable = balance.sub(withdrawn[account]);
        withdrawn[account] = balance;
        require(token.transfer(account, withdrawable), "error_transfer");
    }
}
