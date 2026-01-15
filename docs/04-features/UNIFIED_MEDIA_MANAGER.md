# Unified Media Manager (idkarr) - TV Series, Movies, Anime & Music

---

## Problem Statement

### Current Separation (Sonarr + Radarr + Lidarr)

**Sonarr** (TV Series):
- Episodic content with seasons
- TVDB/TVMaze metadata
- S01E01 naming convention
- Episode monitoring
- Season-based organization

**Radarr** (Movies):
- Standalone films
- TMDB metadata
- Year-based naming
- Single file per movie
- No seasons or episodes

**Lidarr** (Music):
- Artist/Album/Track hierarchy
- MusicBrainz metadata
- Release group handling (original, remaster, deluxe)
- Audio quality profiles (FLAC, MP3, etc.)
- Multiple releases per album

**Why They're Currently Separate:**
1. **Historical reasons**: Started as separate forks of NZBDrone
2. **Different data models**: TV has seasons/episodes, movies don't, music has artists/albums/tracks
3. **Different metadata sources**: TV uses TVDB, movies use TMDB, music uses MusicBrainz
4. **Different naming conventions**: TV needs S01E01, movies need Title.Year, music needs Artist/Album/Track
5. **Different parsing logic**: Release parsing differs significantly
6. **Separate development teams**: Different maintainers, different priorities

### Why Unification Makes Sense

**Shared Infrastructure (95% overlap):**
- Same download clients (transmission, deluge, qBittorrent, sabnzbd)
- Same indexers (NZBGeek, NZB.su, etc.)
- Same quality profiles (1080p, 2160p, WEB-DL, Blu-ray)
- Same custom formats (proper, repack, remux)
- Same notifications (Discord, Slack, Email)
- Same import lists (Trakt, IMDb lists)
- Same file management (renaming, deleting, moving)
- Same queue management
- Same history tracking
- Same wanted/missing tracking
- Same calendar view

**User Experience Issues with Separate Apps:**
- Three+ separate installations (triple resource usage)
- Three separate databases (no shared configuration)
- Three separate web UIs (different URLs, different logins)
- Duplicate configuration (indexers, download clients, notifications)
- Separate quality profiles (can't reuse across apps)
- Separate histories (can't see all downloads in one place)
- Separate queues (harder to manage overall download status)
- Separate instances for anime (4+ installations total)

**Technical Debt:**
- 95% duplicate code between Sonarr, Radarr, and Lidarr
- Separate releases to maintain and update
- Separate bugs and features
- Separate documentation
- Separate communities and support

---

## Unified Architecture

### idkarr - Single Application for TV, Movies, Anime & Music

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            idkarr (Unified)                                   │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                           Content Types                                 │  │
│  │                                                                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │  TV Series  │  │   Movies    │  │    Anime    │  │    Music    │   │  │
│  │  │             │  │             │  │             │  │             │   │  │
│  │  │ - Episodes  │  │ - Single    │  │ - Episodes  │  │ - Artists   │   │  │
│  │  │ - Seasons   │  │ - Year      │  │ - Seasons   │  │ - Albums    │   │  │
│  │  │ - TVDB      │  │ - TMDB      │  │ - AniDB     │  │ - Tracks    │   │  │
│  │  │             │  │             │  │             │  │ - MusicBrainz│  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                                         │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                          │
│        ┌───────────────────────────┼───────────────────────────┐             │
│        │                           │                           │             │
│  ┌─────▼───────────┐  ┌────────────▼────────────┐  ┌──────────▼──────────┐  │
│  │  Shared Core    │  │     Shared Core         │  │    Shared Core      │  │
│  │                 │  │                         │  │                     │  │
│  │ • Metadata      │  │ • Download Clients      │  │ • Quality Profiles  │  │
│  │   (TVDB/TMDB/   │  │ • Queue                 │  │ • Custom Formats    │  │
│  │    MusicBrainz) │  │ • History               │  │ • Tags              │  │
│  │ • Indexers      │  │ • Notifications         │  │ • Root Folders      │  │
│  │ • Search        │  │ • Calendar              │  │ • Settings          │  │
│  │ • Import Lists  │  │ • Wanted                │  │ • Users             │  │
│  │ • Release       │  │ • Health                │  │ • Permissions       │  │
│  │   Parsing       │  │                         │  │                     │  │
│  └─────────────────┘  └─────────────────────────┘  └─────────────────────┘  │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
             ┌───────────────────────┼───────────────────────┐
             │                       │                       │
      ┌──────▼────────┐       ┌──────▼────────┐       ┌──────▼────────┐
      │  Postgres DB  │       │  Redis Cache  │       │ BullMQ Queue  │
      └───────────────┘       └───────────────┘       └───────────────┘
```

### Key Design Decisions

#### 1. **Unified Content Model**
- Single `Media` table with `contentType` field ('series', 'movie', 'anime', 'music')
- Polymorphic relationships for episodes vs movie files vs tracks
- Type-specific metadata stored in JSONB
- Unified search across all content types

#### 2. **Shared Infrastructure**
- Single database with unified schema
- Single queue for all downloads
- Shared download clients, indexers, notifications
- Unified quality profiles and custom formats (video and audio)
- Single authentication/authorization system

#### 3. **Type-Specific Logic**
- Content type services handle type-specific operations
- Metadata adapters for TVDB, TMDB, AniDB, MusicBrainz
- Release parsers for each content type
- Different UI components per content type

#### 4. **Multi-Instance Support**
- Instances can be content-type specific (TV instance, Movie instance, Anime instance, Music instance)
- Or mixed-content instances (all content types in one)
- Instance-level filtering and access control

---

## Database Schema

### Content Type Enums

```typescript
// backend/db/schema/media.schema.ts

import { pgEnum } from 'drizzle-orm/pg-core';

export const contentTypeEnum = pgEnum('content_type', [
  'series', // TV series (standard)
  'anime', // Anime series
  'movie', // Movies
  'music', // Music (artists/albums/tracks)
]);

export const seriesStatusEnum = pgEnum('series_status', [
  'continuing',
  'ended',
  'upcoming',
  'deleted',
]);

export const movieStatusEnum = pgEnum('movie_status', [
  'released',
  'announced',
  'in cinemas',
  'deleted',
]);

export const artistStatusEnum = pgEnum('artist_status', [
  'active',
  'ended',
  'disbanded',
  'deleted',
]);

export const albumStatusEnum = pgEnum('album_status', [
  'released',
  'announced',
  'deleted',
]);

export const seriesTypeEnum = pgEnum('series_type', [
  'standard',
  'anime',
  'daily',
  'anime-daily',
]);

export const movieTypeEnum = pgEnum('movie_type', [
  'movie',
  'anime-movie',
  'documentary',
  'standup',
]);

export const artistTypeEnum = pgEnum('artist_type', [
  'person',
  'group',
  'orchestra',
  'choir',
  'character',
  'other',
]);

export const albumTypeEnum = pgEnum('album_type', [
  'album',
  'ep',
  'single',
  'broadcast',
  'compilation',
  'soundtrack',
  'live',
  'remix',
  'other',
]);

export const releaseTypeEnum = pgEnum('release_type', [
  'original',
  'remaster',
  'deluxe',
  'anniversary',
  'expanded',
  'collectors',
]);
```

### Unified Media Table

```typescript
// backend/db/schema/media.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  
  // --- TV Series Specific Fields ---
  // TVDB ID for series/anime
  tvdbId: integer('tvdb_id'),
  tvRageId: integer('tv_rage_id'),
  tvMazeId: integer('tv_maze_id'),
  aniDbId: integer('ani_db_id'),
  
  // --- Movie Specific Fields ---
  // TMDB ID for movies
  tmdbId: integer('tmdb_id'),
  imdbId: text('imdb_id'),
  
  // --- Common Fields ---
  title: text('title').notNull(),
  titleSlug: text('title_slug').notNull(),
  sortTitle: text('sort_title').notNull(),
  overview: text('overview'),
  
  // Status (union of seriesStatus and movieStatus)
  status: text('status').notNull(), // 'continuing', 'ended', 'released', 'announced', etc.
  
  // Images (common for all types)
  images: jsonb('images').$type<Array<{
    coverType: 'poster' | 'fanart' | 'banner' | 'screenshot' | 'logo' | 'clearart';
    url: string;
  }>>(),
  
  // --- TV Series Specific ---
  seasonCount: integer('season_count'),
  runtime: integer('runtime'), // Minutes per episode
  network: text('network'),
  airTime: text('air_time'),
  seasons: jsonb('seasons').$type<Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics?: {
      episodeFileCount: number;
      episodeCount: number;
      totalEpisodeCount: number;
      sizeOnDisk: number;
    };
  }>>(),
  
  // --- Movie Specific ---
  year: integer('year'),
  releaseDate: timestamp('release_date'),
  studio: text('studio'),
  runtime: integer('runtime'), // Minutes
  genres: jsonb('genres').$type<string[]>(),
  certification: text('certification'), // PG-13, R, etc.

  // --- Music/Artist Specific ---
  musicBrainzId: text('musicbrainz_id'), // MusicBrainz artist MBID
  discogsId: integer('discogs_id'),
  artistType: text('artist_type'), // 'person', 'group', 'orchestra', etc.
  disambiguation: text('disambiguation'), // For artists with same name
  members: jsonb('members').$type<Array<{
    name: string;
    musicBrainzId?: string;
    instrument?: string;
    active: boolean;
  }>>(),
  links: jsonb('links').$type<Array<{
    type: string; // 'official', 'wikipedia', 'discogs', 'lastfm', etc.
    url: string;
  }>>(),
  albumCount: integer('album_count'),

  // --- Configuration ---
  type: text('type'), // 'standard', 'anime', 'movie', 'anime-movie', etc.
  qualityProfileId: integer('quality_profile_id').notNull(),
  languageProfileId: integer('language_profile_id').notNull(),
  
  // Folder/Path Configuration
  rootFolderPath: text('root_folder_path').notNull(),
  
  // TV Series specific folder format
  seasonFolderFormat: text('season_folder_format'),
  seriesFolderFormat: text('series_folder_format'),
  seasonFolder: boolean('season_folder').default(true),
  
  // Movie specific folder format
  movieFolderFormat: text('movie_folder_format'),
  movieTitleYear: boolean('movie_title_year').default(true),
  includeQuality: boolean('include_quality').default(true),
  
  // Monitoring
  monitored: boolean('monitored').notNull().default(true),
  useSceneNumbering: boolean('use_scene_numbering').notNull().default(false),
  
  // Tags
  tags: jsonb('tags').$type<number[]>([]),
  
  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),
  
  // Statistics
  statistics: jsonb('statistics').$type<{
    // TV Series stats
    seasonCount?: number;
    episodeCount?: number;
    episodeFileCount?: number;
    totalEpisodeCount?: number;
    percentOfEpisodes?: number;
    // Movie stats
    sizeOnDisk?: number;
    hasFile?: boolean;
  }>(),
  
  lastInfoSync: timestamp('last_info_sync'),
  lastDiskSync: timestamp('last_disk_sync'),
});

