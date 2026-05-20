"use client";

import { useState } from "react";
import { OwnerBookings } from "./_components/OwnerBookings";
import { RenterBookings } from "./_components/RenterBookings";
import { useAccount } from "wagmi";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

type Tab = "renter" | "owner";

export default function MyBookingsPage() {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("renter");

  if (!connectedAddress) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-base-content/60">Connect your wallet to see your bookings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CalendarDaysIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-base-content/60">Manage your rental bookings</p>
        </div>
      </div>

      <div className="tabs tabs-boxed mb-6 w-fit">
        <button className={`tab ${activeTab === "renter" ? "tab-active" : ""}`} onClick={() => setActiveTab("renter")}>
          As Renter
        </button>
        <button className={`tab ${activeTab === "owner" ? "tab-active" : ""}`} onClick={() => setActiveTab("owner")}>
          As Owner
        </button>
      </div>

      {activeTab === "renter" ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">Subscriptions You&apos;ve Rented</h2>
          <RenterBookings />
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Bookings on Your Listings</h2>
          <OwnerBookings />
        </div>
      )}
    </div>
  );
}
