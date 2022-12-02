// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/// A simple counter contract, which counts up and down.
contract Counter {
  uint256 private count; // 0 by default

  event CountedTo(uint256 newCount);

  function getCount() external view returns (uint256) {
    return count;
  }

  function countUp() external returns (uint256) {
    // does not check for overflow, as compiler 0.8.0^ adds runtime checks for that and panics
    count++;
    emit CountedTo(count);
    return count;
  }

  function countDown() external returns (uint256) {
    // does not check for underflow, as compiler 0.8.0^ adds runtime checks for that and panics
    count--;
    emit CountedTo(count);
    return count;
  }
}
