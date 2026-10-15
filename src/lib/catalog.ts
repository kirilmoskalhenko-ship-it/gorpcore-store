import productsJson from "@/data/products.json";
import lookbooksJson from "@/data/lookbooks.json";
import { CATEGORIES, type Category, type Condition, type Lookbook, type Product } from "./types";

/**
 * Единая точка доступа к товарам. Каталог, лукбуки, конструктор и корзина
 * читают данные только отсюда — товары не дублируются.
 */

function validate(): { products: Product[]; lookbooks: Lookbook[] } {
  const products = productsJson as Product[];
  const lookbooks = lookbooksJson as unknown as Lookbook[];
  const ids = new Set<string>();
  const problems: string[] = [];

  for (const p of products) {
    if (ids.has(p.id)) problems.push(`Дублируется id товара "${p.id}"`);
    ids.add(p.id);
    if (!CATEGORIES.includes(p.category)) problems.push(`${p.id}: неизвестная категория "${p.category}"`);
    if (p.price !== null && (!Number.isInteger(p.price) || p.price < 0))
      problems.push(`${p.id}: цена должна быть целым числом рублей или null`);
    if (p.variants.length === 0) problems.push(`${p.id}: нет ни одного размера`);
    if (p.unique && p.variants.some((v) => v.stock > 1)) problems.push(`${p.id}: unique-товар не может иметь остаток > 1`);
  }

  const cleanLookbooks = lookbooks.map((lb) => {
    const missing = [...lb.productIds, ...lb.hotspots.map((h) => h.productId)].filter((id) => !ids.has(id));
    if (missing.length) problems.push(`Лукбук ${lb.id}: несуществующие товары ${[...new Set(missing)].join(", ")}`);
    return {
      ...lb,
      productIds: lb.productIds.filter((id) => ids.has(id)),
      hotspots: lb.hotspots.filter((h) => ids.has(h.productId)),
    };
  });

  if (problems.length) {
    const msg = `[catalog] Ошибки в данных:\n- ${problems.join("\n- ")}`;
    if (process.env.NODE_ENV !== "production") throw new Error(msg);
    console.error(msg);
  }

  return { products, lookbooks: cleanLookbooks.sort((a, b) => a.order - b.order) };
}

const data = validate();

export const products: readonly Product[] = data.products;
export const lookbooks: readonly Lookbook[] = data.lookbooks;
const productIndex = new Map(products.map((p) => [p.id, p]));

export function getProduct(id: string | null | undefined): Product | undefined {
  return id ? productIndex.get(id) : undefined;
}

export function getLookbook(id: string | null | undefined): Lookbook | undefined {
  return id ? lookbooks.find((l) => l.id === id) : undefined;
}

export const totalStock = (p: Product) => p.variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
export const isSoldOut = (p: Product) => totalStock(p) === 0;
export const stockFor = (p: Product, size: string) => p.variants.find((v) => v.size === size)?.stock ?? 0;
/** Первый размер в наличии — значение по умолчанию для выбора. */
export const defaultSize = (p: Product) => (p.variants.find((v) => v.stock > 0) ?? p.variants[0])?.size ?? "";
export const isOneSize = (p: Product) => p.variants.length === 1;
export const inStockSizes = (p: Product) => p.variants.filter((v) => v.stock > 0).map((v) => v.size);

export type StockAlert = { kind: "last-size"; size: string; label: string } | { kind: "low"; left: number; label: string };

/**
 * Подсветка остатков: «последний размер» — из сетки остался один размер;
 * «скоро закончится» — осталось 1–2 штуки. Единственные экземпляры помечаются отдельно (1 OF 1).
 */
export function stockAlert(p: Product): StockAlert | null {
  if (p.unique || isSoldOut(p)) return null;
  const sizes = inStockSizes(p);
  if (p.variants.length > 1 && sizes.length === 1) return { kind: "last-size", size: sizes[0]!, label: `LAST SIZE · ${sizes[0]}` };
  const left = totalStock(p);
  if (left <= 2) return { kind: "low", left, label: "СКОРО ЗАКОНЧИТСЯ" };
  return null;
}
export interface GalleryImage {
  src: string;
  /** cutout — вырезка на фирменном фоне; photo — исходное фото целиком; placeholder — векторная заглушка. */
  kind: "cutout" | "photo" | "placeholder";
}

/** Кадры карточки: сначала вырезка (единый стиль витрины), затем исходные фото. */
export function galleryImages(p: Product): GalleryImage[] {
  const photos = p.images.map((src): GalleryImage => ({ src, kind: src.endsWith(".svg") ? "placeholder" : "photo" }));
  return p.cutout && !p.cutout.endsWith(".svg") ? [{ src: p.cutout, kind: "cutout" }, ...photos] : photos;
}

/** CSS-классы кадра по его типу. */
export const imageFitClass = (kind: GalleryImage["kind"]) =>
  kind === "cutout" ? "object-contain p-[9%]" : kind === "photo" ? "object-contain bg-white" : "object-cover";

/** Цена известна — товар можно продавать. */
export const hasPrice = (p: Product): p is Product & { price: number } => p.price !== null;
export const PRICE_PENDING = "Цена уточняется";
export const CONDITION_PENDING = "Уточняется";

export const CATEGORY_LABELS: Record<Category, string> = {
  jackets: "Jackets",
  fleeces: "Fleeces",
  pants: "Pants",
  footwear: "Footwear",
  headwear: "Headwear",
  accessories: "Accessories",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "Новое",
  excellent: "Отличное",
  "very-good": "Очень хорошее",
  good: "Хорошее",
};

export const brands = [...new Set(products.map((p) => p.brand))].sort();

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
export const allSizes = [...new Set(products.flatMap((p) => p.variants.map((v) => v.size)))].sort((a, b) => {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, "en", { numeric: true });
});

const knownPrices = products.filter(hasPrice).map((p) => p.price);
/** Границы цен товаров с известной ценой (для фильтра). */
export const priceBounds = {
  min: knownPrices.length ? Math.min(...knownPrices) : 0,
  max: knownPrices.length ? Math.max(...knownPrices) : 0,
};

/** Категории, в которых есть товары — пустые не показываются. */
export const usedCategories = CATEGORIES.filter((c) => products.some((p) => p.category === c));

/** Слоты конструктора образов. */
export const FIT_SLOTS = ["outerwear", "headwear", "pants", "footwear", "accessory"] as const;
export type FitSlot = (typeof FIT_SLOTS)[number];

export const FIT_SLOT_LABELS: Record<FitSlot, string> = {
  outerwear: "Верх",
  pants: "Брюки",
  footwear: "Обувь",
  headwear: "Головной убор",
  accessory: "Аксессуар",
};

export function slotOf(p: Product): FitSlot {
  switch (p.category) {
    case "jackets":
    case "fleeces":
      return "outerwear";
    case "pants":
      return "pants";
    case "footwear":
      return "footwear";
    case "headwear":
      return "headwear";
    case "accessories":
      return "accessory";
  }
}
