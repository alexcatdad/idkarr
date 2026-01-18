import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mediaStatusValidator } from "./schema";

// ============================================================================
// Queries
// ============================================================================

// List all movies
export const list = query({
	args: {
		monitored: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		let movies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		if (args.monitored !== undefined) {
			movies = movies.filter((m) => m.monitored === args.monitored);
		}

		// Enrich with metadata and file info
		const enrichedMovies = await Promise.all(
			movies.map(async (movie) => {
				const metadata = await ctx.db
					.query("movieMetadata")
					.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
					.first();

				const file = metadata?.movieFileId ? await ctx.db.get(metadata.movieFileId) : null;

				return {
					...movie,
					metadata,
					file,
					hasFile: !!file,
				};
			}),
		);

		return enrichedMovies;
	},
});

// Get a single movie by ID with full details
export const get = query({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.id);
		if (!movie || movie.mediaType !== "movie") {
			return null;
		}

		// Get metadata
		const metadata = await ctx.db
			.query("movieMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		// Get file
		const file = metadata?.movieFileId ? await ctx.db.get(metadata.movieFileId) : null;

		// Get quality profile
		const qualityProfile = movie.qualityProfileId ? await ctx.db.get(movie.qualityProfileId) : null;

		// Get root folder
		const rootFolder = movie.rootFolderId ? await ctx.db.get(movie.rootFolderId) : null;

		// Get tags
		const tags = movie.tagIds ? await Promise.all(movie.tagIds.map((id) => ctx.db.get(id))) : [];

		return {
			...movie,
			metadata,
			file,
			hasFile: !!file,
			qualityProfile,
			rootFolder,
			tags: tags.filter(Boolean),
		};
	},
});

// Search movies by title
export const search = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const searchLower = args.query.toLowerCase();

		const allMovies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		return allMovies.filter(
			(m) =>
				m.title.toLowerCase().includes(searchLower) ||
				m.sortTitle.toLowerCase().includes(searchLower),
		);
	},
});

// Get movie by TMDB ID
export const getByTmdbId = query({
	args: { tmdbId: v.number() },
	handler: async (ctx, args) => {
		const result = await ctx.db
			.query("media")
			.withIndex("by_tmdb", (q) => q.eq("tmdbId", args.tmdbId))
			.first();

		return result?.mediaType === "movie" ? result : null;
	},
});

// Get movie by IMDB ID
export const getByImdbId = query({
	args: { imdbId: v.string() },
	handler: async (ctx, args) => {
		// No index on imdbId, need to filter manually
		const allMovies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		return allMovies.find((m) => m.imdbId === args.imdbId) ?? null;
	},
});

