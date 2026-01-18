import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { indexerProtocolValidator, mediaTypeValidator } from "./schema";

// ============================================================================
// Queries
// ============================================================================

// List all indexers
export const list = query({
	args: {
		enabled: v.optional(v.boolean()),
		protocol: v.optional(indexerProtocolValidator),
	},
	handler: async (ctx, args) => {
		let indexers = await ctx.db.query("indexers").collect();

		if (args.enabled !== undefined) {
			indexers = indexers.filter((i) => i.enabled === args.enabled);
		}

		const { protocol } = args;
		if (protocol !== undefined) {
			indexers = indexers.filter((i) => i.protocol === protocol);
		}

		// Enrich with tags and download client info
		const enrichedIndexers = await Promise.all(
			indexers.map(async (indexer) => {
				const tags = await Promise.all(indexer.tagIds.map((id) => ctx.db.get(id)));

				const downloadClient = indexer.downloadClientId
					? await ctx.db.get(indexer.downloadClientId)
					: null;

				return {
					...indexer,
					tags: tags.filter(Boolean),
					downloadClient,
				};
			}),
		);

		return enrichedIndexers.sort((a, b) => a.priority - b.priority);
	},
});

// Get a single indexer by ID
export const get = query({
	args: { id: v.id("indexers") },
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) return null;

		const tags = await Promise.all(indexer.tagIds.map((id) => ctx.db.get(id)));

		const downloadClient = indexer.downloadClientId
			? await ctx.db.get(indexer.downloadClientId)
			: null;

		return {
			...indexer,
			tags: tags.filter(Boolean),
			downloadClient,
		};
	},
});

// Get indexers for a specific media type
export const getForMediaType = query({
	args: {
		mediaType: mediaTypeValidator,
		tagIds: v.optional(v.array(v.id("tags"))),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		let indexers = await ctx.db
			.query("indexers")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		// Filter out disabled indexers (temporarily disabled due to failures)
		indexers = indexers.filter((i) => !i.disabledUntil || i.disabledUntil < now);

		// Filter by media type capabilities
		indexers = indexers.filter((i) => {
			switch (args.mediaType) {
				case "tv":
					return i.supportsTvSearch && i.tvCategories.length > 0;
				case "movie":
					return i.supportsMovieSearch && i.movieCategories.length > 0;
				case "music":
					return i.supportsMusicSearch && i.musicCategories.length > 0;
				case "anime":
					return (
						(i.supportsTvSearch && i.animeCategories.length > 0) ||
						(i.supportsTvSearch && i.tvCategories.length > 0)
					);
				default:
					return false;
			}
		});

		// Filter by tags if specified
		const { tagIds } = args;
		if (tagIds && tagIds.length > 0) {
			const tagSet = new Set(tagIds);
			indexers = indexers.filter(
				(i) => i.tagIds.length === 0 || i.tagIds.some((t) => tagSet.has(t)),
			);
		}

		return indexers.sort((a, b) => a.priority - b.priority);
	},
});

