import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { customFormatConditionTypeValidator } from "./schema";

// ============================================================================
// Condition Validator Type
// ============================================================================

const conditionValidator = v.object({
	type: customFormatConditionTypeValidator,
	pattern: v.string(),
	negate: v.boolean(),
	required: v.boolean(),
});

// ============================================================================
// Queries
// ============================================================================

// List all custom formats
export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("customFormats").collect();
	},
});

// Get a single custom format by ID
export const get = query({
	args: { id: v.id("customFormats") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Get custom format by name
export const getByName = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("customFormats")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a new custom format
export const add = mutation({
	args: {
		name: v.string(),
		includeWhenRenaming: v.optional(v.boolean()),
		conditions: v.array(conditionValidator),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("customFormats")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`A custom format with name "${args.name}" already exists`);
		}

		// Validate conditions
		if (args.conditions.length === 0) {
			throw new Error("Custom format must have at least one condition");
		}

		// Validate regex patterns
		for (const condition of args.conditions) {
			if (condition.type !== "size") {
				try {
					new RegExp(condition.pattern);
				} catch {
					throw new Error(`Invalid regex pattern: ${condition.pattern}`);
				}
			}
		}

		const now = Date.now();
		return await ctx.db.insert("customFormats", {
			name: args.name,
			includeWhenRenaming: args.includeWhenRenaming ?? false,
			conditions: args.conditions,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an existing custom format
export const update = mutation({
	args: {
		id: v.id("customFormats"),
		name: v.optional(v.string()),
		includeWhenRenaming: v.optional(v.boolean()),
		conditions: v.optional(v.array(conditionValidator)),
	},
	handler: async (ctx, args) => {
		const format = await ctx.db.get(args.id);
		if (!format) {
			throw new Error("Custom format not found");
		}

		// Check for duplicate name if changing
		const { name } = args;
		if (name !== undefined && name !== format.name) {
			const existing = await ctx.db
				.query("customFormats")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`A custom format with name "${name}" already exists`);
			}
		}

		// Validate conditions if provided
		if (args.conditions) {
			if (args.conditions.length === 0) {
				throw new Error("Custom format must have at least one condition");
			}

			for (const condition of args.conditions) {
				if (condition.type !== "size") {
					try {
						new RegExp(condition.pattern);
					} catch {
						throw new Error(`Invalid regex pattern: ${condition.pattern}`);
					}
				}
			}
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (args.name !== undefined) updates.name = args.name;
		if (args.includeWhenRenaming !== undefined)
			updates.includeWhenRenaming = args.includeWhenRenaming;
		if (args.conditions !== undefined) updates.conditions = args.conditions;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Remove a custom format
export const remove = mutation({
	args: { id: v.id("customFormats") },
	handler: async (ctx, args) => {
		const format = await ctx.db.get(args.id);
		if (!format) {
			throw new Error("Custom format not found");
		}

		// Delete all associated scores
		const scores = await ctx.db
			.query("customFormatScores")
			.withIndex("by_format", (q) => q.eq("formatId", args.id))
			.collect();

		for (const score of scores) {
			await ctx.db.delete(score._id);
		}

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Testing/Matching Functions
// ============================================================================

// Test a release name against all custom formats
export const testRelease = query({
	args: {
		releaseName: v.string(),
		// Optional additional metadata for matching
		releaseGroup: v.optional(v.string()),
		source: v.optional(v.string()),
		resolution: v.optional(v.string()),
		codec: v.optional(v.string()),
		audioCodec: v.optional(v.string()),
		audioChannels: v.optional(v.string()),
		language: v.optional(v.string()),
		edition: v.optional(v.string()),
		sizeInMB: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const formats = await ctx.db.query("customFormats").collect();
		const matchedFormats: Array<{
			id: string;
			name: string;
			matchedConditions: Array<{ type: string; pattern: string; matched: boolean }>;
		}> = [];

		for (const format of formats) {
			const conditionResults = format.conditions.map((condition) => {
				const matched = evaluateCondition(condition, args);
				return {
					type: condition.type,
					pattern: condition.pattern,
					matched: condition.negate ? !matched : matched,
				};
			});

			// Check if format matches:
			// - All required conditions must match
			// - At least one non-required condition must match (if any exist)
			const requiredConditions = format.conditions.filter((c) => c.required);
			const optionalConditions = format.conditions.filter((c) => !c.required);

			const allRequiredMatch = requiredConditions.every((c, _i) => {
				const result = conditionResults.find((r) => r.type === c.type && r.pattern === c.pattern);
				return result?.matched ?? false;
			});

			const anyOptionalMatch =
				optionalConditions.length === 0 ||
				optionalConditions.some((c) => {
					const result = conditionResults.find((r) => r.type === c.type && r.pattern === c.pattern);
					return result?.matched ?? false;
				});

			if (allRequiredMatch && anyOptionalMatch) {
				matchedFormats.push({
					id: format._id,
					name: format.name,
					matchedConditions: conditionResults,
				});
			}
		}

		return matchedFormats;
	},
});

// Helper function to evaluate a single condition
function evaluateCondition(
	condition: {
		type: string;
		pattern: string;
		negate: boolean;
		required: boolean;
	},
	args: {
		releaseName: string;
		releaseGroup?: string;
		source?: string;
		resolution?: string;
		codec?: string;
		audioCodec?: string;
		audioChannels?: string;
		language?: string;
		edition?: string;
		sizeInMB?: number;
	},
): boolean {
	let valueToTest: string | undefined;

	switch (condition.type) {
		case "releaseName":
			valueToTest = args.releaseName;
			break;
		case "releaseGroup":
			valueToTest = args.releaseGroup ?? extractReleaseGroup(args.releaseName);
			break;
		case "source":
			valueToTest = args.source ?? args.releaseName;
			break;
		case "resolution":
			valueToTest = args.resolution ?? args.releaseName;
			break;
		case "codec":
			valueToTest = args.codec ?? args.releaseName;
			break;
		case "audioCodec":
			valueToTest = args.audioCodec ?? args.releaseName;
			break;
		case "audioChannels":
			valueToTest = args.audioChannels ?? args.releaseName;
			break;
		case "language":
			valueToTest = args.language ?? args.releaseName;
			break;
		case "edition":
			valueToTest = args.edition ?? args.releaseName;
			break;
		case "size":
			// Size comparison: pattern should be like ">500" or "<1000" or "500-1000"
			if (args.sizeInMB === undefined) return false;
			return evaluateSizeCondition(condition.pattern, args.sizeInMB);
		case "indexerFlag":
			// Indexer flags would need to be passed from the search results
			valueToTest = args.releaseName;
			break;
		default:
			return false;
	}

	if (!valueToTest) return false;

	try {
		const regex = new RegExp(condition.pattern, "i");
		return regex.test(valueToTest);
	} catch {
		return false;
	}
}

// Helper to extract release group from release name
function extractReleaseGroup(releaseName: string): string {
	// Common pattern: group at end after hyphen
	const match = releaseName.match(/-([A-Za-z0-9]+)(?:\.[a-z]{2,4})?$/);
	return match?.[1] ?? "";
}

// Helper to evaluate size conditions
function evaluateSizeCondition(pattern: string, sizeInMB: number): boolean {
	// Patterns: ">500", "<1000", ">=500", "<=1000", "500-1000"
	const rangeMatch = pattern.match(/^(\d+)-(\d+)$/);
	if (rangeMatch) {
		const min = parseInt(rangeMatch[1], 10);
		const max = parseInt(rangeMatch[2], 10);
		return sizeInMB >= min && sizeInMB <= max;
	}

	const compMatch = pattern.match(/^([<>]=?)(\d+)$/);
	if (compMatch) {
		const op = compMatch[1];
		const value = parseInt(compMatch[2], 10);
		switch (op) {
			case ">":
				return sizeInMB > value;
			case ">=":
				return sizeInMB >= value;
			case "<":
				return sizeInMB < value;
			case "<=":
				return sizeInMB <= value;
		}
	}

	return false;
}

// ============================================================================
// Condition Helpers
// ============================================================================

// Get available condition types with descriptions
export const getConditionTypes = query({
	args: {},
	handler: async () => {
		return [
			{
				type: "releaseName",
				description: "Match against the full release name",
				supportsRegex: true,
			},
			{
				type: "releaseGroup",
				description: "Match against the release group (e.g., SPARKS, RARBG)",
				supportsRegex: true,
			},
			{
				type: "source",
				description: "Match against source (WEB-DL, BluRay, HDTV, etc.)",
				supportsRegex: true,
			},
			{
				type: "resolution",
				description: "Match against resolution (720p, 1080p, 2160p)",
				supportsRegex: true,
			},
			{
				type: "codec",
				description: "Match against video codec (x264, x265, HEVC, AV1)",
				supportsRegex: true,
			},
			{
				type: "audioCodec",
				description: "Match against audio codec (AAC, DTS, TrueHD, Atmos)",
				supportsRegex: true,
			},
			{
				type: "audioChannels",
				description: "Match against audio channels (2.0, 5.1, 7.1)",
				supportsRegex: true,
			},
			{
				type: "language",
				description: "Match against language (English, German, Multi)",
				supportsRegex: true,
			},
			{
				type: "edition",
				description: "Match against edition (Director's Cut, Extended)",
				supportsRegex: true,
			},
			{
				type: "size",
				description: "Match against file size in MB (>500, <1000, 500-1000)",
				supportsRegex: false,
			},
			{
				type: "indexerFlag",
				description: "Match against indexer flags (freeleech, internal)",
				supportsRegex: true,
			},
		];
	},
});
