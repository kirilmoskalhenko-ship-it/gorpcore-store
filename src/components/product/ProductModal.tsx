"use client";

import { Check, Minus } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ProductImage } from "@/components/ui/ProductImage";
import { siteConfig } from "@/config/site-config";
import { CATEGORY_LABELS, CONDITION_LABELS, CONDITION_PENDING, defaultSize, galleryImages, getProduct, hasPrice, imageFitClass, isSoldOut, stockAlert, stockFor, totalStock } from "@/lib/catalog";
import { lineQty, maxQty } from "@/lib/cart-rules";
import { priceLabel } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";

export function ProductModal() {
  const productId = useUI((s) => s.productId);
  const setProduct = useUI((s) => s.setProduct);
  const product = getProduct(productId);
  return (
    <Sheet open={!!product} onClose={() => setProduct(null)} variant="center" label={product ? `${product.brand} ${product.model}` : "Товар"} testId="product-modal">
      {product && <ProductDetails key={product.id} product={product} />}
    </Sheet>
  );
}

function ProductDetails({ product: p }: { product: Product }) {
  const [size, setSize] = useState(() => defaultSize(p));
  const [slide, setSlide] = useState(0);
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => lineQty(s.lines, p.id, size));
  const notify = useUI((s) => s.notify);
  const soldOut = isSoldOut(p);
  const sizeStock = stockFor(p, size);
  const limit = maxQty(p.id, size);
  const reachedLimit = inCart >= limit && limit > 0;
  const priced = hasPrice(p);
  const gallery = galleryImages(p);
  const alert = stockAlert(p);

  const onAdd = () => {
    const res = add(p.id, size);
    if (res.ok) notify(`${p.model} · ${size} — в корзине`);
    else notify(res.reason, "error");
  };

  let cta = "ADD TO BAG";
  if (!priced) cta = "ЦЕНА УТОЧНЯЕТСЯ";
  else if (soldOut) cta = "SOLD OUT";
  else if (sizeStock <= 0) cta = "РАЗМЕРА НЕТ";
  else if (reachedLimit) cta = p.unique ? "УЖЕ В КОРЗИНЕ" : "МАКСИМУМ В КОРЗИНЕ";

  return (
    <div className="grid h-full overflow-y-auto overscroll-contain md:grid-cols-[1.15fr_1fr] md:overflow-hidden">
      {/* галерея */}
      <div className="relative bg-surface md:h-[88dvh] md:max-h-[88dvh] md:overflow-y-auto md:overscroll-contain">
        <div
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:block md:overflow-visible"
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
        >
          {gallery.map(({ src, kind }, i) => (
            <div key={src} className="relative aspect-[3/4] w-full shrink-0 snap-center">
              <ProductImage
                src={src}
                alt={`${p.brand} ${p.model} — фото ${i + 1}`}
                fill
                sizes="(min-width:768px) 55vw, 100vw"
                preload={i === 0}
                className={imageFitClass(kind)}
              />
            </div>
          ))}
        </div>
        {gallery.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5 md:hidden" aria-hidden>
            {gallery.map(({ src }, i) => (
              <span key={src} className={`h-[2px] w-6 transition-colors ${i === slide ? "bg-ink" : "bg-ink/20"}`} />
            ))}
          </div>
        )}
        {soldOut && (
          <span className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] bg-ink px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] text-paper md:top-4">
            SOLD OUT
          </span>
        )}
      </div>

      {/* информация */}
      <div className="flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-8 md:h-[88dvh] md:overflow-y-auto md:px-10 md:pt-14">
        <p className="eyebrow">
          {p.brand} · {CATEGORY_LABELS[p.category]}
        </p>
        <h2 className="mt-3 text-[clamp(1.7rem,3vw,2.4rem)] font-light leading-[1.05] tracking-[-0.02em]" data-testid="product-title">
          {p.model}
        </h2>
        <p className="mt-4 text-[20px]" data-testid="product-price">
          {priceLabel(p)}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-5 text-[14px]">
          <div>
            <dt className="eyebrow">Состояние</dt>
            <dd className="mt-1">{p.condition ? CONDITION_LABELS[p.condition] : CONDITION_PENDING}</dd>
          </div>
          <div>
            <dt className="eyebrow">Наличие</dt>
            <dd className="mt-1" data-testid="product-availability">
              {soldOut ? "Нет в наличии" : p.unique ? "Единственный экземпляр" : `${totalStock(p)} шт.`}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Цвет</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="size-3 rounded-full ring-1 ring-line" style={{ background: p.color.hex }} />
              {p.color.name}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Артикул</dt>
            <dd className="mt-1 font-mono text-[12px]">{p.id.toUpperCase()}</dd>
          </div>
        </dl>

        <fieldset className="mt-7">
          <legend className="eyebrow mb-3">Размер</legend>
          {p.variants.every((v) => v.size === "—") ? (
            <p className="text-[14px] text-muted">Размер уточняется</p>
          ) : (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Размер">
            {p.variants.map((v) => {
              const out = v.stock <= 0;
              return (
                <button
                  key={v.size}
                  type="button"
                  role="radio"
                  aria-checked={size === v.size}
                  disabled={out}
                  onClick={() => setSize(v.size)}
                  className={`chip relative min-w-12 justify-center ${out ? "text-muted line-through opacity-50" : ""}`}
                  data-testid={`size-${v.size}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
          )}
          {alert && (
            <p className="mt-4 flex items-center gap-2 bg-alert/10 px-3 py-2 text-[13px] text-alert" data-testid="stock-alert-modal">
              <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-alert" aria-hidden />
              {alert.kind === "last-size"
                ? `Остался последний размер — ${alert.size}. Скоро закончится`
                : `Скоро закончится: осталось ${alert.left} шт.`}
            </p>
          )}
          {!alert && !soldOut && sizeStock > 0 && !p.unique && sizeStock <= 2 && (
            <p className="mt-3 text-[13px] text-moss">Осталось {sizeStock} шт. этого размера</p>
          )}
        </fieldset>

        <button
          type="button"
          className="btn btn-solid mt-8 h-14 w-full"
          disabled={!priced || soldOut || sizeStock <= 0 || reachedLimit}
          onClick={onAdd}
          data-testid="add-to-bag"
        >
          {reachedLimit && !soldOut ? <Check className="size-4" strokeWidth={1.5} /> : null}
          {cta}
        </button>
        {!priced && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted" data-testid="price-pending">
            Цена и размер уточняются. Напишите нам —{" "}
            <a className="link-line text-ink" href={`mailto:${siteConfig.contacts.email}?subject=${encodeURIComponent(`${p.brand} ${p.model}`)}`}>
              {siteConfig.contacts.email}
            </a>
          </p>
        )}
        {inCart > 0 && (
          <p className="mt-3 text-[13px] text-muted">
            В корзине: {inCart} шт. {p.unique ? "· больше одного добавить нельзя" : ""}
          </p>
        )}

        <div className="mt-9 space-y-4 text-[15px] leading-relaxed">
          <p>{p.description}</p>
          {p.details?.length ? (
            <ul className="space-y-1.5 text-[14px] text-muted">
              {p.details.map((d) => (
                <li key={d} className="flex items-center gap-2">
                  <Minus className="size-3" strokeWidth={1.25} /> {d}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {p.demo && siteConfig.demoCatalog && (
          <p className="mt-auto pt-10 text-[12px] leading-relaxed text-muted" data-testid="demo-notice">
            {siteConfig.demoNotice}
          </p>
        )}
      </div>
    </div>
  );
}