export const mediaRelations = relations(media, ({ one, many }) => ({
  instance: one(instance, {
    fields: [media.instanceId],
    references: [instance.id],
  }),
  // Polymorphic: episodes (TV/anime), movieFiles (movies), or albums/tracks (music)
  episodes: many(episode),
  movieFiles: many(movieFile),
  albums: many(album), // Music: artist has many albums
  history: many(history),
  queueItems: many(queue),
}));
```

### Episodes Table (TV Series and Anime)

```typescript
// backend/db/schema/episode.schema.ts

import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { media } from './media.schema';

export const episode = pgTable('episode', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Episode Info
  tvdbId: integer('tvdb_id').notNull(),
  seasonNumber: integer('season_number').notNull(),
  episodeNumber: integer('episode_number').notNull(),
  title: text('title').notNull(),
  airDate: text('air_date'), // YYYY-MM-DD
  airDateUtc: timestamp('air_date_utc'),
  overview: text('overview'),
  hasFile: boolean('has_file').notNull().default(false),
  monitored: boolean('monitored').notNull().default(true),
  
  // Anime-specific
  absoluteEpisodeNumber: integer('absolute_episode_number'), // For anime (ep 1-12 across seasons)
  aniDbEpisodeNumber: integer('ani_db_episode_number'),
  
  // Scene Numbering
  sceneSeasonNumber: integer('scene_season_number'),
  sceneEpisodeNumber: integer('scene_episode_number'),
  sceneAbsoluteEpisodeNumber: integer('scene_absolute_episode_number'),
  
  // File Info
  episodeFileId: integer('episode_file_id').references(() => episodeFile.id),
  
  // Metadata
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const episodeRelations = relations(episode, ({ one, many }) => ({
  instance: one(instance, {
    fields: [episode.instanceId],
    references: [instance.id],
  }),
  media: one(media, {
    fields: [episode.mediaId],
    references: [media.id],
  }),
  episodeFile: one(episodeFile, {
    fields: [episode.episodeFileId],
    references: [episodeFile.id],
  }),
}));
```

### Episode Files Table (TV Series and Anime)

```typescript
// backend/db/schema/episodeFile.schema.ts

import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { media } from './media.schema';

export const episodeFile = pgTable('episode_file', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Season/Episode
  seasonNumber: integer('season_number').notNull(),
  episodeNumbers: jsonb('episode_numbers').notNull().$type<number[]>(), // Multi-episode files
  
  // File Info
  relativePath: text('relative_path').notNull(),
  path: text('path').notNull(),
  size: integer('size').notNull(), // Bytes
  dateAdded: timestamp('date_added').notNull(),
  modified: timestamp('modified').notNull(),
  
  // Quality
  quality: jsonb('quality').$type<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  }>(),
  
  // Languages
  languages: jsonb('languages').$type<Array<{
    id: number;
    name: string;
  }>>(),
  
  // Media Info (optional)
  mediaInfo: jsonb('media_info').$type<{
    audioBitrate?: number;
    audioChannels?: number;
    audioCodec?: string;
    audioLanguages?: string[];
    audioStreamCount?: number;
    videoBitDepth?: number;
    videoBitrate?: number;
    videoCodec?: string;
    videoFps?: number;
    resolution?: string;
    runTime?: string;
    scanType?: string;
    subtitleLanguages?: string[];
  }>(),
  
  // Scene info
  sceneName: text('scene_name'),
  releaseGroup: text('release_group'),
  
  // Custom Formats
  customFormats: jsonb('custom_formats').$type<Array<{
    id: number;
    name: string;
  }>>(),
  customFormatScore: integer('custom_format_score').notNull().default(0),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const episodeFileRelations = relations(episodeFile, ({ one, many }) => ({
  instance: one(instance, {
    fields: [episodeFile.instanceId],
    references: [instance.id],
  }),
  media: one(media, {
    fields: [episodeFile.mediaId],
    references: [media.id],
  }),
}));
```

### Movie Files Table (Movies)

```typescript
// backend/db/schema/movieFile.schema.ts

import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { media } from './media.schema';

export const movieFile = pgTable('movie_file', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Edition (for multiple releases of same movie)
  edition: text('edition'), // 'Director\'s Cut', 'Extended', etc.
  
  // File Info
  relativePath: text('relative_path').notNull(),
  path: text('path').notNull(),
  size: integer('size').notNull(), // Bytes
  dateAdded: timestamp('date_added').notNull(),
  modified: timestamp('modified').notNull(),
  
  // Quality
  quality: jsonb('quality').$type<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  }>(),
  
  // Languages
  languages: jsonb('languages').$type<Array<{
    id: number;
    name: string;
  }>>(),
  
  // Media Info (optional)
  mediaInfo: jsonb('media_info').$type<{
    audioBitrate?: number;
    audioChannels?: number;
    audioCodec?: string;
    audioLanguages?: string[];
    audioStreamCount?: number;
    videoBitDepth?: number;
    videoBitrate?: number;
    videoCodec?: string;
    videoFps?: number;
    resolution?: string;
    runTime?: string;
    scanType?: string;
    subtitleLanguages?: string[];
  }>(),
  
  // Scene info
  sceneName: text('scene_name'),
  releaseGroup: text('release_group'),
  
  // Custom Formats
  customFormats: jsonb('custom_formats').$type<Array<{
    id: number;
    name: string;
  }>>(),
  customFormatScore: integer('custom_format_score').notNull().default(0),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const movieFileRelations = relations(movieFile, ({ one }) => ({
  instance: one(instance, {
    fields: [movieFile.instanceId],
    references: [instance.id],
  }),
  media: one(media, {
    fields: [movieFile.mediaId],
    references: [media.id],
  }),
}));
```

### Album Table (Music)

```typescript
// backend/db/schema/album.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { media } from './media.schema';

export const album = pgTable('album', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  artistId: integer('artist_id').notNull().references(() => media.id, { onDelete: 'cascade' }), // References music artist in media table

  // MusicBrainz IDs
  musicBrainzId: text('musicbrainz_id').notNull(), // Release Group MBID
  musicBrainzReleaseId: text('musicbrainz_release_id'), // Specific Release MBID
  discogsId: integer('discogs_id'),

  // Album Info
  title: text('title').notNull(),
  titleSlug: text('title_slug').notNull(),
  overview: text('overview'),
  disambiguation: text('disambiguation'), // For albums with same name

  // Album Type and Status
  albumType: text('album_type').notNull(), // 'album', 'ep', 'single', 'compilation', etc.
  secondaryTypes: jsonb('secondary_types').$type<string[]>(), // ['live', 'remix', 'soundtrack']
  status: text('status').notNull(), // 'released', 'announced'

  // Release Info
  releaseDate: timestamp('release_date'),
  releaseYear: integer('release_year'),
  releaseType: text('release_type'), // 'original', 'remaster', 'deluxe', 'anniversary'
  label: text('label'), // Record label

  // Track Info
  trackCount: integer('track_count'),
  discCount: integer('disc_count').default(1),
  duration: integer('duration'), // Total duration in milliseconds

  // Images
  images: jsonb('images').$type<Array<{
    coverType: 'cover' | 'disc' | 'logo' | 'banner';
    url: string;
  }>>(),

  // Genres and Tags
  genres: jsonb('genres').$type<string[]>(),
  styles: jsonb('styles').$type<string[]>(), // More specific than genres

  // Configuration
  monitored: boolean('monitored').notNull().default(true),
  qualityProfileId: integer('quality_profile_id').notNull(),
  metadataProfileId: integer('metadata_profile_id'),

  // Folder/Path
  relativePath: text('relative_path'),
  path: text('path'),

  // Ratings
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),

  // Statistics
  statistics: jsonb('statistics').$type<{
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  }>(),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  lastInfoSync: timestamp('last_info_sync'),
  lastDiskSync: timestamp('last_disk_sync'),
});

export const albumRelations = relations(album, ({ one, many }) => ({
  instance: one(instance, {
    fields: [album.instanceId],
    references: [instance.id],
  }),
  artist: one(media, {
    fields: [album.artistId],
    references: [media.id],
  }),
  tracks: many(track),
  trackFiles: many(trackFile),
}));
```

### Track Table (Music)

```typescript
// backend/db/schema/track.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { album } from './album.schema';

export const track = pgTable('track', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  albumId: integer('album_id').notNull().references(() => album.id, { onDelete: 'cascade' }),

  // MusicBrainz IDs
  musicBrainzId: text('musicbrainz_id').notNull(), // Recording MBID
  musicBrainzTrackId: text('musicbrainz_track_id'), // Track MBID (specific to release)

  // Track Info
  title: text('title').notNull(),
  trackNumber: integer('track_number').notNull(),
  discNumber: integer('disc_number').notNull().default(1),
  absoluteTrackNumber: integer('absolute_track_number'), // Track number across all discs
  duration: integer('duration'), // Duration in milliseconds

  // Additional Artists (features, etc.)
  artistCredits: jsonb('artist_credits').$type<Array<{
    artistId?: number;
    name: string;
    musicBrainzId?: string;
    creditedAs?: string;
    joinPhrase?: string; // ' feat. ', ' & ', etc.
  }>>(),

  // Track Status
  hasFile: boolean('has_file').notNull().default(false),
  monitored: boolean('monitored').notNull().default(true),
  explicit: boolean('explicit').default(false),

  // File Info
  trackFileId: integer('track_file_id').references(() => trackFile.id),

  // Ratings
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
});

