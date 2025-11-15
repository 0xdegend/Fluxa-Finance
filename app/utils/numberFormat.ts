export function toNumberOrNull(
  value: number | string | null | undefined
): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function formatSignificant(
  value: number | string | null | undefined,
  sig: number
): string {
  const n = toNumberOrNull(value);
  if (n === null) return "-";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  const magnitude = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, sig - magnitude - 1);
  const fixed = Number(n.toFixed(decimals));
  return fixed.toString();
}

export function formatUsd(value: number | string | null | undefined): string {
  const n = toNumberOrNull(value);
  if (n === null) return "-";

  // Round to 2 decimals (cents)
  const rounded2 = Math.round(n * 100) / 100;
  const isInt = Number.isInteger(rounded2);
  let fractionDigits: number;
  if (isInt) {
    fractionDigits = 0;
  } else {
    const cents = Math.round(Math.abs(rounded2) * 100) % 100;
    fractionDigits = cents % 10 === 0 ? 1 : 2;
  }

  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };

  return "$" + rounded2.toLocaleString(undefined, opts);
}
