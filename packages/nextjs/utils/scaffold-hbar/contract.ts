import { Abi, Address } from "viem";
import deployedContractsData from "~~/contracts/deployedContracts";

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
