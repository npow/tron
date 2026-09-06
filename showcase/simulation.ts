import { LEVELS, clamp, segmentDistance, surfaceAt, type V3 } from "./levels";
export type Controls = {
  steer: number;
  throttle: boolean;
  brake: boolean;
  boost: boolean;
  jump: boolean;
  drift: boolean;
};
export const NO_INPUT: Controls = {
  steer: 0,
  throttle: false,
  brake: false,
  boost: false,
  jump: false,
  drift: false,
};
export type TrailPoint = { p: V3; t: number };
export type Rider = {
  p: V3;
  heading: number;
  speed: number;
  vy: number;
  alive: boolean;
  diedAt: number;
  trail: TrailPoint[];
  nextThink: number;
};
export type GameState = {
  world: number;
  time: number;
  status: "ready" | "running" | "won" | "lost";
  reason: string;
  riders: Rider[];
  energy: number;
  checkpoint: number;
  doorTimers: number[];
  jumpHeld: boolean;
  boost: boolean;
  drift: boolean;
  distance: number;
  score: number;
};
function rider(p: V3, heading: number): Rider {
  return {
    p: [...p],
    heading,
    speed: 0,
    vy: 0,
    alive: true,
    diedAt: -1,
    trail: [{ p: [...p], t: 0 }],
    nextThink: 0,
  };
}
export function createGame(world: number): GameState {
  const level = LEVELS[world];
  const riders = [rider(level.spawn, level.heading)];
  if (world === 3)
    riders.push(
      rider([100, 0, -100], 0),
      rider([-90, 0, -95], Math.PI / 2),
      rider([90, 0, 95], -Math.PI / 2),
    );
  return {
    world,
    time: 0,
    status: "ready",
    reason: level.objective,
    riders,
    energy: 100,
    checkpoint: 0,
    doorTimers: level.doors.map(() => -1),
    jumpHeld: false,
    boost: false,
    drift: false,
    distance: 0,
    score: 0,
  };
}
/** Swept capsule against a finite wall, including its vertical extent.
 * Tests the entire movement segment, so boost cannot tunnel through a ribbon.
 */
