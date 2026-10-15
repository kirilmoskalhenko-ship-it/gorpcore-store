"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { siteConfig } from "@/config/site-config";
import { fitContain, type IntroArtwork, type IntroRendererHandle } from "./types";

const fr = siteConfig.intro.frames;

export const FRAMES_ARTWORK: IntroArtwork = {
  x: 0,
  y: 0,
  width: fr.width,
  height: fr.height,
  zipX: fr.zipTop.x * fr.width,
  zipTop: fr.zipTop.y * fr.height,
  zipBottom: fr.zipBottom.y * fr.height,
};

export const frameSrc = (i: number) => fr.pattern.replace("{index}", String(i).padStart(fr.pad, "0"));

/**
 * Production-режим: canvas рисует кадр round(progress · (count − 1)) из заранее подготовленной
 * последовательности, где реальная куртка постепенно расстёгивается. Если хотя бы один кадр
 * не загрузился — вызывается onError, и ZipIntro переключается на fallback.
 */
export function FrameSequence({ ref, onError, onReady }: { ref?: Ref<IntroRendererHandle>; onError: () => void; onReady: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frames = useRef<HTMLImageElement[]>([]);
  const last = useRef({ p: 0, e: 0 });

  const draw = (p: number, exit: number) => {
    last.current = { p, e: exit };
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = fr.background;
    ctx.fillRect(0, 0, w, h);
    const img = frames.current[Math.round(p * (fr.count - 1))];
    if (img?.complete && img.naturalWidth) {
      const fit = fitContain({ width: w, height: h }, FRAMES_ARTWORK);
      ctx.drawImage(img, fit.offsetX, fit.offsetY, fr.width * fit.scale, fr.height * fit.scale);
    }
    canvas.style.opacity = String(1 - exit);
    canvas.style.transform = exit ? `scale(${1 + exit * 0.04})` : "";
  };

  useImperativeHandle(ref, () => ({ render: draw }));

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    const imgs = Array.from({ length: fr.count }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        loaded++;
        if (i === 0) draw(last.current.p, last.current.e);
        if (loaded === fr.count) onReady();
      };
      img.onerror = () => {
        if (!cancelled) {
          cancelled = true;
          onError();
        }
      };
      img.src = frameSrc(i);
      return img;
    });
    frames.current = imgs;
    return () => {
      cancelled = true;
    };
    // кадры грузятся один раз
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full origin-center" aria-hidden />;
}
