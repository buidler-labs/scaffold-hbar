import { ListingsGrid } from "./_components/ListingsGrid";
import { Metadata } from "next";
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Marketplace | Subscription NFT Rentals",
  description: "Browse and book subscription NFT rentals on Hedera",
};

export default function MarketplacePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBagIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-base-content/60">Browse available subscription rentals</p>
        </div>
      </div>

      <ListingsGrid />
    </div>
  );
}
