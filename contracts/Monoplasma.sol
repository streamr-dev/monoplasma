pragma solidity ^0.5.16;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "./BalanceVerifier.sol";
import "./Ownable.sol";

/**
 * Monoplasma that is managed by an owner, who also appoints a trusted (but verifiable) operator.
 * Owner should be able to add and remove recipients through an off-chain mechanism not specified here.
 */
contract Monoplasma is BalanceVerifier, Ownable {
    using SafeMath for uint256;

    event OperatorChanged(address indexed newOperator);
    event AdminFeeChanged(uint adminFee);

    /**
     * Freeze period during which all participants should be able to
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
     *   not the block where NewCommit was emitted (event must come later)
     */
    mapping (uint => uint) public blockTimestamp;

    /// operator is the address who is allowed to commit the earnings
    address public operator;

    /// fee fraction = adminFee/10^18
    uint public adminFee;

    IERC20 public token;

    /// track lifetime total of tokens withdrawn from contract
    uint public totalWithdrawn;

    /**
     * Track lifetime total of earnings proven, as extra protection from malicious operator.
     * The difference of what CAN be withdrawn and what HAS been withdrawn must be covered with tokens in contract,
     *   in other words: totalProven - totalWithdrawn <= token.balanceOf(this)
     * This is to prevent a "bank run" situation where more earnings have been proven in the contract than there are tokens to cover them.
     * Of course this only moves the "bank run" outside the contract, to a race to prove earnings.
     *   But at least the contract should never go into a state where it couldn't cover what's been proven.
     */
    uint public totalProven;

    /// earnings for which proof has been submitted
    mapping (address => uint) public earnings;

    /// earnings that have been sent out already
    mapping (address => uint) public withdrawn;

    constructor(address tokenAddress, uint blockFreezePeriodSeconds, uint initialAdminFee) public {
        blockFreezeSeconds = blockFreezePeriodSeconds;
        token = IERC20(tokenAddress);
        operator = msg.sender;
        setAdminFee(initialAdminFee);
    }

    /**
     * Admin can appoint the operator
     * @param newOperator that is allowed to commit the off-chain balances
     */
    function setOperator(address newOperator) public onlyOwner {
        operator = newOperator;
        emit OperatorChanged(newOperator);
    }

    /**
     * Admin fee as a fraction of revenue
     * Smart contract doesn't use it, it's here just for storing purposes
     * @param newAdminFee fixed-point decimal in the same way as ether: 50% === 0.5 ether === "500000000000000000"
     */
    function setAdminFee(uint newAdminFee) public onlyOwner {
        require(newAdminFee <= 1 ether, "error_adminFee");
        adminFee = newAdminFee;
        emit AdminFeeChanged(adminFee);
    }

    /**
     * Operator commits the off-chain balances
     * This starts the freeze period (measured from block.timestamp)
     * See README under "Threat model" for discussion on safety of using "now"
     * @param blockNumber after which balances were submitted
     */
    function onCommit(uint blockNumber, bytes32, string memory) internal {
        require(msg.sender == operator, "error_notPermitted");
        blockTimestamp[blockNumber] = now; // solium-disable-line security/no-block-members
    }

    /**
     * Called from BalanceVerifier.prove
     * Prove can be called directly to withdraw less than the whole share,
     *   or just "cement" the earnings so far into root chain even without withdrawing
     * Missing balance test is an extra layer of defense against fraudulent operator who tries to steal ALL tokens.
     *   If any member can exit within freeze period, that fraudulent commit will fail.
     * Only earnings that have been committed longer than blockFreezeSeconds ago can be proven, see {onCommit}
     * See README under "Threat model" for discussion on safety of using "now"
     * @param blockNumber after which balances were submitted in {onCommit}
     * @param account whose earnings were successfully proven and updated
     * @param newEarnings the updated total lifetime earnings
     */
    function onVerifySuccess(uint blockNumber, address account, uint newEarnings) internal {
        uint blockFreezeStart = blockTimestamp[blockNumber];
        require(now > blockFreezeStart + blockFreezeSeconds, "error_frozen"); // solium-disable-line security/no-block-members
        require(earnings[account] < newEarnings, "error_oldEarnings");
        totalProven = totalProven.add(newEarnings).sub(earnings[account]);
        require(totalProven.sub(totalWithdrawn) <= token.balanceOf(address(this)), "error_missingBalance");
        earnings[account] = newEarnings;
    }

    /**
     * Prove and withdraw the whole revenue share from sidechain in one transaction
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the off-chain balance book
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAll(uint blockNumber, uint totalEarnings, bytes32[] calldata proof) external {
        withdrawAllFor(msg.sender, blockNumber, totalEarnings, proof);
    }

    /**
     * Prove and withdraw the whole revenue share for someone else
     * Validator needs to exit those it's watching out for, in case
     *   it detects Operator malfunctioning
     * @param recipient the address we're proving and withdrawing to
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the off-chain balance book
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
     * @param totalEarnings in the off-chain balance book
     * @param proof list of hashes to prove the totalEarnings
     */
    function withdrawAllTo(address recipient, uint blockNumber, uint totalEarnings, bytes32[] calldata proof) external {
        prove(blockNumber, msg.sender, totalEarnings, proof);
        uint withdrawable = totalEarnings.sub(withdrawn[msg.sender]);
        withdrawTo(recipient, withdrawable);
    }

    /**
     * Do an "unlimited donate withdraw" on behalf of someone else, to an address they've specified
     * Sponsored withdraw is paid by admin, but target account could be whatever the member specifies
     * @param recipient the address the tokens will be sent to (instead of msg.sender)
     * @param blockNumber of the leaf to verify
     * @param totalEarnings in the off-chain balance book
     * @param proof list of hashes to prove the totalEarnings
     * @param tokensWithdrawnBefore replay protection for the signature. After this withdraw completes, withdrawn tokens will not match this signature anymore
     * @param signature from the community member, see {signatureIsValid} how it's generated
     */
    function withdrawAllToSigned(
        address recipient,
        uint blockNumber, uint totalEarnings, bytes32[] calldata proof,     // proof arguments
        address signer, bytes calldata signature                            // signature arguments
    )
        external
    {
        require(signatureIsValid(recipient, signer, 0, signature), "error_badSignature");
        prove(blockNumber, signer, totalEarnings, proof);
        uint withdrawable = totalEarnings.sub(withdrawn[signer]);
        _withdraw(recipient, signer, withdrawable);
    }

    /**
     * Withdraw a specified amount of your own proven earnings (see `function prove`)
     * @param amount of tokens to withdraw
     */
    function withdraw(uint amount) public {
        _withdraw(msg.sender, msg.sender, amount);
    }

    /**
     * Do the withdrawal on behalf of someone else
     * Validator needs to exit those it's watching out for, in case it detects Operator malfunctioning
     * @param recipient whose tokens will be withdrawn (instead of msg.sender)
     * @param amount of tokens to withdraw
     */
    function withdrawFor(address recipient, uint amount) public {
        _withdraw(recipient, recipient, amount);
    }

    /**
     * "Donate withdraw" function that allows you to transfer
     *   proven earnings to a another address in one transaction
     * @param recipient the address the tokens will be sent to (instead of msg.sender)
     * @param amount of tokens to withdraw
     */
    function withdrawTo(address recipient, uint amount) public {
        _withdraw(recipient, msg.sender, amount);
    }

    /**
     * Do a "donate withdraw" on behalf of someone else, to an address they've specified
     * Sponsored withdraw is paid by e.g. admin, but target account could be whatever the member specifies
     * @param recipient of the tokens
     * @param signer whose earnings are being withdrawn
     * @param amount how much is authorized for withdrawing by the signature
     * @param signature from the community member, see {signatureIsValid} how it's generated
     */
    function withdrawToSigned(address recipient, address signer, uint amount, bytes memory signature) public {
        require(signatureIsValid(recipient, signer, amount, signature), "error_badSignature");
        _withdraw(recipient, signer, amount);
    }

    /**
     * Execute token withdrawal into specified recipient address from specified member account
     * The prevent "bank runs", it is up to the sidechain implementation to make sure that always:
     *   sum of committed earnings <= token.balanceOf(this) + totalWithdrawn
     * Smart contract can't verify that, because it can't see inside the commit hash.
     * @param recipient of the tokens
     * @param account whose earnings are being debited
     * @param amount of tokens that is sent out
     */
    function _withdraw(address recipient, address account, uint amount) internal {
        require(amount > 0, "error_zeroWithdraw");
        uint w = withdrawn[account].add(amount);
        require(w <= earnings[account], "error_overdraft");
        withdrawn[account] = w;
        totalWithdrawn = totalWithdrawn.add(amount);
        require(token.transfer(recipient, amount), "error_transfer");
    }

    /**
     * Check signature from a member authorizing withdrawing its earnings to another account
     * Throws if the signature is badly formatted or doesn't match the given signer and amount.
     * Signature has parts the act as replay protection:
     *   address(this): signature can't be used for other contracts
     *   withdrawn[signer]: signature only works once (for unspecified amount), and can be "cancelled" by sending a withdraw tx
     * Generated with web3.eth.accounts.sign(recipientAddress + amount.toString(16, 64) + contractAddress.slice(2) + withdrawnTokens.toString(16, 64), signerPrivateKey)
     * @param recipient of the tokens
     * @param signer whose earnings are being withdrawn
     * @param amount how much is authorized for withdraw, or zero for unlimited (withdrawAll)
     * @param signature byte array from web3.eth.accounts.sign
     * @return signer of the authorization, that is, the member whose earnings are going to be withdrawn
     */
    function signatureIsValid(address recipient, address signer, uint amount, bytes memory signature) public view returns (bool isValid) {
        require(signature.length == 65, "error_badSignatureLength");

        bytes32 r; bytes32 s; uint8 v;
        assembly {      // solium-disable-line security/no-inline-assembly
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "error_badSignatureVersion");

        // When changing the message, remember to double-check that message length is correct!
        bytes32 messageHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n102", recipient, amount, address(this), withdrawn[signer]));
        address calculatedSigner = ecrecover(messageHash, v, r, s);

        return calculatedSigner == signer;
    }
}
