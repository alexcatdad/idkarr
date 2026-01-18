import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Health status validator
const healthStatusValidator = v.union(v.literal("ok"), v.literal("warning"), v.literal("error"));

// ============================================================================
// Queries
// ============================================================================

// List all health checks
export const list = query({
	args: {},
	handler: async (ctx) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		return healthChecks.sort((a, b) => {
			// Sort by status (errors first, then warnings, then ok)
			const statusOrder = { error: 0, warning: 1, ok: 2 };
			return statusOrder[a.status] - statusOrder[b.status];
		});
	},
});

// Get a single health check
export const get = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		return healthChecks.find((h) => h.name === args.name) ?? null;
	},
});

// Get health checks by status
export const getByStatus = query({
	args: { status: healthStatusValidator },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("systemHealth")
			.withIndex("by_status", (q) => q.eq("status", args.status))
			.collect();
	},
});

// Get current issues (warnings and errors)
export const getIssues = query({
	args: {},
	handler: async (ctx) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		return healthChecks.filter((h) => h.status !== "ok");
	},
});

// Get overall system health status
export const getOverallStatus = query({
	args: {},
	handler: async (ctx) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();

		const errors = healthChecks.filter((h) => h.status === "error");
		const warnings = healthChecks.filter((h) => h.status === "warning");

		let overallStatus: "ok" | "warning" | "error" = "ok";
		if (errors.length > 0) {
			overallStatus = "error";
		} else if (warnings.length > 0) {
			overallStatus = "warning";
		}

		return {
			status: overallStatus,
			checksCount: healthChecks.length,
			errorsCount: errors.length,
			warningsCount: warnings.length,
			okCount: healthChecks.length - errors.length - warnings.length,
			issues: [...errors, ...warnings],
		};
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Update a health check (or create if doesn't exist)
export const update = mutation({
	args: {
		name: v.string(),
		status: healthStatusValidator,
		message: v.optional(v.string()),
		issueType: v.optional(v.string()),
		wikiUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		const existing = healthChecks.find((h) => h.name === args.name);

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				status: args.status,
				message: args.message,
				issueType: args.issueType,
				wikiUrl: args.wikiUrl,
				lastCheck: now,
			});
			return existing._id;
		} else {
			return await ctx.db.insert("systemHealth", {
				name: args.name,
				status: args.status,
				message: args.message,
				issueType: args.issueType,
				wikiUrl: args.wikiUrl,
				lastCheck: now,
			});
		}
	},
});

// Mark a check as OK
export const markOk = mutation({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		const existing = healthChecks.find((h) => h.name === args.name);

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				status: "ok",
				message: undefined,
				issueType: undefined,
				lastCheck: now,
			});
		} else {
			await ctx.db.insert("systemHealth", {
				name: args.name,
				status: "ok",
				lastCheck: now,
			});
		}
	},
});

// Mark a check as warning
export const markWarning = mutation({
	args: {
		name: v.string(),
		message: v.string(),
		issueType: v.optional(v.string()),
		wikiUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		const existing = healthChecks.find((h) => h.name === args.name);

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				status: "warning",
				message: args.message,
				issueType: args.issueType,
				wikiUrl: args.wikiUrl,
				lastCheck: now,
			});
		} else {
			await ctx.db.insert("systemHealth", {
				name: args.name,
				status: "warning",
				message: args.message,
				issueType: args.issueType,
				wikiUrl: args.wikiUrl,
				lastCheck: now,
			});
		}
	},
});

// Mark a check as error
export const markError = mutation({
	args: {
		name: v.string(),
		message: v.string(),
		issueType: v.optional(v.string()),
		wikiUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		const existing = healthChecks.find((h) => h.name === args.name);

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				status: "error",
				message: args.message,
				issueType: args.issueType,
				wikiUrl: args.wikiUrl,
				lastCheck: now,
			});
		} else {
			await ctx.db.insert("systemHealth", {
				name: args.name,
				status: "error",
				message: args.message,
				issueType: args.issueType,
				wikiUrl: args.wikiUrl,
				lastCheck: now,
			});
		}
	},
});

// Delete a health check
export const remove = mutation({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();
		const existing = healthChecks.find((h) => h.name === args.name);

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});

// Clear all health checks
export const clearAll = mutation({
	args: {},
	handler: async (ctx) => {
		const healthChecks = await ctx.db.query("systemHealth").collect();

		for (const check of healthChecks) {
			await ctx.db.delete(check._id);
		}

		return { removed: healthChecks.length };
	},
});

// ============================================================================
// Common Health Checks (predefined check names)
// ============================================================================

// Run all common health checks
export const runAllChecks = mutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const results: Array<{ name: string; status: "ok" | "warning" | "error"; message?: string }> =
			[];

		// Check for download clients
		const downloadClients = await ctx.db
			.query("downloadClients")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		if (downloadClients.length === 0) {
			results.push({
				name: "DownloadClient",
				status: "error",
				message: "No enabled download clients configured",
			});
		} else {
			results.push({ name: "DownloadClient", status: "ok" });
		}

		// Check for indexers
		const indexers = await ctx.db
			.query("indexers")
			.withIndex("by_enabled", (q) => q.eq("enabled", true))
			.collect();

		if (indexers.length === 0) {
			results.push({
				name: "Indexer",
				status: "warning",
				message: "No enabled indexers configured",
			});
		} else {
			// Check for disabled indexers (due to failures)
			const disabledIndexers = indexers.filter((i) => i.disabledUntil && i.disabledUntil > now);
			if (disabledIndexers.length > 0) {
				results.push({
					name: "Indexer",
					status: "warning",
					message: `${disabledIndexers.length} indexer(s) temporarily disabled due to failures`,
				});
			} else {
				results.push({ name: "Indexer", status: "ok" });
			}
		}

		// Check for root folders
		const rootFolders = await ctx.db.query("rootFolders").collect();
		if (rootFolders.length === 0) {
			results.push({
				name: "RootFolder",
				status: "warning",
				message: "No root folders configured",
			});
		} else {
			results.push({ name: "RootFolder", status: "ok" });
		}

		// Check for quality profiles
		const qualityProfiles = await ctx.db.query("qualityProfiles").collect();
		if (qualityProfiles.length === 0) {
			results.push({
				name: "QualityProfile",
				status: "warning",
				message: "No quality profiles configured",
			});
		} else {
			results.push({ name: "QualityProfile", status: "ok" });
		}

		// Check download queue for stuck items
		const queueItems = await ctx.db.query("downloadQueue").collect();
		const stuckItems = queueItems.filter(
			(item) => item.status === "downloading" && item.updatedAt < now - 24 * 60 * 60 * 1000, // No update in 24 hours
		);

		if (stuckItems.length > 0) {
			results.push({
				name: "DownloadQueue",
				status: "warning",
				message: `${stuckItems.length} download(s) may be stuck`,
			});
		} else {
			results.push({ name: "DownloadQueue", status: "ok" });
		}

		// Update all health check records
		for (const result of results) {
			const healthChecks = await ctx.db.query("systemHealth").collect();
			const existing = healthChecks.find((h) => h.name === result.name);

			if (existing) {
				await ctx.db.patch(existing._id, {
					status: result.status,
					message: result.message,
					lastCheck: now,
				});
			} else {
				await ctx.db.insert("systemHealth", {
					name: result.name,
					status: result.status,
					message: result.message,
					lastCheck: now,
				});
			}
		}

		return results;
	},
});
