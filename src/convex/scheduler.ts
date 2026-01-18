import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

// ============================================================================
// Scheduled Tasks
// ============================================================================

// Sync TRaSH Guides formats (called by cron job)
export const syncTrashGuides = internalAction({
	args: {},
	handler: async (ctx) => {
		// Check if sync is enabled
		const settings = await ctx.runQuery(api.settings.get, {});
		if (!settings?.trashSyncEnabled) {
			console.log("TRaSH Guides sync is disabled, skipping...");
			return { skipped: true, reason: "Sync disabled in settings" };
		}

		console.log("Starting TRaSH Guides sync...");

		const results = {
			movie: { success: false, importedCount: 0, error: null as string | null },
			tv: { success: false, importedCount: 0, error: null as string | null },
		};

		// Sync movie formats
		try {
			const movieResult = await ctx.runAction(api.trashGuides.sync, {
				mediaType: "movie",
			});
			results.movie = {
				success: movieResult.success,
				importedCount: movieResult.importedCount ?? 0,
				error: movieResult.error ?? null,
			};
		} catch (error) {
			results.movie.error = error instanceof Error ? error.message : "Unknown error";
		}

		// Sync TV formats
		try {
			const tvResult = await ctx.runAction(api.trashGuides.sync, {
				mediaType: "tv",
			});
			results.tv = {
				success: tvResult.success,
				importedCount: tvResult.importedCount ?? 0,
				error: tvResult.error ?? null,
			};
		} catch (error) {
			results.tv.error = error instanceof Error ? error.message : "Unknown error";
		}

		// Log sync completion
		await ctx.runMutation(internal.scheduler.logSyncCompletion, {
			movieCount: results.movie.importedCount,
			tvCount: results.tv.importedCount,
			movieError: results.movie.error,
			tvError: results.tv.error,
		});

		console.log("TRaSH Guides sync completed:", results);
		return results;
	},
});

// Log sync completion (internal mutation)
export const logSyncCompletion = internalMutation({
	args: {
		movieCount: v.number(),
		tvCount: v.number(),
		movieError: v.union(v.string(), v.null()),
		tvError: v.union(v.string(), v.null()),
	},
	handler: async (ctx, _args) => {
		// For now, just update the settings timestamp
		// In the future, this could log to a syncHistory table
		const settings = await ctx.db.query("settings").first();
		if (settings) {
			await ctx.db.patch(settings._id, {
				trashLastSync: Date.now(),
				updatedAt: Date.now(),
			});
		}
	},
});
