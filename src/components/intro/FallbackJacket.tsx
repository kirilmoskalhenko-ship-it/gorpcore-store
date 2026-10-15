"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { siteConfig } from "@/config/site-config";
import { shade } from "@/lib/color";
import type { IntroArtwork, IntroRendererHandle } from "./types";

/**
 * Fallback-режим: векторная куртка в двух слоях. Каждый слой — та же куртка, обрезанная clip-path
 * по своей стороне от разреза. Разрез — V-кривая от горловины до бегунка; на кромках видна
 * подкладка (отвороты) и зубцы молнии. Фон заставки имеет такое же отверстие (evenodd),
 * поэтому сквозь разрез видна настоящая витрина под слоем.
 */

const ZX = 500;
const Z_TOP = 276;
const Z_BOT = 1132;

export const FALLBACK_ARTWORK: IntroArtwork = {
  x: 110,
  y: 40,
  width: 780,
  height: 1140,
  zipX: ZX,
  zipTop: Z_TOP,
  zipBottom: Z_BOT,
};

const OUTLINE =
  "M500 68 C570 70 622 160 604 276 L700 300 C760 330 790 400 800 470 L850 960 L752 990 L690 560 L692 1130 Q500 1152 308 1130 L310 560 L248 990 L150 960 L200 470 C210 400 240 330 300 300 L396 276 C378 160 430 70 500 68 Z";
const FACE = "M432 262 C418 180 455 122 500 120 C545 122 582 180 568 262 Q500 282 432 262 Z";

const N = 32;
const OV = 1.5; // перекрытие половин там, где разреза нет — чтобы не было шва сглаживания
const FAR = 4000;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const f = (n: number) => n.toFixed(1);

function geometry(p: number) {
  const yS = Z_TOP + p * (Z_BOT - Z_TOP);
  const maxHalf = 116 * easeOut(Math.min(1, p * 1.5));
  const pts: { y: number; hw: number }[] = [];
  if (yS - Z_TOP > 0.5) {
    for (let i = 0; i <= N; i++) {
      const y = Z_TOP + (yS - Z_TOP) * (i / N);
      const t = (yS - y) / (yS - Z_TOP);
      pts.push({ y, hw: maxHalf * Math.pow(t, 0.85) });
    }
  }
  return { yS, pts };
}

// Начальная геометрия (прогресс 0) — чтобы куртка и фон были видны ещё до гидрации.
const INIT_BG = `M${-FAR} ${-FAR} H${FAR} V${FAR} H${-FAR} Z`;
const INIT_CLIP_L = `M${-FAR} ${-FAR} H${ZX + OV} V${FAR} H${-FAR} Z`;
const INIT_CLIP_R = `M${FAR} ${-FAR} H${ZX - OV} V${FAR} H${FAR} Z`;
const INIT_CLOSED = `M${ZX} ${Z_TOP} V${Z_BOT}`;

