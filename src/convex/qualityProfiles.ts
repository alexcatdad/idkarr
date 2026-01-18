import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

// List all quality profiles
export const list = query({
	args: {},
	handler: async (ctx) => {
		const profiles = await ctx.db.query("qualityProfiles").collect();

		// Enrich with quality definition details
		const enrichedProfiles = await Promise.all(
			profiles.map(async (profile) => {
				const enrichedItems = await Promise.all(
					profile.items.map(async (item) => {
						const quality = await ctx.db.get(item.qualityId);
						return {
							...item,
							quality,
						};
					}),
				);

				return {
					...profile,
					items: enrichedItems,
				};
			}),
		);

		return enrichedProfiles;
	},
});

// Get a single quality profile by ID (includes format scores)
export const get = query({
	args: { id: v.id("qualityProfiles") },
	handler: async (ctx, args) => {
		const profile = await ctx.db.get(args.id);
		if (!profile) return null;

		// Enrich with quality definition details
		const enrichedItems = await Promise.all(
			profile.items.map(async (item) => {
				const quality = await ctx.db.get(item.qualityId);
				return {
					...item,
					quality,
				};
			}),
		);

		// Get cutoff quality details if set
		const cutoffQuality = profile.cutoffQualityId
			? await ctx.db.get(profile.cutoffQualityId)
			: null;

		// Get format scores for this profile
		const formatScores = await ctx.db
			.query("customFormatScores")
			.withIndex("by_profile", (q) => q.eq("profileId", args.id))
			.collect();

		// Enrich format scores with format details
		const enrichedScores = await Promise.all(
			formatScores.map(async (score) => {
				const format = await ctx.db.get(score.formatId);
				return {
					...score,
					format,
				};
			}),
		);

		return {
			...profile,
			items: enrichedItems,
			cutoffQuality,
			formatScores: enrichedScores,
		};
	},
});

