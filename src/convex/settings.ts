import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Default settings values
const DEFAULT_SETTINGS = {
	instanceName: "idkarr",
	trashSyncEnabled: false,
};

// Internal helper to get or create settings singleton
export const getOrCreate = internalMutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query("settings").first();
		if (existing) {
			return existing;
		}

		// Create default settings
		const now = Date.now();
		const id = await ctx.db.insert("settings", {
			instanceName: DEFAULT_SETTINGS.instanceName,
			trashSyncEnabled: DEFAULT_SETTINGS.trashSyncEnabled,
			updatedAt: now,
		});

		return await ctx.db.get(id);
	},
});

// Get current settings (creates defaults if none exist)
export const get = query({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query("settings").first();
		if (existing) {
			return existing;
		}

		// Return default values for display (actual creation happens on first update)
		return {
			_id: null,
			_creationTime: null,
			instanceName: DEFAULT_SETTINGS.instanceName,
			defaultQualityProfileId: undefined,
			activeNamingPresetId: undefined,
			trashSyncEnabled: DEFAULT_SETTINGS.trashSyncEnabled,
			trashLastSync: undefined,
			updatedAt: Date.now(),
		};
	},
});

// Update settings (creates if doesn't exist)
export const update = mutation({
	args: {
		instanceName: v.optional(v.string()),
		defaultQualityProfileId: v.optional(v.id("qualityProfiles")),
		activeNamingPresetId: v.optional(v.id("namingPresets")),
		trashSyncEnabled: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const existing = await ctx.db.query("settings").first();

		if (existing) {
			// Update existing settings
			const updates: Record<string, unknown> = { updatedAt: now };

			if (args.instanceName !== undefined) {
				updates.instanceName = args.instanceName;
			}
			if (args.defaultQualityProfileId !== undefined) {
				updates.defaultQualityProfileId = args.defaultQualityProfileId;
			}
			if (args.activeNamingPresetId !== undefined) {
				updates.activeNamingPresetId = args.activeNamingPresetId;
			}
			if (args.trashSyncEnabled !== undefined) {
				updates.trashSyncEnabled = args.trashSyncEnabled;
			}

			await ctx.db.patch(existing._id, updates);
			return await ctx.db.get(existing._id);
		}

		// Create new settings with provided values
		const id = await ctx.db.insert("settings", {
			instanceName: args.instanceName ?? DEFAULT_SETTINGS.instanceName,
			defaultQualityProfileId: args.defaultQualityProfileId,
			activeNamingPresetId: args.activeNamingPresetId,
			trashSyncEnabled: args.trashSyncEnabled ?? DEFAULT_SETTINGS.trashSyncEnabled,
			updatedAt: now,
		});

		return await ctx.db.get(id);
	},
});

// Update TRaSH sync timestamp (internal use)
export const updateTrashSyncTime = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const existing = await ctx.db.query("settings").first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				trashLastSync: now,
				updatedAt: now,
			});
		}
	},
});
