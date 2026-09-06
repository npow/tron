/** Add event context and technology slides after showing the working experience. */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { access, mkdir, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const folder = resolve(root, "artifacts");
const live = resolve(folder, "tron-live-play.mp4");
const gameplay = resolve(folder, "tron-worlds-gameplay.mp4");
const output = resolve(folder, "tron-worlds-demo.mp4");
await mkdir(folder, { recursive: true });
try {
  await access(gameplay);
  await access(live);
} catch {
  throw new Error(
    "Run npm run capture and npm run record-play first to create the 44-second gameplay source.",
  );
}
const base = process.env.TRON_URL || "http://localhost:4173/";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  for (const slide of ["mechanics", "context", "technology"]) {
    await page.goto(base + "slides.html?slide=" + slide);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() =>
      [...document.images].every((i) => i.complete),
    );
    // Wait for the native image used by the context slide's CSS background.
    await page.evaluate(async () => {
      const i = new Image();
      i.src = "/worlds/ice/panorama.jpg";
      await i.decode();
    });
    await page.screenshot({ path: resolve(folder, "slide-" + slide + ".png") });
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  await browser.close();
}
const args = [
  "-y",
  "-hide_banner",
  "-loglevel",
  "warning",
  "-i",
  gameplay,
  "-loop",
  "1",
  "-framerate",
  "30",
  "-i",
  resolve(folder, "slide-context.png"),
  "-loop",
  "1",
  "-framerate",
  "30",
  "-i",
  resolve(folder, "slide-technology.png"),
  "-i",
  resolve(root, "public/audio/score.mp3"),
  "-i",
  live,
  "-loop",
  "1",
  "-framerate",
  "30",
  "-i",
  resolve(folder, "slide-mechanics.png"),
  "-filter_complex",
  "[0:v]split=3[g0][g1][g2];[4:v]trim=end_frame=240,setpts=PTS-STARTPTS,setsar=1[live];[5:v]trim=end_frame=360,setpts=PTS-STARTPTS,setsar=1[mechanics];[g0]trim=start_frame=0:end_frame=300,setpts=PTS-STARTPTS,setsar=1[opening];[1:v]trim=end_frame=330,setpts=PTS-STARTPTS,setsar=1[context];[g1]trim=start_frame=300:end_frame=750,setpts=PTS-STARTPTS,setsar=1[middle];[g2]trim=start_frame=840:end_frame=1320,setpts=PTS-STARTPTS,setsar=1[final];[2:v]trim=end_frame=330,setpts=PTS-STARTPTS,setsar=1[technology];[live][mechanics][opening][context][middle][final][technology]concat=n=7:v=1:a=0,format=yuv420p[v]",
  "-map",
  "[v]",
  "-map",
  "3:a:0",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "18",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-af",
  "afade=t=out:st=81:d=2",
  "-t",
  "83",
  "-r",
  "30",
  "-movflags",
  "+faststart",
  "-metadata",
  "title=TRON / Worlds — Gaming & Interactive Worlds",
  "-metadata",
  "comment=Live interaction, lightcycle rules, generated worlds, and World Labs Marble and Convex roles.",
  resolve(folder, "presentation.partial.mp4"),
];
await new Promise((resolve, reject) => {
  const child = spawn("ffmpeg", args, {
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.once("error", reject);
  child.once("exit", (code) =>
    code === 0 ? resolve() : reject(new Error("FFmpeg exited " + code)),
  );
});
await rename(resolve(folder, "presentation.partial.mp4"), output);
await writeFile(
  resolve(folder, "presentation.json"),
  JSON.stringify(
    {
      file: output,
      duration: 83,
      frames: 2490,
      track: "Gaming & Interactive Worlds",
      gameplay,
      slides: [
        { start: 8, end: 20, purpose: "What TRON lightcycles and ribbons do" },
        { start: 30, end: 41, purpose: "Problem, track, and interaction loop" },
        {
          start: 72,
          end: 83,
          purpose: "Roles of World Labs Marble and Convex",
        },
      ],
      browserErrors: errors,
    },
    null,
    2,
  ) + "\n",
);
console.log("Saved " + output);
