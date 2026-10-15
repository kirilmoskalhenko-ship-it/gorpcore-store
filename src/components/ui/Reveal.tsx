"use client";

import gsap from "gsap";
import { useEffect, useRef, type ElementType, type ReactNode } from "react";

interface RevealProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}

/** Плавное появление при прокрутке. Без JS и при prefers-reduced-motion контент виден сразу. */
export function Reveal({ as: Tag = "div", children, className, delay = 0, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.documentElement.getAttribute("data-motion") !== "on") {
      el.setAttribute("data-revealed", "");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.disconnect();
          gsap.fromTo(
            el,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 1.1,
              delay,
              ease: "expo.out",
              onStart: () => el.setAttribute("data-revealed", ""),
              clearProps: "transform,opacity",
            },
          );
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} data-reveal className={className} id={id}>
      {children}
    </Tag>
  );
}
