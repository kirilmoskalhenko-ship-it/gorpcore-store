import { expect, test } from "@playwright/test";
import { products } from "./data";
import { dragZip, INTRO_KEY, isMobile } from "./helpers";

test.describe("Zip to enter", () => {
  test("первый визит показывает куртку, Skip intro открывает магазин и запоминается", async ({ page }) => {
    await page.goto("/");
    const intro = page.getByTestId("zip-intro");
    await expect(intro).toBeVisible();
    await expect(intro).toHaveAttribute("data-mode", "fallback");
    await page.getByTestId("skip-intro").click();
    await expect(intro).toHaveCount(0, { timeout: 5000 });
    expect(await page.evaluate((k) => localStorage.getItem(k), INTRO_KEY)).toBe("done");

    await page.reload();
    await expect(page.getByRole("heading", { name: /BEYOND THE EVERYDAY/ })).toBeVisible();
    await expect(page.getByTestId("zip-intro")).toHaveCount(0);
  });

  test("частичное перетаскивание сохраняет прогресс, полное — раскрывает магазин", async ({ page }) => {
    await page.goto("/");
    const puller = page.getByTestId("zip-puller");
    await expect(puller).toBeVisible();
    const mode = isMobile(page) ? "touch" : "mouse";

    await dragZip(page, 0.4, mode);
    const partial = Number(await puller.getAttribute("aria-valuenow"));
    expect(partial).toBeGreaterThan(15);
    expect(partial).toBeLessThan(90);
    // отпустили — прогресс остался, заставка не закрылась
    await page.waitForTimeout(400);
    expect(Number(await puller.getAttribute("aria-valuenow"))).toBe(partial);
    await expect(page.getByTestId("zip-intro")).toBeVisible();

    await dragZip(page, 1.2, mode);
    await expect(page.getByTestId("zip-intro")).toHaveCount(0, { timeout: 6000 });
    await expect(page.locator("html")).toHaveAttribute("data-intro", "done");
  });

  test("клавиатура: стрелки двигают бегунок", async ({ page }) => {
    test.skip(isMobile(page), "только desktop");
    await page.goto("/");
    const puller = page.getByTestId("zip-puller");
    await puller.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    expect(Number(await puller.getAttribute("aria-valuenow"))).toBe(12);
  });

  test("прямая ссылка на товар пропускает заставку, «Назад» закрывает карточку", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("skip-intro").click();
    await expect(page.getByTestId("zip-intro")).toHaveCount(0);
    await page.evaluate((k) => localStorage.removeItem(k), INTRO_KEY);

    const p = products[0]!;
    await page.goto(`/?product=${p.id}`);
    await expect(page.getByTestId("zip-intro")).toHaveCount(0);
    await expect(page.getByTestId("product-title")).toHaveText(p.model);
  });

  test("Replay intro показывает заставку снова", async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, "done"), INTRO_KEY);
    await page.goto("/");
    await page.getByTestId("replay-intro").click();
    await expect(page.getByTestId("zip-intro")).toBeVisible();
    await expect(page.getByTestId("zip-puller")).toHaveAttribute("aria-valuenow", "0");
  });
});
