"use client";

import { useState } from "react";
import { SubscriptionsList } from "./_components/SubscriptionsList";
import { TicketIcon } from "@heroicons/react/24/outline";
import { CreateAvailabilityModal } from "~~/components/marketplace/CreateAvailabilityModal";

export default function MySubscriptionsPage() {
  const [selectedSerialNumber, setSelectedSerialNumber] = useState<bigint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateListing = (serialNumber: bigint) => {
    setSelectedSerialNumber(serialNumber);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSerialNumber(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <TicketIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Subscriptions</h1>
            <p className="text-base-content/60">Manage your subscription NFTs</p>
          </div>
        </div>
        <a href="/mint" className="btn btn-primary">
          Mint New
        </a>
      </div>

      <SubscriptionsList onCreateListing={handleCreateListing} />

      {selectedSerialNumber !== null && (
        <CreateAvailabilityModal isOpen={isModalOpen} onClose={handleCloseModal} serialNumber={selectedSerialNumber} />
      )}
    </div>
  );
}
