// Проверка локальных ресурсов перед деплоем: каждый путь "/images/..." или "/fonts/..." из src/
// должен существовать в public/ с ТОЧНО таким же регистром букв (на Vercel файловая система
// чувствительна к регистру, а на Windows — нет, поэтому ошибка не видна локально).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Есть ли файл с точным совпадением регистра на каждом уровне пути. */
function existsExact(publicPath) {
  let dir = pub;
  for (const part of publicPath.replace(/^\//, "").split("/")) {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return false;
    }
    if (!names.includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}

const refs = new Map();
for (const file of walk(join(root, "src")).filter((f) => /\.(tsx?|json|css)$/.test(f))) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/["'(`](\/(?:images|fonts)\/[^"'`)\s{}]+)["'`)]/g)) {
    const path = m[1];
    if (path.includes("${")) continue;
    if (!refs.has(path)) refs.set(path, relative(root, file));
  }
}

const missing = [...refs].filter(([path]) => !existsExact(path));
if (missing.length) {
  console.error(`Не найдено ${missing.length} ресурс(ов) (проверьте путь и регистр букв):`);
  for (const [path, file] of missing) console.error(`  ${path}  ← ${file}`);
  process.exit(1);
}
console.log(`assets ok: ${refs.size} путей из src/ найдены в public/ с точным регистром`);
