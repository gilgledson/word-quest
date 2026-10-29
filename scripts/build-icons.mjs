// Gera o ícone e a splash do app (Android e PWA) a partir da arte em public/art (jogo e estúdio).
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
const LOGO = data("wordquest-logo-v1.webp");
const STUDIO = data("studio-lunara.webp"); // fundo preto: some com mix-blend-mode: screen
const VILLAGE = data("splash-vila-v2.webp"); // arte da splash (gerada no ChatGPT, sem texto)
const ICON =
  "data:image/webp;base64," +
  fs
    .readFileSync(path.join(root, "scripts/assets/icon-master.webp"))
    .toString("base64");
const GOLD =
  "radial-gradient(circle at 50% 30%, #fff3bd, #ffc83d 68%, #f5a300)";

const page = (w, h, body, bg = "transparent") =>
  `<body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;position:relative;background:${bg}">${body}</body>`;

const assets = [];
const add = (file, w, h, html, transparent = false) =>
  assets.push({ file, w, h, html, transparent });

// --- Ícone: arte gerada (livro dourado num botão azul, peças W e Q, brilhos) em scripts/assets/icon-master.webp.
/** A arte inteira, quadrada e sem cantos; `k` < 1 a encolhe e esmaece as bordas no fundo dourado. */
const iconArt = (s, k = 1) =>
  k === 1
    ? `<img src="${ICON}" style="position:absolute;inset:0;width:100%;height:100%">`
    : `<img src="${ICON}" style="position:absolute;left:${(s * (1 - k)) / 2}px;top:${(s * (1 - k)) / 2}px;width:${s * k}px;height:${s * k}px;-webkit-mask-image:radial-gradient(closest-side,#000 80%,transparent);mask-image:radial-gradient(closest-side,#000 80%,transparent)">`;
const tile = (s, k, radius) =>
  page(
    s,
    s,
    `<div style="position:absolute;inset:0;background:${GOLD};border-radius:${radius};overflow:hidden">${iconArt(s, k)}</div>`,
  );
// Android: legado (quadrado arredondado), redondo e primeiro plano adaptativo (transparente).
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  const s = 48 * k;
  const f = 108 * k;
  const dir = `${res}/mipmap-${d}`;
  add(`${dir}/ic_launcher.png`, s, s, tile(s, 1, "20%"), true);
  add(`${dir}/ic_launcher_round.png`, s, s, tile(s, 0.8, "50%"), true);
  add(
    `${dir}/ic_launcher_foreground.png`,
    f,
    f,
    page(f, f, iconArt(f, 0.68)),
    true,
  );
}
// PWA (o maskable tem fundo cheio e o conteúdo na zona segura).
const pwa = (file, s, k, radius) =>
  add(`${root}/public/${file}`, s, s, tile(s, k, radius), radius !== "0");
pwa("icon-192.png", 192, 1, "20%");
pwa("icon-512.png", 512, 1, "20%");
pwa("icon-maskable-512.png", 512, 0.8, "0");
pwa("apple-touch-icon.png", 180, 1, "0");
// --- Splash: vila ao fundo, livro e logo no centro.
const splash = (w, h) => {
  // Faixa preta embaixo com a logo do estúdio (o fundo da logo é preto, então ela se funde à faixa).
  const studioW = Math.min(w * 0.6, h * 0.4);
  const studioH = studioW / 2;
  const band = studioH + h * 0.02;
  const fade = h * 0.1;
  // Pilha do jogo (livro + logo) centralizada no espaço que sobra.
  const avail = h - band - h * 0.04;
  const logoW = Math.min(w * 0.8, avail / 0.733);
  const logoH = logoW / 3;
  const bookW = logoW * 0.34;
  const gap = logoW * 0.06;
  const top = h * 0.04 + (avail - (bookW + gap + logoH)) / 2;
  return page(
    w,
    h,
    `<img src="${VILLAGE}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;${w > h ? "filter:blur(2px);" : ""}">
     <div style="position:absolute;inset:0;background:linear-gradient(#1b3f8a55,#1b3f8a22 45%,#0a1a4a44)"></div>
     <div style="position:absolute;left:0;right:0;bottom:${band}px;height:${fade}px;background:linear-gradient(transparent,#000)"></div>
     <div style="position:absolute;left:0;right:0;bottom:0;height:${band}px;background:#000"></div>
     <img src="${ICON}" style="position:absolute;left:${(w - bookW * 1.15) / 2}px;top:${top - bookW * 0.075}px;width:${bookW * 1.15}px;height:${bookW * 1.15}px;border-radius:22%;box-shadow:0 ${bookW * 0.05}px ${bookW * 0.12}px #0007">
     <img src="${LOGO}" style="position:absolute;left:${(w - logoW) / 2}px;top:${top + bookW + gap}px;width:${logoW}px">
     <img src="${STUDIO}" style="position:absolute;left:${(w - studioW) / 2}px;bottom:${h * 0.01}px;width:${studioW}px">`,
    "#000",
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
