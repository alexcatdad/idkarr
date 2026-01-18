import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mediaStatusValidator } from "./schema";

// ============================================================================
// Queries
// ============================================================================

// List all TV series
export const list = query({
	args: {
		monitored: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		let series = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "tv"))
			.collect();

		if (args.monitored !== undefined) {
			series = series.filter((s) => s.monitored === args.monitored);
		}

		// Enrich with season/episode counts
		const enrichedSeries = await Promise.all(
			series.map(async (s) => {
				const seasons = await ctx.db
					.query("seasons")
					.withIndex("by_media", (q) => q.eq("mediaId", s._id))
					.collect();

				const episodes = await ctx.db
					.query("episodes")
					.withIndex("by_media", (q) => q.eq("mediaId", s._id))
					.collect();

				const episodeFileCount = episodes.filter((e) => e.hasFile).length;

				return {
					...s,
					seasonCount: seasons.length,
					episodeCount: episodes.length,
					episodeFileCount,
					percentComplete:
						episodes.length > 0 ? Math.round((episodeFileCount / episodes.length) * 100) : 0,
				};
			}),
		);

		return enrichedSeries;
	},
});

// Get a single series by ID with full details
export const get = query({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const series = await ctx.db.get(args.id);
		if (!series || series.mediaType !== "tv") {
			return null;
		}

		// Get seasons with episode counts
		const seasons = await ctx.db
			.query("seasons")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.collect();

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
				};
			}),
		);

		// Get quality profile
		const qualityProfile = series.qualityProfileId
			? await ctx.db.get(series.qualityProfileId)
			: null;

		// Get root folder
		const rootFolder = series.rootFolderId ? await ctx.db.get(series.rootFolderId) : null;

		// Get tags
		const tags = series.tagIds ? await Promise.all(series.tagIds.map((id) => ctx.db.get(id))) : [];

		return {
			...series,
			seasons: enrichedSeasons.sort((a, b) => a.seasonNumber - b.seasonNumber),
			qualityProfile,
			rootFolder,
			tags: tags.filter(Boolean),
		};
	},
});

// Search series by title
export const search = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const searchLower = args.query.toLowerCase();

		const allSeries = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "tv"))
			.collect();

		return allSeries.filter(
			(s) =>
				s.title.toLowerCase().includes(searchLower) ||
				s.sortTitle.toLowerCase().includes(searchLower),
		);
	},
});

// Get series by external ID
export const getByTvdbId = query({
	args: { tvdbId: v.number() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("media")
			.withIndex("by_tvdb", (q) => q.eq("tvdbId", args.tvdbId))
			.first();
	},
});

