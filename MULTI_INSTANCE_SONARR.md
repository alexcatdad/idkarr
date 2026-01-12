# Multi-Instance Sonarr Architecture

---

## Problem Statement

### Current Limitations
- Sonarr v5 supports only a single instance per installation
- Anime releases follow different naming conventions and quality standards
- Anime-specific features (season/episode parsing, language detection, etc.) are compromised in single-instance setups
- Industry standard is running 2 separate instances:
  - **Instance 1**: TV Series (standard releases)
  - **Instance 2**: Anime (anime-specific releases)

### Why Multi-Instance Matters

**Anime vs. TV Series Differences:**

| Aspect | TV Series | Anime |
|--------|-----------|-------|
| Release Naming | Series.S01E01.1080p.WEB-DL | [Group] Series - 01 [1080p].mkv |
| Episode Parsing | S01E01 / 1x01 | EP01 / E01 |
| Season Structure | Season-based | Usually 12-13 episode seasons |
| Language Detection | English primary | Japanese + English subtitles |
| Quality Profiles | Standard Blu-ray/Web | H.265/HEVC preferred |
| Indexers | General NZB/Torrent | Anime-specific indexers (Nyaa, etc.) |
| Monitored Status | Full series monitored | Often individual episodes |
| Metadata Source | TVDB primarily | AniDB + TMDB for images |

