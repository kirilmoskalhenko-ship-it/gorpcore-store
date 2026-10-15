/** Смешивание цвета с чёрным (amt < 0) или белым (amt > 0). */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  return `#${ch.map((c) => Math.round(c + (t - c) * k).toString(16).padStart(2, "0")).join("")}`;
}
