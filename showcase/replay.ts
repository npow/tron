import { filmPosition, type V3 } from "./levels";
import { createGame, trailCollision } from "./simulation";
/** The filmed arena runs the same swept wall collision routine as player runs.
 * Its camera may be staged; eliminations are calculated, never toggled by a timer.
 */
export function validateArenaReplay() {
  const state = createGame(3);
  state.status = "running";
  for (let i = 0; i < 4; i++) {
    state.riders[i].p = filmPosition(3, 0, i);
    state.riders[i].trail = [{ p: [...state.riders[i].p], t: 0 }];
  }
  for (let frame = 1; frame <= 25 * 120; frame++) {
    state.time = frame / 120;
    for (let i = 0; i < 4; i++) {
      const r = state.riders[i];
      if (!r.alive) continue;
      const from: V3 = [...r.p],
        to = filmPosition(3, state.time, i);
      if (trailCollision(state, i, from, to)) {
        r.alive = false;
        r.diedAt = state.time;
        r.p = to;
        continue;
      }
      r.p = to;
      const tail = r.trail.at(-1)!;
      if (Math.hypot(to[0] - tail.p[0], to[2] - tail.p[2]) > 0.7)
        r.trail.push({ p: [...to], t: state.time });
    }
  }
  return state.riders.map((r) => (r.diedAt < 0 ? Infinity : r.diedAt));
}
export const REPLAY_DEATHS = validateArenaReplay();