export function FallbackJacket({ ref }: { ref?: Ref<IntroRendererHandle> }) {
  const c = siteConfig.intro.jacket;
  const svgRef = useRef<SVGSVGElement>(null);
  const els = useRef<Map<string, SVGElement>>(new Map());

  useImperativeHandle(ref, () => ({
    render(p, exit) {
      const svg = svgRef.current;
      if (!svg) return;
      if (!els.current.size) svg.querySelectorAll<SVGElement>("[data-z]").forEach((el) => els.current.set(el.dataset.z!, el));
      const node = (k: string) => ({ current: els.current.get(k) ?? null });
      const r = {
        clipL: node("clipL"),
        clipR: node("clipR"),
        bg: node("bg"),
        lapelL: node("lapelL"),
        lapelR: node("lapelR"),
        teethL: node("teethL"),
        teethR: node("teethR"),
        tapeL: node("tapeL"),
        tapeR: node("tapeR"),
        closed: node("closed"),
        closedTape: node("closedTape"),
        closedTeeth: node("closedTeeth"),
        halfL: node("halfL"),
        halfR: node("halfR"),
      };

      const { yS, pts } = geometry(p);
      const open = pts.length > 0;

      // клипы половин
      let dl = `M${-FAR} ${-FAR} H${ZX + OV} V${Z_TOP}`;
      let dr = `M${FAR} ${-FAR} H${ZX - OV} V${Z_TOP}`;
      for (const { y, hw } of pts) {
        const ov = hw < 0.5 ? OV : 0;
        dl += ` L${f(ZX - hw + ov)} ${f(y)}`;
        dr += ` L${f(ZX + hw - ov)} ${f(y)}`;
      }
      dl += ` L${ZX + OV} ${f(yS)} V${FAR} H${-FAR} Z`;
      dr += ` L${ZX - OV} ${f(yS)} V${FAR} H${FAR} Z`;
      r.clipL.current?.setAttribute("d", dl);
      r.clipR.current?.setAttribute("d", dr);

      // фон с отверстием
      let bg = `M${-FAR} ${-FAR} H${FAR} V${FAR} H${-FAR} Z`;
      if (open) {
        bg += ` M${pts.map(({ y, hw }) => `${f(ZX - hw)} ${f(y)}`).join(" L")}`;
        bg += ` L${[...pts].reverse().map(({ y, hw }) => `${f(ZX + hw)} ${f(y)}`).join(" L")} Z`;
      }
      r.bg.current?.setAttribute("d", bg);

      // отвороты (подкладка) и зубцы на кромках
      if (open) {
        const lw = (hw: number) => Math.min(hw * 0.5, 64);
        const left = pts.map(({ y, hw }) => `${f(ZX - hw)} ${f(y)}`).join(" L");
        const leftBack = [...pts].reverse().map(({ y, hw }) => `${f(ZX - hw - lw(hw))} ${f(y)}`).join(" L");
        const right = pts.map(({ y, hw }) => `${f(ZX + hw)} ${f(y)}`).join(" L");
        const rightBack = [...pts].reverse().map(({ y, hw }) => `${f(ZX + hw + lw(hw))} ${f(y)}`).join(" L");
        r.lapelL.current?.setAttribute("d", `M${left} L${leftBack} Z`);
        r.lapelR.current?.setAttribute("d", `M${right} L${rightBack} Z`);
        const tl = `M${pts.map(({ y, hw }) => `${f(ZX - hw + 4)} ${f(y)}`).join(" L")}`;
        const tr = `M${pts.map(({ y, hw }) => `${f(ZX + hw - 4)} ${f(y)}`).join(" L")}`;
        r.teethL.current?.setAttribute("d", tl);
        r.tapeL.current?.setAttribute("d", tl);
        r.teethR.current?.setAttribute("d", tr);
        r.tapeR.current?.setAttribute("d", tr);
      } else {
        for (const el of [r.lapelL, r.lapelR, r.teethL, r.teethR, r.tapeL, r.tapeR]) el.current?.setAttribute("d", "");
      }

      // закрытая часть молнии ниже бегунка
      const closed = `M${ZX} ${f(yS)} V${Z_BOT}`;
      r.closedTape.current?.setAttribute("d", closed);
      r.closedTeeth.current?.setAttribute("d", closed);

      // финал: половины расходятся, фон гаснет
      const e = easeOut(exit);
      r.halfL.current?.setAttribute("transform", `translate(${f(-e * 1100)} ${f(e * 60)}) rotate(${f(-e * 14)} 300 300)`);
      r.halfR.current?.setAttribute("transform", `translate(${f(e * 1100)} ${f(e * 60)}) rotate(${f(e * 14)} 700 300)`);
      r.bg.current?.setAttribute("opacity", f(1 - Math.min(1, exit * 1.6)));
      r.closed.current?.setAttribute("opacity", exit > 0 ? "0" : "1");
    },
  }));

  const a = FALLBACK_ARTWORK;
  const trim = c.trim;
  const seam = shade(c.shell, -0.22);

  const jacketArt = (
    <g>
      <path d={OUTLINE} fill={c.shell} />
      <path d={OUTLINE} fill="url(#aa-light)" />
      {/* капюшон */}
      <path d={FACE} fill={c.lining} />
      <path d={FACE} fill="none" stroke={shade(c.shell, -0.3)} strokeWidth={10} />
      <path d="M440 262 L432 336 M560 262 L568 336" stroke={trim} strokeWidth={3} fill="none" />
      <rect x={424} y={334} width={16} height={22} rx={5} fill={trim} />
      <rect x={560} y={334} width={16} height={22} rx={5} fill={trim} />
      {/* швы и детали */}
      <path d="M300 300 Q400 386 500 376 Q600 386 700 300" stroke={seam} strokeWidth={2.5} fill="none" />
      <path d="M200 470 Q262 520 310 560 M800 470 Q738 520 690 560" stroke={seam} strokeWidth={2.5} fill="none" />
      <path d="M488 276 V1132 M512 276 V1132" stroke={seam} strokeWidth={2} fill="none" opacity={0.7} />
      <path d="M356 430 L444 408" stroke={trim} strokeWidth={5} strokeLinecap="round" />
      <rect x={440} y={402} width={10} height={20} rx={3} fill={c.zipper} transform="rotate(-14 445 412)" />
      <path d="M344 760 L384 906 M656 760 L616 906" stroke={trim} strokeWidth={5} strokeLinecap="round" />
      <path d="M190 700 Q214 688 238 704 M810 700 Q786 688 762 704" stroke={seam} strokeWidth={2.5} fill="none" />
      {/* манжеты и низ */}
      <path d="M150 960 L248 990 L253 948 L158 920 Z M850 960 L752 990 L747 948 L842 920 Z" fill={shade(c.shell, -0.18)} />
      <path d="M308 1130 Q500 1152 692 1130 L691 1098 Q500 1120 309 1098 Z" fill={shade(c.shell, -0.15)} />
      <circle cx={332} cy={1116} r={7} fill={trim} />
      <circle cx={668} cy={1116} r={7} fill={trim} />
      {/* складки ткани */}
      <g stroke="#000" strokeOpacity={0.12} strokeWidth={6} fill="none" strokeLinecap="round">
        <path d="M382 500 Q404 640 372 780" />
        <path d="M612 520 Q592 660 626 800" />
        <path d="M218 560 Q232 640 206 724" />
        <path d="M782 560 Q768 640 794 724" />
        <path d="M430 950 Q450 1030 430 1090" />
      </g>
      <path d={OUTLINE} fill="none" stroke={shade(c.shell, -0.35)} strokeWidth={2} />
    </g>
  );

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 h-full w-full"
      viewBox={`${a.x} ${a.y} ${a.width} ${a.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="aa-light" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="aa-lining-l" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={shade(c.lining, -0.35)} />
          <stop offset="1" stopColor={c.lining} />
        </linearGradient>
        <linearGradient id="aa-lining-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(c.lining, -0.35)} />
          <stop offset="1" stopColor={c.lining} />
        </linearGradient>
        <filter id="aa-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#1c211b" floodOpacity="0.22" />
        </filter>
        <clipPath id="aa-clip-l" clipPathUnits="userSpaceOnUse">
          <path data-z="clipL" d={INIT_CLIP_L} />
        </clipPath>
        <clipPath id="aa-clip-r" clipPathUnits="userSpaceOnUse">
          <path data-z="clipR" d={INIT_CLIP_R} />
        </clipPath>
      </defs>

      <path data-z="bg" d={INIT_BG} fill={siteConfig.colors.background} fillRule="evenodd" />

      <g data-z="halfL">
        <g clipPath="url(#aa-clip-l)" filter="url(#aa-shadow)">
          {jacketArt}
          <path data-z="lapelL" fill="url(#aa-lining-l)" />
        </g>
        <path data-z="tapeL" fill="none" stroke={trim} strokeWidth={11} />
        <path data-z="teethL" fill="none" stroke={c.zipper} strokeWidth={7} strokeDasharray="3 3" />
      </g>
      <g data-z="halfR">
        <g clipPath="url(#aa-clip-r)" filter="url(#aa-shadow)">
          {jacketArt}
          <path data-z="lapelR" fill="url(#aa-lining-r)" />
        </g>
        <path data-z="tapeR" fill="none" stroke={trim} strokeWidth={11} />
        <path data-z="teethR" fill="none" stroke={c.zipper} strokeWidth={7} strokeDasharray="3 3" />
      </g>

      <g data-z="closed">
        <path data-z="closedTape" d={INIT_CLOSED} stroke={trim} strokeWidth={16} fill="none" />
        <path data-z="closedTeeth" d={INIT_CLOSED} stroke={c.zipper} strokeWidth={9} strokeDasharray="3 3" fill="none" />
      </g>
    </svg>
  );
}
