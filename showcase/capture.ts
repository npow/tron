import { Director } from "./Director";
import { clamp, DURATION, frameAt } from "./timeline";

export async function initializeCapture() {
  await Promise.all([
    document.fonts.load("800 32px Showcase"),
    document.fonts.load("400 18px Showcase"),
    document.fonts.load("12px Telemetry"),
  ]);
  const canvas = document.createElement("canvas");
  const director = new Director(canvas, 1920, 1080, true);
  await director.ready;
  let time = 0;
  await director.prepare(time);
  director.render(time);
  window.__TRON__ = {
    ready: true,
    render: async (seconds) => {
      time = clamp(seconds, 0, DURATION);
      await director.prepare(time);
      director.render(time);
    },
    frame: () => canvas.toDataURL("image/jpeg", 0.95).split(",")[1],
    resize: (width, height) => director.setSize(width, height),
    state: () => ({
      time,
      active: frameAt(time).active,
      playing: false,
      riding: false,
    }),
  };
  document.body.classList.add("capture-mode");
  document.getElementById("root")!.textContent = "Offline render ready.";
  window.addEventListener("pagehide", () => director.dispose(), { once: true });
}
