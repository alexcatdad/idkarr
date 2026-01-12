# Unified Media Manager (idkarr) - TV Series & Movies

---

## Problem Statement

### Current Separation (Sonarr + Radarr)

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

**Why They're Currently Separate:**
1. **Historical reasons**: Started as separate forks of NZBDrone
2. **Different data models**: TV has seasons/episodes, movies don't
3. **Different metadata sources**: TV uses TVDB, movies use TMDB
4. **Different naming conventions**: TV needs S01E01, movies just need Title.Year
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
- Two separate installations (double resource usage)
- Two separate databases (no shared configuration)
- Two separate web UIs (different URLs, different logins)
- Duplicate configuration (indexers, download clients, notifications)
- Separate quality profiles (can't reuse across apps)
- Separate histories (can't see all downloads in one place)
- Separate queues (harder to manage overall download status)
- Separate instances for anime (3+ installations total)

**Technical Debt:**
- 95% duplicate code between Sonarr and Radarr
- Separate release to maintain and update
- Separate bugs and features
- Separate documentation
- Separate communities and support

---

## Unified Architecture

### idkarr - Single Application for TV & Movies

```
┌─────────────────────────────────────────────────────────────┐
│                      idkarr (Unified)                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Content Types                          │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │   TV Series  │  │    Movies    │  │   Anime     │ │  │
│  │  │              │  │              │  │             │ │  │
│  │  │ - Episodes   │  │ - Single     │  │ - Episodes  │ │  │
│  │  │ - Seasons    │  │ - Year       │  │ - Seasons   │ │  │
│  │  │ - TVDB       │  │ - TMDB       │  │ - AniDB     │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│        ┌──────────────────┼──────────────────┐            │
│        │                  │                  │            │
┌───────▼─────────┐ ┌────────▼─────────┐ ┌──────▼──────────┐ │
│  Shared Core    │ │  Shared Core    │ │  Shared Core    │ │
│                 │ │                 │ │                 │ │
│ • Metadata      │ │ • Download      │ │ • Quality       │ │
│   (TVDB/TMDB)   │ │   Clients       │ │   Profiles      │ │
│ • Indexers      │ │ • Queue         │ │ • Custom        │ │
│ • Search        │ │ • History       │ │   Formats       │ │
│ • Import        │ │ • Notifications │ │ • Tags          │ │
│   Lists         │ │ • Calendar      │ │ • Root Folders  │ │
│ • Release       │ │ • Wanted        │ │ • Settings      │ │
│   Parsing       │ │ • Health        │ │ • Users         │ │
│                 │ │                 │ │ • Permissions   │ │
└─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│  Postgres DB  │  │  Redis Cache  │  │ BullMQ Queue │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Key Design Decisions

#### 1. **Unified Content Model**
- Single `Media` table with `contentType` field ('series', 'movie', 'anime')
- Polymorphic relationships for episodes vs movie files
- Type-specific metadata stored in JSONB
- Unified search across all content types

#### 2. **Shared Infrastructure**
- Single database with unified schema
- Single queue for all downloads
- Shared download clients, indexers, notifications
- Unified quality profiles and custom formats
- Single authentication/authorization system

#### 3. **Type-Specific Logic**
- Content type services handle type-specific operations
- Metadata adapters for TVDB, TMDB, AniDB
- Release parsers for each content type
- Different UI components per content type

#### 4. **Multi-Instance Support**
- Instances can be content-type specific (TV instance, Movie instance, Anime instance)
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
  // Polymorphic: either episodes (TV/anime) or movieFiles (movies)
  episodes: many(episode),
  movieFiles: many(movieFile),
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
]);

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Episode/Season/Movie Info (nullable based on content type)
  episodeId: integer('episode_id'), // For TV/anime
  seasonNumber: integer('season_number'), // For TV/anime
  movieFileId: integer('movie_file_id'), // For movies
  
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
  
  // Episode/Season/Movie Info (nullable based on content type)
  episodeId: integer('episode_id'), // For TV/anime
  seasonNumber: integer('season_number'), // For TV/anime
  movieFileId: integer('movie_file_id'), // For movies
  edition: text('edition'), // For movies
  
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

export const rootFolderTypeEnum = pgEnum('root_folder_type', ['series', 'anime', 'movie']);

export const rootFolder = pgTable('root_folder', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  path: text('path').notNull(),
  name: text('name').notNull(),
  type: rootFolderTypeEnum('type').notNull(), // 'series', 'anime', 'movie'
  
  // Folder configuration
  defaultTags: jsonb('default_tags').$type<number[]>([]),
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultMetadataProfileId: integer('default_metadata_profile_id'),
  defaultMonitorType: text('default_monitor_type'), // 'all', 'future', 'missing', 'none', 'latestSeason'
  defaultLanguageProfileId: integer('default_language_profile_id'),
  
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
import { media, episode, movieFile } from '@/db/schema';
import { ContentType } from '@/types/models/media';
import { TVDBMetadataService } from './tvdb.service';
import { TMDBMetadataService } from './tmdb.service';
import { AniDBMetadataService } from './anidb.service';

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
  
  /**
   * Search for media (unified search across TVDB and TMDB)
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
    const searchTypes = type ? [type] : ['series', 'anime', 'movie'];
    
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
      default:
        throw new Error(`Unknown content type: ${type}`);
    }
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

interface ParsedRelease {
  contentType: ContentType;
  title: string;
  year?: number;
  quality: {
    resolution: number;
    source: string;
    modifier?: string;
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
}

export class ReleaseParserService {
  private tvParser = new TVReleaseParser();
  private animeParser = new AnimeReleaseParser();
  private movieParser = new MovieReleaseParser();
  
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

// GET /api/v3/instance/:instanceId/media - List all media (TV, movies, anime)
mediaRoutes.get('/instance/:instanceId/media', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const { type, query, page = 1, pageSize = 20 } = c.req.query();
  
  const media = await mediaService.getAll(instanceId, {
    contentType: type as 'series' | 'anime' | 'movie',
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

// POST /api/v3/instance/:instanceId/media - Add media (TV series or movie)
mediaRoutes.post(
  '/instance/:instanceId/media',
  authMiddleware,
  requirePermission('media', 'create'),
  validationMiddleware(
    z.object({
      contentType: z.enum(['series', 'anime', 'movie']),
      tvdbId: z.number().optional(),
      tmdbId: z.number().optional(),
      aniDbId: z.number().optional(),
      imdbId: z.string().optional(),
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
      type: z.enum(['series', 'anime', 'movie', 'all']).default('all'),
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

// GET /api/v3/instance/:instanceId/media/:id/files - Get files (episodes or movie files)
mediaRoutes.get('/instance/:instanceId/media/:id/files', authMiddleware, async (c) => {
  const instanceId = Number(c.req.param('instanceId'));
  const id = Number(c.req.param('id'));
  const files = await mediaService.getFiles(instanceId, id);
  return c.json({ data: files });
});

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
import { tv, film, clapperboard } from 'lucide-react';

export function MediaListPage({ params }: { params: { instance: string } }) {
  const [contentType, setContentType] = useState<'all' | 'series' | 'anime' | 'movie'>('all');
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

import { tv, film, clapperboard } from 'lucide-react';
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
    }
  };
  
  const getSubtitle = () => {
    switch (media.contentType) {
      case 'series':
      case 'anime':
        return `${media.seasonCount} Seasons`;
      case 'movie':
        return media.year?.toString();
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

**Before (Separate Sonarr + Radarr):**
- Two separate applications to manage
- Two separate databases (no shared config)
- Two separate web UIs (different URLs, different logins)
- Duplicate download clients, indexers, notifications
- Separate histories and queues
- Can't search across TV and movies together
- Anime requires third installation

**After (Unified idkarr):**
- Single application for all content (TV, movies, anime)
- Shared database with unified configuration
- Single web UI with content type filtering
- Shared download clients, indexers, notifications
- Unified history and queue
- Search across all content types
- Multi-instance support with content type filters

### Performance Improvements

**Resource Usage:**
- **Before**: 3+ installations (Sonarr + Radarr + Sonarr anime) = 3x resources
- **After**: 1 installation (idkarr) = 1/3 resources

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

1. **Single Application**: TV series, movies, and anime in one app
2. **Shared Infrastructure**: Download clients, indexers, notifications, quality profiles
3. **Unified Search**: Search across all content types
4. **Polymorphic Data Model**: Single media table with content type polymorphism
3. **Type-Specific Logic**: Separate parsers and metadata services per content type
4. **Multi-Instance Support**: Instances can be content-type specific or mixed
5. **Reduced Resource Usage**: 1 app instead of 3+ (1/3 resources)
6. **Simplified Development**: Single codebase instead of 95% duplicate code
7. **Migration Path**: Clear migration from separate Sonarr/Radarr installations

This solves the fundamental inefficiency of running separate apps that share 95% of their code and infrastructure, while maintaining all the benefits of content-type-specific handling.

*End of Unified Media Manager Documentation*
