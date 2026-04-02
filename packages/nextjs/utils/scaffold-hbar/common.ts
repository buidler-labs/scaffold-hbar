import { isHederaAccountId } from "./identity";

// To be used in JSON.stringify when a field might be bigint

// https://wagmi.sh/react/faq#bigint-serialization
export const replacer = (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value);

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const isZeroAddress = (address: string) => address === ZERO_ADDRESS;

// Treat dot-separated strings as potential ENS names (e.g. name.eth), excluding Hedera account IDs (0.0.n).
const ensRegex = /.+\..+/;
export const isENS = (address = "") => !isHederaAccountId(address) && ensRegex.test(address);
