// Обработка фотографий товаров и сборка flat-lay лукбуков.
//
//   node scripts/photos.mjs cutouts [--force]   — вырезать фон: public/images/products/photos/<id>.* → cutouts/<id>.png
//   node scripts/photos.mjs lookbooks           — собрать лукбуки с полем "composition" на бетонной поверхности
//   node scripts/photos.mjs all [--force]
//
// Вырезка: фон определяется по краям кадра (светлый студийный фон), заливкой от краёв
// и удалением крупных замкнутых областей фона (например, внутри петли ремня).
// Настройки товару в products.json: "cutoutTolerance": 40 (порог фона), "cutoutErode": 3 (подрезка края, px),
// "cutoutCrop": { "top": 0.08, "bottom": 0.05 } (обрезать края кадра до вырезки, доли),
// "cutoutShadow": true (тень со съёмки → полупрозрачная тень вместо светлого пятна).
// Лукбук: вещи раскладываются по прямоугольникам composition (в % кадра), с мягкой тенью;
// зоны hotspots пересчитываются автоматически по фактическому силуэту вещи.
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const productsPath = join(root, "src/data/products.json");
const lookbooksPath = join(root, "src/data/lookbooks.json");
const force = process.argv.includes("--force");
const cmd = process.argv[2] ?? "all";

const products = JSON.parse(readFileSync(productsPath, "utf8"));
const byId = new Map(products.map((p) => [p.id, p]));
const fsPath = (publicPath) => join(pub, publicPath.replace(/^\//, ""));

// ---------------------------------------------------------------- cutouts
async function cutout(input, output, tolerance = 34, erode = 1, crop = null, shadow = false) {
  let source = sharp(input).rotate();
  if (crop) {
    // обрезка краёв кадра в долях: вешалка сверху, водяной знак снизу и т. п.
    const meta = await sharp(input).rotate().metadata();
    const l = Math.round((crop.left ?? 0) * meta.width);
    const t = Math.round((crop.top ?? 0) * meta.height);
    const w = meta.width - l - Math.round((crop.right ?? 0) * meta.width);
    const h = meta.height - t - Math.round((crop.bottom ?? 0) * meta.height);
    source = sharp(await source.extract({ left: l, top: t, width: w, height: h }).png().toBuffer());
  }
  const img = source.resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];

  // уже прозрачный фон?
  let transparentBorder = 0;
  let borderCount = 0;
  const border = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
  for (const i of border) {
    borderCount++;
    if (data[i * 4 + 3] < 20) transparentBorder++;
  }
  const bgMask = new Uint8Array(N); // 1 = фон
  let bgColor = null;
  if (transparentBorder / borderCount > 0.5) {
    for (let i = 0; i < N; i++) if (data[i * 4 + 3] < 20) bgMask[i] = 1;
  } else {
    // цвет фона — медиана краёв
    const chans = [[], [], []];
    for (const i of border) {
      const [r, g, b] = px(i);
      chans[0].push(r);
      chans[1].push(g);
      chans[2].push(b);
    }
    const med = chans.map((c) => c.sort((a, b) => a - b)[c.length >> 1]);
    bgColor = med;
    const T2 = tolerance * tolerance;
    const bgLike = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const dr = data[i * 4] - med[0];
      const dg = data[i * 4 + 1] - med[1];
      const db = data[i * 4 + 2] - med[2];
      if (dr * dr + dg * dg + db * db < T2 || data[i * 4 + 3] < 20) bgLike[i] = 1;
    }
    // компоненты фоноподобных пикселей: связанные с краем или крупные — фон
    const comp = new Int32Array(N).fill(-1);
    const queue = new Int32Array(N);
    const minArea = N * 0.002;
    for (let s = 0; s < N; s++) {
      if (!bgLike[s] || comp[s] !== -1) continue;
      let head = 0;
      let tail = 0;
      queue[tail++] = s;
      comp[s] = s;
      let touchesEdge = false;
      while (head < tail) {
        const i = queue[head++];
        const x = i % W;
        const y = (i / W) | 0;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchesEdge = true;
        const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
        for (const j of nb) {
          if (j >= 0 && bgLike[j] && comp[j] === -1) {
            comp[j] = s;
            queue[tail++] = j;
          }
        }
      }
      if (touchesEdge || tail > minArea) for (let k = 0; k < tail; k++) bgMask[queue[k]] = 1;
    }
  }

  // удаляем мелкие острова «предмета» (пыль, артефакты)
  const fg = new Uint8Array(N);
  for (let i = 0; i < N; i++) fg[i] = bgMask[i] ? 0 : 1;
  {
    const seen = new Uint8Array(N);
    const queue = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (!fg[s] || seen[s]) continue;
      let head = 0;
      let tail = 0;
      queue[tail++] = s;
      seen[s] = 1;
      while (head < tail) {
        const i = queue[head++];
        const x = i % W;
        const y = (i / W) | 0;
        const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
        for (const j of nb) {
          if (j >= 0 && fg[j] && !seen[j]) {
            seen[j] = 1;
            queue[tail++] = j;
          }
        }
      }
      if (tail < N * 0.0015) for (let k = 0; k < tail; k++) fg[queue[k]] = 0;
    }
  }

  // Тень от съёмки: серые (без цвета) пиксели темнее фона, примыкающие к фону, превращаются
  // в полупрозрачную тень. На бетоне она ложится естественно, а не светлым пятном.
  const shadowA = new Uint8Array(N);
  if (shadow && bgColor) {
    const bgL = (bgColor[0] + bgColor[1] + bgColor[2]) / 3;
    const isShadow = (i) => {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const L = (r + g + b) / 3;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      return fg[i] && chroma < 12 && L < bgL - 10 && L > bgL - 120;
    };
    const depth = new Int16Array(N).fill(-1);
    const queue = new Int32Array(N);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < N; i++) {
      if (fg[i]) continue;
      const x = i % W;
      const y = (i / W) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
      for (const j of nb) if (j >= 0 && depth[j] === -1 && isShadow(j)) { depth[j] = 1; queue[tail++] = j; }
    }
    const maxDepth = Math.round(Math.max(W, H) * 0.06);
    while (head < tail) {
      const i = queue[head++];
      if (depth[i] >= maxDepth) continue;
      const x = i % W;
      const y = (i / W) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
      for (const j of nb) if (j >= 0 && depth[j] === -1 && isShadow(j)) { depth[j] = depth[i] + 1; queue[tail++] = j; }
    }
    for (let i = 0; i < N; i++) {
      if (depth[i] < 0) continue;
      const L = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
      shadowA[i] = Math.min(150, Math.round((bgL - L) * 1.7));
      fg[i] = 0;
    }
  }

  // подрезка края на erode px — убирает светлый ореол исходного фона
  for (let r = 0; r < erode; r++) {
    const prev = fg.slice();
    for (let i = 0; i < N; i++) {
      if (!prev[i]) continue;
      const x = i % W;
      const y = (i / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !prev[i - 1] || !prev[i + 1] || !prev[i - W] || !prev[i + W]) fg[i] = 0;
    }
  }

  // мягкий край: размытая маска
  const mask = Buffer.alloc(N);
  for (let i = 0; i < N; i++) mask[i] = fg[i] ? 255 : 0;
  // extractChannel(0): после blur sharp может вернуть несколько каналов
  const soft = await sharp(mask, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  const out = Buffer.from(data);
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let i = 0; i < N; i++) {
    let a = Math.min(data[i * 4 + 3], soft[i]);
    if (shadowA[i] && a < shadowA[i]) {
      out[i * 4] = 18;
      out[i * 4 + 1] = 20;
      out[i * 4 + 2] = 17;
      a = shadowA[i];
    }
    out[i * 4 + 3] = a;
    if (a > 24) {
      const x = i % W;
      const y = (i / W) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const pad = Math.round(Math.max(W, H) * 0.015);
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const cw = Math.min(W, maxX + pad + 1) - left;
  const ch = Math.min(H, maxY + pad + 1) - top;
  mkdirSync(dirname(output), { recursive: true });
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width: cw, height: ch })
    .png({ compressionLevel: 9 })
    .toFile(output);
  return { width: cw, height: ch, coverage: fg.reduce((s, v) => s + v, 0) / N };
}

