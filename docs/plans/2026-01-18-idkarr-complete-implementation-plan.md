# idkarr Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build idkarr - a unified media management platform replacing Sonarr, Radarr, Lidarr, Prowlarr, and Overseerr.

**Architecture:** SvelteKit 5 frontend with Convex backend. Convex handles database, real-time subscriptions, auth, and serverless functions. All business logic runs as Convex functions. Frontend is a PWA with offline support.

**Tech Stack:** Bun, Biome, Convex, SvelteKit 5, shadcn-svelte, Tailwind CSS v4

**Reference:** [IDKARR-VISION](../../IDKARR-VISION-unified-media-manager-replacing-sonarr-radarr-lidarr-prowlarr-overseerr.md)

---

## Phase Overview

| Phase | Name | Focus |
|-------|------|-------|
| 1 | Foundation | Convex schema, settings, base types, **file naming presets** |
| 2 | Quality System | Profiles, custom formats, restrictions, **TRaSH Guides sync** |
| 3 | Media Models | TV, Movies, Anime, Music, **collections, albums, anime specials** |
| 4 | Tags | Tag-based routing system |
| 5 | Metadata Providers | TMDB, TVDB, AniList, MusicBrainz integrations |
| 5B | **Import & Migration** | Bulk import wizard, *arr detection, manual import |
| 6 | Indexers | Torznab/Newznab, RSS sync, rate limiting |
| 7 | Download Clients | qBittorrent, Transmission, SABnzbd, NZBGet |
| 8 | Parser | Scene release parsing, matching, scoring |
| 9 | Download Pipeline | Queue, delay profiles, import |
| 10 | Users & Auth | OAuth/OIDC, roles, requests |
| 11 | List Sync | Trakt, IMDB, Plex, **Letterboxd, TMDb** lists |
| 12 | Media Servers | Plex, Jellyfin, **Emby** integration |
| 13 | UI Foundation | Layout, navigation, theme system |
| 14 | UI - Dashboard | Activity, upcoming, health widgets |
| 15 | UI - Library | Browse, filter presets, detail views |
| 16 | UI - Queue | Downloads, history, blocklist |
| 17 | UI - Settings | Progressive disclosure settings pages |
| 18 | UI - Discovery | Search, trending, recommendations |
| 19 | UI - Calendar | Week/month views, iCal export |
| 20 | UI - Mass Editor | Bulk operations |
| 21 | Analytics | Statistics, graphs, trends |
| 22 | Health & Logs | Checks, warnings, log viewer |
| 23 | API & Webhooks | REST API, outgoing webhooks |
| 24 | Backup & Storage | Export/import, scheduled backups |
| 25 | AI Tier 1 | Local recommendations |
| 26 | AI Tier 2 | RAG-powered discovery |
| 27 | AI Tier 3 | Conversational assistant |
| 28 | PWA | Service worker, push notifications, offline |
| 29 | **System Operations** | Update checks, response caching, image proxy |

---

## Phase 1: Foundation

### Task 1.1: Expand Convex Schema Types

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add type definitions for all enums: mediaType, mediaStatus, userRole, qualitySource, resolution, downloadClientType, indexerProtocol, requestStatus
2. Add settings table with singleton pattern (single row for app settings)
3. Add rootFolders table with path, freeSpace, mediaType assignment
4. Run `bun run convex:dev` to verify schema compiles
5. Commit: "feat(schema): add foundation types and settings table"

**Verify:** Schema deploys without errors, types are accessible

---

### Task 1.2: Settings CRUD Functions

**Files:**
- Create: `src/convex/settings.ts`

**Steps:**
1. Create `get` query to retrieve settings (singleton)
2. Create `update` mutation to modify settings
3. Create internal `getOrCreate` helper that initializes defaults
4. Include settings for: instanceName, defaultQualityProfile, namingPreset, trashSyncEnabled
5. Test by querying settings from Convex dashboard
6. Commit: "feat(convex): add settings CRUD functions"

**Verify:** Can read/write settings from Convex dashboard

---

### Task 1.3: Root Folders Management

**Files:**
- Create: `src/convex/rootFolders.ts`

**Steps:**
1. Create `list` query to get all root folders
2. Create `add` mutation with path and mediaType
3. Create `remove` mutation
4. Create `update` mutation for modifying path
5. Add validation: path must be absolute, mediaType must be valid
6. Commit: "feat(convex): add root folders management"

**Verify:** Can add/list/remove root folders

---

### Task 1.4: File Naming Presets Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `namingPresets` table with: name, type (built-in/custom), seriesFormat, seasonFormat, episodeFormat, movieFormat, musicArtistFormat, musicAlbumFormat
2. Create default presets: Plex-style, Kodi-style, Minimal
3. Link settings to active preset ID
4. Commit: "feat(schema): add file naming presets"

---

### Task 1.5: File Naming Functions

**Files:**
- Create: `src/convex/naming.ts`

**Steps:**
1. Create `listPresets` query
2. Create `getPreset` query by ID
3. Create `addCustomPreset` mutation
4. Create `updatePreset` mutation
5. Create `deletePreset` mutation (only custom)
6. Create `formatFilename` query that applies preset to media item
7. Create `previewRename` query showing before/after for a media item
8. Commit: "feat(convex): add naming preset functions"

---

### Task 1.6: Naming Preview Component

**Files:**
- Create: `src/lib/components/settings/NamingPreview.svelte`

**Steps:**
1. Show sample formatted filenames for each media type
2. Update preview when preset changes
3. Show token reference (available variables)
4. Commit: "feat(ui): add naming preview component"

---

## Phase 2: Quality System

### Task 2.1: Quality Definitions Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `qualityDefinitions` table with: name, source, resolution, minSize, maxSize, preferredSize
2. Add indexes for source and resolution lookup
3. Seed default quality definitions matching standard release qualities (HDTV, WEB-DL, BluRay, etc.)
4. Commit: "feat(schema): add quality definitions table"

---

### Task 2.2: Quality Definitions Functions

**Files:**
- Create: `src/convex/qualityDefinitions.ts`

**Steps:**
1. Create `list` query returning all definitions ordered by resolution
2. Create `get` query by ID
3. Create `update` mutation for size limits
4. Create `reset` mutation to restore defaults
5. Commit: "feat(convex): add quality definitions functions"

---

### Task 2.3: Quality Profiles Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `qualityProfiles` table with: name, upgradeAllowed, cutoff, items (array of quality IDs with enabled flag)
2. Add index by name
3. Commit: "feat(schema): add quality profiles table"

---

### Task 2.4: Quality Profiles Functions

**Files:**
- Create: `src/convex/qualityProfiles.ts`

**Steps:**
1. Create `list` query returning all profiles with their items
2. Create `get` query by ID
3. Create `add` mutation with name and initial items
4. Create `update` mutation for modifying cutoff and items
5. Create `remove` mutation with check for usage by media items
6. Create seed function for default profiles (Any, SD, HD-720p, HD-1080p, Ultra-HD)
7. Commit: "feat(convex): add quality profiles CRUD"

---

### Task 2.5: Custom Formats Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `customFormats` table with: name, includeWhenRenaming, conditions (array)
2. Each condition has: type (releaseName, releaseGroup, source, etc.), pattern (regex), negate, required
3. Add `customFormatScores` table linking profiles to formats with score values
4. Commit: "feat(schema): add custom formats tables"

---

### Task 2.6: Custom Formats Functions

**Files:**
- Create: `src/convex/customFormats.ts`

**Steps:**
1. Create `list` query returning all formats with conditions
2. Create `get` query by ID
3. Create `add` mutation with name and conditions
4. Create `update` mutation
5. Create `remove` mutation
6. Create `testRelease` query that evaluates a release name against all formats
7. Commit: "feat(convex): add custom formats CRUD"

---

### Task 2.7: Custom Format Scores Functions

**Files:**
- Modify: `src/convex/qualityProfiles.ts`

**Steps:**
1. Add `setFormatScore` mutation to assign score for a format within a profile
2. Add `getFormatScores` query to retrieve all scores for a profile
3. Add `removeFormatScore` mutation
4. Update profile `get` to include format scores
5. Commit: "feat(convex): add custom format scoring to profiles"

---

