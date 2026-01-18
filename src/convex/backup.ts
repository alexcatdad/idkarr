import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery } from "./_generated/server";

// ============================================================================
// Types
// ============================================================================

interface BackupData {
	version: string;
	exportedAt: number;
	appName: "idkarr";
	data: {
		settings?: Record<string, unknown>;
		qualityProfiles?: Record<string, unknown>[];
		qualityDefinitions?: Record<string, unknown>[];
		customFormats?: Record<string, unknown>[];
		customFormatScores?: Record<string, unknown>[];
		indexers?: Record<string, unknown>[];
		downloadClients?: Record<string, unknown>[];
		rootFolders?: Record<string, unknown>[];
		tags?: Record<string, unknown>[];
		webhooks?: Record<string, unknown>[];
		namingPresets?: Record<string, unknown>[];
		restrictions?: Record<string, unknown>[];
		media?: Record<string, unknown>[];
		seasons?: Record<string, unknown>[];
		episodes?: Record<string, unknown>[];
		mediaFiles?: Record<string, unknown>[];
		albums?: Record<string, unknown>[];
		tracks?: Record<string, unknown>[];
		movieMetadata?: Record<string, unknown>[];
		artistMetadata?: Record<string, unknown>[];
		collections?: Record<string, unknown>[];
	};
}

type BackupSection = keyof BackupData["data"];

const BACKUP_VERSION = "1.0";

