import { NextRequest, NextResponse } from "next/server";

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

function formatWeiToEth(weiStr: string): string | null {
  if (typeof weiStr !== "string" || !/^\d+$/.test(weiStr)) return null;
  try {
    const wei = BigInt(weiStr);
    const WEI_PER_ETH = BigInt("1000000000000000000");
    const whole = wei / WEI_PER_ETH;
    const remainder = wei % WEI_PER_ETH;
    if (remainder === BigInt(0)) return whole.toString();
    const frac = remainder.toString().padStart(18, "0").replace(/0+$/, "");
    return `${whole}.${frac}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const wallet =
    searchParams.get("wallet") ??
    searchParams.get("address") ??
    searchParams.get("account") ??
    "";
  const chain = searchParams.get("chain") ?? "base";

  if (!wallet) {
    return NextResponse.json(
      { error: "Missing query param: wallet (or address/account)" },
      { status: 400 },
    );
  }

  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: missing MORALIS_API_KEY" },
      { status: 500 },
    );
  }

  try {
    const fetchRes = await fetch(
      `${MORALIS_BASE}/${encodeURIComponent(wallet)}/balance?chain=${encodeURIComponent(chain)}`,
      { headers: { accept: "application/json", "X-API-Key": apiKey } },
    );

    const json: unknown = await fetchRes.json();

    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: typeof json === "object" ? json : "Provider error" },
        { status: fetchRes.status },
      );
    }

    if (
      typeof json !== "object" ||
      json === null ||
      !("balance" in json) ||
      typeof (json as { balance?: unknown }).balance !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid response from provider" },
        { status: 500 },
      );
    }

    const wei = (json as { balance: string }).balance;
    const eth = formatWeiToEth(wei);

    if (eth === null) {
      return NextResponse.json(
        { error: "Failed to parse balance from provider" },
        { status: 500 },
      );
    }

    return NextResponse.json({ balance: wei, eth });
  } catch (err) {
    console.error("native-balance error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
