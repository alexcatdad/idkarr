import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all media with optional filtering
export const list = query({
	args: {
		mediaType: v.optional(
			v.union(
				v.literal("tv"),
				v.literal("movie"),
				v.literal("anime"),
				v.literal("music"),
			),
		),
	},
	handler: async (ctx, args) => {
		if (args.mediaType) {
			return await ctx.db
				.query("media")
				.withIndex("by_type", (q) => q.eq("mediaType", args.mediaType!))
				.collect();
		}
		return await ctx.db.query("media").collect();
	},
});

// Get single media item
export const get = query({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Add new media
export const add = mutation({
	args: {
		mediaType: v.union(
			v.literal("tv"),
			v.literal("movie"),
			v.literal("anime"),
			v.literal("music"),
		),
		title: v.string(),
		year: v.optional(v.number()),
		overview: v.optional(v.string()),
		tmdbId: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert("media", {
			mediaType: args.mediaType,
			title: args.title,
			sortTitle: args.title.toLowerCase().replace(/^(the|a|an)\s+/i, ""),
			year: args.year,
			overview: args.overview,
			status: "active",
			monitored: true,
			tmdbId: args.tmdbId,
			tvdbId: args.tvdbId,
			added: now,
		});
	},
});

// Delete media
export const remove = mutation({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	},
});
