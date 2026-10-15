"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { checkQty, lineQty, validateLines, type CartResult } from "@/lib/cart-rules";
import type { CartLine } from "@/lib/types";

interface CartState {
  lines: CartLine[];
  add: (productId: string, size: string, qty?: number) => CartResult;
  setQty: (productId: string, size: string, qty: number) => CartResult;
  remove: (productId: string, size: string) => void;
  /** Привести корзину к текущим остаткам: уменьшить количества, убрать недоступное. */
  reconcile: () => void;
  clear: () => void;
}

const same = (l: CartLine, productId: string, size: string) => l.productId === productId && l.size === size;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (productId, size, qty = 1) => {
        const lines = get().lines;
        const next = lineQty(lines, productId, size) + qty;
        const res = checkQty(productId, size, next);
        if (!res.ok) return res;
        set({
          lines: lines.some((l) => same(l, productId, size))
            ? lines.map((l) => (same(l, productId, size) ? { ...l, qty: next } : l))
            : [...lines, { productId, size, qty }],
        });
        return res;
      },
      setQty: (productId, size, qty) => {
        const res = checkQty(productId, size, qty);
        if (!res.ok) return res;
        set({ lines: get().lines.map((l) => (same(l, productId, size) ? { ...l, qty } : l)) });
        return res;
      },
      remove: (productId, size) => set({ lines: get().lines.filter((l) => !same(l, productId, size)) }),
      reconcile: () => {
        const issues = validateLines(get().lines);
        if (!issues.length) return;
        set({
          lines: get()
            .lines.map((l) => {
              const issue = issues.find((i) => same(l, i.productId, i.size));
              return issue ? { ...l, qty: issue.allowed } : l;
            })
            .filter((l) => l.qty > 0),
        });
      },
      clear: () => set({ lines: [] }),
    }),
    {
      name: "aa:cart:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      skipHydration: true,
    },
  ),
);

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);
