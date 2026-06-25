import type { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Fetches the current gas price from the connected network provider.
 * On Hedera, eth_gasPrice returns the configured minimum gas price for the network.
 */
export async function getDeployGasPrice(hre: HardhatRuntimeEnvironment): Promise<string> {
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;

  if (gasPrice == null) {
    throw new Error("Unable to fetch gas price from the connected network provider.");
  }

  return gasPrice.toString();
}
