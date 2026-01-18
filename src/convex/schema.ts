import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// Shared Type Validators (reusable across tables)
// ============================================================================

// Media types supported by idkarr
export const mediaTypeValidator = v.union(
	v.literal("tv"),
	v.literal("movie"),
	v.literal("anime"),
	v.literal("music"),
);

// Media status values
export const mediaStatusValidator = v.union(
	v.literal("continuing"),
	v.literal("ended"),
	v.literal("upcoming"),
	v.literal("released"),
	v.literal("inCinemas"),
	v.literal("announced"),
	v.literal("unknown"),
);

// User roles
export const userRoleValidator = v.union(
	v.literal("admin"),
	v.literal("user"),
	v.literal("limited"),
);

// Quality source types
export const qualitySourceValidator = v.union(
	v.literal("unknown"),
	v.literal("cam"),
	v.literal("telesync"),
	v.literal("telecine"),
	v.literal("workprint"),
	v.literal("dvd"),
	v.literal("tv"),
	v.literal("webdl"),
	v.literal("webrip"),
	v.literal("bluray"),
	v.literal("remux"),
);

// Resolution values
export const resolutionValidator = v.union(
	v.literal("unknown"),
	v.literal("r480p"),
	v.literal("r576p"),
	v.literal("r720p"),
	v.literal("r1080p"),
	v.literal("r2160p"),
);

// Download client types
export const downloadClientTypeValidator = v.union(
	v.literal("qbittorrent"),
	v.literal("transmission"),
	v.literal("deluge"),
	v.literal("rtorrent"),
	v.literal("sabnzbd"),
	v.literal("nzbget"),
);

// Indexer protocol types
export const indexerProtocolValidator = v.union(v.literal("torznab"), v.literal("newznab"));

// Request status values
export const requestStatusValidator = v.union(
	v.literal("pending"),
	v.literal("approved"),
	v.literal("denied"),
	v.literal("available"),
);

// Naming preset type (built-in vs custom)
export const namingPresetTypeValidator = v.union(v.literal("built-in"), v.literal("custom"));

// Custom format condition types
export const customFormatConditionTypeValidator = v.union(
	v.literal("releaseName"), // Match against full release name
	v.literal("releaseGroup"), // Match against release group
	v.literal("source"), // Match against source (WEB-DL, BluRay, etc.)
	v.literal("resolution"), // Match against resolution
	v.literal("codec"), // Match against video codec (x264, x265, etc.)
	v.literal("audioCodec"), // Match against audio codec
	v.literal("audioChannels"), // Match against audio channels
	v.literal("language"), // Match against language
	v.literal("edition"), // Match against edition (Director's Cut, etc.)
	v.literal("size"), // Match against file size
	v.literal("indexerFlag"), // Match against indexer flags (freeleech, etc.)
);

// ============================================================================
// Schema Definition
// ============================================================================

