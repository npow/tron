import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
  args: [
    "--no-sandbox",
    "--disable-gpu-sandbox",
    ...(process.env.TRON_ANGLE
      ? ["--use-angle=" + process.env.TRON_ANGLE]
      : []),
  ],
});
const errors = [],
  checks = [];
const base = process.env.TRON_URL || "http://localhost:4174/";
const observe = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
};
const game = (page) => page.evaluate(() => window.__TRON__.game());
const state = (page) => page.evaluate(() => window.__TRON__.state());
const check = (text) => {
  checks.push(text);
  console.log("Verified:", text);
};
await mkdir("artifacts", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1040 },
    acceptDownloads: true,
  });
  observe(page);
  await page.goto(base);
  await page.waitForFunction(() => window.__TRON__?.ready, null, {
    timeout: 120000,
  });
  assert.equal((await state(page)).riding, true);
  assert.equal((await game(page)).world, 3);
  assert.equal((await game(page)).status, "ready");
  await page.screenshot({ path: "artifacts/game-ready.png" });
  await page
    .getByRole("button", { name: "Start mission", exact: true })
    .click();
  const spawn = (await game(page)).riders[0].p;
  await page.keyboard.down("KeyW");
  await page.keyboard.down("KeyD");
  await page.keyboard.down("ShiftLeft");
  await page.waitForFunction(() => window.__TRON__.game().time > 0.7);
  await page.keyboard.up("KeyD");
  await page.keyboard.up("ShiftLeft");
  await page.waitForFunction(() => window.__TRON__.game().time > 1.6);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyP");
  const moved = await game(page);
  assert.equal(moved.status, "running");
  assert.ok(
    Math.hypot(
      moved.riders[0].p[0] - spawn[0],
      moved.riders[0].p[2] - spawn[2],
    ) > 15,
  );
  assert.notEqual(moved.riders[0].heading, Math.PI);
  assert.ok(moved.riders[0].trail.length > 25);
  assert.ok(moved.energy < 100);
  await page.screenshot({ path: "artifacts/game-ribbons.png" });
  await page.waitForTimeout(250);
  assert.equal((await game(page)).time, moved.time);
  await page.keyboard.press("KeyP");
  await page.keyboard.press("KeyR");
  await page.waitForFunction(() => window.__TRON__.game().status === "ready");
  check(
    "The default screen is playable: Start, steering, boost, persistent trails, pause, and restart work.",
  );
  await page.getByRole("button", { name: /Meridian city/ }).click();
  assert.equal((await game(page)).world, 0);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => window.__TRON__.game().time > 0.3);
  await page.keyboard.up("KeyW");
  assert.equal((await game(page)).status, "running");
  // Run off the city route with real controls and verify an actual loss screen.
  await page.keyboard.down("KeyD");
  await page.waitForFunction(() => window.__TRON__.game().status === "lost");
  await page.keyboard.up("KeyD");
  await page.getByRole("button", { name: /Try again/ }).click();
  await page.waitForFunction(() => window.__TRON__.game().status === "ready");
  check(
    "Selecting a world keeps keyboard controls working; leaving the road loses the mission and retry resets it.",
  );
  await page.getByRole("button", { name: /Watch demo/ }).click();
  await page.getByRole("button", { name: "Pause film", exact: true }).click();
  assert.equal((await state(page)).riding, false);
  await page.getByRole("button", { name: /Solar wasteland/ }).click();
  assert.equal((await state(page)).time, 10.8);
  await page.locator(".timeline").fill("26");
  assert.equal((await state(page)).active, 2);
  await page.locator(".timeline").blur();
  await page.keyboard.press("Digit4");
  assert.equal((await state(page)).active, 3);
  check(
    "The optional 44-second demo has working chapter selection and scrubbing.",
  );
  await page.getByRole("button", { name: "Sound off", exact: false }).click();
  await page.getByRole("button", { name: "Sound on", exact: false }).click();
  check("Sound can be enabled and muted.");
  await page.getByRole("button", { name: /All worlds/ }).click();
  await page.screenshot({ path: "artifacts/app-desktop.png" });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  observe(mobile);
  await mobile.goto(base);
  await mobile.waitForFunction(() => window.__TRON__?.ready, null, {
    timeout: 120000,
  });
  await mobile
    .getByRole("button", { name: "Start mission", exact: true })
    .tap();
  await mobile.waitForFunction(() => window.__TRON__.game().time > 0.25);
  assert.equal((await game(mobile)).status, "running");
  assert.ok(
    await mobile
      .getByRole("button", { name: "Boost", exact: true })
      .isVisible(),
  );
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.screenshot({ path: "artifacts/app-mobile.png" });
  await mobile.close();
  check(
    "Touch users can start the game and see driving controls at 390 px without horizontal overflow.",
  );
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("button", { name: /Record demo/ }).click();
  await page.waitForFunction(() => window.__TRON__.state().time > 1.5);
  await page.evaluate(() => window.__TRON__.render(43.99));
  const download = await downloadPromise;
  await download.saveAs(
    "artifacts/browser-recording-check." +
      (download.suggestedFilename().endsWith("mp4") ? "mp4" : "webm"),
  );
  check(
    "Recording the short demo downloads a video and stops at the new endpoint.",
  );
  await page.close();
  const offline = await browser.newPage();
  observe(offline);
  await offline.goto(base + "?capture=1");
  await offline.waitForFunction(() => window.__TRON__?.ready, null, {
    timeout: 120000,
  });
  const sample = (t) =>
    offline.evaluate(async (t) => {
      await window.__TRON__.render(t);
      return window.__TRON__.frame();
    }, t);
  const first = await sample(6);
  await sample(26);
  const second = await sample(6);
  const hash = (s) => createHash("sha256").update(s).digest("hex");
  assert.equal(hash(first), hash(second));
  check("Seeking away and back renders an identical frame.");
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/verification.json",
    JSON.stringify({ checks, browserErrors: errors }, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
