import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { customFormatConditionTypeValidator } from "./schema";

// ============================================================================
// Types
// ============================================================================

// Condition validator for internal use
const conditionValidator = v.object({
	type: customFormatConditionTypeValidator,
	pattern: v.string(),
	negate: v.boolean(),
	required: v.boolean(),
});

// TRaSH format from their API/JSON
type TrashFormatSpec = {
	trash_id: string;
	name: string;
	includeCustomFormatWhenRenaming: boolean;
	specifications: Array<{
		name: string;
		implementation: string;
		negate: boolean;
		required: boolean;
		fields: {
			value: string;
		};
	}>;
};

// ============================================================================
// Queries
// ============================================================================

// List all imported TRaSH formats
export const list = query({
	args: {
		mediaType: v.optional(v.union(v.literal("movie"), v.literal("tv"), v.literal("anime"))),
	},
	handler: async (ctx, args) => {
		const { mediaType } = args;
		if (mediaType) {
			return await ctx.db
				.query("trashGuideFormats")
				.withIndex("by_mediaType", (q) => q.eq("mediaType", mediaType))
				.collect();
		}
		return await ctx.db.query("trashGuideFormats").collect();
	},
});

// List formats by category
export const listByCategory = query({
	args: { category: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("trashGuideFormats")
			.withIndex("by_category", (q) => q.eq("category", args.category))
			.collect();
	},
});

// Get a single TRaSH format by ID
export const get = query({
	args: { id: v.id("trashGuideFormats") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Get format by TRaSH ID
export const getByTrashId = query({
	args: { trashId: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("trashGuideFormats")
			.withIndex("by_trashId", (q) => q.eq("trashId", args.trashId))
			.first();
	},
});

// Get all available categories
export const getCategories = query({
	args: {
		mediaType: v.optional(v.union(v.literal("movie"), v.literal("tv"), v.literal("anime"))),
	},
	handler: async (ctx, args) => {
		const { mediaType } = args;
		const formats = mediaType
			? await ctx.db
					.query("trashGuideFormats")
					.withIndex("by_mediaType", (q) => q.eq("mediaType", mediaType))
					.collect()
			: await ctx.db.query("trashGuideFormats").collect();

		// Extract unique categories with counts
		const categoryMap = new Map<string, number>();
		for (const format of formats) {
			const count = categoryMap.get(format.category) ?? 0;
			categoryMap.set(format.category, count + 1);
		}

		return Array.from(categoryMap.entries())
			.map(([category, count]) => ({ category, count }))
			.sort((a, b) => a.category.localeCompare(b.category));
	},
});

// Get sync status
export const getSyncStatus = query({
	args: {},
	handler: async (ctx) => {
		const settings = await ctx.db.query("settings").first();
		const formatCount = await ctx.db.query("trashGuideFormats").collect();

		return {
			enabled: settings?.trashSyncEnabled ?? false,
			lastSync: settings?.trashLastSync,
			formatCount: formatCount.length,
		};
	},
});

// ============================================================================
// Internal Mutations (called by actions)
// ============================================================================

// Upsert a TRaSH format
export const upsertFormat = internalMutation({
	args: {
		trashId: v.string(),
		name: v.string(),
		category: v.string(),
		mediaType: v.union(v.literal("movie"), v.literal("tv"), v.literal("anime")),
		conditions: v.array(conditionValidator),
		includeWhenRenaming: v.boolean(),
		recommendedScore: v.number(),
		trashGuideVersion: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		const existing = await ctx.db
			.query("trashGuideFormats")
			.withIndex("by_trashId", (q) => q.eq("trashId", args.trashId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				name: args.name,
				category: args.category,
				mediaType: args.mediaType,
				conditions: args.conditions,
				includeWhenRenaming: args.includeWhenRenaming,
				recommendedScore: args.recommendedScore,
				trashGuideVersion: args.trashGuideVersion,
				lastSyncAt: now,
			});
			return existing._id;
		}

		return await ctx.db.insert("trashGuideFormats", {
			trashId: args.trashId,
			name: args.name,
			category: args.category,
			mediaType: args.mediaType,
			conditions: args.conditions,
			includeWhenRenaming: args.includeWhenRenaming,
			recommendedScore: args.recommendedScore,
			trashGuideVersion: args.trashGuideVersion,
			lastSyncAt: now,
		});
	},
});

// Update sync timestamp in settings
export const updateSyncTimestamp = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const settings = await ctx.db.query("settings").first();

		if (settings) {
			await ctx.db.patch(settings._id, {
				trashLastSync: now,
				updatedAt: now,
			});
		}
	},
});

// ============================================================================
// Actions (can make HTTP requests)
// ============================================================================

