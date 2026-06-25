import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const deploySubscriptionNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("SubscriptionNFT", {
    from: deployer,
    args: [deployer, ethers.ZeroAddress],
    log: true,
    autoMine: true,
    gasLimit: "3000000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deploySubscriptionNFT.tags = ["SubscriptionNFT"];
export default deploySubscriptionNFT;