### Task 2.8: Restrictions Schema and Functions

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/restrictions.ts`

**Steps:**
1. Add `restrictions` table with: mustContain (array), mustNotContain (array), tags (array of tag IDs)
2. Create `list`, `add`, `update`, `remove` functions
3. Create `checkRelease` query that tests if release passes all restrictions
4. Commit: "feat(convex): add release restrictions"

---

### Task 2.9: TRaSH Guides Sync Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `trashGuides` table with: type (movie/tv/anime), name, lastSync, autoUpdate, profiles (array of synced profile configs)
2. Add `trashSyncLog` table for tracking sync history
3. Commit: "feat(schema): add TRaSH Guides sync tables"

---

### Task 2.10: TRaSH Guides Sync Functions

**Files:**
- Create: `src/convex/trashGuides.ts`

**Steps:**
1. Create `fetchAvailableGuides` action that fetches TRaSH Guides GitHub repo
2. Create `listSubscribed` query
3. Create `subscribe` mutation to follow a TRaSH profile
4. Create `unsubscribe` mutation
5. Create `sync` action that pulls latest and updates custom formats/quality profiles
6. Handle merge logic: update existing, add new, preserve user customizations
7. Commit: "feat(convex): add TRaSH Guides sync functions"

---

### Task 2.11: TRaSH Guides Scheduler

**Files:**
- Modify: `src/convex/trashGuides.ts`

**Steps:**
1. Create scheduled job for daily TRaSH sync check
2. Only sync if autoUpdate enabled
3. Log sync results
4. Commit: "feat(convex): add TRaSH Guides auto-sync scheduler"

---

### Task 2.12: TRaSH Guides Settings UI

**Files:**
- Create: `src/lib/components/settings/TrashGuidesSync.svelte`

**Steps:**
1. List available TRaSH profiles by category (movie, TV, anime)
2. Toggle subscription per profile
3. Show last sync date
4. Manual sync button
5. Toggle auto-update
6. Commit: "feat(ui): add TRaSH Guides settings"

---

## Phase 3: Media Models

### Task 3.1: Expand Media Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Expand media table with: qualityProfileId, rootFolderId, tags (array), runtime, certification, ratings, genres
2. Add TV-specific fields: network, firstAired, lastAired, seasonCount, episodeCount
3. Add Movie-specific fields: inCinemas, physicalRelease, digitalRelease, studio, collection
4. Add Anime-specific fields: season (Winter/Spring/etc.), seasonYear, absoluteEpisodeCount, releaseGroup
5. Add Music-specific fields: artistType, genres, albums (will be separate table)
6. Commit: "feat(schema): expand media table with type-specific fields"

---

### Task 3.2: Seasons Table

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `seasons` table with: mediaId, seasonNumber, monitored, episodeCount, episodeFileCount
2. Add index by mediaId
3. Commit: "feat(schema): add seasons table"

---

### Task 3.3: Episodes Table

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `episodes` table with: mediaId, seasonId, seasonNumber, episodeNumber, title, overview, airDate, monitored, hasFile
2. Add absoluteNumber field for anime
3. Add index by mediaId, by seasonId, by airDate
4. Commit: "feat(schema): add episodes table"

---

### Task 3.4: Media Files Table

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `mediaFiles` table with: mediaId, episodeId (optional), path, size, quality, releaseGroup, sceneName, dateAdded
2. Add video fields: codec, resolution, bitrate, runtime
3. Add audio fields: audioCodec, audioChannels, audioLanguages
4. Add indexes
5. Commit: "feat(schema): add media files table"

---

### Task 3.5: Seasons Functions

**Files:**
- Create: `src/convex/seasons.ts`

**Steps:**
1. Create `listByMedia` query to get seasons for a media item
2. Create `get` query by ID
3. Create `add` mutation (called when adding media)
4. Create `setMonitored` mutation to toggle monitoring
5. Create `updateStats` internal function to recalculate episode counts
6. Commit: "feat(convex): add seasons functions"

---

### Task 3.6: Episodes Functions

**Files:**
- Create: `src/convex/episodes.ts`

**Steps:**
1. Create `listBySeason` query
2. Create `listByMedia` query (all episodes)
3. Create `get` query by ID
4. Create `add` mutation
5. Create `bulkAdd` mutation for adding many episodes
6. Create `setMonitored` mutation
7. Create `getWanted` query (monitored without files, aired)
8. Commit: "feat(convex): add episodes functions"

---

### Task 3.7: Media Files Functions

**Files:**
- Create: `src/convex/mediaFiles.ts`

**Steps:**
1. Create `listByMedia` query
2. Create `get` query by ID
3. Create `add` mutation
4. Create `remove` mutation (with option to delete from disk)
5. Create `updateQuality` mutation
6. Commit: "feat(convex): add media files functions"

---

### Task 3.8: Expand Media Functions

**Files:**
- Modify: `src/convex/media.ts`

**Steps:**
1. Update `add` mutation to accept qualityProfileId, rootFolderId, tags
2. Add `update` mutation for editing media properties
3. Add `search` query with pagination and filters (type, status, monitored, tag)
4. Add `getByExternalId` query (tmdbId, tvdbId, imdbId)
5. Add `getWithDetails` query that includes seasons, episodes, files
6. Commit: "feat(convex): expand media functions"

---

### Task 3.9: Movie Collections Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `collections` table with: name, tmdbId, overview, posterUrl, backdropUrl
2. Add collectionId field to media table (for movies)
3. Add index on collectionId
4. Commit: "feat(schema): add movie collections table"

---

### Task 3.10: Movie Collections Functions

**Files:**
- Create: `src/convex/collections.ts`

**Steps:**
1. Create `list` query returning all collections
2. Create `get` query by ID with movies in collection
3. Create `getByTmdbId` query
4. Create `addOrUpdate` mutation (upsert by tmdbId)
5. Create `getCollectionProgress` query showing owned vs total movies
6. Commit: "feat(convex): add movie collections functions"

---

### Task 3.11: Collections UI

**Files:**
- Create: `src/routes/collections/+page.svelte`
- Create: `src/lib/components/media/CollectionCard.svelte`

**Steps:**
1. Create collections browse page showing all collections
2. Show collection poster, name, progress (3/5 movies owned)
3. Collection detail view listing all movies with owned status
4. Quick-add missing movies from collection
5. Commit: "feat(ui): add collections browse and detail"

---

### Task 3.12: Music Albums Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `albums` table with: artistId (mediaId), title, releaseDate, releaseType (album, EP, single, compilation), discCount, trackCount, monitored
2. Add external IDs: musicbrainzId, spotifyId
3. Add index by artistId
4. Commit: "feat(schema): add music albums table"

---

### Task 3.13: Music Tracks Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `tracks` table with: albumId, discNumber, trackNumber, title, duration, hasFile
2. Add index by albumId
3. Commit: "feat(schema): add music tracks table"

---

### Task 3.14: Music Albums Functions

**Files:**
- Create: `src/convex/albums.ts`

**Steps:**
1. Create `listByArtist` query
2. Create `get` query by ID with tracks
3. Create `add` mutation
4. Create `bulkAdd` mutation for adding multiple albums
5. Create `setMonitored` mutation
6. Create `getWanted` query (monitored albums missing files)
7. Commit: "feat(convex): add music albums functions"

---

### Task 3.15: Music Tracks Functions

**Files:**
- Create: `src/convex/tracks.ts`

**Steps:**
1. Create `listByAlbum` query
2. Create `get` query by ID
3. Create `bulkAdd` mutation
4. Create `setHasFile` mutation
5. Commit: "feat(convex): add music tracks functions"

---

### Task 3.16: Artist Detail Page

**Files:**
- Create: `src/lib/components/media/ArtistDetail.svelte`

**Steps:**
1. Create artist detail layout with image, bio, stats
2. Show discography grouped by release type
3. Album cards with cover, title, year, track count
4. Toggle monitored per album
5. Commit: "feat(ui): add artist detail page"

---

### Task 3.17: Album Detail Page

**Files:**
- Create: `src/lib/components/media/AlbumDetail.svelte`

**Steps:**
1. Show album cover, title, artist, release date
2. Track listing with duration, file status
3. Search/download actions
4. Commit: "feat(ui): add album detail page"

---

### Task 3.18: Anime Special Types Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `animeType` field to episodes: episode, special, ova, ona, movie, recap
2. Add `animeReleaseType` to media: tv, movie, ova, ona, special, music
3. Add `fansub` vs `simulcast` field to media files
4. Commit: "feat(schema): add anime special type fields"

---

### Task 3.19: Anime Special Handling Functions

**Files:**
- Modify: `src/convex/episodes.ts`

**Steps:**
1. Update `listBySeason` to group by anime type (main episodes vs specials)
2. Add `listSpecials` query for OVA/ONA/Specials
3. Handle absolute numbering with type-aware sorting
4. Commit: "feat(convex): add anime special type handling"

---

### Task 3.20: Anime Detail Enhancements

**Files:**
- Modify: `src/lib/components/media/SeriesDetail.svelte`

**Steps:**
1. For anime, show separate sections: Episodes, Specials, OVAs
2. Show simulcast vs fansub indicator on files
3. Display absolute episode numbers alongside S/E numbers
4. Show seasonal info (Winter 2026, etc.)
5. Commit: "feat(ui): enhance anime detail with special types"

---

## Phase 4: Tags System

### Task 4.1: Tags Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `tags` table with: name, color (optional)
2. Add unique index on name
3. Commit: "feat(schema): add tags table"

---

### Task 4.2: Tags Functions

**Files:**
- Create: `src/convex/tags.ts`

**Steps:**
1. Create `list` query
2. Create `get` query by ID
3. Create `getByName` query
4. Create `add` mutation with unique name validation
5. Create `update` mutation
6. Create `remove` mutation (check for usage first)
7. Create `getUsage` query showing where tag is used (media, indexers, clients)
8. Commit: "feat(convex): add tags CRUD"

---

### Task 4.3: Tag Assignments

**Files:**
- Modify: `src/convex/media.ts`
- Modify: `src/convex/tags.ts`

**Steps:**
1. Add `addTag` mutation to media.ts
2. Add `removeTag` mutation to media.ts
3. Add `bulkSetTags` mutation for mass editor
4. Add `listByTag` query to filter media by tag
5. Commit: "feat(convex): add tag assignment to media"

---

## Phase 5: Metadata Providers

### Task 5.1: TMDB Provider Setup

**Files:**
- Create: `src/convex/providers/tmdb.ts`

**Steps:**
1. Create Convex action for TMDB API calls (actions can make HTTP requests)
2. Implement `searchMovies` action with query, year filter
3. Implement `searchTV` action
4. Implement `getMovieDetails` action by TMDB ID
5. Implement `getTVDetails` action by TMDB ID
6. Implement `getSeasonDetails` action
7. Store API key in environment variables
8. Commit: "feat(providers): add TMDB integration"

**Verify:** Can search and retrieve movie/TV details

---

### Task 5.2: TVDB Provider Setup

**Files:**
- Create: `src/convex/providers/tvdb.ts`

**Steps:**
1. Create Convex action for TVDB API calls
2. Implement authentication (TVDB uses JWT tokens)
3. Implement `searchSeries` action
4. Implement `getSeriesDetails` action
5. Implement `getEpisodes` action
6. Commit: "feat(providers): add TVDB integration"

---

### Task 5.3: AniList Provider Setup

**Files:**
- Create: `src/convex/providers/anilist.ts`

**Steps:**
1. Create Convex action for AniList GraphQL API
2. Implement `searchAnime` action
3. Implement `getAnimeDetails` action with episodes, relations
4. Implement `getSeasonalAnime` action (by season/year)
5. Handle ID mappings (AniList → MAL → TVDB)
6. Commit: "feat(providers): add AniList integration"

---

### Task 5.4: MusicBrainz Provider Setup

**Files:**
- Create: `src/convex/providers/musicbrainz.ts`

**Steps:**
1. Create Convex action for MusicBrainz API
2. Implement rate limiting (MusicBrainz has strict limits)
3. Implement `searchArtist` action
4. Implement `getArtistDetails` action with releases
5. Implement `getReleaseDetails` action
6. Commit: "feat(providers): add MusicBrainz integration"

---

### Task 5.5: Metadata Refresh System

**Files:**
- Create: `src/convex/metadata.ts`

**Steps:**
1. Create `refreshMedia` mutation that fetches latest data from providers
2. Create `refreshAll` mutation with rate limiting
3. Handle provider priority and data merging
4. Store lastInfoSync timestamp
5. Create scheduled job for periodic refresh
6. Commit: "feat(convex): add metadata refresh system"

---

### Task 5.6: Image Caching

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/images.ts`

