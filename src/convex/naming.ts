import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// ============================================================================
// Default Preset Definitions
// ============================================================================

const DEFAULT_PRESETS = [
	{
		name: "Plex",
		type: "built-in" as const,
		// TV: Plex naming convention
		seriesFolderFormat: "{Series Title} ({Year})",
		seasonFolderFormat: "Season {Season:00}",
		episodeFormat: "{Series Title} - S{Season:00}E{Episode:00} - {Episode Title}",
		// Movies
		movieFolderFormat: "{Movie Title} ({Year})",
		movieFormat: "{Movie Title} ({Year})",
		// Music
		artistFolderFormat: "{Artist Name}",
		albumFolderFormat: "{Album Title} ({Year})",
		trackFormat: "{Track Number:00} - {Track Title}",
		// Options
		replaceSpaces: false,
	},
	{
		name: "Kodi",
		type: "built-in" as const,
		// TV: Kodi naming convention
		seriesFolderFormat: "{Series Title} ({Year})",
		seasonFolderFormat: "Season {Season}",
		episodeFormat: "S{Season:00}E{Episode:00} - {Episode Title}",
		// Movies
		movieFolderFormat: "{Movie Title} ({Year})",
		movieFormat: "{Movie Title} ({Year})",
		// Music
		artistFolderFormat: "{Artist Name}",
		albumFolderFormat: "{Album Title} ({Year})",
		trackFormat: "{Track Number:00}. {Track Title}",
		// Options
		replaceSpaces: false,
	},
	{
		name: "Minimal",
		type: "built-in" as const,
		// TV: Minimal naming
		seriesFolderFormat: "{Series Title}",
		seasonFolderFormat: "S{Season:00}",
		episodeFormat: "S{Season:00}E{Episode:00}",
		// Movies
		movieFolderFormat: "{Movie Title}",
		movieFormat: "{Movie Title}",
		// Music
		artistFolderFormat: "{Artist Name}",
		albumFolderFormat: "{Album Title}",
		trackFormat: "{Track Number:00} {Track Title}",
		// Options
		replaceSpaces: false,
	},
	{
		name: "Scene",
		type: "built-in" as const,
		// TV: Scene-style with dots
		seriesFolderFormat: "{Series Title}",
		seasonFolderFormat: "Season.{Season:00}",
		episodeFormat: "{Series Title}.S{Season:00}E{Episode:00}.{Episode Title}.{Quality}",
		// Movies
		movieFolderFormat: "{Movie Title}.{Year}",
		movieFormat: "{Movie Title}.{Year}.{Quality}",
		// Music
		artistFolderFormat: "{Artist Name}",
		albumFolderFormat: "{Album Title}-{Year}",
		trackFormat: "{Track Number:00}-{Track Title}",
		// Options
		replaceSpaces: true,
		spaceReplacement: ".",
	},
];

// ============================================================================
// Queries
// ============================================================================

// List all naming presets
export const listPresets = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("namingPresets").collect();
	},
});

