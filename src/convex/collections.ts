import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

// List all collections with movie counts
export const list = query({
	args: {},
	handler: async (ctx) => {
		const collections = await ctx.db.query("collections").collect();

		// For each collection, count movies and owned movies
		const results = await Promise.all(
			collections.map(async (collection) => {
				const movies = await ctx.db
					.query("media")
					.withIndex("by_collection", (q) => q.eq("collectionId", collection._id))
					.collect();

				// Count movies with files by checking movieMetadata
				let ownedCount = 0;
				for (const movie of movies) {
					const metadata = await ctx.db
						.query("movieMetadata")
						.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
						.first();

					if (metadata?.movieFileId) {
						ownedCount++;
					}
				}

				return {
					...collection,
					movieCount: movies.length,
					ownedCount,
				};
			}),
		);

		return results;
	},
});

// Get collection by ID with all movies in it
export const get = query({
	args: { id: v.id("collections") },
	handler: async (ctx, args) => {
		const collection = await ctx.db.get(args.id);
		if (!collection) return null;

		const movies = await ctx.db
			.query("media")
			.withIndex("by_collection", (q) => q.eq("collectionId", args.id))
			.collect();

		// Enrich movies with hasFile info
		const enrichedMovies = await Promise.all(
			movies.map(async (movie) => {
				const metadata = await ctx.db
					.query("movieMetadata")
					.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
					.first();

				return {
					...movie,
					hasFile: !!metadata?.movieFileId,
					metadata,
				};
			}),
		);

		return { ...collection, movies: enrichedMovies };
	},
});

// Find collection by TMDB ID
export const getByTmdbId = query({
	args: { tmdbId: v.number() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("collections")
			.withIndex("by_tmdb_id", (q) => q.eq("tmdbId", args.tmdbId))
			.first();
	},
});

// Get completion progress for a collection
export const getProgress = query({
	args: { id: v.id("collections") },
	handler: async (ctx, args) => {
		const movies = await ctx.db
			.query("media")
			.withIndex("by_collection", (q) => q.eq("collectionId", args.id))
			.collect();

		// Count movies with files
		let withFiles = 0;
		for (const movie of movies) {
			const metadata = await ctx.db
				.query("movieMetadata")
				.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
				.first();

			if (metadata?.movieFileId) {
				withFiles++;
			}
		}

		return {
			total: movies.length,
			owned: withFiles,
			percentage: movies.length > 0 ? Math.round((withFiles / movies.length) * 100) : 0,
		};
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add or update a collection by tmdbId (upsert)
export const addOrUpdate = mutation({
	args: {
		tmdbId: v.number(),
		name: v.string(),
		overview: v.optional(v.string()),
		posterPath: v.optional(v.string()),
		backdropPath: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("collections")
			.withIndex("by_tmdb_id", (q) => q.eq("tmdbId", args.tmdbId))
			.first();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				name: args.name,
				overview: args.overview,
				posterPath: args.posterPath,
				backdropPath: args.backdropPath,
				updatedAt: now,
			});
			return existing._id;
		}

		return await ctx.db.insert("collections", {
			tmdbId: args.tmdbId,
			name: args.name,
			overview: args.overview,
			posterPath: args.posterPath,
			backdropPath: args.backdropPath,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Delete a collection
export const remove = mutation({
	args: { id: v.id("collections") },
	handler: async (ctx, args) => {
		// Unlink all movies from this collection first
		const movies = await ctx.db
			.query("media")
			.withIndex("by_collection", (q) => q.eq("collectionId", args.id))
			.collect();

		for (const movie of movies) {
			await ctx.db.patch(movie._id, { collectionId: undefined });
		}

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Helper Mutations
// ============================================================================

// Link a movie to a collection
export const linkMovie = mutation({
	args: {
		collectionId: v.id("collections"),
		movieId: v.id("media"),
	},
	handler: async (ctx, args) => {
		const collection = await ctx.db.get(args.collectionId);
		if (!collection) {
			throw new Error("Collection not found");
		}

		const movie = await ctx.db.get(args.movieId);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		await ctx.db.patch(args.movieId, { collectionId: args.collectionId });
	},
});

// Unlink a movie from its collection
export const unlinkMovie = mutation({
	args: { movieId: v.id("media") },
	handler: async (ctx, args) => {
		const movie = await ctx.db.get(args.movieId);
		if (!movie || movie.mediaType !== "movie") {
			throw new Error("Movie not found");
		}

		await ctx.db.patch(args.movieId, { collectionId: undefined });
	},
});
