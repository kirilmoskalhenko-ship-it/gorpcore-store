"use client";

import { navigation } from "@/config/navigation";
import { siteConfig } from "@/config/site-config";
import { useUI } from "@/store/ui";

export function Footer() {
  const setIntroOpen = useUI((s) => s.setIntroOpen);
  return (
    <footer className="px-gutter border-t border-line pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-16">
      <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="display text-[clamp(2rem,6vw,4.5rem)]">{siteConfig.name}</p>
          <p className="mt-4 max-w-sm text-[14px] text-muted">{siteConfig.description}</p>
        </div>
        <nav aria-label="Навигация в подвале">
          <ul className="space-y-2">
            {navigation.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="link-line font-mono text-[11px] tracking-[0.18em]">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-2 text-[14px]">
          <p>{siteConfig.contacts.city}</p>
          <a href={`mailto:${siteConfig.contacts.email}`} className="link-line">
            {siteConfig.contacts.email}
          </a>
          {siteConfig.intro.enabled && (
            <p className="pt-4">
              <button type="button" onClick={() => setIntroOpen(true)} className="link-line font-mono text-[11px] tracking-[0.18em]" data-testid="replay-intro">
                REPLAY INTRO
              </button>
            </p>
          )}
        </div>
      </div>
      <div className="mt-16 flex flex-col justify-between gap-3 border-t border-line pt-6 text-[12px] text-muted md:flex-row">
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        {siteConfig.demoCatalog && <p>{siteConfig.demoNotice}</p>}
      </div>
    </footer>
  );
}