**User Experience Issues with Single-Instance:**
1. Inconsistent episode matching (anime releases don't parse correctly)
2. Wrong quality profiles applied to anime releases
3. Anime-specific indexers don't work with TV series instance
4. Duplicate series across two instances (double management)
5. Confusing UI with mixed content

### Industry Standard

Most users run **2 separate Sonarr instances**:
```
┌─────────────────┐      ┌─────────────────┐
│  Sonarr TV      │      │  Sonarr Anime   │
│  (Port 8989)    │      │  (Port 8990)    │
├─────────────────┤      ├─────────────────┤
│ TV Series       │      │ Anime Series    │
│ Standard Indexer│      │ Nyaa, AnimeTosho│
│ TV Series DB    │      │ Anime DB        │
└─────────────────┘      └─────────────────┘
```

**Problems with Current Approach:**
- Separate databases = no data sharing
- Separate download clients = inefficient
- Separate web UI = poor user experience
- Manual syncing of configurations
- Higher resource usage (2x memory, 2x database connections)

---

## Architecture Design

### Multi-Instance Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Shared Infrastructure                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Postgres   │  │    Redis     │  │ BullMQ Queue │       │
│  │   Database   │  │    Cache     │  │   Workers    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│  Instance 1    │  │  Instance 2    │  │ Instance N    │
│  (TV Series)   │  │  (Anime)       │  │ (Optional)    │
├────────────────┤  ├────────────────┤  ├───────────────┤
│ Instance ID:   │  │ Instance ID:   │  │ Instance ID:  │
│   tv-series    │  │   anime        │  │   custom      │
│                │  │                │  │               │
│ Port: 8989     │  │ Port: 8990     │  │ Port: 8991    │
│                │  │                │  │               │
│ TV Series      │  │ Anime Series   │  │ Custom Series │
│ (series)       │  │ (anime)        │  │ (other)       │
│                │  │                │  │               │
│ Shared:        │  │ Shared:        │  │ Shared:       │
│ - Users        │  │ - Users        │  │ - Users       │
│ - Tags         │  │ - Tags         │  │ - Tags        │
│ - Indexers     │  │ - Indexers     │  │ - Indexers    │
│ - Download     │  │ - Download     │  │ - Download    │
│   Clients      │  │   Clients      │  │   Clients     │
│ - Notifications│  │ - Notifications│  │ - Notifs      │
│                │  │                │  │               │
│ Instance-Specific:│ Instance-Specific:│ Instance-Specific:│
│ - Series       │  │ - Anime Series │  │ - Custom Series│
│ - Episodes     │  │ - Anime Eps    │  │ - Custom Eps  │
│ - History      │  │ - Anime History│  │ - History     │
│ - Queue        │  │ - Anime Queue  │  │ - Queue       │
│ - Root Folders │  │ - Anime Roots  │  │ - Roots       │
│ - Quality      │  │ - Anime Q.Prof │  │ - Q.Prof      │
│   Profiles     │  │                │  │               │
│ - Custom       │  │ - Anime Custom │  │ - Custom      │
│   Formats      │  │   Formats      │  │   Formats     │
└────────────────┘  └────────────────┘  └───────────────┘
```

### Key Design Decisions

#### 1. **Shared Infrastructure**
- **Single Database**: PostgreSQL with instance-level isolation
- **Single Redis**: Shared cache with instance-scoped keys
- **Single BullMQ Queue**: Shared queue with instance-specific jobs
- **Shared Download Clients**: All instances can use same download clients
- **Shared Indexers**: All instances can use same indexers

#### 2. **Instance-Level Isolation**
- Each instance has its own `instanceId`
- Series, episodes, history, queue scoped to instance
- Separate root folders, quality profiles, custom formats per instance
- Instance-specific configuration (anime parsing, quality standards)

#### 3. **User Experience**
- **Single Web UI**: Unified interface with instance selection
- **Instance Switcher**: Easy switching between instances
- **Instance Dashboard**: Overview of all instances
- **Cross-Instance Search**: Search across all instances from one place

---

## Database Schema

### Instance Table

```typescript
// backend/db/schema/instance.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const instanceTypeEnum = pgEnum('instance_type', ['tv-series', 'anime', 'custom']);

export const instance = pgTable('instance', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // 'tv-series', 'anime', 'custom'
  displayName: text('display_name').notNull(), // 'TV Series', 'Anime', 'Custom'
  type: instanceTypeEnum('type').notNull().default('tv-series'),
  port: integer('port').notNull().unique(), // 8989, 8990, 8991, etc.
  baseUrl: text('base_url').notNull().default('/'), // '/', '/anime', '/custom'
  enabled: boolean('enabled').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  icon: text('icon'), // 'tv', 'anime', 'custom' (emoji or icon name)
  color: text('color').notNull().default('#3b82f6'), // Hex color for UI
  sortOrder: integer('sort_order').notNull().default(0),
  
  // Configuration (JSONB for flexibility)
  config: jsonb('config').$type<{
    // Anime-specific
    animeEnabled?: boolean;
    animeLanguage?: string; // 'english', 'japanese'
    animeSubtitleLanguage?: string; // 'english', 'none'
    animeUseAniDB?: boolean;
    animeUseTMDB?: boolean;
    animeEpisodePadding?: number; // Episode padding (01 vs 1)
    
    // General
    episodeNamingStandard?: string; // 'scene', 'standard'
    seasonFolderFormat?: string;
    seriesFolderFormat?: string;
    useSeasonZero?: boolean;
    monitoNewSeasons?: boolean;
    monitorRecentSeasons?: number;
    ignoreMissingEpisodes?: boolean;
    
    // Downloading
    downloadPropersAndRepacks?: boolean;
    useHardlinksInsteadOfCopy?: boolean;
    createEmptySeriesFolders?: boolean;
    deleteEmptyFolders?: boolean;
    
    // Metadata
    enableMetadataImages?: boolean;
    enableMetadataXbmc?: boolean;
    enableMetadataEmby?: boolean;
  }>(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const instanceRelations = relations(instance, ({ many }) => ({
  series: many(series),
  episodes: many(episode),
  history: many(history),
  queueItems: many(queue),
  rootFolders: many(rootFolder),
  qualityProfiles: many(qualityProfile),
  customFormats: many(customFormat),
  notificationStatuses: many(notificationStatus),
}));
```

### Instance-Specific Series Table

```typescript
// backend/db/schema/series.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const seriesStatusEnum = pgEnum('series_status', ['continuing', 'ended', 'upcoming', 'deleted']);
export const seriesTypeEnum = pgEnum('series_type', ['standard', 'anime', 'daily', 'anime-daily']);

export const series = pgTable('series', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  // Metadata
  tvdbId: integer('tvdb_id').notNull().unique(),
  tvRageId: integer('tv_rage_id'),
  tvMazeId: integer('tv_maze_id'),
  tmdbId: integer('tmdb_id'),
  aniDbId: integer('ani_db_id'), // Anime-specific
  
  title: text('title').notNull(),
  titleSlug: text('title_slug').notNull().unique(),
  sortTitle: text('sort_title').notNull(),
  status: seriesStatusEnum('status').notNull(),
  ended: boolean('ended').notNull().default(false),
  overview: text('overview'),
  network: text('network'),
  airTime: text('air_time'),
  images: jsonb('images').$type<Array<{
    coverType: string;
    url: string;
  }>>(),
  
  // Season Information
  seasonCount: integer('season_count').notNull().default(0),
  seasonFolder: boolean('season_folder').notNull().default(true),
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
  
  // Configuration
  type: seriesTypeEnum('type').notNull().default('standard'),
  qualityProfileId: integer('quality_profile_id').notNull(),
  languageProfileId: integer('language_profile_id').notNull(),
  seasonFolderFormat: text('season_folder_format'),
  seriesFolderFormat: text('series_folder_format'),
  rootFolderPath: text('root_folder_path').notNull(),
  runtime: integer('runtime').notNull().default(0),
  tvRageId: integer('tv_rage_id'),
  tvMazeId: integer('tv_maze_id'),
  
  // Monitoring
  monitored: boolean('monitored').notNull().default(true),
  useSceneNumbering: boolean('use_scene_numbering').notNull().default(false),
  
  // Anime-specific
  aniDbId: integer('ani_db_id'),
  animeSeriesType: text('anime_series_type'), // 'tv', 'ova', 'movie', 'special', 'ona'
  animeAirDate: timestamp('anime_air_date'),
  animeEpisodeCount: integer('anime_episode_count'),
  
  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),
  genres: jsonb('genres').$type<string[]>(),
  tags: jsonb('tags').$type<number[]>(),
  certification: text('certification'),
  
  // Statistics
  statistics: jsonb('statistics').$type<{
    seasonCount: number;
    episodeCount: number;
    episodeFileCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  }>(),
  
  lastInfoSync: timestamp('last_info_sync'),
  added: timestamp('added').notNull().defaultNow(),
});

export const seriesRelations = relations(series, ({ one, many }) => ({
  instance: one(instance, {
    fields: [series.instanceId],
    references: [instance.id],
  }),
  episodes: many(episode),
  history: many(history),
  queueItems: many(queue),
}));
```

### Instance-Specific Episodes Table

```typescript
// backend/db/schema/episode.schema.ts

import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';
import { series } from './series.schema';

export const episode = pgTable('episode', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  
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
  series: one(series, {
    fields: [episode.seriesId],
    references: [series.id],
  }),
  episodeFile: one(episodeFile, {
    fields: [episode.episodeFileId],
    references: [episodeFile.id],
  }),
}));
```

### Instance-Specific History Table

```typescript
// backend/db/schema/history.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const historyEventTypeEnum = pgEnum('history_event_type', [
  'grabbed',
  'seriesFolderImported',
  'downloadFolderImported',
  'downloadFailed',
  'downloadIgnored',
  'downloadImported',
]);

export const history = pgTable('history', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  // Event Info
  eventType: historyEventTypeEnum('event_type').notNull(),
  seriesId: integer('series_id').notNull(),
  episodeId: integer('episode_id'),
  
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
  quality: jsonb('quality'),
  
  // Metadata
  movieId: integer('movie_id'),
  seriesId: integer('series_id'),
  episodeId: integer('episode_id'),
  
  deleted: boolean('deleted').notNull().default(false),
});

