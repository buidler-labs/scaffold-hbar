"use client";

import Image from "next/image";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  return (
    <>
      <div className="flex items-center flex-col grow">
        <div className="hedera-gradient dark:bg-none dark:bg-hedera-charcoal w-full py-16 px-5">
          <div className="flex flex-col items-center max-w-2xl mx-auto">
            <Image src="/Hedera-Icon-White.svg" alt="Hedera icon" width={80} height={80} className="mb-6 hidden dark:block" />
            <Image src="/Hedera-Icon-Dark.svg" alt="Hedera icon" width={80} height={80} className="mb-6 dark:hidden" />
            <div className="flex flex-col items-center gap-1 mb-4">
              <span className="block text-lg font-medium tracking-widest uppercase text-white/80 dark:text-white/60">
                Built on Hedera
              </span>
              <span className="block text-lg font-medium tracking-widest uppercase text-white/80 dark:text-white/60">
                For
              </span>
              <Image
                src="/Hedera-Wordmark-Lockup-White.svg"
                alt="Hedera"
                width={240}
                height={48}
                className="mt-1 hidden dark:block"
              />
              <Image
                src="/Hedera-Wordmark-Lockup-Dark (1).svg"
                alt="Hedera"
                width={240}
                height={48}
                className="mt-1 dark:hidden"
              />
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-5 -mt-8">
          <div className="bg-base-100 rounded-2xl shadow-lg p-8">
            {connectedAddress ? (
              <div className="flex flex-col items-center gap-2">
                <p className="font-semibold text-sm text-base-content/60 uppercase tracking-wider m-0">
                  Connected Address
                </p>
                <Address address={connectedAddress} chain={targetNetwork} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="font-semibold text-sm text-base-content/60 uppercase tracking-wider m-0">
                  Connect your wallet to get started
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-5 mt-8 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-base-100 rounded-2xl shadow-md p-8 text-center flex flex-col items-center hover:shadow-lg transition-shadow border border-base-300">
              <div className="w-14 h-14 rounded-full hedera-gradient flex items-center justify-center mb-4">
                <BugAntIcon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Debug Contracts</h3>
              <p className="text-base-content/70 text-sm m-0 mb-4">
                Tinker with your smart contracts and test interactions in real time.
              </p>
              <Link href="/debug" passHref className="btn btn-primary btn-sm">
                Open Debug
              </Link>
            </div>

            <div className="bg-base-100 rounded-2xl shadow-md p-8 text-center flex flex-col items-center hover:shadow-lg transition-shadow border border-base-300">
              <div className="w-14 h-14 rounded-full hedera-gradient flex items-center justify-center mb-4">
                <MagnifyingGlassIcon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-2">Block Explorer</h3>
              <p className="text-base-content/70 text-sm m-0 mb-4">
                Explore transactions, addresses, and contract activity on Hedera.
              </p>
              <Link href="/blockexplorer" passHref className="btn btn-primary btn-sm">
                Open Explorer
              </Link>
            </div>
          </div>

          <div className="mt-8 bg-base-100 rounded-2xl shadow-md p-8 border border-base-300">
            <h3 className="font-bold text-lg mb-4 text-center">Quick Start</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="font-bold text-primary text-lg leading-none mt-0.5">1</span>
                <div>
                  <p className="m-0 font-medium">Edit the frontend</p>
                  <code className="text-xs bg-base-200 px-2 py-1 rounded">packages/nextjs/app/page.tsx</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-primary text-lg leading-none mt-0.5">2</span>
                <div>
                  <p className="m-0 font-medium">Edit your contract</p>
                  <code className="text-xs bg-base-200 px-2 py-1 rounded">
                    packages/hardhat/contracts/YourContract.sol
                  </code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-primary text-lg leading-none mt-0.5">3</span>
                <div>
                  <p className="m-0 font-medium">Get testnet HBAR</p>
                  <a
                    href="https://portal.hedera.com/faucet"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs link text-primary"
                  >
                    portal.hedera.com/faucet
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-bold text-primary text-lg leading-none mt-0.5">4</span>
                <div>
                  <p className="m-0 font-medium">Deploy to Hedera</p>
                  <code className="text-xs bg-base-200 px-2 py-1 rounded">yarn deploy --network hederaTestnet</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
