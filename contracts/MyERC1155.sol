// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// A simple ERC1155 token, gives the owner ability to mint tokens one at a time.
contract MyERC1155 is ERC1155, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIdCounter;

  constructor(string memory uri_) ERC1155(uri_) {}

  function safeMint(
    address to,
    uint256 supply,
    bytes memory data
  ) public onlyOwner {
    uint256 tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();
    _mint(to, tokenId, supply, data);
  }
}

contract MyERC1155Recipient is IERC1155Receiver {
  uint256 public numTimesReceived = 0;
  address public lastReceivedFrom;

  function onERC1155Received(
    address, /* operator */
    address from,
    uint256, /* id */
    uint256, /* value */
    bytes calldata /* data */
  ) external override returns (bytes4) {
    lastReceivedFrom = from;
    numTimesReceived++;
    return this.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(
    address, /* operator */
    address from,
    uint256[] calldata ids,
    uint256[] calldata, /* values */
    bytes calldata /* data */
  ) external override returns (bytes4) {
    lastReceivedFrom = from;
    numTimesReceived += ids.length;
    return this.onERC1155BatchReceived.selector;
  }

  function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
    return interfaceId == type(IERC1155Receiver).interfaceId;
  }
}
