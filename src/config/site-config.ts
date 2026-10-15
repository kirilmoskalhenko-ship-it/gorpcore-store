/**
 * Центральная конфигурация витрины: название, тексты, цвета, логотип, изображения, заставка.
 * Цвета дублируются в CSS-переменные в layout.tsx — меняйте их только здесь.
 */
export const siteConfig = {
  name: "ALTITUDE ARCHIVE",
  shortName: "ALTITUDE",
  /** Путь к SVG/PNG-логотипу. null — показывается текстовое название. */
  logo: null as string | null,
  /**
   * Публичный адрес сайта (для metadataBase / Open Graph).
   * NEXT_PUBLIC_SITE_URL → production-домен Vercel (выставляется автоматически) → localhost.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  locale: "ru-RU",
  currency: "RUB",
  description: "Curated outdoor gear. Built for movement. Styled for everywhere.",

  /** Тестовый каталог: показывать плашку о демонстрационных товарах. */
  demoCatalog: false,
  demoNotice: "Тестовый каталог: товары, бренды, цены и размеры — демонстрационные.",

  colors: {
    background: "#F7F7F3",
    surface: "#EAECE6",
    text: "#20251F",
    accent: "#66745C",
    accentSoft: "#A4AE97",
  },

  hero: {
    eyebrow: "Autumn / Winter archive",
    title: "BEYOND THE EVERYDAY",
    subtitle: "Curated outdoor gear. Built for movement. Styled for everywhere.",
    image: { src: "/images/editorial/hero.svg", alt: "Горные хребты в утреннем тумане", width: 2400, height: 1500 },
    primaryCta: { label: "Explore looks", href: "#lookbook" },
    secondaryCta: { label: "Shop all", href: "#shop" },
  },

  lookbook: {
    eyebrow: "Flat lay series",
    title: "CURATED LOOKS",
    intro: "Каждый образ разложен на бетоне и снят сверху. Наведите на вещь, чтобы увидеть цену, или нажмите — откроется карточка.",
  },

  shop: {
    eyebrow: "Archive",
    title: "SHOP",
  },

  fit: {
    eyebrow: "Outfit builder",
    title: "BUILD YOUR FIT",
    intro: "Соберите образ из вещей в наличии. Перетащите вещь на поле или нажмите на неё.",
  },

  about: {
    eyebrow: "About",
    title: "OUTDOOR GEAR, EDITED",
    paragraphs: [
      "ALTITUDE ARCHIVE — небольшой магазин технической одежды для гор и города. Мы отбираем вещи по крою, материалам и состоянию, а не по сезонным трендам.",
      "Часть ассортимента — единственные экземпляры: проверенные, почищенные и описанные честно, со всеми следами носки.",
    ],
    image: { src: "/images/editorial/about.svg", alt: "Горное озеро в тумане", width: 1200, height: 1600 },
    facts: [
      { label: "Проверка", value: "Каждая вещь осмотрена вручную" },
      { label: "Доставка", value: "По России, 2–7 дней" },
      { label: "Возврат", value: "14 дней" },
    ],
  },

  contacts: {
    email: "hello@example.com",
    telegram: null as string | null,
    city: "Москва",
  },

  intro: {
    enabled: true,
    /** Ключ localStorage. Поменяйте версию, чтобы все снова увидели заставку. */
    storageKey: "aa:intro:v1",
    hint: "Потяните бегунок вниз",
    /**
     * Вид fallback-заставки (когда нет кадров):
     * "fullscreen" — весь экран — ткань с молнией по центру; "jacket" — векторная куртка по центру.
     */
    style: "fullscreen" as "fullscreen" | "jacket",
    /**
     * Production mode: последовательность кадров, где куртка расстёгивается.
     * count = 0 — используется fallback (векторная куртка с масками).
     * Шаблон пути: {index} заменяется номером кадра с ведущими нулями длиной pad.
     */
    frames: {
      count: 0,
      pattern: "/images/intro/frames/frame-{index}.webp",
      pad: 3,
      width: 1600,
      height: 2000,
      /** Линия молнии в долях кадра (0..1): верхняя и нижняя точки хода бегунка. */
      zipTop: { x: 0.5, y: 0.2 },
      zipBottom: { x: 0.5, y: 0.86 },
      /** Рисовать ли поверх кадров векторный бегунок. Если бегунок уже есть на фото — false (остаётся невидимая зона захвата). */
      drawPuller: false,
      /** Цвет фона вокруг кадров (если кадр не заполняет экран). */
      background: "#F7F7F3",
    },
    /** Цвета векторной куртки в fallback-режиме. */
    jacket: { shell: "#66745C", lining: "#2B3328", trim: "#20251F", zipper: "#C9CCC2" },
    /** Порог, после которого раскрытие довершается автоматически. */
    completeAt: 0.95,
  },
} as const;

export type SiteConfig = typeof siteConfig;
