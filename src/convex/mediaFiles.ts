import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { qualitySourceValidator, resolutionValidator } from "./schema";

// ============================================================================
// Queries
// ============================================================================

// List all media files for a media item
export const listByMedia = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const files = await ctx.db
			.query("mediaFiles")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		// Enrich with quality definition info
		const enrichedFiles = await Promise.all(
			files.map(async (file) => {
				const qualityDefinition = file.qualityDefinitionId
					? await ctx.db.get(file.qualityDefinitionId)
					: null;

				const matchedFormats = file.matchedFormatIds
					? await Promise.all(file.matchedFormatIds.map((id) => ctx.db.get(id)))
					: [];

				return {
					...file,
					qualityDefinition,
					matchedFormats: matchedFormats.filter(Boolean),
				};
			}),
		);

		return enrichedFiles.sort((a, b) => b.dateAdded - a.dateAdded);
	},
});

// Get a single media file by ID
export const get = query({
	args: { id: v.id("mediaFiles") },
	handler: async (ctx, args) => {
		const file = await ctx.db.get(args.id);
		if (!file) return null;

		const media = await ctx.db.get(file.mediaId);
		const qualityDefinition = file.qualityDefinitionId
			? await ctx.db.get(file.qualityDefinitionId)
			: null;

		const matchedFormats = file.matchedFormatIds
			? await Promise.all(file.matchedFormatIds.map((id) => ctx.db.get(id)))
			: [];

		return {
			...file,
			media,
			qualityDefinition,
			matchedFormats: matchedFormats.filter(Boolean),
		};
	},
});

// Get media file by path
export const getByPath = query({
	args: { path: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("mediaFiles")
			.withIndex("by_path", (q) => q.eq("path", args.path))
			.first();
	},
});

// Get recently added files
export const getRecent = query({
	args: {
		limit: v.optional(v.number()),
		days: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;
		const daysToCheck = args.days ?? 7;
		const startDate = Date.now() - daysToCheck * 24 * 60 * 60 * 1000;

		const files = await ctx.db
			.query("mediaFiles")
			.withIndex("by_dateAdded")
			.order("desc")
			.take(resultLimit * 2);

		const recentFiles = files.filter((f) => f.dateAdded >= startDate);

		// Enrich with media info
		const enrichedFiles = await Promise.all(
			recentFiles.slice(0, resultLimit).map(async (file) => {
				const media = await ctx.db.get(file.mediaId);
				return { ...file, media };
			}),
		);

		return enrichedFiles;
	},
});

