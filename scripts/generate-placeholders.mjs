// Генерирует SVG-плейсхолдеры для демо-каталога.
//   node scripts/generate-placeholders.mjs          — создать только отсутствующие файлы
//   node scripts/generate-placeholders.mjs --force  — перезаписать все плейсхолдеры
// Файлы, которые вы заменили на реальные фото (другое расширение или свой путь в JSON), скрипт не трогает:
// он пишет только по путям *.svg, указанным в products.json / lookbooks.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const force = process.argv.includes("--force");
const products = JSON.parse(readFileSync(join(root, "src/data/products.json"), "utf8"));
const lookbooks = JSON.parse(readFileSync(join(root, "src/data/lookbooks.json"), "utf8"));
const byId = new Map(products.map((p) => [p.id, p]));

let written = 0;
function out(publicPath, svg) {
  if (!publicPath.endsWith(".svg")) return;
  const file = join(pub, publicPath);
  if (existsSync(file) && !force) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, svg);
  written++;
}

// ---------- utils ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const m = (c) => Math.round(c + (t - c) * k);
  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// ---------- silhouettes (box 0..100 × 0..100) ----------
// aspect — естественное соотношение ширины к высоте; для полигональных зон фигура растягивается под рамку.
const S = (c) => ({ base: c, dark: shade(c, -0.38), light: shade(c, 0.22), line: shade(c, -0.55) });
const ln = (d, col, w = 1.4, extra = "") =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

const SHELL_OUTLINE =
  "M38 0 L62 0 L66 10 L82 14 Q92 36 100 62 L92 66 Q82 48 74 32 L74 100 L26 100 L26 32 Q18 48 8 66 L0 62 Q8 36 18 14 L34 10 Z";
const FLEECE_OUTLINE =
  "M40 4 L60 4 L64 8 L82 12 Q92 34 100 58 L92 62 Q82 46 74 30 L74 100 L26 100 L26 30 Q18 46 8 62 L0 58 Q8 34 18 12 L36 8 Z";

