"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { FitSlot } from "@/lib/catalog";

export interface FitPick {
  productId: string;
  size: string;
}

interface FitState {
  picks: Partial<Record<FitSlot, FitPick>>;
  setPick: (slot: FitSlot, pick: FitPick | null) => void;
  setSize: (slot: FitSlot, size: string) => void;
  reset: () => void;
}

export const useFit = create<FitState>()(
  persist(
    (set, get) => ({
      picks: {},
      setPick: (slot, pick) => {
        const picks = { ...get().picks };
        if (pick) picks[slot] = pick;
        else delete picks[slot];
        set({ picks });
      },
      setSize: (slot, size) => {
        const cur = get().picks[slot];
        if (cur) set({ picks: { ...get().picks, [slot]: { ...cur, size } } });
      },
      reset: () => set({ picks: {} }),
    }),
    { name: "aa:fit:v1", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