// Sync formats from TRaSH Guides GitHub
export const sync = action({
	args: {
		mediaType: v.union(v.literal("movie"), v.literal("tv"), v.literal("anime")),
	},
	handler: async (ctx, args) => {
		// TRaSH Guides JSON URLs
		const urls: Record<string, string> = {
			movie:
				"https://raw.githubusercontent.com/TRaSH-Guides/Guides/master/docs/json/radarr/cf/cf.json",
			tv: "https://raw.githubusercontent.com/TRaSH-Guides/Guides/master/docs/json/sonarr/cf/cf.json",
			anime:
				"https://raw.githubusercontent.com/TRaSH-Guides/Guides/master/docs/json/sonarr/cf/cf.json", // Anime uses Sonarr formats
		};

		const url = urls[args.mediaType];
		if (!url) {
			throw new Error(`Unknown media type: ${args.mediaType}`);
		}

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch TRaSH formats: ${response.status}`);
			}

			const data = await response.json();
			let importedCount = 0;

			// Process each format
			for (const format of data as TrashFormatSpec[]) {
				const conditions = parseTrashSpecifications(format.specifications);
				const category = categorizeFormat(format.name);

				await ctx.runMutation(internal.trashGuides.upsertFormat, {
					trashId: format.trash_id,
					name: format.name,
					category,
					mediaType: args.mediaType,
					conditions,
					includeWhenRenaming: format.includeCustomFormatWhenRenaming ?? false,
					recommendedScore: getRecommendedScore(format.name, category),
				});

				importedCount++;
			}

			// Update sync timestamp
			await ctx.runMutation(internal.trashGuides.updateSyncTimestamp, {});

			return {
				success: true,
				importedCount,
				mediaType: args.mediaType,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				mediaType: args.mediaType,
			};
		}
	},
});

// ============================================================================
// Import to Custom Formats
// ============================================================================

// Import a TRaSH format into local custom formats
export const importToCustomFormats = mutation({
	args: {
		trashFormatId: v.id("trashGuideFormats"),
	},
	handler: async (ctx, args) => {
		const trashFormat = await ctx.db.get(args.trashFormatId);
		if (!trashFormat) {
			throw new Error("TRaSH format not found");
		}

		// Check if already imported
		if (trashFormat.customFormatId) {
			const existing = await ctx.db.get(trashFormat.customFormatId);
			if (existing) {
				return { alreadyImported: true, customFormatId: trashFormat.customFormatId };
			}
		}

		// Check for name conflict
		const existingByName = await ctx.db
			.query("customFormats")
			.withIndex("by_name", (q) => q.eq("name", trashFormat.name))
			.first();

		const name = existingByName ? `${trashFormat.name} (TRaSH)` : trashFormat.name;

		// Create the custom format
		const now = Date.now();
		const customFormatId = await ctx.db.insert("customFormats", {
			name,
			includeWhenRenaming: trashFormat.includeWhenRenaming,
			conditions: trashFormat.conditions,
			createdAt: now,
			updatedAt: now,
		});

		// Link back to TRaSH format
		await ctx.db.patch(args.trashFormatId, {
			customFormatId,
		});

		return { alreadyImported: false, customFormatId };
	},
});

// Bulk import TRaSH formats by category
export const bulkImportByCategory = mutation({
	args: {
		category: v.string(),
		profileId: v.optional(v.id("qualityProfiles")),
	},
	handler: async (ctx, args) => {
		const formats = await ctx.db
			.query("trashGuideFormats")
			.withIndex("by_category", (q) => q.eq("category", args.category))
			.collect();

		const now = Date.now();
		const results: Array<{
			trashId: string;
			name: string;
			customFormatId: string;
			alreadyExisted: boolean;
		}> = [];

		for (const trashFormat of formats) {
			// Skip if already imported
			if (trashFormat.customFormatId) {
				const existing = await ctx.db.get(trashFormat.customFormatId);
				if (existing) {
					results.push({
						trashId: trashFormat.trashId,
						name: trashFormat.name,
						customFormatId: trashFormat.customFormatId,
						alreadyExisted: true,
					});
					continue;
				}
			}

			// Check for name conflict
			const existingByName = await ctx.db
				.query("customFormats")
				.withIndex("by_name", (q) => q.eq("name", trashFormat.name))
				.first();

			const name = existingByName ? `${trashFormat.name} (TRaSH)` : trashFormat.name;

			// Create custom format
			const customFormatId = await ctx.db.insert("customFormats", {
				name,
				includeWhenRenaming: trashFormat.includeWhenRenaming,
				conditions: trashFormat.conditions,
				createdAt: now,
				updatedAt: now,
			});

			// Link back
			await ctx.db.patch(trashFormat._id, { customFormatId });

			// Add score to profile if specified
			if (args.profileId) {
				await ctx.db.insert("customFormatScores", {
					profileId: args.profileId,
					formatId: customFormatId,
					score: trashFormat.recommendedScore,
					createdAt: now,
					updatedAt: now,
				});
			}

			results.push({
				trashId: trashFormat.trashId,
				name,
				customFormatId,
				alreadyExisted: false,
			});
		}

		return {
			importedCount: results.filter((r) => !r.alreadyExisted).length,
			skippedCount: results.filter((r) => r.alreadyExisted).length,
			results,
		};
	},
});

// ============================================================================
// Helper Functions
// ============================================================================

// Parse TRaSH specifications into our condition format
function parseTrashSpecifications(specs: TrashFormatSpec["specifications"]): Array<{
	type:
		| "releaseName"
		| "releaseGroup"
		| "source"
		| "resolution"
		| "codec"
		| "audioCodec"
		| "audioChannels"
		| "language"
		| "edition"
		| "size"
		| "indexerFlag";
	pattern: string;
	negate: boolean;
	required: boolean;
}> {
	return specs.map((spec) => {
		// Map TRaSH implementation types to our types
		let type:
			| "releaseName"
			| "releaseGroup"
			| "source"
			| "resolution"
			| "codec"
			| "audioCodec"
			| "audioChannels"
			| "language"
			| "edition"
			| "size"
			| "indexerFlag" = "releaseName";

		switch (spec.implementation?.toLowerCase()) {
			case "releasetitlespecification":
				type = "releaseName";
				break;
			case "releasegroupspecification":
				type = "releaseGroup";
				break;
			case "sourcespecification":
				type = "source";
				break;
			case "resolutionspecification":
				type = "resolution";
				break;
			case "indexerflagspecification":
				type = "indexerFlag";
				break;
			case "languagespecification":
				type = "language";
				break;
			case "sizespecification":
				type = "size";
				break;
			default:
				// Default to releaseName for unknown types
				type = "releaseName";
		}

		return {
			type,
			pattern: spec.fields?.value ?? "",
			negate: spec.negate ?? false,
			required: spec.required ?? false,
		};
	});
}

// Categorize format based on name patterns
function categorizeFormat(name: string): string {
	const nameLower = name.toLowerCase();

	// Unwanted formats
	if (
		nameLower.includes("dv (webdl)") ||
		nameLower.includes("lq") ||
		nameLower.includes("x265 (hd)") ||
		nameLower.includes("3d") ||
		nameLower.includes("bad dual groups") ||
		nameLower.includes("no-rlsgroup") ||
		nameLower.includes("obfuscated") ||
		nameLower.includes("retags") ||
		nameLower.includes("scene") ||
		nameLower.includes("br-disk")
	) {
		return "Unwanted";
	}

	// HDR formats
	if (
		nameLower.includes("dv") ||
		nameLower.includes("dolby vision") ||
		nameLower.includes("hdr10") ||
		nameLower.includes("hdr") ||
		nameLower.includes("hlg")
	) {
		return "HDR Formats";
	}

	// Audio formats
	if (
		nameLower.includes("atmos") ||
		nameLower.includes("dts") ||
		nameLower.includes("truehd") ||
		nameLower.includes("flac") ||
		nameLower.includes("pcm") ||
		nameLower.includes("aac") ||
		nameLower.includes("dd+") ||
		nameLower.includes("dd")
	) {
		return "Audio";
	}

	// Resolution/Quality tiers
	if (nameLower.includes("remux")) {
		return "Remux Tier";
	}
	if (nameLower.includes("bluray") || nameLower.includes("blu-ray")) {
		return "Bluray Tier";
	}
	if (nameLower.includes("web")) {
		return "WEB Tier";
	}
	if (nameLower.includes("hdtv")) {
		return "HDTV";
	}

	// Streaming services
	if (
		nameLower.includes("amzn") ||
		nameLower.includes("nf") ||
		nameLower.includes("netflix") ||
		nameLower.includes("dsnp") ||
		nameLower.includes("disney") ||
		nameLower.includes("hmax") ||
		nameLower.includes("hbo") ||
		nameLower.includes("atvp") ||
		nameLower.includes("apple")
	) {
		return "Streaming Services";
	}

	// Release groups
	if (nameLower.includes("group") || nameLower.includes("-")) {
		return "Release Groups";
	}

	return "Other";
}

// Get recommended score based on format name and category
function getRecommendedScore(name: string, category: string): number {
	const nameLower = name.toLowerCase();

	// Unwanted = negative scores
	if (category === "Unwanted") {
		return -10000;
	}

	// HDR formats - positive but varied
	if (category === "HDR Formats") {
		if (nameLower.includes("dv") && nameLower.includes("hdr10")) return 1500;
		if (nameLower.includes("dv")) return 1000;
		if (nameLower.includes("hdr10+")) return 800;
		if (nameLower.includes("hdr10")) return 500;
		if (nameLower.includes("hdr")) return 400;
		return 300;
	}

	// Audio - positive scores
	if (category === "Audio") {
		if (nameLower.includes("atmos")) return 500;
		if (nameLower.includes("truehd")) return 400;
		if (nameLower.includes("dts-hd") || nameLower.includes("dts:x")) return 350;
		if (nameLower.includes("flac")) return 300;
		if (nameLower.includes("dts")) return 200;
		return 100;
	}

	// Quality tiers
	if (category === "Remux Tier") return 1000;
	if (category === "Bluray Tier") return 800;
	if (category === "WEB Tier") return 400;
	if (category === "HDTV") return 100;

	// Streaming services
	if (category === "Streaming Services") {
		if (nameLower.includes("atvp")) return 100; // Apple TV+ often highest quality
		if (nameLower.includes("nf") || nameLower.includes("netflix")) return 75;
		if (nameLower.includes("amzn")) return 50;
		return 25;
	}

	return 0;
}