**Steps:**
1. Add `images` table with: mediaId, type (poster, backdrop, banner), url, source
2. Create `getImages` query by mediaId
3. Create `cacheImage` mutation that stores URL references
4. Handle multiple sources with preference
5. Commit: "feat(convex): add image caching"

---

## Phase 5B: Import & Migration

### Task 5B.1: Import Scanner

**Files:**
- Create: `src/convex/import/scanner.ts`

**Steps:**
1. Create `scanFolder` action that recursively scans a folder for media files
2. Parse filenames using the parser module
3. Return list of found files with parsed metadata
4. Handle common naming patterns (scene releases, *arr naming, arbitrary)
5. Commit: "feat(import): add folder scanner"

---

### Task 5B.2: Import Matcher

**Files:**
- Create: `src/convex/import/matcher.ts`

**Steps:**
1. Create `matchFiles` action that matches scanned files to metadata providers
2. Query TMDB/TVDB/AniList for potential matches
3. Score matches by confidence (title similarity, year match, episode count)
4. Return matches with confidence scores
5. Commit: "feat(import): add metadata matcher"

---

### Task 5B.3: Bulk Import Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `importJobs` table with: sourcePath, status (scanning, matching, confirming, importing, complete), progress, itemCount
2. Add `importItems` table with: jobId, filePath, parsedInfo, matchedMediaId, confidence, status, userConfirmed
3. Commit: "feat(schema): add bulk import tables"

---

### Task 5B.4: Bulk Import Functions

**Files:**
- Create: `src/convex/import/bulk.ts`

**Steps:**
1. Create `startImport` mutation to create import job
2. Create `getJob` query with items
3. Create `confirmMatch` mutation to accept/change a match
4. Create `confirmAll` mutation to accept all high-confidence matches
5. Create `executeImport` action that renames and moves confirmed files
6. Create `cancelImport` mutation
7. Commit: "feat(convex): add bulk import functions"

---

### Task 5B.5: *arr Detection

**Files:**
- Create: `src/convex/import/arrDetection.ts`

**Steps:**
1. Detect Sonarr/Radarr/Lidarr naming patterns
2. Extract embedded metadata (quality, release group)
3. Handle Sonarr's series folder structure
4. Handle Radarr's movie folder structure
5. Commit: "feat(import): add *arr naming detection"

---

### Task 5B.6: Import Wizard UI - Start

**Files:**
- Create: `src/routes/import/+page.svelte`
- Create: `src/lib/components/import/ImportWizard.svelte`

**Steps:**
1. Create import wizard with step indicator
2. Step 1: Select source folder
3. Show folder browser or path input
4. Start scan button
5. Commit: "feat(ui): add import wizard start"

---

### Task 5B.7: Import Wizard UI - Review

**Files:**
- Create: `src/lib/components/import/ImportReview.svelte`

**Steps:**
1. Step 2: Review matches
2. List found files with matched media
3. Confidence indicator (green/yellow/red)
4. Click to change match manually
5. Bulk accept high-confidence matches
6. Commit: "feat(ui): add import wizard review"

---

### Task 5B.8: Import Wizard UI - Configure

**Files:**
- Create: `src/lib/components/import/ImportConfigure.svelte`

**Steps:**
1. Step 3: Configure import options
2. Select quality profile for all/per-item
3. Select root folder destination
4. Preview renamed filenames
5. Commit: "feat(ui): add import wizard configure"

---

### Task 5B.9: Import Wizard UI - Progress

**Files:**
- Create: `src/lib/components/import/ImportProgress.svelte`

**Steps:**
1. Step 4: Import progress
2. Show progress bar and current file
3. Show success/failure per item
4. Summary when complete
5. Link to imported media
6. Commit: "feat(ui): add import wizard progress"

---

### Task 5B.10: Manual Import Page

**Files:**
- Create: `src/routes/import/manual/+page.svelte`

**Steps:**
1. Quick import for single folder/files
2. Auto-match and show result
3. Accept or change match
4. One-click import
5. Handle failed imports → add to blocklist option
6. Commit: "feat(ui): add manual import page"

---

## Phase 6: Indexers

### Task 6.1: Indexers Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `indexers` table with: name, protocol (torznab/newznab), baseUrl, apiKey, enabled, priority
2. Add fields: categories (array), supportedMediaTypes, tags (for tag-based routing)
3. Add health fields: lastCheck, lastError, successRate
4. Add rate limit fields: requestsPerMinute, lastRequest
5. Commit: "feat(schema): add indexers table"

---

### Task 6.2: Indexers Functions

**Files:**
- Create: `src/convex/indexers.ts`

**Steps:**
1. Create `list` query with optional filter by enabled/protocol
2. Create `get` query by ID
3. Create `add` mutation with validation
4. Create `update` mutation
5. Create `remove` mutation
6. Create `setEnabled` mutation
7. Commit: "feat(convex): add indexers CRUD"

---

### Task 6.3: Indexer Test Action

**Files:**
- Modify: `src/convex/indexers.ts`

**Steps:**
1. Create `test` action that makes test request to indexer
2. Parse response to verify connectivity
3. Return capabilities (search types supported)
4. Update health status after test
5. Commit: "feat(convex): add indexer connection test"

---

### Task 6.4: Torznab Search Action

**Files:**
- Create: `src/convex/search/torznab.ts`

**Steps:**
1. Create `search` action that queries Torznab-compatible indexers
2. Parse XML response into release objects
3. Handle pagination
4. Handle category mapping to media types
5. Implement rate limiting per indexer
6. Commit: "feat(convex): add Torznab search"

---

### Task 6.5: Newznab Search Action

**Files:**
- Create: `src/convex/search/newznab.ts`

**Steps:**
1. Create `search` action for Newznab indexers
2. Parse XML response
3. Handle NZB-specific fields (age, grabs, retention)
4. Commit: "feat(convex): add Newznab search"

---

### Task 6.6: Unified Search Function

**Files:**
- Create: `src/convex/search/index.ts`

**Steps:**
1. Create `searchAll` action that queries all enabled indexers
2. Filter indexers by tags if media has tags
3. Aggregate and deduplicate results
4. Return results with indexer source info
5. Commit: "feat(convex): add unified search across indexers"

---

### Task 6.7: RSS Sync

**Files:**
- Create: `src/convex/search/rss.ts`

**Steps:**
1. Create `syncRSS` action that polls indexer RSS feeds
2. Parse RSS/Atom feeds
3. Compare against wanted items
4. Return matched releases
5. Create scheduled job for periodic RSS sync
6. Commit: "feat(convex): add RSS sync"

---

