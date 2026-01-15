# Library Architecture Specification

## Overview

This document defines idkarr's library architecture: **one library per media type**. This simplified approach replaces the traditional multi-instance pattern used by Sonarr/Radarr users and provides a cleaner, more maintainable system.

**Core Principle**: Each media type (TV Series, Movies, Anime, Music) has exactly one library. Quality preferences are handled through profiles, not separate instances or libraries.

**Database**: PostgreSQL 16+
**ORM**: Drizzle ORM v0.32+

---

## Table of Contents

1. [Overview](#overview)
2. [One Library Per Type Philosophy](#one-library-per-type-philosophy)
3. [Four Media Types](#four-media-types)
4. [Why Not Multi-Instance](#why-not-multi-instance)
5. [Root Folders](#root-folders)
6. [Quality Profile Approach](#quality-profile-approach)
7. [Media Type Isolation](#media-type-isolation)
8. [Shared Infrastructure](#shared-infrastructure)
9. [Database Schema](#database-schema)
10. [API Design](#api-design)
11. [Frontend Architecture](#frontend-architecture)
12. [Migration from Multi-Instance](#migration-from-multi-instance)
13. [Configuration Examples](#configuration-examples)
14. [Performance Considerations](#performance-considerations)

---

## One Library Per Type Philosophy

### The Traditional Problem

In the traditional *arr ecosystem, users often run multiple instances:

```
Traditional Setup (Complex):
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Sonarr (TV)    │  │ Sonarr (Anime)  │  │ Sonarr (4K TV)  │
│  Port 8989      │  │ Port 8990       │  │ Port 8991       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐
│ Radarr (Movies) │  │ Radarr (4K)     │
│ Port 7878       │  │ Port 7879       │
└─────────────────┘  └─────────────────┘
```

**Problems with this approach:**
- 5+ separate databases with no shared configuration
- Duplicate indexer, download client, and notification setup
- Higher memory and CPU usage
- Complex reverse proxy configuration
- No unified search or history view
- Manual synchronization of quality profiles

### The idkarr Solution

```
idkarr (Simple):
┌─────────────────────────────────────────────────────────────┐
│                          idkarr                              │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────┐ │
│  │ TV Library  │  │   Movies    │  │   Anime     │  │Music│ │
│  │  (1 type)   │  │  (1 type)   │  │  (1 type)   │  │(1)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────┘ │
│                                                              │
│  Shared: Indexers, Download Clients, Notifications, Users   │
│  Quality: Profiles handle 4K vs 1080p decisions internally  │
└─────────────────────────────────────────────────────────────┘
```

**One library per media type means:**
- TV Series = 1 library (not separate "HD TV" and "4K TV")
- Movies = 1 library (not separate "HD Movies" and "4K Movies")
- Anime = 1 library (first-class type, not a TV sub-instance)
- Music = 1 library

---

## Four Media Types

### TV Series

**Description**: Episodic content organized by show, season, and episode.

**Characteristics:**
- Hierarchical structure: Series → Season → Episode
- Episode numbering: S01E01 format
- Status tracking: Continuing, Ended, Upcoming
- Monitoring levels: Series, Season, or Episode granularity
- Daily show support for date-based episodes (talk shows, news)

**Metadata Sources:**
- Primary: TVDB
- Secondary: TMDB
- Tertiary: IMDB

**Example Structure:**
```
/tv/
├── Breaking Bad/
│   ├── Season 01/
│   │   ├── Breaking Bad - S01E01 - Pilot.mkv
│   │   └── Breaking Bad - S01E02 - Cat's in the Bag.mkv
│   └── Season 02/
│       └── ...
└── Game of Thrones/
    └── ...
```

### Movies

**Description**: Single-item media with release date tracking.

**Characteristics:**
- One file per movie (no seasons/episodes)
- Collection awareness (trilogies, franchises, MCU)
- Multiple release types: Theatrical, Director's Cut, Extended
- Release tracking: In Cinemas, Released, Announced

**Metadata Sources:**
- Primary: TMDB
- Secondary: IMDB

**Example Structure:**
```
/movies/
├── The Dark Knight (2008)/
│   └── The Dark Knight (2008) - Bluray-1080p.mkv
├── Inception (2010)/
│   └── Inception (2010) - Bluray-2160p.mkv
└── Dune (2021)/
    └── Dune (2021) - WEB-DL-1080p.mkv
```

### Anime (First-Class Media Type)

**Description**: Japanese animation with specialized handling for its unique release patterns.

**Why Anime is NOT a TV Sub-Type:**

| Aspect | TV Series | Anime |
|--------|-----------|-------|
| Release Naming | Series.S01E01.1080p.WEB-DL | [Group] Series - 01 [1080p].mkv |
| Episode Numbering | Season-based (S01E01) | Absolute numbering (Episode 01-24) |
| Season Structure | Variable length | Typically 12-13 episode cours |
| Release Groups | Studios, networks | Fansub groups (SubsPlease, Erai-raws) |
| Metadata Source | TVDB primarily | AniList, AniDB, MAL |
| Indexers | General trackers | Anime-specific (Nyaa, AnimeTosho) |
| Quality Parsing | Standard patterns | Group-specific patterns |
| Subtitles | Often hardcoded | Softcoded, multiple tracks |

**Characteristics:**
- Absolute episode numbering alongside S/E format
- Scene numbering for release group variations
- Seasonal awareness (Winter 2026, Spring 2026, etc.)
- Simulcast vs fansub distinction
- OVA, ONA, Special handling as separate items
- Multi-audio track support (Japanese + English dub)

**Metadata Sources:**
- Primary: AniList
- Secondary: AniDB
- Tertiary: MyAnimeList (MAL)
- Cross-reference: TVDB/TMDB mappings

**Example Structure:**
```
/anime/
├── Attack on Titan/
│   ├── Season 01/
│   │   ├── Attack on Titan - S01E01 - To You, in 2000 Years.mkv
│   │   └── Attack on Titan - S01E02 - That Day.mkv
│   └── Specials/
│       └── Attack on Titan - S00E01 - OVA.mkv
└── Demon Slayer/
    └── ...
```

### Music

**Description**: Audio content organized by artist, album, and track.

**Characteristics:**
- Hierarchical: Artist → Album → Track
- Release types: Original, Remaster, Deluxe, Vinyl
- Multi-artist and compilation support
- Audio quality profiles (FLAC, MP3 320, AAC, etc.)

**Metadata Sources:**
- Primary: MusicBrainz

**Example Structure:**
```
/music/
├── Pink Floyd/
│   ├── The Dark Side of the Moon (1973)/
│   │   ├── 01 - Speak to Me.flac
│   │   ├── 02 - Breathe.flac
│   │   └── ...
│   └── Wish You Were Here (1975)/
│       └── ...
└── Radiohead/
    └── ...
```

---

## Why Not Multi-Instance

### The Old Way: Instance Per Use Case

Users traditionally created separate instances for different needs:

```
Old Pattern (What We're Replacing):

"HD TV Instance" (Sonarr #1)
- Root: /media/tv-hd
- Quality: 1080p max
- Users: Everyone

"4K TV Instance" (Sonarr #2)
- Root: /media/tv-4k
- Quality: 4K preferred
- Users: Home theater only

"Anime Instance" (Sonarr #3)
- Root: /media/anime
- Quality: 1080p preferred
- Indexers: Nyaa only

"HD Movies Instance" (Radarr #1)
- Root: /media/movies-hd
- Quality: 1080p max

"4K Movies Instance" (Radarr #2)
- Root: /media/movies-4k
- Quality: 4K preferred
```

### Problems This Created

**1. Configuration Duplication**
```
Each instance needs its own:
├── Indexer configuration (API keys, URLs)
├── Download client setup
├── Notification webhooks
├── Quality definitions
├── Custom format definitions
└── User accounts
```

**2. Resource Waste**
- 5 separate Node.js/C# processes
- 5 separate database connections
- 5 separate background job schedulers
- 5x memory footprint

**3. User Experience Issues**
- No unified search across all media
- No single history view
- Different URLs/ports for each instance
- Can't see "all downloads" in one place

**4. Maintenance Burden**
- Update 5 applications separately
- Backup 5 databases
- Monitor 5 health endpoints

### The idkarr Way: Quality Profiles Handle Everything

```
New Pattern (One Library Per Type):

TV Library (single)
├── Quality Profile: "4K Optimized"
│   └── 4K Bluray > 4K WEB-DL > 1080p Bluray > 1080p WEB-DL
├── Quality Profile: "HD Only"
│   └── 1080p Bluray > 1080p WEB-DL > 720p
└── Each series assigned to a profile

Movies Library (single)
├── Quality Profile: "Reference Quality"
│   └── 4K Remux > 4K Bluray > 4K WEB-DL
├── Quality Profile: "Space Efficient"
│   └── 1080p WEB-DL > 720p WEB-DL
└── Each movie assigned to a profile

Anime Library (single)
├── Quality Profile: "Best Available"
│   └── Bluray-1080p > WEB-DL-1080p > HDTV-1080p
├── Custom Formats: Prefer SubsPlease, Erai-raws
└── Each series assigned appropriately
```

**Key Insight**: The distinction between "4K content" and "HD content" is a quality preference, not a library organizational concern.

---

## Root Folders

### Multiple Storage Locations, One Logical Library

Each library can have multiple root folders for different storage needs:

```typescript
// Example: TV Library with multiple roots
const tvLibrary = {
  mediaType: 'tv',
  rootFolders: [
    {
      path: '/mnt/fast-ssd/tv',
      name: 'SSD Storage',
      defaultQualityProfile: 'reference-quality',
      purpose: 'Actively watching shows',
    },
    {
      path: '/mnt/bulk-hdd/tv',
      name: 'Archive Storage',
      defaultQualityProfile: 'space-efficient',
      purpose: 'Completed series archive',
    },
    {
      path: '/mnt/4k-media/tv',
      name: '4K Storage',
      defaultQualityProfile: '4k-optimized',
      purpose: 'High bitrate 4K content',
    },
  ],
};
```

### Root Folder Configuration

```typescript
interface RootFolder {
  id: number;
  mediaType: MediaType;           // 'tv' | 'movie' | 'anime' | 'music'
  path: string;                   // Filesystem path
  name: string;                   // Display name

  // Defaults for new media added to this root
  defaultQualityProfileId?: number;
  defaultMetadataProfileId?: number;
  defaultTags?: number[];

  // Space tracking
  freeSpace: number;              // Bytes
  totalSpace: number;             // Bytes

  // Status
  accessible: boolean;
  lastScanned?: Date;
}
```

### Use Cases for Multiple Roots

**1. Storage Tiering**
```
Fast SSD: Currently airing shows, frequently accessed
Bulk HDD: Completed series, archives
NAS: Shared family content
```

**2. Quality Separation (Physical)**
```
/media/tv-4k: Large 4K files (HDR, high bitrate)
/media/tv-hd: Standard 1080p content
```
Note: This is about physical storage organization, not separate libraries.

**3. User-Based Organization**
```
/media/tv-family: Shared family shows
/media/tv-personal: Individual user content
```

### Root Folder Selection

When adding new media, users select which root folder to use:

```
Add New Series: "Breaking Bad"
├── Select Root Folder:
│   ○ SSD Storage (/mnt/fast-ssd/tv) - 245 GB free
│   ● Archive Storage (/mnt/bulk-hdd/tv) - 2.1 TB free
│   ○ 4K Storage (/mnt/4k-media/tv) - 890 GB free
├── Quality Profile: [HD Only ▼]
└── [Add Series]
```

---

## Quality Profile Approach

### How Quality Profiles Replace Multi-Instance

Instead of separate "4K Library" and "HD Library", use quality profiles:

```typescript
// Quality Profile: 4K Optimized
const profile4K = {
  name: '4K Optimized',
  cutoff: 'Bluray-2160p',         // Stop upgrading here
  upgradeAllowed: true,

  items: [
    { quality: 'Remux-2160p', allowed: true },
    { quality: 'Bluray-2160p', allowed: true },
    { quality: 'WEB-DL-2160p', allowed: true },
    { quality: 'Bluray-1080p', allowed: true },  // Fallback
    { quality: 'WEB-DL-1080p', allowed: true },  // Fallback
  ],

  formatScores: [
    { format: 'HDR', score: 100 },
    { format: 'DV', score: 150 },
    { format: 'Atmos', score: 50 },
  ],
};

// Quality Profile: Space Efficient
const profileHD = {
  name: 'Space Efficient',
  cutoff: 'WEB-DL-1080p',         // Don't upgrade beyond this
  upgradeAllowed: true,

  items: [
    { quality: 'WEB-DL-1080p', allowed: true },
    { quality: 'HDTV-1080p', allowed: true },
    { quality: 'WEB-DL-720p', allowed: true },
  ],

  // Negative scores for unwanted formats
  formatScores: [
    { format: '4K', score: -500 },      // Actively avoid 4K
    { format: 'Remux', score: -200 },   // Avoid large remuxes
    { format: 'HEVC', score: 50 },      // Prefer efficient codec
  ],
};
```

### Per-Media Profile Assignment

Each media item is assigned a quality profile:

```typescript
// Example: Different profiles for different content
const mediaAssignments = [
  { series: 'Game of Thrones', profile: '4K Optimized' },
  { series: 'The Office', profile: 'Space Efficient' },
  { movie: 'Dune', profile: 'Reference Quality' },
  { movie: 'Comedy Special', profile: 'Standard' },
];
```

### Why This Is Better Than Multi-Instance

**Flexibility:**
- Change a show from HD to 4K by changing its profile
- No need to delete and re-add to different instance
- Bulk profile changes possible

**Simplicity:**
- One place to see all your TV shows
- One search across all content
- One history for all downloads

**Intelligence:**
- Profile can include fallbacks (want 4K, accept 1080p)
- Custom format scoring handles nuance
- Upgrades happen automatically when better releases appear

---

## Media Type Isolation

### Separate Concerns Per Media Type

Each media type has its own isolated configuration for type-specific needs:

```
┌─────────────────────────────────────────────────────────────┐
│                    Media Type: TV                            │
├─────────────────────────────────────────────────────────────┤
│ Metadata Sources    │ TVDB (primary), TMDB (secondary)      │
│ Parsing Rules       │ Standard: S01E01, Daily: YYYY-MM-DD   │
│ Naming Format       │ {Series} - S{season}E{episode}        │
│ Indexer Categories  │ TV-HD, TV-SD, TV-UHD                  │
│ Default Monitoring  │ All future episodes                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Media Type: Anime                          │
├─────────────────────────────────────────────────────────────┤
│ Metadata Sources    │ AniList (primary), AniDB, MAL         │
│ Parsing Rules       │ Absolute: EP01, Group: [SubsPlease]   │
│ Naming Format       │ {Series} - S{season}E{episode}        │
│ Indexer Categories  │ Anime, Anime-HD, Anime-SD             │
│ Default Monitoring  │ All episodes                          │
│ Extra Features      │ Scene numbering, absolute episode #s  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Media Type: Movies                         │
├─────────────────────────────────────────────────────────────┤
│ Metadata Sources    │ TMDB (primary), IMDB (secondary)      │
│ Parsing Rules       │ Title (Year), Edition handling        │
│ Naming Format       │ {Movie Title} ({Year})                │
│ Indexer Categories  │ Movies-HD, Movies-UHD, Movies-3D      │
│ Default Monitoring  │ After physical release                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Media Type: Music                          │
├─────────────────────────────────────────────────────────────┤
│ Metadata Sources    │ MusicBrainz                           │
│ Parsing Rules       │ Artist - Album (Year)                 │
│ Naming Format       │ {Artist}/{Album}/{Track#} - {Title}   │
│ Indexer Categories  │ Audio, Audio-Lossless                 │
│ Default Monitoring  │ All releases                          │
└─────────────────────────────────────────────────────────────┘
```

### Type-Specific Services

```typescript
// Each media type has specialized services

// TV Series Service
class TVSeriesService {
  async search(term: string): Promise<TVDBSearchResult[]>;
  async getEpisodes(seriesId: number): Promise<Episode[]>;
  async parseRelease(title: string): Promise<TVParsedRelease>;
  async matchToEpisode(release: Release, series: Series): Promise<Episode>;
}

// Anime Service
class AnimeService {
  async search(term: string): Promise<AniListSearchResult[]>;
  async getEpisodes(animeId: number): Promise<AnimeEpisode[]>;
  async parseRelease(title: string): Promise<AnimeParsedRelease>;
  async resolveAbsoluteEpisode(episode: number, series: AnimeSeries): Promise<Episode>;
  async mapAniListToTVDB(anilistId: number): Promise<number>;
}

// Movie Service
class MovieService {
  async search(term: string): Promise<TMDBSearchResult[]>;
  async parseRelease(title: string): Promise<MovieParsedRelease>;
  async detectEdition(title: string): Promise<string | null>;
  async getCollection(movieId: number): Promise<Collection>;
}

// Music Service
class MusicService {
  async search(term: string): Promise<MusicBrainzSearchResult[]>;
  async getAlbum(releaseGroupId: string): Promise<Album>;
  async getTracks(albumId: string): Promise<Track[]>;
  async parseRelease(title: string): Promise<MusicParsedRelease>;
}
```

### Indexer Category Mapping

Indexers can be configured per media type:

```typescript
interface IndexerConfig {
  id: number;
  name: string;
  url: string;
  apiKey: string;

  // Per-type enablement
  enabledMediaTypes: {
    tv: boolean;
    anime: boolean;
    movie: boolean;
    music: boolean;
  };

  // Category mappings
  categoryMappings: {
    tv: number[];      // e.g., [5030, 5040, 5045]
    anime: number[];   // e.g., [5070]
    movie: number[];   // e.g., [2000, 2010, 2020]
    music: number[];   // e.g., [3000, 3010]
  };

  // Type-specific priority (lower = searched first)
  priority: {
    tv: number;
    anime: number;
    movie: number;
    music: number;
  };
}
```

---

## Shared Infrastructure

### What's Shared Across All Media Types

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    User System                        │  │
│  │  - Authentication (sessions, API keys)                │  │
│  │  - Authorization (roles, permissions)                 │  │
│  │  - User preferences (theme, language)                 │  │
│  │  - Request system (submit, approve, deny)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Download Clients                    │  │
│  │  - qBittorrent, Transmission (torrent)               │  │
│  │  - SABnzbd, NZBGet (usenet)                          │  │
│  │  - One configuration, used by all media types        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                      Indexers                         │  │
│  │  - Torznab/Newznab compatible                        │  │
│  │  - Per-type category mapping                         │  │
│  │  - Shared rate limiting and health tracking          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Notifications                       │  │
│  │  - Discord, Slack, Email, Telegram, etc.             │  │
│  │  - One setup, notifications for all media types      │  │
│  │  - Configurable: notify for TV only, all types, etc. │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Tags & Profiles                     │  │
│  │  - Tags can span media types or be type-specific     │  │
│  │  - Quality profiles reusable across types            │  │
│  │  - Custom formats applied universally                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                Queue & History                        │  │
│  │  - Unified download queue across all types           │  │
│  │  - Single history view with type filtering           │  │
│  │  - Cross-type statistics and analytics               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Shared Infrastructure

**Single Configuration:**
```yaml
# One download client setup
downloadClients:
  - name: qBittorrent
    type: qBittorrent
    host: localhost
    port: 8080
    # Used by TV, Movies, Anime, Music
```

**Unified Monitoring:**
```
Dashboard View:
├── Queue: 3 TV episodes, 1 movie, 2 anime episodes
├── Recent: 15 items added across all types
├── Upcoming: Calendar shows all media types
└── Health: All indexers and clients status
```

**Consolidated Notifications:**
```
Discord notification:
"[idkarr] New content added:
 - Breaking Bad S05E16 (TV)
 - Dune (2021) (Movie)
 - Attack on Titan S04E28 (Anime)"
```

---

## Database Schema

### Media Type Enum

```typescript
// backend/src/db/schema/enums.ts

import { pgEnum } from 'drizzle-orm/pg-core';

export const mediaTypeEnum = pgEnum('media_type', [
  'tv',      // TV Series
  'movie',   // Movies
  'anime',   // Anime (first-class type)
  'music',   // Music
]);
```

### Unified Media Table

```typescript
// backend/src/db/schema/media.schema.ts

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mediaTypeEnum } from './enums';

export const media = pgTable('media', {
  id: serial('id').primaryKey(),

  // Media Type - the core discriminator
  mediaType: mediaTypeEnum('media_type').notNull(),

  // External IDs (nullable based on type)
  tvdbId: integer('tvdb_id'),              // TV, Anime
  tmdbId: integer('tmdb_id'),              // TV, Movies, Anime
  imdbId: text('imdb_id'),                 // TV, Movies
  anilistId: integer('anilist_id'),        // Anime
  anidbId: integer('anidb_id'),            // Anime
  malId: integer('mal_id'),                // Anime
  musicbrainzId: text('musicbrainz_id'),   // Music

  // Common Fields
  title: text('title').notNull(),
  sortTitle: text('sort_title').notNull(),
  cleanTitle: text('clean_title').notNull(),
  originalTitle: text('original_title'),
  overview: text('overview'),

  // Status
  status: text('status').notNull(),        // Type-specific statuses

  // Year/Date
  year: integer('year'),
  releaseDate: timestamp('release_date'),

  // Configuration
  qualityProfileId: integer('quality_profile_id').notNull(),
  rootFolderPath: text('root_folder_path').notNull(),
  path: text('path').notNull(),

  // Monitoring
  monitored: boolean('monitored').notNull().default(true),

  // Tags
  tags: jsonb('tags').$type<number[]>().default([]),

  // Images
  images: jsonb('images').$type<Array<{
    coverType: 'poster' | 'fanart' | 'banner' | 'logo';
    url: string;
    remoteUrl?: string;
  }>>().default([]),

  // Ratings
  ratings: jsonb('ratings').$type<{
    votes: number;
    value: number;
  }>(),

  // Genres
  genres: jsonb('genres').$type<string[]>().default([]),

  // ========== TV/Anime Specific ==========
  network: text('network'),
  airTime: text('air_time'),
  runtime: integer('runtime'),
  seasonCount: integer('season_count'),
  seasonFolder: boolean('season_folder').default(true),
  seriesType: text('series_type'),         // 'standard', 'daily', 'anime'
  useSceneNumbering: boolean('use_scene_numbering').default(false),

  // ========== Movie Specific ==========
  studio: text('studio'),
  collection: jsonb('collection').$type<{
    tmdbId: number;
    name: string;
  }>(),
  certification: text('certification'),
  youtubeTrailerId: text('youtube_trailer_id'),
  minimumAvailability: text('minimum_availability'),
  hasFile: boolean('has_file').default(false),

  // ========== Anime Specific ==========
  animeType: text('anime_type'),           // 'tv', 'movie', 'ova', 'ona', 'special'
  season: text('anime_season'),            // 'Winter 2026', 'Spring 2026'

  // ========== Music Specific ==========
  artistName: text('artist_name'),
  albumType: text('album_type'),           // 'album', 'ep', 'single', 'compilation'

  // Statistics (denormalized for performance)
  statistics: jsonb('statistics').$type<{
    episodeCount?: number;
    episodeFileCount?: number;
    sizeOnDisk: number;
    percentComplete?: number;
  }>(),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  lastInfoSync: timestamp('last_info_sync'),

  // Soft delete
  deletedAt: timestamp('deleted_at'),

}, (table) => ({
  // Indexes
  mediaTypeIdx: index('media_type_idx').on(table.mediaType),
  titleIdx: index('media_title_idx').on(table.title),
  cleanTitleIdx: index('media_clean_title_idx').on(table.cleanTitle),
  pathIdx: uniqueIndex('media_path_idx').on(table.path),

  // Type-specific unique constraints
  tvdbIdIdx: index('media_tvdb_id_idx').on(table.tvdbId),
  tmdbIdIdx: index('media_tmdb_id_idx').on(table.tmdbId),
  anilistIdIdx: index('media_anilist_id_idx').on(table.anilistId),
}));

export const mediaRelations = relations(media, ({ many }) => ({
  episodes: many(episode),      // TV, Anime
  movieFiles: many(movieFile),  // Movies
  tracks: many(track),          // Music
  history: many(history),
  queueItems: many(queue),
}));
```

### Root Folder Table

```typescript
// backend/src/db/schema/rootFolder.schema.ts

import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { mediaTypeEnum } from './enums';

export const rootFolder = pgTable('root_folder', {
  id: serial('id').primaryKey(),

  // Type binding
  mediaType: mediaTypeEnum('media_type').notNull(),

  // Path info
  path: text('path').notNull(),
  name: text('name'),

  // Defaults for new media
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultMetadataProfileId: integer('default_metadata_profile_id'),
  defaultTags: jsonb('default_tags').$type<number[]>().default([]),

  // Space tracking
  freeSpace: bigint('free_space', { mode: 'number' }),
  totalSpace: bigint('total_space', { mode: 'number' }),

  // Status
  accessible: boolean('accessible').notNull().default(true),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

}, (table) => ({
  pathIdx: uniqueIndex('root_folder_path_idx').on(table.path),
  mediaTypeIdx: index('root_folder_media_type_idx').on(table.mediaType),
}));
```

### Quality Profile Table

```typescript
// backend/src/db/schema/qualityProfile.schema.ts

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core';

export const qualityProfile = pgTable('quality_profile', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),

  // Upgrade settings
  upgradeAllowed: boolean('upgrade_allowed').notNull().default(true),
  cutoff: integer('cutoff').notNull(),
  cutoffFormatScore: integer('cutoff_format_score').default(0),
  minFormatScore: integer('min_format_score').default(0),

  // Quality items (ordered, grouped)
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

  // Custom format scores for this profile
  formatScores: jsonb('format_scores').$type<Array<{
    formatId: number;
    score: number;
  }>>().default([]),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### History Table (Unified)

```typescript
// backend/src/db/schema/history.schema.ts

import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core';
import { mediaTypeEnum } from './enums';

export const historyEventTypeEnum = pgEnum('history_event_type', [
  'grabbed',
  'imported',
  'upgraded',
  'downloadFailed',
  'downloadIgnored',
  'fileDeleted',
  'fileRenamed',
]);

export const history = pgTable('history', {
  id: serial('id').primaryKey(),

  // Media type for filtering
  mediaType: mediaTypeEnum('media_type').notNull(),

  // Reference to media item
  mediaId: integer('media_id').notNull(),

  // Type-specific references
  episodeId: integer('episode_id'),        // TV, Anime
  movieFileId: integer('movie_file_id'),   // Movies
  trackId: integer('track_id'),            // Music

  // Event info
  eventType: historyEventTypeEnum('event_type').notNull(),
  sourceTitle: text('source_title'),

  // Quality info
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
  }>(),

  // Download info
  downloadId: text('download_id'),
  indexer: text('indexer'),
  releaseGroup: text('release_group'),

  // Additional data
  data: jsonb('data').$type<Record<string, unknown>>(),

  // Timestamp
  date: timestamp('date').notNull().defaultNow(),

}, (table) => ({
  mediaTypeIdx: index('history_media_type_idx').on(table.mediaType),
  mediaIdIdx: index('history_media_id_idx').on(table.mediaId),
  dateIdx: index('history_date_idx').on(table.date),
  eventTypeIdx: index('history_event_type_idx').on(table.eventType),
}));
```

### Queue Table (Unified)

```typescript
// backend/src/db/schema/queue.schema.ts

import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core';
import { mediaTypeEnum, protocolEnum, queueStatusEnum } from './enums';

export const queue = pgTable('queue', {
  id: serial('id').primaryKey(),

  // Media type for filtering
  mediaType: mediaTypeEnum('media_type').notNull(),

  // Reference to media item
  mediaId: integer('media_id').notNull(),

  // Type-specific references
  episodeId: integer('episode_id'),        // TV, Anime
  trackId: integer('track_id'),            // Music

  // Download identification
  downloadId: text('download_id').notNull(),
  downloadClient: text('download_client'),

  // Release info
  title: text('title').notNull(),
  indexer: text('indexer'),
  protocol: protocolEnum('protocol').notNull(),

  // Progress
  size: bigint('size', { mode: 'number' }).notNull(),
  sizeleft: bigint('sizeleft', { mode: 'number' }).notNull(),
  timeleft: text('timeleft'),
  estimatedCompletionTime: timestamp('estimated_completion_time'),

  // Status
  status: queueStatusEnum('status').notNull().default('queued'),
  trackedDownloadStatus: text('tracked_download_status'),
  trackedDownloadState: text('tracked_download_state'),
  errorMessage: text('error_message'),

  // Quality
  quality: jsonb('quality').$type<{
    quality: { id: number; name: string; source: string; resolution: number };
    revision: { version: number; real: number; isRepack: boolean };
  }>(),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),

}, (table) => ({
  mediaTypeIdx: index('queue_media_type_idx').on(table.mediaType),
  mediaIdIdx: index('queue_media_id_idx').on(table.mediaId),
  statusIdx: index('queue_status_idx').on(table.status),
  downloadIdIdx: index('queue_download_id_idx').on(table.downloadId),
}));
```

---

## API Design

### Media Endpoints (Type-Filtered)

```typescript
// All media endpoints support type filtering

// GET /api/v1/media - List all media (with type filter)
// Query params: ?mediaType=tv&mediaType=anime (multiple allowed)
// Query params: ?monitored=true&hasFile=false

// GET /api/v1/media/:id - Get single media item

// POST /api/v1/media - Add new media
// Body includes: { mediaType: 'tv' | 'movie' | 'anime' | 'music', ... }

// PUT /api/v1/media/:id - Update media

// DELETE /api/v1/media/:id - Delete media
```

### Type-Specific Endpoints

```typescript
// TV/Anime episode endpoints
// GET /api/v1/media/:id/episodes
// GET /api/v1/media/:id/episodes/:episodeId
// PUT /api/v1/media/:id/episodes/:episodeId/monitor

// Movie file endpoints
// GET /api/v1/media/:id/files
// DELETE /api/v1/media/:id/files/:fileId

// Music track endpoints
// GET /api/v1/media/:id/tracks
```

### Quality Profile Endpoints

```typescript
// GET /api/v1/quality-profiles
// GET /api/v1/quality-profiles/:id
// POST /api/v1/quality-profiles
// PUT /api/v1/quality-profiles/:id
// DELETE /api/v1/quality-profiles/:id
```

### Root Folder Endpoints

```typescript
// GET /api/v1/root-folders
// Query: ?mediaType=tv

// POST /api/v1/root-folders
// Body: { mediaType: 'tv', path: '/media/tv', ... }

// DELETE /api/v1/root-folders/:id
```

### Unified Queue & History

```typescript
// GET /api/v1/queue
// Query: ?mediaType=tv&mediaType=anime (filter by type)

// GET /api/v1/history
// Query: ?mediaType=movie&eventType=imported (filter by type and event)
```

---

## Frontend Architecture

### Navigation Structure

```typescript
// Single library view per type, not multiple instances

const navigation = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'home',
  },
  {
    label: 'TV Series',
    path: '/tv',
    icon: 'tv',
    badge: '143 series',
  },
  {
    label: 'Movies',
    path: '/movies',
    icon: 'film',
    badge: '87 movies',
  },
  {
    label: 'Anime',
    path: '/anime',
    icon: 'sparkles',
    badge: '45 series',
  },
  {
    label: 'Music',
    path: '/music',
    icon: 'music',
    badge: '234 albums',
  },
  { divider: true },
  {
    label: 'Queue',
    path: '/queue',
    icon: 'download',
    badge: '6 items',
  },
  {
    label: 'Calendar',
    path: '/calendar',
    icon: 'calendar',
  },
  {
    label: 'Discovery',
    path: '/discover',
    icon: 'search',
  },
  { divider: true },
  {
    label: 'Settings',
    path: '/settings',
    icon: 'settings',
  },
];
```

### Library View Component

```typescript
// frontend/app/[mediaType]/page.tsx

interface LibraryPageProps {
  params: { mediaType: 'tv' | 'movies' | 'anime' | 'music' };
}

export default function LibraryPage({ params }: LibraryPageProps) {
  const { mediaType } = params;
  const { data: items } = useMedia({ mediaType });

  return (
    <div className="space-y-6">
      <LibraryHeader mediaType={mediaType} />

      <LibraryFilters mediaType={mediaType} />

      <MediaGrid items={items} />
    </div>
  );
}
```

### Unified Queue View

```typescript
// frontend/app/queue/page.tsx

export default function QueuePage() {
  const { data: queue } = useQueue();

  // Group by media type for display
  const grouped = groupBy(queue, 'mediaType');

  return (
    <div className="space-y-6">
      <h1>Download Queue</h1>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({queue.length})</TabsTrigger>
          <TabsTrigger value="tv">TV ({grouped.tv?.length || 0})</TabsTrigger>
          <TabsTrigger value="movie">Movies ({grouped.movie?.length || 0})</TabsTrigger>
          <TabsTrigger value="anime">Anime ({grouped.anime?.length || 0})</TabsTrigger>
          <TabsTrigger value="music">Music ({grouped.music?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <QueueTable items={queue} />
        </TabsContent>
        {/* Type-specific tabs */}
      </Tabs>
    </div>
  );
}
```

---

## Migration from Multi-Instance

### For Sonarr Users

**Before (Multiple Sonarr Instances):**
```
Sonarr TV (port 8989) → /media/tv
Sonarr Anime (port 8990) → /media/anime
Sonarr 4K (port 8991) → /media/tv-4k
```

**After (idkarr):**
```
idkarr TV Library:
├── Root Folder: /media/tv
├── Root Folder: /media/tv-4k
└── Quality profiles handle 4K vs HD

idkarr Anime Library:
└── Root Folder: /media/anime
```

### Migration Steps

**Step 1: Export from Sonarr**
```bash
# No export needed - idkarr scans your existing media
```

**Step 2: Point idkarr to Existing Folders**
```typescript
// Add root folders for each media type
await rootFolderService.create({
  mediaType: 'tv',
  path: '/media/tv',
  name: 'HD TV Storage',
});

await rootFolderService.create({
  mediaType: 'tv',
  path: '/media/tv-4k',
  name: '4K TV Storage',
  defaultQualityProfileId: profile4K.id,
});

await rootFolderService.create({
  mediaType: 'anime',
  path: '/media/anime',
  name: 'Anime Storage',
});
```

**Step 3: Library Scan**
```
idkarr scans folders → Parses filenames → Matches to metadata
→ User confirms/corrects → Files renamed to idkarr format
→ All media now in unified library
```

**Step 4: Recreate Quality Profiles**
```typescript
// Your "4K Instance" becomes a quality profile
const profile4K = {
  name: '4K Optimized',
  items: [
    { quality: 'Remux-2160p', allowed: true },
    { quality: 'Bluray-2160p', allowed: true },
    { quality: 'WEB-DL-2160p', allowed: true },
    { quality: 'Bluray-1080p', allowed: true },
    { quality: 'WEB-DL-1080p', allowed: true },
  ],
  cutoff: qualityIds.Bluray2160p,
};

// Assign to media that was in your 4K instance
await media.update({
  where: { rootFolderPath: '/media/tv-4k' },
  data: { qualityProfileId: profile4K.id },
});
```

**Step 5: Consolidate Configuration**
```typescript
// Indexers, download clients, notifications - configure once
// They now work for all media types
```

### For Radarr Users

Similar process - your separate "HD" and "4K" Radarr instances become:
- One Movies library
- Multiple root folders (if desired)
- Quality profiles for different quality preferences

### Handling Anime Migration

**Key Mapping:**
```
Sonarr Anime Instance → idkarr Anime Library

Changes:
- TVDB IDs mapped to AniList IDs where possible
- Absolute episode numbers preserved
- Scene numbering maintained
- Release group tracking enhanced
```

---

## Configuration Examples

### Example: Home Theater Setup

```yaml
# TV Library
tv:
  rootFolders:
    - path: /media/tv
      name: Main TV Storage
      defaultProfile: hd-optimized

  qualityProfiles:
    - name: hd-optimized
      cutoff: Bluray-1080p
      items:
        - Bluray-1080p
        - WEB-DL-1080p
        - HDTV-1080p

# Movies Library
movies:
  rootFolders:
    - path: /media/movies
      name: Standard Movies
      defaultProfile: hd-optimized
    - path: /media/movies-4k
      name: 4K Movies
      defaultProfile: reference-4k

  qualityProfiles:
    - name: reference-4k
      cutoff: Remux-2160p
      items:
        - Remux-2160p
        - Bluray-2160p
        - WEB-DL-2160p
        - Bluray-1080p  # Fallback

# Anime Library
anime:
  rootFolders:
    - path: /media/anime
      name: Anime Storage
      defaultProfile: anime-quality

  qualityProfiles:
    - name: anime-quality
      cutoff: Bluray-1080p
      items:
        - Bluray-1080p
        - WEB-DL-1080p

  customFormats:
    - name: SubsPlease
      score: 100
    - name: Erai-raws
      score: 75
    - name: HorribleSubs
      score: 50
```

### Example: Space-Constrained Setup

```yaml
# All libraries use space-efficient profiles
sharedProfiles:
  - name: space-efficient
    cutoff: WEB-DL-1080p
    formatScores:
      - format: HEVC
        score: 100
      - format: Remux
        score: -500
      - format: 4K
        score: -300

tv:
  rootFolders:
    - path: /media/tv
      defaultProfile: space-efficient

movies:
  rootFolders:
    - path: /media/movies
      defaultProfile: space-efficient

anime:
  rootFolders:
    - path: /media/anime
      defaultProfile: space-efficient
```

---

## Performance Considerations

### Single Library Benefits

**Query Performance:**
```sql
-- Finding all monitored TV content is simple
SELECT * FROM media
WHERE media_type = 'tv'
AND monitored = true;

-- vs. multi-instance: querying 3 separate databases
```

**Caching Efficiency:**
```
Single Redis instance caches:
├── TV metadata
├── Movie metadata
├── Anime metadata
└── Music metadata

vs. 5 separate Redis instances with duplicate config data
```

**Background Jobs:**
```
One scheduler handles:
├── TV RSS sync
├── Movie release checks
├── Anime simulcast tracking
└── Music release monitoring

vs. 5 separate schedulers competing for resources
```

### Indexing Strategy

```sql
-- Indexes optimized for type-filtered queries
CREATE INDEX media_type_idx ON media(media_type);
CREATE INDEX media_type_monitored_idx ON media(media_type, monitored);
CREATE INDEX media_type_status_idx ON media(media_type, status);

-- Composite indexes for common queries
CREATE INDEX media_type_added_idx ON media(media_type, added DESC);
CREATE INDEX media_type_title_idx ON media(media_type, clean_title);
```

### Resource Comparison

| Metric | Multi-Instance (5 apps) | idkarr (1 app) |
|--------|-------------------------|----------------|
| Memory | ~2.5 GB | ~800 MB |
| Database Connections | 5 pools | 1 pool |
| Redis Connections | 5 | 1 |
| Background Workers | 5 sets | 1 set |
| Port Usage | 5 ports | 1 port |
| Disk (config/cache) | 5x | 1x |

---

## Summary

idkarr's library architecture simplifies media management:

| Aspect | Old (Multi-Instance) | New (One Library Per Type) |
|--------|---------------------|---------------------------|
| **TV Content** | Multiple Sonarr instances | One TV library |
| **Movies** | Multiple Radarr instances | One Movies library |
| **Anime** | Sonarr "anime" instance | First-class Anime library |
| **Music** | Separate Lidarr | One Music library |
| **4K vs HD** | Separate instances | Quality profiles |
| **Configuration** | Duplicate per instance | Shared infrastructure |
| **Resources** | 5x memory, 5x connections | Single process |
| **Maintenance** | 5 apps to update | One app |

**Key Principles:**

1. **One library per media type** - No splitting by quality or purpose
2. **Quality profiles handle preferences** - 4K vs HD is a profile decision
3. **Multiple root folders for storage** - Physical organization separate from logical
4. **Anime is first-class** - Not a TV subcategory
5. **Shared infrastructure** - Configure once, use everywhere
6. **Unified views** - One queue, one history, one search

This architecture delivers the power users need while eliminating the complexity of managing multiple applications.

---

*This specification defines idkarr's library architecture. For database details, see DATABASE_SCHEMA.md. For API specifications, see REST_API.md.*
