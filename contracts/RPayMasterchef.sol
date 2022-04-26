pragma solidity ^0.8.0;

import "./RPay.sol";
import "./Context.sol";

contract RPayMasterchef is Context {
  address[] contracts;
  event RPayCreated(address indexed contractAddress, address indexed ownerAddress);
  function newRPay(string calldata name) public returns(bool) {
    RPay rp = new RPay(_msgSender(), name);
    address rpAddress = address(rp);
    contracts.push(rpAddress);
    emit RPayCreated(rpAddress, _msgSender());
    return true;
  }
  function getContracts() public view returns(address[] memory) {
    return contracts;
  }
}