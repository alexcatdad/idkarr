import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { indexerProtocolValidator } from "./schema";

// Download status validator
const downloadStatusValidator = v.union(
	v.literal("queued"),
	v.literal("downloading"),
	v.literal("paused"),
	v.literal("completed"),
	v.literal("failed"),
	v.literal("warning"),
	v.literal("importing"),
);

// History event type validator
const historyEventTypeValidator = v.union(
	v.literal("grabbed"),
	v.literal("downloadCompleted"),
	v.literal("importCompleted"),
	v.literal("downloadFailed"),
	v.literal("importFailed"),
	v.literal("deleted"),
);

// ============================================================================
// Queue Queries
// ============================================================================

// List all items in the queue
export const list = query({
	args: {
		status: v.optional(downloadStatusValidator),
		mediaId: v.optional(v.id("media")),
	},
	handler: async (ctx, args) => {
		const { mediaId, status } = args;
		let queue = mediaId
			? await ctx.db
					.query("downloadQueue")
					.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
					.collect()
			: await ctx.db.query("downloadQueue").collect();

		if (status !== undefined) {
			queue = queue.filter((item) => item.status === status);
		}

		// Enrich with media, indexer, and client info
		const enrichedQueue = await Promise.all(
			queue.map(async (item) => {
				const media = await ctx.db.get(item.mediaId);
				const indexer = item.indexerId ? await ctx.db.get(item.indexerId) : null;
				const downloadClient = item.downloadClientId
					? await ctx.db.get(item.downloadClientId)
					: null;
				const episode = item.episodeId ? await ctx.db.get(item.episodeId) : null;
				const album = item.albumId ? await ctx.db.get(item.albumId) : null;

				return {
					...item,
					media,
					episode,
					album,
					indexer,
					downloadClient,
				};
			}),
		);

		return enrichedQueue.sort((a, b) => b.addedAt - a.addedAt);
	},
});

// Get a single queue item
export const get = query({
	args: { id: v.id("downloadQueue") },
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) return null;

		const media = await ctx.db.get(item.mediaId);
		const indexer = item.indexerId ? await ctx.db.get(item.indexerId) : null;
		const downloadClient = item.downloadClientId ? await ctx.db.get(item.downloadClientId) : null;
		const episode = item.episodeId ? await ctx.db.get(item.episodeId) : null;
		const album = item.albumId ? await ctx.db.get(item.albumId) : null;

		return {
			...item,
			media,
			episode,
			album,
			indexer,
			downloadClient,
		};
	},
});

// Get active downloads (downloading, queued, importing)
export const getActive = query({
	args: {},
	handler: async (ctx) => {
		const activeStatuses = ["queued", "downloading", "importing"];
		const queue = await ctx.db.query("downloadQueue").collect();
		const activeItems = queue.filter((item) => activeStatuses.includes(item.status));

		const enrichedItems = await Promise.all(
			activeItems.map(async (item) => {
				const media = await ctx.db.get(item.mediaId);
				return { ...item, media };
			}),
		);

		return enrichedItems.sort((a, b) => a.addedAt - b.addedAt);
	},
});

// Get queue statistics
export const getQueueStats = query({
	args: {},
	handler: async (ctx) => {
		const queue = await ctx.db.query("downloadQueue").collect();

		const byStatus: Record<string, number> = {};
		let totalSize = 0;
		let downloadedSize = 0;

		for (const item of queue) {
			byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
			totalSize += item.size;
			downloadedSize += item.downloadedSize ?? 0;
		}

		return {
			totalCount: queue.length,
			byStatus,
			totalSizeBytes: totalSize,
			downloadedSizeBytes: downloadedSize,
			overallProgress: totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0,
		};
	},
});

// ============================================================================
// Queue Mutations
// ============================================================================

