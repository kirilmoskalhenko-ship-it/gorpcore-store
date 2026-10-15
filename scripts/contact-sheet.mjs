// Контактный лист вырезок на цветном фоне: node sheet.mjs <dir> <out.png>
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const [dir, out] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const cell = 260;
const cols = 5;
const rows = Math.ceil(files.length / cols);
const layers = [];
for (const [i, f] of files.entries()) {
  const buf = await sharp(join(dir, f)).resize({ width: cell - 20, height: cell - 40, fit: "inside" }).png().toBuffer();
  const m = await sharp(buf).metadata();
  const x = (i % cols) * cell + (cell - m.width) / 2;
  const y = Math.floor(i / cols) * cell + 10;
  layers.push({ input: buf, left: Math.round(x), top: Math.round(y) });
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="24"><text x="6" y="16" font-size="12" font-family="Arial" fill="#000">${f.replace(".png", "")}</text></svg>`;
  layers.push({ input: Buffer.from(label), left: (i % cols) * cell, top: Math.floor(i / cols) * cell + cell - 26 });
}
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#e7b8b8" } })
  .composite(layers)
  .png()
  .toFile(out);
console.log(out);