// Get indexers for a specific media item
export const getForMedia = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const media = await ctx.db.get(args.mediaId);
		if (!media) return [];

		const now = Date.now();
		let indexers = await ctx.db
			.query("indexers")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		// Filter out disabled indexers
		indexers = indexers.filter((i) => !i.disabledUntil || i.disabledUntil < now);

		// Filter by media type capabilities
		indexers = indexers.filter((i) => {
			switch (media.mediaType) {
				case "tv":
					return i.supportsTvSearch && i.tvCategories.length > 0;
				case "movie":
					return i.supportsMovieSearch && i.movieCategories.length > 0;
				case "music":
					return i.supportsMusicSearch && i.musicCategories.length > 0;
				case "anime":
					return (
						(i.supportsTvSearch && i.animeCategories.length > 0) ||
						(i.supportsTvSearch && i.tvCategories.length > 0)
					);
				default:
					return false;
			}
		});

		// Filter by tags if media has tags
		const mediaTags = media.tagIds ?? [];
		if (mediaTags.length > 0) {
			const tagSet = new Set(mediaTags);
			indexers = indexers.filter(
				(i) => i.tagIds.length === 0 || i.tagIds.some((t) => tagSet.has(t)),
			);
		}

		return indexers.sort((a, b) => a.priority - b.priority);
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new indexer
export const add = mutation({
	args: {
		name: v.string(),
		protocol: indexerProtocolValidator,
		enabled: v.optional(v.boolean()),
		baseUrl: v.string(),
		apiPath: v.optional(v.string()),
		apiKey: v.string(),
		supportsSearch: v.optional(v.boolean()),
		supportsTvSearch: v.optional(v.boolean()),
		supportsMovieSearch: v.optional(v.boolean()),
		supportsMusicSearch: v.optional(v.boolean()),
		supportsBookSearch: v.optional(v.boolean()),
		tvCategories: v.optional(v.array(v.number())),
		movieCategories: v.optional(v.array(v.number())),
		musicCategories: v.optional(v.array(v.number())),
		animeCategories: v.optional(v.array(v.number())),
		priority: v.optional(v.number()),
		tagIds: v.optional(v.array(v.id("tags"))),
		downloadClientId: v.optional(v.id("downloadClients")),
		seedRatioLimit: v.optional(v.number()),
		seedTimeLimit: v.optional(v.number()),
		isPrivate: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("indexers")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`Indexer "${args.name}" already exists`);
		}

		// Get next priority if not specified
		let priority = args.priority;
		if (priority === undefined) {
			const allIndexers = await ctx.db.query("indexers").collect();
			priority = allIndexers.length > 0 ? Math.max(...allIndexers.map((i) => i.priority)) + 1 : 1;
		}

		const now = Date.now();
		return await ctx.db.insert("indexers", {
			name: args.name,
			protocol: args.protocol,
			enabled: args.enabled ?? true,
			baseUrl: args.baseUrl.replace(/\/$/, ""), // Remove trailing slash
			apiPath: args.apiPath ?? "/api",
			apiKey: args.apiKey,
			supportsSearch: args.supportsSearch ?? true,
			supportsTvSearch: args.supportsTvSearch ?? true,
			supportsMovieSearch: args.supportsMovieSearch ?? true,
			supportsMusicSearch: args.supportsMusicSearch ?? false,
			supportsBookSearch: args.supportsBookSearch ?? false,
			tvCategories: args.tvCategories ?? [],
			movieCategories: args.movieCategories ?? [],
			musicCategories: args.musicCategories ?? [],
			animeCategories: args.animeCategories ?? [],
			priority,
			tagIds: args.tagIds ?? [],
			downloadClientId: args.downloadClientId,
			seedRatioLimit: args.seedRatioLimit,
			seedTimeLimit: args.seedTimeLimit,
			isPrivate: args.isPrivate ?? false,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an indexer
export const update = mutation({
	args: {
		id: v.id("indexers"),
		name: v.optional(v.string()),
		protocol: v.optional(indexerProtocolValidator),
		enabled: v.optional(v.boolean()),
		baseUrl: v.optional(v.string()),
		apiPath: v.optional(v.string()),
		apiKey: v.optional(v.string()),
		supportsSearch: v.optional(v.boolean()),
		supportsTvSearch: v.optional(v.boolean()),
		supportsMovieSearch: v.optional(v.boolean()),
		supportsMusicSearch: v.optional(v.boolean()),
		supportsBookSearch: v.optional(v.boolean()),
		tvCategories: v.optional(v.array(v.number())),
		movieCategories: v.optional(v.array(v.number())),
		musicCategories: v.optional(v.array(v.number())),
		animeCategories: v.optional(v.array(v.number())),
		priority: v.optional(v.number()),
		tagIds: v.optional(v.array(v.id("tags"))),
		downloadClientId: v.optional(v.id("downloadClients")),
		seedRatioLimit: v.optional(v.number()),
		seedTimeLimit: v.optional(v.number()),
		isPrivate: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) {
			throw new Error("Indexer not found");
		}

		// Check for duplicate name if changing
		const { name } = args;
		if (name !== undefined && name !== indexer.name) {
			const existing = await ctx.db
				.query("indexers")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`Indexer "${name}" already exists`);
			}
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };

		if (args.name !== undefined) updates.name = args.name;
		if (args.protocol !== undefined) updates.protocol = args.protocol;
		if (args.enabled !== undefined) updates.enabled = args.enabled;
		if (args.baseUrl !== undefined) updates.baseUrl = args.baseUrl.replace(/\/$/, "");
		if (args.apiPath !== undefined) updates.apiPath = args.apiPath;
		if (args.apiKey !== undefined) updates.apiKey = args.apiKey;
		if (args.supportsSearch !== undefined) updates.supportsSearch = args.supportsSearch;
		if (args.supportsTvSearch !== undefined) updates.supportsTvSearch = args.supportsTvSearch;
		if (args.supportsMovieSearch !== undefined)
			updates.supportsMovieSearch = args.supportsMovieSearch;
		if (args.supportsMusicSearch !== undefined)
			updates.supportsMusicSearch = args.supportsMusicSearch;
		if (args.supportsBookSearch !== undefined) updates.supportsBookSearch = args.supportsBookSearch;
		if (args.tvCategories !== undefined) updates.tvCategories = args.tvCategories;
		if (args.movieCategories !== undefined) updates.movieCategories = args.movieCategories;
		if (args.musicCategories !== undefined) updates.musicCategories = args.musicCategories;
		if (args.animeCategories !== undefined) updates.animeCategories = args.animeCategories;
		if (args.priority !== undefined) updates.priority = args.priority;
		if (args.tagIds !== undefined) updates.tagIds = args.tagIds;
		if (args.downloadClientId !== undefined) updates.downloadClientId = args.downloadClientId;
		if (args.seedRatioLimit !== undefined) updates.seedRatioLimit = args.seedRatioLimit;
		if (args.seedTimeLimit !== undefined) updates.seedTimeLimit = args.seedTimeLimit;
		if (args.isPrivate !== undefined) updates.isPrivate = args.isPrivate;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete an indexer
export const remove = mutation({
	args: { id: v.id("indexers") },
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) {
			throw new Error("Indexer not found");
		}

		await ctx.db.delete(args.id);
	},
});

// Toggle enabled status
export const toggleEnabled = mutation({
	args: { id: v.id("indexers") },
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) {
			throw new Error("Indexer not found");
		}

		await ctx.db.patch(args.id, {
			enabled: !indexer.enabled,
			updatedAt: Date.now(),
		});

		return !indexer.enabled;
	},
});