const silhouettes = {
  shell: {
    aspect: 1.0,
    outline: SHELL_OUTLINE,
    details: (c) =>
      `<path d="M41 2 Q50 16 59 2" fill="${c.dark}" opacity=".55"/>` +
      ln("M50 10 L50 100", c.line, 1.6) +
      ln("M30 60 L40 70 M70 60 L60 70", c.line, 1.2) +
      ln("M26 32 Q36 36 34 16 M74 32 Q64 36 66 16", c.dark, 1) +
      ln("M96 60 L91 64 M4 60 L9 64", c.light, 2.4) +
      `<rect x="26" y="94" width="48" height="6" fill="${c.dark}" opacity=".35"/>` +
      ln("M44 40 Q47 52 43 64 M58 30 Q55 46 60 58", c.dark, 1, 'opacity=".35"'),
  },
  fleece: {
    aspect: 1.08,
    outline: FLEECE_OUTLINE,
    details: (c) =>
      `<path d="M40 4 Q50 12 60 4 L60 9 Q50 16 40 9 Z" fill="${c.dark}" opacity=".45"/>` +
      ln("M50 10 L50 36", c.line, 1.6) +
      `<rect x="30" y="58" width="12" height="14" rx="2" fill="${c.dark}" opacity=".18"/>` +
      ln("M30 40 L70 40 M30 52 L70 52 M30 64 L70 64 M30 76 L70 76 M30 88 L70 88", c.dark, 0.8, 'opacity=".22"') +
      `<rect x="26" y="95" width="48" height="5" fill="${c.dark}" opacity=".3"/>`,
  },
  pants: {
    aspect: 0.45,
    outline: "M8 0 L92 0 L100 100 L58 100 L50 30 L42 100 L0 100 Z",
    details: (c) =>
      `<rect x="8" y="0" width="84" height="6" fill="${c.dark}" opacity=".5"/>` +
      ln("M50 6 L50 26", c.line, 1.4) +
      `<rect x="4" y="44" width="16" height="16" rx="2" fill="${c.dark}" opacity=".28"/>` +
      `<rect x="80" y="44" width="16" height="16" rx="2" fill="${c.dark}" opacity=".28"/>` +
      ln("M14 6 Q22 14 30 10 M86 6 Q78 14 70 10", c.line, 1) +
      ln("M8 70 Q22 66 38 70 M62 70 Q78 66 94 70", c.dark, 1, 'opacity=".5"') +
      `<rect x="0" y="96" width="42" height="4" fill="${c.dark}" opacity=".4"/><rect x="58" y="96" width="42" height="4" fill="${c.dark}" opacity=".4"/>`,
  },
  shoes: {
    aspect: 1.35,
    outline:
      "M6 10 Q4 4 14 4 L82 6 Q98 8 98 24 Q98 40 82 42 L14 44 Q4 44 6 36 Z M2 58 Q0 52 10 52 L78 54 Q94 56 94 72 Q94 88 78 90 L10 92 Q0 92 2 84 Z",
    details: (c) =>
      `<path d="M24 12 L74 12 Q86 16 86 24 Q86 32 74 36 L24 36 Q16 24 24 12 Z" fill="${c.light}" opacity=".35"/>` +
      `<path d="M20 60 L70 60 Q82 64 82 72 Q82 80 70 84 L20 84 Q12 72 20 60 Z" fill="${c.light}" opacity=".35"/>` +
      ln("M34 16 L40 32 M42 16 L48 32 M50 16 L56 32 M58 16 L64 32", "#f4f3ee", 1.2) +
      ln("M30 64 L36 80 M38 64 L44 80 M46 64 L52 80 M54 64 L60 80", "#f4f3ee", 1.2) +
      ln("M6 10 Q4 4 14 4 L82 6 Q98 8 98 24 Q98 40 82 42 L14 44 Q4 44 6 36 Z", "#e9e7e0", 2.2) +
      ln("M2 58 Q0 52 10 52 L78 54 Q94 56 94 72 Q94 88 78 90 L10 92 Q0 92 2 84 Z", "#e9e7e0", 2.2),
  },
  boots: {
    aspect: 1.35,
    outline:
      "M6 8 Q4 2 16 2 L80 6 Q98 8 98 24 Q98 40 80 42 L16 46 Q4 46 6 38 Z M2 56 Q0 50 12 50 L76 54 Q94 56 94 72 Q94 88 76 90 L12 94 Q0 94 2 86 Z",
    details: (c) =>
      `<ellipse cx="22" cy="24" rx="14" ry="16" fill="${c.dark}" opacity=".6"/>` +
      `<ellipse cx="18" cy="72" rx="14" ry="16" fill="${c.dark}" opacity=".6"/>` +
      ln("M40 14 L44 34 M50 14 L54 34 M60 14 L64 34", "#d9cbb2", 1.4) +
      ln("M36 62 L40 82 M46 62 L50 82 M56 62 L60 82", "#d9cbb2", 1.4) +
      ln("M6 8 Q4 2 16 2 L80 6 Q98 8 98 24 Q98 40 80 42 L16 46 Q4 46 6 38 Z", "#2a241e", 2.4) +
      ln("M2 56 Q0 50 12 50 L76 54 Q94 56 94 72 Q94 88 76 90 L12 94 Q0 94 2 86 Z", "#2a241e", 2.4),
  },
  beanie: {
    aspect: 1.1,
    outline: "M8 100 L8 44 Q8 0 50 0 Q92 0 92 44 L92 100 Z",
    details: (c) =>
      `<rect x="8" y="66" width="84" height="34" fill="${c.dark}" opacity=".3"/>` +
      ln("M20 12 L20 100 M32 4 L32 100 M44 1 L44 100 M56 1 L56 100 M68 4 L68 100 M80 12 L80 100", c.dark, 0.9, 'opacity=".4"') +
      `<rect x="40" y="76" width="20" height="10" fill="${c.light}" opacity=".6"/>`,
  },
  cap: {
    aspect: 1.15,
    outline: "M50 4 A40 38 0 0 1 90 42 L90 52 Q90 98 50 98 Q10 98 10 52 L10 42 A40 38 0 0 1 50 4 Z",
    details: (c) =>
      `<path d="M10 56 Q50 70 90 56 Q90 98 50 98 Q10 98 10 56 Z" fill="${c.dark}" opacity=".35"/>` +
      ln("M50 4 L50 60 M22 16 Q36 40 30 62 M78 16 Q64 40 70 62", c.dark, 1, 'opacity=".55"') +
      `<circle cx="50" cy="6" r="3" fill="${c.dark}"/>`,
  },
  bucket: {
    aspect: 1.0,
    outline: "M50 2 A48 48 0 1 1 49.9 2 Z",
    details: (c) =>
      `<circle cx="50" cy="50" r="30" fill="${c.dark}" opacity=".25"/>` +
      ln("M50 20 A30 30 0 1 1 49.9 20", c.line, 1.2) +
      ln("M50 8 A42 42 0 1 1 49.9 8", c.dark, 0.8, 'stroke-dasharray="2 3" opacity=".7"'),
  },
  sling: {
    aspect: 1.55,
    outline: "M12 34 Q12 22 30 22 L72 22 Q90 22 90 40 L90 62 Q90 80 72 80 L30 80 Q12 80 12 64 Z",
    details: (c) =>
      ln("M12 46 Q0 10 50 6 Q100 4 92 44", c.dark, 5) +
      ln("M22 40 L82 40", c.line, 1.6) +
      `<rect x="44" y="37" width="6" height="7" rx="1" fill="#d6d4cc"/>` +
      `<rect x="24" y="52" width="54" height="18" rx="6" fill="${c.light}" opacity=".18"/>`,
  },
  backpack: {
    aspect: 0.78,
    outline: "M14 14 Q14 4 30 4 L70 4 Q86 4 86 14 L90 90 Q90 100 78 100 L22 100 Q10 100 10 90 Z",
    details: (c) =>
      `<rect x="14" y="4" width="72" height="14" rx="5" fill="${c.dark}" opacity=".45"/>` +
      `<rect x="24" y="46" width="52" height="40" rx="8" fill="${c.dark}" opacity=".25"/>` +
      ln("M30 46 L70 46", c.line, 1.4) +
      ln("M20 30 L80 30 M18 64 L22 64 M78 64 L82 64", "#1d1f1c", 2.2) +
      `<rect x="42" y="26" width="16" height="8" rx="2" fill="#1d1f1c"/>`,
  },
  hippack: {
    aspect: 2.1,
    outline: "M18 30 Q50 18 82 30 Q94 34 92 54 Q88 80 50 82 Q12 80 8 54 Q6 34 18 30 Z",
    details: (c) =>
      ln("M0 40 L12 40 M88 40 L100 40", "#262826", 4) +
      ln("M18 42 Q50 32 82 42", c.line, 1.6) +
      `<rect x="60" y="38" width="5" height="6" rx="1" fill="#d6d4cc"/>` +
      `<path d="M22 52 Q50 46 78 52 Q74 74 50 76 Q26 74 22 52 Z" fill="${c.dark}" opacity=".18"/>`,
  },
  gloves: {
    aspect: 1.15,
    outline:
      "M6 40 L6 12 Q6 6 11 6 Q15 6 15 12 L15 34 L16 4 Q16 0 21 0 Q26 0 26 4 L26 32 L27 6 Q27 2 32 2 Q37 2 37 6 L37 36 L38 14 Q38 10 42 10 Q46 10 46 14 L46 60 L54 50 Q58 46 60 52 L48 78 L46 100 L8 100 L6 80 Z " +
      "M54 40 L54 12 Q54 6 59 6 Q63 6 63 12 L63 34 L64 4 Q64 0 69 0 Q74 0 74 4 L74 32 L75 6 Q75 2 80 2 Q85 2 85 6 L85 36 L86 14 Q86 10 90 10 Q94 10 94 14 L94 100 L56 100 L54 80 Z",
    details: (c) =>
      `<rect x="8" y="86" width="38" height="14" fill="${c.dark}" opacity=".4"/>` +
      `<rect x="56" y="86" width="38" height="14" fill="${c.dark}" opacity=".4"/>`,
  },
  bottle: {
    aspect: 0.38,
    outline: "M28 14 L72 14 L72 18 Q88 22 88 34 L88 94 Q88 100 80 100 L20 100 Q12 100 12 94 L12 34 Q12 22 28 18 Z",
    details: (c) =>
      `<rect x="26" y="0" width="48" height="16" rx="4" fill="#2b2d2a"/>` +
      `<rect x="20" y="36" width="12" height="56" rx="6" fill="#ffffff" opacity=".22"/>` +
      ln("M12 82 L88 82", c.dark, 1, 'opacity=".5"'),
  },
};

