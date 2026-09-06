/** Deterministic, frame-by-frame H.264 capture. Start npm run dev first. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile, access, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const width = Number(option("width", "1920"));
const height = Number(option("height", "1080"));
const fps = Number(option("fps", "30"));
const start = Number(option("start", "0"));
const seconds = Number(option("seconds", "44"));
if (
  ![width, height, fps, seconds].every((n) => Number.isFinite(n) && n > 0) ||
  width % 2 ||
  height % 2 ||
  start < 0 ||
  start + seconds > 44
)
  throw new Error(
    "Use positive dimensions, an even width/height, and a time range within 0–44 seconds.",
  );
const output = resolve(
  root,
  option("output", "artifacts/tron-worlds-gameplay.mp4"),
);
await mkdir(dirname(output), { recursive: true });
const score = resolve(root, "public/audio/score.mp3");
await access(score);
const url = option("url", "http://localhost:4173/");
const browserPath = option("browser", process.env.CHROME_PATH);
const launchArgs = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-accelerated-2d-canvas",
  "--disable-gpu-sandbox",
];
// Optional Linux NVIDIA Vulkan path. CPU/default Chrome works without this flag.
if (args.includes("--vulkan")) launchArgs.push("--use-angle=vulkan");
const browser = await chromium.launch({
  headless: true,
  ...(browserPath ? { executablePath: browserPath } : {}),
  args: launchArgs,
});
let encoder;
let succeeded = false;
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(`${url}${url.includes("?") ? "&" : "?"}capture=1`);
  await page.waitForFunction(() => window.__TRON__?.ready, null, {
    timeout: 120000,
  });
  await page.evaluate(
    ({ width, height }) => window.__TRON__.resize(width, height),
    { width, height },
  );
  // Warm each world's shader pipeline before rendering the first output frame.
  for (const time of [6, 16, 26, 41, start])
    await page.evaluate((t) => window.__TRON__.render(t), time);
  encoder = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "warning",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "-framerate",
      String(fps),
      "-i",
      "pipe:0",
      "-ss",
      String(start),
      "-i",
      score,
      "-t",
      String(seconds),
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-af",
      `afade=t=out:st=${Math.max(0, seconds - 1.5)}:d=1.5`,
      "-movflags",
      "+faststart",
      "-metadata",
      "title=TRON / Worlds",
      "-metadata",
      "comment=World Labs Marble environments. Authored lightcycle gameplay and original synthesized score.",
      output,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const completion = new Promise((resolve, reject) => {
    encoder.once("error", reject);
    encoder.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)),
    );
  });
  // Observe failures immediately, even if an encoder fails while a frame renders.
  let encodingError;
  completion.catch((error) => {
    encodingError = error;
  });
  encoder.stdin.on("error", (error) => {
    encodingError = error;
  });
  const total = Math.round(seconds * fps);
  const began = Date.now();
  const stills = new Set(
    [0, 4, 16, 23, 38, 41].map((t) => Math.round((t - start) * fps)),
  );
  for (let frame = 0; frame < total; frame++) {
    if (encodingError) throw encodingError;
    const data = await page.evaluate(
      async (t) => {
        await window.__TRON__.render(t);
        return window.__TRON__.frame();
      },
      start + frame / fps,
    );
    const buffer = Buffer.from(data, "base64");
    if (frame === 0 && buffer.length < 20000)
      throw new Error(
        "The first frame appears blank. Try without --vulkan or use a different Chrome build.",
      );
    if (!encoder.stdin.write(buffer)) await once(encoder.stdin, "drain");
    if (stills.has(frame))
      await writeFile(
        resolve(
          dirname(output),
          `still-${(start + frame / fps).toFixed(1)}.jpg`,
        ),
        buffer,
      );
    if (frame % (fps * 5) === 0)
      console.log(
        `${Math.round((frame / total) * 100)}% · ${frame}/${total} frames · ${((Date.now() - began) / 1000).toFixed(0)}s elapsed`,
      );
  }
  encoder.stdin.end();
  await completion;
  if (errors.length)
    throw new Error(`Browser errors during capture:\n${errors.join("\n")}`);
  await writeFile(
    resolve(dirname(output), "capture.json"),
    JSON.stringify(
      {
        output,
        width,
        height,
        fps,
        start,
        duration: seconds,
        frames: total,
        browserErrors: errors,
      },
      null,
      2,
    ) + "\n",
  );
  succeeded = true;
  console.log(`Saved ${output}`);
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill("SIGTERM");
  await browser.close();
  if (!succeeded) await unlink(output).catch(() => {});
}
