pragma solidity ^0.5.16;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * ERC20 token for demo purposes
 * Creator starts with 1 million tokens
 */
contract DemoToken is ERC20Mintable, ERC20Detailed {
    constructor(string memory name, string memory symbol) ERC20Detailed(name, symbol, 18) public {
        mint(msg.sender, 10**24);
    }
}
