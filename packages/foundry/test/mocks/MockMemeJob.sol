// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IMemeJob} from "../../contracts/interfaces/IMemejob.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "./MockERC20.sol";

contract MockMemeJob is IMemeJob {
  uint256 public tokenPricePerUnit;

  function setTokenPrice(uint256 pricePerUnit) external {
    tokenPricePerUnit = pricePerUnit;
  }

  function buyJob(address memeAddress, uint256 amount, address) external payable {
    uint256 cost = amount * tokenPricePerUnit;
    require(msg.value >= cost, "insufficient hbar");
    MockERC20(memeAddress).mint(msg.sender, amount);
    uint256 dust = msg.value - cost;
    if (dust > 0) {
      (bool sent,) = msg.sender.call{value: dust}("");
      require(sent, "dust refund failed");
    }
  }

  function sellJob(address memeAddress, uint256 amount) external {
    bool transferred = IERC20(memeAddress).transferFrom(msg.sender, address(this), amount);
    require(transferred, "transferFrom failed");
    uint256 hbarReturn = amount * tokenPricePerUnit;
    (bool sent,) = msg.sender.call{value: hbarReturn}("");
    require(sent, "hbar transfer failed");
  }

  function getAmountOut(address, uint256 amount, TransactionType txType) external view returns (uint256) {
    if (txType == TransactionType.BuyInTokens || txType == TransactionType.SellInTokens) {
      return amount * tokenPricePerUnit;
    }
    return 0;
  }

  receive() external payable {}
}
