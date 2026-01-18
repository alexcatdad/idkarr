import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { mediaStatusValidator } from "./schema";

// ============================================================================
// Artist Queries
// ============================================================================

// List all artists
export const listArtists = query({
	args: {
		monitored: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		let artists = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "music"))
			.collect();

		if (args.monitored !== undefined) {
			artists = artists.filter((a) => a.monitored === args.monitored);
		}

		// Enrich with metadata and album counts
		const enrichedArtists = await Promise.all(
			artists.map(async (artist) => {
				const metadata = await ctx.db
					.query("artistMetadata")
					.withIndex("by_media", (q) => q.eq("mediaId", artist._id))
					.first();

				const albums = await ctx.db
					.query("albums")
					.withIndex("by_media", (q) => q.eq("mediaId", artist._id))
					.collect();

				const tracks = await ctx.db
					.query("tracks")
					.withIndex("by_media", (q) => q.eq("mediaId", artist._id))
					.collect();

				const tracksWithFiles = tracks.filter((t) => t.hasFile).length;

				return {
					...artist,
					metadata,
					albumCount: albums.length,
					trackCount: tracks.length,
					trackFileCount: tracksWithFiles,
					percentComplete:
						tracks.length > 0 ? Math.round((tracksWithFiles / tracks.length) * 100) : 0,
				};
			}),
		);

		return enrichedArtists;
	},
});

// Get a single artist by ID with full details
export const getArtist = query({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const artist = await ctx.db.get(args.id);
		if (!artist || artist.mediaType !== "music") {
			return null;
		}

		// Get metadata
		const metadata = await ctx.db
			.query("artistMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		// Get albums with track counts
		const albums = await ctx.db
			.query("albums")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.collect();

		const enrichedAlbums = await Promise.all(
			albums.map(async (album) => {
				const tracks = await ctx.db
					.query("tracks")
					.withIndex("by_album", (q) => q.eq("albumId", album._id))
					.collect();

				return {
					...album,
					trackCount: tracks.length,
					trackFileCount: tracks.filter((t) => t.hasFile).length,
				};
			}),
		);

		// Get quality profile
		const qualityProfile = artist.qualityProfileId
			? await ctx.db.get(artist.qualityProfileId)
			: null;

		// Get root folder
		const rootFolder = artist.rootFolderId ? await ctx.db.get(artist.rootFolderId) : null;

		// Get tags
		const tags = artist.tagIds ? await Promise.all(artist.tagIds.map((id) => ctx.db.get(id))) : [];

		return {
			...artist,
			metadata,
			albums: enrichedAlbums.sort((a, b) => (a.releaseDate ?? 0) - (b.releaseDate ?? 0)),
			qualityProfile,
			rootFolder,
			tags: tags.filter(Boolean),
		};
	},
});

// Search artists by name
export const searchArtists = query({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const searchLower = args.query.toLowerCase();

		const allArtists = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "music"))
			.collect();

		return allArtists.filter(
			(a) =>
				a.title.toLowerCase().includes(searchLower) ||
				a.sortTitle.toLowerCase().includes(searchLower),
		);
	},
});

// ============================================================================
// Album Queries
// ============================================================================

// List albums for an artist
export const listAlbumsByArtist = query({
	args: { mediaId: v.id("media") },
	handler: async (ctx, args) => {
		const albums = await ctx.db
			.query("albums")
			.withIndex("by_media", (q) => q.eq("mediaId", args.mediaId))
			.collect();

		// Enrich with track counts
		const enrichedAlbums = await Promise.all(
			albums.map(async (album) => {
				const tracks = await ctx.db
					.query("tracks")
					.withIndex("by_album", (q) => q.eq("albumId", album._id))
					.collect();

				return {
					...album,
					tracks,
					trackCount: tracks.length,
					trackFileCount: tracks.filter((t) => t.hasFile).length,
				};
			}),
		);

		return enrichedAlbums.sort((a, b) => (a.releaseDate ?? 0) - (b.releaseDate ?? 0));
	},
});