// Get files by quality
export const getByQuality = query({
	args: {
		qualityDefinitionId: v.id("qualityDefinitions"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 100;

		const files = await ctx.db.query("mediaFiles").collect();
		const matchingFiles = files.filter((f) => f.qualityDefinitionId === args.qualityDefinitionId);

		return matchingFiles.slice(0, resultLimit);
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new media file
export const add = mutation({
	args: {
		mediaId: v.id("media"),
		path: v.string(),
		relativePath: v.string(),
		size: v.number(),
		qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
		qualitySource: v.optional(qualitySourceValidator),
		qualityResolution: v.optional(resolutionValidator),
		videoCodec: v.optional(v.string()),
		audioCodec: v.optional(v.string()),
		audioChannels: v.optional(v.string()),
		releaseGroup: v.optional(v.string()),
		releaseHash: v.optional(v.string()),
		sceneName: v.optional(v.string()),
		customFormatScore: v.optional(v.number()),
		matchedFormatIds: v.optional(v.array(v.id("customFormats"))),
	},
	handler: async (ctx, args) => {
		// Verify media exists
		const media = await ctx.db.get(args.mediaId);
		if (!media) {
			throw new Error("Media not found");
		}

		// Check for duplicate path
		const existing = await ctx.db
			.query("mediaFiles")
			.withIndex("by_path", (q) => q.eq("path", args.path))
			.first();

		if (existing) {
			throw new Error("A file with this path already exists");
		}

		const now = Date.now();
		return await ctx.db.insert("mediaFiles", {
			mediaId: args.mediaId,
			path: args.path,
			relativePath: args.relativePath,
			size: args.size,
			qualityDefinitionId: args.qualityDefinitionId,
			qualitySource: args.qualitySource,
			qualityResolution: args.qualityResolution,
			videoCodec: args.videoCodec,
			audioCodec: args.audioCodec,
			audioChannels: args.audioChannels,
			releaseGroup: args.releaseGroup,
			releaseHash: args.releaseHash,
			sceneName: args.sceneName,
			customFormatScore: args.customFormatScore,
			matchedFormatIds: args.matchedFormatIds,
			dateAdded: now,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update a media file
export const update = mutation({
	args: {
		id: v.id("mediaFiles"),
		path: v.optional(v.string()),
		relativePath: v.optional(v.string()),
		size: v.optional(v.number()),
		qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
		qualitySource: v.optional(qualitySourceValidator),
		qualityResolution: v.optional(resolutionValidator),
		videoCodec: v.optional(v.string()),
		audioCodec: v.optional(v.string()),
		audioChannels: v.optional(v.string()),
		releaseGroup: v.optional(v.string()),
		releaseHash: v.optional(v.string()),
		sceneName: v.optional(v.string()),
		customFormatScore: v.optional(v.number()),
		matchedFormatIds: v.optional(v.array(v.id("customFormats"))),
	},
	handler: async (ctx, args) => {
		const file = await ctx.db.get(args.id);
		if (!file) {
			throw new Error("Media file not found");
		}

		// Check for duplicate path if changing
		const { path } = args;
		if (path !== undefined && path !== file.path) {
			const existing = await ctx.db
				.query("mediaFiles")
				.withIndex("by_path", (q) => q.eq("path", path))
				.first();

			if (existing) {
				throw new Error("A file with this path already exists");
			}
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };

		if (args.path !== undefined) updates.path = args.path;
		if (args.relativePath !== undefined) updates.relativePath = args.relativePath;
		if (args.size !== undefined) updates.size = args.size;
		if (args.qualityDefinitionId !== undefined)
			updates.qualityDefinitionId = args.qualityDefinitionId;
		if (args.qualitySource !== undefined) updates.qualitySource = args.qualitySource;
		if (args.qualityResolution !== undefined) updates.qualityResolution = args.qualityResolution;
		if (args.videoCodec !== undefined) updates.videoCodec = args.videoCodec;
		if (args.audioCodec !== undefined) updates.audioCodec = args.audioCodec;
		if (args.audioChannels !== undefined) updates.audioChannels = args.audioChannels;
		if (args.releaseGroup !== undefined) updates.releaseGroup = args.releaseGroup;
		if (args.releaseHash !== undefined) updates.releaseHash = args.releaseHash;
		if (args.sceneName !== undefined) updates.sceneName = args.sceneName;
		if (args.customFormatScore !== undefined) updates.customFormatScore = args.customFormatScore;
		if (args.matchedFormatIds !== undefined) updates.matchedFormatIds = args.matchedFormatIds;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete a media file
export const remove = mutation({
	args: { id: v.id("mediaFiles") },
	handler: async (ctx, args) => {
		const file = await ctx.db.get(args.id);
		if (!file) {
			throw new Error("Media file not found");
		}

		// Unlink from any episodes
		const episodes = await ctx.db.query("episodes").collect();
		for (const episode of episodes) {
			if (episode.episodeFileId === args.id) {
				await ctx.db.patch(episode._id, {
					episodeFileId: undefined,
					hasFile: false,
					updatedAt: Date.now(),
				});
			}
		}

		// Unlink from movie metadata
		const movieMetadata = await ctx.db.query("movieMetadata").collect();
		for (const metadata of movieMetadata) {
			if (metadata.movieFileId === args.id) {
				await ctx.db.patch(metadata._id, {
					movieFileId: undefined,
					updatedAt: Date.now(),
				});
			}
		}

		// Unlink from tracks
		const tracks = await ctx.db.query("tracks").collect();
		for (const track of tracks) {
			if (track.trackFileId === args.id) {
				await ctx.db.patch(track._id, {
					trackFileId: undefined,
					hasFile: false,
					updatedAt: Date.now(),
				});
			}
		}

		await ctx.db.delete(args.id);
	},
});

// Bulk add media files
export const bulkAdd = mutation({
	args: {
		mediaId: v.id("media"),
		files: v.array(
			v.object({
				path: v.string(),
				relativePath: v.string(),
				size: v.number(),
				qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
				qualitySource: v.optional(qualitySourceValidator),
				qualityResolution: v.optional(resolutionValidator),
				videoCodec: v.optional(v.string()),
				audioCodec: v.optional(v.string()),
				audioChannels: v.optional(v.string()),
				releaseGroup: v.optional(v.string()),
				sceneName: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Verify media exists
		const media = await ctx.db.get(args.mediaId);
		if (!media) {
			throw new Error("Media not found");
		}

		// Get existing paths to skip duplicates
		const existingFiles = await ctx.db
			.query("mediaFiles")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		const existingPaths = new Set(existingFiles.map((f) => f.path));

		const now = Date.now();
		const insertedIds: string[] = [];
		let skippedCount = 0;

		for (const file of args.files) {
			if (existingPaths.has(file.path)) {
				skippedCount++;
				continue;
			}

			const id = await ctx.db.insert("mediaFiles", {
				mediaId: args.mediaId,
				path: file.path,
				relativePath: file.relativePath,
				size: file.size,
				qualityDefinitionId: file.qualityDefinitionId,
				qualitySource: file.qualitySource,
				qualityResolution: file.qualityResolution,
				videoCodec: file.videoCodec,
				audioCodec: file.audioCodec,
				audioChannels: file.audioChannels,
				releaseGroup: file.releaseGroup,
				sceneName: file.sceneName,
				dateAdded: now,
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

// Update path (for rename operations)
export const updatePath = mutation({
	args: {
		id: v.id("mediaFiles"),
		newPath: v.string(),
		newRelativePath: v.string(),
	},
	handler: async (ctx, args) => {
		const file = await ctx.db.get(args.id);
		if (!file) {
			throw new Error("Media file not found");
		}

		// Check for duplicate path
		const existing = await ctx.db
			.query("mediaFiles")
			.withIndex("by_path", (q) => q.eq("path", args.newPath))
			.first();

		if (existing && existing._id !== args.id) {
			throw new Error("A file with this path already exists");
		}

		await ctx.db.patch(args.id, {
			path: args.newPath,
			relativePath: args.newRelativePath,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(args.id);
	},
});

// ============================================================================
// Statistics
// ============================================================================

export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const files = await ctx.db.query("mediaFiles").collect();

		let totalSize = 0;
		const byQuality: Record<string, { count: number; size: number }> = {};
		const byCodec: Record<string, number> = {};

		for (const file of files) {
			totalSize += file.size;

			// By quality source
			const source = file.qualitySource ?? "unknown";
			if (!byQuality[source]) {
				byQuality[source] = { count: 0, size: 0 };
			}
			byQuality[source].count++;
			byQuality[source].size += file.size;

			// By video codec
			if (file.videoCodec) {
				byCodec[file.videoCodec] = (byCodec[file.videoCodec] ?? 0) + 1;
			}
		}

		return {
			totalCount: files.length,
			totalSizeBytes: totalSize,
			totalSizeGb: Math.round((totalSize / (1024 * 1024 * 1024)) * 100) / 100,
			byQualitySource: byQuality,
			byVideoCodec: byCodec,
		};
	},
});

// Get statistics for a specific media item
export const getStatsForMedia = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const files = await ctx.db
			.query("mediaFiles")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		let totalSize = 0;
		for (const file of files) {
			totalSize += file.size;
		}

		return {
			fileCount: files.length,
			totalSizeBytes: totalSize,
			totalSizeGb: Math.round((totalSize / (1024 * 1024 * 1024)) * 100) / 100,
		};
	},
});
