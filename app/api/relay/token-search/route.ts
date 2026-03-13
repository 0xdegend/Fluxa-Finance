// app/api/token-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import type { TokenSearchResult } from "@/app/types";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function parseMoralisTokenRaw(
  raw: unknown,
  fallbackAddress: string,
  chain: string,
): TokenSearchResult | null {
  if (!isObject(raw)) return null;
  const r = raw as Record<string, unknown>;

  const addr =
    (typeof r.address === "string" && r.address) ||
    (typeof r.token_address === "string" && r.token_address) ||
    fallbackAddress;

  const symbol =
    (typeof r.symbol === "string" && r.symbol) ||
    (typeof r.contract_ticker_symbol === "string" &&
      r.contract_ticker_symbol) ||
    "UNKNOWN";

  const name =
    (typeof r.name === "string" && r.name) ||
    (typeof r.contract_name === "string" && r.contract_name) ||
    undefined;

  const decimalsCandidate =
    r.decimals ?? r.token_decimals ?? r.contract_decimals ?? undefined;
  let decimals = 18;
  if (
    typeof decimalsCandidate === "number" &&
    Number.isFinite(decimalsCandidate)
  )
    decimals = decimalsCandidate;
  else if (
    typeof decimalsCandidate === "string" &&
    /^\d+$/.test(decimalsCandidate)
  )
    decimals = parseInt(decimalsCandidate, 10);

  const logo =
    (typeof r.logo === "string" && r.logo) ||
    (typeof r.logo_url === "string" && r.logo_url) ||
    null;

  return {
    chain,
    address: String(addr).toLowerCase(),
    symbol,
    name,
    decimals,
    logo,
  };
}

function coinGeckoPlatformKeysForChain(chain: string): string[] {
  switch (chain.toLowerCase().trim()) {
    case "eth":
    case "ethereum":
      return ["ethereum"];
    case "base":
      return ["base"];
    case "sol":
    case "solana":
      return ["solana"];
    case "arbitrum":
      return ["arbitrum-one", "arbitrum"];
    case "bsc":
    case "binance-smart-chain":
      return ["binance-smart-chain"];
    default:
      return [chain];
  }
}

const coinPlatformCache = new Map<string, string | null>();

async function fetchCoinAddressFromCoinGecko(
  coinId: string,
  chain: string,
): Promise<string | null> {
  if (!coinId) return null;
  const platformKeys = coinGeckoPlatformKeysForChain(chain);
  const cacheKey = `${coinId}::${platformKeys.join(",")}`;
  if (coinPlatformCache.has(cacheKey))
    return coinPlatformCache.get(cacheKey) ?? null;

  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
      { headers: { accept: "application/json" } },
    );

    if (!r.ok) {
      coinPlatformCache.set(cacheKey, null);
      return null;
    }

    const json = await r.json();
    if (!isObject(json)) {
      coinPlatformCache.set(cacheKey, null);
      return null;
    }

    const platformsObj = isObject(json.platforms)
      ? (json.platforms as Record<string, unknown>)
      : {};

    for (const pk of platformKeys) {
      const v = platformsObj[pk];
      if (typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)) {
        coinPlatformCache.set(cacheKey, v.toLowerCase());
        return v.toLowerCase();
      }
    }

    for (const val of Object.values(platformsObj)) {
      if (typeof val === "string" && /^0x[0-9a-fA-F]{40}$/.test(val)) {
        coinPlatformCache.set(cacheKey, val.toLowerCase());
        return val.toLowerCase();
      }
    }

    coinPlatformCache.set(cacheKey, null);
    return null;
  } catch {
    coinPlatformCache.set(cacheKey, null);
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const chain = searchParams.get("chain")?.trim() ?? "eth";

  if (!q)
    return NextResponse.json({ error: "Missing query `q`" }, { status: 400 });

  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(q);

  if (isAddress) {
    if (!MORALIS_API_KEY) {
      return NextResponse.json(
        { error: "Moralis API key not configured" },
        { status: 500 },
      );
    }

    try {
      const r = await fetch(
        `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${encodeURIComponent(chain)}&addresses[]=${encodeURIComponent(q)}`,
        {
          headers: { "X-API-Key": MORALIS_API_KEY, accept: "application/json" },
        },
      );

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        return NextResponse.json(
          { error: "Moralis metadata lookup failed", details: text },
          { status: r.status },
        );
      }

      const rawJson: unknown = await r.json();
      let candidates: unknown[] = [];
      if (Array.isArray(rawJson)) candidates = rawJson;
      else if (isObject(rawJson) && Array.isArray(rawJson.result))
        candidates = rawJson.result as unknown[];
      else if (isObject(rawJson)) candidates = [rawJson];

      const tokens = candidates
        .map((c) => parseMoralisTokenRaw(c, q, chain))
        .filter((t): t is TokenSearchResult => t !== null);

      return NextResponse.json(tokens);
    } catch (err) {
      console.error("token address lookup error", err);
      return NextResponse.json(
        { error: "token address lookup failed" },
        { status: 500 },
      );
    }
  }

  // Fuzzy search via CoinGecko
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      { headers: { accept: "application/json" } },
    );

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "CoinGecko search failed", details: text },
        { status: r.status },
      );
    }

    const rawJson: unknown = await r.json();
    const coins =
      isObject(rawJson) && Array.isArray(rawJson.coins) ? rawJson.coins : [];
    const sliced = (coins as unknown[]).slice(0, 12);

    const results: TokenSearchResult[] = [];
    for (const c of sliced) {
      if (!isObject(c)) continue;

      const coin = c as Record<string, unknown>;
      const id = typeof coin.id === "string" ? coin.id : "";
      const symbol =
        typeof coin.symbol === "string"
          ? coin.symbol.toUpperCase()
          : id.toUpperCase();
      const name = typeof coin.name === "string" ? coin.name : undefined;
      const image =
        typeof coin.large === "string"
          ? coin.large
          : typeof coin.thumb === "string"
            ? coin.thumb
            : typeof coin.small === "string"
              ? coin.small
              : null;

      const address = id
        ? ((await fetchCoinAddressFromCoinGecko(id, chain)) ?? "")
        : "";

      results.push({
        chain,
        address,
        symbol,
        name,
        decimals: 18,
        logo: image,
      } as TokenSearchResult);
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("fuzzy search error", err);
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