function garment(product, x, y, w, h, fit) {
  const sil = silhouettes[product.silhouette];
  if (!sil) throw new Error(`Unknown silhouette ${product.silhouette}`);
  const c = S(product.color.hex);
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (fit === "contain") {
    const k = 0.94;
    if (w / h > sil.aspect) {
      dh = h * k;
      dw = dh * sil.aspect;
    } else {
      dw = w * k;
      dh = dw / sil.aspect;
    }
    dx = x + (w - dw) / 2;
    dy = y + (h - dh) / 2;
  }
  const sx = (dw / 100).toFixed(4);
  const sy = (dh / 100).toFixed(4);
  return `<g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${sx} ${sy})">
    <path d="${sil.outline}" fill="${c.base}" filter="url(#shadow)" fill-rule="nonzero"/>
    <path d="${sil.outline}" fill="url(#fold)"/>
    ${sil.details(c)}
    ${ln(sil.outline, c.dark, 1, 'opacity=".55"')}
  </g>`;
}

const defs = (seed) => `<defs>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#1b1d19" flood-opacity=".28"/></filter>
  <linearGradient id="fold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .45  0 0 0 0 .43  0 0 0 .55 0"/></filter>
  <filter id="stain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="3" seed="${seed + 11}"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .3  0 0 0 0 .29  0 0 0 .5 -.12"/></filter>
  <radialGradient id="light" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></radialGradient>
</defs>`;

