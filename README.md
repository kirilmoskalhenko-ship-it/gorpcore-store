# ALTITUDE ARCHIVE — одностраничный gorpcore-магазин

Next.js 16 (App Router) · TypeScript strict · Tailwind 4 · GSAP · Zustand · lucide-react.
Архитектура — в [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # eslint + tsc + next build
```

## Деплой на Vercel через GitHub

Проект — стандартное Next.js-приложение; Vercel определяет его автоматически, `vercel.json` не нужен.

1. Создайте пустой репозиторий на GitHub (без README и .gitignore).
2. В папке `altitude-archive` (корень репозитория — именно она, не родительская папка):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ALTITUDE ARCHIVE"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
3. Vercel → Add New → Project → Import этого репозитория. Настройки по умолчанию:
   Framework — Next.js, Build Command — `next build`, Output — `.next`, Install — `npm install`, Node.js — 20.x или новее.
4. Environment Variables (необязательно): `NEXT_PUBLIC_SITE_URL=https://ваш-домен` — см. `.env.example`.
   Без неё используется production-домен Vercel.

Перед каждым пушем: `npm run check` (ресурсы с точным регистром имён, ESLint, TypeScript, production build).
Секреты в репозиторий не попадают: `.env*` (кроме `.env.example`), `.vercel`, `node_modules`, `.next` исключены в `.gitignore`.

## Тесты (Playwright smoke)

```bash
npm run build
npx playwright install chromium   # один раз; или PW_CHANNEL=msedge / chrome — установленный браузер
npm run test:e2e
```

Проекты: `desktop` (1440×900) и `iphone` (эмуляция iPhone 13: touch, мобильный UA).
Покрыто: заставка (Skip, частичный и полный drag мышью и пальцем, клавиатура, Replay, прямая ссылка),
hotspots (hover-карточка, tap-tap на телефоне, совпадение зон с кадром), карточка товара и `?product=` + «Назад»,
корзина (остатки, unique, сохранение), демо-checkout, фильтры, конструктор (tap и drag-and-drop), отсутствие горизонтального скролла.

## Где что редактировать

| Что | Файл |
|---|---|
| Название, тексты, цвета, логотип, hero/about-фото, заставка | `src/config/site-config.ts` |
| Пункты меню | `src/config/navigation.ts` |
| Товары (стабильные `id`, цена в ₽, размеры и остатки, `unique`) | `src/data/products.json` |
| Лукбуки (фото, товары, зоны в % кадра, порядок) | `src/data/lookbooks.json` |

* Заменить фото лукбука: положить файл в `public/images/lookbooks/` и поменять `image.src` (и `width/height` исходника).
* Зоны: `rect {x,y,w,h}` или `polygon {points}` в процентах исходного кадра. Визуальный редактор:
  `npm run dev` → `/?hotspot-editor=1` (только dev-сборка, в production не попадает) → Copy JSON.
* Плейсхолдеры: `node scripts/generate-placeholders.mjs` (создаёт только отсутствующие `.svg`).
* `/?product=jacket-001` — прямая ссылка на товар; `/?intro=1` — показать заставку снова (или REPLAY INTRO в футере).

## Добавление товаров по фотографиям

1. Положите фото в `public/images/products/photos/<id>.png|jpg|webp` (id — стабильный ID товара).
2. Добавьте товар в `src/data/products.json`: `"images": ["/images/products/photos/<id>.webp"]`,
   `"cutout": "/images/products/cutouts/<id>.png"`. Неизвестная цена — `"price": null`
   (товар виден с пометкой «Цена уточняется», купить нельзя), нет поля `condition` — «Уточняется».
3. `node scripts/photos.mjs cutouts` — вырезает фон (светлый студийный фон). Если остался ореол —
   добавьте товару `"cutoutTolerance": 50` и/или `"cutoutErode": 3` и запустите с `--force`.
   Тень со съёмки под обувью/очками — `"cutoutShadow": true` (станет полупрозрачной тенью);
   вешалка или водяной знак — `"cutoutCrop": { "top": 0.1 }` (обрезка краёв кадра в долях).
   Если фон неоднородный и не отделяется — уберите поле `cutout`: в карточке будет исходное фото.
   Подсветка остатков считается сама: из сетки остался один размер — «LAST SIZE», осталось ≤ 2 шт. — «Скоро закончится».
   Проверить вырезки: `node scripts/contact-sheet.mjs public/images/products/cutouts sheet.png`.
4. Лукбук из вырезок: в `lookbooks.json` задайте `"composition"` (рамки вещей в % кадра 1200×1600,
   необязательный `rotate`) и запустите `node scripts/photos.mjs lookbooks` — скрипт разложит вещи
   на бетоне с тенью и сам пересчитает `hotspots` по силуэтам.

## Заставка «Zip to enter»

Fallback (сейчас) работает без файлов, вид задаётся `intro.style` в `site-config.ts`:
`"fullscreen"` (по умолчанию) — весь экран — ткань куртки с молнией, сквозь разрез видна витрина,
в финале половины разъезжаются; `"jacket"` — векторная куртка по центру. Цвета — `intro.jacket`.
Production: положите кадры расстёгивания в `public/images/intro/frames/frame-000.webp …`
и укажите `intro.frames.count`, `width/height`, `zipTop/zipBottom` (доли кадра) в `site-config.ts`.
Компонент менять не нужно; при ошибке загрузки кадров включается fallback.

## Оплата

Checkout — демонстрационный: `src/lib/commerce/index.ts` проверяет остатки и честно возвращает
`payment_not_configured`. Для реальной оплаты реализуйте `CommerceAdapter` на сервере
(резерв остатков, цена из БД, подтверждение по webhook).

## Нужные от вас материалы

1. 8 вертикальных flat-lay фото 3:4 (бетон, вид сверху) + реальные координаты зон.
2. Фото товаров (2+ на товар) и вырезки на прозрачном фоне для конструктора (`cutout`).
3. Hero- и about-фото; последовательность кадров куртки для заставки.
4. Реальный каталог (сейчас все товары, бренды и цены — демонстрационные).
