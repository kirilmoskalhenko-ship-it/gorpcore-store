"use client";

import { Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { ProductImage } from "@/components/ui/ProductImage";
import { Reveal } from "@/components/ui/Reveal";
import { siteConfig } from "@/config/site-config";
import {
  defaultSize,
  FIT_SLOT_LABELS,
  FIT_SLOTS,
  getProduct,
  isSoldOut,
  products,
  slotOf,
  stockFor,
  type FitSlot,
} from "@/lib/catalog";
import { lineQty, maxQty } from "@/lib/cart-rules";
import { formatPrice, priceLabel } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useFit } from "@/store/fit";
import { useUI } from "@/store/ui";

const DND_TYPE = "application/x-aa-product";

/** Раскладка слотов на поле (проценты). Порядок отрисовки — снизу вверх. */
const SLOT_BOX: Record<FitSlot, { x: number; y: number; w: number; h: number }> = {
  pants: { x: 60, y: 6, w: 34, h: 62 },
  outerwear: { x: 3, y: 21, w: 55, h: 47 },
  headwear: { x: 8, y: 3, w: 24, h: 16 },
  footwear: { x: 8, y: 72, w: 44, h: 22 },
  accessory: { x: 58, y: 72, w: 36, h: 22 },
};

export function FitBuilder() {
  const [tab, setTab] = useState<FitSlot>("outerwear");
  const [dragSlot, setDragSlot] = useState<FitSlot | null>(null);
  const [dropFlash, setDropFlash] = useState<FitSlot | null>(null);
  const picks = useFit((s) => s.picks);
  const { setPick, setSize, reset } = useFit.getState();
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const notify = useUI((s) => s.notify);
  const setProduct = useUI((s) => s.setProduct);

  // отбрасываем выбор, если товар исчез из каталога
  useEffect(() => {
    for (const slot of FIT_SLOTS) {
      const pick = useFit.getState().picks[slot];
      if (pick && !getProduct(pick.productId)) setPick(slot, null);
    }
  }, [setPick]);

  useEffect(() => {
    if (!dropFlash) return;
    const t = window.setTimeout(() => setDropFlash(null), 700);
    return () => window.clearTimeout(t);
  }, [dropFlash]);

  const rail = useMemo(
    () => products.filter((p) => slotOf(p) === tab).sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b))),
    [tab],
  );

  const choose = (productId: string) => {
    const p = getProduct(productId);
    if (!p) return;
    if (isSoldOut(p)) {
      notify(`${p.model} — SOLD OUT`, "error");
      return;
    }
    const slot = slotOf(p);
    setPick(slot, { productId: p.id, size: defaultSize(p) });
    setDropFlash(slot);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragSlot(null);
    const id = e.dataTransfer.getData(DND_TYPE) || e.dataTransfer.getData("text/plain");
    choose(id);
  };

  const chosen = FIT_SLOTS.map((slot) => ({ slot, pick: picks[slot], product: getProduct(picks[slot]?.productId) })).filter(
    (c): c is { slot: FitSlot; pick: NonNullable<typeof c.pick>; product: NonNullable<typeof c.product> } => !!c.pick && !!c.product,
  );
  const total = chosen.reduce((s, c) => s + (c.product.price ?? 0), 0);
  const pendingPrices = chosen.filter((c) => c.product.price === null).length;

  const addAll = () => {
    let added = 0;
    const problems: string[] = [];
    for (const { product, pick } of chosen) {
      if (product.price === null) {
        problems.push(`${product.model}: цена уточняется`);
        continue;
      }
      if (isSoldOut(product) || stockFor(product, pick.size) <= 0) {
        problems.push(`${product.model}: нет размера ${pick.size}`);
        continue;
      }
      if (lineQty(useCart.getState().lines, product.id, pick.size) >= maxQty(product.id, pick.size)) {
        problems.push(`${product.model}: уже в корзине`);
        continue;
      }
      const r = add(product.id, pick.size);
      if (r.ok) added++;
      else problems.push(`${product.model}: ${r.reason}`);
    }
    if (added) notify(`В корзину добавлено вещей: ${added}${problems.length ? `. Не добавлено: ${problems.join("; ")}` : ""}`);
    else notify(problems.length ? problems.join("; ") : "Выберите хотя бы одну вещь", "error");
  };

  return (
    <section id="build" className="bg-surface py-24 md:py-36" aria-labelledby="build-title">
      <div className="px-gutter">
        <Reveal className="mb-12 grid gap-6 md:mb-16 md:grid-cols-[1fr_minmax(0,420px)] md:items-end">
          <div>
            <p className="eyebrow mb-5">{siteConfig.fit.eyebrow}</p>
            <h2 id="build-title" className="display text-[clamp(2.8rem,8vw,7.5rem)]">
              {siteConfig.fit.title}
            </h2>
          </div>
          <p className="text-[15px] leading-relaxed text-muted">{siteConfig.fit.intro}</p>
        </Reveal>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,320px)] lg:gap-10">
          {/* выбор вещей */}
          <div className="order-2 lg:order-1">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 lg:flex-wrap" role="tablist" aria-label="Слоты образа">
              {FIT_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  role="tab"
                  aria-selected={tab === slot}
                  className="chip shrink-0"
                  onClick={() => setTab(slot)}
                  data-testid={`fit-tab-${slot}`}
                >
                  {FIT_SLOT_LABELS[slot]}
                  {picks[slot] ? <span className="ml-1.5 size-1.5 rounded-full bg-moss" aria-label="выбрано" /> : null}
                </button>
              ))}
            </div>
            <ul className="no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2 lg:grid lg:max-h-[640px] lg:grid-cols-2 lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
              {rail.map((p) => {
                const soldOut = isSoldOut(p);
                const selected = picks[slotOf(p)]?.productId === p.id;
                return (
                  <li key={p.id} className="w-32 shrink-0 lg:w-auto">
                    <button
                      type="button"
                      draggable={!soldOut}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DND_TYPE, p.id);
                        e.dataTransfer.setData("text/plain", p.id);
                        e.dataTransfer.effectAllowed = "copy";
                        setDragSlot(slotOf(p));
                      }}
                      onDragEnd={() => setDragSlot(null)}
                      onClick={() => choose(p.id)}
                      disabled={soldOut}
                      aria-pressed={selected}
                      className={`group block w-full text-left ${soldOut ? "opacity-45" : "cursor-grab active:cursor-grabbing"}`}
                      data-testid={`fit-item-${p.id}`}
                    >
                      <span className={`relative block aspect-square overflow-hidden bg-paper ring-1 transition ${selected ? "ring-ink" : "ring-transparent group-hover:ring-line"}`}>
                        <ProductImage src={p.cutout ?? p.images[0]} alt="" fill sizes="160px" className="object-contain p-3" draggable={false} />
                        {soldOut && <span className="absolute inset-x-0 bottom-0 bg-ink py-1 text-center font-mono text-[9px] tracking-[0.16em] text-paper">SOLD OUT</span>}
                      </span>
                      <span className="mt-2 block truncate text-[12.5px]">{p.model}</span>
                      <span className="block text-[12px] text-muted">{priceLabel(p)}</span>
                    </button>
                  </li>
                );
              })}
              {rail.length === 0 && <li className="py-6 text-[14px] text-muted">В этой категории пока нет вещей — скоро добавим.</li>}
            </ul>
          </div>

          {/* композиция */}
          <div
            className={`relative order-1 mx-auto aspect-[4/5] w-full max-w-[560px] overflow-hidden bg-[#b9b8b2] transition-shadow lg:order-2 ${
              dragSlot ? "shadow-[inset_0_0_0_2px_var(--aa-accent)]" : ""
            }`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DND_TYPE)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={onDrop}
            data-testid="fit-canvas"
            aria-label="Композиция образа"
          >
            <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(120%_90%_at_30%_20%,rgba(255,255,255,.35),transparent_60%),radial-gradient(80%_60%_at_80%_90%,rgba(0,0,0,.12),transparent_70%)]" />
            {(Object.keys(SLOT_BOX) as FitSlot[]).map((slot) => {
              const box = SLOT_BOX[slot];
              const product = getProduct(picks[slot]?.productId);
              const hot = dragSlot === slot;
              return (
                <div
                  key={slot}
                  className="absolute"
                  style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
                  data-testid={`fit-slot-${slot}`}
                >
                  {product ? (
                    <button
                      type="button"
                      className={`relative block h-full w-full transition-transform duration-500 ${dropFlash === slot ? "scale-[1.03]" : ""}`}
                      onClick={() => setProduct(product.id)}
                      aria-label={`${FIT_SLOT_LABELS[slot]}: ${product.model}`}
                    >
                      <ProductImage
                        src={product.cutout ?? product.images[0]}
                        alt={product.model}
                        fill
                        sizes="280px"
                        className="object-contain drop-shadow-[0_8px_14px_rgba(20,22,18,.28)]"
                        draggable={false}
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTab(slot)}
                      className={`flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed text-center transition-colors ${
                        hot ? "border-paper bg-paper/25 text-paper" : "border-paper/60 text-paper/85"
                      }`}
                    >
                      <Plus className="size-4" strokeWidth={1.25} />
                      <span className="font-mono text-[10px] tracking-[0.16em] uppercase">{FIT_SLOT_LABELS[slot]}</span>
                    </button>
                  )}
                </div>
              );
            })}
            <span className="pointer-events-none absolute bottom-2 right-3 font-mono text-[9px] tracking-[0.16em] text-paper/70">
              COMPOSITION PREVIEW
            </span>
          </div>

          {/* итог */}
          <div className="order-3">
            <p className="eyebrow mb-4">Your fit</p>
            {chosen.length === 0 ? (
              <p className="border-y border-line py-6 text-[14px] text-muted">Пока пусто. Выберите вещи слева или перетащите их на поле.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line" data-testid="fit-summary">
                {chosen.map(({ slot, pick, product }) => {
                  const sizeStock = stockFor(product, pick.size);
                  const already = lineQty(lines, product.id, pick.size);
                  return (
                    <li key={slot} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="eyebrow">{FIT_SLOT_LABELS[slot]}</p>
                          <p className="mt-1 truncate text-[14px]">{product.model}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={product.price === null ? "text-[12px] text-muted" : "text-[14px]"}>{priceLabel(product)}</span>
                          <button type="button" onClick={() => setPick(slot, null)} className="flex size-8 items-center justify-center text-muted hover:text-ink" aria-label={`Убрать ${product.model}`}>
                            <X className="size-3.5" strokeWidth={1.25} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        {product.variants.length > 1 ? (
                          <select
                            value={pick.size}
                            onChange={(e) => setSize(slot, e.target.value)}
                            className="min-h-9 border border-line bg-transparent px-2 text-base md:text-[13px]"
                            aria-label={`Размер ${product.model}`}
                          >
                            {product.variants.map((v) => (
                              <option key={v.size} value={v.size} disabled={v.stock <= 0}>
                                {v.size}
                                {v.stock <= 0 ? " — нет" : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[12px] text-muted">{pick.size}</span>
                        )}
                        {sizeStock <= 0 && <span className="text-[12px] text-alert">нет в наличии</span>}
                        {already > 0 && sizeStock > 0 && <span className="text-[12px] text-muted">в корзине: {already}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-5 flex items-baseline justify-between">
              <span className="eyebrow">Стоимость образа</span>
              <span className="text-[20px]" data-testid="fit-total">
                {formatPrice(total)}
              </span>
            </div>
            {pendingPrices > 0 && (
              <p className="mt-1 text-right text-[12px] text-muted">
                без {pendingPrices} {pendingPrices === 1 ? "вещи" : "вещей"} — цена уточняется
              </p>
            )}
            <button type="button" className="btn btn-solid mt-5 h-14 w-full" disabled={!chosen.length} onClick={addAll} data-testid="fit-add-all">
              ADD FULL FIT TO BAG
            </button>
            {chosen.length > 0 && (
              <button type="button" onClick={reset} className="link-line mt-4 inline-flex items-center gap-1.5 text-[13px] text-muted">
                <RotateCcw className="size-3.5" strokeWidth={1.25} /> Очистить образ
              </button>
            )}
            <p className="mt-6 text-[12px] leading-relaxed text-muted">
              Превью — композиция отдельных изображений товаров, а не фотография образа.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