const ALL_SECTIONS: BackupSection[] = [
	"settings",
	"qualityProfiles",
	"qualityDefinitions",
	"customFormats",
	"customFormatScores",
	"indexers",
	"downloadClients",
	"rootFolders",
	"tags",
	"webhooks",
	"namingPresets",
	"restrictions",
	"media",
	"seasons",
	"episodes",
	"mediaFiles",
	"albums",
	"tracks",
	"movieMetadata",
	"artistMetadata",
	"collections",
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Strips _id and _creationTime fields from a record for export
 */
function stripIds<T extends Record<string, unknown>>(record: T): Omit<T, "_id" | "_creationTime"> {
	const { _id, _creationTime, ...rest } = record;
	return rest as Omit<T, "_id" | "_creationTime">;
}

/**
 * Strips _id and _creationTime from an array of records
 */
function stripIdsFromArray<T extends Record<string, unknown>>(
	records: T[],
): Omit<T, "_id" | "_creationTime">[] {
	return records.map((record) => stripIds(record));
}

// ============================================================================
// Internal Queries for Data Collection
// ============================================================================

export const getAllData = internalQuery({
	args: {
		sections: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const sections = args.sections as BackupSection[];
		const data: BackupData["data"] = {};

		for (const section of sections) {
			switch (section) {
				case "settings": {
					const settings = await ctx.db.query("settings").first();
					if (settings) {
						data.settings = stripIds(settings);
					}
					break;
				}
				case "qualityProfiles": {
					const profiles = await ctx.db.query("qualityProfiles").collect();
					data.qualityProfiles = stripIdsFromArray(profiles);
					break;
				}
				case "qualityDefinitions": {
					const definitions = await ctx.db.query("qualityDefinitions").collect();
					data.qualityDefinitions = stripIdsFromArray(definitions);
					break;
				}
				case "customFormats": {
					const formats = await ctx.db.query("customFormats").collect();
					data.customFormats = stripIdsFromArray(formats);
					break;
				}
				case "customFormatScores": {
					const scores = await ctx.db.query("customFormatScores").collect();
					data.customFormatScores = stripIdsFromArray(scores);
					break;
				}
				case "indexers": {
					const indexers = await ctx.db.query("indexers").collect();
					data.indexers = stripIdsFromArray(indexers);
					break;
				}
				case "downloadClients": {
					const clients = await ctx.db.query("downloadClients").collect();
					data.downloadClients = stripIdsFromArray(clients);
					break;
				}
				case "rootFolders": {
					const folders = await ctx.db.query("rootFolders").collect();
					data.rootFolders = stripIdsFromArray(folders);
					break;
				}
				case "tags": {
					const tags = await ctx.db.query("tags").collect();
					data.tags = stripIdsFromArray(tags);
					break;
				}
				case "webhooks": {
					const webhooks = await ctx.db.query("webhooks").collect();
					data.webhooks = stripIdsFromArray(webhooks);
					break;
				}
				case "namingPresets": {
					const presets = await ctx.db.query("namingPresets").collect();
					data.namingPresets = stripIdsFromArray(presets);
					break;
				}
				case "restrictions": {
					const restrictions = await ctx.db.query("restrictions").collect();
					data.restrictions = stripIdsFromArray(restrictions);
					break;
				}
				case "media": {
					const media = await ctx.db.query("media").collect();
					data.media = stripIdsFromArray(media);
					break;
				}
				case "seasons": {
					const seasons = await ctx.db.query("seasons").collect();
					data.seasons = stripIdsFromArray(seasons);
					break;
				}
				case "episodes": {
					const episodes = await ctx.db.query("episodes").collect();
					data.episodes = stripIdsFromArray(episodes);
					break;
				}
				case "mediaFiles": {
					const files = await ctx.db.query("mediaFiles").collect();
					data.mediaFiles = stripIdsFromArray(files);
					break;
				}
				case "albums": {
					const albums = await ctx.db.query("albums").collect();
					data.albums = stripIdsFromArray(albums);
					break;
				}
				case "tracks": {
					const tracks = await ctx.db.query("tracks").collect();
					data.tracks = stripIdsFromArray(tracks);
					break;
				}
				case "movieMetadata": {
					const metadata = await ctx.db.query("movieMetadata").collect();
					data.movieMetadata = stripIdsFromArray(metadata);
					break;
				}
				case "artistMetadata": {
					const metadata = await ctx.db.query("artistMetadata").collect();
					data.artistMetadata = stripIdsFromArray(metadata);
					break;
				}
				case "collections": {
					const collections = await ctx.db.query("collections").collect();
					data.collections = stripIdsFromArray(collections);
					break;
				}
			}
		}

		return data;
	},
});

// ============================================================================
// Export Actions
// ============================================================================

/**
 * Export all data from the database as a structured JSON backup
 */
export const exportBackup = action({
	args: {},
	handler: async (ctx): Promise<BackupData> => {
		const data = await ctx.runQuery(internal.backup.getAllData, {
			sections: ALL_SECTIONS,
		});

		return {
			version: BACKUP_VERSION,
			exportedAt: Date.now(),
			appName: "idkarr",
			data,
		};
	},
});

/**
 * Export only selected sections of the database
 */
export const exportSelective = action({
	args: {
		sections: v.array(v.string()),
	},
	handler: async (ctx, args): Promise<BackupData> => {
		// Validate sections
		const validSections = args.sections.filter((s) => ALL_SECTIONS.includes(s as BackupSection));

		if (validSections.length === 0) {
			throw new Error(`No valid sections provided. Valid sections are: ${ALL_SECTIONS.join(", ")}`);
		}

		const data = await ctx.runQuery(internal.backup.getAllData, {
			sections: validSections,
		});

		return {
			version: BACKUP_VERSION,
			exportedAt: Date.now(),
			appName: "idkarr",
			data,
		};
	},
});

// ============================================================================
// Internal Mutations for Import
// ============================================================================

export const clearTable = internalQuery({
	args: {
		tableName: v.string(),
	},
	handler: async (ctx, args) => {
		// This is a query that returns the IDs to delete
		// The actual deletion happens in the action
		switch (args.tableName) {
			case "settings":
				return (await ctx.db.query("settings").collect()).map((r) => r._id);
			case "qualityProfiles":
				return (await ctx.db.query("qualityProfiles").collect()).map((r) => r._id);
			case "qualityDefinitions":
				return (await ctx.db.query("qualityDefinitions").collect()).map((r) => r._id);
			case "customFormats":
				return (await ctx.db.query("customFormats").collect()).map((r) => r._id);
			case "customFormatScores":
				return (await ctx.db.query("customFormatScores").collect()).map((r) => r._id);
			case "indexers":
				return (await ctx.db.query("indexers").collect()).map((r) => r._id);
			case "downloadClients":
				return (await ctx.db.query("downloadClients").collect()).map((r) => r._id);
			case "rootFolders":
				return (await ctx.db.query("rootFolders").collect()).map((r) => r._id);
			case "tags":
				return (await ctx.db.query("tags").collect()).map((r) => r._id);
			case "webhooks":
				return (await ctx.db.query("webhooks").collect()).map((r) => r._id);
			case "namingPresets":
				return (await ctx.db.query("namingPresets").collect()).map((r) => r._id);
			case "restrictions":
				return (await ctx.db.query("restrictions").collect()).map((r) => r._id);
			case "media":
				return (await ctx.db.query("media").collect()).map((r) => r._id);
			case "seasons":
				return (await ctx.db.query("seasons").collect()).map((r) => r._id);
			case "episodes":
				return (await ctx.db.query("episodes").collect()).map((r) => r._id);
			case "mediaFiles":
				return (await ctx.db.query("mediaFiles").collect()).map((r) => r._id);
			case "albums":
				return (await ctx.db.query("albums").collect()).map((r) => r._id);
			case "tracks":
				return (await ctx.db.query("tracks").collect()).map((r) => r._id);
			case "movieMetadata":
				return (await ctx.db.query("movieMetadata").collect()).map((r) => r._id);
			case "artistMetadata":
				return (await ctx.db.query("artistMetadata").collect()).map((r) => r._id);
			case "collections":
				return (await ctx.db.query("collections").collect()).map((r) => r._id);
			default:
				return [];
		}
	},
});

import { internalMutation } from "./_generated/server";

export const deleteRecords = internalMutation({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		for (const id of args.ids) {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: Dynamic table deletion requires any type
				await ctx.db.delete(id as any);
			} catch {
				// Record may already be deleted, continue
			}
		}
	},
});

