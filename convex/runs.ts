import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { v } from "convex/values";
export const leaders = query({
  args: { world: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("runs")
      .withIndex("by_world_score", (q) => q.eq("world", args.world))
      .order("desc")
      .take(40);
    return rows
      .filter((r) => r.finishedAt && r.won)
      .slice(0, 5)
      .map((r) => ({
        pilot: r.pilot,
        score: r.score,
        duration: r.duration,
        id: r._id,
      }));
  },
});
export const start = mutation({
  args: { world: v.number(), pilot: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    if (
      !Number.isInteger(args.world) ||
      args.world < 0 ||
      args.world > 3 ||
      args.token.length < 20 ||
      args.token.length > 100
    )
      throw new Error("Invalid run");
    const existing = await ctx.db
      .query("runs")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("runs", {
      ...args,
      pilot: args.pilot.trim().slice(0, 20) || "Anonymous rider",
      startedAt: Date.now(),
    });
  },
});
export const finish = mutation({
  args: {
    token: v.string(),
    duration: v.number(),
    score: v.number(),
    won: v.boolean(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("runs")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!run || run.finishedAt) return false;
    if (
      !Number.isFinite(args.duration) ||
      args.duration < 0 ||
      args.duration > 70 ||
      !Number.isInteger(args.score) ||
      args.score < 0 ||
      args.score > 15000
    )
      throw new Error("Invalid result");
    if (args.duration > (Date.now() - run.startedAt) / 1000 + 2)
      throw new Error("Run clock mismatch");
    await ctx.db.patch(run._id, {
      duration: args.duration,
      score: args.score,
      won: args.won,
      finishedAt: Date.now(),
    });
    return true;
  },
});
// A run token is a private capability used to retrieve a rider's own saved result.
export const result = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("runs")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!run) return null;
    return {
      world: run.world,
      finishedAt: run.finishedAt,
      score: run.score,
      duration: run.duration,
      won: run.won,
    };
  },
});