export const historyRelations = relations(history, ({ one }) => ({
  instance: one(instance, {
    fields: [history.instanceId],
    references: [instance.id],
  }),
}));
```

### Instance-Specific Queue Table

```typescript
// backend/db/schema/queue.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

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
  
  // Release Info
  seriesId: integer('series_id').notNull(),
  episodeId: integer('episode_id'),
  
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
  seriesId: integer('series_id'),
  episodeId: integer('episode_id'),
  languages: jsonb('languages').$type<Array<{
    id: number;
    name: string;
  }>>(),
  
  // Remote Series (for added series that haven't imported yet)
  remoteSeries: jsonb('remote_series').$type<{
    title: string;
    tvdbId: number;
    overview: string;
    images: Array<{
      coverType: string;
      url: string;
    }>;
    seasons: Array<{
      seasonNumber: number;
      monitored: boolean;
    }>;
    year: number;
    path: string;
    qualityProfileId: number;
    seasonFolder: boolean;
    monitored: boolean;
    rootFolderPath: string;
    seriesType: string;
    languageProfileId: number;
  }>(),
  
  // Remote Episode
  remoteEpisode: jsonb('remote_episode').$type<{
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    airDate: string;
    airDateUtc: string;
    overview: string;
    hasFile: boolean;
    monitored: boolean;
    absoluteEpisodeNumber: number;
    unverifiedSceneNumbering: boolean;
  }>(),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const queueRelations = relations(queue, ({ one }) => ({
  instance: one(instance, {
    fields: [queue.instanceId],
    references: [instance.id],
  }),
}));
```

### Instance-Specific Root Folders Table

```typescript
// backend/db/schema/rootFolder.schema.ts

