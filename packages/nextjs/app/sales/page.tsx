import { SalesListingsGrid } from "./_components/SalesListingsGrid";
import { Metadata } from "next";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Sales | Subscription NFT Marketplace",
  description: "Buy and sell subscription NFTs on Hedera",
};

export default function SalesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CurrencyDollarIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Sales Marketplace</h1>
          <p className="text-base-content/60">Buy subscription NFTs or bid on auctions</p>
        </div>
      </div>

      <SalesListingsGrid />
    </div>
  );
}