### Task 6.8: Search Throttling

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/search/throttle.ts`

**Steps:**
1. Add `searchHistory` table tracking lastSearch per mediaId
2. Implement cooldown rules from vision doc (7 days aired, 3 days continuing, etc.)
3. Create `shouldSearch` query to check if search is allowed
4. Create `recordSearch` mutation to update timestamp
5. Commit: "feat(convex): add search throttling"

---

## Phase 7: Download Clients

### Task 7.1: Download Clients Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `downloadClients` table with: name, type, host, port, username, password, enabled, priority
2. Add fields: useSsl, category, tags (for tag-based routing)
3. Add path mapping fields: remotePath, localPath
4. Add health fields
5. Commit: "feat(schema): add download clients table"

---

### Task 7.2: Download Clients Functions

**Files:**
- Create: `src/convex/downloadClients.ts`

**Steps:**
1. Create `list`, `get`, `add`, `update`, `remove` functions
2. Create `setEnabled` mutation
3. Add validation for required fields per client type
4. Commit: "feat(convex): add download clients CRUD"

---

### Task 7.3: qBittorrent Integration

**Files:**
- Create: `src/convex/clients/qbittorrent.ts`

**Steps:**
1. Create `test` action for connection testing
2. Create `addTorrent` action (by URL or magnet)
3. Create `getTorrents` action to list downloads
4. Create `removeTorrent` action
5. Create `setCategory` action
6. Handle authentication (cookie-based)
7. Commit: "feat(clients): add qBittorrent integration"

---

### Task 7.4: Transmission Integration

**Files:**
- Create: `src/convex/clients/transmission.ts`

**Steps:**
1. Create `test` action
2. Create `addTorrent` action
3. Create `getTorrents` action
4. Create `removeTorrent` action
5. Handle RPC authentication
6. Commit: "feat(clients): add Transmission integration"

---

### Task 7.5: SABnzbd Integration

**Files:**
- Create: `src/convex/clients/sabnzbd.ts`

**Steps:**
1. Create `test` action
2. Create `addNzb` action
3. Create `getQueue` action
4. Create `getHistory` action
5. Create `removeItem` action
6. Commit: "feat(clients): add SABnzbd integration"

---

### Task 7.6: NZBGet Integration

**Files:**
- Create: `src/convex/clients/nzbget.ts`

**Steps:**
1. Create `test` action
2. Create `addNzb` action
3. Create `getQueue` action
4. Create `getHistory` action
5. Create `removeItem` action
6. Commit: "feat(clients): add NZBGet integration"

---

### Task 7.7: Download Client Test

**Files:**
- Modify: `src/convex/downloadClients.ts`

**Steps:**
1. Create unified `test` mutation that dispatches to correct client
2. Return connection status and client version
3. Update health status
4. Commit: "feat(convex): add download client test dispatcher"

---

## Phase 8: Parser

### Task 8.1: Release Name Parser

**Files:**
- Create: `src/lib/parser/index.ts`

**Steps:**
1. Create parser that extracts: title, year, season, episode, quality, source, resolution, codec, group
2. Handle edge cases: daily shows, anime absolute numbering, multi-episode
3. Use regex patterns for common release formats
4. Export TypeScript types for parsed result
5. Commit: "feat(parser): add release name parser"

---

### Task 8.2: Quality Parser

**Files:**
- Create: `src/lib/parser/quality.ts`

**Steps:**
1. Extract source (WEB-DL, BluRay, HDTV, etc.)
2. Extract resolution (480p, 720p, 1080p, 2160p)
3. Extract codec (x264, x265, HEVC, AV1)
4. Extract HDR info (HDR, HDR10, DV)
5. Commit: "feat(parser): add quality extraction"

---

### Task 8.3: Audio Parser

**Files:**
- Create: `src/lib/parser/audio.ts`

**Steps:**
1. Extract audio codec (AAC, AC3, DTS, TrueHD, Atmos)
2. Extract channels (2.0, 5.1, 7.1)
3. Extract language indicators
4. Commit: "feat(parser): add audio extraction"

---

### Task 8.4: Anime Parser

**Files:**
- Create: `src/lib/parser/anime.ts`

**Steps:**
1. Handle absolute episode numbering
2. Extract fansub group
3. Handle versioned releases (v2, v3)
4. Handle batch releases
5. Extract season indicators from title
6. Commit: "feat(parser): add anime-specific parsing"

---

### Task 8.5: Release Matching

**Files:**
- Create: `src/convex/matching.ts`

**Steps:**
1. Create `matchRelease` query that finds media for a parsed release
2. Implement fuzzy title matching
3. Handle aliases and alternate titles
4. Score matches by confidence
5. Commit: "feat(convex): add release matching"

---

### Task 8.6: Release Scoring

**Files:**
- Create: `src/convex/scoring.ts`

**Steps:**
1. Create `scoreRelease` query that calculates total score
2. Apply quality profile ranking
3. Apply custom format scores
4. Check restrictions (hard blocks)
5. Check cutoff status
6. Return overall score and breakdown
7. Commit: "feat(convex): add release scoring"

---

## Phase 9: Download Pipeline

### Task 9.1: Download Queue Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `queue` table with: mediaId, episodeId (optional), title, size, protocol, indexerId, clientId
2. Add status fields: status (queued, downloading, importing, completed, failed), progress, downloadedSize
3. Add timing fields: added, started, completed, estimatedCompletion
4. Add error fields: errorMessage, retryCount
5. Commit: "feat(schema): add download queue table"

---

### Task 9.2: Queue Functions

**Files:**
- Create: `src/convex/queue.ts`

**Steps:**
1. Create `list` query with status filter
2. Create `get` query by ID
3. Create `add` mutation
4. Create `updateProgress` mutation
5. Create `setStatus` mutation
6. Create `remove` mutation
7. Create `retry` mutation
8. Commit: "feat(convex): add queue functions"

---

### Task 9.3: Delay Profiles Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `delayProfiles` table with: name, preferProtocol, usenetDelay, torrentDelay, bypassForPropers, tags
2. Add order field for priority
3. Commit: "feat(schema): add delay profiles table"

---

### Task 9.4: Delay Profiles Functions

**Files:**
- Create: `src/convex/delayProfiles.ts`

**Steps:**
1. Create `list` query ordered by priority
2. Create `get`, `add`, `update`, `remove` functions
3. Create `reorder` mutation
4. Create `getForMedia` query that finds applicable profile by tags
5. Commit: "feat(convex): add delay profiles functions"

---

### Task 9.5: Grab Release Action

**Files:**
- Create: `src/convex/grab.ts`

**Steps:**
1. Create `grab` action that handles full grab flow
2. Check delay profile - queue if delay applies
3. Select download client by tags/priority
4. Send to appropriate client
5. Add to queue
6. Return queue item ID
7. Commit: "feat(convex): add release grab action"

---

### Task 9.6: Download Monitoring

**Files:**
- Create: `src/convex/monitoring.ts`

**Steps:**
1. Create scheduled job to poll download clients
2. Update queue items with progress
3. Detect completed downloads
4. Trigger import for completed items
5. Handle failed downloads (retry or mark failed)
6. Commit: "feat(convex): add download monitoring"

---

### Task 9.7: Import System

**Files:**
- Create: `src/convex/import.ts`

**Steps:**
1. Create `importDownload` action that processes completed download
2. Parse downloaded files
3. Match to media/episodes
4. Rename to configured naming format
5. Move to library location
6. Create mediaFile records
7. Notify download client to remove
8. Commit: "feat(convex): add import system"

---

### Task 9.8: Blocklist

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/blocklist.ts`

**Steps:**
1. Add `blocklist` table with: title, mediaId (optional), reason, added, sourceTitle
2. Create `list` query with pagination
3. Create `add` mutation
4. Create `remove` mutation
5. Create `clear` mutation
6. Create `isBlocked` query to check before grabbing
7. Commit: "feat(convex): add blocklist management"

---

### Task 9.9: History

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/history.ts`

**Steps:**
1. Add `history` table with: mediaId, episodeId, eventType, sourceTitle, quality, date, data
2. Event types: grabbed, imported, downloadFailed, deleted, upgraded
3. Create `listByMedia` query
4. Create `listRecent` query with pagination
5. Create `add` mutation (internal)
6. Commit: "feat(convex): add history tracking"

---

## Phase 10: Users & Auth

### Task 10.1: Auth Setup with Convex

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/auth.ts`
- Modify: `src/routes/+layout.svelte`

**Steps:**
1. Review Convex auth documentation for OAuth setup
2. Configure OAuth providers (Google, GitHub) in Convex dashboard
3. Add auth-related fields to users table: authProvider, authProviderId, avatarUrl
4. Create `getCurrentUser` query
5. Add auth provider component to layout
6. Commit: "feat(auth): set up Convex OAuth authentication"

**Verify:** Can sign in with OAuth provider

---

### Task 10.2: User Management Functions

**Files:**
- Modify: `src/convex/users.ts`

**Steps:**
1. Create `list` query (admin only)
2. Create `get` query by ID
3. Create `update` mutation for profile updates
4. Create `setRole` mutation (admin only)
5. Create `remove` mutation (admin only)
6. Add role-based access control helpers
7. Commit: "feat(convex): add user management"

