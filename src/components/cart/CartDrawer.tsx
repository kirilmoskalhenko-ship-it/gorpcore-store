"use client";

import { AlertCircle, Minus, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ProductImage } from "@/components/ui/ProductImage";
import { siteConfig } from "@/config/site-config";
import { getProduct } from "@/lib/catalog";
import { cartTotal, maxQty, validateLines } from "@/lib/cart-rules";
import { formatPrice } from "@/lib/format";
import { selectCount, useCart } from "@/store/cart";
import { useUI } from "@/store/ui";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const setOpen = useUI((s) => s.setCartOpen);
  const setCheckout = useUI((s) => s.setCheckout);
  const setProduct = useUI((s) => s.setProduct);
  const notify = useUI((s) => s.notify);
  const lines = useCart((s) => s.lines);
  const count = useCart(selectCount);
  const { setQty, remove, reconcile } = useCart.getState();
  const issues = validateLines(lines);
  const total = cartTotal(lines);

  return (
    <Sheet open={open} onClose={() => setOpen(false)} variant="right" label="Корзина" testId="cart-drawer">
      <div className="pt-safe border-b border-line px-6 pb-5">
        <p className="eyebrow mt-6">Bag</p>
        <h2 className="mt-2 text-[22px] font-light tracking-[0.06em]">
          {count} {count === 1 ? "item" : "items"}
        </h2>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-5 px-6">
          <p className="text-[15px] text-muted">Корзина пуста.</p>
          <a href="#shop" className="btn" onClick={() => setOpen(false)}>
            Go to shop
          </a>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-6" data-testid="cart-lines">
          {lines.map((l) => {
            const p = getProduct(l.productId);
            const issue = issues.find((i) => i.productId === l.productId && i.size === l.size);
            const max = maxQty(l.productId, l.size);
            return (
              <li key={`${l.productId}-${l.size}`} className="flex gap-4 py-5" data-testid={`cart-line-${l.productId}`}>
                <button
                  type="button"
                  className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-surface"
                  onClick={() => {
                    if (!p) return;
                    setOpen(false);
                    setProduct(p.id);
                  }}
                  aria-label={p ? `Открыть ${p.model}` : "Товар недоступен"}
                >
                  <ProductImage src={p?.cutout ?? p?.images[0]} alt="" fill sizes="80px" className="object-contain p-1.5" />
                </button>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="eyebrow truncate">{p?.brand ?? "—"}</p>
                      <p className="mt-1 truncate text-[15px]">{p?.model ?? "Товар удалён из каталога"}</p>
                      <p className="mt-1 text-[13px] text-muted">Размер: {l.size}</p>
                    </div>
                    <p className="shrink-0 text-[14px]">{p?.price != null ? formatPrice(p.price * l.qty) : "—"}</p>
                  </div>
                  {issue && (
                    <p className="mt-2 flex items-start gap-1.5 text-[12px] text-alert">
                      <AlertCircle className="mt-px size-3.5 shrink-0" strokeWidth={1.5} /> {issue.reason}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    {max > 1 || l.qty > 1 ? (
                      <div className="flex items-center border border-line" aria-label="Количество">
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center disabled:opacity-30"
                          onClick={() => setQty(l.productId, l.size, l.qty - 1)}
                          disabled={l.qty <= 1}
                          aria-label="Уменьшить"
                        >
                          <Minus className="size-3.5" strokeWidth={1.25} />
                        </button>
                        <span className="w-8 text-center text-[14px]" data-testid="line-qty">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center disabled:opacity-30"
                          onClick={() => {
                            const r = setQty(l.productId, l.size, l.qty + 1);
                            if (!r.ok) notify(r.reason, "error");
                          }}
                          disabled={l.qty >= max}
                          aria-label="Увеличить"
                          data-testid="qty-inc"
                        >
                          <Plus className="size-3.5" strokeWidth={1.25} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted">{p?.unique ? "Единственный экземпляр" : "1 шт."}</span>
                    )}
                    <button
                      type="button"
                      className="link-line text-[13px] text-muted"
                      onClick={() => remove(l.productId, l.size)}
                      data-testid="remove-line"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lines.length > 0 && (
        <div className="pb-safe border-t border-line px-6 pt-5">
          {issues.length > 0 && (
            <div className="mb-4 bg-surface p-4 text-[13px]">
              <p>Часть товаров недоступна в нужном количестве.</p>
              <button type="button" className="link-line mt-2 font-medium" onClick={reconcile}>
                Обновить корзину по наличию
              </button>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Итого</span>
            <span className="text-[20px]" data-testid="cart-total">
              {formatPrice(total)}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">Доставка рассчитывается при оформлении.</p>
          <button
            type="button"
            className="btn btn-solid mb-5 mt-5 h-14 w-full"
            disabled={issues.length > 0}
            onClick={() => setCheckout("details")}
            data-testid="checkout-button"
          >
            CHECKOUT
          </button>
          {siteConfig.demoCatalog && <p className="-mt-2 mb-5 text-[11px] text-muted">{siteConfig.demoNotice}</p>}
        </div>
      )}
    </Sheet>
  );
}