export function hitsTrail(
  from: V3,
  to: V3,
  a: V3,
  b: V3,
  radius = 0.9,
): boolean {
  const dx = to[0] - from[0],
    dz = to[2] - from[2],
    wx = b[0] - a[0],
    wz = b[2] - a[2];
  const cross = dx * wz - dz * wx;
  let u = 0,
    v = 0;
  if (Math.abs(cross) > 1e-9) {
    u = ((a[0] - from[0]) * wz - (a[2] - from[2]) * wx) / cross;
    v = ((a[0] - from[0]) * dz - (a[2] - from[2]) * dx) / cross;
  }
  const intersects =
    Math.abs(cross) > 1e-9 && u >= 0 && u <= 1 && v >= 0 && v <= 1;
  if (!intersects) {
    const d = Math.min(
      segmentDistance(from[0], from[2], a, b),
      segmentDistance(to[0], to[2], a, b),
      segmentDistance(a[0], a[2], from, to),
      segmentDistance(b[0], b[2], from, to),
    );
    if (d > radius) return false;
    u = clamp(
      ((a[0] - from[0]) * dx + (a[2] - from[2]) * dz) /
        (dx * dx + dz * dz || 1),
    );
    const x = from[0] + dx * u,
      z = from[2] + dz * u;
    v = clamp(((x - a[0]) * wx + (z - a[2]) * wz) / (wx * wx + wz * wz || 1));
  }
  const y = from[1] + (to[1] - from[1]) * u,
    wallY = a[1] + (b[1] - a[1]) * v;
  return y <= wallY + 1.6 && y + 1.8 >= wallY;
}
export function trailCollision(
  state: GameState,
  owner: number,
  from: V3,
  to: V3,
) {
  for (let j = 0; j < state.riders.length; j++) {
    const other = state.riders[j];
    if (!other.alive && state.time - other.diedAt > 1.2) continue;
    for (let k = 1; k < other.trail.length; k++) {
      const a = other.trail[k - 1],
        b = other.trail[k];
      // The emitting bike has a short tail clearance, shared by visuals and physics.
      if (j === owner && state.time - b.t < 0.65) continue;
      const dx = to[0] - from[0],
        dz = to[2] - from[2],
        length = Math.hypot(dx, dz) || 1;
      const noseFrom: V3 = [
        from[0] + (dx / length) * 1.15,
        from[1],
        from[2] + (dz / length) * 1.15,
      ];
      const noseTo: V3 = [
        to[0] + (dx / length) * 1.15,
        to[1],
        to[2] + (dz / length) * 1.15,
      ];
      if (
        hitsTrail(from, to, a.p, b.p) ||
        hitsTrail(noseFrom, noseTo, a.p, b.p)
      )
        return true;
    }
  }
  return false;
}
function kill(state: GameState, index: number, reason: string) {
  const r = state.riders[index];
  r.alive = false;
  r.diedAt = state.time;
  r.speed = 0;
  if (index === 0) {
    state.status = "lost";
    state.reason = reason;
    state.boost = false;
  } else state.score += 1000;
}
function clearance(state: GameState, index: number, heading: number) {
  const r = state.riders[index],
    from = r.p;
  for (let d = 5; d < 70; d += 5) {
    const to: V3 = [
      from[0] + Math.sin(heading) * d,
      0,
      from[2] + Math.cos(heading) * d,
    ];
    if (
      surfaceAt(3, to[0], to[2]) === null ||
      trailCollision(state, index, from, to)
    )
      return d;
  }
  return 70;
}
export function stepGame(state: GameState, input: Controls, dt: number) {
  if (state.status === "won" || state.status === "lost") return;
  if (state.status === "ready") {
    if (!input.throttle && !input.boost) return;
    state.status = "running";
  }
  const level = LEVELS[state.world];
  state.time += dt;
  const p = state.riders[0];
  state.boost = input.boost && state.energy > 1 && !input.brake;
  state.drift = input.drift && state.world !== 2;
  state.energy = clamp(state.energy + dt * (state.boost ? -28 : 13), 0, 100);
  for (let i = 0; i < state.riders.length; i++) {
    const r = state.riders[i];
    if (!r.alive) continue;
    const previous: V3 = [...r.p];
    if (i === 0) {
      const target = input.brake
        ? 7
        : state.boost
          ? 56
          : input.throttle
            ? 34
            : 22;
      r.speed += (target - r.speed) * Math.min(1, dt * (input.brake ? 6 : 2));
      const turn =
        (state.world === 2 ? 1.12 : 1.6) *
        (state.drift ? 1.45 : 1) *
        clamp(35 / (r.speed + 10), 0.6, 1.4);
      r.heading -= input.steer * dt * turn;
      const grounded = surfaceAt(state.world, r.p[0], r.p[2]);
      if (
        input.jump &&
        !state.jumpHeld &&
        state.world === 2 &&
        grounded !== null &&
        r.p[1] <= grounded + 0.2
      ) {
        r.vy = 18;
      }
      state.jumpHeld = input.jump;
    } else {
      r.speed = 26 + i * 1.5;
      const ahead = clearance(state, i, r.heading);
      if (ahead < 24 || state.time >= r.nextThink) {
        const options = [
          r.heading,
          r.heading + Math.PI / 2,
          r.heading - Math.PI / 2,
        ];
        const scored = options.map((h, j) => ({
          h,
          s:
            clearance(state, i, h) +
            (j === 0 ? 3 : 0) +
            Math.sin(state.time * 1.7 + i + j) * 3,
        }));
        scored.sort((a, b) => b.s - a.s);
        r.heading = scored[0].h;
        r.nextThink = state.time + 1.2;
      }
    }
    r.p[0] += Math.sin(r.heading) * r.speed * dt;
    r.p[2] += Math.cos(r.heading) * r.speed * dt;
    const floor = surfaceAt(state.world, r.p[0], r.p[2]);
    if (state.world === 2) {
      r.vy -= 18 * dt;
      r.p[1] += r.vy * dt;
      if (
        floor !== null &&
        previous[1] >= floor - 0.1 &&
        r.p[1] <= floor &&
        r.vy <= 0
      ) {
        r.p[1] = floor;
        r.vy = 0;
      }
      if (r.p[1] < -12) {
        kill(state, i, "Fell into the crevasse · jump at the striped edge");
        continue;
      }
    } else if (floor === null) {
      kill(
        state,
        i,
        state.world === 3
          ? "Hit the arena boundary"
          : "Hit the edge of the route · brake before the turn",
      );
      continue;
    }
    for (const h of level.hazards)
      if (segmentDistance(h.x, h.z, previous, r.p) < h.radius + 0.9) {
        kill(
          state,
          i,
          h.kind === "rock"
            ? "Hit a rock outcrop"
            : "Hit a roadblock · follow the checkpoint arrows",
        );
        break;
      }
    if (!r.alive) continue;
    if (trailCollision(state, i, previous, r.p)) {
      kill(state, i, i === 0 ? "Derezzed on a light wall" : "Trail collision");
      continue;
    }
    // Bike bodies also collide; trails are not the only solid objects.
    for (let j = 0; j < state.riders.length; j++)
      if (
        j !== i &&
        state.riders[j].alive &&
        Math.hypot(
          r.p[0] - state.riders[j].p[0],
          r.p[2] - state.riders[j].p[2],
        ) < 1.6
      ) {
        kill(state, i, "Rider collision");
        kill(state, j, "Rider collision");
        break;
      }
    const tail = r.trail.at(-1)!;
    if (Math.hypot(r.p[0] - tail.p[0], r.p[2] - tail.p[2]) > 0.75)
      r.trail.push({ p: [...r.p], t: state.time });
    if (i === 0) state.distance += r.speed * dt;
  }
  for (let i = 0; i < level.doors.length; i++) {
    const door = level.doors[i];
    if (state.doorTimers[i] < 0 && p.p[2] > door.z && p.p[2] - door.z < 120)
      state.doorTimers[i] = 3.1;
    if (state.doorTimers[i] >= 0)
      state.doorTimers[i] = Math.max(0, state.doorTimers[i] - dt);
    if (
      Math.abs(p.p[2] - door.z) < 2.4 &&
      state.doorTimers[i] >= 0 &&
      state.doorTimers[i] < 0.24
    )
      kill(
        state,
        0,
        "Caught by the blast shutter · save boost for the warning",
      );
  }
  if (!p.alive) return;
  const target = level.checkpoints[state.checkpoint];
  if (
    target &&
    Math.hypot(p.p[0] - target[0], p.p[2] - target[2]) <
      (state.world === 1 ? 36 : 19) &&
    Math.abs(p.p[1] - target[1]) < (state.world === 2 ? 30 : 4)
  ) {
    state.checkpoint++;
    state.score += 250;
  }
  if (
    (state.world !== 3 && state.checkpoint === level.checkpoints.length) ||
    (state.world === 3 &&
      (state.riders.slice(1).every((r) => !r.alive) ||
        state.time >= level.limit))
  ) {
    state.status = "won";
    state.reason =
      state.world === 3 ? "Last rider standing" : "Extraction reached";
    state.score += Math.round(Math.max(0, level.limit - state.time) * 100);
    return;
  }
  if (state.time > level.limit)
    kill(
      state,
      0,
      state.world === 0
        ? "Pursuit caught up · reach extraction faster"
        : "Mission timed out",
    );
}
