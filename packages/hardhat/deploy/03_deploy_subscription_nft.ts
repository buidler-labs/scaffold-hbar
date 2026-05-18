import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const deploySubscriptionNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("SubscriptionNFT", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
};

deploySubscriptionNFT.tags = ["SubscriptionNFT"];
export default deploySubscriptionNFT;
