"use client";

import { ProductImage } from "@/components/ui/ProductImage";
import { CONDITION_LABELS, galleryImages, hasPrice, imageFitClass, inStockSizes, isSoldOut, stockAlert } from "@/lib/catalog";
import { priceLabel } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useUI } from "@/store/ui";

export function ProductCard({ product: p }: { product: Product }) {
  const setProduct = useUI((s) => s.setProduct);
  const soldOut = isSoldOut(p);
  const [first, second] = galleryImages(p);
  const alert = stockAlert(p);
  const sizes = inStockSizes(p).filter((s) => s !== "—" && s !== "ONE SIZE");
  const meta = [p.condition ? CONDITION_LABELS[p.condition] : null, sizes.length ? sizes.join(" · ") : null].filter(Boolean);
  return (
    <article className="group" data-testid={`product-card-${p.id}`}>
      <button type="button" onClick={() => setProduct(p.id)} className="block w-full text-left" aria-label={`${p.brand} ${p.model}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-surface">
          <ProductImage
            src={first?.src}
            alt=""
            fill
            sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw"
            className={`${imageFitClass(first?.kind ?? "photo")} transition-[opacity,transform] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03] ${
              soldOut ? "opacity-55" : ""
            } ${second ? "group-hover:opacity-0" : ""}`}
          />
          {second && (
            <ProductImage
              src={second.src}
              alt=""
              fill
              sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw"
              className={`${imageFitClass(second.kind)} opacity-0 transition-opacity duration-700 group-hover:opacity-100`}
            />
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {soldOut && <span className="bg-ink px-2 py-1 font-mono text-[10px] tracking-[0.16em] text-paper">SOLD OUT</span>}
            {!soldOut && p.unique && (
              <span className="bg-paper/85 px-2 py-1 font-mono text-[10px] tracking-[0.16em] backdrop-blur-sm">1 OF 1</span>
            )}
            {alert && (
              <span
                className="flex items-center gap-1.5 bg-alert px-2 py-1 font-mono text-[10px] tracking-[0.14em] text-paper"
                data-testid="stock-alert"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-paper" aria-hidden />
                {alert.label}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow truncate">{p.brand}</p>
            <h3 className="mt-1 truncate text-[14px] md:text-[15px]">{p.model}</h3>
          </div>
          <p
            className={`shrink-0 text-right ${hasPrice(p) ? "text-[14px]" : "max-w-[7rem] text-[12px] leading-tight text-muted"} ${
              soldOut ? "text-muted line-through" : ""
            }`}
          >
            {priceLabel(p)}
          </p>
        </div>
        {meta.length > 0 && <p className="mt-1 text-[12px] text-muted">{meta.join(" · ")}</p>}
      </button>
    </article>
  );
}