// Get a single album
export const getAlbum = query({
	args: { id: v.id("albums") },
	handler: async (ctx, args) => {
		const album = await ctx.db.get(args.id);
		if (!album) return null;

		// Get artist
		const artist = await ctx.db.get(album.mediaId);

		// Get tracks with files
		const tracks = await ctx.db
			.query("tracks")
			.withIndex("by_album", (q) => q.eq("albumId", args.id))
			.collect();

		const enrichedTracks = await Promise.all(
			tracks.map(async (track) => {
				const file = track.trackFileId ? await ctx.db.get(track.trackFileId) : null;
				return { ...track, file };
			}),
		);

		return {
			...album,
			artist,
			tracks: enrichedTracks.sort((a, b) => {
				const discA = a.discNumber ?? 1;
				const discB = b.discNumber ?? 1;
				if (discA !== discB) return discA - discB;
				return a.trackNumber - b.trackNumber;
			}),
			trackCount: tracks.length,
			trackFileCount: tracks.filter((t) => t.hasFile).length,
		};
	},
});

// Get missing albums (monitored but no files)
export const getMissingAlbums = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const resultLimit = args.limit ?? 50;

		const allAlbums = await ctx.db.query("albums").collect();
		const monitoredAlbums = allAlbums.filter((a) => a.monitored);

		const missing: Array<{
			album: (typeof allAlbums)[0];
			artist: Awaited<ReturnType<typeof ctx.db.get>>;
		}> = [];

		for (const album of monitoredAlbums) {
			const tracks = await ctx.db
				.query("tracks")
				.withIndex("by_album", (q) => q.eq("albumId", album._id))
				.collect();

			const hasAllFiles = tracks.length > 0 && tracks.every((t) => t.hasFile);

			if (!hasAllFiles) {
				const artist = await ctx.db.get(album.mediaId);
				missing.push({ album, artist });
			}
		}

		return missing.slice(0, resultLimit).map(({ album, artist }) => ({
			...album,
			artist,
		}));
	},
});

// ============================================================================
// Track Queries
// ============================================================================

// List tracks for an album
export const listTracksByAlbum = query({
	args: { albumId: v.id("albums") },
	handler: async (ctx, args) => {
		const tracks = await ctx.db
			.query("tracks")
			.withIndex("by_album", (q) => q.eq("albumId", args.albumId))
			.collect();

		// Enrich with file info
		const enrichedTracks = await Promise.all(
			tracks.map(async (track) => {
				const file = track.trackFileId ? await ctx.db.get(track.trackFileId) : null;
				return { ...track, file };
			}),
		);

		return enrichedTracks.sort((a, b) => {
			const discA = a.discNumber ?? 1;
			const discB = b.discNumber ?? 1;
			if (discA !== discB) return discA - discB;
			return a.trackNumber - b.trackNumber;
		});
	},
});

// Get a single track
export const getTrack = query({
	args: { id: v.id("tracks") },
	handler: async (ctx, args) => {
		const track = await ctx.db.get(args.id);
		if (!track) return null;

		const album = await ctx.db.get(track.albumId);
		const artist = await ctx.db.get(track.mediaId);
		const file = track.trackFileId ? await ctx.db.get(track.trackFileId) : null;

		return {
			...track,
			album,
			artist,
			file,
		};
	},
});

// ============================================================================
// Artist Mutations
// ============================================================================

// Add a new artist
export const addArtist = mutation({
	args: {
		title: v.string(), // Artist name
		overview: v.optional(v.string()),
		status: v.optional(mediaStatusValidator),
		path: v.optional(v.string()),
		qualityProfileId: v.optional(v.id("qualityProfiles")),
		rootFolderId: v.optional(v.id("rootFolders")),
		tagIds: v.optional(v.array(v.id("tags"))),
		monitored: v.optional(v.boolean()),
		// Metadata fields
		disambiguation: v.optional(v.string()),
		artistType: v.optional(v.string()),
		musicBrainzId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const sortTitle = args.title.toLowerCase().replace(/^(the|a|an)\s+/i, "");

		// Insert media record
		const artistId = await ctx.db.insert("media", {
			mediaType: "music",
			title: args.title,
			sortTitle,
			overview: args.overview,
			status: args.status ?? "continuing",
			monitored: args.monitored ?? true,
			path: args.path,
			qualityProfileId: args.qualityProfileId,
			rootFolderId: args.rootFolderId,
			tagIds: args.tagIds,
			added: now,
		});

		// Insert metadata record
		await ctx.db.insert("artistMetadata", {
			mediaId: artistId,
			disambiguation: args.disambiguation,
			artistType: args.artistType,
			musicBrainzId: args.musicBrainzId,
			createdAt: now,
			updatedAt: now,
		});

		return artistId;
	},
});