export const insertRecords = internalMutation({
	args: {
		tableName: v.string(),
		records: v.array(v.any()),
	},
	handler: async (ctx, args) => {
		let inserted = 0;

		for (const record of args.records) {
			try {
				switch (args.tableName) {
					case "settings":
						await ctx.db.insert("settings", record);
						break;
					case "qualityProfiles":
						await ctx.db.insert("qualityProfiles", record);
						break;
					case "qualityDefinitions":
						await ctx.db.insert("qualityDefinitions", record);
						break;
					case "customFormats":
						await ctx.db.insert("customFormats", record);
						break;
					case "customFormatScores":
						await ctx.db.insert("customFormatScores", record);
						break;
					case "indexers":
						await ctx.db.insert("indexers", record);
						break;
					case "downloadClients":
						await ctx.db.insert("downloadClients", record);
						break;
					case "rootFolders":
						await ctx.db.insert("rootFolders", record);
						break;
					case "tags":
						await ctx.db.insert("tags", record);
						break;
					case "webhooks":
						await ctx.db.insert("webhooks", record);
						break;
					case "namingPresets":
						await ctx.db.insert("namingPresets", record);
						break;
					case "restrictions":
						await ctx.db.insert("restrictions", record);
						break;
					case "media":
						await ctx.db.insert("media", record);
						break;
					case "seasons":
						await ctx.db.insert("seasons", record);
						break;
					case "episodes":
						await ctx.db.insert("episodes", record);
						break;
					case "mediaFiles":
						await ctx.db.insert("mediaFiles", record);
						break;
					case "albums":
						await ctx.db.insert("albums", record);
						break;
					case "tracks":
						await ctx.db.insert("tracks", record);
						break;
					case "movieMetadata":
						await ctx.db.insert("movieMetadata", record);
						break;
					case "artistMetadata":
						await ctx.db.insert("artistMetadata", record);
						break;
					case "collections":
						await ctx.db.insert("collections", record);
						break;
				}
				inserted++;
			} catch (error) {
				console.error(`Failed to insert record into ${args.tableName}:`, error);
			}
		}

		return inserted;
	},
});

// ============================================================================
// Import Action
// ============================================================================

interface ImportSummary {
	success: boolean;
	mode: "merge" | "replace";
	imported: Record<string, number>;
	errors: string[];
}

