"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Checkout } from "@/components/cart/Checkout";
import { ShopTheLook } from "@/components/lookbook/ShopTheLook";
import { ProductModal } from "@/components/product/ProductModal";
import { Toast } from "@/components/ui/Toast";
import { useProductUrlSync } from "@/hooks/useProductUrlSync";
import { useCart } from "@/store/cart";
import { useFit } from "@/store/fit";

// Редактор зон существует только в dev-сборке и открывается по ?hotspot-editor=1.
// В production код не попадает в бандл (условие вычисляется при сборке).
const HotspotEditorDev =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@/components/lookbook/LookbookHotspotEditor").then((m) => m.LookbookHotspotEditorDevPanel), { ssr: false })
    : () => null;

const subscribeNoop = () => () => {};

/** Модальные слои, восстановление корзины из localStorage и синхронизация URL. */
export function Overlays() {
  useProductUrlSync();
  useEffect(() => {
    // после восстановления убираем позиции, которых больше нет в каталоге или в наличии
    void Promise.resolve(useCart.persist.rehydrate()).then(() => useCart.getState().reconcile());
    void useFit.persist.rehydrate();
    const sync = (e: StorageEvent) => {
      if (e.key === "aa:cart:v1") void useCart.persist.rehydrate();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const editor = useSyncExternalStore(
    subscribeNoop,
    () => new URLSearchParams(window.location.search).get("hotspot-editor") === "1",
    () => false,
  );

  return (
    <>
      <ProductModal />
      <ShopTheLook />
      <CartDrawer />
      <Checkout />
      <Toast />
      {editor && <HotspotEditorDev />}
    </>
  );
}
