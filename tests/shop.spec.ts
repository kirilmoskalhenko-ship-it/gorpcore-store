import { expect, test, type Page } from "@playwright/test";
import { products, purchasable, unpriced } from "./data";
import { visitStore } from "./helpers";

async function openFromCatalog(page: Page, id: string) {
  const card = page.getByTestId(`product-card-${id}`);
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button").click();
  await expect(page.getByTestId("product-modal")).toBeVisible();
}

const closeModal = (page: Page) => page.getByTestId("product-modal").getByRole("button", { name: "Закрыть" }).click();
const unique = purchasable.find((p) => p.unique);
const multi = purchasable.find((p) => !p.unique && p.variants.some((v) => v.stock >= 2));

test.describe("Каталог, карточка, корзина", () => {
  test("карточка товара: бренд, модель, цена или «уточняется», наличие", async ({ page }) => {
    const p = products[0]!;
    await visitStore(page);
    await openFromCatalog(page, p.id);
    const modal = page.getByTestId("product-modal");
    await expect(page.getByTestId("product-title")).toHaveText(p.model);
    await expect(modal).toContainText(p.brand);
    await expect(page.getByTestId("product-price")).toContainText(p.price === null ? "Цена уточняется" : "₽");
    await expect(page.getByTestId("product-availability")).toBeVisible();
  });

  test("товар без цены нельзя положить в корзину", async ({ page }) => {
    test.skip(!unpriced.length, "у всех товаров есть цена");
    const p = unpriced[0]!;
    await visitStore(page, `/?product=${p.id}`);
    await expect(page.getByTestId("add-to-bag")).toBeDisabled();
    await expect(page.getByTestId("add-to-bag")).toHaveText(/ЦЕНА УТОЧНЯЕТСЯ/);
    await expect(page.getByTestId("price-pending")).toBeVisible();
  });

  test("единственный экземпляр — не больше одного в корзине", async ({ page }) => {
    test.skip(!unique, "нет unique-товара с ценой");
    await visitStore(page, `/?product=${unique!.id}`);
    const add = page.getByTestId("add-to-bag");
    await add.click();
    await expect(page.getByTestId("cart-count")).toHaveText("1");
    await expect(add).toBeDisabled();
    await expect(add).toContainText("УЖЕ В КОРЗИНЕ");
  });

  test("корзина: количество ограничено остатком, удаление, сохранение", async ({ page }) => {
    test.skip(!multi, "нет товара с остатком ≥ 2 и ценой");
    const p = multi!;
    const v = p.variants.find((x) => x.stock >= 2)!;
    await visitStore(page, `/?product=${p.id}`);
    await page.getByTestId(`size-${v.size}`).click();
    await page.getByTestId("add-to-bag").click();
    await closeModal(page);
    await page.getByTestId("cart-button").click();
    const drawer = page.getByTestId("cart-drawer");
    const inc = drawer.getByTestId("qty-inc");
    for (let q = 1; q < v.stock; q++) await inc.click();
    await expect(drawer.getByTestId("line-qty")).toHaveText(String(v.stock));
    await expect(inc).toBeDisabled();
    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText(String(v.stock));
    await page.getByTestId("cart-button").click();
    await page.getByTestId("cart-drawer").getByTestId("remove-line").click();
    await expect(page.getByTestId("cart-count")).toHaveText("0");
  });

  test("демо-checkout не создаёт фальшивую оплату", async ({ page }) => {
    test.skip(!purchasable.length, "нет товаров с ценой");
    await visitStore(page, `/?product=${purchasable[0]!.id}`);
    await page.getByTestId("add-to-bag").click();
    await closeModal(page);
    await page.getByTestId("cart-button").click();
    await page.getByTestId("checkout-button").click();
    await page.getByTestId("checkout-continue").click();
    await expect(page.getByTestId("checkout")).toContainText("Укажите имя");
    await page.getByTestId("checkout-name").fill("Тест Тестов");
    await page.getByTestId("checkout-phone").fill("+7 900 000-00-00");
    await page.getByTestId("checkout-email").fill("test@example.com");
    await page.getByTestId("checkout-city").fill("Москва");
    await page.getByTestId("checkout-address").fill("ул. Тестовая, 1");
    await page.getByTestId("checkout-continue").click();
    await page.getByTestId("checkout-place").click();
    await expect(page.getByTestId("checkout-result")).toContainText("деньги не списаны");
  });

  test("категории: только непустые, фильтр показывает товары категории", async ({ page }) => {
    await visitStore(page);
    const used = [...new Set(products.map((p) => p.category))];
    for (const c of ["jackets", "fleeces", "pants", "footwear", "headwear", "accessories"]) {
      await expect(page.getByTestId(`category-${c}`)).toHaveCount(used.includes(c as never) ? 1 : 0);
    }
    const cat = used[0]!;
    await page.getByTestId(`category-${cat}`).scrollIntoViewIfNeeded();
    await page.getByTestId(`category-${cat}`).click();
    await expect(page.getByTestId("catalog-grid").locator('[data-testid^="product-card-"]')).toHaveCount(
      products.filter((p) => p.category === cat).length,
    );
  });

  test("Build your fit: выбор вещей и проверка перед добавлением в корзину", async ({ page }) => {
    const hat = products.find((p) => p.category === "headwear")!;
    const pants = products.find((p) => p.category === "pants")!;
    await visitStore(page);
    await page.getByTestId("fit-tab-headwear").scrollIntoViewIfNeeded();
    await page.getByTestId("fit-tab-headwear").click();
    await page.getByTestId(`fit-item-${hat.id}`).click();
    await page.getByTestId("fit-tab-pants").click();
    await page.getByTestId(`fit-item-${pants.id}`).click();
    await expect(page.getByTestId("fit-summary").locator("li")).toHaveCount(2);
    await page.getByTestId("fit-add-all").click();
    const addable = [hat, pants].filter((p) => p.price !== null).length;
    await expect(page.getByTestId("cart-count")).toHaveText(String(addable));
    if (addable < 2) await expect(page.getByTestId("toast")).toContainText("цена уточняется");
  });

  test("Build your fit: drag-and-drop на desktop", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) < 1024, "desktop: drag-and-drop");
    const pants = products.find((p) => p.category === "pants")!;
    await visitStore(page);
    await page.getByTestId("fit-tab-pants").scrollIntoViewIfNeeded();
    await page.getByTestId("fit-tab-pants").click();
    const src = (await page.getByTestId(`fit-item-${pants.id}`).boundingBox())!;
    const dst = (await page.getByTestId("fit-canvas").boundingBox())!;
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 3);
    await page.mouse.down();
    await page.mouse.move(src.x + src.width / 2 + 20, src.y + src.height / 3, { steps: 4 });
    await page.mouse.move(dst.x + dst.width * 0.75, dst.y + dst.height * 0.4, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByTestId("fit-slot-pants").getByRole("button", { name: new RegExp(pants.model) })).toBeVisible();
  });

  test("последний размер подсвечивается в каталоге и в карточке", async ({ page }) => {
    const last = purchasable.find((p) => !p.unique && p.variants.length > 1 && p.variants.filter((v) => v.stock > 0).length === 1);
    test.skip(!last, "нет товара с последним размером");
    const size = last!.variants.find((v) => v.stock > 0)!.size;
    await visitStore(page);
    const card = page.getByTestId(`product-card-${last!.id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByTestId("stock-alert")).toContainText(`LAST SIZE · ${size}`);
    await card.getByRole("button").click();
    await expect(page.getByTestId("stock-alert-modal")).toContainText(`последний размер — ${size}`);
    // доступен только оставшийся размер
    for (const v of last!.variants) {
      if (v.stock > 0) await expect(page.getByTestId(`size-${v.size}`)).toBeEnabled();
      else await expect(page.getByTestId(`size-${v.size}`)).toBeDisabled();
    }
  });

  test("нет горизонтальной прокрутки", async ({ page }) => {
    await visitStore(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
