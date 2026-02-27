"use client";

import { useEffect, useState } from "react";
import { Address, toHex } from "viem";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

export const AddressStorageTab = ({ address }: { address: Address }) => {
  const [storage, setStorage] = useState<string[]>([]);
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  useEffect(() => {
    const fetchStorage = async () => {
      if (!publicClient) return;
      try {
        const storageData = [];
        let idx = 0;

        while (true) {
          const storageAtPosition = await publicClient.getStorageAt({
            address: address,
            slot: toHex(idx),
          });

          if (storageAtPosition === "0x" + "0".repeat(64)) break;

          if (storageAtPosition) {
            storageData.push(storageAtPosition);
          }

          idx++;
        }
        setStorage(storageData);
      } catch (error) {
        console.error("Failed to fetch storage:", error);
      }
    };

    fetchStorage();
  }, [address, publicClient]);

  return (
    <div className="flex flex-col gap-3 p-4">
      {storage.length > 0 ? (
        <div className="mockup-code overflow-auto max-h-[500px]">
          <pre className="px-5 whitespace-pre-wrap break-words">
            {storage.map((data, i) => (
              <div key={i}>
                <strong>Storage Slot {i}:</strong> {data}
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="text-lg">This contract does not have any variables.</div>
      )}
    </div>
  );
};
