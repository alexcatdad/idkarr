import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

// List seasons for a series
export const listBySeries = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const seasons = await ctx.db
			.query("seasons")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		// Enrich with episode counts
		const enrichedSeasons = await Promise.all(
			seasons.map(async (season) => {
				const episodes = await ctx.db
					.query("episodes")
					.withIndex("by_season", (q) => q.eq("seasonId", season._id))
					.collect();

				return {
					...season,
					episodes,
					episodeCount: episodes.length,
					episodeFileCount: episodes.filter((e) => e.hasFile).length,
					monitoredEpisodeCount: episodes.filter((e) => e.monitored).length,
				};
			}),
		);

		return enrichedSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
	},
});

// Get a single season by ID
export const get = query({
	args: { id: v.id("seasons") },
	handler: async (ctx, args) => {
		const season = await ctx.db.get(args.id);
		if (!season) return null;

		// Get episodes
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.id))
			.collect();

		// Get series info
		const series = await ctx.db.get(season.mediaId);

		return {
			...season,
			series,
			episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
			episodeCount: episodes.length,
			episodeFileCount: episodes.filter((e) => e.hasFile).length,
		};
	},
});

// Get season by series and season number
export const getByNumber = query({
	args: {
		mediaId: v.id("media"),
		seasonNumber: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("seasons")
			.withIndex("by_media_season", (q) =>
				q.eq("mediaId", args.mediaId).eq("seasonNumber", args.seasonNumber),
			)
			.first();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new season
export const add = mutation({
	args: {
		mediaId: v.id("media"),
		seasonNumber: v.number(),
		title: v.optional(v.string()),
		overview: v.optional(v.string()),
		monitored: v.optional(v.boolean()),
		airDate: v.optional(v.number()),
		posterUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Verify series exists and is TV type
		const series = await ctx.db.get(args.mediaId);
		if (!series || (series.mediaType !== "tv" && series.mediaType !== "anime")) {
			throw new Error("Series not found");
		}

		// Check for duplicate season number
		const existing = await ctx.db
			.query("seasons")
			.withIndex("by_media_season", (q) =>
				q.eq("mediaId", args.mediaId).eq("seasonNumber", args.seasonNumber),
			)
			.first();

		if (existing) {
			throw new Error(`Season ${args.seasonNumber} already exists for this series`);
		}

		const now = Date.now();
		return await ctx.db.insert("seasons", {
			mediaId: args.mediaId,
			seasonNumber: args.seasonNumber,
			title: args.title ?? `Season ${args.seasonNumber}`,
			overview: args.overview,
			monitored: args.monitored ?? true,
			airDate: args.airDate,
			posterUrl: args.posterUrl,
			episodeCount: 0,
			episodeFileCount: 0,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update a season
export const update = mutation({
	args: {
		id: v.id("seasons"),
		title: v.optional(v.string()),
		overview: v.optional(v.string()),
		monitored: v.optional(v.boolean()),
		airDate: v.optional(v.number()),
		posterUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const season = await ctx.db.get(args.id);
		if (!season) {
			throw new Error("Season not found");
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (args.title !== undefined) updates.title = args.title;
		if (args.overview !== undefined) updates.overview = args.overview;
		if (args.monitored !== undefined) updates.monitored = args.monitored;
		if (args.airDate !== undefined) updates.airDate = args.airDate;
		if (args.posterUrl !== undefined) updates.posterUrl = args.posterUrl;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete a season and its episodes
export const remove = mutation({
	args: { id: v.id("seasons") },
	handler: async (ctx, args) => {
		const season = await ctx.db.get(args.id);
		if (!season) {
			throw new Error("Season not found");
		}

		// Delete all episodes in this season
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.id))
			.collect();

		for (const episode of episodes) {
			await ctx.db.delete(episode._id);
		}

		await ctx.db.delete(args.id);
	},
});

// Toggle monitored status for a season
export const toggleMonitored = mutation({
	args: { id: v.id("seasons") },
	handler: async (ctx, args) => {
		const season = await ctx.db.get(args.id);
		if (!season) {
			throw new Error("Season not found");
		}

		await ctx.db.patch(args.id, {
			monitored: !season.monitored,
			updatedAt: Date.now(),
		});

		return !season.monitored;
	},
});

// Monitor/unmonitor all episodes in a season
export const setAllEpisodesMonitored = mutation({
	args: {
		id: v.id("seasons"),
		monitored: v.boolean(),
	},
	handler: async (ctx, args) => {
		const season = await ctx.db.get(args.id);
		if (!season) {
			throw new Error("Season not found");
		}

		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.id))
			.collect();

		const now = Date.now();
		for (const episode of episodes) {
			await ctx.db.patch(episode._id, {
				monitored: args.monitored,
				updatedAt: now,
			});
		}

		// Also update the season's monitored status
		await ctx.db.patch(args.id, {
			monitored: args.monitored,
			updatedAt: now,
		});

		return {
			episodesUpdated: episodes.length,
			monitored: args.monitored,
		};
	},
});

// Update episode counts (called after episode changes)
export const updateCounts = mutation({
	args: { id: v.id("seasons") },
	handler: async (ctx, args) => {
		const season = await ctx.db.get(args.id);
		if (!season) {
			throw new Error("Season not found");
		}

		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.id))
			.collect();

		await ctx.db.patch(args.id, {
			episodeCount: episodes.length,
			episodeFileCount: episodes.filter((e) => e.hasFile).length,
			updatedAt: Date.now(),
		});
	},
});
