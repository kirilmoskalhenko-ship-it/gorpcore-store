"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/config/site-config";
import { allSizes, brands, CATEGORY_LABELS, isSoldOut, priceBounds, products, usedCategories } from "@/lib/catalog";
import { formatPrice, pluralRu } from "@/lib/format";
import { CATEGORIES, type Category } from "@/lib/types";

type Sort = "featured" | "price-asc" | "price-desc";

interface Filters {
  category: Category | "all";
  brands: string[];
  sizes: string[];
  maxPrice: number;
  inStock: boolean;
  sort: Sort;
}

const initial: Filters = {
  category: "all",
  brands: [],
  sizes: [],
  maxPrice: priceBounds.max,
  inStock: false,
  sort: "featured",
};

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const PRICE_STEP = 500;
const priceMax = Math.ceil(priceBounds.max / PRICE_STEP) * PRICE_STEP;

export function Catalog() {
  const [f, setF] = useState<Filters>({ ...initial, maxPrice: priceMax });
  const [panel, setPanel] = useState(false);

  const filtered = useMemo(() => {
    const list = products.filter(
      (p) =>
        (f.category === "all" || p.category === f.category) &&
        (!f.brands.length || f.brands.includes(p.brand)) &&
        (!f.sizes.length || p.variants.some((v) => f.sizes.includes(v.size) && (!f.inStock || v.stock > 0))) &&
        (f.maxPrice >= priceMax || (p.price !== null && p.price <= f.maxPrice)) &&
        (!f.inStock || !isSoldOut(p)),
    );
    const priceOf = (p: (typeof list)[number], empty: number) => p.price ?? empty;
    if (f.sort === "price-asc") return [...list].sort((a, b) => priceOf(a, Infinity) - priceOf(b, Infinity));
    if (f.sort === "price-desc") return [...list].sort((a, b) => priceOf(b, -Infinity) - priceOf(a, -Infinity));
    // featured: в наличии — выше
    return [...list].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)));
  }, [f]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    products.forEach((p) => c[p.category]++);
    return c;
  }, []);

  const sizes = allSizes.filter((s) => s !== "—");
  const activeCount = f.brands.length + f.sizes.length + (f.maxPrice < priceMax ? 1 : 0) + (f.inStock ? 1 : 0);
  const reset = () => setF({ ...initial, maxPrice: priceMax, category: f.category, sort: f.sort });

  return (
    <section id="shop" className="py-24 md:py-36" aria-labelledby="shop-title">
      <div className="px-gutter">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-14">
          <div>
            <p className="eyebrow mb-5">{siteConfig.shop.eyebrow}</p>
            <h2 id="shop-title" className="display text-[clamp(2.8rem,8vw,7.5rem)]">
              {siteConfig.shop.title}
            </h2>
          </div>
          {siteConfig.demoCatalog && <p className="max-w-xs text-[13px] leading-relaxed text-muted">{siteConfig.demoNotice}</p>}
        </Reveal>

        {/* категории */}
        <div className="no-scrollbar -mx-[max(1.25rem,env(safe-area-inset-left))] mb-8 flex gap-2 overflow-x-auto px-[max(1.25rem,env(safe-area-inset-left))] md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Категории">
          {(["all", ...usedCategories] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={f.category === c}
              onClick={() => setF({ ...f, category: c })}
              className="chip shrink-0"
              data-testid={`category-${c}`}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
              <span className="ml-1.5 text-[11px] opacity-60">{c === "all" ? products.length : counts[c]}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
          {/* фильтры */}
          <div>
            <div className="flex items-center justify-between lg:hidden">
              <button type="button" className="btn" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-controls="filters">
                <SlidersHorizontal className="size-3.5" strokeWidth={1.25} /> Filters {activeCount ? `(${activeCount})` : ""}
              </button>
              <SortSelect value={f.sort} onChange={(sort) => setF({ ...f, sort })} />
            </div>
            <div id="filters" className={`${panel ? "mt-6 block" : "hidden"} space-y-8 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:block`}>
              <FilterGroup title="Бренд">
                {brands.map((b) => (
                  <button key={b} type="button" className="chip" aria-pressed={f.brands.includes(b)} onClick={() => setF({ ...f, brands: toggle(f.brands, b) })}>
                    {b}
                  </button>
                ))}
              </FilterGroup>
              <FilterGroup title="Размер">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip min-w-11 justify-center"
                    aria-pressed={f.sizes.includes(s)}
                    onClick={() => setF({ ...f, sizes: toggle(f.sizes, s) })}
                    data-testid={`filter-size-${s}`}
                  >
                    {s}
                  </button>
                ))}
              </FilterGroup>
              {priceBounds.max > 0 && (
              <div>
                <label htmlFor="price" className="eyebrow mb-3 flex justify-between">
                  <span>Цена до</span>
                  <span className="text-ink">{formatPrice(f.maxPrice)}</span>
                </label>
                <input
                  id="price"
                  type="range"
                  min={Math.floor(priceBounds.min / PRICE_STEP) * PRICE_STEP}
                  max={priceMax}
                  step={PRICE_STEP}
                  value={f.maxPrice}
                  onChange={(e) => setF({ ...f, maxPrice: Number(e.target.value) })}
                  className="w-full accent-[var(--aa-accent)]"
                  data-testid="filter-price"
                />
              </div>
              )}
              <label className="flex cursor-pointer items-center gap-3 text-[14px]">
                <input
                  type="checkbox"
                  checked={f.inStock}
                  onChange={(e) => setF({ ...f, inStock: e.target.checked })}
                  className="size-4 accent-[var(--aa-accent)]"
                  data-testid="filter-in-stock"
                />
                Только в наличии
              </label>
              {activeCount > 0 && (
                <button type="button" onClick={reset} className="link-line inline-flex items-center gap-1.5 text-[13px]">
                  <X className="size-3.5" strokeWidth={1.25} /> Сбросить фильтры
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="mb-6 hidden items-center justify-between lg:flex">
              <p className="text-[13px] text-muted" data-testid="catalog-count">
                {filtered.length} {pluralRu(filtered.length, "товар", "товара", "товаров")}
              </p>
              <SortSelect value={f.sort} onChange={(sort) => setF({ ...f, sort })} />
            </div>
            <p className="mb-6 text-[13px] text-muted lg:hidden">
              {filtered.length} {pluralRu(filtered.length, "товар", "товара", "товаров")}
            </p>
            {filtered.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 2xl:grid-cols-4" data-testid="catalog-grid">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4 border-t border-line py-16">
                <p className="text-[15px]">Ничего не найдено по выбранным фильтрам.</p>
                <button type="button" className="btn" onClick={reset}>
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function SortSelect({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="sr-only">Сортировка</span>
      <select value={value} onChange={(e) => onChange(e.target.value as Sort)} className="min-h-11 bg-transparent pr-1 text-base focus:outline-none md:text-[13px]">
        <option value="featured">Сначала в наличии</option>
        <option value="price-asc">Цена ↑</option>
        <option value="price-desc">Цена ↓</option>
      </select>
    </label>
  );
}
