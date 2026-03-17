"use client";

// @refresh reset
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { RevealBurnerPKModal } from "./RevealBurnerPKModal";
import { SetBurnerPKModal } from "./SetBurnerPKModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Balance } from "@scaffold-ui/components";
import { Address } from "viem";
import { useNetworkColor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerAddressLink, getTargetNetworks } from "~~/utils/scaffold-eth";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = () => {
  const networkColor = useNetworkColor();
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account;
        const networks = getTargetNetworks();
        const connectedChain = (chain && networks.find(n => n.id === chain.id)) ?? targetNetwork;
        const blockExplorerAddressLink =
          account && connectedChain ? getBlockExplorerAddressLink(connectedChain, account.address) : undefined;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button className="btn btn-primary btn-sm" onClick={openConnectModal} type="button">
                    Connect Wallet
                  </button>
                );
              }

              const isWrongNetwork = !chain || chain.unsupported || chain.id !== targetNetwork.id;

              return (
                <>
                  {isWrongNetwork && <WrongNetworkDropdown />}
                  <div className="flex flex-col items-center mr-2">
                    <Balance
                      address={account.address as Address}
                      chain={connectedChain}
                      style={{
                        minHeight: "0",
                        height: "auto",
                        fontSize: "0.8em",
                      }}
                    />
                    <span className="text-xs" style={{ color: networkColor }}>
                      {connectedChain.name}
                    </span>
                  </div>
                  <AddressInfoDropdown
                    address={account.address as Address}
                    displayName={account.displayName}
                    ensAvatar={account.ensAvatar}
                    blockExplorerAddressLink={blockExplorerAddressLink}
                    targetNetwork={connectedChain}
                  />
                  <RevealBurnerPKModal />
                  <SetBurnerPKModal />
                </>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
