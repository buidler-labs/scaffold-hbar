import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const INITIAL_MARKETPLACE_FEE_BPS = 500;

const deploySalesMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const subscriptionNFT = await get("SubscriptionNFT");
  const subscriptionMarketplace = await get("SubscriptionMarketplace");

  await deploy("SubscriptionSalesMarketplace", {
    from: deployer,
    args: [deployer, subscriptionNFT.address, subscriptionMarketplace.address, INITIAL_MARKETPLACE_FEE_BPS],
    log: true,
    autoMine: true,
    gasLimit: "3000000",
    gasPrice: "1160000000000",
  });
};

deploySalesMarketplace.tags = ["SubscriptionSalesMarketplace"];
deploySalesMarketplace.dependencies = ["SubscriptionNFT", "SubscriptionMarketplace"];
export default deploySalesMarketplace;