---

### Task 10.3: Requests Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `requests` table with: userId, mediaType, title, externalId, status, note
2. Add fields: requestedAt, approvedAt, approvedBy, deniedAt, deniedReason
3. Add index by userId, by status
4. Commit: "feat(schema): add requests table"

---

### Task 10.4: Requests Functions

**Files:**
- Create: `src/convex/requests.ts`

**Steps:**
1. Create `list` query with filters (status, userId)
2. Create `listMine` query for current user
3. Create `get` query by ID
4. Create `submit` mutation
5. Create `approve` mutation (adds media, starts search)
6. Create `deny` mutation with reason
7. Commit: "feat(convex): add requests functions"

---

### Task 10.5: Watchlists

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/watchlists.ts`

**Steps:**
1. Add `watchlistItems` table with: userId, mediaId, addedAt
2. Create `listMine` query
3. Create `add` mutation
4. Create `remove` mutation
5. Create `isInWatchlist` query
6. Commit: "feat(convex): add watchlist functionality"

---

## Phase 11: List Sync

### Task 11.1: External Lists Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `externalLists` table with: name, type (trakt, imdb, letterboxd, plex, tmdb), url, enabled
2. Add fields: syncInterval, qualityProfileId, rootFolderId, monitored, tags
3. Add sync fields: lastSync, itemCount, lastError
4. Commit: "feat(schema): add external lists table"

---

### Task 11.2: External Lists Functions

**Files:**
- Create: `src/convex/externalLists.ts`

**Steps:**
1. Create `list`, `get`, `add`, `update`, `remove` functions
2. Create `setEnabled` mutation
3. Commit: "feat(convex): add external lists CRUD"

---

### Task 11.3: Trakt Integration

**Files:**
- Create: `src/convex/lists/trakt.ts`

**Steps:**
1. Create `sync` action that fetches Trakt list
2. Handle OAuth authentication for private lists
3. Parse watchlist, custom lists, popular, trending
4. Map Trakt items to TMDB/TVDB IDs
5. Create/update media items based on list config
6. Commit: "feat(lists): add Trakt integration"

---

### Task 11.4: IMDB Integration

**Files:**
- Create: `src/convex/lists/imdb.ts`

**Steps:**
1. Create `sync` action for IMDB lists
2. Parse RSS/CSV export format
3. Map IMDB IDs to TMDB
4. Commit: "feat(lists): add IMDB list integration"

---

### Task 11.5: Plex Watchlist Integration

**Files:**
- Create: `src/convex/lists/plex.ts`

**Steps:**
1. Create `sync` action for Plex watchlist
2. Handle Plex authentication token
3. Fetch watchlist via Plex API
4. Commit: "feat(lists): add Plex watchlist integration"

---

### Task 11.6: Letterboxd Integration

**Files:**
- Create: `src/convex/lists/letterboxd.ts`

**Steps:**
1. Create `sync` action for Letterboxd lists
2. Parse Letterboxd RSS feed format
3. Handle watchlist and custom lists
4. Map Letterboxd titles/years to TMDB IDs
5. Commit: "feat(lists): add Letterboxd integration"

---

### Task 11.7: TMDb List Integration

**Files:**
- Create: `src/convex/lists/tmdb.ts`

**Steps:**
1. Create `sync` action for TMDb lists
2. Handle user lists (requires TMDB account session)
3. Handle popular/trending lists (no auth needed)
4. Direct TMDB ID mapping (no conversion needed)
5. Commit: "feat(lists): add TMDb list integration"

---

### Task 11.8: List Sync Scheduler

**Files:**
- Modify: `src/convex/externalLists.ts`

**Steps:**
1. Create scheduled job for periodic list sync
2. Respect per-list sync intervals
3. Handle sync errors gracefully
4. Update lastSync timestamp
5. Commit: "feat(convex): add list sync scheduler"

---

## Phase 12: Media Servers

### Task 12.1: Media Servers Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `mediaServers` table with: name, type (plex, jellyfin, emby), host, port, apiKey, enabled
2. Add fields: useSsl, libraryMapping (maps idkarr root folders to server libraries)
3. Commit: "feat(schema): add media servers table"

---

### Task 12.2: Media Servers Functions

**Files:**
- Create: `src/convex/mediaServers.ts`

**Steps:**
1. Create `list`, `get`, `add`, `update`, `remove` functions
2. Create `test` action for connection testing
3. Commit: "feat(convex): add media servers CRUD"

---

### Task 12.3: Plex Integration

**Files:**
- Create: `src/convex/servers/plex.ts`

**Steps:**
1. Create `test` action
2. Create `getLibraries` action
3. Create `scanLibrary` action (targeted folder scan)
4. Create `getRecentlyPlayed` action
5. Commit: "feat(servers): add Plex integration"

---

### Task 12.4: Jellyfin Integration

**Files:**
- Create: `src/convex/servers/jellyfin.ts`

**Steps:**
1. Create `test` action
2. Create `getLibraries` action
3. Create `scanLibrary` action
4. Create `getRecentlyPlayed` action
5. Commit: "feat(servers): add Jellyfin integration"

---

### Task 12.5: Emby Integration

**Files:**
- Create: `src/convex/servers/emby.ts`

**Steps:**
1. Create `test` action for Emby connection
2. Create `getLibraries` action
3. Create `scanLibrary` action
4. Create `getRecentlyPlayed` action
5. Handle Emby API authentication (API key header)
6. Commit: "feat(servers): add Emby integration"

---

### Task 12.6: Library Scan Trigger

**Files:**
- Modify: `src/convex/import.ts`

**Steps:**
1. After successful import, trigger scan on configured media server
2. Use targeted folder scan, not full library
3. Handle multiple servers
4. Commit: "feat(convex): trigger media server scan after import"

---

### Task 12.7: Watch Status Sync

**Files:**
- Create: `src/convex/watchSync.ts`

**Steps:**
1. Create scheduled job to sync watch status
2. Fetch played items from media server
3. Update watchStatus field on episodes
4. Handle partial progress (in progress)
5. Commit: "feat(convex): add watch status sync"

---

## Phase 13: UI Foundation

### Task 13.1: App Shell Layout

**Files:**
- Modify: `src/routes/+layout.svelte`
- Create: `src/lib/components/layout/Sidebar.svelte`
- Create: `src/lib/components/layout/Header.svelte`

**Steps:**
1. Create sidebar navigation with links: Dashboard, Library, Calendar, Discovery, Requests, Queue, Settings
2. Create header with search, user menu, notifications
3. Add mobile-responsive hamburger menu
4. Add active route highlighting
5. Commit: "feat(ui): add app shell layout"

---

### Task 13.2: Navigation Component

**Files:**
- Create: `src/lib/components/layout/NavItem.svelte`
- Create: `src/lib/components/layout/NavSection.svelte`

**Steps:**
1. Create nav item component with icon, label, active state
2. Create nav section for grouped items
3. Add library type sub-navigation (TV, Movies, Anime, Music)
4. Commit: "feat(ui): add navigation components"

---

### Task 13.3: Theme System

**Files:**
- Modify: `src/lib/stores/theme.ts`
- Modify: `src/app.css`

**Steps:**
1. Implement theme store with light/dark/system modes
2. Add CSS variables for colors, spacing
3. Add theme toggle in header
4. Persist preference to localStorage
5. Commit: "feat(ui): add theme system"

---

### Task 13.4: Common Components

**Files:**
- Create: `src/lib/components/ui/card/`
- Create: `src/lib/components/ui/badge/`
- Create: `src/lib/components/ui/input/`
- Create: `src/lib/components/ui/select/`

**Steps:**
1. Add Card component (using shadcn-svelte CLI)
2. Add Badge component for status/tags
3. Add Input component
4. Add Select component
5. Commit: "feat(ui): add common UI components"

---

### Task 13.5: Media Card Component

**Files:**
- Create: `src/lib/components/media/MediaCard.svelte`

**Steps:**
1. Create card showing poster, title, year, status
2. Add hover state with quick actions
3. Show monitoring badge
4. Show quality profile badge
5. Handle missing poster gracefully
6. Commit: "feat(ui): add media card component"

---

### Task 13.6: Media Poster Component

**Files:**
- Create: `src/lib/components/media/MediaPoster.svelte`

**Steps:**
1. Create poster component with lazy loading
2. Add loading skeleton
3. Add fallback for missing images
4. Support multiple sizes
5. Commit: "feat(ui): add media poster component"

---

## Phase 14: UI - Dashboard

### Task 14.1: Dashboard Page

**Files:**
- Create: `src/routes/dashboard/+page.svelte`

**Steps:**
1. Create dashboard layout with grid of widgets
2. Add responsive column layout
3. Commit: "feat(ui): add dashboard page structure"

---

### Task 14.2: Activity Feed Widget

**Files:**
- Create: `src/lib/components/dashboard/ActivityFeed.svelte`

**Steps:**
1. Create widget showing recent activity (imports, grabs, failures)
2. Use real-time subscription to history
3. Show timestamp, media title, event type
4. Link to media details
5. Commit: "feat(ui): add activity feed widget"

---

### Task 14.3: Upcoming Widget

**Files:**
- Create: `src/lib/components/dashboard/Upcoming.svelte`

**Steps:**
1. Show next 7 days of airing content
2. Group by date
3. Show episode info, air time
4. Link to episode/series
5. Commit: "feat(ui): add upcoming widget"

---

### Task 14.4: Recently Added Widget

**Files:**
- Create: `src/lib/components/dashboard/RecentlyAdded.svelte`

**Steps:**
1. Horizontal carousel of recently added media
2. Show posters in scroll container
3. Link to media details
4. Commit: "feat(ui): add recently added widget"

---

### Task 14.5: Health Status Widget

**Files:**
- Create: `src/lib/components/dashboard/HealthStatus.svelte`

**Steps:**
1. Show health warnings and errors
2. Color-coded severity
3. Link to relevant settings
4. Show count badge
5. Commit: "feat(ui): add health status widget"

---

### Task 14.6: Stats Widget

**Files:**
- Create: `src/lib/components/dashboard/Stats.svelte`

**Steps:**
1. Show key stats: total media, storage used, missing, upgradeable
2. Breakdown by media type
3. Commit: "feat(ui): add stats widget"

---

## Phase 15: UI - Library

### Task 15.1: Library Page

**Files:**
- Create: `src/routes/library/+page.svelte`

**Steps:**
1. Create library page with filter bar and grid
2. Default to showing all media types
3. Add route params for media type filter
4. Commit: "feat(ui): add library page"

---

### Task 15.2: Filter Bar Component

**Files:**
- Create: `src/lib/components/library/FilterBar.svelte`

**Steps:**
1. Create filter bar with: media type tabs, search input, filter presets dropdown
2. Add sort dropdown (title, date added, year)
3. Add view toggle (grid/list)
4. Commit: "feat(ui): add library filter bar"

---

### Task 15.3: Filter Presets

**Files:**
- Create: `src/lib/components/library/FilterPresets.svelte`

**Steps:**
1. Create preset buttons: All, Missing, Upgradeable, Monitored, Unmonitored
2. Store active preset in URL params
3. Allow saving custom presets
4. Commit: "feat(ui): add filter presets"

---

### Task 15.4: Media Grid

**Files:**
- Create: `src/lib/components/library/MediaGrid.svelte`

**Steps:**
1. Create responsive grid of MediaCard components
2. Implement infinite scroll pagination
3. Show loading skeletons
4. Handle empty state
5. Commit: "feat(ui): add media grid"

---

### Task 15.5: Media List View

**Files:**
- Create: `src/lib/components/library/MediaList.svelte`

**Steps:**
1. Create table/list view alternative
2. Show more details per row: title, year, status, quality, files, size
3. Sortable columns
4. Commit: "feat(ui): add media list view"

---

### Task 15.6: Media Detail Page - Series

**Files:**
- Create: `src/routes/library/[type]/[id]/+page.svelte`
- Create: `src/lib/components/media/SeriesDetail.svelte`

**Steps:**
1. Create detail page layout with backdrop, poster, info
2. Show series metadata: title, year, status, network, overview
3. Add action buttons: search, refresh, edit, delete
4. Commit: "feat(ui): add series detail page"

---

### Task 15.7: Season List Component

**Files:**
- Create: `src/lib/components/media/SeasonList.svelte`

**Steps:**
1. Create collapsible season panels
2. Show season poster, episode count, file count
3. Toggle monitored per season
4. Commit: "feat(ui): add season list"

---

### Task 15.8: Episode List Component

**Files:**
- Create: `src/lib/components/media/EpisodeList.svelte`

**Steps:**
1. Create episode table within season
2. Show: number, title, air date, status, quality
3. Episode actions: search, toggle monitored
4. Commit: "feat(ui): add episode list"

---

### Task 15.9: Media Detail Page - Movie

**Files:**
- Create: `src/lib/components/media/MovieDetail.svelte`

**Steps:**
1. Create movie detail layout
2. Show: title, year, runtime, certification, studio
3. Show release dates (theatrical, digital, physical)
4. Show file info if exists
5. Commit: "feat(ui): add movie detail page"

---

### Task 15.10: Add Media Modal

**Files:**
- Create: `src/lib/components/media/AddMediaModal.svelte`

**Steps:**
1. Create modal for adding new media
2. Search by title using metadata providers
3. Show search results with posters
4. Select quality profile, root folder, monitoring options
5. Commit: "feat(ui): add media modal"

---

### Task 15.11: Edit Media Modal

**Files:**
- Create: `src/lib/components/media/EditMediaModal.svelte`

**Steps:**
1. Create modal for editing media properties
2. Edit: quality profile, root folder, tags, monitored
3. Save changes
4. Commit: "feat(ui): add edit media modal"

---

## Phase 16: UI - Queue

### Task 16.1: Queue Page

**Files:**
- Create: `src/routes/queue/+page.svelte`

**Steps:**
1. Create queue page with tabs: Active, History, Blocklist
2. Real-time updates via subscription
3. Commit: "feat(ui): add queue page"

---

### Task 16.2: Active Downloads Component

**Files:**
- Create: `src/lib/components/queue/ActiveDownloads.svelte`

**Steps:**
1. Show list of active downloads
2. Display: title, progress bar, speed, ETA, status
3. Actions: pause, remove, retry
4. Commit: "feat(ui): add active downloads"

---

### Task 16.3: Download History Component

**Files:**
- Create: `src/lib/components/queue/DownloadHistory.svelte`

**Steps:**
1. Show paginated history of past downloads
2. Filter by event type
3. Show: title, event, quality, date
4. Commit: "feat(ui): add download history"

---

### Task 16.4: Blocklist Component

**Files:**
- Create: `src/lib/components/queue/Blocklist.svelte`

**Steps:**
1. Show blocklisted releases
2. Filter by media
3. Actions: remove from blocklist, clear all
4. Commit: "feat(ui): add blocklist management"

---

## Phase 17: UI - Settings

### Task 17.1: Settings Layout

**Files:**
- Create: `src/routes/settings/+layout.svelte`
- Create: `src/routes/settings/+page.svelte`

**Steps:**
1. Create settings page with sidebar navigation
2. Categories: General, Media, Quality, Indexers, Download Clients, Lists, Media Servers, Users, System
3. Commit: "feat(ui): add settings layout"

---

### Task 17.2: General Settings Page

**Files:**
- Create: `src/routes/settings/general/+page.svelte`

**Steps:**
1. Instance name, naming preset selection
2. Root folder management (add, edit, remove)
3. Commit: "feat(ui): add general settings"

---

### Task 17.3: Quality Settings Page

**Files:**
- Create: `src/routes/settings/quality/+page.svelte`

**Steps:**
1. Quality definitions editor
2. Quality profiles list with add/edit/remove
3. Custom formats list with add/edit/remove
4. TRaSH Guides sync settings
5. Commit: "feat(ui): add quality settings"

---

### Task 17.4: Quality Profile Editor

**Files:**
- Create: `src/lib/components/settings/QualityProfileEditor.svelte`

**Steps:**
1. Edit profile name, cutoff, upgrade allowed
2. Drag-and-drop quality ordering
3. Toggle qualities enabled/disabled
4. Custom format scores per profile
5. Commit: "feat(ui): add quality profile editor"

---

### Task 17.5: Custom Format Editor

**Files:**
- Create: `src/lib/components/settings/CustomFormatEditor.svelte`

**Steps:**
1. Edit format name
2. Add/remove conditions (type, pattern, negate, required)
3. Test against sample release name
4. Commit: "feat(ui): add custom format editor"

---

### Task 17.6: Indexers Settings Page

**Files:**
- Create: `src/routes/settings/indexers/+page.svelte`

**Steps:**
1. List indexers with status indicators
2. Add new indexer form
3. Edit indexer modal
4. Test connection button
5. Commit: "feat(ui): add indexers settings"

---

### Task 17.7: Download Clients Settings Page

**Files:**
- Create: `src/routes/settings/download-clients/+page.svelte`

**Steps:**
1. List download clients with status
2. Add new client form (type-specific fields)
3. Edit client modal
4. Test connection button
5. Remote path mappings
6. Commit: "feat(ui): add download clients settings"

---

### Task 17.8: Users Settings Page

**Files:**
- Create: `src/routes/settings/users/+page.svelte`

**Steps:**
1. List users with roles
2. Edit user role
3. Remove user (admin only)
4. Commit: "feat(ui): add users settings"

---

### Task 17.9: System Settings Page

**Files:**
- Create: `src/routes/settings/system/+page.svelte`

**Steps:**
1. Backup/restore controls
2. Log viewer with level filter
3. About section with version info
4. Commit: "feat(ui): add system settings"

---

## Phase 18: UI - Discovery

### Task 18.1: Discovery Page

**Files:**
- Create: `src/routes/discovery/+page.svelte`

**Steps:**
1. Create discovery page with search bar
2. Show trending/popular content
3. Personalized recommendations section
4. Commit: "feat(ui): add discovery page"

---

### Task 18.2: Discovery Search

**Files:**
- Create: `src/lib/components/discovery/DiscoverySearch.svelte`

**Steps:**
1. Search input with debounce
2. Search across metadata providers
3. Show results grouped by media type
4. Quick-add action on results
5. Commit: "feat(ui): add discovery search"

---

### Task 18.3: Trending Section

**Files:**
- Create: `src/lib/components/discovery/Trending.svelte`

**Steps:**
1. Fetch trending from TMDB/AniList
2. Horizontal carousel per media type
3. Show poster, title, year
4. Quick-add action
5. Commit: "feat(ui): add trending section"

---

### Task 18.4: Recommendations Section

**Files:**
- Create: `src/lib/components/discovery/Recommendations.svelte`

**Steps:**
1. "Because you watched X" style recommendations
2. Based on genres/actors of library content
3. Commit: "feat(ui): add recommendations section"

---

## Phase 19: UI - Calendar

### Task 19.1: Calendar Page

**Files:**
- Create: `src/routes/calendar/+page.svelte`

**Steps:**
1. Create calendar page with week/month toggle
2. Filter by media type
3. Commit: "feat(ui): add calendar page"

---

### Task 19.2: Month View Component

**Files:**
- Create: `src/lib/components/calendar/MonthView.svelte`

**Steps:**
1. Traditional month calendar grid
2. Show episodes/releases on their dates
3. Color-coded by status (monitored, downloaded)
4. Navigation to prev/next month
5. Commit: "feat(ui): add calendar month view"

---

### Task 19.3: Week View Component

**Files:**
- Create: `src/lib/components/calendar/WeekView.svelte`

**Steps:**
1. Week view with more detail per day
2. Show episode titles, air times
3. Commit: "feat(ui): add calendar week view"

---

### Task 19.4: iCal Export

**Files:**
- Create: `src/routes/api/calendar/+server.ts`

**Steps:**
1. Create API endpoint returning iCal format
2. Include upcoming episodes with air dates
3. Support filter by media type via query param
4. Commit: "feat(api): add iCal export"

---

## Phase 20: UI - Mass Editor

### Task 20.1: Mass Editor Page

**Files:**
- Create: `src/routes/mass-editor/+page.svelte`

**Steps:**
1. Create mass editor page
2. Multi-select mode for media items
3. Bulk action bar
4. Commit: "feat(ui): add mass editor page"

---

### Task 20.2: Multi-Select Component

**Files:**
- Create: `src/lib/components/mass-editor/MultiSelect.svelte`

**Steps:**
1. Checkbox selection on media cards/rows
2. Select all / deselect all
3. Selection count indicator
4. Commit: "feat(ui): add multi-select"

---

### Task 20.3: Bulk Actions Bar

**Files:**
- Create: `src/lib/components/mass-editor/BulkActions.svelte`

**Steps:**
1. Fixed bar at bottom when items selected
2. Actions: change quality profile, change root folder, add/remove tags, set monitored, delete
3. Confirmation for destructive actions
4. Commit: "feat(ui): add bulk actions"

---

## Phase 21: Analytics

### Task 21.1: Analytics Page

**Files:**
- Create: `src/routes/analytics/+page.svelte`

**Steps:**
1. Create analytics dashboard page
2. Grid layout for charts and stats
3. Commit: "feat(ui): add analytics page"

---

### Task 21.2: Library Statistics Component

**Files:**
- Create: `src/lib/components/analytics/LibraryStats.svelte`

**Steps:**
1. Total counts by media type
2. Completion percentage
3. Quality distribution pie chart
4. Commit: "feat(ui): add library statistics"

---

### Task 21.3: Activity Graphs Component

**Files:**
- Create: `src/lib/components/analytics/ActivityGraphs.svelte`

**Steps:**
1. Downloads over time (line chart)
2. Library growth over time
3. Time period selector (week, month, year)
4. Commit: "feat(ui): add activity graphs"

---

### Task 21.4: Storage Trends Component

**Files:**
- Create: `src/lib/components/analytics/StorageTrends.svelte`

**Steps:**
1. Storage usage per root folder
2. Growth trend projection
3. Warnings for approaching capacity
4. Commit: "feat(ui): add storage trends"

---

### Task 21.5: Indexer Performance Component

**Files:**
- Create: `src/lib/components/analytics/IndexerPerformance.svelte`

**Steps:**
1. Success rate per indexer
2. Average response time
3. Queries per day
4. Commit: "feat(ui): add indexer performance"

---

## Phase 22: Health & Logs

### Task 22.1: Health Checks System

**Files:**
- Create: `src/convex/health.ts`

**Steps:**
1. Create `runChecks` action that performs all health checks
2. Check: indexer connectivity, download client connectivity, root folder access, disk space
3. Store results in health status table
4. Create scheduled job for periodic checks
5. Commit: "feat(convex): add health check system"

---

### Task 22.2: Health Page

**Files:**
- Create: `src/routes/system/health/+page.svelte`

**Steps:**
1. Show all health check results
2. Severity levels with colors
3. Actionable messages with links
4. Manual refresh button
5. Commit: "feat(ui): add health page"

---

### Task 22.3: Logging System

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/logs.ts`

