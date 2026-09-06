import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  runs: defineTable({
    world: v.number(),
    pilot: v.string(),
    token: v.string(),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    score: v.optional(v.number()),
    won: v.optional(v.boolean()),
  })
    .index("by_world_score", ["world", "score"])
    .index("by_token", ["token"]),
});
