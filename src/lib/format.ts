import { siteConfig } from "@/config/site-config";

const rub = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => rub.format(value);

/** Цена товара или «Цена уточняется». */
export const priceLabel = (p: { price: number | null }) => (p.price === null ? "Цена уточняется" : rub.format(p.price));

export function pluralRu(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
