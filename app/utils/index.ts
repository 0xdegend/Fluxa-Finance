import { BalanceEntry, TokenInfo } from "@/types";
import { NATIVE_PLACEHOLDER } from "@/data";
export function formatWeiToEth(weiStr: string): string | null {
  if (typeof weiStr !== "string" || !/^\d+$/.test(weiStr)) return null;
  try {
    const wei = BigInt(weiStr);
    const WEI_PER_ETH = BigInt("1000000000000000000"); // 1e18 as bigint

    const whole = wei / WEI_PER_ETH;
    const remainder = wei % WEI_PER_ETH;

    if (remainder === BigInt(0)) {
      return whole.toString();
    }
    let frac = remainder.toString().padStart(18, "0");
    frac = frac.replace(/0+$/g, ""); // remove trailing zeros

    return `${whole.toString()}.${frac}`;
  } catch {
    return null;
  }
}

export const getUsdValue = (
  token: TokenInfo | undefined,
  amt: string | number,
) => {
  const n = typeof amt === "string" ? parseFloat(amt) || 0 : (amt as number);
  if (!token) return 0;
  if (token.symbol === "ETH") return n * 2000;
  if (token.symbol === "USDC" || token.symbol === "DAI") return n * 1;
  return 0;
};

export function formatWithDecimals(balanceStr: string, decimals: number) {
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

function addThousandsSeparators(intStr: string) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatForDisplay(
  numStr: string,
  maxDecimals = 3,
  truncate = true,
) {
  if (!numStr) return "0";
  const s = String(numStr);
  if (!s.includes(".")) {
    return addThousandsSeparators(s);
  }
  const [intPartRaw, fracRaw] = s.split(".");
  const intPart = intPartRaw === "" ? "0" : intPartRaw;
  if (maxDecimals <= 0) return addThousandsSeparators(intPart);

  if (truncate) {
    const frac = (fracRaw || "").slice(0, maxDecimals).replace(/0+$/, "");
    if (!frac) return addThousandsSeparators(intPart);
    return `${addThousandsSeparators(intPart)}.${frac}`;
  } else {
    const n = Number(s);
    if (!Number.isFinite(n)) {
      const frac = (fracRaw || "").slice(0, maxDecimals).replace(/0+$/, "");
      return frac
        ? `${addThousandsSeparators(intPart)}.${frac}`
        : addThousandsSeparators(intPart);
    }
    return n.toLocaleString(undefined, {
      maximumFractionDigits: maxDecimals,
    });
  }
}

export function isAddress(x?: string) {
  return typeof x === "string" && /^0x[0-9a-fA-F]{40}$/.test(x);
}

export function compositeKey(chain?: string, address?: string) {
  return `${(chain ?? "").toLowerCase()}:${(address ?? "").toLowerCase()}`;
}

export type BalanceMap = Record<string, BalanceEntry>;

export function getDisplayedBalance(
  t: TokenInfo | undefined,
  selectedChain: string,
  balances: BalanceMap,
) {
  if (!t) return "—";
  const chain = selectedChain;
  const tokenAddr = t.address ?? "";
  if (t.symbol === "ETH" && (!tokenAddr || tokenAddr === "")) {
    const key = compositeKey(chain, NATIVE_PLACEHOLDER);
    const e = balances[key];
    if (!e) return "—";
    if (e.loading) return "Loading...";
    return formatForDisplay(e.formatted ?? "0", 7, true);
  }

  if (tokenAddr && isAddress(tokenAddr)) {
    const key = compositeKey(chain, tokenAddr);
    const e = balances[key];
    if (!e) return "—";
    if (e.loading) return "Loading...";
    return formatForDisplay(e.formatted ?? "0", 3, true);
  }

  if (typeof t.balance === "string" || typeof t.balance === "number") {
    const s = String(t.balance);
    const cleaned = s.replace(/,/g, "");
    const n = parseFloat(cleaned || "0");
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
  }
  return "—";
}

export function validate(
  fromToken: TokenInfo | undefined,
  toToken: TokenInfo | undefined,
  amount: string,
  selectedChain: string,
  balances: BalanceMap,
) {
  if (!fromToken || !toToken) return "Select tokens.";
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
    return "Enter a valid amount.";
  const balStr = getDisplayedBalance(fromToken, selectedChain, balances);
  const balance = parseFloat(String(balStr).replace(/,/g, "")) || 0;
  if (parseFloat(amount) > balance)
    return `Amount exceeds wallet balance (${balance} ${fromToken.symbol})`;
  if (fromToken.symbol === toToken.symbol) return "Select different tokens.";
  return "";
}
