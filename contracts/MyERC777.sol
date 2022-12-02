// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/utils/introspection/ERC1820Implementer.sol";

/// A simple ERC777 token, mints all the supply to the contract creator and has no default operators
contract MyERC777 is ERC777 {
  constructor(
    string memory name_,
    string memory symbol_,
    uint256 supply_,
    address[] memory ops_
  ) ERC777(name_, symbol_, ops_) {
    _mint(msg.sender, supply_, "", "");
  }
}

/// A sample recipient contract that keeps track of last sender & how many times received
contract MyERC777Recipient is IERC777Recipient, ERC1820Implementer {
  IERC1820Registry internal constant _ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

  uint256 public numTimesReceived = 0;
  address public lastReceivedFrom;

  constructor() {
    // register to ERC1820 registry
    _ERC1820_REGISTRY.setInterfaceImplementer(
      address(this),
      _ERC1820_REGISTRY.interfaceHash("ERC777TokensRecipient"),
      address(this)
    );
  }

  function tokensReceived(
    address, /* operator */
    address from,
    address, /* to */
    uint256, /* amount */
    bytes calldata, /* userData */
    bytes calldata /* operatorData */
  ) external override {
    lastReceivedFrom = from;
    numTimesReceived++;
  }
}
