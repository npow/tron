import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
  args: [
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--use-angle=vulkan",
    "--disable-accelerated-2d-canvas",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text());
});
await page.goto("http://localhost:4173/?capture=1");
await page.waitForFunction(() => window.__TRON__?.ready, null, {
  timeout: 120000,
});
await page.evaluate(() => window.__TRON__.resize(1440, 810));
await mkdir("artifacts/review", { recursive: true });
for (const t of process.argv.length > 2
  ? process.argv.slice(2).map(Number)
  : [
      0, 10, 13, 17, 21, 29, 37, 44, 51, 56, 64, 67.5, 76.5, 81, 92, 94, 99.5,
      110.6, 118,
    ]) {
  const data = await page.evaluate(async (t) => {
    await window.__TRON__.render(t);
    return window.__TRON__.frame();
  }, t);
  await writeFile(`artifacts/review/${t}.jpg`, Buffer.from(data, "base64"));
  console.log("Rendered", t);
}
await browser.close();