**Steps:**
1. Add `logs` table with: level, message, context, timestamp
2. Create `log` internal mutation
3. Create `list` query with level filter and pagination
4. Create `clear` mutation
5. Implement log rotation (keep last N entries)
6. Commit: "feat(convex): add logging system"

---

### Task 22.4: Log Viewer Page

**Files:**
- Create: `src/routes/system/logs/+page.svelte`

**Steps:**
1. Create log viewer with real-time updates
2. Filter by level (info, warning, error, debug)
3. Search within logs
4. Download logs as file
5. Commit: "feat(ui): add log viewer"

---

## Phase 23: API & Webhooks

### Task 23.1: API Key Management

**Files:**
- Modify: `src/convex/schema.ts`
- Create: `src/convex/apiKeys.ts`

**Steps:**
1. Add `apiKeys` table with: name, key (hashed), scope (readonly, full), lastUsed
2. Create `list`, `create`, `revoke` functions
3. Create `validate` query for API auth
4. Commit: "feat(convex): add API key management"

---

### Task 23.2: API Settings Page

**Files:**
- Create: `src/routes/settings/api/+page.svelte`

**Steps:**
1. List API keys with last used
2. Create new key (show once)
3. Revoke key
4. API documentation link
5. Commit: "feat(ui): add API settings"

