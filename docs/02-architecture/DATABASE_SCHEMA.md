# Database Schema Specification

## Overview

This document provides the complete, authoritative database schema for idkarr. All tables, relationships, indexes, constraints, and enums are defined here using Drizzle ORM syntax.

**Database**: PostgreSQL 16+
**ORM**: Drizzle ORM v0.32+

---

## Table of Contents

1. [Schema Organization](#schema-organization)
2. [Enums](#enums)
3. [Core Tables](#core-tables)
4. [User & Authentication Tables](#user--authentication-tables)
5. [Media Management Tables](#media-management-tables)
6. [Download Pipeline Tables](#download-pipeline-tables)
7. [Configuration Tables](#configuration-tables)
8. [System Tables](#system-tables)
9. [Entity Relationship Diagram](#entity-relationship-diagram)
10. [Indexes Strategy](#indexes-strategy)
11. [Migration Strategy](#migration-strategy)

---

## Schema Organization

```
backend/src/db/
├── schema/
│   ├── index.ts                 # Export all schemas
│   ├── enums.ts                 # All enum definitions
│   │
│   ├── # Core Media
│   ├── media.schema.ts          # Unified media table
│   ├── series.schema.ts         # TV series
│   ├── movie.schema.ts          # Movies
│   ├── episode.schema.ts        # Episodes
│   ├── season.schema.ts         # Seasons
│   ├── episodeFile.schema.ts    # Episode files
│   ├── movieFile.schema.ts      # Movie files
│   │
│   ├── # Users & Auth
│   ├── user.schema.ts           # Users
│   ├── session.schema.ts        # Sessions (Lucia)
│   ├── role.schema.ts           # Roles
│   ├── permission.schema.ts     # Permissions
│   ├── apiKey.schema.ts         # API keys
│   ├── auditLog.schema.ts       # Audit logging
│   │
│   ├── # Download Pipeline
│   ├── indexer.schema.ts        # Indexers
│   ├── downloadClient.schema.ts # Download clients
│   ├── release.schema.ts        # Releases/search results
│   ├── queue.schema.ts          # Download queue
│   ├── history.schema.ts        # Download history
│   ├── blocklist.schema.ts      # Blocked releases
│   │
│   ├── # Configuration
│   ├── qualityProfile.schema.ts # Quality profiles
│   ├── qualityDefinition.schema.ts # Quality definitions
│   ├── customFormat.schema.ts   # Custom formats
│   ├── delayProfile.schema.ts   # Delay profiles
│   ├── releaseProfile.schema.ts # Release profiles
│   ├── namingConfig.schema.ts   # Naming configuration
│   ├── rootFolder.schema.ts     # Root folders
│   ├── tag.schema.ts            # Tags
│   │
│   ├── # Integrations
│   ├── notification.schema.ts   # Notifications
│   ├── importList.schema.ts     # Import lists
│   ├── metadata.schema.ts       # Metadata sources
│   │
│   ├── # Discovery & Requests
│   ├── request.schema.ts        # Media requests
│   ├── watchlist.schema.ts      # User watchlists
│   ├── discovery.schema.ts      # Discovery cache
│   │
│   ├── # System
│   ├── instance.schema.ts       # Instances (multi-instance)
│   ├── config.schema.ts         # System configuration
│   ├── scheduledTask.schema.ts  # Scheduled tasks
│   ├── command.schema.ts        # Commands/jobs
│   ├── log.schema.ts            # Application logs
│   └── trash.schema.ts          # Soft-deleted items
│
├── migrations/                   # Migration files
├── seed/                        # Seed data
└── client.ts                    # Drizzle client
```

---

## Enums

```typescript
// backend/src/db/schema/enums.ts

import { pgEnum } from 'drizzle-orm/pg-core';

// ============================================
// Content & Media Enums
// ============================================

export const contentTypeEnum = pgEnum('content_type', [
  'series',      // TV Series
  'movie',       // Movies
  'anime',       // Anime (special handling)
]);

export const seriesTypeEnum = pgEnum('series_type', [
  'standard',    // Regular TV series
  'daily',       // Daily shows (talk shows, news)
  'anime',       // Anime series
]);

export const seriesStatusEnum = pgEnum('series_status', [
  'continuing',  // Still airing
  'ended',       // Finished airing
  'upcoming',    // Not yet aired
  'deleted',     // Removed from TVDB
]);

export const movieStatusEnum = pgEnum('movie_status', [
  'announced',   // Announced but not released
  'in_cinemas',  // Currently in theaters
  'released',    // Released (available)
  'deleted',     // Removed from TMDB
]);

export const monitorTypesEnum = pgEnum('monitor_types', [
  'all',              // Monitor all episodes
  'future',           // Only future episodes
  'missing',          // Only missing episodes
  'existing',         // Only existing episodes
  'recent',           // Recent episodes only
  'pilot',            // Pilot episode only
  'first_season',     // First season only
  'last_season',      // Last season only
  'monitored_only',   // Only monitored
  'none',             // Don't monitor
]);

// ============================================
// Quality Enums
// ============================================

export const qualitySourceEnum = pgEnum('quality_source', [
  'unknown',
  'television',    // HDTV, PDTV, SDTV
  'television_raw', // Raw TV capture
  'web',           // WEB-DL
  'web_rip',       // WEBRip
  'dvd',           // DVD
  'bluray',        // BluRay
  'bluray_raw',    // Raw BluRay
]);

export const qualityModifierEnum = pgEnum('quality_modifier', [
  'none',
  'regional',      // Regional release
  'screener',      // Screener
  'rawhd',         // Raw HD
  'brdisk',        // Full BR disk
  'remux',         // Remux
]);

// ============================================
// Download & Queue Enums
// ============================================

export const protocolEnum = pgEnum('protocol', [
  'usenet',
  'torrent',
]);

export const queueStatusEnum = pgEnum('queue_status', [
  'queued',        // Waiting to download
  'paused',        // Paused
  'downloading',   // Currently downloading
  'completed',     // Download complete, awaiting import
  'failed',        // Download failed
  'warning',       // Has warnings
  'delay',         // Delayed (delay profile)
]);

export const trackedDownloadStatusEnum = pgEnum('tracked_download_status', [
  'ok',
  'warning',
  'error',
]);

export const trackedDownloadStateEnum = pgEnum('tracked_download_state', [
  'downloading',
  'download_failed',
  'download_failed_pending',
  'importing',
  'import_pending',
  'import_failed',
  'imported',
  'ignored',
]);

export const historyEventTypeEnum = pgEnum('history_event_type', [
  'grabbed',                    // Release grabbed
  'series_folder_imported',     // Series folder imported
  'download_folder_imported',   // Download folder imported
  'download_failed',            // Download failed
  'episode_file_deleted',       // File deleted
  'episode_file_renamed',       // File renamed
  'download_ignored',           // Download ignored
  'grab_failed',               // Grab failed
]);

// ============================================
// User & Auth Enums
// ============================================

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'suspended',
  'pending',       // Awaiting email verification
]);

export const permissionResourceEnum = pgEnum('permission_resource', [
  'system',
  'settings',
  'users',
  'roles',
  'audit_log',
  'instances',
  'series',
  'movies',
  'episodes',
  'queue',
  'history',
  'releases',
  'wanted',
  'calendar',
  'tags',
  'quality_profiles',
  'custom_formats',
  'root_folders',
  'indexers',
  'download_clients',
  'notifications',
  'import_lists',
  'requests',
]);

export const permissionActionEnum = pgEnum('permission_action', [
  'read',
  'create',
  'update',
  'delete',
  'manage',
  'admin',
  'download',
  'import',
  'rename',
  'search',
  'monitor',
  'approve',
]);

// ============================================
// Request & Discovery Enums
// ============================================

export const requestStatusEnum = pgEnum('request_status', [
  'pending',       // Awaiting approval
  'approved',      // Approved, processing
  'available',     // Downloaded and available
  'denied',        // Request denied
  'partial',       // Partially available
]);

export const watchlistTypeEnum = pgEnum('watchlist_type', [
  'plan_to_watch',
  'watching',
  'completed',
  'on_hold',
  'dropped',
]);

// ============================================
// Notification Enums
// ============================================

export const notificationEventEnum = pgEnum('notification_event', [
  'on_grab',
  'on_download',
  'on_upgrade',
  'on_rename',
  'on_series_add',
  'on_series_delete',
  'on_episode_file_delete',
  'on_episode_file_delete_for_upgrade',
  'on_health_issue',
  'on_health_restored',
  'on_application_update',
  'on_manual_interaction_required',
  'on_request_approved',
  'on_request_denied',
  'on_request_available',
]);

// ============================================
// System Enums
// ============================================

export const commandStatusEnum = pgEnum('command_status', [
  'queued',
  'started',
  'completed',
  'failed',
  'aborted',
]);

export const commandPriorityEnum = pgEnum('command_priority', [
  'low',
  'normal',
  'high',
]);

export const logLevelEnum = pgEnum('log_level', [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);
```

---

## Core Tables

### Instance Table (Multi-Instance Support)

```typescript
// backend/src/db/schema/instance.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './enums';

export const instance = pgTable('instance', {
  id: serial('id').primaryKey(),

  // Instance identification
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),          // URL-friendly name
  description: text('description'),

  // Content type this instance manages
  contentType: contentTypeEnum('content_type').notNull(),

  // Status
  isDefault: boolean('is_default').notNull().default(false),
  isEnabled: boolean('is_enabled').notNull().default(true),

  // Configuration
  rootFolderPath: text('root_folder_path'),
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultTags: jsonb('default_tags').$type<number[]>().default([]),

  // Instance-specific settings
  settings: jsonb('settings').$type<{
    enableRss?: boolean;
    rssInterval?: number;
    enableSearch?: boolean;
    enableInteractiveSearch?: boolean;
    downloadClientId?: number;
  }>(),

  // Visual
  icon: text('icon'),
  color: text('color'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const instanceRelations = relations(instance, ({ many }) => ({
  series: many(series),
  movies: many(movie),
  rootFolders: many(rootFolder),
}));
```

### Series Table

```typescript
// backend/src/db/schema/series.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { seriesStatusEnum, seriesTypeEnum, monitorTypesEnum } from './enums';
import { instance } from './instance.schema';
import { qualityProfile } from './qualityProfile.schema';

export const series = pgTable('series', {
  id: serial('id').primaryKey(),

  // Instance assignment
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),

  // External IDs
  tvdbId: integer('tvdb_id').notNull(),
  tmdbId: integer('tmdb_id'),
  imdbId: text('imdb_id'),
  tvMazeId: integer('tv_maze_id'),
  tvRageId: integer('tv_rage_id'),

  // Basic Info
  title: text('title').notNull(),
  sortTitle: text('sort_title').notNull(),
  cleanTitle: text('clean_title').notNull(),        // Normalized for matching
  originalTitle: text('original_title'),

  // Status & Type
  status: seriesStatusEnum('status').notNull().default('continuing'),
  seriesType: seriesTypeEnum('series_type').notNull().default('standard'),

  // Details
  overview: text('overview'),
  network: text('network'),
  airTime: text('air_time'),                         // e.g., "21:00"
  runtime: integer('runtime'),                       // Minutes
  year: integer('year'),

  // Dates
  firstAired: timestamp('first_aired'),
  lastAired: timestamp('last_aired'),
  nextAiring: timestamp('next_airing'),
  previousAiring: timestamp('previous_airing'),

  // Monitoring
  monitored: boolean('monitored').notNull().default(true),
  monitorNewItems: monitorTypesEnum('monitor_new_items').notNull().default('all'),

  // Quality & Profile
  qualityProfileId: integer('quality_profile_id').notNull().references(() => qualityProfile.id),

  // File Organization
  path: text('path').notNull(),
  rootFolderPath: text('root_folder_path').notNull(),
  seasonFolder: boolean('season_folder').notNull().default(true),
  useSceneNumbering: boolean('use_scene_numbering').notNull().default(false),

  // Ratings
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),
  certification: text('certification'),              // TV-MA, TV-14, etc.

  // Genres & Tags
  genres: jsonb('genres').$type<string[]>().default([]),
  tags: jsonb('tags').$type<number[]>().default([]),

  // Images
  images: jsonb('images').$type<Array<{
    coverType: 'poster' | 'banner' | 'fanart' | 'clearlogo' | 'headshot';
    url: string;
    remoteUrl?: string;
  }>>().default([]),

  // Language
  originalLanguage: text('original_language'),

  // Statistics (denormalized for performance)
  statistics: jsonb('statistics').$type<{
    seasonCount: number;
    episodeCount: number;
    episodeFileCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  }>(),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  lastInfoSync: timestamp('last_info_sync'),

  // Soft delete (Trash support)
  deletedAt: timestamp('deleted_at'),

}, (table) => ({
  // Indexes
  tvdbIdIdx: index('series_tvdb_id_idx').on(table.tvdbId),
  titleIdx: index('series_title_idx').on(table.title),
  sortTitleIdx: index('series_sort_title_idx').on(table.sortTitle),
  cleanTitleIdx: index('series_clean_title_idx').on(table.cleanTitle),
  pathIdx: uniqueIndex('series_path_idx').on(table.path),
  instanceIdIdx: index('series_instance_id_idx').on(table.instanceId),
  statusIdx: index('series_status_idx').on(table.status),
  monitoredIdx: index('series_monitored_idx').on(table.monitored),

  // Composite indexes
  instanceTvdbIdx: uniqueIndex('series_instance_tvdb_idx').on(table.instanceId, table.tvdbId),
}));

export const seriesRelations = relations(series, ({ one, many }) => ({
  instance: one(instance, {
    fields: [series.instanceId],
    references: [instance.id],
  }),
  qualityProfile: one(qualityProfile, {
    fields: [series.qualityProfileId],
    references: [qualityProfile.id],
  }),
  seasons: many(season),
  episodes: many(episode),
  episodeFiles: many(episodeFile),
  history: many(history),
  alternateTitles: many(alternateTitle),
}));
```

### Season Table

```typescript
// backend/src/db/schema/season.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { series } from './series.schema';

export const season = pgTable('season', {
  id: serial('id').primaryKey(),

  // Parent
  seriesId: integer('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),

  // Season Info
  seasonNumber: integer('season_number').notNull(),

  // Monitoring
  monitored: boolean('monitored').notNull().default(true),

  // Images
  images: jsonb('images').$type<Array<{
    coverType: 'poster' | 'banner';
    url: string;
  }>>().default([]),

  // Statistics (denormalized)
  statistics: jsonb('statistics').$type<{
    episodeCount: number;
    episodeFileCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
    previousAiring?: string;
    nextAiring?: string;
  }>(),

}, (table) => ({
  seriesIdIdx: index('season_series_id_idx').on(table.seriesId),
  seriesSeasonIdx: index('season_series_season_idx').on(table.seriesId, table.seasonNumber),
}));

export const seasonRelations = relations(season, ({ one, many }) => ({
  series: one(series, {
    fields: [season.seriesId],
    references: [series.id],
  }),
  episodes: many(episode),
}));
```

### Episode Table

```typescript
// backend/src/db/schema/episode.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { series } from './series.schema';
import { season } from './season.schema';
import { episodeFile } from './episodeFile.schema';

export const episode = pgTable('episode', {
  id: serial('id').primaryKey(),

  // Parents
  seriesId: integer('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  seasonId: integer('season_id').references(() => season.id, { onDelete: 'set null' }),

  // Episode identification
  seasonNumber: integer('season_number').notNull(),
  episodeNumber: integer('episode_number').notNull(),
  absoluteEpisodeNumber: integer('absolute_episode_number'),   // For anime
  sceneSeasonNumber: integer('scene_season_number'),
  sceneEpisodeNumber: integer('scene_episode_number'),
  sceneAbsoluteEpisodeNumber: integer('scene_absolute_episode_number'),

  // Episode Info
  title: text('title').notNull(),
  overview: text('overview'),

  // Air dates
  airDate: timestamp('air_date'),
  airDateUtc: timestamp('air_date_utc'),

  // Runtime
  runtime: integer('runtime'),

  // External IDs
  tvdbId: integer('tvdb_id'),

  // File association
  episodeFileId: integer('episode_file_id').references(() => episodeFile.id, { onDelete: 'set null' }),
  hasFile: boolean('has_file').notNull().default(false),

  // Monitoring
  monitored: boolean('monitored').notNull().default(true),
  unverifiedSceneNumbering: boolean('unverified_scene_numbering').notNull().default(false),

  // Images
  images: jsonb('images').$type<Array<{
    coverType: 'screenshot';
    url: string;
  }>>().default([]),

  // Ratings
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),

  // Grab tracking
  lastSearchTime: timestamp('last_search_time'),
  grabbed: boolean('grabbed').notNull().default(false),

}, (table) => ({
  seriesIdIdx: index('episode_series_id_idx').on(table.seriesId),
  seasonIdIdx: index('episode_season_id_idx').on(table.seasonId),
  airDateIdx: index('episode_air_date_idx').on(table.airDate),
  episodeFileIdIdx: index('episode_episode_file_id_idx').on(table.episodeFileId),

  // Composite indexes
  seriesSeasonEpisodeIdx: index('episode_series_season_episode_idx')
    .on(table.seriesId, table.seasonNumber, table.episodeNumber),
  absoluteIdx: index('episode_absolute_idx')
    .on(table.seriesId, table.absoluteEpisodeNumber),
}));

export const episodeRelations = relations(episode, ({ one, many }) => ({
  series: one(series, {
    fields: [episode.seriesId],
    references: [series.id],
  }),
  season: one(season, {
    fields: [episode.seasonId],
    references: [season.id],
  }),
  episodeFile: one(episodeFile, {
    fields: [episode.episodeFileId],
    references: [episodeFile.id],
  }),
  history: many(history),
}));
```

### Episode File Table

```typescript
// backend/src/db/schema/episodeFile.schema.ts

import { bigint, boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { series } from './series.schema';

export const episodeFile = pgTable('episode_file', {
  id: serial('id').primaryKey(),

  // Parent
  seriesId: integer('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),

  // Episode association (can be multi-episode)
  seasonNumber: integer('season_number').notNull(),
  episodeIds: jsonb('episode_ids').$type<number[]>().notNull().default([]),

  // File Info
  relativePath: text('relative_path').notNull(),
  path: text('path').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),

  // Quality
  quality: jsonb('quality').$type<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    revision: {
      version: number;
      real: number;
      isRepack: boolean;
    };
  }>().notNull(),

  // Custom formats
  customFormats: jsonb('custom_formats').$type<number[]>().default([]),
  customFormatScore: integer('custom_format_score').default(0),

  // Languages
  languages: jsonb('languages').$type<Array<{
    id: number;
    name: string;
  }>>().default([]),

  // Media Info
  mediaInfo: jsonb('media_info').$type<{
    audioBitrate: number;
    audioChannels: number;
    audioCodec: string;
    audioLanguages: string[];
    audioStreamCount: number;
    videoBitDepth: number;
    videoBitrate: number;
    videoCodec: string;
    videoFps: number;
    videoDynamicRange: string;
    videoDynamicRangeType: string;
    resolution: string;
    runTime: string;
    scanType: string;
    subtitles: string[];
  }>(),

  // Release Info
  releaseGroup: text('release_group'),
  sceneName: text('scene_name'),
  indexerFlags: integer('indexer_flags').default(0),

  // Tracking
  dateAdded: timestamp('date_added').notNull().defaultNow(),

  // Quality checks
  qualityCutoffNotMet: boolean('quality_cutoff_not_met').notNull().default(false),

}, (table) => ({
  seriesIdIdx: index('episode_file_series_id_idx').on(table.seriesId),
  pathIdx: uniqueIndex('episode_file_path_idx').on(table.path),
  seasonIdx: index('episode_file_season_idx').on(table.seriesId, table.seasonNumber),
}));

export const episodeFileRelations = relations(episodeFile, ({ one, many }) => ({
  series: one(series, {
    fields: [episodeFile.seriesId],
    references: [series.id],
  }),
  episodes: many(episode),
}));
```

### Movie Table

```typescript
// backend/src/db/schema/movie.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { movieStatusEnum, monitorTypesEnum } from './enums';
import { instance } from './instance.schema';
import { qualityProfile } from './qualityProfile.schema';

export const movie = pgTable('movie', {
  id: serial('id').primaryKey(),

  // Instance assignment
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),

  // External IDs
  tmdbId: integer('tmdb_id').notNull(),
  imdbId: text('imdb_id'),

  // Basic Info
  title: text('title').notNull(),
  sortTitle: text('sort_title').notNull(),
  cleanTitle: text('clean_title').notNull(),
  originalTitle: text('original_title'),
  originalLanguage: text('original_language'),

  // Status
  status: movieStatusEnum('status').notNull().default('released'),

  // Details
  overview: text('overview'),
  studio: text('studio'),
  runtime: integer('runtime'),                     // Minutes
  year: integer('year'),

  // Dates
  inCinemas: timestamp('in_cinemas'),
  physicalRelease: timestamp('physical_release'),
  digitalRelease: timestamp('digital_release'),

  // Monitoring
  monitored: boolean('monitored').notNull().default(true),
  minimumAvailability: text('minimum_availability').notNull().default('released'),

  // Quality & Profile
  qualityProfileId: integer('quality_profile_id').notNull().references(() => qualityProfile.id),

  // File Organization
  path: text('path').notNull(),
  rootFolderPath: text('root_folder_path').notNull(),

  // File
  hasFile: boolean('has_file').notNull().default(false),
  movieFileId: integer('movie_file_id'),

  // Ratings
  ratings: jsonb('ratings').$type<{
    imdb?: { votes: number; value: number };
    tmdb?: { votes: number; value: number };
    metacritic?: { votes: number; value: number };
    rottenTomatoes?: { votes: number; value: number };
  }>(),
  certification: text('certification'),

  // Genres & Tags
  genres: jsonb('genres').$type<string[]>().default([]),
  tags: jsonb('tags').$type<number[]>().default([]),

  // Collection
  collection: jsonb('collection').$type<{
    tmdbId: number;
    name: string;
  }>(),

  // Images
  images: jsonb('images').$type<Array<{
    coverType: 'poster' | 'fanart' | 'clearlogo';
    url: string;
    remoteUrl?: string;
  }>>().default([]),

  // YouTube trailer
  youTubeTrailerId: text('youtube_trailer_id'),

  // Website
  website: text('website'),

  // Statistics
  sizeOnDisk: bigint('size_on_disk', { mode: 'number' }).default(0),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  lastInfoSync: timestamp('last_info_sync'),

  // Soft delete
  deletedAt: timestamp('deleted_at'),

}, (table) => ({
  tmdbIdIdx: index('movie_tmdb_id_idx').on(table.tmdbId),
  imdbIdIdx: index('movie_imdb_id_idx').on(table.imdbId),
  titleIdx: index('movie_title_idx').on(table.title),
  sortTitleIdx: index('movie_sort_title_idx').on(table.sortTitle),
  cleanTitleIdx: index('movie_clean_title_idx').on(table.cleanTitle),
  pathIdx: uniqueIndex('movie_path_idx').on(table.path),
  instanceIdIdx: index('movie_instance_id_idx').on(table.instanceId),
  statusIdx: index('movie_status_idx').on(table.status),
  monitoredIdx: index('movie_monitored_idx').on(table.monitored),

  instanceTmdbIdx: uniqueIndex('movie_instance_tmdb_idx').on(table.instanceId, table.tmdbId),
}));

export const movieRelations = relations(movie, ({ one, many }) => ({
  instance: one(instance, {
    fields: [movie.instanceId],
    references: [instance.id],
  }),
  qualityProfile: one(qualityProfile, {
    fields: [movie.qualityProfileId],
    references: [qualityProfile.id],
  }),
  movieFile: one(movieFile),
  history: many(history),
  alternateTitles: many(alternateTitle),
}));
```

### Alternate Titles Table

```typescript
// backend/src/db/schema/alternateTitle.schema.ts

import { index, integer, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { series } from './series.schema';
import { movie } from './movie.schema';

export const alternateTitle = pgTable('alternate_title', {
  id: serial('id').primaryKey(),

  // Parent (one of these will be set)
  seriesId: integer('series_id').references(() => series.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').references(() => movie.id, { onDelete: 'cascade' }),

  // Title info
  title: text('title').notNull(),
  cleanTitle: text('clean_title').notNull(),

  // Season-specific (for series)
  seasonNumber: integer('season_number'),
  sceneSeasonNumber: integer('scene_season_number'),

  // Voting (for community titles)
  voteCount: integer('vote_count').default(0),
  votes: integer('votes').default(0),

  // Comment/reason
  comment: text('comment'),

}, (table) => ({
  seriesIdIdx: index('alternate_title_series_id_idx').on(table.seriesId),
  movieIdIdx: index('alternate_title_movie_id_idx').on(table.movieId),
  cleanTitleIdx: index('alternate_title_clean_title_idx').on(table.cleanTitle),
}));

export const alternateTitleRelations = relations(alternateTitle, ({ one }) => ({
  series: one(series, {
    fields: [alternateTitle.seriesId],
    references: [series.id],
  }),
  movie: one(movie, {
    fields: [alternateTitle.movieId],
    references: [movie.id],
  }),
}));
```

---

## User & Authentication Tables

### User Table

```typescript
// backend/src/db/schema/user.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userStatusEnum } from './enums';

export const user = pgTable('user', {
  id: serial('id').primaryKey(),

  // Authentication
  username: text('username').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),

  // Profile
  displayName: text('display_name'),
  avatar: text('avatar'),

  // Status
  status: userStatusEnum('status').notNull().default('pending'),
  emailVerified: boolean('email_verified').notNull().default(false),

  // Security
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: text('two_factor_secret'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),

  // Activity
  lastLogin: timestamp('last_login'),
  lastActive: timestamp('last_active'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),

  // API Access
  apiKeyHash: text('api_key_hash'),
  apiKeyLastUsed: timestamp('api_key_last_used'),

  // Instance preferences
  defaultInstanceId: integer('default_instance_id'),

  // UI preferences
  preferences: jsonb('preferences').$type<{
    language: string;
    timezone: string;
    theme: 'light' | 'dark' | 'system';
    dateFormat: string;
    timeFormat: '12h' | '24h';
    firstDayOfWeek: number;
    pageSize: number;
    showRelativeDates: boolean;
  }>().default({
    language: 'en',
    timezone: 'UTC',
    theme: 'dark',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    firstDayOfWeek: 0,
    pageSize: 50,
    showRelativeDates: true,
  }),

  // Notification settings
  notificationSettings: jsonb('notification_settings').$type<{
    onGrab?: boolean;
    onDownload?: boolean;
    onUpgrade?: boolean;
    onRequestApproved?: boolean;
    onRequestAvailable?: boolean;
    emailDigest?: 'none' | 'daily' | 'weekly';
  }>().default({}),

  // Request system
  requestLimit: integer('request_limit'),           // null = unlimited
  requestCount: integer('request_count').default(0),
  autoApproveRequests: boolean('auto_approve_requests').default(false),

  // Plex/Jellyfin/Emby
  plexId: text('plex_id'),
  plexToken: text('plex_token'),                    // Encrypted
  jellyfinId: text('jellyfin_id'),
  embyId: text('emby_id'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by'),

}, (table) => ({
  usernameIdx: uniqueIndex('user_username_idx').on(table.username),
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  statusIdx: index('user_status_idx').on(table.status),
}));

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  roles: many(userRole),
  permissions: many(userPermission),
  apiKeys: many(apiKey),
  requests: many(request),
  watchlists: many(watchlist),
  auditLogs: many(auditLog),
}));
```

### Session Table (Lucia Auth)

```typescript
// backend/src/db/schema/session.schema.ts

import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';

export const session = pgTable('session', {
  id: text('id').primaryKey(),

  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  // Session metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').notNull().defaultNow(),

}, (table) => ({
  userIdIdx: index('session_user_id_idx').on(table.userId),
  expiresAtIdx: index('session_expires_at_idx').on(table.expiresAt),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));
```

### Role & Permission Tables

```typescript
// backend/src/db/schema/role.schema.ts

import { boolean, index, integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const role = pgTable('role', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),

  isSystem: boolean('is_system').notNull().default(false),
  priority: integer('priority').notNull().default(0),
  color: text('color').default('#6b7280'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const permission = pgTable('permission', {
  id: serial('id').primaryKey(),

  resource: text('resource').notNull(),           // e.g., 'series', 'queue'
  action: text('action').notNull(),               // e.g., 'read', 'create'
  name: text('name').notNull().unique(),          // e.g., 'series:read'
  description: text('description'),

  isSystem: boolean('is_system').notNull().default(true),

  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  resourceActionIdx: index('permission_resource_action_idx').on(table.resource, table.action),
}));

// Junction tables
export const userRole = pgTable('user_role', {
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  grantedBy: integer('granted_by'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));

export const rolePermission = pgTable('role_permission', {
  roleId: integer('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permission.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

export const userPermission = pgTable('user_permission', {
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permission.id, { onDelete: 'cascade' }),
  granted: boolean('granted').notNull().default(true),  // Can be false to deny
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  grantedBy: integer('granted_by'),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.permissionId] }),
}));
```

### API Key Table

```typescript
// backend/src/db/schema/apiKey.schema.ts

import { boolean, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';

export const apiKey = pgTable('api_key', {
  id: serial('id').primaryKey(),

  userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),              // Hashed API key
  keyPrefix: text('key_prefix').notNull(),          // First 8 chars for identification

  // Permissions (if different from user)
  permissions: text('permissions').array(),

  // Restrictions
  ipWhitelist: text('ip_whitelist').array(),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Usage
  lastUsedAt: timestamp('last_used_at'),
  usageCount: integer('usage_count').default(0),

  // Expiration
  expiresAt: timestamp('expires_at'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),

}, (table) => ({
  keyPrefixIdx: index('api_key_key_prefix_idx').on(table.keyPrefix),
  userIdIdx: index('api_key_user_id_idx').on(table.userId),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
}));
```

### Audit Log Table

```typescript
// backend/src/db/schema/auditLog.schema.ts

import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),

  // Who
  userId: integer('user_id').references(() => user.id, { onDelete: 'set null' }),
  username: text('username'),                       // Denormalized for when user deleted

  // What
  action: text('action').notNull(),                 // e.g., 'series:create', 'user:login'
  resource: text('resource'),                       // e.g., 'series', 'user'
  resourceId: integer('resource_id'),               // ID of affected resource

  // Details
  details: jsonb('details').$type<{
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
    metadata?: Record<string, unknown>;
  }>(),

  // Context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Timestamp
  timestamp: timestamp('timestamp').notNull().defaultNow(),

}, (table) => ({
  userIdIdx: index('audit_log_user_id_idx').on(table.userId),
  actionIdx: index('audit_log_action_idx').on(table.action),
  resourceIdx: index('audit_log_resource_idx').on(table.resource, table.resourceId),
  timestampIdx: index('audit_log_timestamp_idx').on(table.timestamp),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
}));
```

---

## Download Pipeline Tables

### Indexer Table

```typescript
// backend/src/db/schema/indexer.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { protocolEnum } from './enums';

export const indexer = pgTable('indexer', {
  id: serial('id').primaryKey(),

  // Basic info
  name: text('name').notNull(),
  implementation: text('implementation').notNull(),  // e.g., 'Newznab', 'Torznab'
  configContract: text('config_contract').notNull(), // Config schema name

  // Protocol
  protocol: protocolEnum('protocol').notNull(),

  // Status
  enabled: boolean('enabled').notNull().default(true),

  // Priority
  priority: integer('priority').notNull().default(25),

  // Download client
  downloadClientId: integer('download_client_id'),

  // Tags
  tags: jsonb('tags').$type<number[]>().default([]),

  // Configuration (encrypted sensitive fields)
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull(),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const indexerStatus = pgTable('indexer_status', {
  id: serial('id').primaryKey(),

  indexerId: integer('indexer_id').notNull().references(() => indexer.id, { onDelete: 'cascade' }),

  // Status tracking
  initialFailure: timestamp('initial_failure'),
  mostRecentFailure: timestamp('most_recent_failure'),
  escalationLevel: integer('escalation_level').default(0),
  disabledTill: timestamp('disabled_till'),

  // Last RSS sync
  lastRssSyncTime: timestamp('last_rss_sync_time'),
  lastRssReleaseInfo: text('last_rss_release_info'),

}, (table) => ({
  indexerIdIdx: index('indexer_status_indexer_id_idx').on(table.indexerId),
}));
```

### Download Client Table

```typescript
// backend/src/db/schema/downloadClient.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { protocolEnum } from './enums';

export const downloadClient = pgTable('download_client', {
  id: serial('id').primaryKey(),

  // Basic info
  name: text('name').notNull(),
  implementation: text('implementation').notNull(),  // e.g., 'QBittorrent', 'SABnzbd'
  configContract: text('config_contract').notNull(),

  // Protocol
  protocol: protocolEnum('protocol').notNull(),

  // Status
  enabled: boolean('enabled').notNull().default(true),

  // Priority
  priority: integer('priority').notNull().default(1),

  // Behavior
  removeCompletedDownloads: boolean('remove_completed_downloads').notNull().default(true),
  removeFailedDownloads: boolean('remove_failed_downloads').notNull().default(true),

  // Tags
  tags: jsonb('tags').$type<number[]>().default([]),

  // Configuration
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull(),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const downloadClientStatus = pgTable('download_client_status', {
  id: serial('id').primaryKey(),

  downloadClientId: integer('download_client_id').notNull()
    .references(() => downloadClient.id, { onDelete: 'cascade' }),

  // Status
  initialFailure: timestamp('initial_failure'),
  mostRecentFailure: timestamp('most_recent_failure'),
  escalationLevel: integer('escalation_level').default(0),
  disabledTill: timestamp('disabled_till'),

}, (table) => ({
  downloadClientIdIdx: index('download_client_status_download_client_id_idx')
    .on(table.downloadClientId),
}));
```

### Queue Table

```typescript
// backend/src/db/schema/queue.schema.ts

import { bigint, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { queueStatusEnum, trackedDownloadStatusEnum, trackedDownloadStateEnum, protocolEnum } from './enums';
import { series } from './series.schema';
import { episode } from './episode.schema';
import { movie } from './movie.schema';

export const queue = pgTable('queue', {
  id: serial('id').primaryKey(),

  // Media association (one will be set)
  seriesId: integer('series_id').references(() => series.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episode.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').references(() => movie.id, { onDelete: 'cascade' }),

  // Download identification
  downloadId: text('download_id').notNull(),
  downloadClient: text('download_client'),
  downloadClientId: integer('download_client_id'),

  // Release info
  title: text('title').notNull(),
  indexer: text('indexer'),
  indexerId: integer('indexer_id'),
  protocol: protocolEnum('protocol').notNull(),

  // Quality
  quality: jsonb('quality').$type<{
    quality: { id: number; name: string; source: string; resolution: number };
    revision: { version: number; real: number; isRepack: boolean };
  }>().notNull(),

  // Custom formats
  customFormats: jsonb('custom_formats').$type<number[]>().default([]),
  customFormatScore: integer('custom_format_score').default(0),

  // Languages
  languages: jsonb('languages').$type<Array<{ id: number; name: string }>>().default([]),

  // Size
  size: bigint('size', { mode: 'number' }).notNull(),
  sizeleft: bigint('sizeleft', { mode: 'number' }).notNull(),

  // Timing
  added: timestamp('added').notNull().defaultNow(),
  estimatedCompletionTime: timestamp('estimated_completion_time'),
  timeleft: text('timeleft'),

  // Status
  status: queueStatusEnum('status').notNull().default('queued'),
  trackedDownloadStatus: trackedDownloadStatusEnum('tracked_download_status'),
  trackedDownloadState: trackedDownloadStateEnum('tracked_download_state'),

  // Messages/errors
  statusMessages: jsonb('status_messages').$type<Array<{
    title: string;
    messages: string[];
  }>>().default([]),
  errorMessage: text('error_message'),

  // Output path
  outputPath: text('output_path'),

}, (table) => ({
  seriesIdIdx: index('queue_series_id_idx').on(table.seriesId),
  episodeIdIdx: index('queue_episode_id_idx').on(table.episodeId),
  movieIdIdx: index('queue_movie_id_idx').on(table.movieId),
  downloadIdIdx: index('queue_download_id_idx').on(table.downloadId),
  statusIdx: index('queue_status_idx').on(table.status),
}));

export const queueRelations = relations(queue, ({ one }) => ({
  series: one(series, { fields: [queue.seriesId], references: [series.id] }),
  episode: one(episode, { fields: [queue.episodeId], references: [episode.id] }),
  movie: one(movie, { fields: [queue.movieId], references: [movie.id] }),
}));
```

### History Table

```typescript
// backend/src/db/schema/history.schema.ts

import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { historyEventTypeEnum } from './enums';
import { series } from './series.schema';
import { episode } from './episode.schema';
import { movie } from './movie.schema';

export const history = pgTable('history', {
  id: serial('id').primaryKey(),

  // Media association
  seriesId: integer('series_id').references(() => series.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episode.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').references(() => movie.id, { onDelete: 'cascade' }),

  // Event
  eventType: historyEventTypeEnum('event_type').notNull(),

  // Source
  sourceTitle: text('source_title'),

  // Quality
  quality: jsonb('quality').$type<{
    quality: { id: number; name: string; source: string; resolution: number };
    revision: { version: number; real: number; isRepack: boolean };
  }>(),

  // Custom formats
  customFormats: jsonb('custom_formats').$type<number[]>().default([]),
  customFormatScore: integer('custom_format_score').default(0),

  // Languages
  languages: jsonb('languages').$type<Array<{ id: number; name: string }>>().default([]),

  // Download info
  downloadId: text('download_id'),
  indexer: text('indexer'),
  releaseGroup: text('release_group'),

  // Additional data
  data: jsonb('data').$type<Record<string, unknown>>(),

  // Timestamp
  date: timestamp('date').notNull().defaultNow(),

}, (table) => ({
  seriesIdIdx: index('history_series_id_idx').on(table.seriesId),
  episodeIdIdx: index('history_episode_id_idx').on(table.episodeId),
  movieIdIdx: index('history_movie_id_idx').on(table.movieId),
  dateIdx: index('history_date_idx').on(table.date),
  eventTypeIdx: index('history_event_type_idx').on(table.eventType),
  downloadIdIdx: index('history_download_id_idx').on(table.downloadId),
}));

export const historyRelations = relations(history, ({ one }) => ({
  series: one(series, { fields: [history.seriesId], references: [series.id] }),
  episode: one(episode, { fields: [history.episodeId], references: [episode.id] }),
  movie: one(movie, { fields: [history.movieId], references: [movie.id] }),
}));
```

### Blocklist Table

```typescript
// backend/src/db/schema/blocklist.schema.ts

import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { protocolEnum } from './enums';
import { series } from './series.schema';
import { episode } from './episode.schema';
import { movie } from './movie.schema';

export const blocklist = pgTable('blocklist', {
  id: serial('id').primaryKey(),

  // Media association
  seriesId: integer('series_id').references(() => series.id, { onDelete: 'cascade' }),
  episodeIds: jsonb('episode_ids').$type<number[]>().default([]),
  movieId: integer('movie_id').references(() => movie.id, { onDelete: 'cascade' }),

  // Release info
  sourceTitle: text('source_title').notNull(),

  // Quality
  quality: jsonb('quality').$type<{
    quality: { id: number; name: string; source: string; resolution: number };
    revision: { version: number; real: number; isRepack: boolean };
  }>(),

  // Languages
  languages: jsonb('languages').$type<Array<{ id: number; name: string }>>().default([]),

  // Indexer
  indexer: text('indexer'),
  indexerId: integer('indexer_id'),
  protocol: protocolEnum('protocol'),

  // Reason
  message: text('message'),

  // Timestamp
  date: timestamp('date').notNull().defaultNow(),

}, (table) => ({
  seriesIdIdx: index('blocklist_series_id_idx').on(table.seriesId),
  movieIdIdx: index('blocklist_movie_id_idx').on(table.movieId),
  sourceTitleIdx: index('blocklist_source_title_idx').on(table.sourceTitle),
}));

export const blocklistRelations = relations(blocklist, ({ one }) => ({
  series: one(series, { fields: [blocklist.seriesId], references: [series.id] }),
  movie: one(movie, { fields: [blocklist.movieId], references: [movie.id] }),
}));
```

---

## Configuration Tables

### Quality Profile Table

```typescript
// backend/src/db/schema/qualityProfile.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const qualityProfile = pgTable('quality_profile', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),

  // Upgrade settings
  upgradeAllowed: boolean('upgrade_allowed').notNull().default(true),
  cutoff: integer('cutoff').notNull(),
  cutoffFormatScore: integer('cutoff_format_score').default(0),
  minFormatScore: integer('min_format_score').default(0),

  // Quality items (ordered list)
  items: jsonb('items').$type<Array<{
    id?: number;
    name?: string;
    quality?: {
      id: number;
      name: string;
      source: string;
      resolution: number;
    };
    items?: Array<{
      id: number;
      name: string;
      quality: {
        id: number;
        name: string;
        source: string;
        resolution: number;
      };
    }>;
    allowed: boolean;
  }>>().notNull(),

  // Format scores
  formatItems: jsonb('format_items').$type<Array<{
    format: number;
    score: number;
  }>>().default([]),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const qualityProfileRelations = relations(qualityProfile, ({ many }) => ({
  series: many(series),
  movies: many(movie),
}));
```

### Quality Definition Table

```typescript
// backend/src/db/schema/qualityDefinition.schema.ts

import { integer, pgTable, serial, text, real } from 'drizzle-orm/pg-core';
import { qualitySourceEnum } from './enums';

export const qualityDefinition = pgTable('quality_definition', {
  id: serial('id').primaryKey(),

  // Quality identification
  qualityId: integer('quality_id').notNull().unique(),

  // Basic info
  title: text('title').notNull(),
  weight: integer('weight').notNull(),

  // Source and resolution
  source: qualitySourceEnum('source').notNull(),
  resolution: integer('resolution'),

  // Size limits (MB per minute for series, MB total for movies)
  minSize: real('min_size'),
  maxSize: real('max_size'),
  preferredSize: real('preferred_size'),
});
```

### Custom Format Table

```typescript
// backend/src/db/schema/customFormat.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const customFormat = pgTable('custom_format', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),

  // Include in naming
  includeCustomFormatWhenRenaming: boolean('include_custom_format_when_renaming')
    .notNull().default(false),

  // Specifications
  specifications: jsonb('specifications').$type<Array<{
    name: string;
    implementation: string;        // e.g., 'ReleaseTitleSpecification'
    negate: boolean;
    required: boolean;
    fields: Array<{
      name: string;
      value: unknown;
    }>;
  }>>().notNull().default([]),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Delay Profile Table

```typescript
// backend/src/db/schema/delayProfile.schema.ts

import { boolean, integer, jsonb, pgTable, serial, timestamp } from 'drizzle-orm/pg-core';
import { protocolEnum } from './enums';

export const delayProfile = pgTable('delay_profile', {
  id: serial('id').primaryKey(),

  // Enable
  enableUsenet: boolean('enable_usenet').notNull().default(true),
  enableTorrent: boolean('enable_torrent').notNull().default(true),

  // Preferred protocol
  preferredProtocol: protocolEnum('preferred_protocol').notNull().default('usenet'),

  // Delays (minutes)
  usenetDelay: integer('usenet_delay').notNull().default(0),
  torrentDelay: integer('torrent_delay').notNull().default(0),

  // Bypass conditions
  bypassIfHighestQuality: boolean('bypass_if_highest_quality').notNull().default(true),
  bypassIfAboveCustomFormatScore: integer('bypass_if_above_custom_format_score'),

  // Order
  order: integer('order').notNull(),

  // Tags (empty = all)
  tags: jsonb('tags').$type<number[]>().default([]),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Naming Config Table

```typescript
// backend/src/db/schema/namingConfig.schema.ts

import { boolean, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { contentTypeEnum } from './enums';

export const namingConfig = pgTable('naming_config', {
  id: serial('id').primaryKey(),

  // Content type
  contentType: contentTypeEnum('content_type').notNull(),

  // Rename files
  renameEpisodes: boolean('rename_episodes').notNull().default(true),
  renameMovies: boolean('rename_movies').notNull().default(true),

  // Replace illegal characters
  replaceIllegalCharacters: boolean('replace_illegal_characters').notNull().default(true),
  colonReplacementFormat: text('colon_replacement_format').notNull().default('delete'),

  // Series patterns
  standardEpisodeFormat: text('standard_episode_format')
    .default('{Series Title} - S{season:00}E{episode:00} - {Episode Title} {Quality Full}'),
  dailyEpisodeFormat: text('daily_episode_format')
    .default('{Series Title} - {Air-Date} - {Episode Title} {Quality Full}'),
  animeEpisodeFormat: text('anime_episode_format')
    .default('{Series Title} - S{season:00}E{episode:00} - {Episode Title} {Quality Full}'),

  // Multi-episode
  multiEpisodeStyle: text('multi_episode_style').notNull().default('extend'),

  // Season folder
  seasonFolderFormat: text('season_folder_format').default('Season {season:00}'),

  // Series folder
  seriesFolderFormat: text('series_folder_format').default('{Series Title}'),

  // Specials folder
  specialsFolderFormat: text('specials_folder_format').default('Specials'),

  // Movie patterns
  movieFolderFormat: text('movie_folder_format').default('{Movie Title} ({Release Year})'),
  movieFileFormat: text('movie_file_format')
    .default('{Movie Title} ({Release Year}) {Quality Full}'),
});
```

### Root Folder Table

```typescript
// backend/src/db/schema/rootFolder.schema.ts

import { bigint, boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './enums';
import { instance } from './instance.schema';

export const rootFolder = pgTable('root_folder', {
  id: serial('id').primaryKey(),

  // Instance
  instanceId: integer('instance_id').references(() => instance.id, { onDelete: 'cascade' }),

  // Content type
  contentType: contentTypeEnum('content_type').notNull(),

  // Path
  path: text('path').notNull(),

  // Name
  name: text('name'),

  // Default for new media
  defaultMetadataProfileId: integer('default_metadata_profile_id'),
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultTags: text('default_tags').array(),

  // Accessible
  accessible: boolean('accessible').notNull().default(true),

  // Space
  freeSpace: bigint('free_space', { mode: 'number' }),
  totalSpace: bigint('total_space', { mode: 'number' }),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

}, (table) => ({
  pathIdx: uniqueIndex('root_folder_path_idx').on(table.path),
  instanceIdIdx: index('root_folder_instance_id_idx').on(table.instanceId),
}));

export const rootFolderRelations = relations(rootFolder, ({ one }) => ({
  instance: one(instance, {
    fields: [rootFolder.instanceId],
    references: [instance.id],
  }),
}));
```

### Tag Table

```typescript
// backend/src/db/schema/tag.schema.ts

import { pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const tag = pgTable('tag', {
  id: serial('id').primaryKey(),

  label: text('label').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),

}, (table) => ({
  labelIdx: uniqueIndex('tag_label_idx').on(table.label),
}));
```

---

## Integration Tables

### Notification Table

```typescript
// backend/src/db/schema/notification.schema.ts

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const notification = pgTable('notification', {
  id: serial('id').primaryKey(),

  // Basic info
  name: text('name').notNull(),
  implementation: text('implementation').notNull(),  // e.g., 'Discord', 'Email'
  configContract: text('config_contract').notNull(),

  // Events
  onGrab: boolean('on_grab').notNull().default(false),
  onDownload: boolean('on_download').notNull().default(false),
  onUpgrade: boolean('on_upgrade').notNull().default(false),
  onRename: boolean('on_rename').notNull().default(false),
  onSeriesAdd: boolean('on_series_add').notNull().default(false),
  onSeriesDelete: boolean('on_series_delete').notNull().default(false),
  onEpisodeFileDelete: boolean('on_episode_file_delete').notNull().default(false),
  onEpisodeFileDeleteForUpgrade: boolean('on_episode_file_delete_for_upgrade')
    .notNull().default(false),
  onHealthIssue: boolean('on_health_issue').notNull().default(false),
  onHealthRestored: boolean('on_health_restored').notNull().default(false),
  onApplicationUpdate: boolean('on_application_update').notNull().default(false),
  onManualInteractionRequired: boolean('on_manual_interaction_required').notNull().default(false),

  // Include conditions
  includeHealthWarnings: boolean('include_health_warnings').notNull().default(false),

  // Tags
  tags: jsonb('tags').$type<number[]>().default([]),

  // Configuration
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull(),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Import List Table

```typescript
// backend/src/db/schema/importList.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { contentTypeEnum, monitorTypesEnum } from './enums';

export const importList = pgTable('import_list', {
  id: serial('id').primaryKey(),

  // Basic info
  name: text('name').notNull(),
  implementation: text('implementation').notNull(),  // e.g., 'Trakt', 'IMDB'
  configContract: text('config_contract').notNull(),

  // Content type
  contentType: contentTypeEnum('content_type').notNull(),

  // Status
  enabled: boolean('enabled').notNull().default(true),
  enableAuto: boolean('enable_auto').notNull().default(false),

  // Defaults for imported media
  qualityProfileId: integer('quality_profile_id'),
  rootFolderPath: text('root_folder_path'),
  shouldMonitor: monitorTypesEnum('should_monitor').notNull().default('all'),
  shouldSearch: boolean('should_search').notNull().default(true),

  // Tags
  tags: jsonb('tags').$type<number[]>().default([]),

  // Order
  listOrder: integer('list_order').notNull().default(0),

  // Configuration
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull(),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

---

## Discovery & Request Tables

### Request Table

```typescript
// backend/src/db/schema/request.schema.ts

import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum, requestStatusEnum } from './enums';
import { user } from './user.schema';

export const request = pgTable('request', {
  id: serial('id').primaryKey(),

  // Requester
  requestedById: integer('requested_by_id').notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Content type
  contentType: contentTypeEnum('content_type').notNull(),

  // External IDs
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  imdbId: text('imdb_id'),

  // Denormalized info
  title: text('title').notNull(),
  year: integer('year'),
  poster: text('poster'),
  overview: text('overview'),

  // Series-specific
  seasons: jsonb('seasons').$type<Array<{
    seasonNumber: number;
    monitored: boolean;
  }>>(),

  // Status
  status: requestStatusEnum('status').notNull().default('pending'),

  // Approval
  approvedAt: timestamp('approved_at'),
  approvedById: integer('approved_by_id').references(() => user.id, { onDelete: 'set null' }),
  denialReason: text('denial_reason'),

  // Media link (when added)
  mediaId: integer('media_id'),
  instanceId: integer('instance_id'),

  // Preferences
  qualityProfileId: integer('quality_profile_id'),
  rootFolderId: integer('root_folder_id'),

  // Timestamps
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  modifiedAt: timestamp('modified_at').notNull().defaultNow(),

}, (table) => ({
  requestedByIdIdx: index('request_requested_by_id_idx').on(table.requestedById),
  statusIdx: index('request_status_idx').on(table.status),
  contentTypeIdx: index('request_content_type_idx').on(table.contentType),
}));

export const requestRelations = relations(request, ({ one }) => ({
  requestedBy: one(user, {
    fields: [request.requestedById],
    references: [user.id],
    relationName: 'requestedBy',
  }),
  approvedBy: one(user, {
    fields: [request.approvedById],
    references: [user.id],
    relationName: 'approvedBy',
  }),
}));
```

### Watchlist Table

```typescript
// backend/src/db/schema/watchlist.schema.ts

import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum, watchlistTypeEnum } from './enums';
import { user } from './user.schema';

export const watchlist = pgTable('watchlist', {
  id: serial('id').primaryKey(),

  // User
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

  // Content
  contentType: contentTypeEnum('content_type').notNull(),

  // External IDs
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  imdbId: text('imdb_id'),

  // Internal ID if exists
  mediaId: integer('media_id'),

  // Type
  type: watchlistTypeEnum('type').notNull().default('plan_to_watch'),

  // Progress (for series)
  currentSeason: integer('current_season'),
  currentEpisode: integer('current_episode'),

  // User notes
  rating: integer('rating'),                       // 1-10
  notes: text('notes'),

  // Timestamps
  addedAt: timestamp('added_at').notNull().defaultNow(),
  modifiedAt: timestamp('modified_at').notNull().defaultNow(),

}, (table) => ({
  userIdIdx: index('watchlist_user_id_idx').on(table.userId),
  mediaIdIdx: index('watchlist_media_id_idx').on(table.mediaId),
  // Unique per user+media
  userMediaIdx: uniqueIndex('watchlist_user_media_idx').on(table.userId, table.tmdbId, table.tvdbId),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(user, {
    fields: [watchlist.userId],
    references: [user.id],
  }),
}));
```

---

## System Tables

### System Config Table

```typescript
// backend/src/db/schema/config.schema.ts

import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const config = pgTable('config', {
  id: serial('id').primaryKey(),

  key: text('key').notNull().unique(),
  value: jsonb('value'),

  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Command Table

```typescript
// backend/src/db/schema/command.schema.ts

import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { commandStatusEnum, commandPriorityEnum } from './enums';

export const command = pgTable('command', {
  id: serial('id').primaryKey(),

  // Command info
  name: text('name').notNull(),
  body: jsonb('body').$type<Record<string, unknown>>(),

  // Status
  status: commandStatusEnum('status').notNull().default('queued'),
  priority: commandPriorityEnum('priority').notNull().default('normal'),

  // Progress
  message: text('message'),
  progress: integer('progress'),                    // 0-100

  // Results
  result: text('result'),                          // 'completed', 'failed', etc.

  // Timing
  queued: timestamp('queued').notNull().defaultNow(),
  started: timestamp('started'),
  ended: timestamp('ended'),

  // Trigger info
  trigger: text('trigger'),                        // 'manual', 'scheduled', 'system'
  triggeredBy: integer('triggered_by'),            // User ID if manual

  // Error info
  exception: text('exception'),

}, (table) => ({
  statusIdx: index('command_status_idx').on(table.status),
  nameIdx: index('command_name_idx').on(table.name),
  queuedIdx: index('command_queued_idx').on(table.queued),
}));
```

### Scheduled Task Table

```typescript
// backend/src/db/schema/scheduledTask.schema.ts

import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const scheduledTask = pgTable('scheduled_task', {
  id: serial('id').primaryKey(),

  // Task identification
  name: text('name').notNull().unique(),
  taskName: text('task_name').notNull(),           // Internal task name

  // Schedule (cron expression)
  interval: integer('interval').notNull(),         // Minutes

  // Execution tracking
  lastExecution: timestamp('last_execution'),
  lastStartTime: timestamp('last_start_time'),
  lastDuration: integer('last_duration'),          // Milliseconds

  // Status
  enabled: boolean('enabled').notNull().default(true),
});
```

### Log Table

```typescript
// backend/src/db/schema/log.schema.ts

import { index, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { logLevelEnum } from './enums';

export const log = pgTable('log', {
  id: serial('id').primaryKey(),

  level: logLevelEnum('level').notNull(),
  logger: text('logger'),                          // Logger name/category
  message: text('message').notNull(),

  // Exception info
  exception: text('exception'),
  exceptionType: text('exception_type'),

  // Context
  context: jsonb('context').$type<Record<string, unknown>>(),

  // Timestamp
  timestamp: timestamp('timestamp').notNull().defaultNow(),

}, (table) => ({
  levelIdx: index('log_level_idx').on(table.level),
  timestampIdx: index('log_timestamp_idx').on(table.timestamp),
  loggerIdx: index('log_logger_idx').on(table.logger),
}));
```

### Trash Table (Soft Delete)

```typescript
// backend/src/db/schema/trash.schema.ts

import { index, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { contentTypeEnum } from './enums';

export const trash = pgTable('trash', {
  id: serial('id').primaryKey(),

  // What was deleted
  contentType: contentTypeEnum('content_type').notNull(),
  originalId: integer('original_id').notNull(),

  // Serialized data
  data: jsonb('data').$type<Record<string, unknown>>().notNull(),

  // Who deleted
  deletedBy: integer('deleted_by'),

  // When
  deletedAt: timestamp('deleted_at').notNull().defaultNow(),

  // Auto-cleanup
  expiresAt: timestamp('expires_at'),              // null = never

}, (table) => ({
  contentTypeIdx: index('trash_content_type_idx').on(table.contentType),
  deletedAtIdx: index('trash_deleted_at_idx').on(table.deletedAt),
  expiresAtIdx: index('trash_expires_at_idx').on(table.expiresAt),
}));
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           idkarr Database ERD                            │
└─────────────────────────────────────────────────────────────────────────┘

                                 INSTANCES
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
    ┌─────────┐              ┌─────────┐              ┌─────────────┐
    │ Series  │              │  Movie  │              │ Root Folder │
    └────┬────┘              └────┬────┘              └─────────────┘
         │                        │
    ┌────┴────┐              ┌────┴────┐
    │         │              │         │
    ▼         ▼              ▼         ▼
┌────────┐ ┌─────────┐ ┌───────────┐ ┌──────────────┐
│ Season │ │ Episode │ │Movie File │ │Alternate Title│
└────────┘ └────┬────┘ └───────────┘ └──────────────┘
                │
                ▼
         ┌─────────────┐
         │Episode File │
         └─────────────┘

                        DOWNLOAD PIPELINE
    ┌───────────┐     ┌─────────────────┐     ┌───────────┐
    │  Indexer  │────▶│     Queue       │◀────│ Download  │
    │           │     │                 │     │  Client   │
    └───────────┘     └────────┬────────┘     └───────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ┌──────────┐         ┌───────────┐
              │ History  │         │ Blocklist │
              └──────────┘         └───────────┘

                           USERS & AUTH
    ┌──────────┐     ┌────────────┐     ┌─────────────┐
    │   User   │◀───▶│   Session  │     │   API Key   │
    └────┬─────┘     └────────────┘     └─────────────┘
         │
    ┌────┴────────────────────┐
    │              │          │
    ▼              ▼          ▼
┌─────────┐ ┌────────────┐ ┌───────────┐
│  Role   │ │ Permission │ │ Audit Log │
└─────────┘ └────────────┘ └───────────┘

                       CONFIGURATION
┌─────────────────┐  ┌───────────────┐  ┌──────────────┐
│ Quality Profile │  │ Custom Format │  │Delay Profile │
└─────────────────┘  └───────────────┘  └──────────────┘

┌─────────────────┐  ┌───────────────┐  ┌──────────────┐
│  Naming Config  │  │      Tag      │  │Notification  │
└─────────────────┘  └───────────────┘  └──────────────┘

                    DISCOVERY & REQUESTS
┌──────────────┐     ┌───────────┐     ┌───────────┐
│   Request    │     │ Watchlist │     │  Import   │
│              │     │           │     │   List    │
└──────────────┘     └───────────┘     └───────────┘
```

---

## Indexes Strategy

### Primary Keys
All tables use `serial` auto-incrementing primary keys.

### Foreign Keys
- `ON DELETE CASCADE` for child relationships (episodes → series)
- `ON DELETE SET NULL` for optional relationships (episode → episodeFile)

### Performance Indexes

**High-Frequency Queries:**
```sql
-- Series lookup
CREATE INDEX idx_series_tvdb ON series(tvdb_id);
CREATE INDEX idx_series_title ON series(title);
CREATE INDEX idx_series_clean_title ON series(clean_title);

-- Episode lookup
CREATE INDEX idx_episode_series_season ON episode(series_id, season_number, episode_number);
CREATE INDEX idx_episode_air_date ON episode(air_date);

-- History queries
CREATE INDEX idx_history_date ON history(date DESC);
CREATE INDEX idx_history_series ON history(series_id);

-- Queue monitoring
CREATE INDEX idx_queue_status ON queue(status);
CREATE INDEX idx_queue_download_id ON queue(download_id);
```

**Text Search Indexes:**
```sql
-- For fuzzy search
CREATE INDEX idx_series_title_trgm ON series USING gin(title gin_trgm_ops);
CREATE INDEX idx_movie_title_trgm ON movie USING gin(title gin_trgm_ops);
```

---

## Migration Strategy

### Initial Migration
```sql
-- 0001_initial.sql
-- Create all enums
-- Create all tables with indexes
-- Create default seed data
```

### Migration Workflow
1. Schema changes in Drizzle schema files
2. Generate migration: `bun drizzle-kit generate:pg`
3. Review generated SQL
4. Apply migration: `bun drizzle-kit push:pg`

### Seed Data
```typescript
// db/seed/index.ts
// - Default quality definitions (720p, 1080p, 4K, etc.)
// - Default quality profiles (SD, HD, Ultra-HD)
// - Default languages
// - Default roles and permissions
// - Default naming config
```

---

## Performance Considerations

### Partitioning (Future)
For large installations, consider partitioning:
- `history` by date (monthly partitions)
- `log` by date (weekly partitions)
- `audit_log` by date (monthly partitions)

### Connection Pooling
Use PgBouncer or Drizzle's built-in connection pooling for production.

### Caching Layer
Redis caching for:
- Series metadata
- Quality profiles
- Custom formats
- User sessions

---

*This schema represents the complete database structure for idkarr. All implementations should reference this document as the single source of truth.*