// Get a single preset by ID
export const getPreset = query({
	args: { id: v.id("namingPresets") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Get preset by name
export const getPresetByName = query({
	args: { name: v.string() },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("namingPresets")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();
	},
});

// ============================================================================
// Mutations
// ============================================================================

// Add a custom naming preset
export const addCustomPreset = mutation({
	args: {
		name: v.string(),
		seriesFolderFormat: v.string(),
		seasonFolderFormat: v.string(),
		episodeFormat: v.string(),
		movieFolderFormat: v.string(),
		movieFormat: v.string(),
		artistFolderFormat: v.string(),
		albumFolderFormat: v.string(),
		trackFormat: v.string(),
		replaceSpaces: v.boolean(),
		spaceReplacement: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check for duplicate name
		const existing = await ctx.db
			.query("namingPresets")
			.withIndex("by_name", (q) => q.eq("name", args.name))
			.first();

		if (existing) {
			throw new Error(`A naming preset with name "${args.name}" already exists`);
		}

		const now = Date.now();
		return await ctx.db.insert("namingPresets", {
			name: args.name,
			type: "custom",
			seriesFolderFormat: args.seriesFolderFormat,
			seasonFolderFormat: args.seasonFolderFormat,
			episodeFormat: args.episodeFormat,
			movieFolderFormat: args.movieFolderFormat,
			movieFormat: args.movieFormat,
			artistFolderFormat: args.artistFolderFormat,
			albumFolderFormat: args.albumFolderFormat,
			trackFormat: args.trackFormat,
			replaceSpaces: args.replaceSpaces,
			spaceReplacement: args.spaceReplacement,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an existing preset (only custom presets can be fully updated, built-in can only change options)
export const updatePreset = mutation({
	args: {
		id: v.id("namingPresets"),
		name: v.optional(v.string()),
		seriesFolderFormat: v.optional(v.string()),
		seasonFolderFormat: v.optional(v.string()),
		episodeFormat: v.optional(v.string()),
		movieFolderFormat: v.optional(v.string()),
		movieFormat: v.optional(v.string()),
		artistFolderFormat: v.optional(v.string()),
		albumFolderFormat: v.optional(v.string()),
		trackFormat: v.optional(v.string()),
		replaceSpaces: v.optional(v.boolean()),
		spaceReplacement: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const preset = await ctx.db.get(args.id);
		if (!preset) {
			throw new Error("Naming preset not found");
		}

		// Built-in presets cannot have their formats changed
		if (preset.type === "built-in") {
			const formatFields = [
				"seriesFolderFormat",
				"seasonFolderFormat",
				"episodeFormat",
				"movieFolderFormat",
				"movieFormat",
				"artistFolderFormat",
				"albumFolderFormat",
				"trackFormat",
				"name",
			];

			for (const field of formatFields) {
				if (args[field as keyof typeof args] !== undefined) {
					throw new Error(`Cannot modify ${field} on built-in presets`);
				}
			}
		}

		// Check for duplicate name if name is being changed
		const { name } = args;
		if (name !== undefined && name !== preset.name) {
			const existing = await ctx.db
				.query("namingPresets")
				.withIndex("by_name", (q) => q.eq("name", name))
				.first();

			if (existing) {
				throw new Error(`A naming preset with name "${name}" already exists`);
			}
		}

		const now = Date.now();
		const updates: Record<string, unknown> = { updatedAt: now };

		// Only add defined fields to updates
		const fields = [
			"name",
			"seriesFolderFormat",
			"seasonFolderFormat",
			"episodeFormat",
			"movieFolderFormat",
			"movieFormat",
			"artistFolderFormat",
			"albumFolderFormat",
			"trackFormat",
			"replaceSpaces",
			"spaceReplacement",
		];

		for (const field of fields) {
			const value = args[field as keyof typeof args];
			if (value !== undefined) {
				updates[field] = value;
			}
		}

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete a naming preset (only custom presets can be deleted)
export const deletePreset = mutation({
	args: { id: v.id("namingPresets") },
	handler: async (ctx, args) => {
		const preset = await ctx.db.get(args.id);
		if (!preset) {
			throw new Error("Naming preset not found");
		}

		if (preset.type === "built-in") {
			throw new Error("Cannot delete built-in naming presets");
		}

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Formatting Functions
// ============================================================================

// Token replacement helper
function replaceTokens(
	format: string | undefined,
	tokens: Record<string, string | number | undefined>,
	replaceSpaces: boolean | undefined,
	spaceReplacement?: string,
): string {
	if (!format) return "";

	let result = format;

	// Replace tokens with format specifiers like {Token:00}
	for (const [key, value] of Object.entries(tokens)) {
		if (value === undefined) continue;

		// Handle numeric padding like {Season:00}
		const paddedRegex = new RegExp(`\\{${key}:(0+)\\}`, "g");
		result = result.replace(paddedRegex, (_, padding) => {
			const numValue = typeof value === "number" ? value : parseInt(String(value), 10);
			if (Number.isNaN(numValue)) return String(value);
			return String(numValue).padStart(padding.length, "0");
		});

		// Handle simple replacement like {Season}
		const simpleRegex = new RegExp(`\\{${key}\\}`, "g");
		result = result.replace(simpleRegex, String(value));
	}

	// Replace spaces if configured
	if (replaceSpaces === true && spaceReplacement) {
		result = result.replace(/ /g, spaceReplacement);
	}

	// Clean up any unreplaced tokens
	result = result.replace(/\{[^}]+\}/g, "");

	// Clean up multiple spaces/dots/underscores
	result = result
		.replace(/\.{2,}/g, ".")
		.replace(/_{2,}/g, "_")
		.replace(/ {2,}/g, " ");

	// Remove leading/trailing spaces and dots
	result = result.replace(/^[\s.]+|[\s.]+$/g, "");

	return result;
}

// Format a filename using a preset for a given media item
export const formatFilename = query({
	args: {
		presetId: v.id("namingPresets"),
		mediaType: v.union(v.literal("tv"), v.literal("movie"), v.literal("anime"), v.literal("music")),
		// Common tokens
		title: v.string(),
		year: v.optional(v.number()),
		quality: v.optional(v.string()),
		releaseGroup: v.optional(v.string()),
		// TV/Anime specific
		season: v.optional(v.number()),
		episode: v.optional(v.number()),
		episodeTitle: v.optional(v.string()),
		absoluteEpisode: v.optional(v.number()),
		// Movie specific
		edition: v.optional(v.string()),
		// Music specific
		artistName: v.optional(v.string()),
		albumTitle: v.optional(v.string()),
		trackNumber: v.optional(v.number()),
		trackTitle: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const preset = await ctx.db.get(args.presetId);
		if (!preset) {
			throw new Error("Naming preset not found");
		}

		const tokens: Record<string, string | number | undefined> = {
			// Series/Anime tokens
			"Series Title": args.title,
			Year: args.year,
			Season: args.season,
			Episode: args.episode,
			"Episode Title": args.episodeTitle,
			"Absolute Episode": args.absoluteEpisode,
			Quality: args.quality,
			"Release Group": args.releaseGroup,

			// Movie tokens
			"Movie Title": args.title,
			Edition: args.edition,

			// Music tokens
			"Artist Name": args.artistName,
			"Album Title": args.albumTitle,
			"Track Number": args.trackNumber,
			"Track Title": args.trackTitle,
		};

		const results: Record<string, string> = {};

		switch (args.mediaType) {
			case "tv":
			case "anime":
				results.folderPath = replaceTokens(
					preset.seriesFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				results.seasonFolder = replaceTokens(
					preset.seasonFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				results.filename = replaceTokens(
					preset.episodeFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				break;

			case "movie":
				results.folderPath = replaceTokens(
					preset.movieFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				results.filename = replaceTokens(
					preset.movieFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				break;

			case "music":
				results.artistFolder = replaceTokens(
					preset.artistFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				results.albumFolder = replaceTokens(
					preset.albumFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				results.filename = replaceTokens(
					preset.trackFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				break;
		}

		return results;
	},
});

// Preview rename for a media item (shows before/after)
export const previewRename = query({
	args: {
		presetId: v.id("namingPresets"),
		mediaId: v.id("media"),
		// Additional context for the rename
		currentFilename: v.optional(v.string()),
		quality: v.optional(v.string()),
		releaseGroup: v.optional(v.string()),
		// TV specific
		season: v.optional(v.number()),
		episode: v.optional(v.number()),
		episodeTitle: v.optional(v.string()),
		// Music specific
		trackNumber: v.optional(v.number()),
		trackTitle: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const media = await ctx.db.get(args.mediaId);
		if (!media) {
			throw new Error("Media not found");
		}

		const preset = await ctx.db.get(args.presetId);
		if (!preset) {
			throw new Error("Naming preset not found");
		}

		const tokens: Record<string, string | number | undefined> = {
			"Series Title": media.title,
			"Movie Title": media.title,
			Year: media.year,
			Season: args.season,
			Episode: args.episode,
			"Episode Title": args.episodeTitle,
			Quality: args.quality,
			"Release Group": args.releaseGroup,
			"Track Number": args.trackNumber,
			"Track Title": args.trackTitle,
		};

		const newPaths: Record<string, string> = {};

		switch (media.mediaType) {
			case "tv":
			case "anime":
				newPaths.folderPath = replaceTokens(
					preset.seriesFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				if (args.season !== undefined) {
					newPaths.seasonFolder = replaceTokens(
						preset.seasonFolderFormat,
						tokens,
						preset.replaceSpaces,
						preset.spaceReplacement,
					);
				}
				if (args.episode !== undefined) {
					newPaths.filename = replaceTokens(
						preset.episodeFormat,
						tokens,
						preset.replaceSpaces,
						preset.spaceReplacement,
					);
				}
				break;

			case "movie":
				newPaths.folderPath = replaceTokens(
					preset.movieFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				newPaths.filename = replaceTokens(
					preset.movieFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				break;

			case "music":
				newPaths.artistFolder = replaceTokens(
					preset.artistFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				newPaths.albumFolder = replaceTokens(
					preset.albumFolderFormat,
					tokens,
					preset.replaceSpaces,
					preset.spaceReplacement,
				);
				if (args.trackNumber !== undefined) {
					newPaths.filename = replaceTokens(
						preset.trackFormat,
						tokens,
						preset.replaceSpaces,
						preset.spaceReplacement,
					);
				}
				break;
		}

		return {
			currentFilename: args.currentFilename ?? media.path,
			newPaths,
			mediaType: media.mediaType,
		};
	},
});

// ============================================================================
// Seed Functions
// ============================================================================

// Internal function to seed default presets
export const seedDefaultPresets = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		for (const preset of DEFAULT_PRESETS) {
			// Check if preset already exists
			const existing = await ctx.db
				.query("namingPresets")
				.withIndex("by_name", (q) => q.eq("name", preset.name))
				.first();

			if (!existing) {
				await ctx.db.insert("namingPresets", {
					...preset,
					spaceReplacement: preset.spaceReplacement,
					createdAt: now,
					updatedAt: now,
				});
			}
		}
	},
});

// Get available tokens documentation
export const getAvailableTokens = query({
	args: {},
	handler: async () => {
		return {
			series: [
				{ token: "{Series Title}", description: "The title of the series" },
				{ token: "{Year}", description: "The year the series started" },
				{ token: "{Season}", description: "Season number" },
				{ token: "{Season:00}", description: "Season number with zero padding" },
				{ token: "{Episode}", description: "Episode number" },
				{ token: "{Episode:00}", description: "Episode number with zero padding" },
				{ token: "{Episode Title}", description: "The title of the episode" },
				{ token: "{Absolute Episode}", description: "Absolute episode number (anime)" },
				{ token: "{Quality}", description: "Quality of the release (e.g., 1080p WEB-DL)" },
				{ token: "{Release Group}", description: "The release group name" },
			],
			movie: [
				{ token: "{Movie Title}", description: "The title of the movie" },
				{ token: "{Year}", description: "The year of release" },
				{ token: "{Quality}", description: "Quality of the release" },
				{ token: "{Release Group}", description: "The release group name" },
				{ token: "{Edition}", description: "Special edition (e.g., Director's Cut)" },
			],
			music: [
				{ token: "{Artist Name}", description: "The name of the artist" },
				{ token: "{Album Title}", description: "The title of the album" },
				{ token: "{Year}", description: "The year of release" },
				{ token: "{Track Number}", description: "Track number" },
				{ token: "{Track Number:00}", description: "Track number with zero padding" },
				{ token: "{Track Title}", description: "The title of the track" },
				{ token: "{Quality}", description: "Audio quality (e.g., FLAC, 320)" },
			],
		};
	},
});
