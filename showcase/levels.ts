/** Shared level geometry and filmed routes. Units are metres; +Y is up. */
export type V3 = [number, number, number];
export type Key = [number, number, number, number]; // seconds, x, y, z
export type Road = { a: V3; b: V3; width: number };
export type Hazard = {
  x: number;
  z: number;
  radius: number;
  kind: "block" | "rock";
};
export type Door = { z: number; closes: number };
export type Level = {
  route: Key[];
  roads: Road[];
  checkpoints: V3[];
  hazards: Hazard[];
  doors: Door[];
  spawn: V3;
  heading: number;
  limit: number;
  objective: string;
};
const road = (a: V3, b: V3, width: number): Road => ({ a, b, width });
export const LEVELS: Level[] = [
  {
    route: [
      [0, -150, 0, 150],
      [5, -150, 0, 20],
      [9, 0, 0, 20],
      [13, 0, 0, -100],
      [18, 170, 0, -100],
      [23, 170, 0, -260],
      [25, 170, 0, -315],
    ],
    roads: [
      road([-150, 0, 210], [-150, 0, -40], 24),
      road([-175, 0, 20], [20, 0, 20], 24),
      road([0, 0, 50], [0, 0, -125], 24),
      road([-25, 0, -100], [195, 0, -100], 24),
      road([170, 0, -75], [170, 0, -365], 24),
    ],
    checkpoints: [
      [-150, 0, 36],
      [-16, 0, 20],
      [0, 0, -84],
      [154, 0, -100],
      [170, 0, -250],
    ],
    hazards: [
      { x: -150, z: -34, radius: 10, kind: "block" },
      { x: 0, z: 44, radius: 10, kind: "block" },
      { x: 191, z: -100, radius: 9, kind: "block" },
    ],
    doors: [],
    spawn: [-150, 0, 150],
    heading: Math.PI,
    limit: 55,
    objective: "Reach extraction · follow 5 checkpoints",
  },
  {
    route: [
      [0, 0, 0, 240],
      [4, -50, 0, 130],
      [8, 70, 0, 0],
      [12, -45, 0, -150],
      [15, 0, 0, -255],
      [19, 0, 0, -495],
      [23, 0, 0, -720],
      [25, 0, 0, -800],
    ],
    roads: [],
    checkpoints: [
      [-50, 0, 130],
      [70, 0, 0],
      [-45, 0, -150],
      [0, 0, -370],
      [0, 0, -590],
      [0, 0, -740],
    ],
    hazards: [
      { x: -12, z: 65, radius: 8, kind: "rock" },
      { x: 45, z: -95, radius: 9, kind: "rock" },
      { x: 13, z: -215, radius: 7, kind: "rock" },
    ],
    doors: [
      { z: -370, closes: 17.3 },
      { z: -590, closes: 21.2 },
    ],
    spawn: [0, 0, 240],
    heading: Math.PI,
    limit: 65,
    objective: "Escape the canyon · boost through both shutters",
  },
  {
    route: [
      [0, -90, 12, 180],
      [4, -90, 12, 65],
      [7, -90, 12, -20],
      [11, 50, 12, -100],
      [14, 50, 12, -150],
      [17, 50, 12, -240],
      [22, 50, 12, -395],
      [25, 50, 12, -475],
    ],
    roads: [
      road([-90, 12, 225], [-90, 12, 40], 20),
      road([-90, 12, 4], [-90, 12, -30], 24),
      road([-90, 12, -20], [50, 12, -100], 24),
      road([50, 12, -100], [50, 12, -150], 22),
      road([50, 12, -208], [50, 12, -500], 22),
    ],
    checkpoints: [
      [-90, 12, 55],
      [-90, 12, -12],
      [50, 12, -115],
      [50, 12, -230],
      [50, 12, -405],
    ],
    hazards: [],
    doors: [],
    spawn: [-90, 12, 180],
    heading: Math.PI,
    limit: 65,
    objective: "Cross both broken bridges · Space jumps; Shift boosts",
  },
  {
    route: [
      [0, -105, 0, 100],
      [3, -105, 0, -95],
      [6, 100, 0, -95],
      [9, 100, 0, 85],
      [12, -75, 0, 85],
      [15, -75, 0, -65],
      [18, 70, 0, -65],
      [21, 70, 0, 55],
      [23.5, -45, 0, 55],
      [25, -45, 0, -10],
    ],
    roads: [],
    checkpoints: [],
    hazards: [],
    doors: [],
    spawn: [-105, 0, 100],
    heading: Math.PI,
    limit: 45,
    objective: "Survive 45 seconds · cut off 3 rivals with your trail",
  },
];
// Distinct rival trajectories intersect already laid player walls. They stay eliminated.
export const RIVAL_ROUTES: Key[][] = [
  [
    [0, 120, 0, -30],
    [2, 40, 0, -30],
    [3, 40, 0, -15],
    [5, -105, 0, -15],
  ],
  [
    [0, -15, 0, 70],
    [2, -15, 0, 0],
    [4, 65, 0, 0],
    [7, 65, 0, 30],
    [10.5, 100, 0, 30],
  ],
  [
    [0, 0, 0, -50],
    [4, -40, 0, -50],
    [8, -40, 0, -40],
    [12, 35, 0, -40],
    [15, 35, 0, 20],
    [17, 0, 0, 20],
    [19, 0, 0, 35],
    [21.6, 70, 0, 35],
  ],
];
export const IMPACT_TIMES = [5, 10.5, 21.6];
export const ICE_JUMPS = [
  [4.6, 6.8, 13],
  [13.4, 16.5, 20],
];
export function clamp(v: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function sampleRoute(keys: Key[], time: number, round = false): V3 {
  const sample = (t: number): V3 => {
    let i = 1;
    while (i < keys.length - 1 && keys[i][0] < t) i++;
    const a = keys[i - 1],
      b = keys[i],
      u = clamp((t - a[0]) / (b[0] - a[0]));
    return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
  };
  if (round) {
    // Local quadratic corner blends leave long straight streets straight.
    for (let i = 1; i < keys.length - 1; i++) {
      const dt = time - keys[i][0],
        r = 0.34;
      if (Math.abs(dt) < r) {
        const a = sample(keys[i][0] - r),
          b = keys[i].slice(1) as V3,
          c = sample(keys[i][0] + r),
          u = (dt + r) / (2 * r);
        return a.map(
          (v, j) => (1 - u) ** 2 * v + 2 * (1 - u) * u * b[j] + u * u * c[j],
        ) as V3;
      }
    }
  }
  return sample(time);
}
export function filmPosition(index: number, time: number, rider = 0): V3 {
  if (index === 3 && rider > 0)
    return sampleRoute(RIVAL_ROUTES[rider - 1], time);
  const p = sampleRoute(LEVELS[index].route, time, index !== 3);
  if (index === 2)
    for (const [start, end, height] of ICE_JUMPS) {
      const u = (time - start) / (end - start);
      if (u > 0 && u < 1) p[1] += 4 * height * u * (1 - u);
    }
  return p;
}
export function segmentDistance(x: number, z: number, a: V3, b: V3) {
  const dx = b[0] - a[0],
    dz = b[2] - a[2],
    u = clamp(((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - a[0] - dx * u, z - a[2] - dz * u);
}
export function surfaceAt(index: number, x: number, z: number): number | null {
  if (index === 3) return Math.max(Math.abs(x), Math.abs(z)) < 135 ? 0 : null;
  if (index === 1) {
    const route = LEVELS[1].route;
    for (let i = 1; i < route.length; i++)
      if (
        segmentDistance(
          x,
          z,
          route[i - 1].slice(1) as V3,
          route[i].slice(1) as V3,
        ) < 42
      )
        return 0;
    return null;
  }
  for (const road of LEVELS[index].roads) {
    const dx = road.b[0] - road.a[0],
      dz = road.b[2] - road.a[2],
      length = Math.hypot(dx, dz);
    const along = ((x - road.a[0]) * dx + (z - road.a[2]) * dz) / length;
    const across =
      Math.abs((x - road.a[0]) * dz - (z - road.a[2]) * dx) / length;
    if (along >= 0 && along <= length && across < road.width / 2)
      return road.a[1];
  }
  return null;
}
export function filmBeat(
  index: number,
  t: number,
): { label: string; detail: string; metric: string } {
  const beats = [
    [
      [
        0,
        "BREAK CONTACT",
        "Pursuit incoming · take the service streets",
        "5 CHECKPOINTS",
      ],
      [4, "HARD RIGHT", "Roadblock ahead · turn at the junction", "01 / 05"],
      [8, "CUT LEFT", "Lose the pursuers between the towers", "02 / 05"],
      [
        12,
        "CHAIN THE CORNERS",
        "Turn right · carry speed into the next block",
        "03 / 05",
      ],
      [
        17,
        "EXTRACTION AHEAD",
        "One final left into the access lane",
        "04 / 05",
      ],
      [
        22,
        "PURSUIT EVADED",
        "Rider delivered to extraction",
        "MISSION COMPLETE",
      ],
    ],
    [
      [0, "CANYON RUN", "Slalom through the rockfall", "SHUTTERS ARMED"],
      [
        7,
        "THREAD THE NEEDLE",
        "Open terrain · obstacles on the racing line",
        "3 ROCK FIELDS",
      ],
      [
        13,
        "SHUTTER CLOSING",
        "Boost now · beat the first blast door",
        "OVERDRIVE",
      ],
      [
        17.4,
        "ONE DOWN. KEEP MOVING.",
        "The second shutter is closing ahead",
        "01 / 02 CLEARED",
      ],
      [
        21.3,
        "CANYON CLEARED",
        "Both blast doors behind you",
        "MISSION COMPLETE",
      ],
    ],
    [
      [
        0,
        "THE ROAD ENDS HERE",
        "Broken bridges · no floor underneath",
        "2 GAPS",
      ],
      [3.4, "JUMP THE FRACTURE", "Launch from the marked edge", "36 m GAP"],
      [
        6.9,
        "LANDED",
        "Grip the ice · line up the second jump",
        "01 / 02 CROSSED",
      ],
      [12, "BOOST + JUMP", "The next gap is wider. Commit.", "58 m GAP"],
      [
        16.6,
        "SECOND LANDING",
        "Both fractures crossed · reach the beacon",
        "02 / 02 CROSSED",
      ],
      [22, "PASS SECURED", "Rider reached the far side", "MISSION COMPLETE"],
    ],
    [
      [0, "CUT THEIR ESCAPE", "Every turn lays a lethal wall", "4 RIDERS"],
      [
        4,
        "FIRST TRAP",
        "The pink rider is heading into your trail",
        "INTERCEPT",
      ],
      [5.1, "RIVAL 01 DEREZZED", "The arena is getting smaller", "3 RIDERS"],
      [
        9,
        "CLOSE THE SECOND EXIT",
        "Force the amber rider into the outside wall",
        "INTERCEPT",
      ],
      [10.6, "RIVAL 02 DEREZZED", "One opponent left", "2 RIDERS"],
      [18, "THE FINAL CUT", "Turn inward. Seal the last escape.", "1 RIVAL"],
      [21.7, "LAST RIDER STANDING", "Three rivals eliminated", "VICTORY"],
    ],
  ][index] as [number, string, string, string][];
  const beat = beats.filter((b) => t >= b[0]).at(-1)!;
  return { label: beat[1], detail: beat[2], metric: beat[3] };
}