// Update priorities (batch)
export const updatePriorities = mutation({
	args: {
		updates: v.array(
			v.object({
				id: v.id("indexers"),
				priority: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		for (const update of args.updates) {
			await ctx.db.patch(update.id, {
				priority: update.priority,
				updatedAt: now,
			});
		}

		return { updated: args.updates.length };
	},
});

// Record a failure (temporarily disable indexer)
export const recordFailure = mutation({
	args: {
		id: v.id("indexers"),
		disableMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) {
			throw new Error("Indexer not found");
		}

		const failureCount = (indexer.failureCount ?? 0) + 1;
		const disableMinutes = args.disableMinutes ?? calculateBackoff(failureCount);
		const disabledUntil = Date.now() + disableMinutes * 60 * 1000;

		await ctx.db.patch(args.id, {
			failureCount,
			disabledUntil,
			updatedAt: Date.now(),
		});

		return { failureCount, disabledUntil };
	},
});

// Clear failures (re-enable indexer)
export const clearFailures = mutation({
	args: { id: v.id("indexers") },
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) {
			throw new Error("Indexer not found");
		}

		await ctx.db.patch(args.id, {
			failureCount: 0,
			disabledUntil: undefined,
			updatedAt: Date.now(),
		});
	},
});

// Update last sync timestamps
export const updateSyncTime = mutation({
	args: {
		id: v.id("indexers"),
		syncType: v.union(v.literal("rss"), v.literal("search")),
	},
	handler: async (ctx, args) => {
		const indexer = await ctx.db.get(args.id);
		if (!indexer) {
			throw new Error("Indexer not found");
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (args.syncType === "rss") {
			updates.lastRssSync = now;
		} else {
			updates.lastSearchSync = now;
		}

		// Clear failures on successful sync
		updates.failureCount = 0;
		updates.disabledUntil = undefined;

		await ctx.db.patch(args.id, updates);
	},
});

// ============================================================================
// Statistics
// ============================================================================

export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const indexers = await ctx.db.query("indexers").collect();

		const enabledCount = indexers.filter((i) => i.enabled).length;
		const healthyCount = indexers.filter(
			(i) => i.enabled && (!i.disabledUntil || i.disabledUntil < now),
		).length;

		const byProtocol: Record<string, number> = {};
		for (const indexer of indexers) {
			byProtocol[indexer.protocol] = (byProtocol[indexer.protocol] ?? 0) + 1;
		}

		return {
			totalCount: indexers.length,
			enabledCount,
			disabledCount: indexers.length - enabledCount,
			healthyCount,
			byProtocol,
		};
	},
});

// ============================================================================
// Helpers
// ============================================================================

// Calculate backoff time based on failure count (exponential backoff)
function calculateBackoff(failureCount: number): number {
	// Base: 5 minutes, max: 24 hours
	const baseMinutes = 5;
	const maxMinutes = 24 * 60;
	const minutes = Math.min(baseMinutes * 2 ** (failureCount - 1), maxMinutes);
	return minutes;
}
