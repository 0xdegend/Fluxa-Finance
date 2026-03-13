// utils/tokenAdapter.ts (or wherever)
import type { Token, TokenInfo } from "@/app/types";

export function adaptToTokenInfo(
  tokens: Token[],
  defaultChain = "eth",
): TokenInfo[] {
  return tokens.map((t) => {
    return {
      chain: defaultChain,
      address: "",
      symbol: t.symbol,
      name: t.name ?? undefined,
      decimals: 18,
      logo: typeof t.icon === "string" ? t.icon : null,
      // copy UI fields so your SwapCard logic still works
      balance: typeof t.balance === "number" ? t.balance : undefined,
      icon: typeof t.icon === "string" ? t.icon : undefined,
    } as TokenInfo;
  });
}
