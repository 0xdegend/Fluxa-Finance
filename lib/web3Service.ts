export async function swap({
  fromToken,
  toToken,
  amount,
  slippage,
}: {
  fromToken: string;
  toToken: string;
  amount: number;
  slippage: number;
}) {
  await new Promise((res) => setTimeout(res, 1500));
  return {
    txHash: "0x" + Math.random().toString(16).slice(2, 18),
    status: "success",
  };
}

export const truncate = (addr?: string) =>
  addr ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : "";

export const getUsd = (amount: number) => `$${(amount * 2).toFixed(2)}`;
export async function fetchTokenBalances(
  address: string,
  network: string = "",
  limit: number = 25
) {
  const res = await fetch(
    `/api/token-balances?address=${address}&chain=${network}&limit=${limit}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch token balances: ${res.status} ${text}`);
  }
  const payload = await res.json();
  return payload.balances ?? [];
}

// lib/web3Service.ts (updated)
export async function fetchWalletBalance(address: string, chain: string) {
  const params = new URLSearchParams();
  params.append("address", address);
  params.append("chain", chain);
  const url = `/api/wallet-balance?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch wallet net worth: ${res.status} ${text}`);
  }
  return res.json(); // { total_networth_usd, chains: [...] }
}

export async function fetchTokenBalance(
  walletAddress: string,
  tokenAddress: string,
  chain = "eth"
) {
  const res = await fetch(
    `/api/erc20-balance?wallet=${encodeURIComponent(
      walletAddress
    )}&token=${encodeURIComponent(tokenAddress)}&chain=${encodeURIComponent(
      chain
    )}`
  );
  if (!res.ok) {
    throw new Error(`Balance fetch failed: ${res.status}`);
  }
  return res.json();
}

export type NativeBalance = {
  balance: string; // wei
  eth: string; // formatted ETH string
};

export async function fetchNativeBalance(
  address: string,
  chain = "base"
): Promise<NativeBalance> {
  if (!address) throw new Error("address is required");

  const params = new URLSearchParams();
  params.append("wallet", address);
  params.append("chain", chain);

  // NOTE: this hits your Next.js api route at pages/api/balance.ts
  const url = `/api/native-balance?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch native balance: ${res.status} ${text}`);
  }

  const json = (await res.json()) as NativeBalance;
  // basic validation
  if (typeof json?.balance !== "string" || typeof json?.eth !== "string") {
    throw new Error("Invalid response shape from native-balance API");
  }

  return json;
}
