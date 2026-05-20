"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { PlusCircleIcon, TicketIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";

export default function MintPage() {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();

  const [provider, setProvider] = useState("");
  const [serviceTier, setServiceTier] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState("");

  const { data: collectionAddress, isLoading: isLoadingCollection } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "collectionAddress",
  });

  const { writeContractAsync: mintSubscription } = useScaffoldWriteContract({
    contractName: "SubscriptionNFT",
  });

  const collectionExists = collectionAddress && collectionAddress !== "0x0000000000000000000000000000000000000000";

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!provider.trim() || !serviceTier.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select valid dates");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after start date");
      return;
    }

    // End date must be in the future (subscription must have remaining validity)
    if (new Date(endDate) <= new Date()) {
      setError("End date must be in the future");
      return;
    }

    setIsMinting(true);

    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      const alignedStart = Math.floor(startTimestamp / 86400) * 86400;
      const alignedEnd = Math.floor(endTimestamp / 86400) * 86400;

      await mintSubscription({
        functionName: "mintSubscription",
        args: [provider.trim(), serviceTier.trim(), BigInt(alignedStart), BigInt(alignedEnd)],
        gas: 1_500_000n,
      });

      // Store pending subscription for optimistic UI
      const pendingSubscription = {
        provider: provider.trim(),
        serviceTier: serviceTier.trim(),
        startDate: alignedStart,
        endDate: alignedEnd,
        timestamp: Date.now(),
      };
      sessionStorage.setItem("pendingSubscription", JSON.stringify(pendingSubscription));

      router.push("/my-subscriptions");
    } catch (err: any) {
      console.error("Minting failed:", err);
      setError(err.message || "Failed to mint subscription. Please try again.");
    } finally {
      setIsMinting(false);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-base-content/60">Connect your wallet to mint subscription NFTs</p>
        </div>
      </div>
    );
  }

  if (isLoadingCollection) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (!collectionExists) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">Collection Not Created</h3>
          <p className="text-base-content/60 mb-4">
            The NFT collection has not been created yet. Please contact the contract owner to create the collection
            first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <PlusCircleIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Mint Subscription NFT</h1>
          <p className="text-base-content/60">Create a new subscription NFT</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl">
          <div className="card-body">
            <h2 className="card-title">Subscription Details</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Provider Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  placeholder="e.g., Netflix, Spotify, Planet Fitness"
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Service Tier</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={serviceTier}
                  onChange={e => setServiceTier(e.target.value)}
                  placeholder="e.g., Premium, Family Plan, Annual"
                  maxLength={50}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Subscription Start Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Can be in the past for existing subscriptions
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Subscription End Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={todayStr}
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">Must be in the future</span>
                </label>
              </div>

              {error && (
                <div className="alert alert-error">
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full" disabled={isMinting}>
                {isMinting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Minting...
                  </>
                ) : (
                  "Mint Subscription NFT"
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl">
          <div className="card-body">
            <h2 className="card-title">Preview</h2>

            <div
              className={`card bg-base-200 border border-base-300 rounded-xl ${!provider && !serviceTier ? "opacity-50" : ""}`}
            >
              <div className="card-body p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TicketIcon className="h-5 w-5 text-primary" />
                  <span className="text-xs text-base-content/60">New NFT</span>
                </div>

                <h3 className="card-title text-lg">{provider || "Provider Name"}</h3>
                <p className="text-sm text-base-content/70">{serviceTier || "Service Tier"}</p>

                <div className="divider my-2"></div>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-base-content/60">Valid:</span>{" "}
                    {startDate && endDate
                      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                      : "Select dates"}
                  </p>
                </div>
              </div>
            </div>

            <div className="divider"></div>

            <div className="space-y-2 text-sm">
              <h3 className="font-semibold">What happens next?</h3>
              <ol className="list-decimal list-inside space-y-1 text-base-content/70">
                <li>Your subscription NFT will be minted on Hedera</li>
                <li>It will appear in your &quot;My Subscriptions&quot; page</li>
                <li>You can then create availability listings to rent it out</li>
                <li>Renters can book your subscription during available periods</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
