export const DURATION = 44;

export const WORLDS = [
  {
    id: "city",
    name: "Meridian city",
    label: "01",
    feature: "OWN EVERY CORNER",
    mechanic: "Urban pursuit",
    detail: "Thread the city. Carry your momentum.",
    color: "#a2d3e4",
    start: 2,
    end: 10,
    clipStart: 3,
    speed: 216,
  },
  {
    id: "desert",
    name: "Solar wasteland",
    label: "02",
    feature: "CHASE THE HORIZON",
    mechanic: "Timed canyon escape",
    detail: "Open the throttle. Leave the dust behind.",
    color: "#ecc395",
    start: 10,
    end: 20,
    clipStart: 12.5,
    speed: 342,
  },
  {
    id: "ice",
    name: "Cryo pass",
    label: "03",
    feature: "BREAK FROM GRAVITY",
    mechanic: "Broken-bridge traversal",
    detail: "Find your line above the frozen world.",
    color: "#b4dadd",
    start: 20,
    end: 34,
    clipStart: 3,
    speed: 248,
  },
  {
    id: "reactor",
    name: "The core",
    label: "04",
    feature: "YOUR TRAIL. THEIR END.",
    mechanic: "Light-trail combat",
    detail: "Outmaneuver the pack. Close the trap.",
    color: "#c6c1e5",
    start: 34,
    end: 44,
    clipStart: 3.2,
    speed: 268,
  },
] as const;

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const ease = (v: number) => {
  const t = clamp(v);
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
};

export interface FrameState {
  time: number;
  active: number;
  zoom: number;
  chapterTime: number;
  closing: boolean;
}

export function frameAt(seconds: number): FrameState {
  const time = clamp(Number.isFinite(seconds) ? seconds : 0, 0, DURATION);
  for (let i = 0; i < WORLDS.length; i++) {
    const world = WORLDS[i];
    if (time >= world.start && (time < world.end || i === 3)) {
      const local = time - world.start;
      // The arena cuts forward from the first elimination to the final trap.
      // Every source time increases: no laps, reverse seeks, or repeated shots.
      const chapterTime =
        i === 3 && local >= 4 ? 19 + local - 4 : world.clipStart + local;
      const zoom = ease(local / 0.65);
      return { time, active: i, zoom, chapterTime, closing: false };
    }
  }
  return { time, active: -1, zoom: 0, chapterTime: 0, closing: false };
}

export function formatTime(time: number) {
  const seconds = Math.floor(clamp(time, 0, DURATION));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
