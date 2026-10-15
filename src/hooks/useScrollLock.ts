"use client";

import { useEffect } from "react";

let locks = 0;

/** Блокирует прокрутку страницы, пока открыт хотя бы один слой. Счётчик — для вложенных модалок. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks++;
    document.documentElement.setAttribute("data-lock", "true");
    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) document.documentElement.removeAttribute("data-lock");
    };
  }, [active]);
}
