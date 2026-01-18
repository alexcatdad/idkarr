import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mediaTypeValidator, requestStatusValidator } from "./schema";

// ============================================================================
// Queries
// ============================================================================

// List all requests
export const list = query({
	args: {
		status: v.optional(requestStatusValidator),
		mediaType: v.optional(mediaTypeValidator),
		requestedBy: v.optional(v.id("users")),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;
		const { status, requestedBy, mediaType } = args;

		let requests = await (async () => {
			if (status) {
				return ctx.db
					.query("requests")
					.withIndex("by_status", (q) => q.eq("status", status))
					.collect();
			}
			if (requestedBy) {
				return ctx.db
					.query("requests")
					.withIndex("by_requestedBy", (q) => q.eq("requestedBy", requestedBy))
					.collect();
			}
			return ctx.db
				.query("requests")
				.withIndex("by_createdAt")
				.order("desc")
				.take(resultLimit * 2); // Get more to allow for filtering
		})();

		// Apply additional filters
		if (mediaType) {
			requests = requests.filter((r) => r.mediaType === mediaType);
		}

		// Enrich with user info
		const enrichedRequests = await Promise.all(
			requests.slice(0, resultLimit).map(async (request) => {
				const requester = await ctx.db.get(request.requestedBy);
				const processor = request.processedBy ? await ctx.db.get(request.processedBy) : null;
				const media = request.mediaId ? await ctx.db.get(request.mediaId) : null;

				return {
					...request,
					requester,
					processor,
					media,
				};
			}),
		);

		return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
	},
});

// Get a single request
export const get = query({
	args: { id: v.id("requests") },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.id);
		if (!request) return null;

		const requester = await ctx.db.get(request.requestedBy);
		const processor = request.processedBy ? await ctx.db.get(request.processedBy) : null;
		const media = request.mediaId ? await ctx.db.get(request.mediaId) : null;

		return {
			...request,
			requester,
			processor,
			media,
		};
	},
});

// Get requests for a specific user
export const getByUser = query({
	args: {
		userId: v.id("users"),
		status: v.optional(requestStatusValidator),
	},
	handler: async (ctx, args) => {
		let requests = await ctx.db
			.query("requests")
			.withIndex("by_requestedBy", (q) => q.eq("requestedBy", args.userId))
			.collect();

		const { status } = args;
		if (status) {
			requests = requests.filter((r) => r.status === status);
		}

		// Enrich with media info
		const enrichedRequests = await Promise.all(
			requests.map(async (request) => {
				const media = request.mediaId ? await ctx.db.get(request.mediaId) : null;
				return { ...request, media };
			}),
		);

		return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
	},
});

// Check if a user has already requested specific media
export const checkExisting = query({
	args: {
		tmdbId: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
		musicBrainzId: v.optional(v.string()),
		requestedBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		// Get all pending/approved requests from this user
		const userRequests = await ctx.db
			.query("requests")
			.withIndex("by_requestedBy", (q) => q.eq("requestedBy", args.requestedBy))
			.collect();

		// Filter to active requests (not denied or available)
		const activeRequests = userRequests.filter(
			(r) => r.status === "pending" || r.status === "approved",
		);

		// Check for matching external IDs
		for (const request of activeRequests) {
			if (args.tmdbId && request.tmdbId === args.tmdbId) {
				return request;
			}
			if (args.tvdbId && request.tvdbId === args.tvdbId) {
				return request;
			}
			if (args.musicBrainzId && request.musicBrainzId === args.musicBrainzId) {
				return request;
			}
		}

		return null;
	},
});

