import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
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
  const c = String(chain ?? "")
    .toLowerCase()
    .trim();
  switch (c) {
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
    case "binance":
    case "binance-smart-chain":
      return ["binance-smart-chain"];
    default:
      return [c]; // try the raw value — user can extend mapping if needed
  }
}

/**
 * Basic in-memory cache for coin detail platform lookups during the process lifecycle.
 * Keyed by `${coinId}:${platformKey}` → address string or null.
 */
const coinPlatformCache = new Map<string, string | null>();

/** fetch coin detail and extract a contract address for the given chain (platform keys) */
async function fetchCoinAddressFromCoinGecko(
  coinId: string,
  chain: string,
): Promise<string | null> {
  if (!coinId) return null;
  const platformKeys = coinGeckoPlatformKeysForChain(chain);
  const cacheKey = `${coinId}::${platformKeys.join(",")}`;
  if (coinPlatformCache.has(cacheKey))
    return coinPlatformCache.get(cacheKey) ?? null;

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
    coinId,
  )}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;

  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) {
      // respect rate limits / errors — cache negative result briefly
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
    // try the mapped keys first
    for (const pk of platformKeys) {
      const v = platformsObj[pk];
      if (typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)) {
        const addr = v.toLowerCase();
        coinPlatformCache.set(cacheKey, addr);
        return addr;
      }
    }

    // fallback: pick first-looking-ethereum-address-looking value
    for (const val of Object.values(platformsObj)) {
      if (typeof val === "string" && /^0x[0-9a-fA-F]{40}$/.test(val)) {
        const addr = val.toLowerCase();
        coinPlatformCache.set(cacheKey, addr);
        return addr;
      }
    }

    coinPlatformCache.set(cacheKey, null);
    return null;
  } catch (err) {
    // network or JSON error -> cache negative and return null
    coinPlatformCache.set(cacheKey, null);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const chain =
    typeof req.query.chain === "string" ? req.query.chain.trim() : "eth";

  if (!q) return res.status(400).json({ error: "Missing query `q`" });

  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(q);
  if (isAddress) {
    if (!MORALIS_API_KEY) {
      console.error("Moralis API key missing");
      return res.status(500).json({ error: "Moralis API key not configured" });
    }

    try {
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${encodeURIComponent(
        chain,
      )}&addresses[]=${encodeURIComponent(q)}`;

      const r = await fetch(url, {
        headers: { "X-API-Key": MORALIS_API_KEY, accept: "application/json" },
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        console.error("Moralis metadata lookup failed", r.status, text);
        return res
          .status(r.status)
          .json({ error: "Moralis metadata lookup failed", details: text });
      }

      const rawJson: unknown = await r.json();
      let candidates: unknown[] = [];
      if (Array.isArray(rawJson)) candidates = rawJson;
      else if (
        isObject(rawJson) &&
        Array.isArray((rawJson as Record<string, unknown>).result)
      )
        candidates = (rawJson as Record<string, unknown>).result as unknown[];
      else if (isObject(rawJson)) candidates = [rawJson];
      else candidates = [];

      const tokens: TokenSearchResult[] = candidates
        .map((c) => parseMoralisTokenRaw(c, q, chain))
        .filter((t): t is TokenSearchResult => t !== null);

      return res.status(200).json(tokens);
    } catch (err) {
      console.error("token address lookup error", err);
      return res.status(500).json({ error: "token address lookup failed" });
    }
  }

  // Non-address fuzzy search using CoinGecko
  try {
    const cgUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(
      q,
    )}`;
    const r = await fetch(cgUrl, { headers: { accept: "application/json" } });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("CoinGecko search failed", r.status, text);
      return res
        .status(r.status)
        .json({ error: "CoinGecko search failed", details: text });
    }

    const rawJson: unknown = await r.json();
    const coins =
      isObject(rawJson) && Array.isArray(rawJson.coins) ? rawJson.coins : [];

    // limit and then enrich each coin by fetching coin detail to extract platform contract
    const sliced = (coins as unknown[]).slice(0, 12);

    // sequential-ish enrichment with caching — safe for small number of coins (12)
    const results: TokenSearchResult[] = [];
    for (const c of sliced) {
      if (!isObject(c)) {
        results.push({
          chain,
          address: "",
          symbol: String(c ?? "").toUpperCase(),
          name: undefined,
          decimals: 18,
          logo: null,
        } as TokenSearchResult);
        continue;
      }

      const coin = c as Record<string, unknown>;
      const id = typeof coin.id === "string" ? coin.id : "";
      const symbol =
        typeof coin.symbol === "string"
          ? coin.symbol.toUpperCase()
          : id.toUpperCase();
      const name = typeof coin.name === "string" ? coin.name : undefined;
      const image =
        typeof coin.large === "string"
          ? `${coin.large}`
          : typeof coin.thumb === "string"
            ? coin.thumb
            : typeof coin.small === "string"
              ? coin.small
              : null;

      // try to resolve a contract address via CoinGecko coin detail
      let address = "";
      if (id) {
        const addr = await fetchCoinAddressFromCoinGecko(id, chain);
        if (addr) address = addr;
      }

      results.push({
        chain,
        address: address || "",
        symbol,
        name,
        decimals: 18,
        logo: image,
      } as TokenSearchResult);
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error("fuzzy search error", err);
    return res.status(500).json({ error: "search failed" });
  }
}
