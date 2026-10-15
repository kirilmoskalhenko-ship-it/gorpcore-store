# ALTITUDE ARCHIVE — план реализации

Одностраничный магазин gorpcore / outdoor. Вся витрина живёт на маршруте `/`; карточка товара,
«Shop the look», корзина и оформление заказа — модальные слои поверх страницы.

## Стек

| Задача | Решение |
|---|---|
| Фреймворк | Next.js 16 (App Router, Turbopack), React 19, TypeScript `strict` |
| Стили | Tailwind CSS 4 (`@theme`-токены из `globals.css`, значения — из `site-config.ts`) |
| Анимации | GSAP 3 (+ ScrollTrigger) — молния, появление при прокрутке, hero |
| Состояние | Zustand: `cart` (persist → localStorage), `ui` (модалки, панель), `fit` (конструктор) |
| Иконки | lucide-react |
| Изображения | `next/image`; SVG-плейсхолдеры генерирует `scripts/generate-placeholders.mjs` |
| Тесты | ESLint, `tsc --noEmit`, `next build`, Playwright smoke (desktop + iPhone-эмуляция) |

## Структура

```
src/
  app/            layout.tsx (шрифты, inline-скрипт состояния intro), page.tsx, globals.css
  config/         site-config.ts (бренд, тексты, цвета, intro, контакты), navigation.ts
  data/           products.json, lookbooks.json — единственный источник товаров
  lib/            types.ts, catalog.ts (индексы, валидация ссылок), hotspots.ts (object-fit,
                  геометрия зон), product-url.ts (?product=), commerce/ (интерфейс оплаты)
  store/          cart.ts, ui.ts, fit.ts
  components/
    intro/        ZipIntro (жест), renderers: FrameSequenceRenderer / FallbackJacketRenderer
    layout/       Header, Footer, MobileMenu
    sections/     Hero, Lookbooks, Catalog, FitBuilder, About
    lookbook/     LookbookCard, HotspotLayer, ShopTheLook, LookbookHotspotEditor (dev-only)
    product/      ProductModal, ProductCard, ProductImage, SizePicker
    cart/         CartDrawer, Checkout
    ui/           Sheet (диалог), Reveal, TopoLines, Toast
```

## Модель данных

* `Product` — стабильный `id` (`jacket-001`), бренд, модель, категория, цена в ₽ (целое),
  состояние, `unique` (единственный экземпляр → максимум 1 в корзине), `variants[]` (размер + остаток),
  `images[]`, `cutout` (изображение для конструктора), `silhouette` (форма плейсхолдера).
* `Lookbook` — `id`, `title`, `description`, `image {src,width,height,alt}`, `productIds[]`,
  `hotspots[]`, `order`. Зона: `{ productId, shape: rect{x,y,w,h} | polygon{points} }` в процентах
  исходного кадра. Отрисовка пересчитывает проценты через фактический прямоугольник картинки
  при `object-fit: cover | contain` (`lib/hotspots.ts`).
* Каталог, лукбуки, конструктор и корзина читают товары только через `lib/catalog.ts`.
  При загрузке проверяется, что все `productIds` и `hotspots[].productId` существуют
  (ошибка в dev, отбрасывание битых ссылок в production).

## URL и навигация

* `/?product=<id>` — открытая карточка. Открытие делает `history.pushState`, закрытие — `history.back()`
  (если карточку открыли мы) или `replaceState`. `popstate` синхронизирует стор → «Назад» закрывает карточку.
* Якоря `#lookbook`, `#shop`, `#build`, `#about`.
* `?intro=1` — принудительно показать заставку. Прямая ссылка на товар заставку пропускает.

## Входная заставка «Zip to enter»

* Прогресс `p ∈ [0,1]` хранится в ref, не в React-state; рендерер получает `render(p)`.
* Жест: Pointer Events + `setPointerCapture`, бегунок движется только по вертикали между
  точками `zip.top` и `zip.bottom` (нормализованные координаты кадра). Экранная позиция
  считается при каждом движении через `getScreenCTM`, поэтому resize/поворот не ломают жест.
* Отпустили на середине — прогресс сохраняется. `p ≥ 0.95` — GSAP доводит до 1, половины уходят,
  слой исчезает, в localStorage пишется `aa:intro=done`.
* **Production mode** (`siteConfig.intro.frames.count > 0`): canvas рисует кадр `round(p·(n−1))`
  из последовательности `/images/intro/frames/frame-000.webp…`. Ошибка загрузки → fallback.
* **Fallback mode**: SVG-куртка в двух копиях с clip-path масками; разрез — V-кривая от горловины
  до бегунка, половины расходятся и поворачиваются вокруг плеч, сквозь разрез видна витрина.
* Skip intro, Esc, клавиатура (стрелки) для доступности, `prefers-reduced-motion` → без доводящих
  анимаций, финал — короткое затухание. Replay intro — кнопка в футере.
* Флеш-защита: inline-скрипт в `<head>` ставит `html[data-intro]` до первой отрисовки.

## Корзина и checkout

* Добавление проходит проверку: товар существует, размер существует, остаток > 0,
  количество ≤ остатка, `unique` → 1. Возвращается `{ ok, reason }`, UI показывает причину.
* Checkout — состояние модалки: контакты → доставка → обзор. Отправка вызывает
  `CommerceAdapter` (`lib/commerce`). Demo-адаптер проверяет остатки по JSON и честно
  отвечает `payment_not_configured`: заказ не создаётся, деньги не списываются.
  Для production нужно реализовать `validateCart` и `createPaymentSession` на сервере.

## Этапы

1. Структура проекта, дизайн-система, данные, плейсхолдеры.
2. Header, Hero, About, Footer, навигация.
3. Лукбуки, hotspots, floating-card, Shop the look, карточка товара + URL.
4. Каталог с фильтрами, корзина, checkout.
5. Конструктор образов (drag-and-drop на desktop, tap на mobile).
6. Интерактивная молния (оба режима).
7. Адаптивность (iPhone safe-area), reveal-анимации, оптимизация.
8. ESLint, typecheck, build, Playwright smoke — исправление ошибок.

После каждого этапа — `npm run typecheck` и `npm run build`.