export const trackRelations = relations(track, ({ one }) => ({
  instance: one(instance, {
    fields: [track.instanceId],
    references: [instance.id],
  }),
  album: one(album, {
    fields: [track.albumId],
    references: [album.id],
  }),
  trackFile: one(trackFile, {
    fields: [track.trackFileId],
    references: [trackFile.id],
  }),
}));
```

### Track Files Table (Music)

```typescript
// backend/db/schema/trackFile.schema.ts

import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { album } from './album.schema';

export const trackFile = pgTable('track_file', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  albumId: integer('album_id').notNull().references(() => album.id, { onDelete: 'cascade' }),

  // Track Numbers (can be multi-track files for vinyl rips)
  trackNumbers: jsonb('track_numbers').notNull().$type<number[]>(),
  discNumber: integer('disc_number').notNull().default(1),

  // File Info
  relativePath: text('relative_path').notNull(),
  path: text('path').notNull(),
  size: integer('size').notNull(), // Bytes
  dateAdded: timestamp('date_added').notNull(),
  modified: timestamp('modified').notNull(),

  // Audio Quality
  quality: jsonb('quality').$type<{
    quality: {
      id: number;
      name: string; // 'FLAC', 'MP3-320', 'MP3-V0', 'AAC-256', etc.
      source: string; // 'cd', 'vinyl', 'web', 'cassette'
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  }>(),

  // Audio Info (from file analysis)
  audioInfo: jsonb('audio_info').$type<{
    audioCodec: string; // 'FLAC', 'MP3', 'AAC', 'ALAC', 'OPUS', 'VORBIS'
    audioBitrate: number; // kbps (e.g., 320, 256, variable)
    audioBitDepth?: number; // 16, 24, 32 for lossless
    audioSampleRate: number; // Hz (44100, 48000, 96000, etc.)
    audioChannels: number; // 2 for stereo, 1 for mono
    duration: number; // milliseconds
    format: string; // 'flac', 'mp3', 'm4a', 'ogg', 'opus'
  }>(),

  // Scene Info
  sceneName: text('scene_name'),
  releaseGroup: text('release_group'),

  // Custom Formats
  customFormats: jsonb('custom_formats').$type<Array<{
    id: number;
    name: string;
  }>>(),
  customFormatScore: integer('custom_format_score').notNull().default(0),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
});

export const trackFileRelations = relations(trackFile, ({ one }) => ({
  instance: one(instance, {
    fields: [trackFile.instanceId],
    references: [instance.id],
  }),
  album: one(album, {
    fields: [trackFile.albumId],
    references: [album.id],
  }),
}));
```

### History Table (Unified)

```typescript
// backend/db/schema/history.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { media } from './media.schema';

export const historyEventTypeEnum = pgEnum('history_event_type', [
  'grabbed',
  'seriesFolderImported',
  'downloadFolderImported',
  'downloadFailed',
  'downloadIgnored',
  'downloadImported',
  'movieFolderImported',
  'movieFileImported',
  'albumImported',
  'trackFileImported',
  'artistFolderImported',
]);

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),

  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),

  // Episode/Season/Movie/Album/Track Info (nullable based on content type)
  episodeId: integer('episode_id'), // For TV/anime
  seasonNumber: integer('season_number'), // For TV/anime
  movieFileId: integer('movie_file_id'), // For movies
  albumId: integer('album_id'), // For music
  trackFileId: integer('track_file_id'), // For music

  // Release Info
  sourceTitle: text('source_title').notNull(),
  quality: jsonb('quality').$type<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  }>(),
  
  // Download Info
  indexer: text('indexer'),
  downloadClient: text('download_client'),
  downloadId: text('download_id'),
  downloadTitle: text('download_title'),
  
  // File Info
  data: jsonb('data').$type<{
    age: number;
    ageHours: number;
    ageMinutes: number;
    downloadClient: string;
    downloadId: string;
    downloadTitle: string;
    indexer: string;
    protocol: 'torrent' | 'usenet';
    publishedDate: string;
    releaseGroup: string;
    size: number;
    torrentInfoHash: string;
  }>(),
  
  // Timing
  date: timestamp('date').notNull(),
  
  // Metadata
  deleted: boolean('deleted').notNull().default(false),
});

export const historyRelations = relations(history, ({ one }) => ({
  instance: one(instance, {
    fields: [history.instanceId],
    references: [instance.id],
  }),
  media: one(media, {
    fields: [history.mediaId],
    references: [media.id],
  }),
}));
```

### Queue Table (Unified)

```typescript
// backend/db/schema/queue.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { media } from './media.schema';

export const queueProtocolEnum = pgEnum('queue_protocol', ['torrent', 'usenet']);
export const queueStateEnum = pgEnum('queue_state', [
  'downloading',
  'importing',
  'queued',
  'completed',
  'failed',
  'paused',
  'warning',
]);

export const queue = pgTable('queue', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),

  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),

  // Episode/Season/Movie/Album Info (nullable based on content type)
  episodeId: integer('episode_id'), // For TV/anime
  seasonNumber: integer('season_number'), // For TV/anime
  movieFileId: integer('movie_file_id'), // For movies
  edition: text('edition'), // For movies
  albumId: integer('album_id'), // For music
  releaseType: text('release_type'), // For music ('original', 'remaster', etc.)
  
  // Download Info
  title: text('title').notNull(),
  size: integer('size').notNull(), // Bytes
  sizeleft: integer('sizeleft').notNull(), // Bytes
  timeleft: text('timeleft'), // Duration string
  estimatedCompletionTime: timestamp('estimated_completion_time'),
  status: queueStateEnum('status').notNull().default('queued'),
  trackedDownloadStatus: text('tracked_download_status'), // 'ok', 'warning', 'error'
  trackedDownloadState: text('tracked_download_state'), // 'downloading', 'importing', etc.
  
  // Protocol Info
  protocol: queueProtocolEnum('protocol').notNull(),
  downloadClient: text('download_client').notNull(),
  downloadId: text('download_id').notNull(),
  
  // Quality
  quality: jsonb('quality').$type<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  }>(),
  
  // Indexer
  indexer: text('indexer').notNull(),
  
  // Release
  customFormats: jsonb('custom_formats').$type<Array<{
    id: number;
    name: string;
  }>>(),
  customFormatScore: integer('custom_format_score').notNull().default(0),
  language: jsonb('language').$type<{
    id: number;
    name: string;
  }>(),
  
  // Metadata
  languages: jsonb('languages').$type<Array<{
    id: number;
    name: string;
  }>>(),
  
  // Remote Content (for added media that haven't imported yet)
  remoteMedia: jsonb('remote_media').$type<{
    // TV Series/Anime
    title: string;
    tvdbId?: number;
    aniDbId?: number;
    tmdbId?: number;
    overview: string;
    images: Array<{
      coverType: string;
      url: string;
    }>;
    seasons?: Array<{
      seasonNumber: number;
      monitored: boolean;
    }>;
    year?: number;
    path: string;
    qualityProfileId: number;
    seasonFolder?: boolean;
    monitored: boolean;
    rootFolderPath: string;
    seriesType?: string;
    languageProfileId: number;
    // Movie
    tmdbId?: number;
    imdbId?: string;
    title: string;
    originalTitle: string;
    year: number;
    runtime: number;
    studio: string;
    overview: string;
    certification: string;
    images: Array<{
      coverType: string;
      url: string;
    }>;
    genres: string[];
    path: string;
    qualityProfileId: number;
    monitored: boolean;
    rootFolderPath: string;
    languageProfileId: number;
  }>(),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const queueRelations = relations(queue, ({ one }) => ({
  instance: one(instance, {
    fields: [queue.instanceId],
    references: [instance.id],
  }),
  media: one(media, {
    fields: [queue.mediaId],
    references: [media.id],
  }),
}));
```

### Root Folders Table (Unified)

```typescript
// backend/db/schema/rootFolder.schema.ts

import { integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const rootFolderTypeEnum = pgEnum('root_folder_type', ['series', 'anime', 'movie', 'music']);

export const rootFolder = pgTable('root_folder', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  path: text('path').notNull(),
  name: text('name').notNull(),
  type: rootFolderTypeEnum('type').notNull(), // 'series', 'anime', 'movie', 'music'

  // Folder configuration
  defaultTags: jsonb('default_tags').$type<number[]>([]),
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultMetadataProfileId: integer('default_metadata_profile_id'),
  defaultMonitorType: text('default_monitor_type'), // 'all', 'future', 'missing', 'none', 'latestSeason', 'latestAlbum'
  defaultLanguageProfileId: integer('default_language_profile_id'),

  // Music-specific folder configuration
  defaultArtistFolderFormat: text('default_artist_folder_format'), // '{Artist Name}'
  defaultAlbumFolderFormat: text('default_album_folder_format'), // '{Album Title} ({Release Year})'
  
  // Space info
  freeSpace: integer('free_space').notNull(), // Bytes
  totalSpace: integer('total_space').notNull(), // Bytes
  
  // Metadata
  unmappedFolders: jsonb('unmapped_folders').$type<Array<{
    name: string;
    path: string;
    relativePath: string;
  }>>(),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const rootFolderRelations = relations(rootFolder, ({ one }) => ({
  instance: one(instance, {
    fields: [rootFolder.instanceId],
    references: [instance.id],
  }),
}));
```

---

## Metadata Services

### Unified Metadata Service

```typescript
// backend/core/metadata/services/metadata.service.ts

import { db } from '@/db/client';
import { media, episode, movieFile, album, track } from '@/db/schema';
import { ContentType } from '@/types/models/media';
import { TVDBMetadataService } from './tvdb.service';
import { TMDBMetadataService } from './tmdb.service';
import { AniDBMetadataService } from './anidb.service';
import { MusicBrainzMetadataService } from './musicbrainz.service';

interface MediaMetadata {
  title: string;
  overview: string;
  images: Array<{ coverType: string; url: string }>;
  status: string;
  ratings: { votes: number; value: number };
  genres: string[];
  network?: string;
  studio?: string;
  runtime: number;
  year?: number;
  releaseDate?: Date;
  seasons?: Array<{
    seasonNumber: number;
    episodeCount: number;
    monitored: boolean;
  }>;
}

interface EpisodeMetadata {
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview: string;
  airDate: string;
  airDateUtc: Date;
  ratings: { votes: number; value: number };
}

interface MovieMetadata {
  tmdbId: number;
  imdbId: string;
  title: string;
  originalTitle: string;
  overview: string;
  year: number;
  runtime: number;
  studio: string;
  genres: string[];
  certification: string;
  images: Array<{ coverType: string; url: string }>;
  ratings: { votes: number; value: number };
}

export class MetadataService {
  private tvdbService = new TVDBMetadataService();
  private tmdbService = new TMDBMetadataService();
  private anidbService = new AniDBMetadataService();
  private musicBrainzService = new MusicBrainzMetadataService();
  
  /**
   * Search for media (unified search across TVDB, TMDB, and MusicBrainz)
   */
  async search(term: string, type?: ContentType): Promise<Array<{
    type: ContentType;
    id: number | string;
    title: string;
    year?: number;
    poster?: string;
    overview?: string;
  }>> {
    const results: Array<any> = [];

    // Only search specified types
    const searchTypes = type ? [type] : ['series', 'anime', 'movie', 'music'];

    if (searchTypes.includes('series') || searchTypes.includes('anime')) {
      // Search TVDB for TV series and anime
      const tvdbResults = await this.tvdbService.search(term);
      results.push(
        ...tvdbResults.map((r) => ({
          type: 'series' as ContentType,
          id: r.tvdbId,
          title: r.title,
          year: r.year,
          poster: r.poster,
          overview: r.overview,
        })),
      );
    }

    if (searchTypes.includes('anime')) {
      // Search AniDB for anime
      const anidbResults = await this.anidbService.search(term);
      results.push(
        ...anidbResults.map((r) => ({
          type: 'anime' as ContentType,
          id: r.aniDbId,
          title: r.title,
          year: r.year,
          poster: r.poster,
          overview: r.overview,
        })),
      );
    }

    if (searchTypes.includes('movie')) {
      // Search TMDB for movies
      const tmdbResults = await this.tmdbService.search(term);
      results.push(
        ...tmdbResults.map((r) => ({
          type: 'movie' as ContentType,
          id: r.tmdbId,
          title: r.title,
          year: r.year,
          poster: r.poster,
          overview: r.overview,
        })),
      );
    }

    if (searchTypes.includes('music')) {
      // Search MusicBrainz for artists
      const musicBrainzResults = await this.musicBrainzService.searchArtists(term);
      results.push(
        ...musicBrainzResults.map((r) => ({
          type: 'music' as ContentType,
          id: r.musicBrainzId,
          title: r.name,
          year: r.beginYear,
          poster: r.image,
          overview: r.disambiguation,
        })),
      );
    }

    return results;
  }
  
  /**
   * Get media metadata by type and ID
   */
  async getMediaMetadata(type: ContentType, id: number | string): Promise<MediaMetadata> {
    switch (type) {
      case 'series':
      case 'anime':
        return this.getSeriesMetadata(id as number);
      case 'movie':
        return this.getMovieMetadata(id as number);
      case 'music':
        return this.getArtistMetadata(id as string);
      default:
        throw new Error(`Unknown content type: ${type}`);
    }
  }

  /**
   * Get artist metadata from MusicBrainz
   */
  private async getArtistMetadata(musicBrainzId: string): Promise<MediaMetadata> {
    const metadata = await this.musicBrainzService.getArtist(musicBrainzId);
    return {
      title: metadata.name,
      overview: metadata.disambiguation || '',
      images: metadata.images,
      status: metadata.type, // 'person', 'group', etc.
      ratings: metadata.ratings,
      genres: metadata.genres,
      runtime: 0, // Not applicable for artists
    };
  }

  /**
   * Get albums for an artist
   */
  async getAlbums(artistId: number): Promise<Array<{
    musicBrainzId: string;
    title: string;
    albumType: string;
    releaseDate: string;
    trackCount: number;
    images: Array<{ coverType: string; url: string }>;
  }>> {
    const artistRecord = await db.query.media.findFirst({
      where: eq(media.id, artistId),
    });

    if (!artistRecord || artistRecord.contentType !== 'music') {
      throw new Error('Media is not a music artist');
    }

    const albums = await this.musicBrainzService.getAlbums(artistRecord.musicBrainzId!);
    return albums;
  }

  /**
   * Get tracks for an album
   */
  async getTracks(albumId: number): Promise<Array<{
    musicBrainzId: string;
    title: string;
    trackNumber: number;
    discNumber: number;
    duration: number;
  }>> {
    const albumRecord = await db.query.album.findFirst({
      where: eq(album.id, albumId),
    });

    if (!albumRecord) {
      throw new Error('Album not found');
    }

    const tracks = await this.musicBrainzService.getTracks(albumRecord.musicBrainzReleaseId!);
    return tracks;
  }
  
  /**
   * Get TV series/anime metadata from TVDB
   */
  private async getSeriesMetadata(tvdbId: number): Promise<MediaMetadata> {
    const metadata = await this.tvdbService.getSeries(tvdbId);
    return {
      title: metadata.title,
      overview: metadata.overview,
      images: metadata.images,
      status: metadata.status,
      ratings: metadata.ratings,
      genres: metadata.genres,
      network: metadata.network,
      runtime: metadata.runtime,
      seasons: metadata.seasons,
    };
  }
  
  /**
   * Get movie metadata from TMDB
   */
  private async getMovieMetadata(tmdbId: number): Promise<MediaMetadata> {
    const metadata = await this.tmdbService.getMovie(tmdbId);
    return {
      title: metadata.title,
      overview: metadata.overview,
      images: metadata.images,
      status: metadata.status,
      ratings: metadata.ratings,
      genres: metadata.genres,
      studio: metadata.studio,
      runtime: metadata.runtime,
      year: metadata.year,
      releaseDate: metadata.releaseDate,
    };
  }
  
  /**
   * Get episodes for TV series/anime
   */
  async getEpisodes(mediaId: number): Promise<EpisodeMetadata[]> {
    const mediaRecord = await db.query.media.findFirst({
      where: eq(media.id, mediaId),
    });
    
    if (!mediaRecord || (mediaRecord.contentType !== 'series' && mediaRecord.contentType !== 'anime')) {
      throw new Error('Media is not a TV series or anime');
    }
    
    const episodes = await this.tvdbService.getEpisodes(mediaRecord.tvdbId!);
    return episodes;
  }
  
  /**
   * Sync media metadata from TVDB/TMDB
   */
  async syncMediaMetadata(mediaId: number): Promise<void> {
    const mediaRecord = await db.query.media.findFirst({
      where: eq(media.id, mediaId),
    });
    
    if (!mediaRecord) {
      throw new Error('Media not found');
    }
    
    const metadata = await this.getMediaMetadata(mediaRecord.contentType, this.getMetadataId(mediaRecord));
    
    // Update media record
    await db.update(media)
      .set({
        title: metadata.title,
        overview: metadata.overview,
        images: metadata.images,
        status: metadata.status,
        ratings: metadata.ratings,
        genres: metadata.genres,
        network: metadata.network,
        studio: metadata.studio,
        runtime: metadata.runtime,
        year: metadata.year,
        seasons: metadata.seasons,
        lastInfoSync: new Date(),
      })
      .where(eq(media.id, mediaId));
  }
  
  /**
   * Get the appropriate metadata ID based on content type
   */
  private getMetadataId(mediaRecord: typeof media.$inferSelect): number | string {
    switch (mediaRecord.contentType) {
      case 'series':
      case 'anime':
        return mediaRecord.tvdbId!;
      case 'movie':
        return mediaRecord.tmdbId!;
      case 'music':
        return mediaRecord.musicBrainzId!;
      default:
        throw new Error(`Unknown content type: ${mediaRecord.contentType}`);
    }
  }
}

export const metadataService = new MetadataService();
```

---

## Release Parsing

### Unified Release Parser

```typescript
// backend/core/parsing/services/releaseParser.service.ts

import { ContentType } from '@/types/models/media';
import { TVReleaseParser } from './tv.parser';
import { AnimeReleaseParser } from './anime.parser';
import { MovieReleaseParser } from './movie.parser';
import { MusicReleaseParser } from './music.parser';

interface ParsedRelease {
  contentType: ContentType;
  title: string;
  year?: number;
  quality: {
    resolution?: number; // For video
    source: string;
    modifier?: string;
    // Audio-specific quality
    audioFormat?: string; // 'FLAC', 'MP3', 'AAC', etc.
    bitrate?: number; // kbps
    bitDepth?: number; // 16, 24
    sampleRate?: number; // Hz
  };
  releaseGroup?: string;
  tags: string[];

  // TV Series/Anime specific
  seasonNumber?: number;
  episodeNumbers?: number[];
  absoluteEpisodeNumber?: number;

  // Movie specific
  edition?: string;
  isProper?: boolean;
  isRepack?: boolean;

  // Music specific
  artist?: string;
  album?: string;
  discCount?: number;
  releaseType?: string; // 'original', 'remaster', 'deluxe', etc.
  catalogNumber?: string;
  recordLabel?: string;
}

export class ReleaseParserService {
  private tvParser = new TVReleaseParser();
  private animeParser = new AnimeReleaseParser();
  private movieParser = new MovieReleaseParser();
  private musicParser = new MusicReleaseParser();

  /**
   * Parse release title and determine content type
   */
  parse(title: string): ParsedRelease | null {
    // Try TV parser first
    const tvResult = this.tvParser.parse(title);
    if (tvResult) {
      return {
        contentType: 'series',
        ...tvResult,
      };
    }

    // Try anime parser
    const animeResult = this.animeParser.parse(title);
    if (animeResult) {
      return {
        contentType: 'anime',
        ...animeResult,
      };
    }

    // Try movie parser
    const movieResult = this.movieParser.parse(title);
    if (movieResult) {
      return {
        contentType: 'movie',
        ...movieResult,
      };
    }

    // Try music parser
    const musicResult = this.musicParser.parse(title);
    if (musicResult) {
      return {
        contentType: 'music',
        ...musicResult,
      };
    }

    return null;
  }

  /**
   * Parse release for specific content type
   */
  parseByType(title: string, contentType: ContentType): ParsedRelease | null {
    switch (contentType) {
      case 'series':
        const tvResult = this.tvParser.parse(title);
        return tvResult ? { contentType: 'series', ...tvResult } : null;
      case 'anime':
        const animeResult = this.animeParser.parse(title);
        return animeResult ? { contentType: 'anime', ...animeResult } : null;
      case 'movie':
        const movieResult = this.movieParser.parse(title);
        return movieResult ? { contentType: 'movie', ...movieResult } : null;
      case 'music':
        const musicResult = this.musicParser.parse(title);
        return musicResult ? { contentType: 'music', ...musicResult } : null;
      default:
        return null;
    }
  }
}

export const releaseParserService = new ReleaseParserService();
```

### TV Release Parser

```typescript
// backend/core/parsing/services/tv.parser.ts

interface TVParsedRelease {
  title: string;
  seasonNumber: number;
  episodeNumbers: number[];
  quality: {
    resolution: number;
    source: string;
    modifier?: string;
  };
  releaseGroup?: string;
  tags: string[];
  year?: number;
  isProper?: boolean;
  isRepack?: boolean;
}

export class TVReleaseParser {
  private patterns = [
    // Standard: Title.S01E01.1080p.WEB-DL
    /^(.+?)\.S(\d{2})E(\d{2,3})(?:E(\d{2,3}))?\./i,
    // Title.1x01.1080p.WEB-DL
    /^(.+?)\.(\d+)x(\d{2,3})(?:E(\d{2,3}))?\./i,
    // Title Season 1 Episode 1 1080p WEB-DL
    /^(.+?)\s+Season\s+(\d+)\s+Episode\s+(\d+)/i,
  ];
  
  private qualityPatterns = [
    { pattern: /(4k|2160p|uhd)/i, resolution: 2160 },
    { pattern: /(1080p|fhd)/i, resolution: 1080 },
    { pattern: /(720p|hd)/i, resolution: 720 },
    { pattern: /(480p|sd)/i, resolution: 480 },
    { pattern: /(web-dl|webdl)/i, source: 'web' },
    { pattern: /(webrip)/i, source: 'webrip' },
    { pattern: /(bluray|bdrip|bdremux)/i, source: 'bluray' },
    { pattern: /(hdtv)/i, source: 'hdtv' },
    { pattern: /(dvd)/i, source: 'dvd' },
    { pattern: /(proper)/i, modifier: 'proper' },
    { pattern: /(repack)/i, modifier: 'repack' },
  ];
  
  parse(title: string): TVParsedRelease | null {
    // Try to match TV patterns
    let match: RegExpMatchArray | null = null;
    let patternIndex = 0;
    
    for (; patternIndex < this.patterns.length; patternIndex++) {
      match = title.match(this.patterns[patternIndex]);
      if (match) break;
    }
    
    if (!match) return null;
    
    const titleName = match[1];
    const seasonNumber = parseInt(match[2], 10);
    const episodeNumbers = [parseInt(match[3], 10)];
    
    // Multi-episode
    if (match[4]) {
      episodeNumbers.push(parseInt(match[4], 10));
    }
    
    // Parse quality
    const quality = this.parseQuality(title);
    
    // Parse release group
    const releaseGroup = this.parseReleaseGroup(title);
    
    // Parse tags
    const tags = this.parseTags(title);
    
    // Parse year
    const yearMatch = title.match(/\.(19|20)\d{2}\./);
    const year = yearMatch ? parseInt(yearMatch[0].slice(1, -1), 10) : undefined;
    
    // Check for proper/repack
    const isProper = /proper/i.test(title);
    const isRepack = /repack/i.test(title);
    
    return {
      title: titleName.replace(/\./g, ' ').trim(),
      seasonNumber,
      episodeNumbers,
      quality,
      releaseGroup,
      tags,
      year,
      isProper,
      isRepack,
    };
  }
  
  private parseQuality(title: string): {
    resolution: number;
    source: string;
    modifier?: string;
  } {
    let resolution = 720;
    let source = 'hdtv';
    let modifier: string | undefined;
    
    for (const qualityPattern of this.qualityPatterns) {
      if (qualityPattern.pattern.test(title)) {
        if ('resolution' in qualityPattern) {
          resolution = qualityPattern.resolution;
        }
        if ('source' in qualityPattern) {
          source = qualityPattern.source;
        }
        if ('modifier' in qualityPattern) {
          modifier = qualityPattern.modifier;
        }
      }
    }
    
    return { resolution, source, modifier };
  }
  
  private parseReleaseGroup(title: string): string | undefined {
    const match = title.match(/-([a-zA-Z0-9]+)$/);
    return match ? match[1] : undefined;
  }
  
  private parseTags(title: string): string[] {
    const tags = [];
    
    if (/x264/i.test(title)) tags.push('x264');
    if (/x265|h265|hevc/i.test(title)) tags.push('x265');
    if (/10bit/i.test(title)) tags.push('10bit');
    if (/5\.1|surround/i.test(title)) tags.push('5.1');
    if (/7\.1/i.test(title)) tags.push('7.1');
    
    return tags;
  }
}
```

### Anime Release Parser

```typescript
// backend/core/parsing/services/anime.parser.ts

interface AnimeParsedRelease {
  title: string;
  seasonNumber?: number;
  episodeNumbers: number[];
  absoluteEpisodeNumber?: number;
  quality: {
    resolution: number;
    source: string;
    modifier?: string;
  };
  releaseGroup?: string;
  tags: string[];
  year?: number;
  isProper?: boolean;
  isRepack?: boolean;
}

export class AnimeReleaseParser {
  private patterns = [
    // [Group] Title - 01 [1080p]
    /^\[([^\]]+)\]\s*(.+?)\s*-\s*(\d{1,3})\s*\[\s*([^\]]+)\s*\]/i,
    // [Group] Title - EP01 [1080p]
    /^\[([^\]]+)\]\s*(.+?)\s*-\s*EP(\d{1,3})\s*\[\s*([^\]]+)\s*\]/i,
    // Title.EP01.1080p
    /^(.+?)\.EP(\d{1,3})\./i,
    // Title.01.1080p
    /^(.+?)\.(\d{1,3})\.(?!\d)/i,
  ];
  
  private qualityPatterns = [
    { pattern: /(4k|2160p|uhd)/i, resolution: 2160 },
    { pattern: /(1080p|fhd)/i, resolution: 1080 },
    { pattern: /(720p|hd)/i, resolution: 720 },
    { pattern: /(480p|sd)/i, resolution: 480 },
    { pattern: /(web-dl|webdl)/i, source: 'web' },
    { pattern: /(bluray|bdrip|bdremux)/i, source: 'bluray' },
    { pattern: /(dvd)/i, source: 'dvd' },
    { pattern: /(proper)/i, modifier: 'proper' },
    { pattern: /(repack)/i, modifier: 'repack' },
  ];
  
  parse(title: string): AnimeParsedRelease | null {
    // Try to match anime patterns
    let match: RegExpMatchArray | null = null;
    let patternIndex = 0;
    
    for (; patternIndex < this.patterns.length; patternIndex++) {
      match = title.match(this.patterns[patternIndex]);
      if (match) break;
    }
    
    if (!match) return null;
    
    // Pattern 1: [Group] Title - 01 [1080p]
    if (patternIndex === 0) {
      const releaseGroup = match[1];
      const titleName = match[2];
      const episodeNumber = parseInt(match[3], 10);
      const qualityStr = match[4];
      
      return {
        title: titleName.trim(),
        episodeNumbers: [episodeNumber],
        absoluteEpisodeNumber: episodeNumber,
        quality: this.parseQuality(qualityStr),
        releaseGroup,
        tags: this.parseTags(title),
        year: this.parseYear(title),
      };
    }
    
    // Pattern 2: [Group] Title - EP01 [1080p]
    if (patternIndex === 1) {
      const releaseGroup = match[1];
      const titleName = match[2];
      const episodeNumber = parseInt(match[3], 10);
      const qualityStr = match[4];
      
      return {
        title: titleName.trim(),
        episodeNumbers: [episodeNumber],
        absoluteEpisodeNumber: episodeNumber,
        quality: this.parseQuality(qualityStr),
        releaseGroup,
        tags: this.parseTags(title),
        year: this.parseYear(title),
      };
    }
    
    // Pattern 3: Title.EP01.1080p
    if (patternIndex === 2) {
      const titleName = match[1];
      const episodeNumber = parseInt(match[2], 10);
      const qualityStr = title.substring(match[0].length);
      
      return {
        title: titleName.replace(/\./g, ' ').trim(),
        episodeNumbers: [episodeNumber],
        absoluteEpisodeNumber: episodeNumber,
        quality: this.parseQuality(qualityStr),
        tags: this.parseTags(title),
        year: this.parseYear(title),
      };
    }
    
    // Pattern 4: Title.01.1080p
    if (patternIndex === 3) {
      const titleName = match[1];
      const episodeNumber = parseInt(match[2], 10);
      const qualityStr = title.substring(match[0].length);
      
      return {
        title: titleName.replace(/\./g, ' ').trim(),
        episodeNumbers: [episodeNumber],
        absoluteEpisodeNumber: episodeNumber,
        quality: this.parseQuality(qualityStr),
        tags: this.parseTags(title),
        year: this.parseYear(title),
      };
    }
    
    return null;
  }
  
  private parseQuality(title: string): {
    resolution: number;
    source: string;
    modifier?: string;
  } {
    let resolution = 720;
    let source = 'web';
    let modifier: string | undefined;
    
    for (const qualityPattern of this.qualityPatterns) {
      if (qualityPattern.pattern.test(title)) {
        if ('resolution' in qualityPattern) {
          resolution = qualityPattern.resolution;
        }
        if ('source' in qualityPattern) {
          source = qualityPattern.source;
        }
        if ('modifier' in qualityPattern) {
          modifier = qualityPattern.modifier;
        }
      }
    }
    
    return { resolution, source, modifier };
  }
  
  private parseTags(title: string): string[] {
    const tags = [];
    
    if (/x264/i.test(title)) tags.push('x264');
    if (/x265|h265|hevc/i.test(title)) tags.push('x265');
    if (/10bit/i.test(title)) tags.push('10bit');
    if (/5\.1|surround/i.test(title)) tags.push('5.1');
    if (/7\.1/i.test(title)) tags.push('7.1');
    if (/dual.?audio/i.test(title)) tags.push('dual-audio');
    if (/multi.?subs/i.test(title)) tags.push('multi-subs');
    
    return tags;
  }
  
  private parseYear(title: string): number | undefined {
    const match = title.match(/\((19|20)\d{2}\)|\[(19|20)\d{2}\]|(\.| )(19|20)\d{2}(\.| )/);
    return match ? parseInt(match[0].replace(/\(|\)|\[|\]/g, ''), 10) : undefined;
  }
}
```

### Movie Release Parser

```typescript
// backend/core/parsing/services/movie.parser.ts