import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const rootFolder = pgTable('root_folder', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  path: text('path').notNull(),
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

### Instance-Specific Quality Profiles Table

```typescript
// backend/db/schema/qualityProfile.schema.ts

import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const qualityProfile = pgTable('quality_profile', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  cutoff: integer('cutoff').notNull(),
  items: jsonb('items').notNull().$type<Array<{
    quality: {
      id: number;
      name: string;
      source: string;
      resolution: number;
      modifier: string;
    };
    allowed: boolean;
    name: string;
    id: number;
  }>>(),
  
  minFormatScore: integer('min_format_score').notNull().default(0),
  cutoffFormatScore: integer('cutoff_format_score').notNull().default(0),
  
  upgradeAllowed: boolean('upgrade_allowed').notNull().default(true),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const qualityProfileRelations = relations(qualityProfile, ({ one }) => ({
  instance: one(instance, {
    fields: [qualityProfile.instanceId],
    references: [instance.id],
  }),
}));
```

### Instance-Specific Custom Formats Table

```typescript
// backend/db/schema/customFormat.schema.ts

import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instance } from './instance.schema';

export const customFormat = pgTable('custom_format', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  includeCustomFormatWhenRenaming: boolean('include_custom_format_when_renaming').notNull().default(false),
  specifications: jsonb('specifications').notNull().$type<Array<{
    name: string;
    negation: boolean;
    required: boolean;
    fields: Array<{
      order: number;
      name: string;
      label: string;
      value: string;
      order: number;
      fieldType: string;
    }>;
  }>>(),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const customFormatRelations = relations(customFormat, ({ one }) => ({
  instance: one(instance, {
    fields: [customFormat.instanceId],
    references: [instance.id],
  }),
}));
```

### Shared Tables (No Instance Isolation)

```typescript
// backend/db/schema/user.schema.ts

export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  
  // Configuration
  apiKey: text('api_key').notNull().unique(),
  language: text('language').notNull().default('en'),
  timezone: text('timezone').notNull().default('UTC'),
  
  // UI Settings
  theme: text('theme').notNull().default('dark'),
  uiSettings: jsonb('ui_settings').$type<{
    calendarWeekColumnHeader?: string;
    weekColumnHeader?: string;
    showRelativeDates?: boolean;
    shortDateFormat?: string;
    longDateFormat?: string;
    timeFormat?: string;
    firstDayOfWeek?: number;
  }>(),
  
  // Instance Settings
  defaultInstanceId: integer('default_instance_id').references(() => instance.id),
  instancePreferences: jsonb('instance_preferences').$type<Record<number, {
    pinned?: boolean;
    sortOrder?: number;
    hidden?: boolean;
  }>>(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// backend/db/schema/tag.schema.ts

export const tag = pgTable('tag', {
  id: serial('id').primaryKey(),
  label: text('label').notNull().unique(),
  
  // Metadata
  importLists: jsonb('import_lists').$type<number[]>([]),
  delayProfile: jsonb('delay_profile').$type<{
    order: number;
    usenetDelay: number;
    torrentDelay: number;
    tags: number[];
    preferredProtocol: 'usenet' | 'torrent';
    bypassIfHighestQuality?: boolean;
    bypassIfAboveCustomFormatScore?: number;
  }>(),
  
  notificationTriggers: jsonb('notification_triggers').$type<{
    onGrab?: boolean;
    onDownload?: boolean;
    onUpgrade?: boolean;
    onRename?: boolean;
    onHealthIssue?: boolean;
    onImportComplete?: boolean;
    onManualInteractionRequired?: boolean;
    onApplicationUpdate?: boolean;
    onHealthRestored?: boolean;
  }>(),
  
  added: timestamp('added').notNull().defaultNow(),
});

// backend/db/schema/indexer.schema.ts

export const indexer = pgTable('indexer', {
  id: serial('id').primaryKey(),
  
  // Configuration
  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // 'Torznab', 'Newznab', 'Cardigann', 'Bhd', 'HDSpace', etc.
  settings: jsonb('settings').notNull().$type<Record<string, unknown>>(),
  configContract: text('config_contract').notNull(),
  
  // Capabilities
  capabilities: jsonb('capabilities').$type<{
    categories: Array<{
      id: number;
      name: string;
    }>;
    searchModifiers: Array<{
      name: string;
      value: string;
    }>;
  }>(),
  
  // Metadata
  enable: boolean('enable').notNull().default(true),
  enableRss: boolean('enable_rss').notNull().default(true),
  enableAutomaticSearch: boolean('enable_automatic_search').notNull().default(true),
  enableInteractiveSearch: boolean('enable_interactive_search').notNull().default(true),
  priority: integer('priority').notNull().default(25),
  downloadClientId: integer('download_client_id'),
  tags: jsonb('tags').$type<number[]>([]),
  
  // Anime-specific
  animeEnabled: boolean('anime_enabled').notNull().default(false),
  animePriority: integer('anime_priority').notNull().default(25),
  
  added: timestamp('added').notNull().defaultNow(),
});

// backend/db/schema/downloadClient.schema.ts

export const downloadClient = pgTable('download_client', {
  id: serial('id').primaryKey(),
  
  // Configuration
  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // 'Transmission', 'Deluge', 'qBittorrent', 'Sabnzbd', etc.
  settings: jsonb('settings').notNull().$type<Record<string, unknown>>(),
  configContract: text('config_contract').notNull(),
  
  // Capabilities
  enable: boolean('enable').notNull().default(true),
  priority: integer('priority').notNull().default(1),
  removeCompletedDownloads: boolean('remove_completed_downloads').notNull().default(false),
  removeFailedDownloads: boolean('remove_failed_downloads').notNull().default(false),
  
  // Categories
  categories: jsonb('categories').$type<Array<{
    id: number;
    name: string;
  }>>(),
  
  // Metadata
  added: timestamp('added').notNull().defaultNow(),
});

// backend/db/schema/notification.schema.ts

export const notification = pgTable('notification', {
  id: serial('id').primaryKey(),
  
  // Configuration
  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // 'Discord', 'Slack', 'Email', 'Telegram', etc.
  settings: jsonb('settings').notNull().$type<Record<string, unknown>>(),
  configContract: text('config_contract').notNull(),
  
  // Triggers
  onGrab: boolean('on_grab').notNull().default(false),
  onDownload: boolean('on_download').notNull().default(true),
  onUpgrade: boolean('on_upgrade').notNull().default(true),
  onRename: boolean('on_rename').notNull().default(false),
  onSeriesDelete: boolean('on_series_delete').notNull().default(false),
  onEpisodeFileDelete: boolean('on_episode_file_delete').notNull().default(false),
  onEpisodeFileDeleteForUpgrade: boolean('on_episode_file_delete_for_upgrade').notNull().default(false),
  onImportComplete: boolean('on_import_complete').notNull().default(false),
  onManualInteractionRequired: boolean('on_manual_interaction_required').notNull().default(false),
  onHealthIssue: boolean('on_health_issue').notNull().default(false),
  onApplicationUpdate: boolean('on_application_update').notNull().default(false),
  onHealthRestored: boolean('on_health_restored').notNull().default(false),
  onDownloadFailure: boolean('on_download_failure').notNull().default(false),
  onImportFailure: boolean('on_import_failure').notNull().default(false),
  onReleasePush: boolean('on_release_push').notNull().default(false),
  
  // Filters
  tags: jsonb('tags').$type<number[]>([]),
  
  // Metadata
  enable: boolean('enable').notNull().default(true),
  added: timestamp('added').notNull().defaultNow(),
});
```

---

## API Design

### Instance Selection Strategy

#### 1. **URL-Based Instance Selection** (Primary)

```typescript
// All API routes are prefixed with instanceId
GET /api/v3/instance/:instanceId/series
GET /api/v3/instance/:instanceId/episodes
GET /api/v3/instance/:instanceId/queue

// Shared resources (no instanceId prefix)
GET /api/v3/users
GET /api/v3/tags
GET /api/v3/indexers
GET /api/v3/download-clients
```

#### 2. **Header-Based Instance Selection** (Secondary)

```typescript
// Default instance header (optional)
X-Instance-Id: tv-series

// If header is present, it overrides URL parameter
GET /api/v3/series
Headers: X-Instance-Id: anime

// Equivalent to:
GET /api/v3/instance/anime/series
```

#### 3. **Query Parameter Instance Selection** (Fallback)

```typescript
// Query parameter (lowest priority)
GET /api/v3/series?instanceId=anime

// Priority: URL param > Header > Query param > User default
```

### Instance API Endpoints

```typescript
// backend/api/routes/instance.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { instanceService } from '@/core/instance/services/instance.service';
import { createInstanceSchema, updateInstanceSchema } from '@/core/instance/schemas/instance.schema';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const instanceRoutes = new Hono();

// GET /api/v3/instances - List all instances
instanceRoutes.get('/instances', authMiddleware, async (c) => {
  const instances = await instanceService.getAll();
  return c.json({ data: instances });
});

// GET /api/v3/instances/:id - Get instance by ID
instanceRoutes.get('/instances/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const instance = await instanceService.getById(id);
  if (!instance) {
    return c.json({ error: 'NOT_FOUND', message: 'Instance not found' }, 404);
  }
  return c.json({ data: instance });
});

// POST /api/v3/instances - Create new instance
instanceRoutes.post(
  '/instances',
  authMiddleware,
  validationMiddleware(createInstanceSchema),
  async (c) => {
    const body = c.req.valid('json');
    const instance = await instanceService.create(body);
    return c.json({ data: instance }, 201);
  },
);

// PUT /api/v3/instances/:id - Update instance
instanceRoutes.put(
  '/instances/:id',
  authMiddleware,
  validationMiddleware(updateInstanceSchema),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const instance = await instanceService.update(id, body);
    return c.json({ data: instance });
  },
);

// DELETE /api/v3/instances/:id - Delete instance
instanceRoutes.delete('/instances/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  await instanceService.delete(id);
  return c.json({ success: true });
});

// GET /api/v3/instances/:id/stats - Get instance statistics
instanceRoutes.get('/instances/:id/stats', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const stats = await instanceService.getStats(id);
  return c.json({ data: stats });
});

// GET /api/v3/instances/:id/health - Get instance health
instanceRoutes.get('/instances/:id/health', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const health = await instanceService.getHealth(id);
  return c.json({ data: health });
});

// GET /api/v3/instances/:id/status - Get instance status
instanceRoutes.get('/instances/:id/status', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const status = await instanceService.getStatus(id);
  return c.json({ data: status });
});

// POST /api/v3/instances/:id/restart - Restart instance
instanceRoutes.post('/instances/:id/restart', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  await instanceService.restart(id);
  return c.json({ success: true });
});

// POST /api/v3/instances/:id/stop - Stop instance
instanceRoutes.post('/instances/:id/stop', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  await instanceService.stop(id);
  return c.json({ success: true });
});

// POST /api/v3/instances/:id/start - Start instance
instanceRoutes.post('/instances/:id/start', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  await instanceService.start(id);
  return c.json({ success: true });
});

export default instanceRoutes;
```

### Instance-Aware Series API

```typescript
// backend/api/routes/instance-series.routes.ts

import { Hono } from 'hono';
import { seriesService } from '@/core/series/services/series.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { instanceMiddleware } from '@/middleware/instance.middleware';

const instanceSeriesRoutes = new Hono();

// All routes require instanceMiddleware to set instance context
instanceSeriesRoutes.use('*', instanceMiddleware);

// GET /api/v3/instance/:instanceId/series - List series for instance
instanceSeriesRoutes.get('/series', authMiddleware, async (c) => {
  const instanceId = c.get('instanceId');
  const series = await seriesService.getAll(instanceId);
  return c.json({ data: series });
});

// GET /api/v3/instance/:instanceId/series/:id - Get series by ID
instanceSeriesRoutes.get('/series/:id', authMiddleware, async (c) => {
  const instanceId = c.get('instanceId');
  const id = Number(c.req.param('id'));
  const series = await seriesService.getById(instanceId, id);
  return c.json({ data: series });
});

// POST /api/v3/instance/:instanceId/series - Create series
instanceSeriesRoutes.post('/series', authMiddleware, async (c) => {
  const instanceId = c.get('instanceId');
  const body = await c.req.json();
  const series = await seriesService.create(instanceId, body);
  return c.json({ data: series }, 201);
});

// PUT /api/v3/instance/:instanceId/series/:id - Update series
instanceSeriesRoutes.put('/series/:id', authMiddleware, async (c) => {
  const instanceId = c.get('instanceId');
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const series = await seriesService.update(instanceId, id, body);
  return c.json({ data: series });
});

// DELETE /api/v3/instance/:instanceId/series/:id - Delete series
instanceSeriesRoutes.delete('/series/:id', authMiddleware, async (c) => {
  const instanceId = c.get('instanceId');
  const id = Number(c.req.param('id'));
  await seriesService.delete(instanceId, id);
  return c.json({ success: true });
});

// POST /api/v3/instance/:instanceId/series/lookup - Lookup series
instanceSeriesRoutes.post('/series/lookup', authMiddleware, async (c) => {
  const instanceId = c.get('instanceId');
  const { term } = await c.req.json();
  const results = await seriesService.lookup(instanceId, term);
  return c.json({ data: results });
});

export default instanceSeriesRoutes;
```

### Instance Middleware

```typescript
// backend/middleware/instance.middleware.ts

import { MiddlewareHandler } from 'hono';
import { instanceService } from '@/core/instance/services/instance.service';
import { NotFoundError } from '@/errors/http.error';

export const instanceMiddleware: MiddlewareHandler = async (c, next) => {
  // Get instanceId from URL param, header, or query param
  const urlInstanceId = c.req.param('instanceId');
  const headerInstanceId = c.req.header('X-Instance-Id');
  const queryInstanceId = c.req.query('instanceId');
  const user = c.get('user');
  
  // Priority: URL > Header > Query > User default
  let instanceId = urlInstanceId || headerInstanceId || queryInstanceId;
  
  if (!instanceId && user?.defaultInstanceId) {
    instanceId = String(user.defaultInstanceId);
  }
  
  if (!instanceId) {
    throw new NotFoundError('Instance not found', 'instance', 0);
  }
  
  // Validate instance exists and is enabled
  const instance = await instanceService.getById(Number(instanceId));
  if (!instance) {
    throw new NotFoundError('Instance not found', 'instance', Number(instanceId));
  }
  
  if (!instance.enabled) {
    return c.json({ error: 'INSTANCE_DISABLED', message: 'Instance is disabled' }, 403);
  }
  
  // Set instance context
  c.set('instanceId', Number(instanceId));
  c.set('instance', instance);
  
  await next();
};

export const requireDefaultInstance: MiddlewareHandler = async (c, next) => {
  const instanceId = c.get('instanceId');
  const instance = c.get('instance');
  
  if (!instance?.isDefault) {
    return c.json({ error: 'FORBIDDEN', message: 'This operation requires the default instance' }, 403);
  }
  
  await next();
};
```

### Response Format with Instance Info

```typescript
// All responses include instance metadata
interface InstanceAwareResponse<T> {
  data: T;
  instance: {
    id: number;
    name: string;
    displayName: string;
    type: 'tv-series' | 'anime' | 'custom';
    color: string;
  };
}

// Example response
GET /api/v3/instance/2/series/123

Response:
{
  "data": {
    "id": 123,
    "title": "Attack on Titan",
    "tvdbId": 257855,
    "type": "anime",
    "status": "continuing",
    "monitored": true,
    // ... series data
  },
  "instance": {
    "id": 2,
    "name": "anime",
    "displayName": "Anime",
    "type": "anime",
    "color": "#ef4444"
  }
}
```

---

## Frontend Design

### Instance Selection UI

```typescript
// frontend/components/instance/InstanceSelector.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInstances } from '@/hooks/useInstances';
import { useUser } from '@/hooks/useUser';

export function InstanceSelector() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: instances } = useInstances();
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(
    user?.defaultInstanceId || null,
  );
  
  useEffect(() => {
    const stored = localStorage.getItem('selectedInstanceId');
    if (stored) {
      setSelectedInstanceId(Number(stored));
    }
  }, []);
  
  const handleInstanceChange = (instanceId: string) => {
    const id = Number(instanceId);
    setSelectedInstanceId(id);
    localStorage.setItem('selectedInstanceId', String(id));
    
    // Navigate to instance-specific route
    const instance = instances?.find((i) => i.id === id);
    if (instance) {
      router.push(`/${instance.name}`);
    }
  };
  
  return (
    <Select value={String(selectedInstanceId)} onValueChange={handleInstanceChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select instance..." />
      </SelectTrigger>
      <SelectContent>
        {instances?.map((instance) => (
          <SelectItem key={instance.id} value={String(instance.id)}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{instance.icon}</span>
              <span>{instance.displayName}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Instance Dashboard

```typescript
// frontend/app/[instance]/dashboard/page.tsx

'use client';

import { useInstanceDashboard } from '@/hooks/useInstanceDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InstanceDashboardPage({ params }: { params: { instance: string } }) {
  const { data: dashboard } = useInstanceDashboard(params.instance);
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Series</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.seriesCount || 0}</div>
            <div className="text-sm text-muted-foreground">
              {dashboard?.monitoredSeriesCount || 0} monitored
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Episodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.episodeCount || 0}</div>
            <div className="text-sm text-muted-foreground">
              {dashboard?.missingEpisodeCount || 0} missing
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.queueCount || 0}</div>
            <div className="text-sm text-muted-foreground">
              {dashboard?.queueSize || 0} GB
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.historyCount || 0}</div>
            <div className="text-sm text-muted-foreground">
              {dashboard?.historySize || 0} GB
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* More dashboard widgets */}
    </div>
  );
}
```

### Multi-Instance Dashboard

```typescript
// frontend/app/dashboard/page.tsx

