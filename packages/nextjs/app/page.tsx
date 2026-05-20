"use client";

import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  ShoppingBagIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { HederaAddress } from "~~/components/scaffold-hbar";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";

const Home: NextPage = () => {
  const { address: connectedAddress, status } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const isReconnecting = status === "reconnecting" || status === "connecting";
  const isConnected = status === "connected" && connectedAddress;

  return (
    <>
      <div className="flex items-center flex-col grow">
        <div className="hedera-gradient dark:bg-none dark:bg-hedera-charcoal w-full py-16 px-5">
          <div className="flex flex-col items-center max-w-3xl mx-auto text-center">
            <Image
              src="/Hedera-Icon-White.svg"
              alt="Hedera icon"
              width={64}
              height={64}
              className="mb-4 hidden dark:block"
            />
            <Image src="/Hedera-Icon-Dark.svg" alt="Hedera icon" width={64} height={64} className="mb-4 dark:hidden" />
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Subscription NFT Marketplace</h1>
            <p className="text-xl text-white/80 dark:text-white/60 max-w-2xl">
              Tokenize your subscriptions as NFTs and rent them out when you&apos;re not using them. Earn passive income
              from gym memberships, streaming services, and more.
            </p>
            <div className="flex flex-wrap gap-4 mt-8 justify-center">
              <Link href="/marketplace" className="btn btn-lg bg-white text-primary hover:bg-white/90">
                <ShoppingBagIcon className="h-5 w-5" />
                Browse Marketplace
              </Link>
              <Link href="/mint" className="btn btn-lg btn-outline border-white text-white hover:bg-white/10">
                <PlusCircleIcon className="h-5 w-5" />
                Mint Subscription
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-5 -mt-8">
          <div className="bg-base-100 rounded-2xl shadow-lg p-6">
            {isReconnecting ? (
              <div className="flex flex-col items-center gap-2">
                <p className="font-semibold text-sm text-base-content/60 uppercase tracking-wider m-0">Connecting…</p>
                <div className="h-8 w-48 rounded bg-base-200 animate-pulse" aria-hidden />
              </div>
            ) : isConnected ? (
              <div className="flex flex-col items-center gap-2">
                <p className="font-semibold text-sm text-base-content/60 uppercase tracking-wider m-0">
                  Connected Address
                </p>
                <HederaAddress address={connectedAddress} chain={targetNetwork} />
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

        <div className="w-full max-w-5xl mx-auto px-5 mt-12 pb-16">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-base-100 rounded-2xl shadow-md p-6 text-center flex flex-col items-center hover:shadow-lg transition-shadow border border-base-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <PlusCircleIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary mb-2">STEP 1</span>
              <h3 className="font-bold text-lg mb-2">Mint NFT</h3>
              <p className="text-base-content/70 text-sm m-0">
                Tokenize your subscription as an NFT with provider details and validity dates.
              </p>
            </div>

            <div className="bg-base-100 rounded-2xl shadow-md p-6 text-center flex flex-col items-center hover:shadow-lg transition-shadow border border-base-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarDaysIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary mb-2">STEP 2</span>
              <h3 className="font-bold text-lg mb-2">Create Listing</h3>
              <p className="text-base-content/70 text-sm m-0">
                Set availability windows and daily rental prices for periods you won&apos;t use.
              </p>
            </div>

            <div className="bg-base-100 rounded-2xl shadow-md p-6 text-center flex flex-col items-center hover:shadow-lg transition-shadow border border-base-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBagIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary mb-2">STEP 3</span>
              <h3 className="font-bold text-lg mb-2">Get Bookings</h3>
              <p className="text-base-content/70 text-sm m-0">
                Renters browse and book your subscription for specific date ranges.
              </p>
            </div>

            <div className="bg-base-100 rounded-2xl shadow-md p-6 text-center flex flex-col items-center hover:shadow-lg transition-shadow border border-base-300">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <TicketIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary mb-2">STEP 4</span>
              <h3 className="font-bold text-lg mb-2">Earn HBAR</h3>
              <p className="text-base-content/70 text-sm m-0">
                Claim your payout once the rental period starts. Simple and secure.
              </p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-base-100 rounded-2xl shadow-md p-8 border border-base-300">
              <h3 className="font-bold text-xl mb-4">For Subscription Owners</h3>
              <ul className="space-y-3 text-base-content/70">
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Monetize unused subscription time</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Set your own prices and availability</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Automatic payouts via smart contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Full control over your subscription NFT</span>
                </li>
              </ul>
              <Link href="/my-subscriptions" className="btn btn-primary mt-6">
                Manage Subscriptions
              </Link>
            </div>

            <div className="bg-base-100 rounded-2xl shadow-md p-8 border border-base-300">
              <h3 className="font-bold text-xl mb-4">For Renters</h3>
              <ul className="space-y-3 text-base-content/70">
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Access premium subscriptions affordably</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Rent only for the days you need</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Secure on-chain booking confirmation</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Cancel before start date for full refund</span>
                </li>
              </ul>
              <Link href="/marketplace" className="btn btn-primary mt-6">
                Browse Listings
              </Link>
            </div>
          </div>

          <div className="mt-12 bg-base-200 rounded-2xl p-8 text-center">
            <h3 className="font-bold text-xl mb-2">Built on Hedera</h3>
            <p className="text-base-content/70 mb-6 max-w-2xl mx-auto">
              Leveraging Hedera Token Service (HTS) for NFTs and smart contracts for secure, low-cost transactions. Fast
              finality and enterprise-grade security.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/debug" className="btn btn-outline btn-sm">
                Debug Contracts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
