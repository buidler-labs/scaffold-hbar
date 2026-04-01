import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const deployHederaToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("HederaToken", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
};

deployHederaToken.tags = ["HederaToken"];
export default deployHederaToken;
