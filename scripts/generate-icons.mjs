// Renders public/icons/icon.svg to the PNG sizes PWAs and iOS need.
// Usage: npm run icons   (uses the Playwright Chromium already installed for e2e tests)
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../public/icons/", import.meta.url));
const svg = await readFile(`${dir}icon.svg`, "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, file, { maskable = false, flat = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  // Maskable icons need the artwork inside the central 80% safe zone and a full-bleed background.
  const inner = maskable ? Math.round(size * 0.8) : size;
  const art = flat ? svg.replace('rx="112"', 'rx="0"') : svg;
  await page.setContent(
    `<html><body style="margin:0;background:${maskable || flat ? "#1f7a4d" : "transparent"};display:grid;place-items:center;width:${size}px;height:${size}px">
      <div style="width:${inner}px;height:${inner}px">${art.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await page.screenshot({ path: `${dir}${file}`, omitBackground: !(maskable || flat) });
  console.log("wrote", file);
}

await render(192, "icon-192.png");
await render(512, "icon-512.png");
await render(512, "icon-maskable-512.png", { maskable: true });
await render(180, "apple-touch-icon.png", { flat: true }); // iOS applies its own rounded mask
await browser.close();
