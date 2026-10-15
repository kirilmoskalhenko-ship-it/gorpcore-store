import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Lookbook, Product } from "../src/lib/types";

/** Тесты читают текущие данные магазина — при замене ассортимента их не нужно переписывать. */
const read = <T>(file: string): T => JSON.parse(readFileSync(join(__dirname, "..", "src", "data", file), "utf8")) as T;

export const products = read<Product[]>("products.json");
export const lookbooks = read<Lookbook[]>("lookbooks.json").sort((a, b) => a.order - b.order);

const stock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
export const purchasable = products.filter((p) => p.price !== null && stock(p) > 0);
export const unpriced = products.filter((p) => p.price === null);
export const firstLook = lookbooks[0]!;
export const productById = (id: string) => products.find((p) => p.id === id)!;
