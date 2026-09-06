import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const clients = [
  new ConvexClient("http://127.0.0.1:3210"),
  new ConvexClient("http://127.0.0.1:3210"),
];
const start = makeFunctionReference("runs:start"),
  finish = makeFunctionReference("runs:finish"),
  own = makeFunctionReference("runs:result");
const token = randomUUID();
try {
  await clients[0].mutation(start, {
    world: 0,
    pilot: "Connection verification",
    token,
  });
  let resolveChange;
  const changed = new Promise((resolve) => (resolveChange = resolve));
  const stop = clients[1].onUpdate(own, { token }, (result) => {
    if (result?.finishedAt) resolveChange(result);
  });
  await clients[0].mutation(finish, {
    token,
    duration: 0,
    score: 0,
    won: false,
  });
  const result = await Promise.race([
    changed,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("No cross-client update")), 10000),
    ),
  ]);
  assert.equal(result.won, false);
  assert.equal(result.score, 0);
  stop();
  // This diagnostic is a failed zero-point run and never enters the leaderboard.
  console.log(
    "A second independent Convex client received the saved result live.",
  );
} finally {
  await Promise.all(clients.map((c) => c.close()));
}
