import { getParsedError } from "./getParsedError";
import { AllowedChainIds } from "./networks";
import { Abi, Address } from "viem";
import { keccak256, toHex } from "viem";
import deployedContractsData from "~~/contracts/deployedContracts";

// Minimal contract types kept for deployedContracts / externalContracts compatibility
export type GenericContract = {
  address: Address;
  abi: Abi;
  inheritedFunctions?: Record<string, string>;
  external?: true;
  deployedOnBlock?: number;
};

export type GenericContractsDeclaration = {
  [chainId: number]: {
    [contractName: string]: GenericContract;
  };
};

export const contracts = deployedContractsData as GenericContractsDeclaration | null;

/**
 * Enhanced error parsing that creates a lookup table from all deployed contracts
 * to decode error signatures from any contract in the system.
 */
export const getParsedErrorWithAllAbis = (error: unknown, chainId: AllowedChainIds): string => {
  const originalParsedError = getParsedError(error);

  if (/Encoded error signature.*not found on ABI/i.test(originalParsedError)) {
    const signatureMatch = originalParsedError.match(/0x[a-fA-F0-9]{8}/);
    const signature = signatureMatch ? signatureMatch[0] : "";

    if (!signature) return originalParsedError;

    try {
      const chainContracts = deployedContractsData[chainId as keyof typeof deployedContractsData];
      if (!chainContracts) return originalParsedError;

      const errorLookup: Record<string, { name: string; contract: string; signature: string }> = {};

      Object.entries(chainContracts).forEach(([contractName, contract]: [string, any]) => {
        if (contract.abi) {
          contract.abi.forEach((item: any) => {
            if (item.type === "error") {
              const inputs = item.inputs || [];
              const inputTypes = inputs.map((input: any) => input.type).join(",");
              const errorSignature = `${item.name}(${inputTypes})`;
              const hash = keccak256(toHex(errorSignature));
              const errorSelector = hash.slice(0, 10);
              errorLookup[errorSelector] = { name: item.name, contract: contractName, signature: errorSignature };
            }
          });
        }
      });

      const errorInfo = errorLookup[signature];
      if (errorInfo) {
        return `Contract function execution reverted:\n${errorInfo.signature} from ${errorInfo.contract}`;
      }
    } catch {
      // fall through to original
    }
  }

  return originalParsedError;
};
