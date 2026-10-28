// Gera o ícone e a splash do app (Android e PWA) a partir da arte em public/art.
// Uso: node scripts/build-icons.mjs   (usa o Chromium do Playwright; rode `npx playwright install chromium` antes)
// Saídas: android/app/src/main/res/{mipmap-*,drawable*/splash.jpg} e public/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const res = path.join(root, "android/app/src/main/res");
const data = (f) =>
  "data:image/webp;base64," +
  fs.readFileSync(path.join(root, "public/art", f)).toString("base64");
const SPRITE = data("game-icons-v1.webp"); // 4 células 3:4; a primeira é o livro azul
const LOGO = data("wordquest-logo-v1.webp");
const VILLAGE = data("village-approved-v1.webp");
const GOLD =
  "radial-gradient(circle at 50% 30%, #fff3bd, #ffc83d 68%, #f5a300)";

/** Livro azul (primeira célula do sprite) com `w` px de largura de botão, centrado em (cx, cy). */
const book = (w, cx, cy, shadow = true) => {
  const cellW = w / 0.91;
  const cellH = (cellW * 4) / 3;
  return `<div style="position:absolute;left:${cx - cellW / 2}px;top:${cy - cellH / 2 - cellH * 0.025}px;width:${cellW}px;height:${cellH}px;background:url(${SPRITE}) 0 0/400% 100% no-repeat;${shadow ? `filter:drop-shadow(0 ${w * 0.03}px ${w * 0.05}px #0006);` : ""}"></div>`;
};
const page = (w, h, body, bg = "transparent") =>
  `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;position:relative;background:${bg}">${body}</body>`;

const assets = [];
const add = (file, w, h, html, transparent = false) =>
  assets.push({ file, w, h, html, transparent });

// --- Ícones: fundo dourado (com cantos conforme `radius`) e o livro azul no centro.
const tile = (s, bookW, radius) =>
  page(
    s,
    s,
    `<div style="position:absolute;inset:0;background:${GOLD};border-radius:${radius}">${book(bookW, s / 2, s / 2)}</div>`,
  );
// Android: legado (quadrado arredondado), redondo e primeiro plano adaptativo (transparente).
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  const s = 48 * k;
  const f = 108 * k;
  const dir = `${res}/mipmap-${d}`;
  add(`${dir}/ic_launcher.png`, s, s, tile(s, s * 0.66, "20%"), true);
  add(`${dir}/ic_launcher_round.png`, s, s, tile(s, s * 0.62, "50%"), true);
  add(
    `${dir}/ic_launcher_foreground.png`,
    f,
    f,
    page(f, f, book(f * 0.46, f / 2, f / 2)),
    true,
  );
}
// PWA (o maskable tem fundo cheio e o conteúdo na zona segura).
const pwa = (file, s, bookW, radius) =>
  add(
    `${root}/public/${file}`,
    s,
    s,
    tile(s, s * bookW, radius),
    radius !== "0",
  );
pwa("icon-192.png", 192, 0.66, "20%");
pwa("icon-512.png", 512, 0.66, "20%");
pwa("icon-maskable-512.png", 512, 0.5, "0");
pwa("apple-touch-icon.png", 180, 0.66, "0");
// --- Splash: vila ao fundo, livro e logo no centro.
const splash = (w, h) => {
  const logoW = Math.min(w * 0.8, h * 1.3);
  const logoH = logoW / 3;
  const bookW = logoW * 0.34;
  const gap = logoW * 0.06;
  const total = bookW * 1.33 + gap + logoH;
  const top = (h - total) / 2;
  return page(
    w,
    h,
    `<img src="${VILLAGE}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${w > h ? "filter:blur(2px);" : ""}">
     <div style="position:absolute;inset:0;background:linear-gradient(#1b3f8a55,#1b3f8a22 40%,#1b3f8a66)"></div>
     ${book(bookW, w / 2, top + (bookW * 1.33) / 2)}
     <img src="${LOGO}" style="position:absolute;left:${(w - logoW) / 2}px;top:${top + bookW * 1.33 + gap}px;width:${logoW}px">`,
    "#3689f5",
  );
};
const port = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
};
for (const [d, [w, h]] of Object.entries(port)) {
  add(`${res}/drawable-port-${d}/splash.jpg`, w, h, splash(w, h));
  add(`${res}/drawable-land-${d}/splash.jpg`, h, w, splash(h, w));
}
add(`${res}/drawable/splash.jpg`, 720, 1280, splash(720, 1280));

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const tab = await ctx.newPage();
for (const a of assets) {
  await tab.setViewportSize({
    width: Math.round(a.w),
    height: Math.round(a.h),
  });
  await tab.setContent(a.html);
  await tab.waitForFunction(() =>
    [...document.images].every((i) => i.complete),
  );
  await tab.waitForTimeout(150);
  fs.mkdirSync(path.dirname(a.file), { recursive: true });
  await tab.screenshot(
    a.file.endsWith(".jpg")
      ? { path: a.file, type: "jpeg", quality: 85 } // a splash é foto: JPEG pesa bem menos que PNG
      : { path: a.file, omitBackground: a.transparent },
  );
}
await browser.close();
console.log(`${assets.length} arquivos gerados`);