// Get pending requests count
export const getPendingCount = query({
	args: {},
	handler: async (ctx) => {
		const pending = await ctx.db
			.query("requests")
			.withIndex("by_status", (q) => q.eq("status", "pending"))
			.collect();

		return pending.length;
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Create a new request
export const create = mutation({
	args: {
		mediaType: mediaTypeValidator,
		title: v.string(),
		year: v.optional(v.number()),
		tmdbId: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
		musicBrainzId: v.optional(v.string()),
		mediaId: v.optional(v.id("media")),
		requestedSeasons: v.optional(v.array(v.number())),
		requestNote: v.optional(v.string()),
		requestedBy: v.id("users"),
	},
	handler: async (ctx, args) => {
		// Verify user exists
		const user = await ctx.db.get(args.requestedBy);
		if (!user) {
			throw new Error("User not found");
		}

		// Check if media already exists in library (if mediaId not provided)
		if (!args.mediaId && args.tmdbId) {
			const existing = await ctx.db
				.query("media")
				.withIndex("by_tmdb", (q) => q.eq("tmdbId", args.tmdbId))
				.first();

			if (existing) {
				// Media already in library
				// For TV, check if all requested seasons exist
				if (args.mediaType === "tv" && args.requestedSeasons?.length) {
					const seasons = await ctx.db
						.query("seasons")
						.withIndex("by_media", (q) => q.eq("mediaId", existing._id))
						.collect();

					const existingSeasons = new Set(seasons.map((s) => s.seasonNumber));
					const missingSeason = args.requestedSeasons.find((s) => !existingSeasons.has(s));

					if (!missingSeason) {
						throw new Error("All requested seasons already exist in library");
					}
				} else if (args.mediaType === "movie") {
					throw new Error("This movie already exists in your library");
				}
			}
		}

		// Check for duplicate pending requests
		const existingRequests = await ctx.db
			.query("requests")
			.withIndex("by_requestedBy", (q) => q.eq("requestedBy", args.requestedBy))
			.collect();

		const duplicateRequest = existingRequests.find(
			(r) =>
				(r.status === "pending" || r.status === "approved") &&
				((args.tmdbId && r.tmdbId === args.tmdbId) ||
					(args.tvdbId && r.tvdbId === args.tvdbId) ||
					(args.musicBrainzId && r.musicBrainzId === args.musicBrainzId)),
		);

		if (duplicateRequest) {
			throw new Error("You already have an active request for this media");
		}

		const now = Date.now();
		return await ctx.db.insert("requests", {
			mediaType: args.mediaType,
			mediaId: args.mediaId,
			tmdbId: args.tmdbId,
			tvdbId: args.tvdbId,
			musicBrainzId: args.musicBrainzId,
			title: args.title,
			year: args.year,
			requestedSeasons: args.requestedSeasons,
			status: "pending",
			requestedBy: args.requestedBy,
			requestNote: args.requestNote,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Approve a request
export const approve = mutation({
	args: {
		id: v.id("requests"),
		processedBy: v.id("users"),
		responseNote: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.id);
		if (!request) {
			throw new Error("Request not found");
		}

		if (request.status !== "pending") {
			throw new Error("Only pending requests can be approved");
		}

		const now = Date.now();
		await ctx.db.patch(args.id, {
			status: "approved",
			processedBy: args.processedBy,
			processedAt: now,
			responseNote: args.responseNote,
			updatedAt: now,
		});

		return await ctx.db.get(args.id);
	},
});

// Deny a request
export const deny = mutation({
	args: {
		id: v.id("requests"),
		processedBy: v.id("users"),
		responseNote: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.id);
		if (!request) {
			throw new Error("Request not found");
		}

		if (request.status !== "pending") {
			throw new Error("Only pending requests can be denied");
		}

		const now = Date.now();
		await ctx.db.patch(args.id, {
			status: "denied",
			processedBy: args.processedBy,
			processedAt: now,
			responseNote: args.responseNote,
			updatedAt: now,
		});

		return await ctx.db.get(args.id);
	},
});

// Mark request as available (media is now in library)
export const markAvailable = mutation({
	args: {
		id: v.id("requests"),
		mediaId: v.id("media"),
	},
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.id);
		if (!request) {
			throw new Error("Request not found");
		}

		// Verify media exists
		const media = await ctx.db.get(args.mediaId);
		if (!media) {
			throw new Error("Media not found");
		}

		const now = Date.now();
		await ctx.db.patch(args.id, {
			status: "available",
			mediaId: args.mediaId,
			updatedAt: now,
		});

		return await ctx.db.get(args.id);
	},
});

// Delete a request
export const remove = mutation({
	args: { id: v.id("requests") },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.id);
		if (!request) {
			throw new Error("Request not found");
		}

		await ctx.db.delete(args.id);
	},
});

// Update request note (user can update their own pending request)
export const updateNote = mutation({
	args: {
		id: v.id("requests"),
		requestNote: v.string(),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.id);
		if (!request) {
			throw new Error("Request not found");
		}

		if (request.requestedBy !== args.userId) {
			throw new Error("You can only update your own requests");
		}

		if (request.status !== "pending") {
			throw new Error("Can only update pending requests");
		}

		await ctx.db.patch(args.id, {
			requestNote: args.requestNote,
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
		const requests = await ctx.db.query("requests").collect();

		const byStatus: Record<string, number> = {};
		const byMediaType: Record<string, number> = {};

		for (const request of requests) {
			byStatus[request.status] = (byStatus[request.status] ?? 0) + 1;
			byMediaType[request.mediaType] = (byMediaType[request.mediaType] ?? 0) + 1;
		}

		// Get recent requests (last 30 days)
		const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
		const recentRequests = requests.filter((r) => r.createdAt >= thirtyDaysAgo);

		return {
			totalCount: requests.length,
			pendingCount: byStatus.pending ?? 0,
			approvedCount: byStatus.approved ?? 0,
			deniedCount: byStatus.denied ?? 0,
			availableCount: byStatus.available ?? 0,
			byMediaType,
			recentCount: recentRequests.length,
		};
	},
});
