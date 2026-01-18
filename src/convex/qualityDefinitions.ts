import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { qualitySourceValidator, resolutionValidator } from "./schema";

// ============================================================================
// Default Quality Definitions
// Size values are MB per minute of video content
// ============================================================================

const DEFAULT_QUALITY_DEFINITIONS = [
	// Unknown/Low Quality
	{
		name: "Unknown",
		source: "unknown",
		resolution: "unknown",
		minSize: 0,
		maxSize: 100,
		weight: 0,
	},
	{
		name: "WORKPRINT",
		source: "workprint",
		resolution: "unknown",
		minSize: 0,
		maxSize: 100,
		weight: 1,
	},
	{ name: "CAM", source: "cam", resolution: "unknown", minSize: 0, maxSize: 100, weight: 2 },
	{
		name: "TELESYNC",
		source: "telesync",
		resolution: "unknown",
		minSize: 0,
		maxSize: 100,
		weight: 3,
	},
	{
		name: "TELECINE",
		source: "telecine",
		resolution: "unknown",
		minSize: 0,
		maxSize: 100,
		weight: 4,
	},

	// DVD Quality
	{
		name: "DVD",
		source: "dvd",
		resolution: "r480p",
		minSize: 2,
		maxSize: 100,
		preferredSize: 35,
		weight: 10,
	},
	{
		name: "DVD-R",
		source: "dvd",
		resolution: "r576p",
		minSize: 2,
		maxSize: 100,
		preferredSize: 35,
		weight: 11,
	},

	// SDTV
	{
		name: "SDTV",
		source: "tv",
		resolution: "r480p",
		minSize: 1,
		maxSize: 100,
		preferredSize: 15,
		weight: 15,
	},

	// 720p Sources
	{
		name: "HDTV-720p",
		source: "tv",
		resolution: "r720p",
		minSize: 3,
		maxSize: 125,
		preferredSize: 40,
		weight: 20,
	},
	{
		name: "WEBRip-720p",
		source: "webrip",
		resolution: "r720p",
		minSize: 3,
		maxSize: 130,
		preferredSize: 45,
		weight: 21,
	},
	{
		name: "WEB-DL 720p",
		source: "webdl",
		resolution: "r720p",
		minSize: 3,
		maxSize: 130,
		preferredSize: 50,
		weight: 22,
	},
	{
		name: "BluRay-720p",
		source: "bluray",
		resolution: "r720p",
		minSize: 4,
		maxSize: 130,
		preferredSize: 60,
		weight: 23,
	},

	// 1080p Sources
	{
		name: "HDTV-1080p",
		source: "tv",
		resolution: "r1080p",
		minSize: 4,
		maxSize: 130,
		preferredSize: 50,
		weight: 30,
	},
	{
		name: "WEBRip-1080p",
		source: "webrip",
		resolution: "r1080p",
		minSize: 4,
		maxSize: 130,
		preferredSize: 60,
		weight: 31,
	},
	{
		name: "WEB-DL 1080p",
		source: "webdl",
		resolution: "r1080p",
		minSize: 4,
		maxSize: 130,
		preferredSize: 70,
		weight: 32,
	},
	{
		name: "BluRay-1080p",
		source: "bluray",
		resolution: "r1080p",
		minSize: 5,
		maxSize: 155,
		preferredSize: 80,
		weight: 33,
	},
	{
		name: "Remux-1080p",
		source: "remux",
		resolution: "r1080p",
		minSize: 10,
		maxSize: 400,
		preferredSize: 200,
		weight: 34,
	},

	// 2160p/4K Sources
	{
		name: "HDTV-2160p",
		source: "tv",
		resolution: "r2160p",
		minSize: 10,
		maxSize: 350,
		preferredSize: 100,
		weight: 40,
	},
	{
		name: "WEBRip-2160p",
		source: "webrip",
		resolution: "r2160p",
		minSize: 10,
		maxSize: 350,
		preferredSize: 120,
		weight: 41,
	},
	{
		name: "WEB-DL 2160p",
		source: "webdl",
		resolution: "r2160p",
		minSize: 10,
		maxSize: 350,
		preferredSize: 140,
		weight: 42,
	},
	{
		name: "BluRay-2160p",
		source: "bluray",
		resolution: "r2160p",
		minSize: 15,
		maxSize: 400,
		preferredSize: 180,
		weight: 43,
	},
	{
		name: "Remux-2160p",
		source: "remux",
		resolution: "r2160p",
		minSize: 30,
		maxSize: 750,
		preferredSize: 400,
		weight: 44,
	},
] as const;

