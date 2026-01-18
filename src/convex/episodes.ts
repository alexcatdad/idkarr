import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

// List episodes for a season
export const listBySeason = query({
	args: { seasonId: v.id("seasons") },
	handler: async (ctx, args) => {
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
			.collect();

		// Enrich with file information
		const enrichedEpisodes = await Promise.all(
			episodes.map(async (episode) => {
				const file = episode.episodeFileId ? await ctx.db.get(episode.episodeFileId) : null;

				return {
					...episode,
					file,
				};
			}),
		);

		return enrichedEpisodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
	},
});

// List all episodes for a series
export const listByMedia = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		// Enrich with season and file information
		const enrichedEpisodes = await Promise.all(
			episodes.map(async (episode) => {
				const season = await ctx.db.get(episode.seasonId);
				const file = episode.episodeFileId ? await ctx.db.get(episode.episodeFileId) : null;

				return {
					...episode,
					season,
					file,
				};
			}),
		);

		// Sort by season number then episode number
		return enrichedEpisodes.sort((a, b) => {
			const seasonA = a.season?.seasonNumber ?? 0;
			const seasonB = b.season?.seasonNumber ?? 0;
			if (seasonA !== seasonB) return seasonA - seasonB;
			return a.episodeNumber - b.episodeNumber;
		});
	},
});

// Get a single episode by ID
export const get = query({
	args: { id: v.id("episodes") },
	handler: async (ctx, args) => {
		const episode = await ctx.db.get(args.id);
		if (!episode) return null;

		// Get related data
		const season = await ctx.db.get(episode.seasonId);
		const series = await ctx.db.get(episode.mediaId);
		const file = episode.episodeFileId ? await ctx.db.get(episode.episodeFileId) : null;

		return {
			...episode,
			season,
			series,
			file,
		};
	},
});

// Get episode by season and episode number
export const getByNumber = query({
	args: {
		seasonId: v.id("seasons"),
		episodeNumber: v.number(),
	},
	handler: async (ctx, args) => {
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
			.collect();

		return episodes.find((e) => e.episodeNumber === args.episodeNumber) ?? null;
	},
});

// Get episode by TVDB ID
export const getByTvdbId = query({
	args: { tvdbId: v.number() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("episodes")
			.withIndex("by_tvdb", (q) => q.eq("tvdbId", args.tvdbId))
			.first();
	},
});

// Get upcoming episodes (airing soon)
export const getUpcoming = query({
	args: {
		days: v.optional(v.number()), // Default 7 days
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const daysToCheck = args.days ?? 7;
		const endDate = now + daysToCheck * 24 * 60 * 60 * 1000;
		const resultLimit = args.limit ?? 50;

		const episodes = await ctx.db.query("episodes").withIndex("by_airDate").collect();

		// Filter to episodes airing in the future within the time window
		const upcoming = episodes.filter((e) => {
			if (!e.airDate) return false;
			return e.airDate >= now && e.airDate <= endDate;
		});

		// Enrich with series and season info
		const enrichedUpcoming = await Promise.all(
			upcoming.slice(0, resultLimit).map(async (episode) => {
				const series = await ctx.db.get(episode.mediaId);
				const season = await ctx.db.get(episode.seasonId);
				return {
					...episode,
					series,
					season,
				};
			}),
		);

		// Sort by air date
		return enrichedUpcoming.sort((a, b) => (a.airDate ?? 0) - (b.airDate ?? 0));
	},
});

