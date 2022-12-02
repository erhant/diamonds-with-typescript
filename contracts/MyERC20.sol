// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// A simple ERC20 token, mints all the supply to the contract creator.
contract MyERC20 is ERC20 {
  constructor(
    string memory name_,
    string memory symbol_,
    uint256 supply_
  ) ERC20(name_, symbol_) {
    _mint(msg.sender, supply_);
  }
}