interface MovieParsedRelease {
  title: string;
  year: number;
  quality: {
    resolution: number;
    source: string;
    modifier?: string;
  };
  releaseGroup?: string;
  edition?: string;
  tags: string[];
  isProper?: boolean;
  isRepack?: boolean;
}

export class MovieReleaseParser {
  private patterns = [
    // Title.2023.1080p.WEB-DL
    /^(.+?)\.(19|20)\d{2}\./,
    // Title (2023) 1080p WEB-DL
    /^(.+?)\s*\(\s*(19|20)\d{2}\s*\)/,
    // Title [2023] 1080p WEB-DL
    /^(.+?)\s*\[\s*(19|20)\d{2}\s*\]/,
    // Title.Year.1080p.WEB-DL
    /^(.+?)\.Year\.\d{4}\./i,
  ];
  
  private qualityPatterns = [
    { pattern: /(4k|2160p|uhd)/i, resolution: 2160 },
    { pattern: /(1080p|fhd)/i, resolution: 1080 },
    { pattern: /(720p|hd)/i, resolution: 720 },
    { pattern: /(480p|sd)/i, resolution: 480 },
    { pattern: /(web-dl|webdl)/i, source: 'web' },
    { pattern: /(webrip)/i, source: 'webrip' },
    { pattern: /(bluray|bdrip|bdremux)/i, source: 'bluray' },
    { pattern: /(dvd)/i, source: 'dvd' },
    { pattern: /(proper)/i, modifier: 'proper' },
    { pattern: /(repack)/i, modifier: 'repack' },
  ];
  
