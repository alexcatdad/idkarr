import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mediaStatusValidator, mediaTypeValidator } from "./schema";

// List all media with optional filtering
export const list = query({
	args: {
		mediaType: v.optional(mediaTypeValidator),
	},
	handler: async (ctx, args) => {
		const { mediaType } = args;
		if (mediaType) {
			return await ctx.db
				.query("media")
				.withIndex("by_type", (q) => q.eq("mediaType", mediaType))
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
		mediaType: mediaTypeValidator,
		title: v.string(),
		year: v.optional(v.number()),
		overview: v.optional(v.string()),
		status: v.optional(mediaStatusValidator),
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
			status: args.status ?? "unknown",
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
