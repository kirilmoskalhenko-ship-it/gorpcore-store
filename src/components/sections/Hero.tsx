"use client";

import gsap from "gsap";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/config/site-config";
import { TopoLines } from "@/components/ui/TopoLines";

const { hero } = siteConfig;

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || document.documentElement.getAttribute("data-motion") !== "on") return;
    const ctx = gsap.context(() => {
      const play = () =>
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo("[data-hero-img]", { scale: 1.08 }, { scale: 1, duration: 2.4 })
          .fromTo("[data-hero-word]", { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.09 }, 0.15)
          .fromTo("[data-hero-fade]", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, 0.5);
      // если заставка открыта — ждём её завершения
      if (document.documentElement.getAttribute("data-intro") === "pending") {
        gsap.set("[data-hero-word]", { yPercent: 110 });
        gsap.set("[data-hero-fade]", { opacity: 0 });
        const onDone = () => play();
        window.addEventListener("aa:intro-done", onDone, { once: true });
        return () => window.removeEventListener("aa:intro-done", onDone);
      }
      play();
    }, el);
    // мягкий параллакс фотографии
    const img = el.querySelector<HTMLElement>("[data-hero-parallax]");
    const onScroll = () => {
      if (!img) return;
      const y = Math.min(window.scrollY, window.innerHeight);
      img.style.transform = `translate3d(0, ${y * 0.18}px, 0)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ctx.revert();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const words = hero.title.split(" ");

  return (
    <section ref={root} id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0" data-hero-parallax>
        <div className="absolute inset-0" data-hero-img>
          <Image src={hero.image.src} alt={hero.image.alt} fill preload sizes="100vw" className="object-cover" />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-paper/70 via-paper/0 to-paper/0" aria-hidden />
      {/* светлая подложка под текстом — читаемость на любой фотографии */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-paper via-paper/75 to-paper/0" aria-hidden />
      <TopoLines className="absolute -right-[22%] top-[4%] w-[min(900px,120vw)] opacity-30" rings={11} />

      <div className="px-gutter relative mt-auto pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(var(--header-h)+4rem)] md:pb-16">
        <p className="eyebrow mb-6 text-ink/70" data-hero-fade>
          {hero.eyebrow}
        </p>
        <h1 id="hero-title" className="display max-w-[14ch] text-[clamp(3.2rem,11.5vw,11rem)] text-ink">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
              <span className="inline-block" data-hero-word>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            </span>
          ))}
        </h1>
        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-sm text-[17px] leading-relaxed text-ink/80" data-hero-fade>
            {hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-3" data-hero-fade>
            <a href={hero.primaryCta.href} className="btn btn-solid">
              {hero.primaryCta.label}
            </a>
            <a href={hero.secondaryCta.href} className="btn bg-paper/40 backdrop-blur-sm">
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
        <a href="#lookbook" className="eyebrow mt-12 hidden items-center gap-2 md:inline-flex" data-hero-fade>
          <ArrowDown className="size-3.5" strokeWidth={1.25} /> Scroll
        </a>
      </div>
    </section>
  );
}