async function runCutouts() {
  const photosDir = join(pub, "images/products/photos");
  if (!existsSync(photosDir)) return;
  const files = readdirSync(photosDir);
  for (const p of products) {
    if (!p.cutout?.endsWith(".png") || !p.cutout.includes("/cutouts/")) continue;
    const src = files.find((f) => f.replace(/\.[^.]+$/, "") === p.id);
    if (!src) continue;
    const dst = fsPath(p.cutout);
    if (existsSync(dst) && !force) continue;
    const r = await cutout(join(photosDir, src), dst, p.cutoutTolerance, p.cutoutErode, p.cutoutCrop, p.cutoutShadow);
    console.log(`cutout ${p.id}: ${r.width}×${r.height}, предмет ${(r.coverage * 100).toFixed(0)}% кадра`);
  }
}

// ---------------------------------------------------------------- lookbooks
const LB_W = 1200;
const LB_H = 1600;

function concreteSvg(seed) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LB_W}" height="${LB_H}">
  <filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="${seed}"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .42  0 0 0 0 .4  0 0 0 .5 0"/></filter>
  <filter id="s" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".005" numOctaves="3" seed="${seed + 7}"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .3  0 0 0 0 .29  0 0 0 .45 -.1"/></filter>
  <rect width="100%" height="100%" fill="#b7b6b0"/>
  <rect width="100%" height="100%" filter="url(#s)"/>
  <rect width="100%" height="100%" filter="url(#g)" opacity=".5"/>
