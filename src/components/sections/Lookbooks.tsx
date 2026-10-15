"use client";

import { ArrowRight } from "lucide-react";
import { HotspotLayer } from "@/components/lookbook/HotspotLayer";
import { ProductImage } from "@/components/ui/ProductImage";
import { Reveal } from "@/components/ui/Reveal";
import { TopoLines } from "@/components/ui/TopoLines";
import { siteConfig } from "@/config/site-config";
import { getProduct, hasPrice, isSoldOut, lookbooks } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Lookbook } from "@/lib/types";
import { useUI } from "@/store/ui";

function LookbookCard({ look, index }: { look: Lookbook; index: number }) {
  const setProduct = useUI((s) => s.setProduct);
  const openLook = useUI((s) => s.openLook);
  const items = look.productIds.map(getProduct).filter((p) => !!p);
  const total = items.filter((p) => !isSoldOut(p)).filter(hasPrice).reduce((s, p) => s + p.price, 0);

  return (
    <article className="group w-[82vw] shrink-0 snap-center sm:w-auto" data-testid={`lookbook-${look.id}`} aria-labelledby={`look-${look.id}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <ProductImage
          src={look.image.src}
          alt={look.image.alt}
          fill
          sizes="(min-width:1280px) 31vw, (min-width:640px) 47vw, 82vw"
          className="object-cover"
        />
        <HotspotLayer lookbookId={look.id} image={look.image} hotspots={look.hotspots} fit="cover" onOpen={setProduct} />
        <span className="eyebrow pointer-events-none absolute left-3 top-3 bg-paper/80 px-2 py-1 text-ink backdrop-blur-sm">
          {String(index + 1).padStart(2, "0")} / {String(lookbooks.length).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id={`look-${look.id}`} className="text-[15px] font-medium tracking-[0.14em]">
            {look.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-muted">{look.description}</p>
        </div>
        <span className="shrink-0 pt-0.5 text-[13px] text-muted">{items.length} items</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <button
          type="button"
          className="btn"
          onClick={() => openLook(look.id)}
          data-testid={`shop-the-look-${look.id}`}
        >
          SHOP THE LOOK <ArrowRight className="size-3.5" strokeWidth={1.25} />
        </button>
        {total > 0 && <span className="text-[13px] text-muted">от {formatPrice(total)}</span>}
      </div>
    </article>
  );
}

export function Lookbooks() {
  const lb = siteConfig.lookbook;
  return (
    <section id="lookbook" className="relative overflow-hidden py-24 md:py-36" aria-labelledby="lookbook-title">
      <TopoLines className="absolute -left-[30%] top-0 w-[900px] opacity-25" rings={8} />
      <div className="px-gutter relative">
        <Reveal className="mb-12 grid gap-6 md:mb-20 md:grid-cols-[1fr_minmax(0,420px)] md:items-end">
          <div>
            <p className="eyebrow mb-5">{lb.eyebrow}</p>
            <h2 id="lookbook-title" className="display text-[clamp(2.8rem,8vw,7.5rem)]">
              {lb.title}
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-muted">{lb.intro}</p>
        </Reveal>
      </div>

      {/* телефон: горизонтальная галерея; планшет: 2 колонки; широкий экран: 3 колонки */}
      <div className="px-gutter no-scrollbar relative -mb-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-6 sm:gap-y-20 sm:overflow-visible xl:grid-cols-3">
        {lookbooks.map((look, i) => (
          <Reveal key={look.id} delay={(i % 3) * 0.08} className="contents sm:block">
            <LookbookCard look={look} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
