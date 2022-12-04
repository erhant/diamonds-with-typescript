// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FoobarFacet {
  event WasCalled(address sender, uint256 number);

  function callMe(uint256 number) external {
    emit WasCalled(msg.sender, number);
  }

  function removeMe() external pure {
    revert("error: you should have removed me :)");
  }

  function supportsInterface(bytes4 _interfaceID) external view returns (bool) {}
}
