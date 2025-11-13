export function toNumberOrNull(
  value: number | string | null | undefined
): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
export function formatSignificant(
  value: number | string | null | undefined,
  sig = 5
): string {
  const n = toNumberOrNull(value);
  if (n === null) return "-";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  const magnitude = Math.floor(Math.log10(abs));
  const decimals = Math.max(0, sig - magnitude - 1);

  // Use toFixed to get the right number of decimals, then drop useless trailing zeros
  const fixed = Number(n.toFixed(decimals));

  // toString preserves small numbers and avoids scientific notation in many cases
  return fixed.toString();
}

export function formatUsd(value: number | string | null | undefined): string {
  const n = toNumberOrNull(value);
  if (n === null) return "-";

  // Round to 1 decimal
  const rounded = Math.round(n * 10) / 10;

  const isInt = Number.isInteger(rounded);
  const opts: Intl.NumberFormatOptions = isInt
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 1, maximumFractionDigits: 1 };

  return "$" + rounded.toLocaleString(undefined, opts);
}