---

### Task 23.3: Webhooks Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `webhooks` table with: name, url, events (array), headers, enabled
2. Add fields: lastTrigger, lastError, failCount
3. Commit: "feat(schema): add webhooks table"

---

### Task 23.4: Webhooks Functions

**Files:**
- Create: `src/convex/webhooks.ts`

**Steps:**
1. Create `list`, `get`, `add`, `update`, `remove` functions
2. Create `test` action to send test payload
3. Create `trigger` internal action for firing webhooks
4. Implement retry on failure
5. Commit: "feat(convex): add webhooks functions"

---

### Task 23.5: Webhooks Settings Page

**Files:**
- Create: `src/routes/settings/webhooks/+page.svelte`

**Steps:**
1. List webhooks with status
2. Add new webhook (URL, events, headers)
3. Test webhook button
4. Commit: "feat(ui): add webhooks settings"

---

### Task 23.6: Webhook Event Integration

**Files:**
- Modify: `src/convex/media.ts`
- Modify: `src/convex/import.ts`
- Modify: `src/convex/grab.ts`

**Steps:**
1. Trigger `media.added` webhook when media added
2. Trigger `download.started` when grab succeeds
3. Trigger `episode.imported` / `movie.imported` on import
4. Trigger `download.failed` on failure
5. Commit: "feat(convex): integrate webhook triggers"

---

## Phase 24: Backup & Storage

### Task 24.1: Backup Functions

**Files:**
- Create: `src/convex/backup.ts`

**Steps:**
1. Create `export` action that generates full backup JSON
2. Include: settings, profiles, formats, indexers, clients, media, history
3. Compress output
4. Create `import` action that restores from backup
5. Handle version compatibility
6. Commit: "feat(convex): add backup export/import"

---

### Task 24.2: Selective Export/Import

**Files:**
- Modify: `src/convex/backup.ts`

**Steps:**
1. Add options to export specific sections only
2. Add merge vs replace option on import
3. Handle conflicts on import
4. Commit: "feat(convex): add selective backup options"

---

### Task 24.3: Scheduled Backups

**Files:**
- Modify: `src/convex/backup.ts`

**Steps:**
1. Create scheduled job for automatic backups
2. Configurable schedule (daily, weekly)
3. Retention policy (keep last N)
4. Store in Convex file storage
5. Commit: "feat(convex): add scheduled backups"

---

### Task 24.4: Backup Settings Page

**Files:**
- Create: `src/routes/settings/backup/+page.svelte`

**Steps:**
1. Manual backup trigger
2. Download backup file
3. Upload restore file
4. Scheduled backup settings
5. List available backups
6. Commit: "feat(ui): add backup settings"

---

### Task 24.5: Storage Management

**Files:**
- Create: `src/convex/storage.ts`

**Steps:**
1. Create `getStorageStats` action (requires file system access - may need HTTP action)
2. Track disk usage per root folder
3. Calculate growth trends
4. Commit: "feat(convex): add storage tracking"