  private editionPatterns = [
    { pattern: /director'?s.?cut/i, edition: 'Director\'s Cut' },
    { pattern: /extended/i, edition: 'Extended' },
    { pattern: /theatrical/i, edition: 'Theatrical' },
    { pattern: /unrated/i, edition: 'Unrated' },
    { pattern: /remastered/i, edition: 'Remastered' },
    { pattern: /ultimate/i, edition: 'Ultimate' },
  ];
  
  parse(title: string): MovieParsedRelease | null {
    // Try to match movie patterns
    let match: RegExpMatchArray | null = null;
    let patternIndex = 0;
    
    for (; patternIndex < this.patterns.length; patternIndex++) {
      match = title.match(this.patterns[patternIndex]);
      if (match) break;
    }
    
    if (!match) return null;
    
    const titleName = match[1];
    const year = parseInt(match[2], 10);
    
    // Parse quality
    const quality = this.parseQuality(title);
    
    // Parse release group
    const releaseGroup = this.parseReleaseGroup(title);
    
    // Parse edition
    const edition = this.parseEdition(title);
    
    // Parse tags
    const tags = this.parseTags(title);
    
    // Check for proper/repack
    const isProper = /proper/i.test(title);
    const isRepack = /repack/i.test(title);
    
    return {
      title: titleName.replace(/\./g, ' ').trim(),
      year,
      quality,
      releaseGroup,
      edition,
      tags,
      isProper,
      isRepack,
    };
  }
  
  private parseQuality(title: string): {
    resolution: number;
    source: string;
    modifier?: string;
  } {
    let resolution = 720;
    let source = 'web';
    let modifier: string | undefined;
    
    for (const qualityPattern of this.qualityPatterns) {
      if (qualityPattern.pattern.test(title)) {
        if ('resolution' in qualityPattern) {
          resolution = qualityPattern.resolution;
        }
        if ('source' in qualityPattern) {
          source = qualityPattern.source;
        }
        if ('modifier' in qualityPattern) {
          modifier = qualityPattern.modifier;
        }
      }
    }
    
    return { resolution, source, modifier };
  }
  
  private parseReleaseGroup(title: string): string | undefined {
    const match = title.match(/-([a-zA-Z0-9]+)$/);
    return match ? match[1] : undefined;
  }
  
  private parseEdition(title: string): string | undefined {
    for (const editionPattern of this.editionPatterns) {
      if (editionPattern.pattern.test(title)) {
        return editionPattern.edition;
      }
    }
    return undefined;
  }
  
  private parseTags(title: string): string[] {
    const tags = [];
    
    if (/x264/i.test(title)) tags.push('x264');
    if (/x265|h265|hevc/i.test(title)) tags.push('x265');
    if (/10bit/i.test(title)) tags.push('10bit');
    if (/5\.1|surround/i.test(title)) tags.push('5.1');
    if (/7\.1/i.test(title)) tags.push('7.1');
    if (/dts.?hd/i.test(title)) tags.push('DTS-HD');
    if (/atmos/i.test(title)) tags.push('Atmos');
    if (/truehd/i.test(title)) tags.push('TrueHD');
    
    return tags;
  }
}
```

### Music Release Parser

```typescript
// backend/core/parsing/services/music.parser.ts

interface MusicParsedRelease {
  artist: string;
  album: string;
  year?: number;
  quality: {
    source: string;
    audioFormat: string;
    bitrate?: number;
    bitDepth?: number;
    sampleRate?: number;
  };
  releaseGroup?: string;
  releaseType?: string;
  discCount?: number;
  catalogNumber?: string;
  recordLabel?: string;
  tags: string[];
}

export class MusicReleaseParser {
  private patterns = [
    // Artist - Album (Year) [Format]
    /^(.+?)\s*-\s*(.+?)\s*\((\d{4})\)\s*\[([^\]]+)\]/i,
    // Artist - Album [Year] [Format]
    /^(.+?)\s*-\s*(.+?)\s*\[(\d{4})\]\s*\[([^\]]+)\]/i,
    // Artist - Album (Year) Format
    /^(.+?)\s*-\s*(.+?)\s*\((\d{4})\)\s*(FLAC|MP3|AAC|ALAC|OGG|OPUS)/i,
    // Artist.-.Album.Year.Format
    /^(.+?)\.+-\.+(.+?)\.(\d{4})\.(FLAC|MP3|AAC|ALAC|OGG|OPUS)/i,
  ];

  private audioFormatPatterns = [
    { pattern: /FLAC/i, format: 'FLAC', lossless: true },
    { pattern: /ALAC/i, format: 'ALAC', lossless: true },
    { pattern: /WAV/i, format: 'WAV', lossless: true },
    { pattern: /MP3.?320/i, format: 'MP3', bitrate: 320 },
    { pattern: /MP3.?V0/i, format: 'MP3', bitrate: 245 }, // V0 average
    { pattern: /MP3.?V2/i, format: 'MP3', bitrate: 190 }, // V2 average
    { pattern: /MP3.?256/i, format: 'MP3', bitrate: 256 },
    { pattern: /MP3.?192/i, format: 'MP3', bitrate: 192 },
    { pattern: /MP3/i, format: 'MP3', bitrate: 320 }, // Default to 320
    { pattern: /AAC.?256/i, format: 'AAC', bitrate: 256 },
    { pattern: /AAC/i, format: 'AAC', bitrate: 256 },
    { pattern: /OGG.?Q10/i, format: 'OGG', bitrate: 500 },
    { pattern: /OGG/i, format: 'OGG', bitrate: 320 },
    { pattern: /OPUS/i, format: 'OPUS', bitrate: 256 },
  ];

  private sourcePatterns = [
    { pattern: /\bCD\b/i, source: 'cd' },
    { pattern: /\bWEB\b/i, source: 'web' },
    { pattern: /Vinyl/i, source: 'vinyl' },
    { pattern: /Cassette/i, source: 'cassette' },
    { pattern: /SACD/i, source: 'sacd' },
    { pattern: /DVD.?A/i, source: 'dvd-audio' },
    { pattern: /Blu.?ray/i, source: 'bluray-audio' },
  ];

  private releaseTypePatterns = [
    { pattern: /Remaster(ed)?/i, releaseType: 'remaster' },
    { pattern: /Deluxe/i, releaseType: 'deluxe' },
    { pattern: /Anniversary/i, releaseType: 'anniversary' },
    { pattern: /Expanded/i, releaseType: 'expanded' },
    { pattern: /Collector'?s/i, releaseType: 'collectors' },
    { pattern: /Limited/i, releaseType: 'limited' },
    { pattern: /Japan(ese)?/i, releaseType: 'japanese' },
    { pattern: /Bonus.?Track/i, releaseType: 'bonus' },
  ];

  parse(title: string): MusicParsedRelease | null {
    // Try to match music patterns
    let match: RegExpMatchArray | null = null;
    let patternIndex = 0;

    for (; patternIndex < this.patterns.length; patternIndex++) {
      match = title.match(this.patterns[patternIndex]);
      if (match) break;
    }

    if (!match) return null;

    const artist = match[1].replace(/\./g, ' ').trim();
    const album = match[2].replace(/\./g, ' ').trim();
    const year = parseInt(match[3], 10);

    // Parse audio quality
    const quality = this.parseAudioQuality(title);

    // Parse release group
    const releaseGroup = this.parseReleaseGroup(title);

    // Parse release type
    const releaseType = this.parseReleaseType(title);

    // Parse disc count
    const discCount = this.parseDiscCount(title);

    // Parse catalog number and label
    const { catalogNumber, recordLabel } = this.parseLabelInfo(title);

    // Parse tags
    const tags = this.parseTags(title);

    return {
      artist,
      album,
      year,
      quality,
      releaseGroup,
      releaseType,
      discCount,
      catalogNumber,
      recordLabel,
      tags,
    };
  }

  private parseAudioQuality(title: string): {
    source: string;
    audioFormat: string;
    bitrate?: number;
    bitDepth?: number;
    sampleRate?: number;
  } {
    let source = 'cd';
    let audioFormat = 'FLAC';
    let bitrate: number | undefined;
    let bitDepth: number | undefined;
    let sampleRate: number | undefined;

    // Parse source
    for (const sourcePattern of this.sourcePatterns) {
      if (sourcePattern.pattern.test(title)) {
        source = sourcePattern.source;
        break;
      }
    }

    // Parse audio format
    for (const formatPattern of this.audioFormatPatterns) {
      if (formatPattern.pattern.test(title)) {
        audioFormat = formatPattern.format;
        if ('bitrate' in formatPattern) {
          bitrate = formatPattern.bitrate;
        }
        break;
      }
    }

    // Parse bit depth (for lossless)
    const bitDepthMatch = title.match(/(\d{2})[\s-]?bit/i);
    if (bitDepthMatch) {
      bitDepth = parseInt(bitDepthMatch[1], 10);
    }

    // Parse sample rate
    const sampleRateMatch = title.match(/(\d{2,3}(?:\.\d)?)\s*k?Hz/i);
    if (sampleRateMatch) {
      const rate = parseFloat(sampleRateMatch[1]);
      sampleRate = rate < 1000 ? rate * 1000 : rate; // Convert kHz to Hz if needed
    }

    return { source, audioFormat, bitrate, bitDepth, sampleRate };
  }

  private parseReleaseGroup(title: string): string | undefined {
    const match = title.match(/-([a-zA-Z0-9_]+)$/);
    return match ? match[1] : undefined;
  }

  private parseReleaseType(title: string): string | undefined {
    for (const typePattern of this.releaseTypePatterns) {
      if (typePattern.pattern.test(title)) {
        return typePattern.releaseType;
      }
    }
    return 'original';
  }

  private parseDiscCount(title: string): number | undefined {
    const match = title.match(/(\d+)\s*CD|(\d+)\s*Disc/i);
    if (match) {
      return parseInt(match[1] || match[2], 10);
    }
    return undefined;
  }

  private parseLabelInfo(title: string): {
    catalogNumber?: string;
    recordLabel?: string;
  } {
    // Try to match catalog number patterns like [LABEL-123] or (LABEL 456)
    const catalogMatch = title.match(/\[([A-Z]{2,}[\s-]?\d+)\]|\(([A-Z]{2,}[\s-]?\d+)\)/i);
    const catalogNumber = catalogMatch ? (catalogMatch[1] || catalogMatch[2]) : undefined;

    return { catalogNumber, recordLabel: undefined };
  }

  private parseTags(title: string): string[] {
    const tags: string[] = [];

    // Audio quality tags
    if (/lossless/i.test(title)) tags.push('lossless');
    if (/hi.?res/i.test(title)) tags.push('hi-res');
    if (/24[\s-]?bit/i.test(title)) tags.push('24bit');
    if (/16[\s-]?bit/i.test(title)) tags.push('16bit');
    if (/44\.1/i.test(title)) tags.push('44.1kHz');
    if (/48k/i.test(title)) tags.push('48kHz');
    if (/96k/i.test(title)) tags.push('96kHz');
    if (/192k/i.test(title)) tags.push('192kHz');

    // Release tags
    if (/5\.1|surround/i.test(title)) tags.push('5.1');
    if (/stereo/i.test(title)) tags.push('stereo');
    if (/mono/i.test(title)) tags.push('mono');

    // Scene tags
    if (/proper/i.test(title)) tags.push('proper');
    if (/repack/i.test(title)) tags.push('repack');
    if (/retail/i.test(title)) tags.push('retail');
    if (/scene/i.test(title)) tags.push('scene');

    return tags;
  }
}
```

---

## API Design

### Unified Media API

```typescript
// backend/api/routes/media.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { mediaService } from '@/core/media/services/media.service';
import { authMiddleware, requirePermission } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const mediaRoutes = new Hono();

