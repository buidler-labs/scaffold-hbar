import { isDecimalAmountInput } from "~~/services/bridge";

type BridgeAmountInputProps = {
  amount: string;
  onChangeAmount: (amount: string) => void;
};

export const BridgeAmountInput = ({ amount, onChangeAmount }: BridgeAmountInputProps) => {
  const handleAmountChange = (value: string) => {
    const nextAmount = value.replace(",", ".");
    if (isDecimalAmountInput(nextAmount)) onChangeAmount(nextAmount);
  };

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">Amount</span>
      <input
        aria-label="Bridge amount"
        className="input input-bordered w-full rounded-lg border-base-300 bg-base-200 text-base font-semibold shadow-sm outline-none transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        inputMode="decimal"
        name="bridge-amount"
        onChange={event => handleAmountChange(event.target.value)}
        pattern="[0-9]*[.]?[0-9]*"
        placeholder="0.0"
        type="text"
        value={amount}
      />
    </label>
  );
};
