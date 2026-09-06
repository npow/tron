import { useEffect, useRef, useState } from "react";
import { ConvexClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { GameState } from "./simulation";
const leaders = makeFunctionReference<"query">("runs:leaders");
const start = makeFunctionReference<"mutation">("runs:start");
const finish = makeFunctionReference<"mutation">("runs:finish");
const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(20)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
type Entry = { pilot: string; score: number; duration: number; id: string };
export function RunBoard({ game }: { game: GameState }) {
  const [pilot, setPilot] = useState(
    () =>
      localStorage.getItem("tron-pilot") ||
      "Rider " + token().slice(0, 4).toUpperCase(),
  );
  const [rows, setRows] = useState<Entry[]>([]),
    [status, setStatus] = useState("Connecting to shared runs…");
  const client = useRef<ConvexClient | null>(null),
    run = useRef<{
      game: GameState;
      token: string;
      started: Promise<unknown>;
      finished: boolean;
    } | null>(null);
  useEffect(() => {
    const c = new ConvexClient(location.origin + "/backend", {
      skipConvexDeploymentUrlCheck: true,
    });
    client.current = c;
    return () => {
      void c.close();
      client.current = null;
    };
  }, []);
  useEffect(() => {
    setRows([]);
    return client.current?.onUpdate(
      leaders,
      { world: game.world },
      (r: Entry[]) => {
        setRows(r);
        setStatus("Live community runs");
      },
      () => setStatus("Shared runs unavailable · game continues locally"),
    );
  }, [game.world]);
  useEffect(() => {
    const c = client.current;
    if (!c) return;
    if (game.status === "running" && run.current?.game !== game) {
      const id = token();
      const started = c.mutation(start, {
        world: game.world,
        pilot,
        token: id,
      });
      // Observe rejection even when the run has not ended yet.
      started.catch(() =>
        setStatus("Could not save this run · playing locally"),
      );
      run.current = { game, token: id, started, finished: false };
    }
    const r = run.current;
    if (
      (game.status === "won" || game.status === "lost") &&
      r?.game === game &&
      !r.finished
    ) {
      r.finished = true;
      void r.started
        .then(() =>
          c.mutation(finish, {
            token: r.token,
            duration: game.time,
            score: game.score,
            won: game.status === "won",
          }),
        )
        .then(() => setStatus("Run saved · shared through Convex"))
        .catch(() => setStatus("Result could not sync · retry your next run"));
    }
  }, [game, game.status, pilot]);
  return (
    <section className="run-board" aria-label="Community runs">
      <label>
        Callsign{" "}
        <input
          aria-label="Pilot callsign"
          value={pilot}
          maxLength={20}
          disabled={game.status === "running"}
          onChange={(e) => {
            setPilot(e.target.value);
            localStorage.setItem("tron-pilot", e.target.value);
          }}
        />
      </label>
      <span className="run-sync" role="status">
        {status}
      </span>
      <div className="leader-rows">
        {rows.length ? (
          rows.map((r, i) => (
            <span key={r.id}>
              <b>
                {i + 1}. {r.pilot}
              </b>{" "}
              {r.score.toLocaleString()} pts · {r.duration.toFixed(1)} s
            </span>
          ))
        ) : (
          <span>Complete this mission to set the first shared score.</span>
        )}
      </div>
    </section>
  );
}