// Get profile by name
export const getByName = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("qualityProfiles")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new quality profile
export const add = mutation({
	args: {
		name: v.string(),
		upgradeAllowed: v.optional(v.boolean()),
		cutoffQualityId: v.optional(v.id("qualityDefinitions")),
		items: v.array(
			v.object({
				qualityId: v.id("qualityDefinitions"),
				enabled: v.boolean(),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("qualityProfiles")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`A quality profile with name "${args.name}" already exists`);
		}

		// Validate all quality IDs exist
		for (const item of args.items) {
			const quality = await ctx.db.get(item.qualityId);
			if (!quality) {
				throw new Error(`Quality definition ${item.qualityId} not found`);
			}
		}

		// Validate cutoff quality ID if provided
		if (args.cutoffQualityId) {
			const cutoff = await ctx.db.get(args.cutoffQualityId);
			if (!cutoff) {
				throw new Error("Cutoff quality definition not found");
			}
		}

		const now = Date.now();
		return await ctx.db.insert("qualityProfiles", {
			name: args.name,
			upgradeAllowed: args.upgradeAllowed ?? true,
			cutoffQualityId: args.cutoffQualityId,
			items: args.items,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an existing quality profile
export const update = mutation({
	args: {
		id: v.id("qualityProfiles"),
		name: v.optional(v.string()),
		upgradeAllowed: v.optional(v.boolean()),
		cutoffQualityId: v.optional(v.id("qualityDefinitions")),
		items: v.optional(
			v.array(
				v.object({
					qualityId: v.id("qualityDefinitions"),
					enabled: v.boolean(),
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db.get(args.id);
		if (!profile) {
			throw new Error("Quality profile not found");
		}

		// Check for duplicate name if changing
		const { name } = args;
		if (name !== undefined && name !== profile.name) {
			const existing = await ctx.db
				.query("qualityProfiles")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`A quality profile with name "${name}" already exists`);
			}
		}

		// Validate items if provided
		if (args.items) {
			for (const item of args.items) {
				const quality = await ctx.db.get(item.qualityId);
				if (!quality) {
					throw new Error(`Quality definition ${item.qualityId} not found`);
				}
			}
		}

		// Validate cutoff quality ID if provided
		if (args.cutoffQualityId) {
			const cutoff = await ctx.db.get(args.cutoffQualityId);
			if (!cutoff) {
				throw new Error("Cutoff quality definition not found");
			}
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (args.name !== undefined) updates.name = args.name;
		if (args.upgradeAllowed !== undefined) updates.upgradeAllowed = args.upgradeAllowed;
		if (args.cutoffQualityId !== undefined) updates.cutoffQualityId = args.cutoffQualityId;
		if (args.items !== undefined) updates.items = args.items;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Remove a quality profile
export const remove = mutation({
	args: { id: v.id("qualityProfiles") },
	handler: async (ctx, args) => {
		const profile = await ctx.db.get(args.id);
		if (!profile) {
			throw new Error("Quality profile not found");
		}

		// Check if any media items are using this profile
		// TODO: Add this check once media table has qualityProfileId field
		// const mediaUsingProfile = await ctx.db
		// 	.query("media")
		// 	.withIndex("by_qualityProfile", q => q.eq("qualityProfileId", args.id))
		// 	.first();
		// if (mediaUsingProfile) {
		// 	throw new Error("Cannot delete profile that is in use by media items");
		// }

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Item Management
// ============================================================================

// Enable or disable a quality within a profile
export const setQualityEnabled = mutation({
	args: {
		profileId: v.id("qualityProfiles"),
		qualityId: v.id("qualityDefinitions"),
		enabled: v.boolean(),
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db.get(args.profileId);
		if (!profile) {
			throw new Error("Quality profile not found");
		}

		const itemIndex = profile.items.findIndex((item) => item.qualityId === args.qualityId);
		if (itemIndex === -1) {
			throw new Error("Quality not found in profile");
		}

		const updatedItems = [...profile.items];
		updatedItems[itemIndex] = { ...updatedItems[itemIndex], enabled: args.enabled };

		const now = Date.now();
		await ctx.db.patch(args.profileId, {
			items: updatedItems,
			updatedAt: now,
		});

		return await ctx.db.get(args.profileId);
	},
});

// Reorder qualities within a profile
export const reorderQualities = mutation({
	args: {
		profileId: v.id("qualityProfiles"),
		qualityIds: v.array(v.id("qualityDefinitions")),
	},
	handler: async (ctx, args) => {
		const profile = await ctx.db.get(args.profileId);
		if (!profile) {
			throw new Error("Quality profile not found");
		}

		// Create a map of existing items
		const itemMap = new Map(profile.items.map((item) => [item.qualityId, item]));

		// Validate all quality IDs exist in the profile
		for (const qualityId of args.qualityIds) {
			if (!itemMap.has(qualityId)) {
				throw new Error(`Quality ${qualityId} not found in profile`);
			}
		}

		// Reorder items based on the new order
		const reorderedItems = args.qualityIds.map((qualityId) => {
			const item = itemMap.get(qualityId);
			if (!item) throw new Error(`Quality ${qualityId} not found`);
			return item;
		});

		const now = Date.now();
		await ctx.db.patch(args.profileId, {
			items: reorderedItems,
			updatedAt: now,
		});

		return await ctx.db.get(args.profileId);
	},
});

// ============================================================================
// Internal Functions
// ============================================================================

// Seed default quality profiles
export const seedDefaults = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Check if any profiles exist
		const existing = await ctx.db.query("qualityProfiles").first();
		if (existing) {
			return; // Already seeded
		}

		// Get all quality definitions
		const definitions = await ctx.db.query("qualityDefinitions").withIndex("by_weight").collect();
		if (definitions.length === 0) {
			throw new Error("Quality definitions must be seeded before profiles");
		}

		// Helper to find definition by name
		const findDef = (name: string) => definitions.find((d) => d.name === name);

		// Create default profiles
		const now = Date.now();

		// 1. Any - accepts all qualities
		await ctx.db.insert("qualityProfiles", {
			name: "Any",
			upgradeAllowed: true,
			items: definitions.map((def) => ({
				qualityId: def._id,
				enabled: true,
			})),
			createdAt: now,
			updatedAt: now,
		});

		// 2. SD - Standard definition only
		const sdDefinitions = definitions.filter(
			(d) => d.resolution === "r480p" || d.resolution === "r576p" || d.resolution === "unknown",
		);
		const dvdDef = findDef("DVD");
		await ctx.db.insert("qualityProfiles", {
			name: "SD",
			upgradeAllowed: true,
			cutoffQualityId: dvdDef?._id,
			items: definitions.map((def) => ({
				qualityId: def._id,
				enabled: sdDefinitions.some((sd) => sd._id === def._id),
			})),
			createdAt: now,
			updatedAt: now,
		});

		// 3. HD-720p
		const hd720Definitions = definitions.filter((d) => d.resolution === "r720p");
		const webdl720Def = findDef("WEB-DL 720p");
		await ctx.db.insert("qualityProfiles", {
			name: "HD-720p",
			upgradeAllowed: true,
			cutoffQualityId: webdl720Def?._id,
			items: definitions.map((def) => ({
				qualityId: def._id,
				enabled: hd720Definitions.some((hd) => hd._id === def._id),
			})),
			createdAt: now,
			updatedAt: now,
		});

		// 4. HD-1080p
		const hd1080Definitions = definitions.filter((d) => d.resolution === "r1080p");
		const webdl1080Def = findDef("WEB-DL 1080p");
		await ctx.db.insert("qualityProfiles", {
			name: "HD-1080p",
			upgradeAllowed: true,
			cutoffQualityId: webdl1080Def?._id,
			items: definitions.map((def) => ({
				qualityId: def._id,
				enabled: hd1080Definitions.some((hd) => hd._id === def._id),
			})),
			createdAt: now,
			updatedAt: now,
		});

		// 5. Ultra-HD (2160p/4K)
		const uhdDefinitions = definitions.filter((d) => d.resolution === "r2160p");
		const webdl2160Def = findDef("WEB-DL 2160p");
		await ctx.db.insert("qualityProfiles", {
			name: "Ultra-HD",
			upgradeAllowed: true,
			cutoffQualityId: webdl2160Def?._id,
			items: definitions.map((def) => ({
				qualityId: def._id,
				enabled: uhdDefinitions.some((uhd) => uhd._id === def._id),
			})),
			createdAt: now,
			updatedAt: now,
		});
	},
});

// ============================================================================
// Custom Format Score Management
// ============================================================================

// Get all format scores for a profile
export const getFormatScores = query({
	args: { profileId: v.id("qualityProfiles") },
	handler: async (ctx, args) => {
		const scores = await ctx.db
			.query("customFormatScores")
			.withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
			.collect();

		// Enrich with format details
		const enrichedScores = await Promise.all(
			scores.map(async (score) => {
				const format = await ctx.db.get(score.formatId);
				return {
					...score,
					format,
				};
			}),
		);

		return enrichedScores;
	},
});

// Set (add or update) a format score for a profile
export const setFormatScore = mutation({
	args: {
		profileId: v.id("qualityProfiles"),
		formatId: v.id("customFormats"),
		score: v.number(),
	},
	handler: async (ctx, args) => {
		// Validate profile exists
		const profile = await ctx.db.get(args.profileId);
		if (!profile) {
			throw new Error("Quality profile not found");
		}

		// Validate format exists
		const format = await ctx.db.get(args.formatId);
		if (!format) {
			throw new Error("Custom format not found");
		}

		const now = Date.now();

		// Check if score already exists
		const existing = await ctx.db
			.query("customFormatScores")
			.withIndex("by_profile_format", (q) =>
				q.eq("profileId", args.profileId).eq("formatId", args.formatId),
			)
			.first();

		if (existing) {
			// Update existing score
			await ctx.db.patch(existing._id, {
				score: args.score,
				updatedAt: now,
			});
			return await ctx.db.get(existing._id);
		}

		// Create new score
		const id = await ctx.db.insert("customFormatScores", {
			profileId: args.profileId,
			formatId: args.formatId,
			score: args.score,
			createdAt: now,
			updatedAt: now,
		});

		return await ctx.db.get(id);
	},
});

// Remove a format score from a profile
export const removeFormatScore = mutation({
	args: {
		profileId: v.id("qualityProfiles"),
		formatId: v.id("customFormats"),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("customFormatScores")
			.withIndex("by_profile_format", (q) =>
				q.eq("profileId", args.profileId).eq("formatId", args.formatId),
			)
			.first();

		if (!existing) {
			throw new Error("Format score not found");
		}

		await ctx.db.delete(existing._id);
	},
});

// Bulk set format scores for a profile
export const bulkSetFormatScores = mutation({
	args: {
		profileId: v.id("qualityProfiles"),
		scores: v.array(
			v.object({
				formatId: v.id("customFormats"),
				score: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Validate profile exists
		const profile = await ctx.db.get(args.profileId);
		if (!profile) {
			throw new Error("Quality profile not found");
		}

		const now = Date.now();

		for (const { formatId, score } of args.scores) {
			// Validate format exists
			const format = await ctx.db.get(formatId);
			if (!format) {
				throw new Error(`Custom format ${formatId} not found`);
			}

			// Check if score already exists
			const existing = await ctx.db
				.query("customFormatScores")
				.withIndex("by_profile_format", (q) =>
					q.eq("profileId", args.profileId).eq("formatId", formatId),
				)
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, {
					score,
					updatedAt: now,
				});
			} else {
				await ctx.db.insert("customFormatScores", {
					profileId: args.profileId,
					formatId,
					score,
					createdAt: now,
					updatedAt: now,
				});
			}
		}
	},
});

// Calculate total format score for a release against a profile
export const calculateFormatScore = query({
	args: {
		profileId: v.id("qualityProfiles"),
		matchedFormatIds: v.array(v.id("customFormats")),
	},
	handler: async (ctx, args) => {
		const scores = await ctx.db
			.query("customFormatScores")
			.withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
			.collect();

		let totalScore = 0;
		const breakdown: Array<{ formatId: string; formatName: string; score: number }> = [];

		for (const formatId of args.matchedFormatIds) {
			const scoreRecord = scores.find((s) => s.formatId === formatId);
			if (scoreRecord) {
				const format = await ctx.db.get(formatId);
				totalScore += scoreRecord.score;
				breakdown.push({
					formatId,
					formatName: format?.name ?? "Unknown",
					score: scoreRecord.score,
				});
			}
		}

		return {
			totalScore,
			breakdown,
		};
	},
});
