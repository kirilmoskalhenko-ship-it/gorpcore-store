import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import { siteConfig } from "@/config/site-config";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  variable: "--font-inter-tight",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} — Curated outdoor gear`,
  description: siteConfig.description,
  openGraph: { type: "website", siteName: siteConfig.name, locale: "ru_RU" },
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.background,
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

/**
 * Выполняется до первой отрисовки: решает, показывать ли заставку, и включает
 * reveal-анимации только без prefers-reduced-motion. Так нет вспышки магазина под заставкой.
 */
const bootScript = `(function(){var d=document.documentElement;try{var q=new URLSearchParams(location.search);var done=${
  siteConfig.intro.enabled ? "false" : "true"
};if(localStorage.getItem(${JSON.stringify(siteConfig.intro.storageKey)})==="done")done=true;if(q.has("product"))done=true;if(q.get("intro")==="1")done=false;d.setAttribute("data-intro",done?"done":"pending");}catch(e){d.setAttribute("data-intro","pending");}d.setAttribute("data-motion",window.matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on");})();`;

const themeVars = {
  "--aa-bg": siteConfig.colors.background,
  "--aa-surface": siteConfig.colors.surface,
  "--aa-text": siteConfig.colors.text,
  "--aa-accent": siteConfig.colors.accent,
  "--aa-accent-soft": siteConfig.colors.accentSoft,
} as CSSProperties;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${interTight.variable} ${plexMono.variable}`}
      style={themeVars}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
