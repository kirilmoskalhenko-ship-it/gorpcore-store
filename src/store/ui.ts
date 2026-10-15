"use client";

import { create } from "zustand";

export type CheckoutStep = "details" | "review" | "result";

interface Toast {
  id: number;
  message: string;
  tone: "default" | "error";
}

interface UIState {
  /** Открытая карточка товара (синхронизируется с ?product=). */
  productId: string | null;
  /** Открытый список «Shop the look». */
  lookId: string | null;
  cartOpen: boolean;
  checkout: CheckoutStep | null;
  menuOpen: boolean;
  introOpen: boolean;
  toast: Toast | null;

  setProduct: (id: string | null) => void;
  openLook: (id: string | null) => void;
  setCartOpen: (open: boolean) => void;
  setCheckout: (step: CheckoutStep | null) => void;
  setMenuOpen: (open: boolean) => void;
  setIntroOpen: (open: boolean) => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: () => void;
}

let toastSeq = 0;

export const useUI = create<UIState>()((set) => ({
  productId: null,
  lookId: null,
  cartOpen: false,
  checkout: null,
  menuOpen: false,
  introOpen: false,
  toast: null,

  setProduct: (productId) => set({ productId }),
  openLook: (lookId) => set({ lookId }),
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setCheckout: (checkout) => set({ checkout, cartOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setIntroOpen: (introOpen) => set({ introOpen }),
  notify: (message, tone = "default") => set({ toast: { id: ++toastSeq, message, tone } }),
  dismissToast: () => set({ toast: null }),
}));