function concrete(W, H) {
  return `<rect width="${W}" height="${H}" fill="#b4b3ad"/>
  <rect width="${W}" height="${H}" filter="url(#stain)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".55"/>`;
}

function bbox(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

// ---------- lookbooks ----------
for (const lb of lookbooks) {
  const W = lb.image.width;
  const H = lb.image.height;
  const seed = hash(lb.id) % 1000;
  const items = lb.hotspots
    .map((hs) => {
      const p = byId.get(hs.productId);
      if (!p) throw new Error(`Lookbook ${lb.id}: unknown product ${hs.productId}`);
      const r = hs.shape.type === "rect" ? hs.shape : bbox(hs.shape.points);
      const fit = hs.shape.type === "polygon" ? "stretch" : "contain";
      return garment(p, (r.x / 100) * W, (r.y / 100) * H, (r.w / 100) * W, (r.h / 100) * H, fit);
    })
    .join("\n");
  out(
    lb.image.src,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${defs(seed)}
${concrete(W, H, seed)}
${items}
<rect width="${W}" height="${H}" fill="url(#light)"/>
<text x="${W - 36}" y="${H - 34}" text-anchor="end" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" letter-spacing="4" fill="#ffffff" opacity=".7">DEMO PLACEHOLDER · ${esc(lb.title)}</text>
</svg>`,
  );
}

// ---------- products ----------
for (const p of products) {
  const sil = silhouettes[p.silhouette];
  const W = 900;
  const H = 1200;
  const seed = hash(p.id) % 1000;
  const frame = (inner, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${defs(seed)}
<rect width="${W}" height="${H}" fill="#eaece6"/>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".12"/>
${inner}
<text x="44" y="${H - 50}" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="20" letter-spacing="3" fill="#20251f" opacity=".55">DEMO · ${esc(p.brand.toUpperCase())} · ${esc(label)}</text>
</svg>`;
  const [img1, img2] = p.images;
  if (img1) out(img1, frame(garment(p, 110, 170, 680, 820, "contain"), "FRONT"));
  if (img2)
    out(
      img2,
      frame(
        `<g transform="translate(${W / 2} ${H / 2}) scale(2.1) translate(${-W / 2} ${-H / 2 - 60})">${garment(p, 110, 170, 680, 820, "contain")}</g>`,
        "DETAIL",
      ),
    );
  if (p.cutout) {
    const CW = 800;
    const CH = Math.round(CW / Math.max(sil.aspect, 0.35));
    out(
      p.cutout,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">
${defs(seed)}
${garment(p, 30, 30, CW - 60, CH - 60, "contain")}
</svg>`,
    );
  }
}

// ---------- editorial ----------
function ridge(rand, W, baseY, amp, rough) {
  const n = 64;
  let pts = [];
  let y = baseY;
  for (let i = 0; i <= n; i++) {
    y += (rand() - 0.5) * amp * rough;
    y = Math.max(baseY - amp, Math.min(baseY + amp * 0.4, y));
    pts.push([(i / n) * W, y]);
  }
  // пики
  const peaks = 2 + Math.floor(rand() * 2);
  for (let k = 0; k < peaks; k++) {
    const c = Math.floor(rand() * n);
    const width = 6 + Math.floor(rand() * 10);
    for (let i = Math.max(0, c - width); i <= Math.min(n, c + width); i++) {
      const t = 1 - Math.abs(i - c) / width;
      pts[i][1] -= amp * 0.9 * t * t;
    }
  }
  return pts;
}
function editorial(W, H, seed, withLake) {
  const rand = rng(seed);
  const layers = [
    { y: 0.4, amp: 0.16, col: "#cfd5c9", op: 0.9 },
    { y: 0.49, amp: 0.14, col: "#b4bdaa", op: 0.95 },
    { y: 0.59, amp: 0.1, col: "#96a189", op: 1 },
    { y: 0.71, amp: 0.08, col: "#707d65", op: 1 },
    { y: 0.85, amp: 0.06, col: "#4b5644", op: 1 },
  ];
  const paths = layers
    .map((l, i) => {
      const pts = ridge(rand, W, l.y * H, l.amp * H, 0.35);
      const d = `M0 ${H} L${pts.map((p) => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`).join(" L")} L${W} ${H} Z`;
      const mist =
        i < layers.length - 1
          ? `<rect y="${(l.y * H - H * 0.04).toFixed(0)}" width="${W}" height="${(H * 0.16).toFixed(0)}" fill="url(#mist)"/>`
          : "";
      return `<path d="${d}" fill="${l.col}" opacity="${l.op}"/>${mist}`;
    })
    .join("\n");
  const trees = Array.from({ length: 24 }, () => {
    const x = rand() * W;
    const h = H * (0.025 + rand() * 0.04);
    const y = H * (0.9 + rand() * 0.09);
    return `<path d="M${x.toFixed(0)} ${(y - h).toFixed(0)} L${(x + h * 0.2).toFixed(0)} ${y.toFixed(0)} L${(x - h * 0.2).toFixed(0)} ${y.toFixed(0)} Z" fill="#2f382c" opacity=".85"/>`;
  }).join("");
  const lake = withLake
    ? `<rect y="${(H * 0.88).toFixed(0)}" width="${W}" height="${(H * 0.12).toFixed(0)}" fill="#8e9a8f"/><rect y="${(H * 0.88).toFixed(0)}" width="${W}" height="3" fill="#e7ebe3" opacity=".6"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe3dc"/><stop offset=".6" stop-color="#f1f1ea"/></linearGradient>
  <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f7f3" stop-opacity="0"/><stop offset=".35" stop-color="#f7f7f3" stop-opacity=".5"/><stop offset="1" stop-color="#f7f7f3" stop-opacity="0"/></linearGradient>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .18 0"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="${(W * 0.72).toFixed(0)}" cy="${(H * 0.22).toFixed(0)}" r="${(H * 0.07).toFixed(0)}" fill="#fbfbf6" opacity=".9"/>
${paths}
${trees}
${lake}
<rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
}
out("/images/editorial/hero.svg", editorial(2400, 1500, 42, false));
out("/images/editorial/about.svg", editorial(1200, 1600, 7, true));

console.log(`placeholders: ${written} file(s) written${force ? " (force)" : ""}`);
