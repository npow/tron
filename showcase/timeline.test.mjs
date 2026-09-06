import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("./timeline.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const { frameAt, WORLDS, DURATION, formatTime } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
test("the brief overview is followed by each world once, with no closing replay", () => {
  assert.equal(DURATION, 44);
  assert.equal(frameAt(0).active, -1);
  assert.equal(frameAt(1.99).active, -1);
  const sequence = [];
  for (let i = 0; i <= DURATION * 30; i++) {
    const active = frameAt(i / 30).active;
    if (sequence.at(-1) !== active) sequence.push(active);
  }
  assert.deepEqual(sequence, [-1, 0, 1, 2, 3]);
  assert.equal(frameAt(DURATION).active, 3);
});
test("every chapter expands from its tile, and source time always advances", () => {
  WORLDS.forEach((w, index) => {
    assert.equal(frameAt(w.start).zoom, 0);
    assert.ok(frameAt(w.start + 0.65).zoom > 0.999);
    let last = -1;
    for (let t = w.start; t < w.end; t += 1 / 30) {
      const s = frameAt(t);
      assert.equal(s.active, index);
      assert.ok(s.chapterTime > last);
      last = s.chapterTime;
    }
  });
});
test("scrubbing is deterministic, bounded, and formatted for the short cut", () => {
  for (let i = 0; i <= DURATION * 30; i++) {
    const s = frameAt(i / 30);
    assert.ok(s.zoom >= 0 && s.zoom <= 1);
    assert.deepEqual(s, frameAt(i / 30));
  }
  assert.equal(frameAt(-10).time, 0);
  assert.equal(frameAt(Infinity).time, 0);
  assert.equal(frameAt(200).time, 44);
  assert.equal(formatTime(44), "00:44");
});
