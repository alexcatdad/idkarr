import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log level validator
const logLevelValidator = v.union(
	v.literal("info"),
	v.literal("warning"),
	v.literal("error"),
	v.literal("success"),
);

// ============================================================================
// Queries
// ============================================================================

// List activity log entries
export const list = query({
	args: {
		level: v.optional(logLevelValidator),
		eventType: v.optional(v.string()),
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 100;

		const { level, eventType, mediaId, userId } = args;

		const logs = await (async () => {
			if (level) {
				return ctx.db
					.query("activityLog")
					.withIndex("by_level", (q) => q.eq("level", level))
					.order("desc")
					.take(resultLimit * 2);
			}
			if (eventType) {
				return ctx.db
					.query("activityLog")
					.withIndex("by_eventType", (q) => q.eq("eventType", eventType))
					.order("desc")
					.take(resultLimit * 2);
			}
			if (mediaId) {
				return ctx.db
					.query("activityLog")
					.withIndex("by_media", (q) => q.eq("mediaId", mediaId))
					.order("desc")
					.take(resultLimit);
			}
			if (userId) {
				return ctx.db
					.query("activityLog")
					.withIndex("by_user", (q) => q.eq("userId", userId))
					.order("desc")
					.take(resultLimit);
			}
			return ctx.db.query("activityLog").withIndex("by_timestamp").order("desc").take(resultLimit);
		})();

		// Enrich with related entities
		const enrichedLogs = await Promise.all(
			logs.slice(0, resultLimit).map(async (log) => {
				const media = log.mediaId ? await ctx.db.get(log.mediaId) : null;
				const user = log.userId ? await ctx.db.get(log.userId) : null;

				return {
					...log,
					media,
					user,
					parsedData: log.data ? JSON.parse(log.data) : null,
				};
			}),
		);

		return enrichedLogs;
	},
});

// Get a single log entry
export const get = query({
	args: { id: v.id("activityLog") },
	handler: async (ctx, args) => {
		const log = await ctx.db.get(args.id);
		if (!log) return null;

		const media = log.mediaId ? await ctx.db.get(log.mediaId) : null;
		const user = log.userId ? await ctx.db.get(log.userId) : null;

		return {
			...log,
			media,
			user,
			parsedData: log.data ? JSON.parse(log.data) : null,
		};
	},
});

// Get recent errors and warnings
export const getIssues = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;

		const errors = await ctx.db
			.query("activityLog")
			.withIndex("by_level", (q) => q.eq("level", "error"))
			.order("desc")
			.take(resultLimit);

		const warnings = await ctx.db
			.query("activityLog")
			.withIndex("by_level", (q) => q.eq("level", "warning"))
			.order("desc")
			.take(resultLimit);

		const combined = [...errors, ...warnings]
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, resultLimit);

		return combined;
	},
});

// Get activity for a specific time range
export const getByTimeRange = query({
	args: {
		startTime: v.number(),
		endTime: v.number(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 500;

		const logs = await ctx.db
			.query("activityLog")
			.withIndex("by_timestamp")
			.order("desc")
			.collect();

		const filtered = logs.filter(
			(log) => log.timestamp >= args.startTime && log.timestamp <= args.endTime,
		);

		return filtered.slice(0, resultLimit);
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Log an activity
export const log = mutation({
	args: {
		eventType: v.string(),
		message: v.string(),
		level: logLevelValidator,
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		data: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("activityLog", {
			eventType: args.eventType,
			message: args.message,
			level: args.level,
			mediaId: args.mediaId,
			userId: args.userId,
			data: args.data,
			timestamp: Date.now(),
		});
	},
});

// Log info level
export const logInfo = mutation({
	args: {
		eventType: v.string(),
		message: v.string(),
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		data: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("activityLog", {
			eventType: args.eventType,
			message: args.message,
			level: "info",
			mediaId: args.mediaId,
			userId: args.userId,
			data: args.data,
			timestamp: Date.now(),
		});
	},
});

// Log success level
export const logSuccess = mutation({
	args: {
		eventType: v.string(),
		message: v.string(),
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		data: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("activityLog", {
			eventType: args.eventType,
			message: args.message,
			level: "success",
			mediaId: args.mediaId,
			userId: args.userId,
			data: args.data,
			timestamp: Date.now(),
		});
	},
});

// Log warning level
export const logWarning = mutation({
	args: {
		eventType: v.string(),
		message: v.string(),
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		data: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("activityLog", {
			eventType: args.eventType,
			message: args.message,
			level: "warning",
			mediaId: args.mediaId,
			userId: args.userId,
			data: args.data,
			timestamp: Date.now(),
		});
	},
});

// Log error level
export const logError = mutation({
	args: {
		eventType: v.string(),
		message: v.string(),
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		data: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("activityLog", {
			eventType: args.eventType,
			message: args.message,
			level: "error",
			mediaId: args.mediaId,
			userId: args.userId,
			data: args.data,
			timestamp: Date.now(),
		});
	},
});

// Clear old log entries
export const clearOld = mutation({
	args: {
		daysToKeep: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const daysToKeep = args.daysToKeep ?? 30;
		const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

		const logs = await ctx.db.query("activityLog").collect();
		const oldLogs = logs.filter((log) => log.timestamp < cutoffDate);

		for (const log of oldLogs) {
			await ctx.db.delete(log._id);
		}

		return { removed: oldLogs.length };
	},
});

// Clear all logs
export const clearAll = mutation({
	args: {},
	handler: async (ctx) => {
		const logs = await ctx.db.query("activityLog").collect();

		for (const log of logs) {
			await ctx.db.delete(log._id);
		}

		return { removed: logs.length };
	},
});

// ============================================================================
// Statistics
// ============================================================================

export const getStats = query({
	args: {
		days: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const daysToCheck = args.days ?? 7;
		const startDate = Date.now() - daysToCheck * 24 * 60 * 60 * 1000;

		const logs = await ctx.db.query("activityLog").collect();
		const recentLogs = logs.filter((log) => log.timestamp >= startDate);

		const byLevel: Record<string, number> = {};
		const byEventType: Record<string, number> = {};

		for (const log of recentLogs) {
			byLevel[log.level] = (byLevel[log.level] ?? 0) + 1;
			byEventType[log.eventType] = (byEventType[log.eventType] ?? 0) + 1;
		}

		return {
			totalCount: logs.length,
			recentCount: recentLogs.length,
			byLevel,
			byEventType,
			periodDays: daysToCheck,
		};
	},
});
