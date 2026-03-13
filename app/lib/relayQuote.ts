import { CHAIN_IDS } from "../data";
import type { TokenInfo, RelayQuote } from "../types";

const NATIVE = "0x0000000000000000000000000000000000000000";

function toRelayAddress(token: TokenInfo): string {
  if (!token.address || token.address === "" || token.symbol === "ETH") {
    return NATIVE;
  }
  return token.address;
}

function toWei(amount: string, decimals: number): string {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const raw =
    BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction || "0");
  return raw.toString();
}

export async function fetchRelayQuote(
  fromToken: TokenInfo,
  toToken: TokenInfo,
  amount: string,
  userAddress: string,
  fromChain: string,
  toChain: string,
  slippageBps?: number,
): Promise<RelayQuote | null> {
  const originChainId = CHAIN_IDS[fromChain];
  const destinationChainId = CHAIN_IDS[toChain];

  if (!originChainId || !destinationChainId) {
    console.error("Unknown chain:", fromChain, toChain);
    return null;
  }

  const decimals = fromToken.decimals ?? 18;
  const amountWei = toWei(amount, decimals);

  try {
    const res = await fetch("/api/relay/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userAddress,
        originChainId,
        destinationChainId,
        originCurrency: toRelayAddress(fromToken),
        destinationCurrency: toRelayAddress(toToken),
        amount: amountWei,
        tradeType: "EXACT_INPUT",
        ...(slippageBps ? { slippageTolerance: String(slippageBps) } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error("Quote API error:", res.status, err);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("fetchRelayQuote failed:", err);
    return null;
  }
}