</svg>`;
}
const lightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LB_W}" height="${LB_H}">
  <radialGradient id="l" cx=".28" cy=".18" r="1.05"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></radialGradient>
  <rect width="100%" height="100%" fill="url(#l)"/></svg>`;

/** Полигон силуэта по альфа-каналу: левые и правые границы в горизонтальных полосах. */
function silhouette(alpha, w, h, bands = 18) {
  const left = [];
  const right = [];
  for (let b = 0; b <= bands; b++) {
    const y0 = Math.min(h - 1, Math.round((b / bands) * (h - 1)));
    const y1 = Math.min(h - 1, y0 + Math.max(1, Math.round(h / bands / 2)));
    let lx = w;
    let rx = -1;
    for (let y = Math.max(0, y0 - Math.round(h / bands / 2)); y <= y1; y++) {
      // > 160: сама вещь (альфа 255), без полупрозрачной тени (≤ 150)
      for (let x = 0; x < w; x++) if (alpha[y * w + x] > 160) { if (x < lx) lx = x; break; }
      for (let x = w - 1; x >= 0; x--) if (alpha[y * w + x] > 160) { if (x > rx) rx = x; break; }
    }
    if (rx >= lx) {
      left.push([lx, y0]);
      right.push([rx, y0]);
    }
  }
  return [...left, ...right.reverse()];
}

async function runLookbooks() {
  const lookbooks = JSON.parse(readFileSync(lookbooksPath, "utf8"));
  let changed = false;
  for (const lb of lookbooks) {
    if (!Array.isArray(lb.composition)) continue;
    const seed = [...lb.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
    const layers = [];
    const hotspots = [];
    for (const [n, item] of lb.composition.entries()) {
      const p = byId.get(item.productId);
      if (!p) throw new Error(`${lb.id}: нет товара ${item.productId}`);
      const file = fsPath(p.cutout ?? p.images[0]);
      if (!existsSync(file)) throw new Error(`${lb.id}: нет вырезки ${p.cutout} — запустите cutouts`);
      const bw = Math.round((item.w / 100) * LB_W);
      const bh = Math.round((item.h / 100) * LB_H);
      let piece = sharp(file).resize({ width: bw, height: bh, fit: "inside" });
      if (item.rotate) piece = sharp(await piece.png().toBuffer()).rotate(item.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
      const buf = await piece.png().toBuffer();
      const meta = await sharp(buf).metadata();
      const pw = meta.width;
      const ph = meta.height;
      const x = Math.round((item.x / 100) * LB_W + (bw - pw) / 2);
      const y = Math.round((item.y / 100) * LB_H + (bh - ph) / 2);
      // тень: альфа предмета, затемнённая и размытая, со сдвигом вниз
      const alpha = await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer();
      const shadowPad = 40;
      const shadowAlpha = await sharp(alpha, { raw: { width: pw, height: ph, channels: 1 } })
        .extend({ top: shadowPad, bottom: shadowPad, left: shadowPad, right: shadowPad, background: "#000000" })
        .blur(14)
        .linear(0.42, 0)
        .extractChannel(0)
        .raw()
        .toBuffer();
      const sw = pw + shadowPad * 2;
      const sh = ph + shadowPad * 2;
      const shadowRgba = Buffer.alloc(sw * sh * 4);
      for (let i = 0; i < sw * sh; i++) {
        shadowRgba[i * 4] = 22;
        shadowRgba[i * 4 + 1] = 24;
        shadowRgba[i * 4 + 2] = 20;
        shadowRgba[i * 4 + 3] = shadowAlpha[i];
      }
      const shadow = await sharp(shadowRgba, { raw: { width: sw, height: sh, channels: 4 } }).png().toBuffer();
      layers.push({ input: shadow, left: x - shadowPad, top: y - shadowPad + 9 });
      layers.push({ input: buf, left: x, top: y });

      const poly = silhouette(alpha, pw, ph).map(([px, py]) => [
        Math.round(((x + px) / LB_W) * 1000) / 10,
        Math.round(((y + py) / LB_H) * 1000) / 10,
      ]);
      hotspots.push({ id: `h${n + 1}`, productId: p.id, shape: { type: "polygon", points: poly } });
    }
    const base = await sharp(Buffer.from(concreteSvg(seed))).png().toBuffer();
    const src = `/images/lookbooks/${lb.id}.webp`;
    await sharp(base)
      .composite([...layers, { input: Buffer.from(lightSvg) }])
      .webp({ quality: 86 })
      .toFile(fsPath(src));
    lb.image = { ...lb.image, src, width: LB_W, height: LB_H };
    lb.productIds = lb.composition.map((c) => c.productId);
    lb.hotspots = hotspots;
    changed = true;
    console.log(`lookbook ${lb.id}: ${hotspots.length} вещей → ${src}`);
  }
  if (changed) writeFileSync(lookbooksPath, JSON.stringify(lookbooks, null, 2) + "\n");
}

if (cmd === "cutouts" || cmd === "all") await runCutouts();
if (cmd === "lookbooks" || cmd === "all") await runLookbooks();
