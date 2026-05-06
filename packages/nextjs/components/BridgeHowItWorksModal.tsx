"use client";

import { useRef } from "react";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

type BridgeHowItWorksModalProps = {
  buttonClassName?: string;
  showLabel?: boolean;
};

const bridgeSteps = [
  {
    title: "Deploy the route",
    description: "Run the Foundry scripts for the provider you want to test: Axelar, CCIP, or LayerZero.",
  },
  {
    title: "Write the config",
    description: "Add the deployed token, pool, endpoint, selector, or token id values to the bridge config files.",
  },
  {
    title: "Connect a wallet",
    description:
      "Use an account that has the source token balance and enough native gas for the selected source chain.",
  },
  {
    title: "Choose the path",
    description: "Pick the provider, direction, and amount. The app checks config, contracts, and wallet network.",
  },
  {
    title: "Approve if needed",
    description: "Some routes need token approval first, such as CCIP router spends or Hedera HTS connector sends.",
  },
  {
    title: "Send and track",
    description: "Submit the bridge transaction, then follow the message in the provider explorer.",
  },
];

export const BridgeHowItWorksModal = ({ buttonClassName, showLabel = true }: BridgeHowItWorksModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          "btn btn-ghost btn-sm gap-2 rounded-full border border-base-300 bg-base-200 hover:border-primary hover:bg-base-200"
        }
        onClick={() => dialogRef.current?.showModal()}
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
        {showLabel ? <span>How it works</span> : null}
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-2xl border border-base-300 bg-base-100 p-0">
          <div className="flex items-center justify-between border-b border-base-300 px-5 py-4">
            <div>
              <h2 className="m-0 text-lg font-bold">How the bridge flow works</h2>
              <p className="m-0 mt-1 text-sm text-base-content/60">From deployment to a test transfer.</p>
            </div>
            <form method="dialog">
              <button type="submit" className="btn btn-circle btn-ghost btn-sm" aria-label="Close">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="grid gap-3 p-5">
            {bridgeSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[auto_1fr] gap-3 rounded-lg bg-base-200 p-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-content">
                  {index + 1}
                </div>
                <div>
                  <h3 className="m-0 text-sm font-bold">{step.title}</h3>
                  <p className="m-0 mt-1 text-sm leading-6 text-base-content/70">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </>
  );
};
