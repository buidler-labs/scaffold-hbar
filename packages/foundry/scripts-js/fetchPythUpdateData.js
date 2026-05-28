import { ethers } from "ethers";

const HERMES_LATEST_PRICE_URL =
  "https://hermes.pyth.network/v2/updates/price/latest";
const HEX_PREFIX = "0x";

function normalizePriceId(priceId) {
  return priceId.startsWith(HEX_PREFIX)
    ? priceId.slice(HEX_PREFIX.length)
    : priceId;
}

async function main() {
  const priceIds = process.argv.slice(2);

  if (priceIds.length === 0) {
    throw new Error(
      "Usage: node scripts-js/fetchPythUpdateData.js <price-id> [price-id...]"
    );
  }

  const url = new URL(HERMES_LATEST_PRICE_URL);

  for (const priceId of priceIds) {
    url.searchParams.append("ids[]", normalizePriceId(priceId));
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Hermes request failed: ${response.status} ${response.statusText}`
    );
  }

  const payload = await response.json();
  const updateData = payload?.binary?.data;

  if (!Array.isArray(updateData) || updateData.length === 0) {
    throw new Error("Hermes response did not include binary update data");
  }

  const encoded = ethers.utils.defaultAbiCoder.encode(
    ["bytes[]"],
    [updateData.map((data) => `${HEX_PREFIX}${data}`)]
  );

  process.stdout.write(encoded);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