// Add to download queue
export const add = mutation({
	args: {
		mediaId: v.id("media"),
		episodeId: v.optional(v.id("episodes")),
		albumId: v.optional(v.id("albums")),
		title: v.string(),
		size: v.number(),
		protocol: indexerProtocolValidator,
		indexerId: v.optional(v.id("indexers")),
		downloadClientId: v.optional(v.id("downloadClients")),
		qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
		customFormatScore: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Verify media exists
		const media = await ctx.db.get(args.mediaId);
		if (!media) {
			throw new Error("Media not found");
		}

		const now = Date.now();
		const queueId = await ctx.db.insert("downloadQueue", {
			mediaId: args.mediaId,
			episodeId: args.episodeId,
			albumId: args.albumId,
			title: args.title,
			size: args.size,
			protocol: args.protocol,
			status: "queued",
			progress: 0,
			indexerId: args.indexerId,
			downloadClientId: args.downloadClientId,
			qualityDefinitionId: args.qualityDefinitionId,
			customFormatScore: args.customFormatScore,
			addedAt: now,
			createdAt: now,
			updatedAt: now,
		});

		// Record history event
		await ctx.db.insert("downloadHistory", {
			mediaId: args.mediaId,
			episodeId: args.episodeId,
			albumId: args.albumId,
			title: args.title,
			size: args.size,
			protocol: args.protocol,
			eventType: "grabbed",
			qualityDefinitionId: args.qualityDefinitionId,
			customFormatScore: args.customFormatScore,
			indexerId: args.indexerId,
			downloadClientId: args.downloadClientId,
			date: now,
			createdAt: now,
		});

		return queueId;
	},
});