// ============================================================================
// Queries
// ============================================================================

// List all quality definitions ordered by weight (quality level)
export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("qualityDefinitions").withIndex("by_weight").collect();
	},
});

// Get a single quality definition by ID
export const get = query({
	args: { id: v.id("qualityDefinitions") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Get quality definition by name
export const getByName = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		const definitions = await ctx.db.query("qualityDefinitions").collect();
		return definitions.find((d) => d.name === args.name) ?? null;
	},
});

// List quality definitions by resolution
export const listByResolution = query({
	args: { resolution: resolutionValidator },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("qualityDefinitions")
			.withIndex("by_resolution", (q) => q.eq("resolution", args.resolution))
			.collect();
	},
});

// List quality definitions by source
export const listBySource = query({
	args: { source: qualitySourceValidator },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("qualityDefinitions")
			.withIndex("by_source", (q) => q.eq("source", args.source))
			.collect();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Update size limits for a quality definition
export const update = mutation({
	args: {
		id: v.id("qualityDefinitions"),
		minSize: v.optional(v.number()),
		maxSize: v.optional(v.number()),
		preferredSize: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error("Quality definition not found");
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (args.minSize !== undefined) {
			if (args.minSize < 0) {
				throw new Error("Minimum size cannot be negative");
			}
			updates.minSize = args.minSize;
		}

		if (args.maxSize !== undefined) {
			if (args.maxSize < 0) {
				throw new Error("Maximum size cannot be negative");
			}
			updates.maxSize = args.maxSize;
		}

		if (args.preferredSize !== undefined) {
			updates.preferredSize = args.preferredSize;
		}

		// Validate min <= preferred <= max
		const minSize = (updates.minSize as number) ?? existing.minSize;
		const maxSize = (updates.maxSize as number) ?? existing.maxSize;
		const preferredSize = (updates.preferredSize as number | undefined) ?? existing.preferredSize;

		if (minSize > maxSize) {
			throw new Error("Minimum size cannot be greater than maximum size");
		}

		if (preferredSize !== undefined) {
			if (preferredSize < minSize || preferredSize > maxSize) {
				throw new Error("Preferred size must be between minimum and maximum size");
			}
		}

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Reset all quality definitions to defaults
export const reset = mutation({
	args: {},
	handler: async (ctx) => {
		// Delete all existing definitions
		const existing = await ctx.db.query("qualityDefinitions").collect();
		for (const definition of existing) {
			await ctx.db.delete(definition._id);
		}

		// Re-seed with defaults
		const now = Date.now();
		for (const def of DEFAULT_QUALITY_DEFINITIONS) {
			await ctx.db.insert("qualityDefinitions", {
				name: def.name,
				source: def.source,
				resolution: def.resolution,
				minSize: def.minSize,
				maxSize: def.maxSize,
				preferredSize: "preferredSize" in def ? def.preferredSize : undefined,
				weight: def.weight,
				createdAt: now,
				updatedAt: now,
			});
		}
	},
});

// ============================================================================
// Internal Functions
// ============================================================================

// Seed default quality definitions (called on initialization)
export const seedDefaults = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Check if any definitions exist
		const existing = await ctx.db.query("qualityDefinitions").first();
		if (existing) {
			return; // Already seeded
		}

		const now = Date.now();
		for (const def of DEFAULT_QUALITY_DEFINITIONS) {
			await ctx.db.insert("qualityDefinitions", {
				name: def.name,
				source: def.source,
				resolution: def.resolution,
				minSize: def.minSize,
				maxSize: def.maxSize,
				preferredSize: "preferredSize" in def ? def.preferredSize : undefined,
				weight: def.weight,
				createdAt: now,
				updatedAt: now,
			});
		}
	},
});

// Get quality definition IDs by names (helper for profile creation)
export const getIdsByNames = query({
	args: { names: v.array(v.string()) },
	handler: async (ctx, args) => {
		const definitions = await ctx.db.query("qualityDefinitions").collect();
		const result: Record<string, string> = {};

		for (const name of args.names) {
			const def = definitions.find((d) => d.name === name);
			if (def) {
				result[name] = def._id;
			}
		}

		return result;
	},
});