export const getByTmdbId = query({
	args: { tmdbId: v.number() },
	handler: async (ctx, args) => {
		const result = await ctx.db
			.query("media")
			.withIndex("by_tmdb", (q) => q.eq("tmdbId", args.tmdbId))
			.first();

		return result?.mediaType === "tv" ? result : null;
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new series
export const add = mutation({
	args: {
		title: v.string(),
		year: v.optional(v.number()),
		overview: v.optional(v.string()),
		status: v.optional(mediaStatusValidator),
		tvdbId: v.optional(v.number()),
		tmdbId: v.optional(v.number()),
		imdbId: v.optional(v.string()),
		path: v.optional(v.string()),
		qualityProfileId: v.optional(v.id("qualityProfiles")),
		rootFolderId: v.optional(v.id("rootFolders")),
		tagIds: v.optional(v.array(v.id("tags"))),
		monitored: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Check for duplicate by TVDB ID
		if (args.tvdbId) {
			const existing = await ctx.db
				.query("media")
				.withIndex("by_tvdb", (q) => q.eq("tvdbId", args.tvdbId))
				.first();

			if (existing) {
				throw new Error(`Series with TVDB ID ${args.tvdbId} already exists`);
			}
		}

		const now = Date.now();
		const sortTitle = args.title.toLowerCase().replace(/^(the|a|an)\s+/i, "");

		return await ctx.db.insert("media", {
			mediaType: "tv",
			title: args.title,
			sortTitle,
			year: args.year,
			overview: args.overview,
			status: args.status ?? "unknown",
			monitored: args.monitored ?? true,
			path: args.path,
			tvdbId: args.tvdbId,
			tmdbId: args.tmdbId,
			imdbId: args.imdbId,
			qualityProfileId: args.qualityProfileId,
			rootFolderId: args.rootFolderId,
			tagIds: args.tagIds,
			added: now,
		});
	},
});

// Update a series
export const update = mutation({
	args: {
		id: v.id("media"),
		title: v.optional(v.string()),
		year: v.optional(v.number()),
		overview: v.optional(v.string()),
		status: v.optional(mediaStatusValidator),
		monitored: v.optional(v.boolean()),
		path: v.optional(v.string()),
		qualityProfileId: v.optional(v.id("qualityProfiles")),
		rootFolderId: v.optional(v.id("rootFolders")),
		tagIds: v.optional(v.array(v.id("tags"))),
	},
	handler: async (ctx, args) => {
		const series = await ctx.db.get(args.id);
		if (!series || series.mediaType !== "tv") {
			throw new Error("Series not found");
		}

		const updates: Record<string, unknown> = {
			lastInfoSync: Date.now(),
		};

		if (args.title !== undefined) {
			updates.title = args.title;
			updates.sortTitle = args.title.toLowerCase().replace(/^(the|a|an)\s+/i, "");
		}
		if (args.year !== undefined) updates.year = args.year;
		if (args.overview !== undefined) updates.overview = args.overview;
		if (args.status !== undefined) updates.status = args.status;
		if (args.monitored !== undefined) updates.monitored = args.monitored;
		if (args.path !== undefined) updates.path = args.path;
		if (args.qualityProfileId !== undefined) updates.qualityProfileId = args.qualityProfileId;
		if (args.rootFolderId !== undefined) updates.rootFolderId = args.rootFolderId;
		if (args.tagIds !== undefined) updates.tagIds = args.tagIds;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete a series and all its seasons/episodes
export const remove = mutation({
	args: {
		id: v.id("media"),
		deleteFiles: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const series = await ctx.db.get(args.id);
		if (!series || series.mediaType !== "tv") {
			throw new Error("Series not found");
		}

		// Delete all episodes
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.collect();

		for (const episode of episodes) {
			await ctx.db.delete(episode._id);
		}

		// Delete all seasons
		const seasons = await ctx.db
			.query("seasons")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.collect();

		for (const season of seasons) {
			await ctx.db.delete(season._id);
		}

		// Delete media files if requested
		if (args.deleteFiles) {
			const files = await ctx.db
				.query("mediaFiles")
				.withIndex("by_media", (q) => q.eq("mediaId", args.id))
				.collect();

			for (const file of files) {
				await ctx.db.delete(file._id);
			}
		}

		// Delete the series
		await ctx.db.delete(args.id);
	},
});

// Toggle monitored status
export const toggleMonitored = mutation({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const series = await ctx.db.get(args.id);
		if (!series || series.mediaType !== "tv") {
			throw new Error("Series not found");
		}

		await ctx.db.patch(args.id, {
			monitored: !series.monitored,
		});

		return !series.monitored;
	},
});

// ============================================================================
// Statistics
// ============================================================================

// Get series statistics
export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const allSeries = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "tv"))
			.collect();

		const allEpisodes = await ctx.db.query("episodes").collect();
		const filesCount = allEpisodes.filter((e) => e.hasFile).length;

		const monitoredSeries = allSeries.filter((s) => s.monitored);
		const monitoredEpisodes = await Promise.all(
			monitoredSeries.map(async (s) => {
				const episodes = await ctx.db
					.query("episodes")
					.withIndex("by_media", (q) => q.eq("mediaId", s._id))
					.collect();
				return episodes.filter((e) => e.monitored);
			}),
		);

		const totalMonitoredEpisodes = monitoredEpisodes.flat().length;
		const missingEpisodes = monitoredEpisodes.flat().filter((e) => !e.hasFile).length;

		return {
			seriesCount: allSeries.length,
			monitoredSeriesCount: monitoredSeries.length,
			episodeCount: allEpisodes.length,
			episodeFileCount: filesCount,
			monitoredEpisodeCount: totalMonitoredEpisodes,
			missingEpisodeCount: missingEpisodes,
		};
	},
});