// Update download progress
export const updateProgress = mutation({
	args: {
		id: v.id("downloadQueue"),
		progress: v.number(),
		downloadedSize: v.optional(v.number()),
		eta: v.optional(v.number()),
		status: v.optional(downloadStatusValidator),
		downloadId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		const updates: Record<string, unknown> = {
			progress: args.progress,
			updatedAt: Date.now(),
		};

		if (args.downloadedSize !== undefined) updates.downloadedSize = args.downloadedSize;
		if (args.eta !== undefined) updates.eta = args.eta;
		if (args.downloadId !== undefined) updates.downloadId = args.downloadId;

		if (args.status !== undefined) {
			updates.status = args.status;
			if (args.status === "downloading" && !item.startedAt) {
				updates.startedAt = Date.now();
			}
		}

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Update status
export const updateStatus = mutation({
	args: {
		id: v.id("downloadQueue"),
		status: downloadStatusValidator,
		errorMessage: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		const updates: Record<string, unknown> = {
			status: args.status,
			updatedAt: Date.now(),
		};

		if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

		if (args.status === "downloading" && !item.startedAt) {
			updates.startedAt = Date.now();
		} else if (args.status === "completed" || args.status === "failed") {
			updates.completedAt = Date.now();
		}

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Mark as completed and record history
export const markCompleted = mutation({
	args: {
		id: v.id("downloadQueue"),
		mediaFileId: v.optional(v.id("mediaFiles")),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		const now = Date.now();

		// Record completion history
		await ctx.db.insert("downloadHistory", {
			mediaId: item.mediaId,
			episodeId: item.episodeId,
			albumId: item.albumId,
			title: item.title,
			size: item.size,
			protocol: item.protocol,
			eventType: args.mediaFileId ? "importCompleted" : "downloadCompleted",
			qualityDefinitionId: item.qualityDefinitionId,
			customFormatScore: item.customFormatScore,
			indexerId: item.indexerId,
			downloadClientId: item.downloadClientId,
			mediaFileId: args.mediaFileId,
			date: now,
			createdAt: now,
		});

		// Remove from queue
		await ctx.db.delete(args.id);
	},
});

// Mark as failed and record history
export const markFailed = mutation({
	args: {
		id: v.id("downloadQueue"),
		errorMessage: v.string(),
		importFailed: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		const now = Date.now();

		// Record failure history
		await ctx.db.insert("downloadHistory", {
			mediaId: item.mediaId,
			episodeId: item.episodeId,
			albumId: item.albumId,
			title: item.title,
			size: item.size,
			protocol: item.protocol,
			eventType: args.importFailed ? "importFailed" : "downloadFailed",
			qualityDefinitionId: item.qualityDefinitionId,
			customFormatScore: item.customFormatScore,
			indexerId: item.indexerId,
			downloadClientId: item.downloadClientId,
			data: JSON.stringify({ error: args.errorMessage }),
			date: now,
			createdAt: now,
		});

		// Update status to failed
		await ctx.db.patch(args.id, {
			status: "failed",
			errorMessage: args.errorMessage,
			completedAt: now,
			updatedAt: now,
		});
	},
});

// Remove from queue
export const remove = mutation({
	args: {
		id: v.id("downloadQueue"),
		recordDeleted: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		// Optionally record deletion in history
		if (args.recordDeleted) {
			const now = Date.now();
			await ctx.db.insert("downloadHistory", {
				mediaId: item.mediaId,
				episodeId: item.episodeId,
				albumId: item.albumId,
				title: item.title,
				size: item.size,
				protocol: item.protocol,
				eventType: "deleted",
				qualityDefinitionId: item.qualityDefinitionId,
				customFormatScore: item.customFormatScore,
				indexerId: item.indexerId,
				downloadClientId: item.downloadClientId,
				date: now,
				createdAt: now,
			});
		}

		await ctx.db.delete(args.id);
	},
});

// Pause a download
export const pause = mutation({
	args: { id: v.id("downloadQueue") },
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		if (item.status !== "downloading" && item.status !== "queued") {
			throw new Error("Can only pause downloading or queued items");
		}

		await ctx.db.patch(args.id, {
			status: "paused",
			updatedAt: Date.now(),
		});
	},
});

// Resume a download
export const resume = mutation({
	args: { id: v.id("downloadQueue") },
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		if (item.status !== "paused") {
			throw new Error("Can only resume paused items");
		}

		await ctx.db.patch(args.id, {
			status: item.startedAt ? "downloading" : "queued",
			updatedAt: Date.now(),
		});
	},
});

// Retry a failed download
export const retry = mutation({
	args: { id: v.id("downloadQueue") },
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.id);
		if (!item) {
			throw new Error("Queue item not found");
		}

		if (item.status !== "failed" && item.status !== "warning") {
			throw new Error("Can only retry failed or warning items");
		}

		await ctx.db.patch(args.id, {
			status: "queued",
			progress: 0,
			downloadedSize: undefined,
			eta: undefined,
			errorMessage: undefined,
			startedAt: undefined,
			completedAt: undefined,
			updatedAt: Date.now(),
		});
	},
});

// Clear completed items from queue
export const clearCompleted = mutation({
	args: {},
	handler: async (ctx) => {
		const completedItems = await ctx.db
			.query("downloadQueue")
			.withIndex("by_status", (q) => q.eq("status", "completed"))
			.collect();

		for (const item of completedItems) {
			await ctx.db.delete(item._id);
		}

		return { removed: completedItems.length };
	},
});

// ============================================================================
// History Queries
// ============================================================================

// Get download history
export const getHistory = query({
	args: {
		mediaId: v.optional(v.id("media")),
		eventType: v.optional(historyEventTypeValidator),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;

		const { mediaId, eventType } = args;

		let history = await (async () => {
			if (mediaId) {
				return ctx.db
					.query("downloadHistory")
					.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
					.collect();
			}
			if (eventType) {
				return ctx.db
					.query("downloadHistory")
					.withIndex("by_eventType", (q) => q.eq("eventType", eventType))
					.collect();
			}
			return ctx.db.query("downloadHistory").withIndex("by_date").order("desc").take(resultLimit);
		})();

		// Apply filters
		if (mediaId && eventType) {
			history = history.filter((h) => h.eventType === eventType);
		}

		// Enrich with media info
		const enrichedHistory = await Promise.all(
			history.slice(0, resultLimit).map(async (item) => {
				const media = await ctx.db.get(item.mediaId);
				return { ...item, media };
			}),
		);

		return enrichedHistory.sort((a, b) => b.date - a.date);
	},
});

// Get history statistics
export const getHistoryStats = query({
	args: {
		days: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const daysToCheck = args.days ?? 30;
		const startDate = Date.now() - daysToCheck * 24 * 60 * 60 * 1000;

		const history = await ctx.db.query("downloadHistory").withIndex("by_date").collect();

		const recentHistory = history.filter((h) => h.date >= startDate);

		const byEventType: Record<string, number> = {};
		let totalSize = 0;

		for (const item of recentHistory) {
			byEventType[item.eventType] = (byEventType[item.eventType] ?? 0) + 1;
			if (item.eventType === "importCompleted") {
				totalSize += item.size;
			}
		}

		return {
			totalEvents: recentHistory.length,
			byEventType,
			totalImportedSizeBytes: totalSize,
			periodDays: daysToCheck,
		};
	},
});

// Clear old history
export const clearOldHistory = mutation({
	args: {
		daysToKeep: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const daysToKeep = args.daysToKeep ?? 90;
		const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

		const history = await ctx.db.query("downloadHistory").collect();
		const oldHistory = history.filter((h) => h.date < cutoffDate);

		for (const item of oldHistory) {
			await ctx.db.delete(item._id);
		}

		return { removed: oldHistory.length };
	},
});
