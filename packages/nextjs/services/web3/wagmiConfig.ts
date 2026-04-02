import { createConfig, http } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const chains = scaffoldConfig.targetNetworks;
const rpcOverrides = scaffoldConfig.rpcOverrides as Partial<Record<number, string>> | undefined;

export const wagmiConfig = createConfig({
  chains,
  transports: Object.fromEntries(chains.map(chain => [chain.id, http(rpcOverrides?.[chain.id])])) as Record<
    number,
    ReturnType<typeof http>
  >,
});
