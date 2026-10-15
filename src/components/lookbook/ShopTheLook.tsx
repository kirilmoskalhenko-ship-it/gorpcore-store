"use client";

import { Sheet } from "@/components/ui/Sheet";
import { ProductImage } from "@/components/ui/ProductImage";
import { defaultSize, getLookbook, getProduct, hasPrice, isOneSize, isSoldOut } from "@/lib/catalog";
import { priceLabel } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";

/** Список всех вещей образа. В корзину попадают только реальные товары каталога и только в наличии. */
export function ShopTheLook() {
  const lookId = useUI((s) => s.lookId);
  const openLook = useUI((s) => s.openLook);
  const setProduct = useUI((s) => s.setProduct);
  const notify = useUI((s) => s.notify);
  const add = useCart((s) => s.add);
  const look = getLookbook(lookId);
  const items = (look?.productIds ?? []).map(getProduct).filter((p) => !!p);

  const addAvailableOneSize = () => {
    let added = 0;
    const skipped: string[] = [];
    for (const p of items) {
      if (isSoldOut(p) || !hasPrice(p)) continue;
      if (!isOneSize(p)) {
        skipped.push(p.model);
        continue;
      }
      if (add(p.id, defaultSize(p)).ok) added++;
    }
    notify(
      added
        ? `Добавлено: ${added}.${skipped.length ? ` Выберите размер: ${skipped.join(", ")}` : ""}`
        : skipped.length
          ? `Выберите размер в карточке: ${skipped.join(", ")}`
          : "Нечего добавить: вещи уже в корзине, закончились или цена ещё уточняется",
    );
  };

  return (
    <Sheet open={!!look} onClose={() => openLook(null)} variant="right" label={`Shop the look ${look?.title ?? ""}`} testId="shop-the-look">
      {look && (
        <>
          <div className="pt-safe border-b border-line px-6 pb-5">
            <p className="eyebrow mt-6">Shop the look</p>
            <h2 className="mt-2 pr-12 text-[22px] font-light tracking-[0.06em]">{look.title}</h2>
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-6">
            {items.map((p) => {
              const soldOut = isSoldOut(p);
              return (
                <li key={p.id} className="flex gap-4 py-5">
                  <button
                    type="button"
                    onClick={() => {
                      openLook(null);
                      setProduct(p.id);
                    }}
                    className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-surface"
                    aria-label={`Открыть ${p.model}`}
                  >
                    <ProductImage src={p.cutout ?? p.images[0]} alt="" fill sizes="80px" className={`object-contain p-1.5 ${soldOut ? "opacity-50" : ""}`} />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="eyebrow">{p.brand}</p>
                    <p className="mt-1 text-[15px]">{p.model}</p>
                    <p className="mt-1 text-[14px] text-muted">
                      {soldOut ? <span className="font-mono text-[11px] tracking-[0.16em] text-alert">SOLD OUT</span> : priceLabel(p)}
                    </p>
                    <button
                      type="button"
                      className="link-line mt-auto self-start pt-2 font-mono text-[11px] tracking-[0.16em]"
                      onClick={() => {
                        openLook(null);
                        setProduct(p.id);
                      }}
                    >
                      VIEW ITEM
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="pb-safe border-t border-line px-6 py-5">
            <button type="button" className="btn btn-solid w-full" onClick={addAvailableOneSize}>
              ADD AVAILABLE TO BAG
            </button>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Вещи с выбором размера добавляются из карточки товара. Проданные позиции не добавляются.
            </p>
          </div>
        </>
      )}
    </Sheet>
  );
}