// Get missing episodes (monitored but no file)
export const getMissing = query({
	args: {
		mediaId: v.optional(v.id("media")),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;
		const { mediaId } = args;

		const episodes = mediaId
			? await ctx.db
					.query("episodes")
					.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
					.collect()
			: await ctx.db.query("episodes").collect();

		// Filter to monitored episodes without files that have already aired
		const now = Date.now();
		const missing = episodes.filter(
			(e) => e.monitored && !e.hasFile && (e.airDate === undefined || e.airDate < now),
		);

		// Enrich with series and season info
		const enrichedMissing = await Promise.all(
			missing.slice(0, resultLimit).map(async (episode) => {
				const series = await ctx.db.get(episode.mediaId);
				const season = await ctx.db.get(episode.seasonId);
				return {
					...episode,
					series,
					season,
				};
			}),
		);

		// Sort by air date (oldest first)
		return enrichedMissing.sort((a, b) => (a.airDate ?? 0) - (b.airDate ?? 0));
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new episode
export const add = mutation({
	args: {
		mediaId: v.id("media"),
		seasonId: v.id("seasons"),
		episodeNumber: v.number(),
		title: v.string(),
		absoluteEpisodeNumber: v.optional(v.number()),
		overview: v.optional(v.string()),
		monitored: v.optional(v.boolean()),
		airDate: v.optional(v.number()),
		airDateUtc: v.optional(v.number()),
		runtime: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
		imdbId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Verify series exists
		const series = await ctx.db.get(args.mediaId);
		if (!series) {
			throw new Error("Series not found");
		}

		// Verify season exists and belongs to this series
		const season = await ctx.db.get(args.seasonId);
		if (!season || season.mediaId !== args.mediaId) {
			throw new Error("Season not found or does not belong to this series");
		}

		// Check for duplicate episode number in the same season
		const existingEpisodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
			.collect();

		const duplicate = existingEpisodes.find((e) => e.episodeNumber === args.episodeNumber);
		if (duplicate) {
			throw new Error(`Episode ${args.episodeNumber} already exists in this season`);
		}

		const now = Date.now();
		return await ctx.db.insert("episodes", {
			mediaId: args.mediaId,
			seasonId: args.seasonId,
			episodeNumber: args.episodeNumber,
			absoluteEpisodeNumber: args.absoluteEpisodeNumber,
			title: args.title,
			overview: args.overview,
			monitored: args.monitored ?? true,
			airDate: args.airDate,
			airDateUtc: args.airDateUtc,
			hasFile: false,
			runtime: args.runtime,
			tvdbId: args.tvdbId,
			imdbId: args.imdbId,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an episode
export const update = mutation({
	args: {
		id: v.id("episodes"),
		title: v.optional(v.string()),
		overview: v.optional(v.string()),
		monitored: v.optional(v.boolean()),
		airDate: v.optional(v.number()),
		airDateUtc: v.optional(v.number()),
		absoluteEpisodeNumber: v.optional(v.number()),
		runtime: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
		imdbId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const episode = await ctx.db.get(args.id);
		if (!episode) {
			throw new Error("Episode not found");
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };

		if (args.title !== undefined) updates.title = args.title;
		if (args.overview !== undefined) updates.overview = args.overview;
		if (args.monitored !== undefined) updates.monitored = args.monitored;
		if (args.airDate !== undefined) updates.airDate = args.airDate;
		if (args.airDateUtc !== undefined) updates.airDateUtc = args.airDateUtc;
		if (args.absoluteEpisodeNumber !== undefined)
			updates.absoluteEpisodeNumber = args.absoluteEpisodeNumber;
		if (args.runtime !== undefined) updates.runtime = args.runtime;
		if (args.tvdbId !== undefined) updates.tvdbId = args.tvdbId;
		if (args.imdbId !== undefined) updates.imdbId = args.imdbId;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete an episode
export const remove = mutation({
	args: { id: v.id("episodes") },
	handler: async (ctx, args) => {
		const episode = await ctx.db.get(args.id);
		if (!episode) {
			throw new Error("Episode not found");
		}

		// If the episode has an associated file, unlink but don't delete
		// (file deletion should be handled separately)

		await ctx.db.delete(args.id);
	},
});

// Toggle monitored status
export const toggleMonitored = mutation({
	args: { id: v.id("episodes") },
	handler: async (ctx, args) => {
		const episode = await ctx.db.get(args.id);
		if (!episode) {
			throw new Error("Episode not found");
		}

		await ctx.db.patch(args.id, {
			monitored: !episode.monitored,
			updatedAt: Date.now(),
		});

		return !episode.monitored;
	},
});

// Link a media file to an episode
export const linkFile = mutation({
	args: {
		id: v.id("episodes"),
		fileId: v.id("mediaFiles"),
	},
	handler: async (ctx, args) => {
		const episode = await ctx.db.get(args.id);
		if (!episode) {
			throw new Error("Episode not found");
		}

		const file = await ctx.db.get(args.fileId);
		if (!file) {
			throw new Error("Media file not found");
		}

		// Verify the file belongs to the same media
		if (file.mediaId !== episode.mediaId) {
			throw new Error("File does not belong to the same series");
		}

		await ctx.db.patch(args.id, {
			episodeFileId: args.fileId,
			hasFile: true,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(args.id);
	},
});

// Unlink a media file from an episode
export const unlinkFile = mutation({
	args: { id: v.id("episodes") },
	handler: async (ctx, args) => {
		const episode = await ctx.db.get(args.id);
		if (!episode) {
			throw new Error("Episode not found");
		}

		await ctx.db.patch(args.id, {
			episodeFileId: undefined,
			hasFile: false,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(args.id);
	},
});

// Bulk add episodes (for importing from external source)
export const bulkAdd = mutation({
	args: {
		mediaId: v.id("media"),
		seasonId: v.id("seasons"),
		episodes: v.array(
			v.object({
				episodeNumber: v.number(),
				title: v.string(),
				absoluteEpisodeNumber: v.optional(v.number()),
				overview: v.optional(v.string()),
				monitored: v.optional(v.boolean()),
				airDate: v.optional(v.number()),
				airDateUtc: v.optional(v.number()),
				runtime: v.optional(v.number()),
				tvdbId: v.optional(v.number()),
				imdbId: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Verify series and season exist
		const series = await ctx.db.get(args.mediaId);
		if (!series) {
			throw new Error("Series not found");
		}

		const season = await ctx.db.get(args.seasonId);
		if (!season || season.mediaId !== args.mediaId) {
			throw new Error("Season not found or does not belong to this series");
		}

		// Get existing episodes to check for duplicates
		const existingEpisodes = await ctx.db
			.query("episodes")
			.withIndex("by_season", (q) => q.eq("seasonId", args.seasonId))
			.collect();

		const existingNumbers = new Set(existingEpisodes.map((e) => e.episodeNumber));

		const now = Date.now();
		const insertedIds: string[] = [];
		let skippedCount = 0;

		for (const ep of args.episodes) {
			if (existingNumbers.has(ep.episodeNumber)) {
				skippedCount++;
				continue;
			}

			const id = await ctx.db.insert("episodes", {
				mediaId: args.mediaId,
				seasonId: args.seasonId,
				episodeNumber: ep.episodeNumber,
				absoluteEpisodeNumber: ep.absoluteEpisodeNumber,
				title: ep.title,
				overview: ep.overview,
				monitored: ep.monitored ?? true,
				airDate: ep.airDate,
				airDateUtc: ep.airDateUtc,
				hasFile: false,
				runtime: ep.runtime,
				tvdbId: ep.tvdbId,
				imdbId: ep.imdbId,
				createdAt: now,
				updatedAt: now,
			});
			insertedIds.push(id);
		}

		return {
			insertedCount: insertedIds.length,
			skippedCount,
		};
	},
});

// ============================================================================
// Statistics
// ============================================================================

// Get episode statistics for a series
export const getStats = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		const now = Date.now();
		const totalCount = episodes.length;
		const monitoredCount = episodes.filter((e) => e.monitored).length;
		const hasFileCount = episodes.filter((e) => e.hasFile).length;
		const missingCount = episodes.filter(
			(e) => e.monitored && !e.hasFile && (e.airDate === undefined || e.airDate < now),
		).length;
		const upcomingCount = episodes.filter((e) => e.airDate !== undefined && e.airDate > now).length;

		const totalRuntime = episodes.reduce((acc, e) => acc + (e.runtime ?? 0), 0);

		return {
			totalCount,
			monitoredCount,
			hasFileCount,
			missingCount,
			upcomingCount,
			percentComplete: totalCount > 0 ? Math.round((hasFileCount / totalCount) * 100) : 0,
			totalRuntimeMinutes: totalRuntime,
		};
	},
});
