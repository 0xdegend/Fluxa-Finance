import { TokenInfo } from "@/types";
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
