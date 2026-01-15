import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - will be populated by auth
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("limited")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Media table - unified for all media types
  media: defineTable({
    mediaType: v.union(
      v.literal("tv"),
      v.literal("movie"),
      v.literal("anime"),
      v.literal("music")
    ),
    title: v.string(),
    sortTitle: v.string(),
    year: v.optional(v.number()),
    overview: v.optional(v.string()),
    status: v.string(),
    monitored: v.boolean(),
    path: v.optional(v.string()),
    // External IDs
    tmdbId: v.optional(v.number()),
    tvdbId: v.optional(v.number()),
    imdbId: v.optional(v.string()),
    // Timestamps
    added: v.number(),
    lastInfoSync: v.optional(v.number()),
  })
    .index("by_type", ["mediaType"])
    .index("by_title", ["sortTitle"])
    .index("by_tmdb", ["tmdbId"])
    .index("by_tvdb", ["tvdbId"]),
});
