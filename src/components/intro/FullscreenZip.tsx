"use client";

import { useImperativeHandle, useRef, type Ref } from "react";
import { siteConfig } from "@/config/site-config";
import { shade } from "@/lib/color";
import type { IntroArtwork, IntroRendererHandle } from "./types";

/**
 * Полноэкранный режим: весь экран — ткань технической куртки, по центру молния.
 * Координаты — пиксели экрана (viewBox = размер окна), поэтому вид одинаково хорош
 * на телефоне и на широком мониторе. Ткань нарисована дважды (левая и правая половины)
 * с clip-path по V-разрезу; сквозь разрез видна настоящая витрина. На кромках — подкладка,
 * отстрочка, лента и зубцы; в финале половины разъезжаются в стороны.
 */

/** Верхняя точка хода бегунка (под строкой интерфейса) и нижняя. */
export function fullscreenArtwork(box: { width: number; height: number }): IntroArtwork {
  const top = Math.max(84, box.height * 0.11);
  return { x: 0, y: 0, width: box.width, height: box.height, zipX: box.width / 2, zipTop: top, zipBottom: box.height - 28 };
}

const N = 44;
const OV = 1; // перекрытие половин там, где разреза нет — без шва сглаживания
const FAR = 100000;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const f = (n: number) => n.toFixed(1);

