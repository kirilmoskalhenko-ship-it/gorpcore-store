"use client";

import Image from "next/image";
import { Copy, Trash2, X } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { lookbooks, products } from "@/lib/catalog";
import { round1, shapePoints } from "@/lib/hotspots";
import type { Hotspot, HotspotShape, Lookbook } from "@/lib/types";

/**
 * Визуальный редактор интерактивных зон лукбука.
 * Компонент не сохраняет данные сам: он отдаёт JSON зон (onChange / кнопка Copy JSON),
 * который вставляется в lookbooks.json или отправляется защищённым API админки.
 *
 * Использование в будущей админ-панели (только за авторизацией!):
 *   <LookbookHotspotEditor lookbook={lb} onChange={(hotspots) => save(lb.id, hotspots)} />
 *
 * Режимы: Rect — протянуть прямоугольник; Polygon — клики по точкам, двойной клик / Enter завершает.
 */
export function LookbookHotspotEditor({ lookbook, onChange }: { lookbook: Lookbook; onChange?: (hotspots: Hotspot[]) => void }) {
  const [spots, setSpots] = useState<Hotspot[]>(lookbook.hotspots);
  const [mode, setMode] = useState<"rect" | "polygon">("rect");
  const [productId, setProductId] = useState(lookbook.productIds[0] ?? products[0]?.id ?? "");
  const [draft, setDraft] = useState<HotspotShape | null>(null);
  const [copied, setCopied] = useState(false);
  const start = useRef<[number, number] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Редактор работает в координатах исходного кадра: контейнер имеет его пропорции (object-fit не нужен).
  const toPct = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = boxRef.current!.getBoundingClientRect();
    return [round1(((e.clientX - r.left) / r.width) * 100), round1(((e.clientY - r.top) / r.height) * 100)];
  };

  const commit = (list: Hotspot[]) => {
    setSpots(list);
    onChange?.(list);
  };
  const addShape = (shape: HotspotShape) => {
    const n = spots.length + 1;
    commit([...spots, { id: `h${n}-${Date.now().toString(36)}`, productId, shape }]);
    setDraft(null);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const pt = toPct(e);
    if (mode === "rect") {
      e.currentTarget.setPointerCapture(e.pointerId);
      start.current = pt;
      setDraft({ type: "rect", x: pt[0], y: pt[1], w: 0, h: 0 });
    } else {
      setDraft((d) => (d?.type === "polygon" ? { type: "polygon", points: [...d.points, pt] } : { type: "polygon", points: [pt] }));
    }
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (mode !== "rect" || !start.current) return;
    const [x2, y2] = toPct(e);
    const [x1, y1] = start.current;
    setDraft({ type: "rect", x: Math.min(x1, x2), y: Math.min(y1, y2), w: round1(Math.abs(x2 - x1)), h: round1(Math.abs(y2 - y1)) });
  };
  const onUp = () => {
    if (mode !== "rect" || !start.current) return;
    start.current = null;
    if (draft?.type === "rect" && draft.w > 1 && draft.h > 1) addShape(draft);
    else setDraft(null);
  };
  const finishPolygon = () => {
    if (draft?.type === "polygon" && draft.points.length >= 3) addShape(draft);
  };

  const json = JSON.stringify(spots, null, 2);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]" onKeyDown={(e) => e.key === "Enter" && finishPolygon()}>
      <div
        ref={boxRef}
        className="relative w-full cursor-crosshair touch-none select-none bg-surface"
        style={{ aspectRatio: `${lookbook.image.width} / ${lookbook.image.height}` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onDoubleClick={finishPolygon}
        tabIndex={0}
      >
        <Image src={lookbook.image.src} alt="" fill sizes="420px" className="pointer-events-none object-fill" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {spots.map((s) => (
            <polygon
              key={s.id}
              points={shapePoints(s.shape).map((p) => p.join(",")).join(" ")}
              className="fill-moss/25 stroke-paper"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {draft && (
            <polygon
              points={shapePoints(draft).map((p) => p.join(",")).join(" ")}
              className="fill-paper/30 stroke-ink"
              strokeWidth={0.4}
              strokeDasharray="1 1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>

      <div className="space-y-5 text-[13px]">
        <div className="flex flex-wrap gap-2">
          {(["rect", "polygon"] as const).map((m) => (
            <button key={m} type="button" className="chip" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "rect" ? "Rect" : "Polygon"}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="eyebrow">Товар для новой зоны</span>
          <select className="field" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} — {p.model}
              </option>
            ))}
          </select>
        </label>
        {mode === "polygon" && <p className="text-muted">Кликайте по контуру вещи; двойной клик или Enter — завершить.</p>}
        <ul className="divide-y divide-line border-y border-line">
          {spots.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span className="font-mono text-[12px]">
                {s.productId} · {s.shape.type}
              </span>
              <button type="button" onClick={() => commit(spots.filter((x) => x.id !== s.id))} aria-label="Удалить зону" className="p-1">
                <Trash2 className="size-4" strokeWidth={1.25} />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void navigator.clipboard?.writeText(json).then(() => setCopied(true));
          }}
        >
          <Copy className="size-3.5" strokeWidth={1.25} /> {copied ? "Copied" : "Copy JSON"}
        </button>
        <pre className="max-h-64 overflow-auto bg-surface p-3 font-mono text-[11px]">{json}</pre>
      </div>
    </div>
  );
}

/** Dev-панель: /?hotspot-editor=1 в `npm run dev`. В production-сборку не попадает. */
export function LookbookHotspotEditorDevPanel() {
  const [id, setId] = useState(lookbooks[0]?.id ?? "");
  const [open, setOpen] = useState(true);
  const lb = lookbooks.find((l) => l.id === id);
  if (!open || !lb) return null;
  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-paper p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Dev only · не публикуется</p>
          <h2 className="mt-1 text-[22px] font-light">Lookbook hotspot editor</h2>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="p-2">
          <X className="size-5" strokeWidth={1.25} />
        </button>
      </div>
      <select className="field mb-6 max-w-sm" value={id} onChange={(e) => setId(e.target.value)}>
        {lookbooks.map((l) => (
          <option key={l.id} value={l.id}>
            {l.title}
          </option>
        ))}
      </select>
      <LookbookHotspotEditor key={lb.id} lookbook={lb} />
    </div>
  );
}
