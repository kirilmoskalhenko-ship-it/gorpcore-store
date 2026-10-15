import type { HotspotShape } from "./types";

export type ObjectFit = "cover" | "contain";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Прямоугольник, который реально занимает картинка внутри контейнера при object-fit.
 * Для cover он больше контейнера (выходит за края), для contain — меньше (поля).
 */
export function renderedImageRect(
  container: { width: number; height: number },
  natural: { width: number; height: number },
  fit: ObjectFit,
  position: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Rect {
  const sx = container.width / natural.width;
  const sy = container.height / natural.height;
  const scale = fit === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    x: (container.width - width) * position.x,
    y: (container.height - height) * position.y,
    width,
    height,
  };
}

/** Точки фигуры в процентах исходного кадра. */
export function shapePoints(shape: HotspotShape): [number, number][] {
  if (shape.type === "polygon") return shape.points;
  const { x, y, w, h } = shape;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** Проценты кадра → пиксели контейнера с учётом фактической области изображения. */
export function toContainerPoints(shape: HotspotShape, img: Rect): [number, number][] {
  return shapePoints(shape).map(([px, py]) => [img.x + (px / 100) * img.width, img.y + (py / 100) * img.height]);
}

export function shapeBounds(shape: HotspotShape) {
  const pts = shapePoints(shape);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Точка внутри полигона (ray casting). Координаты в любых одинаковых единицах. */
export function pointInPolygon(pt: [number, number], poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
