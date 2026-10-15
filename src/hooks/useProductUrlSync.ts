"use client";

import { useEffect } from "react";
import { getProduct } from "@/lib/catalog";
import { useUI } from "@/store/ui";

const PARAM = "product";
const STATE_KEY = "aaProduct";

function urlWith(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(PARAM, id);
  else url.searchParams.delete(PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Синхронизирует открытую карточку товара с `?product=<id>`:
 * открытие — pushState, закрытие — history.back() (если запись наша), «Назад» в браузере закрывает карточку.
 */
export function useProductUrlSync() {
  useEffect(() => {
    let fromUrl = false;

    const applyUrl = () => {
      const id = new URLSearchParams(window.location.search).get(PARAM);
      const exists = !!getProduct(id);
      fromUrl = true;
      useUI.getState().setProduct(exists ? id : null);
      fromUrl = false;
      if (id && !exists) {
        window.history.replaceState(window.history.state, "", urlWith(null));
        useUI.getState().notify("Товар не найден — возможно, ссылка устарела", "error");
      }
    };

    applyUrl();
    window.addEventListener("popstate", applyUrl);

    const unsub = useUI.subscribe((s, prev) => {
      if (fromUrl || s.productId === prev.productId) return;
      const current = new URLSearchParams(window.location.search).get(PARAM);
      if (s.productId) {
        if (current === s.productId) return;
        if (current) window.history.replaceState({ ...window.history.state, [STATE_KEY]: s.productId }, "", urlWith(s.productId));
        else window.history.pushState({ [STATE_KEY]: s.productId }, "", urlWith(s.productId));
      } else if (current) {
        if (window.history.state?.[STATE_KEY]) window.history.back();
        else window.history.replaceState(window.history.state, "", urlWith(null));
      }
    });

    return () => {
      window.removeEventListener("popstate", applyUrl);
      unsub();
    };
  }, []);
}
