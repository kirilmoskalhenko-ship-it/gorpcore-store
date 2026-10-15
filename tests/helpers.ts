import { expect, type Page } from "@playwright/test";

export const INTRO_KEY = "aa:intro:v1";

/** Пропустить заставку: как будто пользователь уже проходил её. */
export async function visitStore(page: Page, path = "/") {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, "done");
    } catch {}
  }, INTRO_KEY);
  await page.goto(path);
  await expect(page.getByTestId("zip-intro")).toHaveCount(0);
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768;

/** Перетаскивание пальцем через CDP touch-события (Chromium). */
export async function touchDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 14) {
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from.x, from.y) });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x, y) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Перетаскивание бегунка молнии до доли `fraction` хода (мышь или палец). */
export async function dragZip(page: Page, fraction: number, mode: "mouse" | "touch") {
  const puller = page.getByTestId("zip-puller");
  const box = (await puller.boundingBox())!;
  const vh = page.viewportSize()!.height;
  // ход бегунка ≈ от его текущей позиции до низа куртки (~ 93% высоты экрана)
  const start = { x: box.x + box.width / 2, y: box.y + 24 };
  const end = { x: start.x, y: start.y + (vh * 0.93 - start.y) * fraction };
  if (mode === "touch") {
    await touchDrag(page, start, end);
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 14 });
    await page.mouse.up();
  }
}