export default defineSchema({
	// -------------------------------------------------------------------------
	// Users table - populated by auth
	// -------------------------------------------------------------------------
	users: defineTable({
		name: v.string(),
		email: v.string(),
		role: userRoleValidator,
		createdAt: v.number(),
	}).index("by_email", ["email"]),

	// -------------------------------------------------------------------------
	// Settings table - singleton pattern (single row for app settings)
	// -------------------------------------------------------------------------
	settings: defineTable({
		// Instance identification
		instanceName: v.string(),

		// Default configurations
		defaultQualityProfileId: v.optional(v.id("qualityProfiles")),

		// Naming preset reference
		activeNamingPresetId: v.optional(v.id("namingPresets")),

		// TRaSH Guides integration
		trashSyncEnabled: v.boolean(),
		trashLastSync: v.optional(v.number()),

		// Timestamps
		updatedAt: v.number(),
	}),

	// -------------------------------------------------------------------------
	// Root Folders - storage locations for media
	// -------------------------------------------------------------------------
	rootFolders: defineTable({
		path: v.string(),
		mediaType: mediaTypeValidator,
		freeSpace: v.optional(v.number()), // in bytes
		totalSpace: v.optional(v.number()), // in bytes
		isDefault: v.boolean(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_mediaType", ["mediaType"])
		.index("by_path", ["path"]),

	// -------------------------------------------------------------------------
	// Naming Presets - file naming format templates
	// -------------------------------------------------------------------------
	namingPresets: defineTable({
		name: v.string(),
		type: namingPresetTypeValidator,

		// TV Series naming formats
		// Tokens: {Series Title}, {Series TitleYear}, {Season}, {Episode}, {Episode Title}, {Quality}, {Release Group}
		seriesFolderFormat: v.optional(v.string()), // e.g., "{Series Title} ({Year})"
		seasonFolderFormat: v.optional(v.string()), // e.g., "Season {Season:00}"
		episodeFormat: v.optional(v.string()), // e.g., "{Series Title} - S{Season:00}E{Episode:00} - {Episode Title}"

		// Movie naming formats
		// Tokens: {Movie Title}, {Year}, {Quality}, {Release Group}, {Edition}
		movieFolderFormat: v.optional(v.string()), // e.g., "{Movie Title} ({Year})"
		movieFormat: v.optional(v.string()), // e.g., "{Movie Title} ({Year}) {Quality}"

		// Music naming formats
		// Tokens: {Artist Name}, {Album Title}, {Year}, {Track Number}, {Track Title}, {Quality}
		artistFolderFormat: v.optional(v.string()), // e.g., "{Artist Name}"
		albumFolderFormat: v.optional(v.string()), // e.g., "{Album Title} ({Year})"
		trackFormat: v.optional(v.string()), // e.g., "{Track Number:00} - {Track Title}"

		// Anime uses series formats with additional tokens: {Absolute Episode}, {Release Group}

		// Common settings
		replaceSpaces: v.optional(v.boolean()), // Replace spaces with dots or underscores
		spaceReplacement: v.optional(v.string()), // Character to replace spaces with (e.g., ".", "_")
		colonReplacement: v.optional(v.string()), // What to replace colons with (e.g., " -", "", etc.)

		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_name", ["name"])
		.index("by_type", ["type"]),

	// -------------------------------------------------------------------------
	// Quality Definitions - defines quality tiers (HDTV, WEB-DL, BluRay, etc.)
	// -------------------------------------------------------------------------
	qualityDefinitions: defineTable({
		name: v.string(), // e.g., "HDTV-720p", "WEB-DL 1080p", "BluRay-2160p"
		source: qualitySourceValidator,
		resolution: resolutionValidator,
		// Size limits in MB per minute of content
		minSize: v.number(),
		maxSize: v.number(),
		preferredSize: v.optional(v.number()),
		// Display order (lower = better quality typically)
		weight: v.number(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_source", ["source"])
		.index("by_resolution", ["resolution"])
		.index("by_weight", ["weight"]),

	// -------------------------------------------------------------------------
	// Quality Profiles - groups of quality definitions with preferences
	// -------------------------------------------------------------------------
	qualityProfiles: defineTable({
		name: v.string(),
		// Whether upgrades are allowed once a file exists
		upgradeAllowed: v.boolean(),
		// The quality ID at which upgrades stop (cutoff)
		cutoffQualityId: v.optional(v.id("qualityDefinitions")),
		// Ordered list of quality items (first = lowest priority, last = highest)
		// Each item has: qualityId, enabled
		items: v.array(
			v.object({
				qualityId: v.id("qualityDefinitions"),
				enabled: v.boolean(),
			}),
		),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_name", ["name"]),

	// -------------------------------------------------------------------------
	// Custom Formats - rules for scoring and filtering releases
	// -------------------------------------------------------------------------
	customFormats: defineTable({
		name: v.string(),
		// Whether to include format name when renaming files
		includeWhenRenaming: v.boolean(),
		// Conditions that must match for this format to apply
		// All required conditions must match, plus at least one non-required condition
		conditions: v.array(
			v.object({
				type: customFormatConditionTypeValidator,
				// Regex pattern to match (or value for non-regex types like size)
				pattern: v.string(),
				// If true, the condition matches when the pattern does NOT match
				negate: v.boolean(),
				// If true, this condition MUST match for the format to apply
				required: v.boolean(),
			}),
		),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_name", ["name"]),

	// -------------------------------------------------------------------------
	// Custom Format Scores - links custom formats to quality profiles with scores
	// -------------------------------------------------------------------------
	customFormatScores: defineTable({
		profileId: v.id("qualityProfiles"),
		formatId: v.id("customFormats"),
		// Score can be positive (preferred) or negative (penalized)
		score: v.number(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_profile", ["profileId"])
		.index("by_format", ["formatId"])
		.index("by_profile_format", ["profileId", "formatId"]),

	// -------------------------------------------------------------------------
	// Tags - for organizing and filtering content
	// -------------------------------------------------------------------------
	tags: defineTable({
		name: v.string(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_name", ["name"]),

	// -------------------------------------------------------------------------
	// Restrictions - release name filters (must contain/must not contain)
	// -------------------------------------------------------------------------
	restrictions: defineTable({
		name: v.string(),
		// Terms that MUST appear in release names (OR logic - any match passes)
		mustContain: v.array(v.string()),
		// Terms that MUST NOT appear in release names (any match fails)
		mustNotContain: v.array(v.string()),
		// Tags that this restriction applies to (empty = applies to all)
		tagIds: v.array(v.id("tags")),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_name", ["name"]),

	// -------------------------------------------------------------------------
	// TRaSH Guide Formats - imported custom formats from TRaSH Guides
	// -------------------------------------------------------------------------
	trashGuideFormats: defineTable({
		// TRaSH Guides identifier
		trashId: v.string(),
		name: v.string(),
		// Category from TRaSH (e.g., "Unwanted", "HD Bluray Tier 01", "WEB Tier 01")
		category: v.string(),
		// Media type this format applies to
		mediaType: v.union(v.literal("movie"), v.literal("tv"), v.literal("anime")),
		// The imported conditions (same structure as customFormats)
		conditions: v.array(
			v.object({
				type: customFormatConditionTypeValidator,
				pattern: v.string(),
				negate: v.boolean(),
				required: v.boolean(),
			}),
		),
		// Whether to include in file naming
		includeWhenRenaming: v.boolean(),
		// Recommended score from TRaSH
		recommendedScore: v.number(),
		// Link to the created custom format (if imported into customFormats)
		customFormatId: v.optional(v.id("customFormats")),
		// Sync metadata
		lastSyncAt: v.number(),
		trashGuideVersion: v.optional(v.string()),
	})
		.index("by_trashId", ["trashId"])
		.index("by_category", ["category"])
		.index("by_mediaType", ["mediaType"]),

	// -------------------------------------------------------------------------
	// Media table - unified for all media types
	// -------------------------------------------------------------------------
	media: defineTable({
		mediaType: mediaTypeValidator,
		title: v.string(),
		sortTitle: v.string(),
		year: v.optional(v.number()),
		overview: v.optional(v.string()),
		status: mediaStatusValidator,
		monitored: v.boolean(),
		path: v.optional(v.string()),
		// Configuration references
		qualityProfileId: v.optional(v.id("qualityProfiles")),
		rootFolderId: v.optional(v.id("rootFolders")),
		// Tags for routing
		tagIds: v.optional(v.array(v.id("tags"))),
		// External IDs
		tmdbId: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
		imdbId: v.optional(v.string()),
		// Timestamps
		added: v.number(),
		lastInfoSync: v.optional(v.number()),
	})
		.index("by_type", ["mediaType"])
		.index("by_title", ["sortTitle"])
		.index("by_tmdb", ["tmdbId"])
		.index("by_tvdb", ["tvdbId"])
		.index("by_qualityProfile", ["qualityProfileId"]),

	// -------------------------------------------------------------------------
	// Seasons - for TV series and anime
	// -------------------------------------------------------------------------
	seasons: defineTable({
		mediaId: v.id("media"),
		seasonNumber: v.number(),
		title: v.optional(v.string()), // e.g., "Season 1" or custom title
		overview: v.optional(v.string()),
		monitored: v.boolean(),
		// Statistics (computed)
		episodeCount: v.optional(v.number()),
		episodeFileCount: v.optional(v.number()),
		// Images
		posterUrl: v.optional(v.string()),
		// Timestamps
		airDate: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_media_season", ["mediaId", "seasonNumber"]),

	// -------------------------------------------------------------------------
	// Episodes - individual episodes for TV/anime
	// -------------------------------------------------------------------------
	episodes: defineTable({
		mediaId: v.id("media"),
		seasonId: v.id("seasons"),
		episodeNumber: v.number(),
		absoluteEpisodeNumber: v.optional(v.number()), // For anime
		title: v.string(),
		overview: v.optional(v.string()),
		monitored: v.boolean(),
		// Air information
		airDate: v.optional(v.number()),
		airDateUtc: v.optional(v.number()),
		// File information
		hasFile: v.boolean(),
		episodeFileId: v.optional(v.id("mediaFiles")),
		// Runtime in minutes
		runtime: v.optional(v.number()),
		// External IDs
		tvdbId: v.optional(v.number()),
		imdbId: v.optional(v.string()),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_season", ["seasonId"])
		.index("by_media_episode", ["mediaId", "episodeNumber"])
		.index("by_airDate", ["airDate"])
		.index("by_tvdb", ["tvdbId"]),

	// -------------------------------------------------------------------------
	// Media Files - actual files on disk
	// -------------------------------------------------------------------------
	mediaFiles: defineTable({
		mediaId: v.id("media"),
		// File location
		path: v.string(),
		relativePath: v.string(),
		// File properties
		size: v.number(), // in bytes
		// Quality information
		qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
		qualitySource: v.optional(qualitySourceValidator),
		qualityResolution: v.optional(resolutionValidator),
		// Media info
		videoCodec: v.optional(v.string()),
		audioCodec: v.optional(v.string()),
		audioChannels: v.optional(v.string()),
		// Release info
		releaseGroup: v.optional(v.string()),
		releaseHash: v.optional(v.string()),
		sceneName: v.optional(v.string()),
		// Custom format scores
		customFormatScore: v.optional(v.number()),
		matchedFormatIds: v.optional(v.array(v.id("customFormats"))),
		// Timestamps
		dateAdded: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_path", ["path"])
		.index("by_dateAdded", ["dateAdded"]),

	// -------------------------------------------------------------------------
	// Movie-specific extensions (linked to media table)
	// -------------------------------------------------------------------------
	movieMetadata: defineTable({
		mediaId: v.id("media"),
		// Movie-specific fields
		runtime: v.optional(v.number()), // in minutes
		inCinemas: v.optional(v.number()), // timestamp
		physicalRelease: v.optional(v.number()), // timestamp
		digitalRelease: v.optional(v.number()), // timestamp
		// Collection info
		collectionTmdbId: v.optional(v.number()),
		collectionTitle: v.optional(v.string()),
		// Ratings
		certification: v.optional(v.string()), // e.g., "PG-13", "R"
		ratings: v.optional(
			v.object({
				imdb: v.optional(v.number()),
				tmdb: v.optional(v.number()),
				rottenTomatoes: v.optional(v.number()),
			}),
		),
		// Additional metadata
		studio: v.optional(v.string()),
		youtubeTrailerId: v.optional(v.string()),
		// File reference (movies have single file)
		movieFileId: v.optional(v.id("mediaFiles")),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_media", ["mediaId"]),

	// -------------------------------------------------------------------------
	// Music Artists (linked to media table)
	// -------------------------------------------------------------------------
	artistMetadata: defineTable({
		mediaId: v.id("media"),
		// Artist-specific fields
		disambiguation: v.optional(v.string()), // For artists with same name
		artistType: v.optional(v.string()), // Person, Group, Orchestra, etc.
		// External IDs
		musicBrainzId: v.optional(v.string()),
		// Statistics
		albumCount: v.optional(v.number()),
		trackCount: v.optional(v.number()),
		// Links
		links: v.optional(
			v.array(
				v.object({
					name: v.string(),
					url: v.string(),
				}),
			),
		),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_media", ["mediaId"]),

	// -------------------------------------------------------------------------
	// Music Albums
	// -------------------------------------------------------------------------
	albums: defineTable({
		mediaId: v.id("media"), // Links to artist in media table
		title: v.string(),
		overview: v.optional(v.string()),
		monitored: v.boolean(),
		// Album info
		albumType: v.optional(v.string()), // Album, EP, Single, etc.
		releaseDate: v.optional(v.number()),
		// External IDs
		musicBrainzId: v.optional(v.string()),
		// Statistics
		trackCount: v.optional(v.number()),
		trackFileCount: v.optional(v.number()),
		// Images
		coverUrl: v.optional(v.string()),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_releaseDate", ["releaseDate"]),

	// -------------------------------------------------------------------------
	// Music Tracks
	// -------------------------------------------------------------------------
	tracks: defineTable({
		mediaId: v.id("media"), // Links to artist
		albumId: v.id("albums"),
		trackNumber: v.number(),
		discNumber: v.optional(v.number()),
		title: v.string(),
		// Duration in milliseconds
		duration: v.optional(v.number()),
		// File info
		hasFile: v.boolean(),
		trackFileId: v.optional(v.id("mediaFiles")),
		// External IDs
		musicBrainzId: v.optional(v.string()),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_album", ["albumId"])
		.index("by_album_track", ["albumId", "trackNumber"]),

	// -------------------------------------------------------------------------
	// Download Clients - torrent/usenet client configurations
	// -------------------------------------------------------------------------
	downloadClients: defineTable({
		name: v.string(),
		type: downloadClientTypeValidator,
		enabled: v.boolean(),
		// Connection settings
		host: v.string(),
		port: v.number(),
		useSsl: v.boolean(),
		// Authentication
		username: v.optional(v.string()),
		password: v.optional(v.string()),
		apiKey: v.optional(v.string()),
		// Priority (lower = more preferred)
		priority: v.number(),
		// Tags for routing (downloads go to clients with matching tags)
		tagIds: v.array(v.id("tags")),
		// Category/directory settings
		category: v.optional(v.string()), // Category name in client
		directory: v.optional(v.string()), // Override download directory
		// Remove on completion
		removeCompletedDownloads: v.boolean(),
		removeFailedDownloads: v.boolean(),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_type", ["type"])
		.index("by_name", ["name"])
		.index("by_enabled", ["enabled"]),

	// -------------------------------------------------------------------------
	// Indexers - torrent/usenet indexer configurations
	// -------------------------------------------------------------------------
	indexers: defineTable({
		name: v.string(),
		protocol: indexerProtocolValidator,
		enabled: v.boolean(),
		// Connection settings
		baseUrl: v.string(),
		apiPath: v.optional(v.string()), // Default: /api
		apiKey: v.string(),
		// Capabilities
		supportsSearch: v.boolean(),
		supportsTvSearch: v.boolean(),
		supportsMovieSearch: v.boolean(),
		supportsMusicSearch: v.boolean(),
		supportsBookSearch: v.boolean(),
		// Categories supported (indexer-specific category IDs)
		tvCategories: v.array(v.number()),
		movieCategories: v.array(v.number()),
		musicCategories: v.array(v.number()),
		animeCategories: v.array(v.number()),
		// Priority (lower = searched first)
		priority: v.number(),
		// Tags for routing (only media with matching tags uses this indexer)
		tagIds: v.array(v.id("tags")),
		// Limits
		downloadClientId: v.optional(v.id("downloadClients")), // Preferred download client
		seedRatioLimit: v.optional(v.number()),
		seedTimeLimit: v.optional(v.number()), // in minutes
		// Privacy
		isPrivate: v.boolean(),
		// Health tracking
		lastRssSync: v.optional(v.number()),
		lastSearchSync: v.optional(v.number()),
		failureCount: v.optional(v.number()),
		disabledUntil: v.optional(v.number()),
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_protocol", ["protocol"])
		.index("by_name", ["name"])
		.index("by_enabled", ["enabled"]),

	// -------------------------------------------------------------------------
	// Download Queue - active and historical downloads
	// -------------------------------------------------------------------------
	downloadQueue: defineTable({
		// What is being downloaded
		mediaId: v.id("media"),
		episodeId: v.optional(v.id("episodes")), // For TV/anime
		albumId: v.optional(v.id("albums")), // For music
		// Download information
		title: v.string(), // Release title
		size: v.number(), // in bytes
		protocol: indexerProtocolValidator,
		// Status
		status: v.union(
			v.literal("queued"),
			v.literal("downloading"),
			v.literal("paused"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("warning"),
			v.literal("importing"),
		),
		// Progress
		progress: v.number(), // 0-100
		downloadedSize: v.optional(v.number()),
		eta: v.optional(v.number()), // estimated time remaining in seconds
		// Error tracking
		errorMessage: v.optional(v.string()),
		// References
		indexerId: v.optional(v.id("indexers")),
		downloadClientId: v.optional(v.id("downloadClients")),
		// Client-specific identifiers
		downloadId: v.optional(v.string()), // ID in the download client
		// Quality information
		qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
		customFormatScore: v.optional(v.number()),
		// Timestamps
		addedAt: v.number(),
		startedAt: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_status", ["status"])
		.index("by_downloadClient", ["downloadClientId"])
		.index("by_addedAt", ["addedAt"]),

	// -------------------------------------------------------------------------
	// Download History - completed/failed download records
	// -------------------------------------------------------------------------
	downloadHistory: defineTable({
		mediaId: v.id("media"),
		episodeId: v.optional(v.id("episodes")),
		albumId: v.optional(v.id("albums")),
		// What was downloaded
		title: v.string(),
		size: v.number(),
		protocol: indexerProtocolValidator,
		// Result
		eventType: v.union(
			v.literal("grabbed"), // Download started
			v.literal("downloadCompleted"), // Download finished
			v.literal("importCompleted"), // File imported
			v.literal("downloadFailed"), // Download failed
			v.literal("importFailed"), // Import failed
			v.literal("deleted"), // File deleted
		),
		// Quality
		qualityDefinitionId: v.optional(v.id("qualityDefinitions")),
		customFormatScore: v.optional(v.number()),
		// References
		indexerId: v.optional(v.id("indexers")),
		downloadClientId: v.optional(v.id("downloadClients")),
		mediaFileId: v.optional(v.id("mediaFiles")), // If successfully imported
		// Data
		data: v.optional(v.string()), // JSON string with additional event data
		// Timestamps
		date: v.number(),
		createdAt: v.number(),
	})
		.index("by_media", ["mediaId"])
		.index("by_eventType", ["eventType"])
		.index("by_date", ["date"]),

	// -------------------------------------------------------------------------
	// Requests - user requests for media (Overseerr-like)
	// -------------------------------------------------------------------------
	requests: defineTable({
		// Request type (can request media that doesn't exist yet in library)
		mediaType: mediaTypeValidator,
		// Either links to existing media or stores external IDs for new requests
		mediaId: v.optional(v.id("media")), // If media already exists in library
		// External IDs (for requests of media not yet in library)
		tmdbId: v.optional(v.number()),
		tvdbId: v.optional(v.number()),
		musicBrainzId: v.optional(v.string()),
		// Request info
		title: v.string(), // Title of requested media
		year: v.optional(v.number()),
		// For TV series - specific seasons requested (empty = all)
		requestedSeasons: v.optional(v.array(v.number())),
		// Status
		status: requestStatusValidator,
		// Requester
		requestedBy: v.id("users"),
		// Admin who processed the request
		processedBy: v.optional(v.id("users")),
		processedAt: v.optional(v.number()),
		// Notes
		requestNote: v.optional(v.string()), // User's note with request
		responseNote: v.optional(v.string()), // Admin's response note
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_status", ["status"])
		.index("by_requestedBy", ["requestedBy"])
		.index("by_media", ["mediaId"])
		.index("by_tmdb", ["tmdbId"])
		.index("by_createdAt", ["createdAt"]),

	// -------------------------------------------------------------------------
	// Webhooks - notification endpoints
	// -------------------------------------------------------------------------
	webhooks: defineTable({
		name: v.string(),
		url: v.string(),
		enabled: v.boolean(),
		// What events trigger this webhook
		events: v.array(
			v.union(
				v.literal("onGrab"), // Download grabbed
				v.literal("onDownload"), // Download completed
				v.literal("onUpgrade"), // Quality upgrade
				v.literal("onRename"), // File renamed
				v.literal("onDelete"), // Media/file deleted
				v.literal("onHealthIssue"), // System health issue
				v.literal("onHealthRestored"), // Health issue resolved
				v.literal("onApplicationUpdate"), // App updated
				v.literal("onRequestCreated"), // New request
				v.literal("onRequestApproved"), // Request approved
				v.literal("onRequestDenied"), // Request denied
				v.literal("onRequestAvailable"), // Requested media now available
			),
		),
		// Optional tag filtering (only trigger for media with these tags)
		tagIds: v.array(v.id("tags")),
		// Authentication
		authHeader: v.optional(v.string()), // e.g., "Authorization: Bearer token"
		// Timestamps
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_name", ["name"])
		.index("by_enabled", ["enabled"]),

	// -------------------------------------------------------------------------
	// Activity Log - system events and user actions
	// -------------------------------------------------------------------------
	activityLog: defineTable({
		// Event type
		eventType: v.string(),
		// Related entities
		mediaId: v.optional(v.id("media")),
		userId: v.optional(v.id("users")),
		// Event data
		message: v.string(),
		data: v.optional(v.string()), // JSON string with additional data
		// Severity
		level: v.union(
			v.literal("info"),
			v.literal("warning"),
			v.literal("error"),
			v.literal("success"),
		),
		// Timestamp
		timestamp: v.number(),
	})
		.index("by_eventType", ["eventType"])
		.index("by_media", ["mediaId"])
		.index("by_user", ["userId"])
		.index("by_timestamp", ["timestamp"])
		.index("by_level", ["level"]),

	// -------------------------------------------------------------------------
	// System Health - health check results
	// -------------------------------------------------------------------------
	systemHealth: defineTable({
		// Check name
		name: v.string(),
		// Status
		status: v.union(v.literal("ok"), v.literal("warning"), v.literal("error")),
		// Message
		message: v.optional(v.string()),
		// Last check time
		lastCheck: v.number(),
		// Issue details
		issueType: v.optional(v.string()),
		wikiUrl: v.optional(v.string()),
	}).index("by_status", ["status"]),
});