// GET /api/v3/instance/:instanceId/media - List all media (TV, movies, anime, music)
mediaRoutes.get('/instance/:instanceId/media', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const { type, query, page = 1, pageSize = 20 } = c.req.query();

  const media = await mediaService.getAll(instanceId, {
    contentType: type as 'series' | 'anime' | 'movie' | 'music',
    query,
    page: Number(page),
    pageSize: Number(pageSize),
  });

  return c.json({ data: media });
});

// GET /api/v3/instance/:instanceId/media/:id - Get media by ID
mediaRoutes.get('/instance/:instanceId/media/:id', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const id = Number(c.req.param('id'));
  const media = await mediaService.getById(instanceId, id);
  return c.json({ data: media });
});

// POST /api/v3/instance/:instanceId/media - Add media (TV series, movie, anime, or music artist)
mediaRoutes.post(
  '/instance/:instanceId/media',
  authMiddleware,
  requirePermission('media', 'create'),
  validationMiddleware(
    z.object({
      contentType: z.enum(['series', 'anime', 'movie', 'music']),
      tvdbId: z.number().optional(),
      tmdbId: z.number().optional(),
      aniDbId: z.number().optional(),
      imdbId: z.string().optional(),
      musicBrainzId: z.string().optional(), // For music artists
      qualityProfileId: z.number(),
      rootFolderId: z.number(),
      monitored: z.boolean().default(true),
      tags: z.array(z.number()).default([]),
    }),
  ),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const body = c.req.valid('json');
    const media = await mediaService.create(instanceId, body);
    return c.json({ data: media }, 201);
  },
);

// PUT /api/v3/instance/:instanceId/media/:id - Update media
mediaRoutes.put(
  '/instance/:instanceId/media/:id',
  authMiddleware,
  requirePermission('media', 'update'),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const media = await mediaService.update(instanceId, id, body);
    return c.json({ data: media });
  },
);

// DELETE /api/v3/instance/:instanceId/media/:id - Delete media
mediaRoutes.delete(
  '/instance/:instanceId/media/:id',
  authMiddleware,
  requirePermission('media', 'delete'),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const id = Number(c.req.param('id'));
    await mediaService.delete(instanceId, id);
    return c.json({ success: true });
  },
);

// POST /api/v3/instance/:instanceId/media/lookup - Search for media
mediaRoutes.post(
  '/instance/:instanceId/media/lookup',
  authMiddleware,
  validationMiddleware(
    z.object({
      term: z.string().min(1),
      type: z.enum(['series', 'anime', 'movie', 'music', 'all']).default('all'),
    }),
  ),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const { term, type } = c.req.valid('json');
    const results = await mediaService.lookup(instanceId, term, type);
    return c.json({ data: results });
  },
);

// POST /api/v3/instance/:instanceId/media/:id/refresh - Refresh media metadata
mediaRoutes.post(
  '/instance/:instanceId/media/:id/refresh',
  authMiddleware,
  requirePermission('media', 'update'),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const id = Number(c.req.param('id'));
    await mediaService.refreshMetadata(instanceId, id);
    return c.json({ success: true });
  },
);

// GET /api/v3/instance/:instanceId/media/:id/episodes - Get episodes (TV/anime only)
mediaRoutes.get('/instance/:instanceId/media/:id/episodes', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const id = Number(c.req.param('id'));
  const episodes = await mediaService.getEpisodes(instanceId, id);
  return c.json({ data: episodes });
});

// GET /api/v3/instance/:instanceId/media/:id/files - Get files (episodes, movie files, or track files)
mediaRoutes.get('/instance/:instanceId/media/:id/files', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const id = Number(c.req.param('id'));
  const files = await mediaService.getFiles(instanceId, id);
  return c.json({ data: files });
});

// GET /api/v3/instance/:instanceId/media/:id/albums - Get albums for music artist
mediaRoutes.get('/instance/:instanceId/media/:id/albums', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const id = Number(c.req.param('id'));
  const albums = await mediaService.getAlbums(instanceId, id);
  return c.json({ data: albums });
});

// GET /api/v3/instance/:instanceId/album/:albumId - Get album details
mediaRoutes.get('/instance/:instanceId/album/:albumId', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const albumId = Number(c.req.param('albumId'));
  const album = await mediaService.getAlbumById(instanceId, albumId);
  return c.json({ data: album });
});

// GET /api/v3/instance/:instanceId/album/:albumId/tracks - Get tracks for album
mediaRoutes.get('/instance/:instanceId/album/:albumId/tracks', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const albumId = Number(c.req.param('albumId'));
  const tracks = await mediaService.getTracks(instanceId, albumId);
  return c.json({ data: tracks });
});

// PUT /api/v3/instance/:instanceId/album/:albumId - Update album monitoring
mediaRoutes.put(
  '/instance/:instanceId/album/:albumId',
  authMiddleware,
  requirePermission('media', 'update'),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const albumId = Number(c.req.param('albumId'));
    const body = await c.req.json();
    const album = await mediaService.updateAlbum(instanceId, albumId, body);
    return c.json({ data: album });
  },
);

// POST /api/v3/instance/:instanceId/album/:albumId/search - Search for album releases
mediaRoutes.post(
  '/instance/:instanceId/album/:albumId/search',
  authMiddleware,
  requirePermission('media', 'update'),
  async (c) => {
    const instanceId = Number(c.req.param('instanceId'));
    const albumId = Number(c.req.param('albumId'));
    await mediaService.searchAlbum(instanceId, albumId);
    return c.json({ success: true });
  },
);

export default mediaRoutes;
```

---

## Frontend Design

### Unified Media List

```typescript
// frontend/app/[instance]/media/page.tsx

'use client';

import { useState } from 'react';
import { useMedia } from '@/hooks/useMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaCard } from '@/components/media/MediaCard';
import { tv, film, clapperboard, music } from 'lucide-react';

