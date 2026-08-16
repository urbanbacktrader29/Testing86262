export function formatCurrency(value: number | null | undefined, opts: { maxDigits?: number } = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  const maxDigits = opts.maxDigits ?? (value < 1 ? 6 : 2);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("de-DE", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
