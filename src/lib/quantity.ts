export function scaleQuantity(
  quantity: number | null,
  baseServings: number,
  targetServings: number,
  scalable: boolean,
): number | null {
  if (quantity == null || !scalable || baseServings <= 0 || targetServings <= 0) return quantity;
  return Math.round((quantity * targetServings * 100) / baseServings) / 100;
}

export function formatQuantity(value: number | null, locale: "fr" | "en"): string {
  if (value == null) return "";
  return new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", {
    maximumFractionDigits: 2,
  }).format(value);
}
