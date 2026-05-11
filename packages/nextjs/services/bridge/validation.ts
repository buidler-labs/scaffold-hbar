import type { BridgeRequiredField } from "./types";
import { isAddress } from "viem";
import { z } from "zod";

export const bridgeField = {
  address: (label: string, value: string | undefined): BridgeRequiredField => ({
    label,
    value,
    kind: "address",
  }),
  bytes32: (label: string, value: string | undefined): BridgeRequiredField => ({
    label,
    value,
    kind: "bytes32",
  }),
  number: (label: string, value: string | number | undefined): BridgeRequiredField => ({
    label,
    value,
    kind: "number",
  }),
  string: (label: string, value: string | undefined): BridgeRequiredField => ({
    label,
    value,
    kind: "string",
  }),
};

const requiredStringSchema = (label: string) =>
  z
    .string({
      required_error: `${label} missing`,
      invalid_type_error: `${label} invalid`,
    })
    .min(1, `${label} missing`);

const integerSchema = (label: string) =>
  z
    .union([z.string(), z.number()], {
      invalid_type_error: `${label} invalid`,
    })
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined || value === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} missing` });
        return;
      }

      try {
        if (typeof value === "number" && (!Number.isInteger(value) || value < 0)) throw new Error();
        if (typeof value === "string" && (value.trim() === "" || BigInt(value) < 0n)) throw new Error();
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} invalid` });
      }
    });

const addressSchema = z.string().refine(isAddress);
const bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const unsignedIntegerStringSchema = z
  .union([z.string(), z.number()])
  .superRefine((value, ctx) => {
    try {
      if (typeof value === "number" && (!Number.isInteger(value) || value < 0)) throw new Error();
      if (typeof value === "string" && (value.trim() === "" || BigInt(value) < 0n)) throw new Error();
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid unsigned integer" });
    }
  })
  .transform(value => String(value));

export const axelarChainConfigSchema = z.object({
  axelarName: requiredStringSchema("Axelar chain name"),
  bridgeToken: addressSchema,
  gasLimit: unsignedIntegerStringSchema.optional(),
  gasValue: unsignedIntegerStringSchema.optional(),
  nativeFee: unsignedIntegerStringSchema.optional(),
});

export const axelarRouteConfigSchema = z.object({
  tokenId: bytes32Schema,
  interchainTokenService: addressSchema,
  gasValue: unsignedIntegerStringSchema,
  nativeFee: unsignedIntegerStringSchema,
});

export type AxelarChainConfig = z.infer<typeof axelarChainConfigSchema>;
export type AxelarRouteConfig = z.infer<typeof axelarRouteConfigSchema>;

export const ccipChainConfigSchema = z.object({
  token: addressSchema,
  pool: addressSchema,
  htsToken: addressSchema.optional(),
  router: addressSchema,
  chainSelector: z.union([z.string(), z.number()]).transform(value => String(value)),
  remoteChainSelector: z.union([z.string(), z.number()]).transform(value => String(value)),
});

export type CcipChainConfig = z.infer<typeof ccipChainConfigSchema>;

export const layerZeroChainConfigSchema = z.object({
  oft: addressSchema,
  htsToken: addressSchema.optional(),
  endpointV2: addressSchema,
  receiveUln302: addressSchema,
  workersDvn: addressSchema,
  workersExecutor: addressSchema,
  eid: unsignedIntegerStringSchema.transform(value => Number(value)),
  gasLimit: unsignedIntegerStringSchema.optional(),
  relayReceiveGas: unsignedIntegerStringSchema.optional(),
  remoteEid: unsignedIntegerStringSchema.transform(value => Number(value)),
});

export const layerZeroRouteConfigSchema = z.object({
  relayCommand: requiredStringSchema("LayerZero relay command"),
  receiveGas: unsignedIntegerStringSchema.optional(),
  minAmountBps: unsignedIntegerStringSchema.optional(),
});

export type LayerZeroChainConfig = z.infer<typeof layerZeroChainConfigSchema>;
export type LayerZeroRouteConfig = z.infer<typeof layerZeroRouteConfigSchema>;

const fieldValueSchema = (field: BridgeRequiredField) => {
  if (field.kind === "address") return requiredStringSchema(field.label).refine(isAddress, `${field.label} invalid`);
  if (field.kind === "bytes32") {
    return requiredStringSchema(field.label).regex(/^0x[0-9a-fA-F]{64}$/, `${field.label} invalid`);
  }
  if (field.kind === "number") return integerSchema(field.label);
  return requiredStringSchema(field.label);
};

export const getFieldIssue = (field: BridgeRequiredField) => {
  const result = fieldValueSchema(field).safeParse(field.value);
  return result.success ? undefined : result.error.issues[0]?.message;
};
