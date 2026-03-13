import { NextRequest, NextResponse } from "next/server";
import { SUPPORTED_CHAINS } from "@/app/data";

type MoralisTokenRaw = {
  symbol?: string | null;
  token_symbol?: string | null;
  contract_ticker_symbol?: string | null;
  balance_formatted?: string | number | null;
  balanceFormatted?: string | number | null;
  balance?: string | number | null;
  usd_value?: number | null;
  quote?: number | null;
  usdPrice?: number | null;
  logo?: string | null;
  logo_url?: string | null;
  token_logo?: string | null;
  [k: string]: unknown;
};

type TokenBalance = {
  symbol: string;
  balance: number | null;
  usd: number | null;
  logo: string | null;
  _raw?: MoralisTokenRaw;
};

function parseMoralisToken(input: unknown): TokenBalance {
  const token = (input as MoralisTokenRaw) ?? {};

  const symbol =
    (typeof token.symbol === "string" && token.symbol) ||
    (typeof token.token_symbol === "string" && token.token_symbol) ||
    (typeof token.contract_ticker_symbol === "string" &&
      token.contract_ticker_symbol) ||
    "UNKNOWN";

  const rawBalance =
    token.balance_formatted ?? token.balanceFormatted ?? token.balance ?? null;
  let balanceNum: number | null = null;
  if (typeof rawBalance === "number" && Number.isFinite(rawBalance)) {
    balanceNum = rawBalance;
  } else if (typeof rawBalance === "string") {
    const parsed = Number(rawBalance.replace(/,/g, ""));
    balanceNum = Number.isFinite(parsed) ? parsed : null;
  }

  const usdCandidate = token.usd_value ?? token.quote ?? token.usdPrice ?? null;
  const usd =
    typeof usdCandidate === "number" && Number.isFinite(usdCandidate)
      ? usdCandidate
      : null;

  const logo =
    (typeof token.logo === "string" && token.logo) ||
    (typeof token.logo_url === "string" && token.logo_url) ||
    (typeof token.token_logo === "string" && token.token_logo) ||
    null;

  return { symbol, balance: balanceNum, usd, logo, _raw: token };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const rawAddress = searchParams.get("address")?.trim().toLowerCase() ?? "";
  const chain = searchParams.get("chain")?.trim().toLowerCase() ?? "eth";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 25), 1),
    100,
  );

  if (!rawAddress) {
    return NextResponse.json(
      { error: "Missing or invalid 'address' parameter" },
      { status: 400 },
    );
  }

  if (!SUPPORTED_CHAINS.includes(chain)) {
    return NextResponse.json(
      {
        error: `Unsupported chain '${chain}'. Supported: ${SUPPORTED_CHAINS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
  if (!MORALIS_API_KEY) {
    return NextResponse.json(
      { error: "Moralis API key not configured" },
      { status: 500 },
    );
  }

  try {
    const r = await fetch(
      `https://deep-index.moralis.io/api/v2.2/wallets/${encodeURIComponent(rawAddress)}/tokens?chain=${encodeURIComponent(chain)}&limit=${limit}&exclude_spam=true`,
      {
        headers: { accept: "application/json", "X-API-Key": MORALIS_API_KEY },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!r.ok) {
      const details = await r.json().catch(() => r.statusText);
      return NextResponse.json(
        { error: "Moralis API error", details },
        { status: r.status },
      );
    }

    const data = await r.json();
    const resultsArray: unknown[] = Array.isArray(data?.result)
      ? data.result
      : Array.isArray(data)
        ? data
        : [];

    const balances: TokenBalance[] = resultsArray.map(parseMoralisToken);

    return NextResponse.json({
      address: rawAddress,
      chain,
      limit,
      count: balances.length,
      balances,
    });
  } catch (err) {
    console.error("token-balances error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
