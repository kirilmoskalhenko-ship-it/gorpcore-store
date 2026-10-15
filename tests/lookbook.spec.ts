import { expect, test } from "@playwright/test";
import { firstLook, lookbooks, productById } from "./data";
import { isMobile, visitStore } from "./helpers";
import { shapeBounds } from "../src/lib/hotspots";

const spot = firstLook.hotspots[0]!;
const spotProduct = productById(spot.productId);

test.describe("Flat lay лукбуки", () => {
  test("все лукбуки и их интерактивные зоны на месте", async ({ page }) => {
    await visitStore(page);
    await expect(page.locator('[data-testid^="lookbook-"]')).toHaveCount(lookbooks.length);
    await expect(page.locator(`[data-testid^="hotspot-${firstLook.id}-"]`)).toHaveCount(firstLook.hotspots.length);
  });

  test("hover показывает floating-card, клик открывает товар", async ({ page }) => {
    test.skip(isMobile(page), "desktop: hover");
    await visitStore(page);
    const zone = page.getByTestId(`hotspot-${firstLook.id}-${spot.productId}`);
    await zone.scrollIntoViewIfNeeded();
    await zone.hover();
    const card = page.getByTestId("hotspot-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText(spotProduct.model);
    await expect(card).toContainText("VIEW ITEM");
    await zone.click();
    await expect(page.getByTestId("product-title")).toHaveText(spotProduct.model);
    await expect(page).toHaveURL(new RegExp(`product=${spotProduct.id}`));

    // «Назад» закрывает карточку и убирает параметр
    await page.goBack();
    await expect(page.getByTestId("product-modal")).toHaveCount(0);
    await expect(page).not.toHaveURL(/product=/);
  });

  test("зоны совпадают с кадром при object-fit: cover", async ({ page }) => {
    await visitStore(page);
    const card = page.getByTestId(`lookbook-${firstLook.id}`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500); // reveal-анимация
    const img = (await card.locator("img").first().boundingBox())!;
    for (const h of firstLook.hotspots) {
      const box = (await page.getByTestId(`hotspot-${firstLook.id}-${h.productId}`).boundingBox())!;
      const b = shapeBounds(h.shape);
      // сравниваем центры — bbox SVG в Chromium включает обводку
      expect(Math.abs(box.x + box.width / 2 - (img.x + (img.width * (b.x + b.w / 2)) / 100))).toBeLessThan(1.5);
      expect(Math.abs(box.y + box.height / 2 - (img.y + (img.height * (b.y + b.h / 2)) / 100))).toBeLessThan(1.5);
    }
  });

  test("touch: первое касание выбирает, касание карточки открывает", async ({ page }) => {
    test.skip(!isMobile(page), "mobile: tap");
    await visitStore(page);
    const zone = page.getByTestId(`hotspot-${firstLook.id}-${spot.productId}`);
    await zone.scrollIntoViewIfNeeded();
    await zone.tap();
    await expect(page.getByTestId("hotspot-card")).toContainText(spotProduct.model);
    await expect(page.getByTestId("product-modal")).toHaveCount(0);
    await page.getByTestId("hotspot-card").tap();
    await expect(page.getByTestId("product-title")).toHaveText(spotProduct.model);
  });

  test("Shop the look показывает все вещи образа", async ({ page }) => {
    await visitStore(page);
    const btn = page.getByTestId(`shop-the-look-${firstLook.id}`);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    const sheet = page.getByTestId("shop-the-look");
    await expect(sheet).toBeVisible();
    for (const id of firstLook.productIds) await expect(sheet).toContainText(productById(id).model);
  });
});
