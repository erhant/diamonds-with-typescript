// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// Dummy contract for testing purposes.
contract FoobarFacet {
  /// @dev see `callMe`
  event WasCalled(address sender, uint256 number);

  /// @dev takes an arbitrary parameter, emits `WasCalled` event
  function callMe(uint256 number) external {
    emit WasCalled(msg.sender, number);
  }

  /// @dev reverts when called
  function removeMe() external pure {
    revert("FoobarFacet: you should have removed me :)");
  }

  /// @dev ERC-165 function, written as a bait. FacetCut should ignore this to avoid clashing with diamond.
  /// You can also replace the supportsInterface and check if by giving 0xDEADBEEF.
  function supportsInterface(bytes4 _interfaceID) external pure returns (bool) {
    return _interfaceID == bytes4(0xDEADBEEF);
  }
}
