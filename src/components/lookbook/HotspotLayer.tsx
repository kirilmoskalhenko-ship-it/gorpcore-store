"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ProductImage } from "@/components/ui/ProductImage";
import { getProduct, isSoldOut } from "@/lib/catalog";
import { priceLabel } from "@/lib/format";
import { renderedImageRect, shapeBounds, toContainerPoints, type ObjectFit, type Rect } from "@/lib/hotspots";
import type { Hotspot, LookbookImage } from "@/lib/types";
import { useCoarsePointer } from "@/hooks/useMedia";

interface Props {
  lookbookId: string;
  image: LookbookImage;
  hotspots: Hotspot[];
  fit?: ObjectFit;
  onOpen: (productId: string) => void;
}

/**
 * Интерактивные зоны поверх фотографии. Координаты — проценты исходного кадра;
 * перед отрисовкой пересчитываются через фактическую область картинки при object-fit.
 * Мышь: наведение показывает карточку, клик открывает товар.
 * Палец: первое касание выбирает вещь, касание карточки (или повторное касание вещи) открывает товар.
 */
export function HotspotLayer({ lookbookId, image, hotspots, fit = "cover", onOpen }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const coarse = useCoarsePointer();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setBox({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // касание вне выбранной вещи снимает выбор
  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setActive(null);
        setPinned(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pinned]);

  const imgRect: Rect | null = box ? renderedImageRect(box, image, fit) : null;
  const activeSpot = hotspots.find((h) => h.id === active);
  const activeProduct = getProduct(activeSpot?.productId);

  const pointerType = useRef<string>("mouse");
  const leaveTimer = useRef<number | undefined>(undefined);
  const cancelLeave = () => window.clearTimeout(leaveTimer.current);
  const scheduleLeave = () => {
    cancelLeave();
    leaveTimer.current = window.setTimeout(() => {
      if (!pinned) setActive(null);
    }, 180);
  };
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const onShapeClick = (spot: Hotspot) => {
    const touch = pointerType.current !== "mouse" || coarse;
    if (!touch || (active === spot.id && pinned)) {
      onOpen(spot.productId);
      return;
    }
    setActive(spot.id);
    setPinned(true);
  };

  // позиция карточки: над вещью, по центру её рамки; не выходит за края
  let card: { left: number; top: number; below: boolean } | null = null;
  if (imgRect && box && activeSpot) {
    const b = shapeBounds(activeSpot.shape);
    const cx = imgRect.x + ((b.x + b.w / 2) / 100) * imgRect.width;
    const top = imgRect.y + (b.y / 100) * imgRect.height;
    const bottom = imgRect.y + ((b.y + b.h) / 100) * imgRect.height;
    const W = Math.min(240, box.width - 24);
    const left = Math.min(Math.max(cx - W / 2, 12), box.width - W - 12);
    const below = top < 120;
    card = { left, top: below ? Math.min(bottom + 10, box.height - 100) : Math.max(top - 10, 0), below };
  }

  return (
    <div
      ref={ref}
      className="absolute inset-0"
      onMouseLeave={() => {
        if (!pinned) setActive(null);
      }}
      data-testid={`hotspots-${lookbookId}`}
    >
      {imgRect && (
        <svg
          className="absolute left-0 top-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${box!.width} ${box!.height}`}
          role="group"
          aria-label="Вещи на фотографии"
        >
          {hotspots.map((spot) => {
            const p = getProduct(spot.productId);
            if (!p) return null;
            const pts = toContainerPoints(spot.shape, imgRect)
              .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
              .join(" ");
            const isActive = active === spot.id;
            return (
              <polygon
                key={spot.id}
                points={pts}
                data-testid={`hotspot-${lookbookId}-${spot.productId}`}
                data-product={spot.productId}
                tabIndex={0}
                role="button"
                aria-label={`${p.brand} ${p.model}, ${priceLabel(p)}${isSoldOut(p) ? ", sold out" : ""}`}
                className={`cursor-pointer outline-none transition-[fill,stroke] duration-300 ${
                  isActive ? "fill-white/10 stroke-white/90" : "fill-transparent stroke-transparent focus-visible:stroke-white/90"
                }`}
                strokeWidth={1}
                strokeDasharray="4 4"
                onMouseEnter={() => {
                  cancelLeave();
                  if (!pinned) setActive(spot.id);
                }}
                onMouseLeave={scheduleLeave}
                onFocus={() => setActive(spot.id)}
                onPointerDown={(e: ReactPointerEvent) => {
                  pointerType.current = e.pointerType;
                }}
                onClick={() => onShapeClick(spot)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(spot.productId);
                  }
                }}
              />
            );
          })}
        </svg>
      )}

      {/* метки-точки: подсказка, что вещи кликабельны */}
      {imgRect &&
        hotspots.map((spot) => {
          const b = shapeBounds(spot.shape);
          const x = imgRect.x + ((b.x + b.w / 2) / 100) * imgRect.width;
          const y = imgRect.y + ((b.y + b.h / 2) / 100) * imgRect.height;
          return (
            <span
              key={spot.id}
              aria-hidden
              className={`pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper shadow-[0_0_0_4px_rgba(247,247,243,.35)] transition-opacity duration-300 ${
                active === spot.id ? "opacity-0" : "opacity-90"
              }`}
              style={{ left: x, top: y }}
            />
          );
        })}

      {card && activeProduct && (
        <button
          type="button"
          data-testid="hotspot-card"
          onClick={() => onOpen(activeProduct.id)}
          onMouseEnter={cancelLeave}
          onMouseLeave={scheduleLeave}
          className={`absolute z-10 flex w-[min(240px,calc(100%-24px))] items-center gap-3 bg-paper/95 p-2 pr-3 text-left shadow-[0_18px_50px_-20px_rgba(20,25,20,.55)] backdrop-blur-md transition-opacity duration-200 ${
            card.below ? "" : "-translate-y-full"
          }`}
          style={{ left: card.left, top: card.top }}
        >
          <span className="relative block aspect-[3/4] w-12 shrink-0 overflow-hidden bg-surface">
            <ProductImage src={activeProduct.cutout ?? activeProduct.images[0]} alt="" fill sizes="48px" className="object-contain p-1" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] leading-tight">{activeProduct.model}</span>
            <span className="mt-0.5 block text-[12px] text-muted">
              {isSoldOut(activeProduct) ? <span className="text-alert">SOLD OUT</span> : priceLabel(activeProduct)}
            </span>
            <span className="mt-1 flex items-center gap-1 font-mono text-[10px] tracking-[0.16em]">
              VIEW ITEM <ArrowUpRight className="size-3" strokeWidth={1.5} />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