// Get upcoming movies (not yet released)
export const getUpcoming = query({
	args: {
		days: v.optional(v.number()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const daysToCheck = args.days ?? 90;
		const endDate = now + daysToCheck * 24 * 60 * 60 * 1000;
		const resultLimit = args.limit ?? 50;

		const movies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		// Get metadata for all movies
		const upcoming: Array<{
			movie: (typeof movies)[0];
			metadata: Awaited<ReturnType<typeof ctx.db.get>>;
			releaseDate: number;
		}> = [];

		for (const movie of movies) {
			const metadata = await ctx.db
				.query("movieMetadata")
				.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
				.first();

			if (!metadata) continue;

			// Check various release dates
			const releaseDate = metadata.digitalRelease ?? metadata.physicalRelease ?? metadata.inCinemas;

			if (releaseDate && releaseDate >= now && releaseDate <= endDate) {
				upcoming.push({ movie, metadata, releaseDate });
			}
		}

		// Sort by release date and limit
		upcoming.sort((a, b) => a.releaseDate - b.releaseDate);
		return upcoming.slice(0, resultLimit).map(({ movie, metadata }) => ({
			...movie,
			metadata,
		}));
	},
});

// Get missing movies (monitored but no file)
export const getMissing = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;

		const movies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		// Filter to monitored movies
		const monitoredMovies = movies.filter((m) => m.monitored);

		// Check which ones have files
		const missing: Array<{
			movie: (typeof movies)[0];
			metadata: Awaited<ReturnType<typeof ctx.db.get>>;
		}> = [];

		for (const movie of monitoredMovies) {
			const metadata = await ctx.db
				.query("movieMetadata")
				.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
				.first();

			// If no file linked, it's missing
			if (!metadata?.movieFileId) {
				missing.push({ movie, metadata });
			}
		}

		return missing.slice(0, resultLimit).map(({ movie, metadata }) => ({
			...movie,
			metadata,
			hasFile: false,
		}));
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new movie
export const add = mutation({
	args: {
		title: v.string(),
		year: v.optional(v.number()),
		overview: v.optional(v.string()),
		status: v.optional(mediaStatusValidator),
		tmdbId: v.optional(v.number()),
		imdbId: v.optional(v.string()),
		path: v.optional(v.string()),
		qualityProfileId: v.optional(v.id("qualityProfiles")),
		rootFolderId: v.optional(v.id("rootFolders")),
		tagIds: v.optional(v.array(v.id("tags"))),
		monitored: v.optional(v.boolean()),
		// Metadata fields
		runtime: v.optional(v.number()),
		inCinemas: v.optional(v.number()),
		physicalRelease: v.optional(v.number()),
		digitalRelease: v.optional(v.number()),
		collectionTmdbId: v.optional(v.number()),
		collectionTitle: v.optional(v.string()),
		certification: v.optional(v.string()),
		studio: v.optional(v.string()),
		youtubeTrailerId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check for duplicate by TMDB ID
		if (args.tmdbId) {
			const existing = await ctx.db
				.query("media")
				.withIndex("by_tmdb", (q) => q.eq("tmdbId", args.tmdbId))
				.first();

			if (existing && existing.mediaType === "movie") {
				throw new Error(`Movie with TMDB ID ${args.tmdbId} already exists`);
			}
		}

		const now = Date.now();
		const sortTitle = args.title.toLowerCase().replace(/^(the|a|an)\s+/i, "");

		// Insert media record
		const movieId = await ctx.db.insert("media", {
			mediaType: "movie",
			title: args.title,
			sortTitle,
			year: args.year,
			overview: args.overview,
			status: args.status ?? "unknown",
			monitored: args.monitored ?? true,
			path: args.path,
			tmdbId: args.tmdbId,
			imdbId: args.imdbId,
			qualityProfileId: args.qualityProfileId,
			rootFolderId: args.rootFolderId,
			tagIds: args.tagIds,
			added: now,
		});

		// Insert metadata record
		await ctx.db.insert("movieMetadata", {
			mediaId: movieId,
			runtime: args.runtime,
			inCinemas: args.inCinemas,
			physicalRelease: args.physicalRelease,
			digitalRelease: args.digitalRelease,
			collectionTmdbId: args.collectionTmdbId,
			collectionTitle: args.collectionTitle,
			certification: args.certification,
			studio: args.studio,
			youtubeTrailerId: args.youtubeTrailerId,
			createdAt: now,
			updatedAt: now,
		});

		return movieId;
	},
});

// Update a movie
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
		// Metadata fields
		runtime: v.optional(v.number()),
		inCinemas: v.optional(v.number()),
		physicalRelease: v.optional(v.number()),
		digitalRelease: v.optional(v.number()),
		collectionTmdbId: v.optional(v.number()),
		collectionTitle: v.optional(v.string()),
		certification: v.optional(v.string()),
		studio: v.optional(v.string()),
		youtubeTrailerId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.id);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		const now = Date.now();
		const mediaUpdates: Record<string, unknown> = {
			lastInfoSync: now,
		};

		if (args.title !== undefined) {
			mediaUpdates.title = args.title;
			mediaUpdates.sortTitle = args.title.toLowerCase().replace(/^(the|a|an)\s+/i, "");
		}
		if (args.year !== undefined) mediaUpdates.year = args.year;
		if (args.overview !== undefined) mediaUpdates.overview = args.overview;
		if (args.status !== undefined) mediaUpdates.status = args.status;
		if (args.monitored !== undefined) mediaUpdates.monitored = args.monitored;
		if (args.path !== undefined) mediaUpdates.path = args.path;
		if (args.qualityProfileId !== undefined) mediaUpdates.qualityProfileId = args.qualityProfileId;
		if (args.rootFolderId !== undefined) mediaUpdates.rootFolderId = args.rootFolderId;
		if (args.tagIds !== undefined) mediaUpdates.tagIds = args.tagIds;

		await ctx.db.patch(args.id, mediaUpdates);

		// Update metadata
		const metadata = await ctx.db
			.query("movieMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		if (metadata) {
			const metadataUpdates: Record<string, unknown> = { updatedAt: now };

			if (args.runtime !== undefined) metadataUpdates.runtime = args.runtime;
			if (args.inCinemas !== undefined) metadataUpdates.inCinemas = args.inCinemas;
			if (args.physicalRelease !== undefined)
				metadataUpdates.physicalRelease = args.physicalRelease;
			if (args.digitalRelease !== undefined) metadataUpdates.digitalRelease = args.digitalRelease;
			if (args.collectionTmdbId !== undefined)
				metadataUpdates.collectionTmdbId = args.collectionTmdbId;
			if (args.collectionTitle !== undefined)
				metadataUpdates.collectionTitle = args.collectionTitle;
			if (args.certification !== undefined) metadataUpdates.certification = args.certification;
			if (args.studio !== undefined) metadataUpdates.studio = args.studio;
			if (args.youtubeTrailerId !== undefined)
				metadataUpdates.youtubeTrailerId = args.youtubeTrailerId;

			await ctx.db.patch(metadata._id, metadataUpdates);
		}

		return await ctx.db.get(args.id);
	},
});