'use client';

import { useInstances } from '@/hooks/useInstances';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { tv, video, plus } from 'lucide-react';

export function MultiInstanceDashboard() {
  const { data: instances } = useInstances();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Instances</h1>
        <Button variant="outline" size="sm">
          <plus className="w-4 h-4 mr-2" />
          Add Instance
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instances?.map((instance) => (
          <Card
            key={instance.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push(`/${instance.name}`)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{instance.icon}</span>
                  {instance.displayName}
                </CardTitle>
                <Badge
                  variant={instance.enabled ? 'default' : 'secondary'}
                  style={{ backgroundColor: instance.color }}
                >
                  {instance.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Series</span>
                  <span className="font-medium">{instance.seriesCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Episodes</span>
                  <span className="font-medium">{instance.episodeCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Queue</span>
                  <span className="font-medium">{instance.queueCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={instance.enabled ? 'default' : 'secondary'}>
                    {instance.enabled ? 'Running' : 'Stopped'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Instance-Awarded API Client

```typescript
// frontend/lib/api/client.ts

import { createFetchClient } from '@/lib/api/fetchClient';
import type { Instance } from '@/types/models/instance';

export const apiClient = createFetchClient({
  baseURL: '/api/v3',
});

export const createInstanceClient = (instanceId: number) => {
  return createFetchClient({
    baseURL: `/api/v3/instance/${instanceId}`,
  });
};

// Example usage in hook
export function useSeries(instanceId: number, id?: number) {
  const instanceClient = createInstanceClient(instanceId);
  
  return useQuery({
    queryKey: ['series', instanceId, id],
    queryFn: () => {
      if (id) {
        return instanceClient.get(`/series/${id}`).then((res) => res.data);
      }
      return instanceClient.get('/series').then((res) => res.data);
    },
    enabled: !!instanceId,
  });
}
```

### Instance Context Provider

```typescript
// frontend/providers/InstanceProvider.tsx

'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Instance } from '@/types/models/instance';

interface InstanceContextType {
  instance: Instance | null;
  setInstance: (instance: Instance) => void;
}

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

export function InstanceProvider({ children }: { children: ReactNode }) {
  const [instance, setInstance] = useState<Instance | null>(() => {
    const stored = localStorage.getItem('selectedInstance');
    return stored ? JSON.parse(stored) : null;
  });
  
  const handleSetInstance = (newInstance: Instance) => {
    setInstance(newInstance);
    localStorage.setItem('selectedInstance', JSON.stringify(newInstance));
  };
  
  return (
    <InstanceContext.Provider value={{ instance, setInstance: handleSetInstance }}>
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  const context = useContext(InstanceContext);
  if (!context) {
    throw new Error('useInstance must be used within InstanceProvider');
  }
  return context;
}
```

---

## Deployment Configuration

### Docker Compose Multi-Instance

```yaml
# docker-compose.yml

version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: sonarr-postgres
    environment:
      POSTGRES_USER: sonarr
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: sonarr
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sonarr"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8-alpine
    container_name: sonarr-redis
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Shared backend worker
  backend-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sonarr-backend-worker
    command: bun run workers:all
    environment:
      DATABASE_URL: postgresql://sonarr:${POSTGRES_PASSWORD}@postgres:5432/sonarr
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # TV Series Instance
  instance-tv:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sonarr-tv
    command: bun run start:instance --instance=tv-series --port=8989
    environment:
      DATABASE_URL: postgresql://sonarr:${POSTGRES_PASSWORD}@postgres:5432/sonarr
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      INSTANCE_NAME: tv-series
      INSTANCE_PORT: 8989
      INSTANCE_TYPE: tv-series
    ports:
      - "8989:8989"
    volumes:
      - ./config/tv:/config
      - ./data/tv:/data
      - ./downloads:/downloads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      backend-worker:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8989/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Anime Instance
  instance-anime:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sonarr-anime
    command: bun run start:instance --instance=anime --port=8990
    environment:
      DATABASE_URL: postgresql://sonarr:${POSTGRES_PASSWORD}@postgres:5432/sonarr
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      INSTANCE_NAME: anime
      INSTANCE_PORT: 8990
      INSTANCE_TYPE: anime
    ports:
      - "8990:8990"
    volumes:
      - ./config/anime:/config
      - ./data/anime:/data
      - ./downloads:/downloads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      backend-worker:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8990/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Custom Instance (Optional)
  instance-custom:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sonarr-custom
    command: bun run start:instance --instance=custom --port=8991
    environment:
      DATABASE_URL: postgresql://sonarr:${POSTGRES_PASSWORD}@postgres:5432/sonarr
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
      INSTANCE_NAME: custom
      INSTANCE_PORT: 8991
      INSTANCE_TYPE: custom
    ports:
      - "8991:8991"
    volumes:
      - ./config/custom:/config
      - ./data/custom:/data
      - ./downloads:/downloads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      backend-worker:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8991/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Reverse Proxy (Caddy)
  caddy:
    image: caddy:2-alpine
    container_name: sonarr-caddy
    command: caddy run --config /etc/caddy/Caddyfile
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - instance-tv
      - instance-anime
      - instance-custom
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
  caddy-data:
  caddy-config:
```

### Caddyfile Reverse Proxy Configuration

```caddyfile
# caddy/Caddyfile

sonarr.local {
    # TV Series Instance
    handle /tv* {
        reverse_proxy instance-tv:8989
    }

    # Anime Instance
    handle /anime* {
        reverse_proxy instance-anime:8990
    }

    # Custom Instance
    handle /custom* {
        reverse_proxy instance-custom:8991
    }

    # Default to TV Series
    handle /* {
        reverse_proxy instance-tv:8989
    }
}

# Example with SSL (Let's Encrypt)
sonarr.example.com {
    handle /tv* {
        reverse_proxy instance-tv:8989
    }

    handle /anime* {
        reverse_proxy instance-anime:8990
    }

    handle /custom* {
        reverse_proxy instance-custom:8991
    }

    handle /* {
        reverse_proxy instance-tv:8989
    }
}
```

### Kubernetes Multi-Instance Deployment

```yaml
# k8s/instances/deployment.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: sonarr-config
data:
  INSTANCE_TV_NAME: "tv-series"
  INSTANCE_TV_PORT: "8989"
  INSTANCE_TV_TYPE: "tv-series"
  INSTANCE_ANIME_NAME: "anime"
  INSTANCE_ANIME_PORT: "8990"
  INSTANCE_ANIME_TYPE: "anime"
---
apiVersion: v1
kind: Secret
metadata:
  name: sonarr-secrets
type: Opaque
stringData:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  REDIS_PASSWORD: ${REDIS_PASSWORD}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-tv
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sonarr-tv
  template:
    metadata:
      labels:
        app: sonarr-tv
        instance: tv-series
    spec:
      containers:
        - name: sonarr
          image: sonarr:latest
          ports:
            - containerPort: 8989
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: sonarr-secrets
                  key: DATABASE_URL
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: sonarr-secrets
                  key: REDIS_URL
            - name: INSTANCE_NAME
              valueFrom:
                configMapKeyRef:
                  name: sonarr-config
                  key: INSTANCE_TV_NAME
            - name: INSTANCE_PORT
              valueFrom:
                configMapKeyRef:
                  name: sonarr-config
                  key: INSTANCE_TV_PORT
            - name: INSTANCE_TYPE
              valueFrom:
                configMapKeyRef:
                  name: sonarr-config
                  key: INSTANCE_TV_TYPE
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8989
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8989
            initialDelaySeconds: 10
            periodSeconds: 5
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /config
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: sonarr-tv-data
        - name: config
          persistentVolumeClaim:
            claimName: sonarr-tv-config
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sonarr-anime
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sonarr-anime
  template:
    metadata:
      labels:
        app: sonarr-anime
        instance: anime
    spec:
      containers:
        - name: sonarr
          image: sonarr:latest
          ports:
            - containerPort: 8990
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: sonarr-secrets
                  key: DATABASE_URL
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: sonarr-secrets
                  key: REDIS_URL
            - name: INSTANCE_NAME
              valueFrom:
                configMapKeyRef:
                  name: sonarr-config
                  key: INSTANCE_ANIME_NAME
            - name: INSTANCE_PORT
              valueFrom:
                configMapKeyRef:
                  name: sonarr-config
                  key: INSTANCE_ANIME_PORT
            - name: INSTANCE_TYPE
              valueFrom:
                configMapKeyRef:
                  name: sonarr-config
                  key: INSTANCE_ANIME_TYPE
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8990
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8990
            initialDelaySeconds: 10
            periodSeconds: 5
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /config
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: sonarr-anime-data
        - name: config
          persistentVolumeClaim:
            claimName: sonarr-anime-config
---
apiVersion: v1
kind: Service
metadata:
  name: sonarr-tv
spec:
  selector:
    app: sonarr-tv
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8989
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: sonarr-anime
spec:
  selector:
    app: sonarr-anime
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8990
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sonarr-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - sonarr.example.com
      secretName: sonarr-tls
  rules:
    - host: sonarr.example.com
      http:
        paths:
          - path: /tv
            pathType: Prefix
            backend:
              service:
                name: sonarr-tv
                port:
                  number: 80
          - path: /anime
            pathType: Prefix
            backend:
              service:
                name: sonarr-anime
                port:
                  number: 80
```

---

## Migration Path

### From Single-Instance to Multi-Instance

#### Phase 1: Database Migration
```sql
-- 1. Add instance table
CREATE TABLE instance (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tv-series',
  port INTEGER NOT NULL UNIQUE,
  base_url TEXT NOT NULL DEFAULT '/',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  config JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Add instanceId to all instance-specific tables
ALTER TABLE series ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE series ADD CONSTRAINT fk_series_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

ALTER TABLE episode ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE episode ADD CONSTRAINT fk_episode_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

ALTER TABLE history ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE history ADD CONSTRAINT fk_history_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

ALTER TABLE queue ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE queue ADD CONSTRAINT fk_queue_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

ALTER TABLE root_folder ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE root_folder ADD CONSTRAINT fk_root_folder_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

ALTER TABLE quality_profile ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE quality_profile ADD CONSTRAINT fk_quality_profile_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

ALTER TABLE custom_format ADD COLUMN instance_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE custom_format ADD CONSTRAINT fk_custom_format_instance 
  FOREIGN KEY (instance_id) REFERENCES instance(id) ON DELETE CASCADE;

-- 3. Create default TV series instance
INSERT INTO instance (name, display_name, type, port, is_default)
VALUES ('tv-series', 'TV Series', 'tv-series', 8989, true);

-- 4. Create indexes for performance
CREATE INDEX idx_series_instance ON series(instance_id);
CREATE INDEX idx_episode_instance ON episode(instance_id);
CREATE INDEX idx_history_instance ON history(instance_id);
CREATE INDEX idx_queue_instance ON queue(instance_id);
```

#### Phase 2: Application Configuration
```typescript
// backend/config/instances.ts

export const DEFAULT_INSTANCES = [
  {
    name: 'tv-series',
    displayName: 'TV Series',
    type: 'tv-series' as const,
    port: 8989,
    baseUrl: '/',
    enabled: true,
    isDefault: true,
    icon: 'tv',
    color: '#3b82f6',
    sortOrder: 0,
    config: {
      episodeNamingStandard: 'scene',
      useSeasonZero: false,
      monitorNewSeasons: true,
    },
  },
  {
    name: 'anime',
    displayName: 'Anime',
    type: 'anime' as const,
    port: 8990,
    baseUrl: '/anime',
    enabled: true,
    isDefault: false,
    icon: 'anime',
    color: '#ef4444',
    sortOrder: 1,
    config: {
      animeEnabled: true,
      animeLanguage: 'english',
      animeUseAniDB: true,
      animeUseTMDB: true,
      animeEpisodePadding: 2,
      episodeNamingStandard: 'standard',
    },
  },
];
```

#### Phase 3: Frontend Migration
```typescript
// frontend/app/page.tsx (migration page)

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MigrationPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if migration is needed
    checkMigrationStatus();
  }, []);
  
  const handleMigrate = async () => {
    await migrateToMultiInstance();
    router.push('/dashboard');
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Multi-Instance Migration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Your current Sonarr installation will be migrated to support multiple instances.
          </p>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Existing data will be moved to:</h3>
              <p className="text-muted-foreground">TV Series Instance (tv-series)</p>
            </div>
            
            <div>
              <h3 className="font-semibold">New instance will be created:</h3>
              <p className="text-muted-foreground">Anime Instance (anime)</p>
            </div>
            
            <div>
              <h3 className="font-semibold">After migration:</h3>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>Existing series will be in TV Series instance</li>
                <li>Anime instance will be empty (ready for anime series)</li>
                <li>You can create additional instances</li>
              </ul>
            </div>
            
            <Button onClick={handleMigrate}>Start Migration</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Expected Outcomes

### User Experience Improvements

**Before (Single-Instance):**
- Mixed anime and TV series in one interface
- Incorrect episode parsing for anime releases
- Wrong quality profiles applied
- Anime-specific indexers don't work
- Duplicate management across multiple installations

**After (Multi-Instance):**
- Separate TV series and anime instances
- Correct episode parsing for each content type
- Appropriate quality profiles per instance
- Anime-specific indexers work correctly
- Single unified UI with easy instance switching
- Shared infrastructure reduces resource usage
- Cross-instance search and management

### Performance Improvements

**Resource Usage:**
- **Before**: 2+ separate installations (2x memory, 2x database connections)
- **After**: Shared infrastructure (1 database, 1 Redis cache, 1 worker pool)

**Query Performance:**
- Instance-scoped queries are faster (smaller result sets)
- Shared caching reduces redundant API calls
- Separate worker pools per instance type

**Storage:**
- Single database instead of multiple
- Shared download clients and indexers
- Efficient data organization

### Developer Benefits

**Simplified Architecture:**
- Single codebase for all instances
- Shared services and utilities
- Consistent API patterns
- Type-safe instance context

**Easier Testing:**
- Instance-specific test suites
- Shared integration tests
- Mock instance providers

**Better Monitoring:**
- Per-instance metrics
- Aggregated dashboards
- Instance health checks

---

## Summary

This multi-instance Sonarr architecture provides:

1. **Proper Content Separation**: TV series and anime have separate configurations
2. **Industry Standard**: Matches how users currently run multiple Sonarr instances
3. **Shared Infrastructure**: Single database, Redis cache, and worker pool
4. **Unified Experience**: Single web UI with instance selection
5. **Easy Migration**: Clear path from single to multi-instance
6. **Scalable**: Support for additional instances (movies, sports, etc.)
7. **Production Ready**: Docker and Kubernetes deployment configurations
8. **Performance Optimized**: Instance-scoped queries, shared caching

The architecture solves the fundamental problem of managing both TV series and anime effectively while providing a unified user experience and shared infrastructure for efficiency.

*End of Multi-Instance Sonarr Architecture Documentation*
