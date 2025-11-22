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

export async function fetchWalletBalance(address: string, chain: string) {
  const url = `/api/wallet-balance?address=${encodeURIComponent(
    address
  )}&chain=${encodeURIComponent(chain)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch wallet net worth: ${res.status} ${text}`);
  }
  return res.json(); // { total_networth_usd, breakdown }
}