export function MediaListPage({ params }: { params: { instance: string } }) {
  const [contentType, setContentType] = useState<'all' | 'series' | 'anime' | 'movie' | 'music'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: media } = useMedia(params.instance, contentType, searchQuery);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Media Library</h1>
        <Button>Add Media</Button>
      </div>
      
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search media..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
        <TabsList>
          <TabsTrigger value="all">
            All
          </TabsTrigger>
          <TabsTrigger value="series">
            <tv className="w-4 h-4 mr-2" />
            TV Series
          </TabsTrigger>
          <TabsTrigger value="anime">
            <clapperboard className="w-4 h-4 mr-2" />
            Anime
          </TabsTrigger>
          <TabsTrigger value="movie">
            <film className="w-4 h-4 mr-2" />
            Movies
          </TabsTrigger>
          <TabsTrigger value="music">
            <music className="w-4 h-4 mr-2" />
            Music
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={contentType} className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {media?.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Media Card Component

```typescript
// frontend/components/media/MediaCard.tsx

'use client';

import { tv, film, clapperboard, music } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Media } from '@/types/models/media';

interface MediaCardProps {
  media: Media;
}

export function MediaCard({ media }: MediaCardProps) {
  const getTypeIcon = () => {
    switch (media.contentType) {
      case 'series':
        return <tv className="w-4 h-4" />;
      case 'anime':
        return <clapperboard className="w-4 h-4" />;
      case 'movie':
        return <film className="w-4 h-4" />;
      case 'music':
        return <music className="w-4 h-4" />;
    }
  };

  const getSubtitle = () => {
    switch (media.contentType) {
      case 'series':
      case 'anime':
        return `${media.seasonCount} Seasons`;
      case 'movie':
        return media.year?.toString();
      case 'music':
        return `${media.albumCount} Albums`;
    }
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-[2/3] relative bg-gray-200">
        {media.images?.[0]?.url && (
          <img
            src={media.images[0].url}
            alt={media.title}
            className="object-cover w-full h-full"
          />
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {getTypeIcon()}
            {media.contentType}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2">{media.title}</h3>
        <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
        {media.monitored && (
          <Badge variant="default" className="mt-2">Monitored</Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Migration Path

### From Separate Sonarr/Radarr to Unified idkarr

#### Database Migration

```sql
-- 1. Add contentType column to existing media tables
ALTER TABLE series ADD COLUMN content_type TEXT NOT NULL DEFAULT 'series';
ALTER TABLE series ADD CONSTRAINT check_content_type_series 
  CHECK (content_type IN ('series', 'anime'));

ALTER TABLE movies ADD COLUMN content_type TEXT NOT NULL DEFAULT 'movie';

-- 2. Create unified media table
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  instance_id INTEGER NOT NULL REFERENCES instance(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('series', 'anime', 'movie')),
  
  -- Common fields
  title TEXT NOT NULL,
  title_slug TEXT NOT NULL,
  sort_title TEXT NOT NULL,
  overview TEXT,
  status TEXT NOT NULL,
  images JSONB,
  
  -- TV Series/Anime fields
  tvdb_id INTEGER,
  tvrage_id INTEGER,
  tvmaze_id INTEGER,
  anidb_id INTEGER,
  season_count INTEGER,
  runtime INTEGER,
  network TEXT,
  air_time TEXT,
  seasons JSONB,
  
  -- Movie fields
  tmdb_id INTEGER,
  imdb_id TEXT,
  year INTEGER,
  release_date TIMESTAMP,
  studio TEXT,
  certification TEXT,
  genres JSONB,
  
  -- Configuration
  type TEXT,
  quality_profile_id INTEGER NOT NULL REFERENCES quality_profile(id),
  language_profile_id INTEGER NOT NULL,
  root_folder_path TEXT NOT NULL,
  season_folder_format TEXT,
  series_folder_format TEXT,
  season_folder BOOLEAN DEFAULT TRUE,
  movie_folder_format TEXT,
  movie_title_year BOOLEAN DEFAULT TRUE,
  include_quality BOOLEAN DEFAULT TRUE,
  monitored BOOLEAN NOT NULL DEFAULT TRUE,
  use_scene_numbering BOOLEAN NOT NULL DEFAULT FALSE,
  tags JSONB,
  
  -- Metadata
  added TIMESTAMP NOT NULL DEFAULT NOW(),
  ratings JSONB,
  statistics JSONB,
  last_info_sync TIMESTAMP,
  last_disk_sync TIMESTAMP,
  
  -- Unique constraint
  UNIQUE(title_slug, content_type)
);

-- 3. Migrate existing series
INSERT INTO media (
  instance_id, content_type, title, title_slug, sort_title, overview,
  status, images, tvdb_id, tvrage_id, tvmaze_id, season_count,
  runtime, network, air_time, seasons, quality_profile_id,
  language_profile_id, root_folder_path, season_folder_format,
  series_folder_format, season_folder, monitored,
  use_scene_numbering, tags, added, ratings, statistics,
  last_info_sync, last_disk_sync
)
SELECT 
  instance_id, content_type, title, title_slug, sort_title, overview,
  status, images, tvdb_id, tvrage_id, tvmaze_id, season_count,
  runtime, network, air_time, seasons, quality_profile_id,
  language_profile_id, root_folder_path, season_folder_format,
  series_folder_format, season_folder, monitored,
  use_scene_numbering, tags, added, ratings, statistics,
  last_info_sync, last_disk_sync
FROM series;

-- 4. Migrate existing movies
INSERT INTO media (
  instance_id, content_type, title, title_slug, sort_title, overview,
  status, images, tmdb_id, imdb_id, year, release_date, studio,
  certification, genres, runtime, quality_profile_id,
  language_profile_id, root_folder_path, movie_folder_format,
  movie_title_year, include_quality, monitored, tags,
  added, ratings, statistics, last_info_sync, last_disk_sync
)
SELECT 
  instance_id, content_type, title, title_slug, sort_title, overview,
  status, images, tmdb_id, imdb_id, year, release_date, studio,
  certification, genres, runtime, quality_profile_id,
  language_profile_id, root_folder_path, movie_folder_format,
  movie_title_year, include_quality, monitored, tags,
  added, ratings, statistics, last_info_sync, last_disk_sync
FROM movies;

-- 5. Update foreign keys in related tables
-- For episodes
ALTER TABLE episode ADD COLUMN media_id INTEGER REFERENCES media(id) ON DELETE CASCADE;
UPDATE episode e SET media_id = m.id FROM media m WHERE e.series_id = m.id;
ALTER TABLE episode DROP COLUMN series_id;
ALTER TABLE episode ADD CONSTRAINT fk_episode_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE;

-- For movie_files
ALTER TABLE movie_file ADD COLUMN media_id INTEGER REFERENCES media(id) ON DELETE CASCADE;
UPDATE movie_file mf SET media_id = m.id FROM media m WHERE mf.movie_id = m.id;
ALTER TABLE movie_file DROP COLUMN movie_id;
ALTER TABLE movie_file ADD CONSTRAINT fk_movie_file_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE;

-- 6. Create indexes
CREATE INDEX idx_media_content_type ON media(content_type);
CREATE INDEX idx_media_instance ON media(instance_id);
CREATE INDEX idx_episode_media ON episode(media_id);
CREATE INDEX idx_movie_file_media ON movie_file(media_id);

-- 7. (Optional) Drop old tables after verification
-- DROP TABLE series;
-- DROP TABLE movies;
```

---

## Expected Outcomes

### User Experience Improvements

**Before (Separate Sonarr + Radarr + Lidarr):**
- Three+ separate applications to manage
- Three separate databases (no shared config)
- Three separate web UIs (different URLs, different logins)
- Duplicate download clients, indexers, notifications
- Separate histories and queues
- Can't search across TV, movies, and music together
- Anime requires fourth installation

**After (Unified idkarr):**
- Single application for all content (TV, movies, anime, music)
- Shared database with unified configuration
- Single web UI with content type filtering
- Shared download clients, indexers, notifications
- Unified history and queue
- Search across all content types
- Multi-instance support with content type filters

### Performance Improvements

**Resource Usage:**
- **Before**: 4+ installations (Sonarr + Radarr + Lidarr + Sonarr anime) = 4x resources
- **After**: 1 installation (idkarr) = 1/4 resources

**Database:**
- Single database instead of multiple
- Shared queries reduce duplicate work
- Unified caching across all content types

**Development:**
- Single codebase instead of 95% duplicate code
- Single release to maintain
- Single bug tracker
- Single documentation

### Developer Benefits

**Simplified Architecture:**
- Unified database schema
- Shared services and utilities
- Consistent API patterns
- Type-safe polymorphic relationships

**Better Testing:**
- Unified test suite
- Shared test utilities
- Easier to add new content types

---

## Summary

This unified media manager (idkarr) provides:

1. **Single Application**: TV series, movies, anime, and music in one app
2. **Shared Infrastructure**: Download clients, indexers, notifications, quality profiles
3. **Unified Search**: Search across all content types (TVDB, TMDB, AniDB, MusicBrainz)
4. **Polymorphic Data Model**: Single media table with content type polymorphism
5. **Type-Specific Logic**: Separate parsers and metadata services per content type
6. **Multi-Instance Support**: Instances can be content-type specific or mixed
7. **Reduced Resource Usage**: 1 app instead of 4+ (1/4 resources)
8. **Simplified Development**: Single codebase instead of 95% duplicate code
9. **Migration Path**: Clear migration from separate Sonarr/Radarr/Lidarr installations

### Content Type Comparison

| Feature | TV Series | Movies | Anime | Music |
|---------|-----------|--------|-------|-------|
| **Hierarchy** | Series > Season > Episode | Movie | Series > Season > Episode | Artist > Album > Track |
| **Metadata Source** | TVDB/TVMaze | TMDB | AniDB/TVDB | MusicBrainz |
| **ID Format** | S01E01 | Title (Year) | Absolute/S01E01 | Artist - Album (Year) |
| **Quality Focus** | Video resolution | Video resolution | Video resolution | Audio format/bitrate |
| **Editions** | N/A | Director's Cut, Extended | N/A | Original, Remaster, Deluxe |
| **Multi-file** | Episode per file | Single file | Episode per file | Track per file |
| **Monitoring** | Season/Episode | Single item | Season/Episode | Album/Track |

### Audio Quality Profiles (Music-Specific)

| Quality | Format | Bitrate | Bit Depth | Sample Rate |
|---------|--------|---------|-----------|-------------|
| Lossless | FLAC/ALAC | N/A | 16/24-bit | 44.1-192kHz |
| High | MP3/AAC | 320kbps | N/A | N/A |
| Medium | MP3/AAC | 256kbps | N/A | N/A |
| Standard | MP3/AAC | 192kbps | N/A | N/A |

This solves the fundamental inefficiency of running separate apps that share 95% of their code and infrastructure, while maintaining all the benefits of content-type-specific handling.

*End of Unified Media Manager Documentation*
