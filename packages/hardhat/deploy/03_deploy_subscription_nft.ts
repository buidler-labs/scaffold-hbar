import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

const deploySubscriptionNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("SubscriptionNFT", {
    from: deployer,
    args: [deployer, ethers.ZeroAddress],
    log: true,
    autoMine: true,
    gasLimit: "3000000",
    gasPrice: "1100000000000",
  });
};

deploySubscriptionNFT.tags = ["SubscriptionNFT"];
export default deploySubscriptionNFT;
