// app/api/erc20-balance/route.ts
import { NextRequest, NextResponse } from "next/server";

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

function isAddress(x: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(x);
}

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function formatWithDecimals(balanceStr: string, decimals: number) {
  const digits = (balanceStr || "").replace(/^0+/, "");
  const dec = Math.max(0, Math.floor(Number(decimals) || 0));
  if (digits.length === 0) return "0";
  if (dec === 0) return digits;
  if (digits.length <= dec) {
    const frac = digits.padStart(dec, "0").replace(/0+$/, "");
    return frac === "" ? "0" : `0.${frac}`;
  }
  const intPart = digits.slice(0, digits.length - dec);
  const fracPart = digits.slice(digits.length - dec).replace(/0+$/, "");
  return fracPart === "" ? intPart : `${intPart}.${fracPart}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const chain = searchParams.get("chain")?.trim() ?? "eth";

  if (!wallet)
    return NextResponse.json(
      { error: "Missing query `wallet`" },
      { status: 400 },
    );
  if (!isAddress(wallet))
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 },
    );
  if (!token)
    return NextResponse.json(
      { error: "Missing query `token`" },
      { status: 400 },
    );
  if (!isAddress(token))
    return NextResponse.json(
      { error: "Invalid token contract address" },
      { status: 400 },
    );
  if (!MORALIS_API_KEY)
    return NextResponse.json(
      { error: "Moralis API key not configured" },
      { status: 500 },
    );

  try {
    const r = await fetch(
      `https://deep-index.moralis.io/api/v2.2/${encodeURIComponent(wallet)}/erc20?chain=${encodeURIComponent(chain)}&exclude_spam=true&
exclude_unverified_contracts=true`,
      { headers: { "X-API-Key": MORALIS_API_KEY, accept: "application/json" } },
    );

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "Moralis erc20 lookup failed", details: text },
        { status: r.status },
      );
    }

    const rawJson: unknown = await r.json();
    const arr = Array.isArray(rawJson) ? (rawJson as unknown[]) : [];
    const lcToken = token.toLowerCase();

    const found = arr.find((it): it is Record<string, unknown> => {
      if (!isObject(it)) return false;
      const candidate =
        (typeof it.token_address === "string" && it.token_address) ||
        (typeof it.contract_address === "string" && it.contract_address) ||
        (typeof it.address === "string" && it.address) ||
        "";
      return candidate.toLowerCase() === lcToken;
    });

    if (!found) {
      return NextResponse.json({
        found: false,
        balance: "0",
        decimals: 18,
        formatted: "0",
        symbol: null,
        name: null,
      });
    }

    const rawBalance =
      typeof found.balance === "string"
        ? found.balance
        : typeof found.balance === "number"
          ? String(found.balance)
          : "0";

    const decimals =
      typeof found.decimals === "number"
        ? found.decimals
        : typeof found.decimals === "string" && /^\d+$/.test(found.decimals)
          ? parseInt(found.decimals, 10)
          : 18;

    const symbol =
      (typeof found.symbol === "string" && found.symbol) ||
      (typeof found.contract_ticker_symbol === "string" &&
        found.contract_ticker_symbol) ||
      null;

    const name =
      (typeof found.name === "string" && found.name) ||
      (typeof found.contract_name === "string" && found.contract_name) ||
      null;

    return NextResponse.json({
      found: true,
      balance: rawBalance,
      decimals,
      formatted: formatWithDecimals(rawBalance, decimals),
      symbol,
      name,
    });
  } catch (err) {
    console.error("erc20 balance lookup error", err);
    return NextResponse.json(
      { error: "erc20 balance lookup failed" },
      { status: 500 },
    );
  }
}
