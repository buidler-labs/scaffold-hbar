import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const deployHtsTokenCreator: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("HtsTokenCreator", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

deployHtsTokenCreator.tags = ["HtsTokenCreator"];
deployHtsTokenCreator.dependencies = ["HederaToken"];
export default deployHtsTokenCreator;
