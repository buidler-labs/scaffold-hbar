import { useRef, useState } from "react";
import { useEffect } from "react";
import { NetworkOptions } from "./NetworkOptions";
import { getAddress } from "viem";
import type { Chain } from "viem";
import { Address } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { useCopyToClipboard, useOutsideClick } from "~~/hooks/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";
import { isENS } from "~~/utils/scaffold-eth/common";

const allowedNetworks = getTargetNetworks();

const HEDERA_CHAIN_IDS = new Set([296, 295, 31337]);

type AddressInfoDropdownProps = {
  address: Address;
  blockExplorerAddressLink: string | undefined;
  displayName: string;
  ensAvatar?: string;
  targetNetwork: Chain;
};

const BURNER_WALLET_CONNECTOR_ID = "burnerWallet";

function useResolvedHederaAccountId(address: Address, chainId: number, enabled: boolean) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAccountId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const network = chainId === 295 ? "mainnet" : "testnet";

    const run = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/hedera/account?evm=${encodeURIComponent(address)}&network=${network}`);
        const data = (await res.json()) as { accountId?: string | null };
        if (!cancelled) setAccountId(data?.accountId ?? null);
      } catch {
        if (!cancelled) setAccountId(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [address, chainId, enabled]);

  return { accountId, isLoading };
}

export const AddressInfoDropdown = ({
  address,
  ensAvatar,
  displayName,
  blockExplorerAddressLink,
  targetNetwork,
}: AddressInfoDropdownProps) => {
  const { disconnect } = useDisconnect();
  const { connector } = useAccount();
  const isBurnerWallet = connector?.id === BURNER_WALLET_CONNECTOR_ID;
  const checkSumAddress = getAddress(address);
  const isHederaNetwork = HEDERA_CHAIN_IDS.has(targetNetwork.id);

  const { accountId, isLoading: isAccountIdLoading } = useResolvedHederaAccountId(
    address,
    targetNetwork.id,
    isHederaNetwork,
  );

  const { copyToClipboard: copyAddressToClipboard, isCopiedToClipboard: isAddressCopiedToClipboard } =
    useCopyToClipboard();
  const { copyToClipboard: copyAccountIdToClipboard, isCopiedToClipboard: isAccountIdCopiedToClipboard } =
    useCopyToClipboard();
  const [selectingNetwork, setSelectingNetwork] = useState(false);
  const dropdownRef = useRef<HTMLDetailsElement>(null);

  const closeDropdown = () => {
    setSelectingNetwork(false);
    dropdownRef.current?.removeAttribute("open");
  };

  useOutsideClick(dropdownRef, closeDropdown);

  const summaryLabel = isENS(displayName)
    ? displayName
    : isHederaNetwork && accountId
      ? accountId
      : checkSumAddress?.slice(0, 6) + "..." + checkSumAddress?.slice(-4);

  return (
    <>
      <details ref={dropdownRef} className="dropdown dropdown-end leading-3">
        <summary className="btn btn-secondary btn-sm pl-0 pr-2 shadow-md dropdown-toggle gap-0 h-auto!">
          <BlockieAvatar address={checkSumAddress} size={30} ensImage={ensAvatar} />
          <span className="ml-2 mr-1">{isAccountIdLoading && isHederaNetwork ? "…" : summaryLabel}</span>
          <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
        </summary>
        <ul className="dropdown-content menu z-2 p-2 mt-2 shadow-center shadow-accent bg-base-200 rounded-box gap-1">
          <NetworkOptions hidden={!selectingNetwork} />
          {isHederaNetwork && accountId && (
            <li className={selectingNetwork ? "hidden" : ""}>
              <div
                className="h-8 btn-sm rounded-xl! flex gap-3 py-3 cursor-pointer"
                onClick={() => copyAccountIdToClipboard(accountId)}
              >
                {isAccountIdCopiedToClipboard ? (
                  <>
                    <CheckCircleIcon className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">Copied!</span>
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">Copy account ID</span>
                  </>
                )}
              </div>
            </li>
          )}
          <li className={selectingNetwork ? "hidden" : ""}>
            <div
              className="h-8 btn-sm rounded-xl! flex gap-3 py-3 cursor-pointer"
              onClick={() => copyAddressToClipboard(checkSumAddress)}
            >
              {isAddressCopiedToClipboard ? (
                <>
                  <CheckCircleIcon className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">Copied!</span>
                </>
              ) : (
                <>
                  <DocumentDuplicateIcon className="text-xl font-normal h-6 w-4 ml-2 sm:ml-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">Copy address</span>
                </>
              )}
            </div>
          </li>
          <li className={selectingNetwork ? "hidden" : ""}>
            <button className="h-8 btn-sm rounded-xl! flex gap-3 py-3" type="button">
              <ArrowTopRightOnSquareIcon className="h-6 w-4 ml-2 sm:ml-0" />
              <a
                target="_blank"
                href={blockExplorerAddressLink}
                rel="noopener noreferrer"
                className="whitespace-nowrap"
              >
                View on Block Explorer
              </a>
            </button>
          </li>
          {allowedNetworks.length > 1 ? (
            <li className={selectingNetwork ? "hidden" : ""}>
              <button
                className="h-8 btn-sm rounded-xl! flex gap-3 py-3"
                type="button"
                onClick={() => {
                  setSelectingNetwork(true);
                }}
              >
                <ArrowsRightLeftIcon className="h-6 w-4 ml-2 sm:ml-0" /> <span>Switch Network</span>
              </button>
            </li>
          ) : null}
          {isBurnerWallet && (
            <>
              <li className={selectingNetwork ? "hidden" : ""}>
                <label htmlFor="reveal-burner-pk-modal" className="h-8 btn-sm rounded-xl! flex gap-3 py-3">
                  <KeyIcon className="h-6 w-4 ml-2 sm:ml-0" />
                  <span className="whitespace-nowrap">Reveal Private Key</span>
                </label>
              </li>
              <li className={selectingNetwork ? "hidden" : ""}>
                <label htmlFor="set-burner-pk-modal" className="h-8 btn-sm rounded-xl! flex gap-3 py-3">
                  <KeyIcon className="h-6 w-4 ml-2 sm:ml-0" />
                  <span className="whitespace-nowrap">Set Private Key</span>
                </label>
              </li>
            </>
          )}
          <li className={selectingNetwork ? "hidden" : ""}>
            <button
              className="menu-item text-error h-8 btn-sm rounded-xl! flex gap-3 py-3"
              type="button"
              onClick={() => disconnect()}
            >
              <ArrowLeftStartOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" /> <span>Disconnect</span>
            </button>
          </li>
        </ul>
      </details>
    </>
  );
};