// Update an artist
export const updateArtist = mutation({
	args: {
		id: v.id("media"),
		title: v.optional(v.string()),
		overview: v.optional(v.string()),
		status: v.optional(mediaStatusValidator),
		monitored: v.optional(v.boolean()),
		path: v.optional(v.string()),
		qualityProfileId: v.optional(v.id("qualityProfiles")),
		rootFolderId: v.optional(v.id("rootFolders")),
		tagIds: v.optional(v.array(v.id("tags"))),
		// Metadata fields
		disambiguation: v.optional(v.string()),
		artistType: v.optional(v.string()),
		musicBrainzId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const artist = await ctx.db.get(args.id);
		if (!artist || artist.mediaType !== "music") {
			throw new Error("Artist not found");
		}

		const now = Date.now();
		const mediaUpdates: Record<string, unknown> = {
			lastInfoSync: now,
		};

		if (args.title !== undefined) {
			mediaUpdates.title = args.title;
			mediaUpdates.sortTitle = args.title.toLowerCase().replace(/^(the|a|an)\s+/i, "");
		}
		if (args.overview !== undefined) mediaUpdates.overview = args.overview;
		if (args.status !== undefined) mediaUpdates.status = args.status;
		if (args.monitored !== undefined) mediaUpdates.monitored = args.monitored;
		if (args.path !== undefined) mediaUpdates.path = args.path;
		if (args.qualityProfileId !== undefined) mediaUpdates.qualityProfileId = args.qualityProfileId;
		if (args.rootFolderId !== undefined) mediaUpdates.rootFolderId = args.rootFolderId;
		if (args.tagIds !== undefined) mediaUpdates.tagIds = args.tagIds;

		await ctx.db.patch(args.id, mediaUpdates);

		// Update metadata
		const metadata = await ctx.db
			.query("artistMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		if (metadata) {
			const metadataUpdates: Record<string, unknown> = { updatedAt: now };

			if (args.disambiguation !== undefined) metadataUpdates.disambiguation = args.disambiguation;
			if (args.artistType !== undefined) metadataUpdates.artistType = args.artistType;
			if (args.musicBrainzId !== undefined) metadataUpdates.musicBrainzId = args.musicBrainzId;

			await ctx.db.patch(metadata._id, metadataUpdates);
		}

		return await ctx.db.get(args.id);
	},
});

// Delete an artist and all albums/tracks
export const removeArtist = mutation({
	args: {
		id: v.id("media"),
		deleteFiles: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const artist = await ctx.db.get(args.id);
		if (!artist || artist.mediaType !== "music") {
			throw new Error("Artist not found");
		}

		// Delete all tracks
		const tracks = await ctx.db
			.query("tracks")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.collect();

		for (const track of tracks) {
			await ctx.db.delete(track._id);
		}

		// Delete all albums
		const albums = await ctx.db
			.query("albums")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.collect();

		for (const album of albums) {
			await ctx.db.delete(album._id);
		}

		// Delete metadata
		const metadata = await ctx.db
			.query("artistMetadata")
			.withIndex("by_media", (q) => q.eq("mediaId", args.id))
			.first();

		if (metadata) {
			await ctx.db.delete(metadata._id);
		}

		// Delete media files if requested
		if (args.deleteFiles) {
			const files = await ctx.db
				.query("mediaFiles")
				.withIndex("by_media", (q) => q.eq("mediaId", args.id))
				.collect();

			for (const file of files) {
				await ctx.db.delete(file._id);
			}
		}

		// Delete the artist
		await ctx.db.delete(args.id);
	},
});

// Toggle artist monitored status
export const toggleArtistMonitored = mutation({
	args: { id: v.id("media") },
	handler: async (ctx, args) => {
		const artist = await ctx.db.get(args.id);
		if (!artist || artist.mediaType !== "music") {
			throw new Error("Artist not found");
		}

		await ctx.db.patch(args.id, {
			monitored: !artist.monitored,
		});

		return !artist.monitored;
	},
});

