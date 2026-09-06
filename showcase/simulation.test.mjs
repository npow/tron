import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const folder = await mkdtemp(join(tmpdir(), "tron-physics-"));
for (const name of ["levels", "simulation", "replay"]) {
  const source = await readFile(
    new URL(`./${name}.ts`, import.meta.url),
    "utf8",
  );
  const out = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace(/(['"])\.\/(levels|simulation)\1/g, "$1./$2.mjs$1");
  await writeFile(join(folder, name + ".mjs"), out);
}
const { createGame, stepGame, NO_INPUT, hitsTrail } = await import(
  join(folder, "simulation.mjs")
);
const { REPLAY_DEATHS } = await import(join(folder, "replay.mjs"));
const { surfaceAt, filmPosition, LEVELS } = await import(
  join(folder, "levels.mjs")
);
const step = (s, input, seconds) => {
  for (let i = 0; i < seconds * 120; i++)
    stepGame(s, { ...NO_INPUT, ...input }, 1 / 120);
};
test("full steering moves the player off the route and can crash", () => {
  const s = createGame(0);
  step(s, {}, 1);
  assert.equal(s.status, "ready");
  step(s, { throttle: true, steer: 1 }, 4);
  assert.equal(s.status, "lost");
  assert.notEqual(s.riders[0].p[0], -150);
});
test("swept light-wall collision catches crossings, grazes, and boost tunnelling", () => {
  const a = [0, 0, -10],
    b = [0, 0, 10];
  assert.equal(hitsTrail([-30, 0, 0], [30, 0, 0], a, b), true);
  assert.equal(hitsTrail([0.7, 0, -4], [0.7, 0, 4], a, b), true);
  assert.equal(hitsTrail([1.1, 0, -4], [1.1, 0, 4], a, b), false);
  assert.equal(hitsTrail([-3, 4, 0], [3, 4, 0], a, b), false);
});
test("touching another rider trail kills the player and never resurrects them", () => {
  const s = createGame(3);
  s.status = "running";
  s.time = 2;
  s.riders[0].p = [-3, 0, 0];
  s.riders[0].heading = Math.PI / 2;
  s.riders[0].speed = 50;
  s.riders[1].trail = [
    { p: [0, 0, -10], t: 0 },
    { p: [0, 0, 10], t: 1 },
  ];
  step(s, { throttle: true, boost: true }, 0.2);
  assert.equal(s.status, "lost");
  assert.equal(s.riders[0].alive, false);
  const t = s.time;
  step(s, { throttle: true }, 3);
  assert.equal(s.time, t);
});
test("arena demo eliminations come from collisions; all three rivals die and hero survives", () => {
  assert.equal(REPLAY_DEATHS[0], Infinity);
  for (const [i, expected] of [
    [1, 5],
    [2, 10.5],
    [3, 21.6],
  ])
    assert.ok(
      Math.abs(REPLAY_DEATHS[i] - expected) < 0.4,
      `${i}: ${REPLAY_DEATHS[i]} expected near ${expected}`,
    );
});
test("ice bridges contain actual gaps and missing a jump causes a fall", () => {
  assert.equal(surfaceAt(2, -90, 22), null);
  assert.equal(surfaceAt(2, 50, -180), null);
  const s = createGame(2);
  s.riders[0].p = [-90, 12, 50];
  step(s, { throttle: true }, 4);
  assert.equal(s.status, "lost");
  assert.match(s.reason, /crevasse/);
  const jump = createGame(2);
  jump.riders[0].p = [-90, 12, 52];
  jump.riders[0].speed = 34;
  step(jump, { throttle: true, jump: true }, 1.95);
  assert.equal(jump.riders[0].alive, true);
  assert.ok(jump.riders[0].p[2] < 4);
  assert.ok(jump.riders[0].p[1] >= 12);
});
test("boost consumes energy; restart resets the complete mission state", () => {
  const s = createGame(1);
  step(s, { boost: true }, 1);
  assert.ok(s.energy < 80);
  assert.ok(s.riders[0].speed > 34);
  assert.deepEqual(createGame(1), createGame(1));
});
test("point-to-point demo routes never teleport back to their starts", () => {
  for (let world = 0; world < 3; world++) {
    let last = filmPosition(world, 0);
    for (let frame = 1; frame <= 25 * 120; frame++) {
      const p = filmPosition(world, frame / 120);
      assert.ok(Math.hypot(...p.map((v, i) => v - last[i])) < 1.5);
      last = p;
    }
    assert.ok(
      Math.hypot(
        last[0] - LEVELS[world].spawn[0],
        last[2] - LEVELS[world].spawn[2],
      ) > 300,
    );
  }
});
test("filmed routes clear physical hazards and only leave ice surfaces during jumps", () => {
  for (let index = 0; index < 3; index++)
    for (let frame = 0; frame < 25 * 60; frame++) {
      const t = frame / 60,
        p = filmPosition(index, t);
      for (const h of LEVELS[index].hazards)
        assert.ok(
          Math.hypot(p[0] - h.x, p[2] - h.z) > h.radius + 0.9,
          `world ${index} intersects obstacle at ${t}`,
        );
      if (index === 2 && surfaceAt(index, p[0], p[2]) === null)
        assert.ok(p[1] > 12.1, `unsupported rider at ${t}`);
    }
});
test("a closed shutter is solid; an open shutter admits a boosted rider", () => {
  for (const [timer, status] of [
    [0, "lost"],
    [2, "running"],
  ]) {
    const s = createGame(1);
    s.status = "running";
    s.riders[0].p = [0, 0, -365];
    s.riders[0].speed = 56;
    s.doorTimers[0] = timer;
    step(s, { boost: true }, 0.12);
    assert.equal(s.status, status);
  }
});
test("mission completion requires all checkpoints; a fresh run can win", () => {
  const s = createGame(0);
  s.status = "running";
  s.checkpoint = LEVELS[0].checkpoints.length - 1;
  s.riders[0].p = [170, 0, -241];
  s.riders[0].speed = 20;
  step(s, { throttle: true }, 0.05);
  assert.equal(s.status, "won");
  assert.ok(s.score > 250);
  const fresh = createGame(0);
  fresh.status = "running";
  fresh.riders[0].p = [170, 0, -241];
  step(fresh, { throttle: true }, 0.05);
  assert.equal(fresh.status, "running");
});
