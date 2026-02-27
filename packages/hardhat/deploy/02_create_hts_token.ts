import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const createHtsToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // Only auto-create an example HTS token on local networks (hardhat/localhost).
  // On real networks like hederaTestnet / hederaMainnet we just deploy the contracts.
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log(`Skipping HTS token creation on network ${hre.network.name}`);
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deployments } = hre;
  const { get } = deployments;

  const creator = await get("HtsTokenCreator");
  if (!creator?.address) return;

  const signer = await hre.ethers.getSigner(deployer);
  const contract = await hre.ethers.getContractAt("HtsTokenCreator", creator.address, signer);

  // HTS uses int64 for supply (max 2^63-1). Use 6 decimals so 10000 tokens fits.
  const name = "HTS Token";
  const symbol = "HTST";
  const initialSupply = hre.ethers.parseUnits("10000", 6);
  const decimals = 6;
  const hbarValue = 100_000_000n; // 1 HBAR (10^8 tinybars) for creation fee

  const tokenAddress = await contract.createToken(name, symbol, initialSupply, decimals, {
    value: hbarValue,
  });
  console.log(`Created HTS token: ${tokenAddress}`);
  // On Hedera testnet/mainnet, users must associate their account with the token before receiving transfers.
};

createHtsToken.tags = ["HtsToken"];
createHtsToken.dependencies = ["HtsTokenCreator"];
export default createHtsToken;
