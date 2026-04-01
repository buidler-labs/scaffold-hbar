"use client";

import { AccountId, TokenCreateTransaction, TokenSupplyType, TokenType } from "@hiero-ledger/sdk";
import { useMutation } from "@tanstack/react-query";
import { useHederaSigner } from "~~/hooks/useHederaSigner";
import { hederaCaipId } from "~~/utils/scaffold-hbar/hederaIdentity";
import { transactionToBase64String } from "~~/utils/scaffold-hbar/hederaTxUtils";

type CreateTokenParams = { name: string; symbol: string; initialSupply?: string };

const TOKEN_SYMBOL_REGEX = /^[A-Z0-9]{1,10}$/;

export function useCreateToken() {
  const { requireProvider } = useHederaSigner();

  return useMutation({
    mutationFn: async ({ name, symbol, initialSupply = "0" }: CreateTokenParams) => {
      const { provider, accountId } = requireProvider();

      const normalizedName = name.trim();
      const normalizedSymbol = symbol.trim().toUpperCase();
      if (!normalizedName || !normalizedSymbol) throw new Error("name and symbol are required");
      if (normalizedName.length > 100) throw new Error("name must be ≤ 100 characters");
      if (!TOKEN_SYMBOL_REGEX.test(normalizedSymbol)) throw new Error("symbol must be 1-10 uppercase letters/numbers");

      const parsedSupply = Number(initialSupply);
      if (!Number.isFinite(parsedSupply) || !Number.isInteger(parsedSupply) || parsedSupply < 0) {
        throw new Error("initialSupply must be a non-negative integer");
      }

      const tx = new TokenCreateTransaction()
        .setTokenName(normalizedName)
        .setTokenSymbol(normalizedSymbol)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(0)
        .setInitialSupply(parsedSupply)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(AccountId.fromString(accountId));

      const result = await provider.hedera_signAndExecuteTransaction({
        signerAccountId: hederaCaipId(accountId),
        transactionList: transactionToBase64String(tx),
      });

      if (!result?.transactionId) throw new Error("No transactionId returned from wallet");
      return {
        transactionId: result.transactionId,
        symbol: normalizedSymbol,
        name: normalizedName,
        initialSupply: parsedSupply,
        treasuryAccountId: accountId,
      };
    },
  });
}