export function FullscreenZip({ ref }: { ref?: Ref<IntroRendererHandle> }) {
  const c = siteConfig.intro.jacket;
  const svgRef = useRef<SVGSVGElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const els = useRef<Map<string, SVGElement>>(new Map());

  useImperativeHandle(ref, () => ({
    render(p, exit) {
      const svg = svgRef.current;
      if (!svg) return;
      if (!els.current.size) svg.querySelectorAll<SVGElement>("[data-z]").forEach((el) => els.current.set(el.dataset.z!, el));
      const set = (k: string, attr: string, v: string) => els.current.get(k)?.setAttribute(attr, v);

      const w = svg.clientWidth || window.innerWidth;
      const h = svg.clientHeight || window.innerHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const art = fullscreenArtwork({ width: w, height: h });
      const cx = art.zipX;
      const yS = art.zipTop + p * (art.zipBottom - art.zipTop);

      // V-разрез: от верхнего края экрана до бегунка, шире всего наверху
      const yStart = -24;
      const maxHalf = Math.min(w * 0.4, 520) * easeOut(Math.min(1, p * 1.25));
      const pts: { y: number; hw: number }[] = [];
      if (maxHalf > 0.3) {
        for (let i = 0; i <= N; i++) {
          const y = yStart + (yS - yStart) * (i / N);
          const t = (yS - y) / (yS - yStart);
          pts.push({ y, hw: maxHalf * Math.pow(t, 0.78) });
        }
      }
      const open = pts.length > 0;
      const L = (off: number) => pts.map(({ y, hw }) => `${f(cx - hw - off)} ${f(y)}`);
      const R = (off: number) => pts.map(({ y, hw }) => `${f(cx + hw + off)} ${f(y)}`);

      // клипы половин
      if (open) {
        set("clipL", "d", `M${-FAR} ${-FAR} H${f(cx - maxHalf)} V${yStart} L${L(0).join(" L")} L${f(cx + OV)} ${f(yS)} V${FAR} H${-FAR} Z`);
        set("clipR", "d", `M${FAR} ${-FAR} H${f(cx + maxHalf)} V${yStart} L${R(0).join(" L")} L${f(cx - OV)} ${f(yS)} V${FAR} H${FAR} Z`);
      } else {
        set("clipL", "d", `M${-FAR} ${-FAR} H${f(cx + OV)} V${FAR} H${-FAR} Z`);
        set("clipR", "d", `M${FAR} ${-FAR} H${f(cx - OV)} V${FAR} H${FAR} Z`);
      }

      // кромки: подкладка, отстрочка, лента с зубцами, тень на витрину
      const edgeKeys = ["lapelL", "lapelR", "stitchL", "stitchR", "tapeL", "tapeR", "teethL", "teethR", "shadowL", "shadowR"];
      if (open) {
        const lw = (hw: number) => Math.min(hw * 0.32, 110);
        const lapelL = `M${L(0).join(" L")} L${[...pts].reverse().map(({ y, hw }) => `${f(cx - hw - lw(hw))} ${f(y)}`).join(" L")} Z`;
        const lapelR = `M${R(0).join(" L")} L${[...pts].reverse().map(({ y, hw }) => `${f(cx + hw + lw(hw))} ${f(y)}`).join(" L")} Z`;
        set("lapelL", "d", lapelL);
        set("lapelR", "d", lapelR);
        set("stitchL", "d", `M${pts.map(({ y, hw }) => `${f(cx - hw - lw(hw) - 9)} ${f(y)}`).join(" L")}`);
        set("stitchR", "d", `M${pts.map(({ y, hw }) => `${f(cx + hw + lw(hw) + 9)} ${f(y)}`).join(" L")}`);
        const tl = `M${L(-6).join(" L")}`;
        const tr = `M${R(-6).join(" L")}`;
        set("tapeL", "d", tl);
        set("teethL", "d", tl);
        set("tapeR", "d", tr);
        set("teethR", "d", tr);
        set("shadowL", "d", `M${L(0).join(" L")}`);
        set("shadowR", "d", `M${R(0).join(" L")}`);
      } else {
        for (const k of edgeKeys) set(k, "d", "");
      }

      // закрытая часть ниже бегунка + отстрочка вдоль неё
      const closed = `M${f(cx)} ${f(Math.max(yS, art.zipTop))} V${h + 40}`;
      set("closedTape", "d", closed);
      set("closedTeeth", "d", closed);
      set("closedStitch", "d", `M${f(cx - 22)} ${f(yS)} V${h + 40} M${f(cx + 22)} ${f(yS)} V${h + 40}`);
      set("topStop", "transform", `translate(${f(cx)} ${f(art.zipTop)})`);

      // финал: половины уходят в стороны с лёгким поворотом
      const e = easeInOut(exit);
      set("halfL", "transform", `translate(${f(-e * w * 0.62)} 0) rotate(${f(e * 5)} 0 0)`);
      set("halfR", "transform", `translate(${f(e * w * 0.62)} 0) rotate(${f(-e * 5)} ${w} 0)`);
      set("closed", "opacity", exit > 0 ? String(Math.max(0, 1 - exit * 5)) : "1");

      set("topStop", "opacity", p > 0.004 ? "0" : "1");

      // базовый слой нужен только до первой отрисовки (до гидрации)
      const base = baseRef.current;
      if (base && base.style.display !== "none") base.style.display = "none";
    },
  }));

  const name = siteConfig.name.split(" ");
  const fabricArt = (
    <g>
      <rect width="100%" height="100%" fill={c.shell} />
      <rect width="100%" height="100%" fill="url(#fz-ripstop)" />
      <rect width="100%" height="100%" fill="url(#fz-folds)" />
      <rect width="100%" height="100%" fill="url(#fz-light)" />
      {/* печатная графика на ткани — разрезается молнией */}
      <text
        x="50%"
        y="44%"
        textAnchor="middle"
        fill={shade(c.shell, 0.18)}
        opacity={0.55}
        style={{ fontSize: "clamp(64px, 15vw, 260px)", fontWeight: 300, letterSpacing: "-0.04em" }}
      >
        {name[0]}
      </text>
      {name[1] && (
        <text
          x="50%"
          y="44%"
          dy="0.95em"
          textAnchor="middle"
          fill={shade(c.shell, 0.18)}
          opacity={0.55}
          style={{ fontSize: "clamp(64px, 15vw, 260px)", fontWeight: 300, letterSpacing: "-0.04em" }}
        >
          {name.slice(1).join(" ")}
        </text>
      )}
      {/* тканая бирка */}
      <g transform="translate(28 0)">
        <rect x="0" y="62%" width="118" height="30" rx="2" fill={c.trim} opacity={0.92} />
        <text x="59" y="62%" dy="19" textAnchor="middle" fill={c.zipper} style={{ fontSize: 10, letterSpacing: "0.22em", fontFamily: "var(--font-mono)" }}>
          {siteConfig.shortName}
        </text>
      </g>
    </g>
  );

  return (
    <div className="absolute inset-0" aria-hidden>
      {/* до гидрации: сплошная ткань и закрытая молния (CSS), чтобы не мелькала витрина */}
      <div ref={baseRef} className="absolute inset-0" style={{ background: c.shell }}>
        <div className="absolute inset-y-0 left-1/2 w-[18px] -translate-x-1/2" style={{ background: c.trim }} />
      </div>
      <svg ref={svgRef} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="fz-ripstop" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 0.5 H16 M0.5 0 V16" stroke="#000" strokeOpacity="0.07" strokeWidth="1" />
            <path d="M0 8.5 H16 M8.5 0 V16" stroke="#fff" strokeOpacity="0.035" strokeWidth="1" />
          </pattern>
          <linearGradient id="fz-folds" x1="0" y1="0" x2="1" y2="0.35">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.18" stopColor="#fff" stopOpacity="0.07" />
            <stop offset="0.27" stopColor="#000" stopOpacity="0.08" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="0.58" stopColor="#000" stopOpacity="0.06" />
            <stop offset="0.73" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="0.86" stopColor="#000" stopOpacity="0.09" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="fz-light" cx="0.25" cy="0.1" r="1.1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.3" />
          </radialGradient>
          <linearGradient id="fz-lining-l" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor={shade(c.lining, -0.45)} />
            <stop offset="0.6" stopColor={c.lining} />
            <stop offset="1" stopColor={shade(c.lining, 0.12)} />
          </linearGradient>
          <linearGradient id="fz-lining-r" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={shade(c.lining, -0.45)} />
            <stop offset="0.6" stopColor={c.lining} />
            <stop offset="1" stopColor={shade(c.lining, 0.12)} />
          </linearGradient>
          <linearGradient id="fz-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8b8f88" />
            <stop offset="0.5" stopColor="#e6e8e2" />
            <stop offset="1" stopColor="#7d817a" />
          </linearGradient>
          <g id="fz-fabric">{fabricArt}</g>
          <clipPath id="fz-clip-l" clipPathUnits="userSpaceOnUse">
            <path data-z="clipL" />
          </clipPath>
          <clipPath id="fz-clip-r" clipPathUnits="userSpaceOnUse">
            <path data-z="clipR" />
          </clipPath>
        </defs>

        {(["L", "R"] as const).map((s) => (
          <g key={s} data-z={`half${s}`}>
            {/* мягкая тень кромки на витрину (без фильтров — дёшево на телефоне) */}
            <g fill="none" stroke="#141813" strokeLinejoin="round">
              <path data-z={`shadow${s}`} strokeOpacity={0.05} strokeWidth={70} />
            </g>
            <g clipPath={`url(#fz-clip-${s.toLowerCase()})`}>
              <use href="#fz-fabric" />
              <path data-z={`lapel${s}`} fill={`url(#fz-lining-${s.toLowerCase()})`} />
              <path data-z={`stitch${s}`} fill="none" stroke={shade(c.shell, 0.3)} strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="6 5" />
            </g>
            <path data-z={`tape${s}`} fill="none" stroke={c.trim} strokeWidth={13} strokeLinejoin="round" />
            <path data-z={`teeth${s}`} fill="none" stroke={c.zipper} strokeWidth={7} strokeDasharray="3 3" />
          </g>
        ))}

        <g data-z="closed">
          <path data-z="closedStitch" fill="none" stroke={shade(c.shell, 0.3)} strokeOpacity={0.6} strokeWidth={1.2} strokeDasharray="6 5" />
          <path data-z="closedTape" fill="none" stroke={c.trim} strokeWidth={22} />
          <path data-z="closedTeeth" fill="none" stroke={c.zipper} strokeWidth={12} strokeDasharray="3 3" />
          <g data-z="topStop">
            <rect x="-13" y="-10" width="26" height="8" rx="2" fill="url(#fz-metal)" />
          </g>
        </g>
      </svg>
    </div>
  );
}
