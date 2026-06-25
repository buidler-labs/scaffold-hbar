import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const INITIAL_MARKETPLACE_FEE_BPS = 500;

const deploySubscriptionMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const subscriptionNFT = await get("SubscriptionNFT");

  await deploy("SubscriptionMarketplace", {
    from: deployer,
    args: [deployer, subscriptionNFT.address, INITIAL_MARKETPLACE_FEE_BPS],
    log: true,
    autoMine: true,
    gasLimit: "3000000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deploySubscriptionMarketplace.tags = ["SubscriptionMarketplace"];
deploySubscriptionMarketplace.dependencies = ["SubscriptionNFT"];
export default deploySubscriptionMarketplace;