// ============================================================================
// Album Mutations
// ============================================================================

// Add a new album
export const addAlbum = mutation({
	args: {
		mediaId: v.id("media"),
		title: v.string(),
		overview: v.optional(v.string()),
		monitored: v.optional(v.boolean()),
		albumType: v.optional(v.string()),
		releaseDate: v.optional(v.number()),
		musicBrainzId: v.optional(v.string()),
		coverUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Verify artist exists
		const artist = await ctx.db.get(args.mediaId);
		if (!artist || artist.mediaType !== "music") {
			throw new Error("Artist not found");
		}

		const now = Date.now();
		return await ctx.db.insert("albums", {
			mediaId: args.mediaId,
			title: args.title,
			overview: args.overview,
			monitored: args.monitored ?? true,
			albumType: args.albumType,
			releaseDate: args.releaseDate,
			musicBrainzId: args.musicBrainzId,
			coverUrl: args.coverUrl,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Update an album
export const updateAlbum = mutation({
	args: {
		id: v.id("albums"),
		title: v.optional(v.string()),
		overview: v.optional(v.string()),
		monitored: v.optional(v.boolean()),
		albumType: v.optional(v.string()),
		releaseDate: v.optional(v.number()),
		musicBrainzId: v.optional(v.string()),
		coverUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const album = await ctx.db.get(args.id);
		if (!album) {
			throw new Error("Album not found");
		}

		const updates: Record<string, unknown> = { updatedAt: Date.now() };

		if (args.title !== undefined) updates.title = args.title;
		if (args.overview !== undefined) updates.overview = args.overview;
		if (args.monitored !== undefined) updates.monitored = args.monitored;
		if (args.albumType !== undefined) updates.albumType = args.albumType;
		if (args.releaseDate !== undefined) updates.releaseDate = args.releaseDate;
		if (args.musicBrainzId !== undefined) updates.musicBrainzId = args.musicBrainzId;
		if (args.coverUrl !== undefined) updates.coverUrl = args.coverUrl;

		await ctx.db.patch(args.id, updates);
		return await ctx.db.get(args.id);
	},
});

// Delete an album and its tracks
export const removeAlbum = mutation({
	args: { id: v.id("albums") },
	handler: async (ctx, args) => {
		const album = await ctx.db.get(args.id);
		if (!album) {
			throw new Error("Album not found");
		}

		// Delete all tracks in this album
		const tracks = await ctx.db
			.query("tracks")
			.withIndex("by_album", (q) => q.eq("albumId", args.id))
			.collect();

		for (const track of tracks) {
			await ctx.db.delete(track._id);
		}

		await ctx.db.delete(args.id);
	},
});

// Toggle album monitored status
export const toggleAlbumMonitored = mutation({
	args: { id: v.id("albums") },
	handler: async (ctx, args) => {
		const album = await ctx.db.get(args.id);
		if (!album) {
			throw new Error("Album not found");
		}

		await ctx.db.patch(args.id, {
			monitored: !album.monitored,
			updatedAt: Date.now(),
		});

		return !album.monitored;
	},
});

// ============================================================================
// Track Mutations
// ============================================================================

// Add a new track
export const addTrack = mutation({
	args: {
		mediaId: v.id("media"),
		albumId: v.id("albums"),
		trackNumber: v.number(),
		title: v.string(),
		discNumber: v.optional(v.number()),
		duration: v.optional(v.number()),
		musicBrainzId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Verify album exists and belongs to artist
		const album = await ctx.db.get(args.albumId);
		if (!album || album.mediaId !== args.mediaId) {
			throw new Error("Album not found or does not belong to this artist");
		}

		const now = Date.now();
		return await ctx.db.insert("tracks", {
			mediaId: args.mediaId,
			albumId: args.albumId,
			trackNumber: args.trackNumber,
			discNumber: args.discNumber,
			title: args.title,
			duration: args.duration,
			hasFile: false,
			musicBrainzId: args.musicBrainzId,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// Bulk add tracks
export const bulkAddTracks = mutation({
	args: {
		mediaId: v.id("media"),
		albumId: v.id("albums"),
		tracks: v.array(
			v.object({
				trackNumber: v.number(),
				title: v.string(),
				discNumber: v.optional(v.number()),
				duration: v.optional(v.number()),
				musicBrainzId: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Verify album exists and belongs to artist
		const album = await ctx.db.get(args.albumId);
		if (!album || album.mediaId !== args.mediaId) {
			throw new Error("Album not found or does not belong to this artist");
		}

		// Get existing tracks to check for duplicates
		const existingTracks = await ctx.db
			.query("tracks")
			.withIndex("by_album", (q) => q.eq("albumId", args.albumId))
			.collect();

		const existingKeys = new Set(
			existingTracks.map((t) => `${t.discNumber ?? 1}-${t.trackNumber}`),
		);

		const now = Date.now();
		const insertedIds: string[] = [];
		let skippedCount = 0;

		for (const track of args.tracks) {
			const key = `${track.discNumber ?? 1}-${track.trackNumber}`;
			if (existingKeys.has(key)) {
				skippedCount++;
				continue;
			}

			const id = await ctx.db.insert("tracks", {
				mediaId: args.mediaId,
				albumId: args.albumId,
				trackNumber: track.trackNumber,
				discNumber: track.discNumber,
				title: track.title,
				duration: track.duration,
				hasFile: false,
				musicBrainzId: track.musicBrainzId,
				createdAt: now,
				updatedAt: now,
			});
			insertedIds.push(id);
		}

		// Update album track count
		const allTracks = await ctx.db
			.query("tracks")
			.withIndex("by_album", (q) => q.eq("albumId", args.albumId))
			.collect();

		await ctx.db.patch(args.albumId, {
			trackCount: allTracks.length,
			updatedAt: now,
		});

		return {
			insertedCount: insertedIds.length,
			skippedCount,
		};
	},
});

// Link a media file to a track
export const linkTrackFile = mutation({
	args: {
		id: v.id("tracks"),
		fileId: v.id("mediaFiles"),
	},
	handler: async (ctx, args) => {
		const track = await ctx.db.get(args.id);
		if (!track) {
			throw new Error("Track not found");
		}

		const file = await ctx.db.get(args.fileId);
		if (!file) {
			throw new Error("Media file not found");
		}

		if (file.mediaId !== track.mediaId) {
			throw new Error("File does not belong to the same artist");
		}

		await ctx.db.patch(args.id, {
			trackFileId: args.fileId,
			hasFile: true,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(args.id);
	},
});

// Unlink a media file from a track
export const unlinkTrackFile = mutation({
	args: { id: v.id("tracks") },
	handler: async (ctx, args) => {
		const track = await ctx.db.get(args.id);
		if (!track) {
			throw new Error("Track not found");
		}

		await ctx.db.patch(args.id, {
			trackFileId: undefined,
			hasFile: false,
			updatedAt: Date.now(),
		});

		return await ctx.db.get(args.id);
	},
});

// Delete a track
export const removeTrack = mutation({
	args: { id: v.id("tracks") },
	handler: async (ctx, args) => {
		const track = await ctx.db.get(args.id);
		if (!track) {
			throw new Error("Track not found");
		}

		await ctx.db.delete(args.id);
	},
});

// ============================================================================
// Statistics
// ============================================================================

// Get music statistics
export const getStats = query({
	args: {},
	handler: async (ctx) => {
		const allArtists = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "music"))
			.collect();

		const monitoredArtists = allArtists.filter((a) => a.monitored);

		const allAlbums = await ctx.db.query("albums").collect();
		const monitoredAlbums = allAlbums.filter((a) => a.monitored);

		const allTracks = await ctx.db.query("tracks").collect();
		const tracksWithFiles = allTracks.filter((t) => t.hasFile);

		return {
			artistCount: allArtists.length,
			monitoredArtistCount: monitoredArtists.length,
			albumCount: allAlbums.length,
			monitoredAlbumCount: monitoredAlbums.length,
			trackCount: allTracks.length,
			trackFileCount: tracksWithFiles.length,
			percentComplete:
				allTracks.length > 0 ? Math.round((tracksWithFiles.length / allTracks.length) * 100) : 0,
		};
	},
});
