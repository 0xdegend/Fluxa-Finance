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
export async function fetchTokenBalances(address: string) {
  const res = await fetch(`/api/token-balances?address=${address}`);
  if (!res.ok) throw new Error("Failed to fetch token balances");
  return await res.json();
}

export async function fetchWalletBalance(address: string) {
  const res = await fetch(`/api/wallet-balance?address=${address}`);
  if (!res.ok) throw new Error("Failed to fetch Wallet balances");
  return await res.json();
}
