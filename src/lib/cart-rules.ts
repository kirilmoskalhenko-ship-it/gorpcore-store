import { getProduct, stockFor } from "./catalog";
import type { CartLine } from "./types";

export type CartResult = { ok: true } | { ok: false; reason: string };

/** Максимально допустимое количество строки: остаток размера, а для unique — не больше 1. */
export function maxQty(productId: string, size: string): number {
  const p = getProduct(productId);
  if (!p) return 0;
  const stock = stockFor(p, size);
  return p.unique ? Math.min(1, stock) : stock;
}

/** Можно ли выставить строке (productId, size) количество `qty`. */
export function checkQty(productId: string, size: string, qty: number): CartResult {
  const p = getProduct(productId);
  if (!p) return { ok: false, reason: "Товар не найден в каталоге" };
  if (p.price === null) return { ok: false, reason: "Цена уточняется — товар пока нельзя купить" };
  if (!p.variants.some((v) => v.size === size)) return { ok: false, reason: `Размер ${size} не существует` };
  const max = maxQty(productId, size);
  if (max <= 0) return { ok: false, reason: "SOLD OUT — товара нет в наличии" };
  if (qty > max)
    return {
      ok: false,
      reason: p.unique ? "Единственный экземпляр — уже в корзине" : `В наличии только ${max} шт. размера ${size}`,
    };
  if (qty < 1) return { ok: false, reason: "Количество должно быть не меньше 1" };
  return { ok: true };
}

export function lineQty(lines: CartLine[], productId: string, size: string) {
  return lines.find((l) => l.productId === productId && l.size === size)?.qty ?? 0;
}

export interface LineIssue {
  productId: string;
  size: string;
  reason: string;
  /** Сколько можно оставить (0 — убрать строку). */
  allowed: number;
}

/** Проверка доступности всей корзины против текущих остатков. */
export function validateLines(lines: CartLine[]): LineIssue[] {
  const issues: LineIssue[] = [];
  for (const l of lines) {
    const res = checkQty(l.productId, l.size, l.qty);
    if (!res.ok) issues.push({ productId: l.productId, size: l.size, reason: res.reason, allowed: Math.min(l.qty, maxQty(l.productId, l.size)) });
  }
  return issues;
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + (getProduct(l.productId)?.price ?? 0) * l.qty, 0);
}
