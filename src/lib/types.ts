export const CATEGORIES = ["jackets", "fleeces", "pants", "footwear", "headwear", "accessories"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Condition = "new" | "excellent" | "very-good" | "good";

/** Форма плейсхолдера (используется только генератором картинок и конструктором). */
export type Silhouette =
  | "shell"
  | "fleece"
  | "pants"
  | "shoes"
  | "boots"
  | "beanie"
  | "cap"
  | "bucket"
  | "sling"
  | "backpack"
  | "hippack"
  | "gloves"
  | "bottle";

export interface Variant {
  size: string;
  /** Остаток на складе. 0 — размер закончился. */
  stock: number;
}

export interface Product {
  /** Стабильный ID — на него ссылаются лукбуки, корзина и URL `?product=`. Не меняйте после запуска. */
  id: string;
  brand: string;
  model: string;
  category: Category;
  /** Цена в рублях, целое число. null — цена уточняется: товар виден, но купить его нельзя. */
  price: number | null;
  /** Состояние. Нет поля — «уточняется». */
  condition?: Condition;
  /** Единственный экземпляр: в корзине максимум 1 штука. */
  unique: boolean;
  description: string;
  details?: string[];
  color: { name: string; hex: string };
  images: string[];
  /** Изображение на прозрачном фоне для конструктора. Если нет — берётся images[0]. */
  cutout?: string;
  /** Настройки вырезки фона для scripts/photos.mjs. */
  cutoutTolerance?: number;
  cutoutErode?: number;
  cutoutCrop?: { top?: number; bottom?: number; left?: number; right?: number };
  cutoutShadow?: boolean;
  /** Форма векторного плейсхолдера (только для товаров без фото). */
  silhouette?: Silhouette;
  variants: Variant[];
  /** true — демонстрационный товар тестового каталога. */
  demo: boolean;
}

export interface RectShape {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PolygonShape {
  type: "polygon";
  /** Точки [x, y] в процентах исходного кадра. */
  points: [number, number][];
}

export type HotspotShape = RectShape | PolygonShape;

export interface Hotspot {
  id: string;
  productId: string;
  shape: HotspotShape;
}

export interface LookbookImage {
  src: string;
  /** Натуральный размер исходного кадра — нужен для пересчёта зон при object-fit. */
  width: number;
  height: number;
  alt: string;
}

/** Раскладка вещи для автоматической сборки лукбука (scripts/photos.mjs), в % кадра. */
export interface CompositionItem {
  productId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
}

export interface Lookbook {
  id: string;
  title: string;
  description: string;
  image: LookbookImage;
  productIds: string[];
  hotspots: Hotspot[];
  order: number;
  /** Если задано — фото лукбука и зоны собираются скриптом из вырезок товаров. */
  composition?: CompositionItem[];
}

export interface CartLine {
  productId: string;
  size: string;
  qty: number;
}