/**
 * Import backup data into the database
 */
export const importBackup = action({
	args: {
		backup: v.object({
			version: v.string(),
			exportedAt: v.number(),
			appName: v.literal("idkarr"),
			data: v.object({
				settings: v.optional(v.any()),
				qualityProfiles: v.optional(v.array(v.any())),
				qualityDefinitions: v.optional(v.array(v.any())),
				customFormats: v.optional(v.array(v.any())),
				customFormatScores: v.optional(v.array(v.any())),
				indexers: v.optional(v.array(v.any())),
				downloadClients: v.optional(v.array(v.any())),
				rootFolders: v.optional(v.array(v.any())),
				tags: v.optional(v.array(v.any())),
				webhooks: v.optional(v.array(v.any())),
				namingPresets: v.optional(v.array(v.any())),
				restrictions: v.optional(v.array(v.any())),
				media: v.optional(v.array(v.any())),
				seasons: v.optional(v.array(v.any())),
				episodes: v.optional(v.array(v.any())),
				mediaFiles: v.optional(v.array(v.any())),
				albums: v.optional(v.array(v.any())),
				tracks: v.optional(v.array(v.any())),
				movieMetadata: v.optional(v.array(v.any())),
				artistMetadata: v.optional(v.array(v.any())),
				collections: v.optional(v.array(v.any())),
			}),
		}),
		mode: v.union(v.literal("merge"), v.literal("replace")),
	},
	handler: async (ctx, args): Promise<ImportSummary> => {
		const { backup, mode } = args;
		const errors: string[] = [];
		const imported: Record<string, number> = {};

		// Validate version compatibility
		const [majorVersion] = backup.version.split(".");
		const [currentMajor] = BACKUP_VERSION.split(".");

		if (majorVersion !== currentMajor) {
			throw new Error(
				`Incompatible backup version: ${backup.version}. Current version: ${BACKUP_VERSION}`,
			);
		}

		// Define import order (tables with no dependencies first)
		const importOrder: BackupSection[] = [
			"tags",
			"qualityDefinitions",
			"customFormats",
			"namingPresets",
			"collections",
			"rootFolders",
			"downloadClients",
			"indexers",
			"webhooks",
			"restrictions",
			"qualityProfiles",
			"customFormatScores",
			"settings",
			"media",
			"seasons",
			"episodes",
			"mediaFiles",
			"albums",
			"tracks",
			"movieMetadata",
			"artistMetadata",
		];

		// If replace mode, clear existing data first (in reverse order to handle dependencies)
		if (mode === "replace") {
			const clearOrder = [...importOrder].reverse();

			for (const section of clearOrder) {
				if (backup.data[section] !== undefined) {
					try {
						const ids = await ctx.runQuery(internal.backup.clearTable, {
							tableName: section,
						});
						if (ids.length > 0) {
							await ctx.runMutation(internal.backup.deleteRecords, {
								ids: ids as string[],
							});
						}
					} catch (error) {
						errors.push(`Failed to clear ${section}: ${error}`);
					}
				}
			}
		}

		// Import data in order
		for (const section of importOrder) {
			const sectionData = backup.data[section];

			if (sectionData === undefined) {
				continue;
			}

			try {
				// Handle settings specially (it's an object, not an array)
				if (section === "settings" && sectionData) {
					const count = await ctx.runMutation(internal.backup.insertRecords, {
						tableName: section,
						records: [sectionData],
					});
					imported[section] = count;
				} else if (Array.isArray(sectionData) && sectionData.length > 0) {
					const count = await ctx.runMutation(internal.backup.insertRecords, {
						tableName: section,
						records: sectionData,
					});
					imported[section] = count;
				}
			} catch (error) {
				errors.push(`Failed to import ${section}: ${error}`);
			}
		}

		return {
			success: errors.length === 0,
			mode,
			imported,
			errors,
		};
	},
});

// ============================================================================
// Utility Queries
// ============================================================================

/**
 * Get list of available backup sections
 */
export const getAvailableSections = action({
	args: {},
	handler: async (): Promise<BackupSection[]> => {
		return ALL_SECTIONS;
	},
});
