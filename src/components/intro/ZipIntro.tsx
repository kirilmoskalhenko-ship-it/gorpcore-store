"use client";

import gsap from "gsap";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { siteConfig } from "@/config/site-config";
import { useReducedMotion } from "@/hooks/useMedia";
import { FallbackJacket, FALLBACK_ARTWORK } from "./FallbackJacket";
import { FrameSequence, FRAMES_ARTWORK } from "./FrameSequence";
import { FullscreenZip, fullscreenArtwork } from "./FullscreenZip";
import { fitContain, type IntroArtwork, type IntroRendererHandle } from "./types";

const cfg = siteConfig.intro;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Входная заставка «Zip to enter». Пользователь тянет бегунок вниз по линии молнии:
 * Pointer Events + pointer capture, движение только по вертикали, прогресс 0..1 управляет
 * рендерером напрямую (без React-ререндеров на каждый кадр). Отпустили на середине —
 * прогресс сохраняется. При ≥ completeAt раскрытие довершается само.
 */
export function ZipIntro({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"frames" | "fallback">(cfg.frames.count > 0 ? "frames" : "fallback");
  const fullscreen = mode === "fallback" && cfg.style === "fullscreen";
  /** Система координат рендерера; у полноэкранного режима она равна размеру окна. */
  const artFor = useCallback(
    (box: { width: number; height: number }): IntroArtwork =>
      mode === "frames" ? FRAMES_ARTWORK : fullscreen ? fullscreenArtwork(box) : FALLBACK_ARTWORK,
    [mode, fullscreen],
  );
  const reduced = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const pullerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const renderer = useRef<IntroRendererHandle>(null);
  const state = useRef({ p: 0, exit: 0 });
  const drag = useRef<{ id: number; offset: number } | null>(null);
  const finishing = useRef(false);
  const [touched, setTouched] = useState(false);
  const [dragging, setDragging] = useState(false);

  /** Пересчёт координат кадра → экран и отрисовка текущего состояния. */
  const layout = useCallback(() => {
    const root = rootRef.current;
    const puller = pullerRef.current;
    if (!root) return;
    const { p, exit } = state.current;
    renderer.current?.render(p, exit);
    if (!puller) return;
    const rect = root.getBoundingClientRect();
    const art = artFor(rect);
    const fit = fitContain(rect, art);
    const y = art.zipTop + p * (art.zipBottom - art.zipTop);
    const sx = fit.offsetX + (art.zipX - art.x) * fit.scale;
    const sy = fit.offsetY + (y - art.y) * fit.scale;
    puller.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    // в полноэкранном режиме бегунок крупнее на больших экранах
    const zs = fullscreen ? Math.min(1.35, Math.max(0.85, rect.height / 760)) : Math.max(0.55, fit.scale);
    puller.style.setProperty("--zs", String(zs));
    puller.style.opacity = exit > 0 ? String(1 - Math.min(1, exit * 4)) : "1";
    puller.setAttribute("aria-valuenow", String(Math.round(p * 100)));
    if (labelRef.current) labelRef.current.textContent = `${String(Math.round(p * 100)).padStart(2, "0")}%`;
  }, [artFor, fullscreen]);

  const finish = useCallback(
    (fast = false) => {
      if (finishing.current) return;
      finishing.current = true;
      drag.current = null;
      setDragging(false);
      const s = state.current;
      const root = rootRef.current;
      if (reduced) {
        s.p = 1;
        layout();
        gsap.to(root, { opacity: 0, duration: 0.25, onComplete: onDone });
        return;
      }
      gsap
        .timeline({ onUpdate: layout, onComplete: onDone })
        .to(s, { p: 1, duration: fast ? 0.35 : 0.5, ease: "power2.out" })
        .to(s, { exit: 1, duration: 1.15, ease: "expo.inOut" }, fast ? 0.15 : 0.35)
        .to(root, { opacity: 0, duration: 0.45, ease: "power1.out" }, "-=0.45");
    },
    [layout, onDone, reduced],
  );

  const setProgress = useCallback(
    (p: number) => {
      state.current.p = clamp01(p);
      layout();
      if (state.current.p >= cfg.completeAt) finish();
    },
    [finish, layout],
  );

  // resize / поворот экрана: геометрия пересчитывается из текущего прогресса
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(root);
    window.addEventListener("orientationchange", layout);
    layout();
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", layout);
    };
  }, [layout]);

  // Esc — пропустить
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  useEffect(() => () => void gsap.killTweensOf(state.current), []);

  /** Экранная Y → координата кадра. */
  const currentArt = () => artFor(rootRef.current!.getBoundingClientRect());
  const toArtY = (clientY: number) => {
    const rect = rootRef.current!.getBoundingClientRect();
    const art = artFor(rect);
    const fit = fitContain(rect, art);
    return (clientY - rect.top - fit.offsetY) / fit.scale + art.y;
  };
  const currentArtY = () => {
    const art = currentArt();
    return art.zipTop + state.current.p * (art.zipBottom - art.zipTop);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (finishing.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // смещение захвата: бегунок не «прыгает» под палец
    drag.current = { id: e.pointerId, offset: toArtY(e.clientY) - currentArtY() };
    setDragging(true);
    setTouched(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    e.preventDefault();
    const art = currentArt();
    const y = toArtY(e.clientY) - d.offset;
    setProgress((y - art.zipTop) / (art.zipBottom - art.zipTop));
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // прогресс сохраняется там, где отпустили
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.2 : 0.06;
    const map: Record<string, number> = { ArrowDown: step, ArrowRight: step, PageDown: 0.25, ArrowUp: -step, ArrowLeft: -step, PageUp: -0.25 };
    if (e.key === "End" || e.key === "Enter") {
      e.preventDefault();
      setTouched(true);
      finish(true);
    } else if (e.key in map) {
      e.preventDefault();
      setTouched(true);
      setProgress(state.current.p + map[e.key]!);
    }
  };

  const showPuller = mode === "fallback" || cfg.frames.drawPuller;
  const ui = fullscreen ? "text-paper" : "text-ink";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ touchAction: "none" }}
      data-testid="zip-intro"
      data-mode={mode}
      role="dialog"
      aria-modal="true"
      aria-label="Заставка: расстегните куртку, чтобы войти в магазин"
    >
      {mode === "frames" ? (
        <FrameSequence ref={renderer} onError={() => setMode("fallback")} onReady={layout} />
      ) : fullscreen ? (
        <FullscreenZip ref={renderer} />
      ) : (
        <FallbackJacket ref={renderer} />
      )}

      {/* бегунок: зона захвата ≥ 64px, визуал масштабируется вместе с курткой */}
      <div
        ref={pullerRef}
        role="slider"
        tabIndex={0}
        aria-label="Бегунок молнии. Потяните вниз или нажимайте стрелку вниз"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-orientation="vertical"
        data-testid="zip-puller"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={onKeyDown}
        className={`absolute left-0 top-0 z-10 -ml-8 -mt-6 flex h-[calc(150px*var(--zs,1))] min-h-24 w-16 touch-none justify-center outline-none focus-visible:[&>svg]:drop-shadow-[0_0_0_2px_var(--aa-accent)] ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        // невидим до первого расчёта позиции (layout выставит opacity)
        style={{ willChange: "transform", opacity: 0 }}
      >
        {showPuller && (
          <svg
            viewBox="0 0 40 120"
            className="pointer-events-none mt-[calc(6px*var(--zs,1))] h-[calc(120px*var(--zs,1))] w-[calc(40px*var(--zs,1))] drop-shadow-[0_6px_8px_rgba(0,0,0,.28)]"
            aria-hidden
          >
            <defs>
              <linearGradient id="aa-metal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#8b8f88" />
                <stop offset=".45" stopColor="#e3e5df" />
                <stop offset="1" stopColor="#7d817a" />
              </linearGradient>
            </defs>
            <path d="M8 2 H32 Q36 2 35 7 L31 30 Q30 34 26 34 H14 Q10 34 9 30 L5 7 Q4 2 8 2 Z" fill="url(#aa-metal)" stroke="#5d615b" strokeWidth="1" />
            <rect x="15" y="26" width="10" height="12" rx="2" fill="#6f736c" />
            <rect x="11" y="34" width="18" height="82" rx="8" fill="url(#aa-metal)" stroke="#5d615b" strokeWidth="1" />
            <rect x="16" y="96" width="8" height="12" rx="4" fill="#5d615b" />
          </svg>
        )}
        {!touched && !reduced && (
          <span className="pointer-events-none absolute left-1/2 top-full mt-2 h-10 w-px -translate-x-1/2 overflow-hidden" aria-hidden>
            <span className={`block h-full w-full animate-[aa-hint_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent ${fullscreen ? "via-paper/80" : "via-ink/70"} to-transparent`} />
          </span>
        )}
      </div>

      {/* интерфейс заставки */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-gutter pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        {/* на полноэкранной ткани название напечатано крупно, а шапка сайта видна в разрезе */}
        <span className={`text-[12px] font-medium tracking-[0.22em] ${ui} ${fullscreen ? "invisible" : ""}`}>{siteConfig.name}</span>
        <button
          type="button"
          onClick={() => finish(true)}
          className={`pointer-events-auto -mr-2 -mt-2 min-h-11 px-2 font-mono text-[11px] tracking-[0.18em] underline-offset-4 hover:underline ${ui} ${fullscreen ? "rounded-full bg-ink/35 px-4 backdrop-blur-sm" : ""}`}
          data-testid="skip-intro"
        >
          SKIP INTRO
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-gutter pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <span className={`font-mono text-[11px] tracking-[0.18em] ${ui} transition-opacity duration-500 ${touched ? "opacity-0" : "opacity-100"}`}>
          {cfg.hint.toUpperCase()}
        </span>
        <span className={`font-mono text-[11px] tracking-[0.18em] ${ui}`}>
          UNZIP <span ref={labelRef}>00%</span>
        </span>
      </div>
    </div>
  );
}