// Delete a movie and its metadata
export const remove = mutation({
	args: {
		id: v.id("media"),
		deleteFiles: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.id);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		// Delete metadata
		const metadata = await ctx.db
			.query("movieMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		if (metadata) {
			await ctx.db.delete(metadata._id);
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

		// Delete the movie
		await ctx.db.delete(args.id);
	},
});

// Toggle monitored status
export const toggleMonitored = mutation({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.id);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		await ctx.db.patch(args.id, {
			monitored: !movie.monitored,
		});

		return !movie.monitored;
	},
});

// Link a media file to a movie
export const linkFile = mutation({
	args: {
		id: v.id("media"),
		fileId: v.id("mediaFiles"),
	},
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.id);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		const file = await ctx.db.get(args.fileId);
		if (!file) {
			throw new Error("Media file not found");
		}

		// Verify the file belongs to this movie
		if (file.mediaId !== args.id) {
			throw new Error("File does not belong to this movie");
		}

		// Update metadata with file reference
		const metadata = await ctx.db
			.query("movieMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		if (metadata) {
			await ctx.db.patch(metadata._id, {
				movieFileId: args.fileId,
				updatedAt: Date.now(),
			});
		}

		return await ctx.db.get(args.id);
	},
});

// Unlink a media file from a movie
export const unlinkFile = mutation({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.id);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		const metadata = await ctx.db
			.query("movieMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		if (metadata) {
			await ctx.db.patch(metadata._id, {
				movieFileId: undefined,
				updatedAt: Date.now(),
			});
		}

		return await ctx.db.get(args.id);
	},
});

// ============================================================================
// Statistics
// ============================================================================

// Get movie statistics
export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const allMovies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		const monitoredMovies = allMovies.filter((m) => m.monitored);

		// Count movies with files
		let withFileCount = 0;
		let totalSizeBytes = 0;

		for (const movie of allMovies) {
			const metadata = await ctx.db
				.query("movieMetadata")
				.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
				.first();

			if (metadata?.movieFileId) {
				withFileCount++;
				const file = await ctx.db.get(metadata.movieFileId);
				if (file) {
					totalSizeBytes += file.size;
				}
			}
		}

		const missingCount = monitoredMovies.length - withFileCount;

		return {
			movieCount: allMovies.length,
			monitoredCount: monitoredMovies.length,
			withFileCount,
			missingCount: missingCount > 0 ? missingCount : 0,
			totalSizeBytes,
			totalSizeGb: Math.round((totalSizeBytes / (1024 * 1024 * 1024)) * 100) / 100,
		};
	},
});
