"use client";

import { Menu, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { navigation } from "@/config/navigation";
import { siteConfig } from "@/config/site-config";
import { useScrollLock } from "@/hooks/useScrollLock";
import { selectCount, useCart } from "@/store/cart";
import { useUI } from "@/store/ui";

export function Header() {
  const count = useCart(selectCount);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const menuOpen = useUI((s) => s.menuOpen);
  const setMenuOpen = useUI((s) => s.setMenuOpen);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useScrollLock(menuOpen);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // подсветка текущего раздела
  useEffect(() => {
    const sections = navigation
      .map((n) => document.querySelector<HTMLElement>(n.href))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`site-header pt-safe fixed inset-x-0 top-0 z-50 ${
        scrolled || menuOpen ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="px-gutter flex h-[var(--header-h)] items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-2 text-[13px] font-medium tracking-[0.22em]" aria-label={`${siteConfig.name} — наверх`}>
          {siteConfig.logo ? <Image src={siteConfig.logo} alt="" width={28} height={28} /> : null}
          {siteConfig.name}
        </a>

        <nav aria-label="Основная навигация" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {navigation.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active === item.href ? "true" : undefined}
                  className="link-line pb-0.5 font-mono text-[11px] tracking-[0.18em]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex h-11 items-center gap-2 px-2 font-mono text-[11px] tracking-[0.18em]"
            aria-label={`Корзина, товаров: ${count}`}
            data-testid="cart-button"
          >
            <ShoppingBag className="size-[18px]" strokeWidth={1.25} />
            <span className="hidden sm:inline">BAG</span>
            <span
              data-testid="cart-count"
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] tracking-normal transition-colors ${
                count ? "bg-moss text-paper" : "bg-surface text-muted"
              }`}
            >
              {count}
            </span>
          </button>
          <button
            type="button"
            className="flex size-11 items-center justify-center lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            {menuOpen ? <X className="size-5" strokeWidth={1.25} /> : <Menu className="size-5" strokeWidth={1.25} />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="px-gutter h-[calc(100dvh-var(--header-h)-env(safe-area-inset-top))] bg-paper pb-safe lg:hidden"
      >
        <nav aria-label="Мобильная навигация" className="flex h-full flex-col justify-between py-10">
          <ul className="space-y-5">
            {navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={() => setMenuOpen(false)} className="display block text-[clamp(2.4rem,11vw,4rem)]">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="eyebrow">{siteConfig.contacts.city} · {siteConfig.contacts.email}</p>
        </nav>
      </div>
    </header>
  );
}
