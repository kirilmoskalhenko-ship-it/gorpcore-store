"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { siteConfig } from "@/config/site-config";
import { useUI } from "@/store/ui";
import { ZipIntro } from "./ZipIntro";

/** Состояние заставки живёт в атрибуте html[data-intro] — его ставит inline-скрипт до отрисовки. */
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-intro"] });
  return () => mo.disconnect();
}
const getSnapshot = () => document.documentElement.getAttribute("data-intro") ?? "pending";
const getServerSnapshot = () => "pending";

export function IntroGate() {
  const phase = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const introOpen = useUI((s) => s.introOpen);
  const setIntroOpen = useUI((s) => s.setIntroOpen);

  // Replay intro
  useEffect(() => {
    if (!introOpen) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.documentElement.setAttribute("data-intro", "pending");
    setIntroOpen(false);
  }, [introOpen, setIntroOpen]);

  const done = useCallback(() => {
    try {
      localStorage.setItem(siteConfig.intro.storageKey, "done");
    } catch {
      /* приватный режим — заставка просто покажется снова */
    }
    document.documentElement.setAttribute("data-intro", "done");
    // ?intro=1 больше не нужен — иначе перезагрузка снова покажет заставку
    const url = new URL(window.location.href);
    if (url.searchParams.has("intro")) {
      url.searchParams.delete("intro");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
    window.dispatchEvent(new Event("aa:intro-done"));
  }, []);

  if (!siteConfig.intro.enabled || phase !== "pending") return null;

  return (
    <div className="intro-gate fixed inset-0 z-[200]">
      {/* key: при повторном показе — новый экземпляр с нулевым прогрессом */}
      <ZipIntro key={phase} onDone={done} />
    </div>
  );
}
