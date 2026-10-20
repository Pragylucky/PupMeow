/**
 * Build docs/assets/readme-hero.gif for GitHub README (SVG animation is stripped on github.com).
 * Requires: npm run playwright:install
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import gifenc from "gifenc";

const { GIFEncoder, applyPalette, quantize } = gifenc;

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const HTML = path.join(ROOT, "docs/assets/readme-hero.html");
const OUT = path.join(ROOT, "docs/assets/readme-hero.gif");
const FRAMES = 28;
const DELAY_MS = 100;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 315 }, deviceScaleFactor: 1 });
  await page.goto(`file://${HTML}`);
  await page.waitForFunction(() => typeof (window as unknown as { setHeroFrame?: (p: number) => void }).setHeroFrame === "function");

  const gif = GIFEncoder();
  for (let i = 0; i < FRAMES; i++) {
    const phase = i / FRAMES;
    await page.evaluate((p) => (window as unknown as { setHeroFrame: (n: number) => void }).setHeroFrame(p), phase);
    const buf = await page.screenshot({ type: "png" });
    const png = PNG.sync.read(buf);
    const rgba = new Uint8ClampedArray(png.data);
    const palette = quantize(rgba, 128);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, png.width, png.height, { palette, delay: DELAY_MS });
  }
  gif.finish();
  writeFileSync(OUT, Buffer.from(gif.bytes()));
  await browser.close();
  console.log(`Wrote ${OUT} (${FRAMES} frames)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