---

## Phase 25: AI Tier 1 - Local Recommendations

### Task 25.1: Library Analysis

**Files:**
- Create: `src/convex/ai/analysis.ts`

**Steps:**
1. Create `analyzeLibrary` function that extracts patterns
2. Collect: genres, actors, directors, years, studios
3. Weight by frequency in library
4. Store analysis results
5. Commit: "feat(ai): add library analysis"

---

### Task 25.2: Similarity Matching

**Files:**
- Create: `src/convex/ai/similarity.ts`

**Steps:**
1. Create `findSimilar` query that finds similar content
2. Match on shared genres, cast, crew
3. Score by similarity
4. Filter out already in library
5. Commit: "feat(ai): add similarity matching"

---

### Task 25.3: Local Recommendations

**Files:**
- Create: `src/convex/ai/recommendations.ts`

**Steps:**
1. Create `getRecommendations` query
2. "Because you watched X" logic
3. Trending in your library (recently added popular genres)
4. Combine multiple signals
5. Commit: "feat(ai): add local recommendations"

---

## Phase 26: AI Tier 2 - RAG Discovery

### Task 26.1: Embedding Generation

**Files:**
- Create: `src/convex/ai/embeddings.ts`

**Steps:**
1. Create action to generate embeddings for media metadata
2. Support local (Ollama) or cloud (OpenAI) embedding models
3. Store embeddings in Convex
4. Commit: "feat(ai): add embedding generation"

---

### Task 26.2: Vector Search

**Files:**
- Modify: `src/convex/ai/embeddings.ts`

**Steps:**
1. Create `searchByEmbedding` query
2. Implement cosine similarity search
3. Return ranked results
4. Commit: "feat(ai): add vector search"

---

### Task 26.3: Natural Language Search

**Files:**
- Create: `src/convex/ai/nlSearch.ts`

**Steps:**
1. Create `search` action that handles natural language queries
2. Generate embedding for query
3. Search library embeddings
4. Return semantic matches
5. Commit: "feat(ai): add natural language search"

---

### Task 26.4: RAG Discovery UI

**Files:**
- Modify: `src/lib/components/discovery/DiscoverySearch.svelte`

**Steps:**
1. Add "AI Search" toggle
2. Show natural language search when enabled
3. Display semantic results differently
4. Commit: "feat(ui): add RAG search mode"

---

## Phase 27: AI Tier 3 - Conversational Assistant

### Task 27.1: Chat Interface

**Files:**
- Create: `src/lib/components/ai/ChatInterface.svelte`

**Steps:**
1. Create chat panel (slide-out or modal)
2. Message history display
3. Input with send button
4. Typing indicator
5. Commit: "feat(ui): add AI chat interface"

---

### Task 27.2: LLM Integration

**Files:**
- Create: `src/convex/ai/chat.ts`

**Steps:**
1. Create `chat` action that handles conversation
2. Support Ollama (local) or OpenAI/Anthropic (cloud)
3. Include system prompt with idkarr context
4. Stream responses if possible
5. Commit: "feat(ai): add LLM chat integration"

---

### Task 27.3: Action Execution

**Files:**
- Modify: `src/convex/ai/chat.ts`

**Steps:**
1. Parse LLM responses for action intents
2. Execute: search for media, add to library, check status
3. Confirm actions with user
4. Commit: "feat(ai): add chat action execution"

---

### Task 27.4: AI Settings

**Files:**
- Create: `src/routes/settings/ai/+page.svelte`

**Steps:**
1. AI tier selection
2. Model configuration (local vs cloud)
3. API key for cloud providers
4. Ollama endpoint for local
5. Commit: "feat(ui): add AI settings"

---

## Phase 28: PWA

### Task 28.1: Web Manifest

**Files:**
- Create: `static/manifest.json`
- Modify: `src/app.html`

**Steps:**
1. Create manifest with app name, icons, theme colors
2. Add start_url, display mode (standalone)
3. Link manifest in HTML head
4. Commit: "feat(pwa): add web manifest"

---

### Task 28.2: Service Worker

**Files:**
- Create: `src/service-worker.ts`
- Modify: `svelte.config.js`

**Steps:**
1. Configure SvelteKit service worker
2. Cache static assets
3. Cache API responses for offline
4. Handle offline fallback
5. Commit: "feat(pwa): add service worker"

---

### Task 28.3: Offline Library Browsing

**Files:**
- Modify: `src/service-worker.ts`

**Steps:**
1. Cache library metadata for offline access
2. Show cached content when offline
3. Queue actions for when back online
4. Commit: "feat(pwa): add offline library browsing"

---

### Task 28.4: Push Notifications

**Files:**
- Create: `src/convex/notifications.ts`
- Create: `src/lib/components/Notifications.svelte`

**Steps:**
1. Implement push notification subscription
2. Create `subscribe` mutation to store subscription
3. Send notifications for: new content, requests, downloads
4. Handle notification click to open app
5. Commit: "feat(pwa): add push notifications"

---

### Task 28.5: Install Prompt

**Files:**
- Create: `src/lib/components/InstallPrompt.svelte`

**Steps:**
1. Detect if app can be installed
2. Show install banner/button
3. Handle install flow
4. Commit: "feat(pwa): add install prompt"

---

## Phase 29: System Operations

### Task 29.1: Update Check Schema

**Files:**
- Modify: `src/convex/schema.ts`

**Steps:**
1. Add `systemInfo` singleton table with: currentVersion, latestVersion, lastUpdateCheck, updateAvailable
2. Commit: "feat(schema): add system info table"

---

### Task 29.2: Update Check Functions

**Files:**
- Create: `src/convex/updates.ts`

**Steps:**
1. Create `checkForUpdates` action that fetches latest release from GitHub
2. Compare version numbers
3. Store result in systemInfo
4. Create scheduled job for daily update check
5. Create `getUpdateStatus` query
6. Commit: "feat(convex): add update check functions"

---

### Task 29.3: Update Notification UI

**Files:**
- Modify: `src/lib/components/layout/Header.svelte`
- Create: `src/lib/components/system/UpdateBanner.svelte`

**Steps:**
1. Show notification badge when update available
2. Create update banner with version info and release notes link
3. Dismissable until next version
4. Commit: "feat(ui): add update notification"

---

### Task 29.4: Response Caching Layer

**Files:**
- Create: `src/convex/cache.ts`

**Steps:**
1. Create `cachedResults` table with: key, value, expiry, createdAt
2. Create `get` query that returns cached value if not expired
3. Create `set` mutation with TTL
4. Create `invalidate` mutation
5. Create `cleanup` scheduled job to remove expired entries
6. Commit: "feat(convex): add response caching layer"

---

### Task 29.5: Metadata Provider Caching

**Files:**
- Modify: `src/convex/providers/tmdb.ts`
- Modify: `src/convex/providers/tvdb.ts`
- Modify: `src/convex/providers/anilist.ts`

**Steps:**
1. Wrap provider calls with cache layer
2. Cache search results for 1 hour
3. Cache details for 24 hours
4. Invalidate on manual refresh
5. Commit: "feat(convex): add metadata provider caching"

---

### Task 29.6: Indexer Response Caching

**Files:**
- Modify: `src/convex/search/torznab.ts`
- Modify: `src/convex/search/newznab.ts`

**Steps:**
1. Cache search results for 15 minutes
2. Cache RSS results for 5 minutes
3. Key by indexer + query params
4. Commit: "feat(convex): add indexer response caching"

---

### Task 29.7: Image Proxy Caching

**Files:**
- Create: `src/convex/imageProxy.ts`

**Steps:**
1. Create `getImage` action that proxies external images
2. Store images in Convex file storage
3. Serve cached images with long TTL
4. Refresh images on metadata sync
5. Reduces external requests and improves load times
6. Commit: "feat(convex): add image proxy caching"

---

### Task 29.8: Cache Management UI

**Files:**
- Create: `src/routes/settings/cache/+page.svelte`

**Steps:**
1. Show cache statistics (entries, size, hit rate)
2. Clear cache buttons (all, by type)
3. Cache TTL configuration
4. Commit: "feat(ui): add cache management settings"

---

## Final Tasks

### Task F.1: End-to-End Testing

**Steps:**
1. Test full flow: add media → search → grab → download → import
2. Test all media types (TV, Movie, Anime, Music)
3. Test user roles and permissions
4. Test offline functionality
5. Fix any discovered issues
6. Commit: "test: add e2e test coverage"

---

### Task F.2: Performance Optimization

**Steps:**
1. Review and optimize database queries
2. Add appropriate indexes
3. Implement pagination everywhere
4. Review bundle size
5. Commit: "perf: optimize queries and bundle"

---

### Task F.3: Documentation

**Steps:**
1. Update README with setup instructions
2. Document environment variables
3. Document API endpoints
4. Create user guide basics
5. Commit: "docs: add documentation"

---

## Execution Approach

This plan is designed for task-by-task execution. Each task is self-contained with clear:
- Files to create/modify
- Steps to complete
- Verification criteria
- Commit message

**Recommended execution:** Use subagent-driven development - dispatch one subagent per task, review between tasks.
