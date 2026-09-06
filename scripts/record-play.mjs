/** Record real UI and keyboard interaction with the live game for the demo opener. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, ".."),
  folder = resolve(root, "artifacts");
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=gl-egl"],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: resolve(folder, "live-source"),
    size: { width: 1920, height: 1080 },
  },
});
const page = await context.newPage(),
  began = Date.now(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.TRON_URL || "http://localhost:4173/");
await page.waitForFunction(() => window.__TRON__?.ready, null, {
  timeout: 120000,
});
await page.waitForTimeout(700);
const start = (Date.now() - began) / 1000;
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Start mission", exact: true }).click();
await page.keyboard.down("KeyW");
await page.waitForTimeout(850);
await page.keyboard.down("KeyD");
await page.keyboard.down("ShiftLeft");
await page.waitForTimeout(850);
await page.keyboard.up("KeyD");
await page.waitForTimeout(1200);
await page.keyboard.up("ShiftLeft");
await page.waitForTimeout(1000);
await page.keyboard.down("KeyD");
await page.waitForTimeout(650);
await page.keyboard.up("KeyD");
await page.waitForTimeout(1000);
await page.keyboard.up("KeyW");
await page.keyboard.press("KeyR");
await page.waitForTimeout(1700);
const video = page.video();
await context.close();
const path = await video.path();
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
const output = resolve(folder, "tron-live-play.mp4");
await new Promise((resolve, reject) => {
  const p = spawn(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "warning",
      "-ss",
      String(start),
      "-i",
      path,
      "-t",
      "8",
      "-an",
      "-r",
      "30",
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  p.once("error", reject);
  p.once("exit", (c) =>
    c === 0 ? resolve() : reject(new Error("FFmpeg exited " + c)),
  );
});
await writeFile(
  resolve(folder, "live-play.json"),
  JSON.stringify(
    {
      file: output,
      source: path,
      start,
      duration: 8,
      input: "Start button, W, D, Shift, R",
      browserErrors: errors,
    },
    null,
    2,
  ) + "\n",
);
console.log("Recorded " + output);
