import { useRef } from "react";
import { rainbowkitBurnerWallet } from "burner-connector";
import {
  CheckIcon,
  ClipboardDocumentIcon,
  KeyIcon,
  ShieldExclamationIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "~~/hooks/scaffold-hbar";
import { getParsedError, notification } from "~~/utils/scaffold-hbar";

const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

export const RevealBurnerPKModal = () => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();
  const modalCheckboxRef = useRef<HTMLInputElement>(null);

  const handleCopyPK = async () => {
    try {
      const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
      const burnerPK = storage?.getItem(BURNER_WALLET_PK_KEY);
      if (!burnerPK) throw new Error("Burner wallet private key not found");
      await copyToClipboard(burnerPK);
      notification.success("Burner wallet private key copied to clipboard");
    } catch (e) {
      const parsedError = getParsedError(e);
      notification.error(parsedError);
      if (modalCheckboxRef.current) modalCheckboxRef.current.checked = false;
    }
  };

  return (
    <div>
      <input type="checkbox" id="reveal-burner-pk-modal" className="modal-toggle" ref={modalCheckboxRef} />
      <label htmlFor="reveal-burner-pk-modal" className="modal cursor-pointer">
        <label className="modal-box relative bg-base-100 border border-base-300 rounded-2xl shadow-xl p-6 max-w-md">
          <input className="h-0 w-0 absolute top-0 left-0" />

          <label
            htmlFor="reveal-burner-pk-modal"
            className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 text-base-content/50 hover:text-base-content"
          >
            <XMarkIcon className="h-4 w-4" />
          </label>

          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl hedera-gradient">
              <KeyIcon className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-base-content m-0">Burner Wallet Private Key</h3>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-warning/10 border border-warning/30 p-4 mb-4">
            <ShieldExclamationIcon className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-warning font-medium m-0">
              Burner wallets are for testnet development only. Never use for real funds.
            </p>
          </div>

          <p className="text-sm text-base-content/70 mb-5 m-0">
            Your private key grants <span className="font-semibold text-base-content">full access</span> to this wallet.
            It is stored <span className="font-semibold text-base-content">temporarily</span> in your browser and will
            be lost if you clear site data.
          </p>

          <button className="btn btn-primary w-full gap-2" onClick={handleCopyPK} disabled={isCopiedToClipboard}>
            {isCopiedToClipboard ? (
              <>
                <CheckIcon className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copy Private Key
              </>
            )}
          </button>
        </label>
      </label>
    </div>
  );
};
