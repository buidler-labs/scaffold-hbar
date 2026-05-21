import Link from "next/link";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({ icon, title, description, action, secondaryAction }: EmptyStateProps) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-base-content/60 mb-4">{description}</p>
      {(action || secondaryAction) && (
        <div className="flex gap-2 justify-center">
          {action && (
            <>
              {action.href ? (
                <Link href={action.href} className="btn btn-primary">
                  {action.label}
                </Link>
              ) : (
                <button onClick={action.onClick} className="btn btn-primary">
                  {action.label}
                </button>
              )}
            </>
          )}
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="btn btn-outline btn-sm">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const ConnectWalletState = ({ message = "Connect your wallet to continue" }: { message?: string }) => (
  <EmptyState icon="🔌" title="Connect Your Wallet" description={message} />
);

export const NoSubscriptionsState = ({ onRefresh }: { onRefresh?: () => void }) => (
  <EmptyState
    icon="📭"
    title="No Subscriptions Yet"
    description="You don't own any subscription NFTs yet. Mint one to get started!"
    action={{ label: "Mint Subscription", href: "/mint" }}
    secondaryAction={onRefresh ? { label: "Refresh", onClick: onRefresh } : undefined}
  />
);

export const NoBookingsState = () => (
  <EmptyState
    icon="📭"
    title="No Bookings Yet"
    description="You haven't made any bookings yet."
    action={{ label: "Browse Marketplace", href: "/marketplace" }}
  />
);

export const NoListingsState = () => (
  <EmptyState
    icon="📭"
    title="No Listings Yet"
    description="Be the first to list your subscription NFT on the marketplace!"
  />
);

export const CollectionNotCreatedState = () => (
  <EmptyState
    icon="⚠️"
    title="Collection Not Created"
    description="The NFT collection has not been created yet. Please contact the contract owner to create the collection first."
  />
);
