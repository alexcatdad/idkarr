# Anime Specification

## Overview

Anime is a **first-class media type** in idkarr, not a subcategory of TV series. This design decision reflects the fundamental differences in how anime is produced, distributed, numbered, and consumed compared to Western television.

### Why Anime Needs First-Class Support

**Production and Distribution Model**
- Anime follows seasonal release schedules (Winter, Spring, Summer, Fall)
- Episodes typically air weekly during a season (12-13 or 24-26 episode cours)
- BD/DVD releases occur months after TV broadcast with significant improvements
- OVAs, ONAs, and specials are integral parts of series, not afterthoughts

**Numbering Systems**
- Absolute episode numbering is the primary system (Episode 1-1000+)
- Season/episode format is often artificial and varies by region
- Scene releases and official numbering frequently conflict
- Long-running series may have multiple valid numbering schemes

**File Naming Conventions**
- `[Group]` prefix is standard (fansubs, raw providers)
- CRC32 hashes verify file integrity
- Version tags (v2, v3) indicate corrected releases
- Dual audio and subtitle track details are common

**Metadata Ecosystem**
- AniList, AniDB, and MyAnimeList are primary sources
- TVDB/TMDB mappings are often incomplete or incorrect
- Japanese title variants are essential for matching

---

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Metadata Providers](#metadata-providers)
4. [Anime-Specific Parsing](#anime-specific-parsing)
5. [Seasonal Tracking](#seasonal-tracking)
6. [Release Groups](#release-groups)
7. [Quality Considerations](#quality-considerations)
8. [Simulcast Support](#simulcast-support)
9. [Scene Numbering](#scene-numbering)
10. [Folder Structure](#folder-structure)
11. [Integration with idkarr](#integration-with-idkarr)

---

## Data Model

### Core Anime Series Interface

```typescript
interface AnimeSeries {
  // Primary Identification
  id: string;                           // Internal UUID
  title: AnimeTitle;
  alternativeTitles: AnimeTitle[];

  // External IDs
  anilistId?: number;
  anidbId?: number;
  malId?: number;
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;

  // Classification
  mediaType: 'anime';                   // Always 'anime' - first-class type
  format: AnimeFormat;
  status: AnimeStatus;

  // Airing Information
  seasonYear?: number;
  season?: AnimeSeason;
  startDate?: AnimeDate;
  endDate?: AnimeDate;
  nextAiringEpisode?: AiringSchedule;

  // Episode Information
  episodes?: number;                    // Total expected episodes
  episodeDuration?: number;             // Average duration in minutes

  // Production
  studios: Studio[];
  source: AnimeSourceMaterial;

  // Content Classification
  genres: string[];
  tags: AnimeTag[];
  isAdult: boolean;

  // Metadata
  description?: string;
  coverImage: AnimeCoverImage;
  bannerImage?: string;

  // Statistics
  averageScore?: number;
  popularity?: number;
  favourites?: number;

  // Relations
  relations: AnimeRelation[];

  // User Data
  monitored: boolean;
  qualityProfileId: number;
  rootFolderPath: string;
  path: string;

  // Tracking
  added: Date;
  lastInfoSync?: Date;
}

interface AnimeTitle {
  romaji?: string;                      // Shingeki no Kyojin
  english?: string;                     // Attack on Titan
  native?: string;                      // 進撃の巨人
  userPreferred?: string;               // User's preferred title format
}

type AnimeFormat =
  | 'TV'                                // Standard TV series
  | 'TV_SHORT'                          // Short-form TV (< 15 min episodes)
  | 'MOVIE'                             // Theatrical release
  | 'SPECIAL'                           // TV specials
  | 'OVA'                               // Original Video Animation
  | 'ONA'                               // Original Net Animation
  | 'MUSIC'                             // Music videos
  | 'MANGA'                             // For adaptation tracking only
  | 'NOVEL';                            // For adaptation tracking only

type AnimeStatus =
  | 'FINISHED'                          // Completed airing
  | 'RELEASING'                         // Currently airing
  | 'NOT_YET_RELEASED'                  // Announced but not started
  | 'CANCELLED'                         // Cancelled production
  | 'HIATUS';                           // On indefinite break

type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

type AnimeSourceMaterial =
  | 'ORIGINAL'                          // Anime original
  | 'MANGA'
  | 'LIGHT_NOVEL'
  | 'VISUAL_NOVEL'
  | 'VIDEO_GAME'
  | 'OTHER'
  | 'NOVEL'
  | 'DOUJINSHI'
  | 'ANIME'                             // Spin-off/sequel
  | 'WEB_NOVEL'
  | 'LIVE_ACTION'
  | 'GAME'
  | 'COMIC'
  | 'MULTIMEDIA_PROJECT'
  | 'PICTURE_BOOK';
```

### Episode Structure

```typescript
interface AnimeEpisode {
  // Identification
  id: string;
  seriesId: string;

  // Numbering - Multiple systems supported
  absoluteNumber: number;               // Primary: Episode 847
  seasonNumber?: number;                // Optional: Season 21
  episodeNumber?: number;               // Optional: Episode 15

  // Scene numbering (when different from official)
  sceneAbsoluteNumber?: number;
  sceneSeasonNumber?: number;
  sceneEpisodeNumber?: number;

  // AniDB-specific numbering
  anidbEpisodeNumber?: string;          // Can include letters: "S1", "C1"

  // Episode Information
  title?: EpisodeTitle;
  overview?: string;
  airDate?: Date;
  airDateUtc?: Date;
  runtime?: number;                     // Minutes

  // Content
  finaleType?: 'season' | 'series' | 'midseason';

  // File Information
  hasFile: boolean;
  episodeFile?: AnimeEpisodeFile;

  // Monitoring
  monitored: boolean;

  // Air status
  unverifiedSceneNumbering: boolean;
}

interface EpisodeTitle {
  japanese?: string;
  romaji?: string;
  english?: string;
}

interface AnimeEpisodeFile {
  id: string;
  relativePath: string;
  path: string;
  size: number;

  // Quality
  quality: QualityModel;

  // Media Info
  mediaInfo: AnimeMediaInfo;

  // Release Information
  releaseGroup?: string;
  releaseType: 'simulcast' | 'fansub' | 'bluray' | 'dvd' | 'raw';

  // Version tracking
  version: number;                      // v1, v2, v3, etc.
  isProper: boolean;
  isRepack: boolean;

  // Verification
  crc32?: string;

  // Audio/Subtitle
  audioLanguages: string[];
  subtitleLanguages: string[];
  isDualAudio: boolean;

  // Timestamps
  dateAdded: Date;
}

interface AnimeMediaInfo {
  videoCodec: string;
  videoBitDepth: number;                // 8 or 10-bit
  videoColourPrimaries?: string;
  videoTransferCharacteristics?: string;

  audioCodec: string;
  audioChannels: string;
  audioLanguages: string[];

  subtitles: SubtitleTrack[];

  runTime: string;
  scanType: 'Progressive' | 'Interlaced';

  resolution: string;
  width: number;
  height: number;
}

interface SubtitleTrack {
  language: string;
  languageCode: string;
  format: 'ASS' | 'SRT' | 'PGS' | 'VOBSUB' | 'Unknown';
  isForced: boolean;
  isDefault: boolean;
  title?: string;                       // Often contains fansub group name
}
```

### Special Episode Types

```typescript
interface AnimeSpecialEpisode extends AnimeEpisode {
  specialType: AnimeSpecialType;
  parentEpisode?: number;               // For recap/summary episodes
}

type AnimeSpecialType =
  | 'SPECIAL'                           // General special episode
  | 'OVA'                               // Original Video Animation
  | 'ONA'                               // Original Net Animation
  | 'RECAP'                             // Recap/Summary episode
  | 'PREVIEW'                           // Preview for next season
  | 'PROMO'                             // Promotional content
  | 'MOVIE'                             // Associated movie
  | 'SIDE_STORY'                        // Side story content
  | 'PICTURE_DRAMA';                    // Audio drama with images

// AniDB-style episode numbering
type AniDBEpisodeType =
  | 'regular'                           // Normal episodes (1, 2, 3...)
  | 'special'                           // Specials (S1, S2, S3...)
  | 'credit'                            // Credit sequences (C1, C2...)
  | 'trailer'                           // Trailers (T1, T2...)
  | 'parody'                            // Parodies (P1, P2...)
  | 'other';                            // Other (O1, O2...)
```

### Anime Relations

```typescript
interface AnimeRelation {
  relationId: string;
  relationType: AnimeRelationType;
  targetSeriesId: string;
  targetTitle: AnimeTitle;
  targetFormat: AnimeFormat;
}

type AnimeRelationType =
  | 'SEQUEL'                            // Direct continuation
  | 'PREQUEL'                           // Preceding story
  | 'PARENT'                            // Main series for spin-off
  | 'SIDE_STORY'                        // Related side content
  | 'SPIN_OFF'                          // Spin-off series
  | 'ALTERNATIVE'                       // Alternative version/retelling
  | 'CHARACTER'                         // Shared characters
  | 'SUMMARY'                           // Recap/compilation
  | 'FULL_STORY'                        // Full version of summary
  | 'ADAPTATION'                        // Source material adaptation
  | 'OTHER';                            // Other relation
```

### Watch Order Configuration

```typescript
interface AnimeWatchOrder {
  seriesId: string;
  entries: WatchOrderEntry[];
  source: 'manual' | 'anilist' | 'mal' | 'community';
  lastUpdated: Date;
}

interface WatchOrderEntry {
  order: number;
  type: 'series' | 'movie' | 'ova' | 'special';
  seriesId: string;
  title: string;
  episodeRange?: { start: number; end: number };
  isOptional: boolean;
  note?: string;                        // "Watch after episode 24"
}
```

---

## Metadata Providers

### Provider Priority

idkarr uses a hierarchical approach to anime metadata:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Primary Provider                              │
│                          AniList API                                 │
│  - Rich metadata, modern API, good mapping support                   │
│  - Primary source for titles, descriptions, relations                │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Episode Data Provider                           │
│                         AniDB (via HTTP)                             │
│  - Definitive episode information                                    │
│  - Absolute numbering authority                                      │
│  - Special episode classification                                    │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Community Provider                             │
│                        MyAnimeList API                               │
│  - User statistics, scoring                                          │
│  - Watch order recommendations                                       │
│  - Community tagging                                                 │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Mapping Provider                               │
│                    TMDB/TVDB (via mapping)                           │
│  - Cross-platform compatibility                                      │
│  - Plex/Emby/Jellyfin integration                                   │
│  - Season/Episode mapping                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### AniList Integration

```typescript
interface AniListConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;

  // Rate limiting
  requestsPerMinute: number;            // Default: 90

  // Preferences
  preferredTitleLanguage: 'romaji' | 'english' | 'native';

  // Sync settings
  syncUserLists: boolean;
  updateProgress: boolean;
}

interface AniListSeries {
  id: number;
  idMal?: number;

  title: {
    romaji?: string;
    english?: string;
    native?: string;
    userPreferred?: string;
  };

  type: 'ANIME' | 'MANGA';
  format: AnimeFormat;
  status: AnimeStatus;

  description?: string;

  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number; month?: number; day?: number };

  season?: AnimeSeason;
  seasonYear?: number;
  seasonInt?: number;

  episodes?: number;
  duration?: number;

  countryOfOrigin?: string;
  isLicensed?: boolean;
  source?: AnimeSourceMaterial;

  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
    color?: string;
  };

  bannerImage?: string;

  genres?: string[];
  tags?: Array<{
    id: number;
    name: string;
    description?: string;
    category?: string;
    rank?: number;
    isGeneralSpoiler: boolean;
    isMediaSpoiler: boolean;
    isAdult: boolean;
  }>;

  relations?: {
    edges: Array<{
      relationType: AnimeRelationType;
      node: {
        id: number;
        title: { romaji?: string; english?: string };
        format?: AnimeFormat;
      };
    }>;
  };

  studios?: {
    nodes: Array<{
      id: number;
      name: string;
      isAnimationStudio: boolean;
    }>;
  };

  nextAiringEpisode?: {
    id: number;
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };

  airingSchedule?: {
    nodes: Array<{
      id: number;
      airingAt: number;
      episode: number;
    }>;
  };

  externalLinks?: Array<{
    id: number;
    site: string;
    url: string;
    type: string;
  }>;

  streamingEpisodes?: Array<{
    title?: string;
    thumbnail?: string;
    url?: string;
    site?: string;
  }>;

  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;

  isAdult: boolean;

  siteUrl?: string;
}

// AniList GraphQL Query Example
const ANILIST_SERIES_QUERY = `
query ($id: Int, $search: String) {
  Media(id: $id, search: $search, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
      userPreferred
    }
    format
    status
    description
    startDate { year month day }
    endDate { year month day }
    season
    seasonYear
    episodes
    duration
    countryOfOrigin
    source
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    genres
    tags {
      id
      name
      rank
      isGeneralSpoiler
      isMediaSpoiler
      isAdult
    }
    relations {
      edges {
        relationType
        node {
          id
          title { romaji english }
          format
        }
      }
    }
    studios {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    isAdult
    siteUrl
  }
}
`;
```

### AniDB Integration

```typescript
interface AniDBConfig {
  enabled: boolean;
  username?: string;
  password?: string;

  // API settings
  clientName: string;                   // Registered client name
  clientVersion: number;                // Client version

  // Rate limiting (AniDB is strict)
  requestDelay: number;                 // Minimum 2000ms between requests

  // Cache settings
  cacheExpiry: number;                  // Default: 7 days
}

interface AniDBAnime {
  aid: number;                          // AniDB anime ID

  type: string;                         // "TV Series", "OVA", "Movie", etc.
  episodeCount: number;

  startDate?: string;
  endDate?: string;

  titles: AniDBTitle[];

  description?: string;

  picture?: string;

  ratings?: {
    permanent?: { score: number; count: number };
    temporary?: { score: number; count: number };
    review?: { score: number; count: number };
  };

  categories?: AniDBCategory[];
  tags?: AniDBTag[];

  episodes?: AniDBEpisode[];

  relatedAnime?: AniDBRelation[];

  creators?: AniDBCreator[];

  resources?: AniDBResource[];          // External links
}

interface AniDBTitle {
  title: string;
  type: 'main' | 'official' | 'short' | 'synonym' | 'card';
  language: string;                     // ISO 639-1 code
}

interface AniDBEpisode {
  id: number;
  epno: string;                         // "1", "S1", "C1", "T1", etc.
  type: number;                         // 1=regular, 2=special, 3=credit, etc.
  length?: number;                      // Minutes
  airDate?: string;
  rating?: { score: number; count: number };
  titles: Array<{ title: string; language: string }>;
  summary?: string;
}

interface AniDBCategory {
  id: number;
  name: string;
  weight: number;
  parentId?: number;
}

interface AniDBTag {
  id: number;
  name: string;
  weight: number;
  localSpoiler: boolean;
  globalSpoiler: boolean;
}

interface AniDBRelation {
  aid: number;
  type: string;                         // "Sequel", "Prequel", "Side Story", etc.
  title: string;
}

interface AniDBResource {
  type: string;                         // "ANN", "MAL", "Official", etc.
  url: string;
}
```

### MyAnimeList Integration

```typescript
interface MALConfig {
  enabled: boolean;
  clientId: string;

  // Rate limiting
  requestsPerSecond: number;            // Default: 1

  // User features
  syncUserList: boolean;
  accessToken?: string;
  refreshToken?: string;
}

interface MALAnime {
  id: number;

  title: string;
  alternativeTitles?: {
    synonyms?: string[];
    en?: string;
    ja?: string;
  };

  mainPicture?: {
    medium: string;
    large: string;
  };

  startDate?: string;
  endDate?: string;

  synopsis?: string;

  mean?: number;                        // Score out of 10
  rank?: number;
  popularity?: number;
  numListUsers?: number;
  numScoringUsers?: number;

  nsfw?: 'white' | 'gray' | 'black';

  mediaType: string;
  status: string;

  genres?: Array<{ id: number; name: string }>;

  numEpisodes?: number;

  startSeason?: {
    year: number;
    season: 'winter' | 'spring' | 'summer' | 'fall';
  };

  broadcast?: {
    dayOfTheWeek: string;
    startTime?: string;
  };

  source?: string;
  averageEpisodeDuration?: number;

  rating?: string;                      // "pg_13", "r", etc.

  studios?: Array<{ id: number; name: string }>;

  relatedAnime?: Array<{
    node: { id: number; title: string };
    relationType: string;
    relationTypeFormatted: string;
  }>;
}
```

### TMDB/TVDB Mapping

```typescript
interface AnimeMappingConfig {
  // Mapping sources
  useAniDBMapping: boolean;             // https://github.com/Anime-Lists/anime-lists
  useTMDbMapping: boolean;

  // Fallback behavior
  createMissingMapping: boolean;        // Auto-create when not found

  // Priority
  preferAbsoluteNumbering: boolean;     // Always use absolute when available
}

interface AnimeMapping {
  // Source IDs
  anilistId?: number;
  anidbId?: number;
  malId?: number;

  // Destination IDs
  tvdbId?: number;
  tmdbId?: number;
  imdbId?: string;

  // Season mapping
  seasonMappings: SeasonMapping[];

  // Episode offset (for split seasons)
  defaultEpisodeOffset: number;

  // Notes
  notes?: string;
  verified: boolean;
  source: 'anime-lists' | 'manual' | 'community';
}

interface SeasonMapping {
  anidbSeason: number;                  // Usually 1 for anime
  tvdbSeason: number;
  tvdbEpisodeOffset: number;

  // Episode-level overrides
  episodeOverrides?: EpisodeOverride[];

  // Special handling
  specialsAs: 'specials' | 'season0' | 'inline';
}

interface EpisodeOverride {
  anidbEpisode: string;                 // "1", "S1", etc.
  tvdbSeason: number;
  tvdbEpisode: number;
}

// Anime-Lists XML format parser
interface AnimeListEntry {
  anidbid: number;
  tvdbid?: number;
  tmdbid?: number;
  imdbid?: string;
  defaulttvdbseason?: number | 'a';     // 'a' = absolute
  episodeoffset?: number;
  mapping?: Array<{
    anidbseason: number;
    tvdbseason: number;
    start?: number;
    end?: number;
    offset?: number;
  }>;
  specialsoffset?: number;
  name?: string;
}
```

### Provider Synchronization

```typescript
interface AnimeMetadataSync {
  seriesId: string;

  // Last sync times
  lastAniListSync?: Date;
  lastAniDBSync?: Date;
  lastMALSync?: Date;
  lastMappingSync?: Date;

  // Sync status
  syncStatus: 'synced' | 'pending' | 'error' | 'partial';
  lastError?: string;

  // Merge strategy
  conflictResolution: 'anilist' | 'anidb' | 'manual';
}

async function syncAnimeMetadata(seriesId: string): Promise<SyncResult> {
  const series = await getAnimeSeries(seriesId);

  // 1. Fetch from AniList (primary)
  const anilistData = series.anilistId
    ? await fetchAniList(series.anilistId)
    : await searchAniList(series.title);

  // 2. Fetch episode data from AniDB
  const anidbData = series.anidbId
    ? await fetchAniDB(series.anidbId)
    : await searchAniDB(series.title, anilistData?.idMal);

  // 3. Fetch mapping data
  const mapping = await fetchAnimeMapping(
    series.anidbId || anidbData?.aid,
    series.tvdbId
  );

  // 4. Merge and resolve conflicts
  const mergedData = mergeAnimeData({
    anilist: anilistData,
    anidb: anidbData,
    mapping: mapping,
    existing: series,
  });

  // 5. Update database
  await updateAnimeSeries(seriesId, mergedData);

  return { success: true, updatedFields: mergedData.changedFields };
}
```

---

## Anime-Specific Parsing

### Anime Release Patterns

Anime releases follow distinct naming conventions compared to Western media.

```typescript
interface ParsedAnimeRelease {
  // Base parsed info
  seriesTitle: string;
  cleanSeriesTitle: string;

  // Episode numbering
  absoluteEpisodeNumbers: number[];
  seasonNumber?: number;
  episodeNumbers?: number[];

  // Anime-specific
  releaseGroup: string;
  isRaw: boolean;                       // No subtitles

  // Version tracking
  version: number;                      // v1, v2, v3
  isProper: boolean;
  isRepack: boolean;

  // Batch detection
  isBatch: boolean;
  batchRange?: { start: number; end: number };

  // Quality
  quality: AnimeQuality;

  // Verification
  crc32?: string;

  // Audio/Video
  videoCodec: string;
  videoBitDepth: number;
  audioCodec: string;
  isDualAudio: boolean;
  audioLanguages: string[];

  // Subtitles
  subtitleLanguages: string[];
  hasHardcodedSubs: boolean;
  subtitleFormat?: string;
}

interface AnimeQuality {
  resolution: number;
  source: AnimeVideoSource;
  isHDR: boolean;
  is10Bit: boolean;
}

type AnimeVideoSource =
  | 'BD'                                // Blu-ray
  | 'DVD'
  | 'TV'                                // TV broadcast
  | 'WEB'                               // Streaming service
  | 'Laserdisc'
  | 'VHS'
  | 'Unknown';
```

### Filename Parsing Patterns

```typescript
const animeParserPatterns = {
  // Release group at start: [SubsPlease], [Erai-raws], [Group Name]
  releaseGroup: /^\[([^\]]+)\]/,

  // Release group at end: -SubsPlease, -EMBER
  releaseGroupEnd: /-([A-Za-z0-9]+)(?:\s*[\[\(][0-9A-Fa-f]{8}[\]\)])?$/,

  // Absolute episode: - 01, - 001, - 0001
  absoluteEpisode: /(?:^|[\s._-])(?:E|Ep\.?|Episode\.?|#)?(\d{2,4})(?:v\d)?(?:[\s._-]|$)/i,

  // Episode range: 01-12, 01-24, 001-024
  episodeRange: /(\d{2,4})[\s._-]*(?:-|~|to)[\s._-]*(\d{2,4})/i,

  // Version: v2, v3, v4
  version: /v(\d+)/i,

  // CRC32 hash: [ABCD1234], (12345678)
  crc32: /[\[\(]([0-9A-Fa-f]{8})[\]\)]/,

  // Resolution: 1080p, 720p, 480p, 2160p, 4K
  resolution: /\b(2160|1080|720|480|576|360)[pi]?\b|\b4K\b/i,

  // Source: BD, Blu-ray, DVD, HDTV, WEB, WEB-DL, WEBRip
  source: /\b(BD|Blu-?ray|DVD|HDTV|WEB(?:-?DL)?|WEBRip|TV(?:Rip)?)\b/i,

  // Video codec: HEVC, H.265, x265, H.264, x264, AV1
  videoCodec: /\b(HEVC|[Hx]\.?265|[Hx]\.?264|AVC|AV1|VP9|MPEG-?2)\b/i,

  // Bit depth: 10-bit, 10bit, Hi10, Hi10P
  bitDepth: /\b(10[\s._-]?bit|Hi10P?|8[\s._-]?bit)\b/i,

  // Audio codec: FLAC, AAC, AC3, DTS, Opus, E-AC-3, EAC3
  audioCodec: /\b(FLAC|AAC|AC-?3|E-?AC-?3|DTS(?:-HD)?|Opus|TrueHD|LPCM|MP3)\b/i,

  // Dual audio indicator
  dualAudio: /\b(Dual[\s._-]?Audio|Multi[\s._-]?Audio|2Audio|JPN?\+ENG?)\b/i,

  // Subtitle indicators
  subtitles: /\b(Subs?|Subbed|Softsubs?|Hardsubs?|Eng(?:lish)?[\s._-]?Subs?|Multi[\s._-]?Subs?)\b/i,

  // Batch/Complete
  batch: /\b(Batch|Complete|Full[\s._-]?Series)\b/i,

  // Season pack
  seasonPack: /\bS(?:eason)?[\s._-]*(\d{1,2})[\s._-]*(?:Complete|Pack|Batch)\b/i,

  // Cour indicator: 1st Cour, 2nd Cour, Part 1, Part 2
  cour: /\b(?:(\d)(?:st|nd|rd|th)?[\s._-]*)?(?:Cour|Part|Season)[\s._-]*(\d)?\b/i,

  // Raw indicator (no subs)
  raw: /\bRAW\b/i,

  // HDR indicators
  hdr: /\b(HDR10\+?|Dolby[\s._-]?Vision|DV|HLG)\b/i,

  // Remaster indicators
  remaster: /\b(Remaster(?:ed)?|Remux|Restored)\b/i,
};
```

### Title Cleaning

```typescript
function cleanAnimeTitle(title: string): CleanedTitle {
  let cleaned = title;

  // Remove release group
  cleaned = cleaned.replace(/^\[([^\]]+)\]\s*/, '');

  // Remove quality info
  cleaned = cleaned.replace(/\b(1080p|720p|480p|2160p|4K)\b/gi, '');
  cleaned = cleaned.replace(/\b(BD|Blu-?ray|DVD|HDTV|WEB(?:-?DL)?|WEBRip)\b/gi, '');
  cleaned = cleaned.replace(/\b(HEVC|[Hx]\.?265|[Hx]\.?264|AVC)\b/gi, '');
  cleaned = cleaned.replace(/\b(10[\s._-]?bit|Hi10P?)\b/gi, '');
  cleaned = cleaned.replace(/\b(FLAC|AAC|AC-?3|DTS|Opus)\b/gi, '');
  cleaned = cleaned.replace(/\b(Dual[\s._-]?Audio)\b/gi, '');

  // Remove episode info
  cleaned = cleaned.replace(/[\s._-]+(?:E|Ep\.?)?(\d{2,4})(?:v\d)?[\s._-]*/gi, ' ');

  // Remove hash
  cleaned = cleaned.replace(/[\[\(][0-9A-Fa-f]{8}[\]\)]/g, '');

  // Remove version
  cleaned = cleaned.replace(/v\d+/gi, '');

  // Normalize separators
  cleaned = cleaned.replace(/[._]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove trailing release group
  cleaned = cleaned.replace(/-[A-Za-z0-9]+$/, '').trim();

  // Extract year if present
  const yearMatch = cleaned.match(/\((\d{4})\)$/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
  if (yearMatch) {
    cleaned = cleaned.replace(/\s*\(\d{4}\)$/, '').trim();
  }

  return {
    title: cleaned,
    titleWithoutYear: cleaned,
    year,
  };
}

interface CleanedTitle {
  title: string;
  titleWithoutYear: string;
  year?: number;
}
```

### Full Anime Parser

```typescript
function parseAnimeRelease(filename: string): ParsedAnimeRelease {
  const result: Partial<ParsedAnimeRelease> = {
    version: 1,
    isRaw: false,
    isBatch: false,
    isDualAudio: false,
    absoluteEpisodeNumbers: [],
    audioLanguages: [],
    subtitleLanguages: [],
    hasHardcodedSubs: false,
    videoBitDepth: 8,
  };

  // Extract release group
  const groupMatch = filename.match(animeParserPatterns.releaseGroup);
  if (groupMatch) {
    result.releaseGroup = groupMatch[1];
  } else {
    const endGroupMatch = filename.match(animeParserPatterns.releaseGroupEnd);
    if (endGroupMatch) {
      result.releaseGroup = endGroupMatch[1];
    }
  }

  // Extract CRC32
  const crcMatch = filename.match(animeParserPatterns.crc32);
  if (crcMatch) {
    result.crc32 = crcMatch[1].toUpperCase();
  }

  // Extract version
  const versionMatch = filename.match(animeParserPatterns.version);
  if (versionMatch) {
    result.version = parseInt(versionMatch[1], 10);
    result.isProper = result.version > 1;
  }

  // Extract resolution
  const resMatch = filename.match(animeParserPatterns.resolution);
  if (resMatch) {
    const res = resMatch[1].toUpperCase();
    result.quality = result.quality || {} as AnimeQuality;
    result.quality.resolution = res === '4K' ? 2160 : parseInt(res, 10);
  }

  // Extract source
  const sourceMatch = filename.match(animeParserPatterns.source);
  if (sourceMatch) {
    result.quality = result.quality || {} as AnimeQuality;
    result.quality.source = normalizeAnimeSource(sourceMatch[1]);
  }

  // Extract video codec
  const codecMatch = filename.match(animeParserPatterns.videoCodec);
  if (codecMatch) {
    result.videoCodec = normalizeVideoCodec(codecMatch[1]);
  }

  // Extract bit depth
  const bitMatch = filename.match(animeParserPatterns.bitDepth);
  if (bitMatch) {
    result.videoBitDepth = bitMatch[1].toLowerCase().includes('10') ? 10 : 8;
    if (result.quality) {
      result.quality.is10Bit = result.videoBitDepth === 10;
    }
  }

  // Extract audio codec
  const audioMatch = filename.match(animeParserPatterns.audioCodec);
  if (audioMatch) {
    result.audioCodec = audioMatch[1].toUpperCase();
  }

  // Check for dual audio
  result.isDualAudio = animeParserPatterns.dualAudio.test(filename);
  if (result.isDualAudio) {
    result.audioLanguages = ['Japanese', 'English'];
  } else {
    result.audioLanguages = ['Japanese'];  // Default assumption
  }

  // Check for raw (no subs)
  result.isRaw = animeParserPatterns.raw.test(filename);

  // Check for batch
  result.isBatch = animeParserPatterns.batch.test(filename);

  // Extract episode range for batch
  const rangeMatch = filename.match(animeParserPatterns.episodeRange);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (end > start && end - start <= 100) {
      result.isBatch = true;
      result.batchRange = { start, end };
      for (let i = start; i <= end; i++) {
        result.absoluteEpisodeNumbers!.push(i);
      }
    }
  }

  // Extract single episode number
  if (!result.isBatch) {
    const epMatch = filename.match(animeParserPatterns.absoluteEpisode);
    if (epMatch) {
      result.absoluteEpisodeNumbers = [parseInt(epMatch[1], 10)];
    }
  }

  // Check for HDR
  const hdrMatch = filename.match(animeParserPatterns.hdr);
  if (hdrMatch && result.quality) {
    result.quality.isHDR = true;
  }

  // Clean title
  const cleanedTitle = cleanAnimeTitle(filename);
  result.seriesTitle = cleanedTitle.title;
  result.cleanSeriesTitle = cleanedTitle.titleWithoutYear;

  return result as ParsedAnimeRelease;
}

function normalizeAnimeSource(source: string): AnimeVideoSource {
  const normalized = source.toUpperCase().replace(/[^A-Z]/g, '');

  const sourceMap: Record<string, AnimeVideoSource> = {
    'BD': 'BD',
    'BLURAY': 'BD',
    'BDRIP': 'BD',
    'DVD': 'DVD',
    'DVDRIP': 'DVD',
    'HDTV': 'TV',
    'TVRIP': 'TV',
    'TV': 'TV',
    'WEB': 'WEB',
    'WEBDL': 'WEB',
    'WEBRIP': 'WEB',
  };

  return sourceMap[normalized] || 'Unknown';
}

function normalizeVideoCodec(codec: string): string {
  const normalized = codec.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const codecMap: Record<string, string> = {
    'HEVC': 'HEVC',
    'H265': 'HEVC',
    'X265': 'HEVC',
    'H264': 'AVC',
    'X264': 'AVC',
    'AVC': 'AVC',
    'AV1': 'AV1',
    'VP9': 'VP9',
  };

  return codecMap[normalized] || codec;
}
```

### Example Parse Results

```typescript
// Example 1: Standard simulcast release
// "[SubsPlease] Jujutsu Kaisen - 47 (1080p) [ABCD1234].mkv"
{
  seriesTitle: "Jujutsu Kaisen",
  releaseGroup: "SubsPlease",
  absoluteEpisodeNumbers: [47],
  version: 1,
  crc32: "ABCD1234",
  quality: { resolution: 1080, source: "WEB", is10Bit: false, isHDR: false },
  isRaw: false,
  isBatch: false,
  isDualAudio: false,
  audioLanguages: ["Japanese"],
}

// Example 2: BD release with dual audio
// "[YuiSubs] Spy x Family - 01-25 (BD 1080p Hi10 FLAC) [Dual-Audio] [Batch]"
{
  seriesTitle: "Spy x Family",
  releaseGroup: "YuiSubs",
  absoluteEpisodeNumbers: [1,2,3,...,25],
  batchRange: { start: 1, end: 25 },
  version: 1,
  quality: { resolution: 1080, source: "BD", is10Bit: true, isHDR: false },
  videoCodec: "HEVC",
  videoBitDepth: 10,
  audioCodec: "FLAC",
  isRaw: false,
  isBatch: true,
  isDualAudio: true,
  audioLanguages: ["Japanese", "English"],
}

// Example 3: Version 2 release
// "[Erai-raws] Oshi no Ko - 11v2 (1080p) [Multiple Subtitle].mkv"
{
  seriesTitle: "Oshi no Ko",
  releaseGroup: "Erai-raws",
  absoluteEpisodeNumbers: [11],
  version: 2,
  isProper: true,
  quality: { resolution: 1080, source: "WEB", is10Bit: false, isHDR: false },
  isRaw: false,
  isBatch: false,
}
```

---

## Seasonal Tracking

### Season Definitions

```typescript
interface AnimeSeason {
  year: number;
  season: SeasonName;
  startDate: Date;
  endDate: Date;
}

type SeasonName = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';

const SEASON_DATES: Record<SeasonName, { startMonth: number; endMonth: number }> = {
  WINTER: { startMonth: 1, endMonth: 3 },    // January - March
  SPRING: { startMonth: 4, endMonth: 6 },    // April - June
  SUMMER: { startMonth: 7, endMonth: 9 },    // July - September
  FALL: { startMonth: 10, endMonth: 12 },    // October - December
};

function getCurrentSeason(): AnimeSeason {
  const now = new Date();
  const month = now.getMonth() + 1;  // 1-indexed
  const year = now.getFullYear();

  let seasonName: SeasonName;
  if (month >= 1 && month <= 3) seasonName = 'WINTER';
  else if (month >= 4 && month <= 6) seasonName = 'SPRING';
  else if (month >= 7 && month <= 9) seasonName = 'SUMMER';
  else seasonName = 'FALL';

  const dates = SEASON_DATES[seasonName];

  return {
    year,
    season: seasonName,
    startDate: new Date(year, dates.startMonth - 1, 1),
    endDate: new Date(year, dates.endMonth, 0),  // Last day of end month
  };
}

function getSeasonForDate(date: Date): AnimeSeason {
  const month = date.getMonth() + 1;
  let year = date.getFullYear();

  let seasonName: SeasonName;
  if (month >= 1 && month <= 3) seasonName = 'WINTER';
  else if (month >= 4 && month <= 6) seasonName = 'SPRING';
  else if (month >= 7 && month <= 9) seasonName = 'SUMMER';
  else seasonName = 'FALL';

  const dates = SEASON_DATES[seasonName];

  return {
    year,
    season: seasonName,
    startDate: new Date(year, dates.startMonth - 1, 1),
    endDate: new Date(year, dates.endMonth, 0),
  };
}
```

### Seasonal Calendar

```typescript
interface SeasonalCalendar {
  currentSeason: AnimeSeason;
  airing: AiringAnime[];
  upcoming: UpcomingAnime[];
  justEnded: RecentlyEndedAnime[];
}

interface AiringAnime {
  seriesId: string;
  title: AnimeTitle;

  // Airing info
  nextEpisode: number;
  nextAiringTime: Date;
  airingDay: DayOfWeek;
  airingTime: string;                   // JST time

  // Progress
  episodesAired: number;
  totalEpisodes?: number;

  // Status
  isMonitored: boolean;
  lastDownloadedEpisode?: number;
  missingEpisodes: number[];
}

interface UpcomingAnime {
  title: AnimeTitle;
  format: AnimeFormat;
  season: AnimeSeason;
  startDate?: Date;

  // External IDs for tracking
  anilistId?: number;
  malId?: number;

  // Pre-airing info
  studios: string[];
  source?: AnimeSourceMaterial;
  genres: string[];

  // User intent
  isPlannedToWatch: boolean;
}

interface RecentlyEndedAnime {
  seriesId: string;
  title: AnimeTitle;

  endDate: Date;
  totalEpisodes: number;

  // Collection status
  collectedEpisodes: number;
  isComplete: boolean;
  missingEpisodes: number[];
}

type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';
```

### Cour Tracking

```typescript
// Anime series often split into cours (typically 12-13 episodes each)
interface CourInfo {
  seriesId: string;
  courNumber: number;                   // 1, 2, 3, etc.
  season: AnimeSeason;

  episodeStart: number;                 // Absolute episode number
  episodeEnd?: number;

  // Split cour handling
  isSplitCour: boolean;                 // Break between cours
  gapSeasons?: number;                  // Number of seasons between cours
}

interface LongRunningSeriesTracking {
  seriesId: string;
  title: AnimeTitle;

  // Episode structure
  cours: CourInfo[];
  currentCour?: number;

  // For long-running series like One Piece, Naruto
  totalEpisodes?: number;
  isOngoing: boolean;

  // Arc tracking (optional, user-defined)
  arcs?: AnimeArc[];
}

interface AnimeArc {
  name: string;
  episodeStart: number;
  episodeEnd?: number;
  isComplete: boolean;
}
```

---

## Release Groups

### Group Categories

```typescript
interface ReleaseGroupInfo {
  name: string;
  category: ReleaseGroupCategory;

  // Quality indicators
  typicalQuality: QualityTier;
  typicalSource: AnimeVideoSource;

  // Release characteristics
  releaseSpeed: ReleaseSpeed;
  subtitleQuality: SubtitleQuality;

  // Status
  isActive: boolean;
  isOfficial: boolean;                  // Official simulcast provider rips

  // Notes
  specializations?: string[];           // "BD releases", "Older anime", etc.
}

type ReleaseGroupCategory =
  | 'SIMULCAST'                         // Same-day rips (SubsPlease, Erai-raws)
  | 'FANSUB'                            // Original translations
  | 'BD_GROUP'                          // BD/DVD specialization
  | 'RAW_PROVIDER'                      // Japanese audio only
  | 'ENCODE_GROUP'                      // Re-encodes with improvements
  | 'ARCHIVAL';                         // Preservation focused

type QualityTier = 'LOW' | 'MID' | 'HIGH' | 'BEST';
type ReleaseSpeed = 'IMMEDIATE' | 'SAME_DAY' | 'WITHIN_WEEK' | 'DELAYED';
type SubtitleQuality = 'OFFICIAL' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'NONE';
```

### Known Release Groups Database

```typescript
const RELEASE_GROUPS: Record<string, ReleaseGroupInfo> = {
  // Simulcast groups
  'SubsPlease': {
    name: 'SubsPlease',
    category: 'SIMULCAST',
    typicalQuality: 'MID',
    typicalSource: 'WEB',
    releaseSpeed: 'IMMEDIATE',
    subtitleQuality: 'OFFICIAL',
    isActive: true,
    isOfficial: true,
    specializations: ['Crunchyroll rips', 'Fast releases'],
  },

  'Erai-raws': {
    name: 'Erai-raws',
    category: 'SIMULCAST',
    typicalQuality: 'MID',
    typicalSource: 'WEB',
    releaseSpeed: 'SAME_DAY',
    subtitleQuality: 'OFFICIAL',
    isActive: true,
    isOfficial: true,
    specializations: ['Multiple streaming sources', 'Multi-sub'],
  },

  // Fansub groups
  'GJM': {
    name: 'GJM',
    category: 'FANSUB',
    typicalQuality: 'HIGH',
    typicalSource: 'WEB',
    releaseSpeed: 'WITHIN_WEEK',
    subtitleQuality: 'GOOD',
    isActive: true,
    isOfficial: false,
    specializations: ['Original translations', 'Quality focused'],
  },

  'Commie': {
    name: 'Commie',
    category: 'FANSUB',
    typicalQuality: 'HIGH',
    typicalSource: 'WEB',
    releaseSpeed: 'DELAYED',
    subtitleQuality: 'GOOD',
    isActive: true,
    isOfficial: false,
    specializations: ['Localization heavy', 'Meme subs'],
  },

  // BD groups
  'VCB-Studio': {
    name: 'VCB-Studio',
    category: 'BD_GROUP',
    typicalQuality: 'BEST',
    typicalSource: 'BD',
    releaseSpeed: 'DELAYED',
    subtitleQuality: 'GOOD',
    isActive: true,
    isOfficial: false,
    specializations: ['BD encodes', 'Chinese group', '10-bit HEVC'],
  },

  'Moozzi2': {
    name: 'Moozzi2',
    category: 'BD_GROUP',
    typicalQuality: 'HIGH',
    typicalSource: 'BD',
    releaseSpeed: 'DELAYED',
    subtitleQuality: 'ACCEPTABLE',
    isActive: true,
    isOfficial: false,
    specializations: ['BD encodes', 'Large catalog'],
  },

  // Historical groups (inactive but releases exist)
  'HorribleSubs': {
    name: 'HorribleSubs',
    category: 'SIMULCAST',
    typicalQuality: 'MID',
    typicalSource: 'WEB',
    releaseSpeed: 'IMMEDIATE',
    subtitleQuality: 'OFFICIAL',
    isActive: false,
    isOfficial: true,
    specializations: ['Crunchyroll rips', 'Defunct 2020'],
  },
};
```

### Group Preference System

```typescript
interface ReleaseGroupPreferences {
  // Preferred groups (in order)
  preferredGroups: string[];

  // Groups to avoid
  blockedGroups: string[];

  // Category preferences
  categoryRanking: ReleaseGroupCategory[];

  // Special preferences
  preferFansubs: boolean;               // Original translations over simulcast
  preferBDReleases: boolean;            // Wait for BD when available
  allowRaws: boolean;                   // Allow raw releases
}

const DEFAULT_GROUP_PREFERENCES: ReleaseGroupPreferences = {
  preferredGroups: ['SubsPlease', 'Erai-raws', 'EMBER'],
  blockedGroups: [],
  categoryRanking: ['SIMULCAST', 'FANSUB', 'BD_GROUP', 'ENCODE_GROUP', 'RAW_PROVIDER'],
  preferFansubs: false,
  preferBDReleases: false,
  allowRaws: false,
};

function scoreReleaseGroup(
  groupName: string,
  preferences: ReleaseGroupPreferences
): number {
  // Check if blocked
  if (preferences.blockedGroups.includes(groupName)) {
    return -1000;
  }

  let score = 0;

  // Preferred group bonus
  const preferredIndex = preferences.preferredGroups.indexOf(groupName);
  if (preferredIndex !== -1) {
    score += 100 - preferredIndex * 10;
  }

  // Category-based scoring
  const groupInfo = RELEASE_GROUPS[groupName];
  if (groupInfo) {
    const categoryIndex = preferences.categoryRanking.indexOf(groupInfo.category);
    if (categoryIndex !== -1) {
      score += 50 - categoryIndex * 10;
    }

    // Quality tier bonus
    switch (groupInfo.typicalQuality) {
      case 'BEST': score += 40; break;
      case 'HIGH': score += 30; break;
      case 'MID': score += 20; break;
      case 'LOW': score += 10; break;
    }

    // Fansub preference
    if (preferences.preferFansubs && groupInfo.category === 'FANSUB') {
      score += 25;
    }

    // BD preference
    if (preferences.preferBDReleases && groupInfo.category === 'BD_GROUP') {
      score += 25;
    }
  }

  return score;
}
```

---

## Quality Considerations

### Anime-Specific Quality Profile

```typescript
interface AnimeQualityProfile {
  id: number;
  name: string;

  // Cutoff - stop searching once this quality is found
  cutoff: AnimeQualityLevel;

  // Accepted qualities in preference order
  items: AnimeQualityProfileItem[];

  // Upgrade behavior
  upgradeAllowed: boolean;
  upgradeBDFromWeb: boolean;            // Upgrade to BD when available

  // Anime-specific settings
  prefer10Bit: boolean;
  preferHEVC: boolean;
  preferDualAudio: boolean;
  preferFLAC: boolean;
}

interface AnimeQualityProfileItem {
  quality: AnimeQualityLevel;
  allowed: boolean;
}

type AnimeQualityLevel =
  | 'RAW_HD'                            // Raw Japanese broadcast
  | 'HDTV_720p'
  | 'HDTV_1080p'
  | 'WEB_480p'
  | 'WEB_720p'
  | 'WEB_1080p'
  | 'WEB_2160p'
  | 'BD_480p'
  | 'BD_720p'
  | 'BD_1080p'
  | 'BD_1080p_Remux'
  | 'BD_2160p'
  | 'BD_2160p_Remux';

const DEFAULT_ANIME_QUALITY_PROFILE: AnimeQualityProfile = {
  id: 1,
  name: 'Anime - Standard',
  cutoff: 'BD_1080p',
  items: [
    { quality: 'BD_1080p_Remux', allowed: true },
    { quality: 'BD_1080p', allowed: true },
    { quality: 'WEB_1080p', allowed: true },
    { quality: 'BD_720p', allowed: true },
    { quality: 'WEB_720p', allowed: true },
    { quality: 'HDTV_1080p', allowed: true },
    { quality: 'HDTV_720p', allowed: true },
    { quality: 'WEB_480p', allowed: false },
    { quality: 'BD_480p', allowed: false },
  ],
  upgradeAllowed: true,
  upgradeBDFromWeb: true,
  prefer10Bit: true,
  preferHEVC: true,
  preferDualAudio: false,
  preferFLAC: false,
};
```

### Anime Custom Formats

```typescript
interface AnimeCustomFormat {
  id: number;
  name: string;
  specifications: CustomFormatSpec[];
  includeWhenRenaming: boolean;
}

const ANIME_CUSTOM_FORMATS: AnimeCustomFormat[] = [
  {
    id: 1001,
    name: '10-bit',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\b(10[\\s._-]?bit|Hi10P?)\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: true,
  },

  {
    id: 1002,
    name: 'Dual Audio',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\b(Dual[\\s._-]?Audio|Multi[\\s._-]?Audio|2Audio)\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: true,
  },

  {
    id: 1003,
    name: 'HEVC',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\b(HEVC|[Hx]\\.?265)\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: false,
  },

  {
    id: 1004,
    name: 'Blu-ray',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\b(BD|Blu-?ray|BDRip)\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: true,
  },

  {
    id: 1005,
    name: 'Uncensored',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\b(Uncensored|Uncut)\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: true,
  },

  {
    id: 1006,
    name: 'Fansub',
    specifications: [
      {
        type: 'releaseGroup',
        field: 'releaseGroup',
        value: RELEASE_GROUPS_FANSUB.join('|'),
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: false,
  },

  {
    id: 1007,
    name: 'Hardcoded Subs',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\b(Hardsubs?|HC)\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: false,
  },

  {
    id: 1008,
    name: 'FLAC Audio',
    specifications: [
      {
        type: 'regex',
        field: 'title',
        value: '\\bFLAC\\b',
        required: true,
        negated: false,
      },
    ],
    includeWhenRenaming: false,
  },
];

interface CustomFormatSpec {
  type: 'regex' | 'releaseGroup' | 'size' | 'indexer';
  field: string;
  value: string;
  required: boolean;
  negated: boolean;
}
```

### Quality Scoring

```typescript
interface AnimeQualityScore {
  // Base score from quality level
  baseScore: number;

  // Custom format bonuses/penalties
  customFormatScore: number;

  // Release group score
  releaseGroupScore: number;

  // Total
  totalScore: number;
}

function calculateAnimeQualityScore(
  release: ParsedAnimeRelease,
  profile: AnimeQualityProfile,
  customFormats: AnimeCustomFormat[],
  groupPreferences: ReleaseGroupPreferences
): AnimeQualityScore {
  // Base quality score
  const qualityLevel = determineQualityLevel(release);
  const baseScore = getQualityBaseScore(qualityLevel);

  // Custom format scoring
  let customFormatScore = 0;
  for (const format of customFormats) {
    if (matchesCustomFormat(release, format)) {
      customFormatScore += getCustomFormatScore(format.id, profile);
    }
  }

  // Anime-specific bonuses
  if (profile.prefer10Bit && release.videoBitDepth === 10) {
    customFormatScore += 50;
  }
  if (profile.preferHEVC && release.videoCodec === 'HEVC') {
    customFormatScore += 30;
  }
  if (profile.preferDualAudio && release.isDualAudio) {
    customFormatScore += 40;
  }
  if (profile.preferFLAC && release.audioCodec === 'FLAC') {
    customFormatScore += 20;
  }

  // Release group scoring
  const releaseGroupScore = release.releaseGroup
    ? scoreReleaseGroup(release.releaseGroup, groupPreferences)
    : 0;

  return {
    baseScore,
    customFormatScore,
    releaseGroupScore,
    totalScore: baseScore + customFormatScore + releaseGroupScore,
  };
}

const QUALITY_BASE_SCORES: Record<AnimeQualityLevel, number> = {
  'RAW_HD': 100,
  'HDTV_720p': 200,
  'HDTV_1080p': 250,
  'WEB_480p': 150,
  'WEB_720p': 300,
  'WEB_1080p': 400,
  'WEB_2160p': 500,
  'BD_480p': 200,
  'BD_720p': 350,
  'BD_1080p': 500,
  'BD_1080p_Remux': 600,
  'BD_2160p': 700,
  'BD_2160p_Remux': 800,
};
```

---

## Simulcast Support

### Simulcast Configuration

```typescript
interface SimulcastConfig {
  // Time zone handling
  japanTimeZone: string;                // "Asia/Tokyo"
  localTimeZone: string;

  // Release timing
  expectedDelayMinutes: number;         // Typical delay after JP air
  maxWaitHours: number;                 // Max time to wait for release

  // Source preferences
  preferredSimulcastSources: SimulcastSource[];

  // Quality settings
  simulcastQualityProfile: number;      // Profile ID

  // Upgrade behavior
  upgradeToHDWhenAvailable: boolean;
  upgradeToBDWhenAvailable: boolean;
  bdUpgradeDelayDays: number;           // Days to wait for BD
}

type SimulcastSource =
  | 'Crunchyroll'
  | 'Funimation'
  | 'HiDive'
  | 'Netflix'
  | 'Amazon'
  | 'Disney+'
  | 'Wakanim'
  | 'ADN'
  | 'Bilibili'
  | 'iQIYI';

interface SimulcastSchedule {
  seriesId: string;
  title: AnimeTitle;

  // Air schedule
  japanAirDay: DayOfWeek;
  japanAirTime: string;                 // "25:30" (1:30 AM next day)
  japanAirTimeUTC: string;

  // Release timing
  simulcastSource: SimulcastSource;
  expectedReleaseDelay: number;         // Minutes after JP air

  // Episode tracking
  currentEpisode: number;
  totalEpisodes?: number;

  // Status
  isOnHiatus: boolean;
  hiatusEndDate?: Date;
}
```

### Simulcast vs BD Workflow

```typescript
interface BDUpgradeTracking {
  seriesId: string;

  // Current state
  currentReleaseType: 'simulcast' | 'bd';

  // BD release info
  bdReleaseDate?: Date;
  bdVolumes?: BDVolumeInfo[];

  // Upgrade settings
  autoUpgradeToBD: boolean;
  deleteSimulcastAfterUpgrade: boolean;

  // Progress
  upgradedEpisodes: number[];
  pendingUpgradeEpisodes: number[];
}

interface BDVolumeInfo {
  volumeNumber: number;
  releaseDate: Date;
  episodeStart: number;
  episodeEnd: number;

  // Status
  isReleased: boolean;
  isDownloaded: boolean;
}

async function checkBDUpgrades(): Promise<BDUpgradeResult[]> {
  const results: BDUpgradeResult[] = [];

  // Get all series with simulcast releases
  const seriesWithSimulcast = await getSeriesWithReleaseType('simulcast');

  for (const series of seriesWithSimulcast) {
    // Check if BD is available
    const bdInfo = await checkBDAvailability(series.anidbId);

    if (bdInfo.isAvailable) {
      // Search for BD releases
      const bdReleases = await searchBDReleases(series);

      if (bdReleases.length > 0) {
        results.push({
          seriesId: series.id,
          title: series.title,
          availableBDReleases: bdReleases,
          episodesToUpgrade: getSimulcastEpisodes(series),
        });
      }
    }
  }

  return results;
}

interface BDUpgradeResult {
  seriesId: string;
  title: AnimeTitle;
  availableBDReleases: ParsedAnimeRelease[];
  episodesToUpgrade: number[];
}
```

### Air Time Handling

```typescript
// Japanese TV uses 24-hour+ notation for late-night shows
// "25:30" means 1:30 AM the next day
function parseJapaneseAirTime(timeStr: string, dayOfWeek: DayOfWeek): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Get next occurrence of this day of week
  let date = getNextDayOfWeek(dayOfWeek);

  if (hours >= 24) {
    // Late night - actually next day
    date = addDays(date, 1);
    date.setHours(hours - 24, minutes, 0, 0);
  } else {
    date.setHours(hours, minutes, 0, 0);
  }

  // Convert from JST to UTC
  return convertJSTtoUTC(date);
}

function calculateExpectedReleaseTime(
  japanAirTime: Date,
  source: SimulcastSource
): Date {
  // Different sources have different typical delays
  const delays: Record<SimulcastSource, number> = {
    'Crunchyroll': 60,      // ~1 hour after JP air
    'Funimation': 60,
    'HiDive': 90,
    'Netflix': 0,           // Simultaneous or earlier
    'Amazon': 60,
    'Disney+': 0,
    'Wakanim': 60,
    'ADN': 60,
    'Bilibili': 30,
    'iQIYI': 30,
  };

  const delayMinutes = delays[source] || 60;
  return addMinutes(japanAirTime, delayMinutes);
}
```

---

## Scene Numbering

### Scene vs Official Numbering

```typescript
interface SceneNumberingMapping {
  seriesId: string;

  // When scene numbering differs from official
  hasSceneMapping: boolean;

  // Mappings
  seasonMappings: SceneSeasonMapping[];
  episodeMappings: SceneEpisodeMapping[];

  // Source
  mappingSource: 'thexem' | 'manual' | 'anidb';
  lastUpdated: Date;
}

interface SceneSeasonMapping {
  sceneSeason: number;
  officialSeason: number;
  absoluteOffset: number;               // For converting to absolute
}

interface SceneEpisodeMapping {
  sceneSeason: number;
  sceneEpisode: number;

  officialSeason: number;
  officialEpisode: number;

  absoluteNumber: number;
}

// Common scenarios where scene numbering differs
const SCENE_NUMBERING_SCENARIOS = {
  // Scenario 1: Scene treats all episodes as S01
  // Official: S01E01-E26, S02E01-E26
  // Scene: S01E01-E52
  CONTINUOUS_SEASON: 'continuous_season',

  // Scenario 2: Scene uses absolute numbering
  // Official: S01E01, S02E01
  // Scene: E001, E025
  ABSOLUTE_ONLY: 'absolute_only',

  // Scenario 3: Scene splits a season
  // Official: S01E01-E50
  // Scene: S01E01-E25, S02E01-E25
  SPLIT_SEASON: 'split_season',

  // Scenario 4: Scene combines OVAs
  // Official: S01E01-E12 + OVA
  // Scene: S01E01-E13
  OVA_AS_EPISODE: 'ova_as_episode',

  // Scenario 5: Scene excludes specials
  // Official: E01, S01, E02, S02, E03
  // Scene: E01, E02, E03
  EXCLUDES_SPECIALS: 'excludes_specials',
};
```

### XEM Integration

```typescript
interface XEMMapping {
  // TheTVDB mapping (scene uses TVDB IDs)
  tvdbId: number;

  // Scene to official mappings
  mappings: XEMSeasonMapping[];

  // Default mapping strategy
  defaultSeason: number | 'a';          // 'a' = absolute
  episodeOffset: number;
}

interface XEMSeasonMapping {
  scene: { season: number; episode: number };
  tvdb: { season: number; episode: number };
  absolute: number;
}

async function fetchXEMMapping(tvdbId: number): Promise<XEMMapping | null> {
  const response = await fetch(
    `https://thexem.info/map/all?id=${tvdbId}&origin=tvdb`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  // Transform to our format
  return {
    tvdbId,
    mappings: data.map((m: any) => ({
      scene: { season: m.scene_season, episode: m.scene_episode },
      tvdb: { season: m.tvdb_season, episode: m.tvdb_episode },
      absolute: m.absolute,
    })),
    defaultSeason: data.defaultSeason,
    episodeOffset: data.episodeOffset || 0,
  };
}
```

### Numbering Resolution

```typescript
function resolveEpisodeNumber(
  parsed: ParsedAnimeRelease,
  series: AnimeSeries,
  mapping: SceneNumberingMapping | null
): ResolvedEpisodeInfo {
  // If we have absolute numbers and series uses absolute, use directly
  if (parsed.absoluteEpisodeNumbers.length > 0 && series.usesAbsoluteNumbering) {
    return {
      absoluteNumbers: parsed.absoluteEpisodeNumbers,
      seasonNumber: calculateSeasonFromAbsolute(
        parsed.absoluteEpisodeNumbers[0],
        series
      ),
      episodeNumbers: calculateEpisodesFromAbsolute(
        parsed.absoluteEpisodeNumbers,
        series
      ),
      source: 'absolute',
    };
  }

  // If we have scene mapping, apply it
  if (mapping && mapping.hasSceneMapping) {
    const sceneEp = {
      season: parsed.seasonNumber || 1,
      episode: parsed.episodeNumbers?.[0] || parsed.absoluteEpisodeNumbers[0],
    };

    const official = applySceneMapping(sceneEp, mapping);

    return {
      absoluteNumbers: [official.absolute],
      seasonNumber: official.season,
      episodeNumbers: [official.episode],
      source: 'scene_mapping',
    };
  }

  // Fallback: use what we parsed
  return {
    absoluteNumbers: parsed.absoluteEpisodeNumbers,
    seasonNumber: parsed.seasonNumber,
    episodeNumbers: parsed.episodeNumbers || [],
    source: 'parsed',
  };
}

interface ResolvedEpisodeInfo {
  absoluteNumbers: number[];
  seasonNumber?: number;
  episodeNumbers: number[];
  source: 'absolute' | 'scene_mapping' | 'parsed';
}

function applySceneMapping(
  sceneEp: { season: number; episode: number },
  mapping: SceneNumberingMapping
): { season: number; episode: number; absolute: number } {
  // Find specific episode mapping
  const epMapping = mapping.episodeMappings.find(
    m => m.sceneSeason === sceneEp.season && m.sceneEpisode === sceneEp.episode
  );

  if (epMapping) {
    return {
      season: epMapping.officialSeason,
      episode: epMapping.officialEpisode,
      absolute: epMapping.absoluteNumber,
    };
  }

  // Find season mapping and calculate
  const seasonMapping = mapping.seasonMappings.find(
    m => m.sceneSeason === sceneEp.season
  );

  if (seasonMapping) {
    return {
      season: seasonMapping.officialSeason,
      episode: sceneEp.episode,
      absolute: seasonMapping.absoluteOffset + sceneEp.episode,
    };
  }

  // No mapping found, return as-is
  return {
    season: sceneEp.season,
    episode: sceneEp.episode,
    absolute: sceneEp.episode,
  };
}
```

---

## Folder Structure

### Anime-Specific Naming

```typescript
interface AnimeNamingConfig {
  // Series folder
  seriesFolderFormat: string;

  // Season folder (optional for anime)
  useSeasonFolders: boolean;
  seasonFolderFormat: string;

  // Specials folder
  specialsFolderFormat: string;

  // Episode file
  standardEpisodeFormat: string;
  absoluteEpisodeFormat: string;

  // Multi-episode
  multiEpisodeStyle: 'range' | 'duplicate' | 'prefixedRange';

  // Special episode file
  specialEpisodeFormat: string;

  // Replacement characters
  colonReplacement: '-' | ' -' | '';
  illegalCharacterReplacement: string;
}

const DEFAULT_ANIME_NAMING: AnimeNamingConfig = {
  seriesFolderFormat: '{Series Title} ({Year})',

  useSeasonFolders: false,              // Anime typically doesn't use seasons
  seasonFolderFormat: 'Season {Season:00}',

  specialsFolderFormat: 'Specials',

  // Standard format with absolute number
  standardEpisodeFormat: '{Series Title} - {Absolute Episode:000} - {Episode Title} [{Quality Full}]',

  // Alternative with season/episode
  absoluteEpisodeFormat: '{Series Title} - S{Season:00}E{Episode:00} - {Absolute Episode:000} - {Episode Title} [{Quality Full}]',

  multiEpisodeStyle: 'range',           // E01-E03

  specialEpisodeFormat: '{Series Title} - {Special Episode Type}{Special Episode:00} - {Episode Title} [{Quality Full}]',

  colonReplacement: ' -',
  illegalCharacterReplacement: '',
};
```

### Naming Tokens

```typescript
const ANIME_NAMING_TOKENS = {
  // Series tokens
  '{Series Title}': 'Full series title',
  '{Series CleanTitle}': 'Series title without special characters',
  '{Series TitleTheYearSlug}': 'Title formatted for sorting (The → end)',

  // Episode number tokens
  '{Absolute Episode}': 'Absolute episode number (1)',
  '{Absolute Episode:0}': 'Absolute episode number (1)',
  '{Absolute Episode:00}': 'Absolute episode number (01)',
  '{Absolute Episode:000}': 'Absolute episode number (001)',

  '{Season}': 'Season number (1)',
  '{Season:0}': 'Season number (1)',
  '{Season:00}': 'Season number (01)',

  '{Episode}': 'Episode number (1)',
  '{Episode:0}': 'Episode number (1)',
  '{Episode:00}': 'Episode number (01)',

  // Episode info tokens
  '{Episode Title}': 'Episode title',
  '{Episode CleanTitle}': 'Episode title without special characters',

  // Quality tokens
  '{Quality Full}': 'Full quality string (HDTV-720p)',
  '{Quality Title}': 'Quality name (HDTV)',
  '{Quality Resolution}': 'Resolution (720p)',

  // Media info tokens
  '{MediaInfo Video}': 'Video codec (x265)',
  '{MediaInfo VideoBitDepth}': 'Bit depth (10bit)',
  '{MediaInfo Audio}': 'Audio codec (FLAC)',
  '{MediaInfo AudioChannels}': 'Audio channels (5.1)',

  // Release info tokens
  '{Release Group}': 'Release group name',
  '{Release Hash}': 'CRC32 hash',

  // Anime-specific tokens
  '{Special Episode Type}': 'Special type (OVA, ONA, Special)',
  '{Special Episode}': 'Special episode number',
  '{Special Episode:00}': 'Special episode number (01)',

  // Date tokens
  '{Air Date}': 'Original air date (YYYY-MM-DD)',
  '{Air Year}': 'Original air year',

  // Custom format tokens
  '{Custom Formats}': 'Matched custom format names',
  '{Custom Format:Name}': 'Specific custom format if matched',
};
```

### Example Folder Structures

```
# Standard Anime Structure (No Season Folders)
/Anime/
├── Attack on Titan (2013)/
│   ├── Attack on Titan - 001 - To You, in 2000 Years [BD 1080p].mkv
│   ├── Attack on Titan - 002 - That Day [BD 1080p].mkv
│   ├── ...
│   ├── Attack on Titan - 087 - The Dawn of Humanity [WEB 1080p].mkv
│   └── Specials/
│       ├── Attack on Titan - OVA01 - Ilse's Notebook [BD 1080p].mkv
│       └── Attack on Titan - OVA02 - The Sudden Visitor [BD 1080p].mkv

# With Season Folders (For Plex/Jellyfin Compatibility)
/Anime/
├── Attack on Titan (2013)/
│   ├── Season 01/
│   │   ├── Attack on Titan - S01E01 - 001 - To You, in 2000 Years [BD 1080p].mkv
│   │   └── ...
│   ├── Season 02/
│   │   ├── Attack on Titan - S02E01 - 026 - Beast Titan [BD 1080p].mkv
│   │   └── ...
│   └── Specials/
│       └── ...

# Long-Running Series
/Anime/
├── One Piece (1999)/
│   ├── One Piece - 0001 - I'm Luffy! The Man Who's Gonna Be King of the Pirates! [WEB 1080p].mkv
│   ├── One Piece - 0500 - Freedom Taken Away! The Straw Hat Pirates Enslaved! [WEB 1080p].mkv
│   ├── One Piece - 1000 - Overwhelming Strength! The Straw Hats Come Together [WEB 1080p].mkv
│   └── ...

# Movie Organization
/Anime/
├── Sword Art Online (2012)/
│   ├── Sword Art Online - 001 - The World of Swords [BD 1080p].mkv
│   └── ...
├── Sword Art Online - Ordinal Scale (2017)/
│   └── Sword Art Online - Ordinal Scale [BD 1080p].mkv
├── Sword Art Online - Progressive - Aria of a Starless Night (2021)/
│   └── Sword Art Online - Progressive - Aria of a Starless Night [BD 1080p].mkv
```

### Path Building

```typescript
function buildAnimePath(
  episode: AnimeEpisode,
  series: AnimeSeries,
  file: AnimeEpisodeFile,
  config: AnimeNamingConfig
): string {
  const tokens: Record<string, string> = {
    '{Series Title}': series.title.userPreferred || series.title.romaji || '',
    '{Series CleanTitle}': cleanTitle(series.title.userPreferred || series.title.romaji || ''),
    '{Year}': series.seasonYear?.toString() || '',
    '{Absolute Episode}': episode.absoluteNumber.toString(),
    '{Absolute Episode:00}': episode.absoluteNumber.toString().padStart(2, '0'),
    '{Absolute Episode:000}': episode.absoluteNumber.toString().padStart(3, '0'),
    '{Season}': (episode.seasonNumber || 1).toString(),
    '{Season:00}': (episode.seasonNumber || 1).toString().padStart(2, '0'),
    '{Episode}': (episode.episodeNumber || episode.absoluteNumber).toString(),
    '{Episode:00}': (episode.episodeNumber || episode.absoluteNumber).toString().padStart(2, '0'),
    '{Episode Title}': episode.title?.english || episode.title?.romaji || '',
    '{Quality Full}': formatQualityFull(file.quality),
    '{Release Group}': file.releaseGroup || '',
    '{Release Hash}': file.crc32 || '',
  };

  // Build folder path
  let folderPath = replaceTokens(config.seriesFolderFormat, tokens);

  if (config.useSeasonFolders && episode.seasonNumber) {
    folderPath = path.join(folderPath, replaceTokens(config.seasonFolderFormat, tokens));
  }

  // Build filename
  let filename: string;
  if (episode.specialType) {
    tokens['{Special Episode Type}'] = episode.specialType;
    tokens['{Special Episode}'] = episode.episodeNumber?.toString() || '1';
    tokens['{Special Episode:00}'] = (episode.episodeNumber || 1).toString().padStart(2, '0');
    filename = replaceTokens(config.specialEpisodeFormat, tokens);
  } else if (config.useSeasonFolders) {
    filename = replaceTokens(config.absoluteEpisodeFormat, tokens);
  } else {
    filename = replaceTokens(config.standardEpisodeFormat, tokens);
  }

  // Clean illegal characters
  filename = cleanFilename(filename, config);

  return path.join(folderPath, filename + path.extname(file.relativePath));
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  let result = template;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(escapeRegex(token), 'g'), value);
  }
  return result;
}

function cleanFilename(filename: string, config: AnimeNamingConfig): string {
  // Replace colons
  filename = filename.replace(/:/g, config.colonReplacement);

  // Replace other illegal characters
  filename = filename.replace(/[<>:"/\\|?*]/g, config.illegalCharacterReplacement);

  // Remove leading/trailing dots and spaces
  filename = filename.replace(/^[\s.]+|[\s.]+$/g, '');

  return filename;
}
```

---

## Integration with idkarr

### Anime-Specific Indexers

```typescript
interface AnimeIndexer {
  id: number;
  name: string;
  type: 'ANIME_TORRENT' | 'ANIME_USENET';

  // Capabilities
  supportsSearch: boolean;
  supportsRss: boolean;
  supportsSeason: boolean;
  supportsAbsoluteSearch: boolean;

  // Categories
  categories: AnimeIndexerCategory[];

  // Settings
  baseUrl: string;
  apiPath: string;
  apiKey?: string;
}

interface AnimeIndexerCategory {
  id: number;
  name: string;
  subCategories?: AnimeIndexerCategory[];
}

const ANIME_INDEXERS: AnimeIndexer[] = [
  {
    id: 1,
    name: 'Nyaa',
    type: 'ANIME_TORRENT',
    supportsSearch: true,
    supportsRss: true,
    supportsSeason: false,
    supportsAbsoluteSearch: true,
    categories: [
      { id: 1, name: 'Anime', subCategories: [
        { id: 11, name: 'Anime - Music Video' },
        { id: 12, name: 'Anime - English-translated' },
        { id: 13, name: 'Anime - Non-English-translated' },
        { id: 14, name: 'Anime - Raw' },
      ]},
    ],
    baseUrl: 'https://nyaa.si',
    apiPath: '/?page=rss',
  },

  {
    id: 2,
    name: 'AnimeTosho',
    type: 'ANIME_TORRENT',
    supportsSearch: true,
    supportsRss: true,
    supportsSeason: false,
    supportsAbsoluteSearch: true,
    categories: [
      { id: 1, name: 'All' },
    ],
    baseUrl: 'https://animetosho.org',
    apiPath: '/feed/api',
  },

  {
    id: 3,
    name: 'AniDex',
    type: 'ANIME_TORRENT',
    supportsSearch: true,
    supportsRss: true,
    supportsSeason: false,
    supportsAbsoluteSearch: true,
    categories: [
      { id: 1, name: 'Anime', subCategories: [
        { id: 11, name: 'Anime - Sub' },
        { id: 12, name: 'Anime - Raw' },
        { id: 13, name: 'Anime - Dub' },
      ]},
    ],
    baseUrl: 'https://anidex.info',
    apiPath: '/api',
  },
];
```

### Search Queries

```typescript
interface AnimeSearchQuery {
  // Series identification
  seriesTitle?: string;
  anilistId?: number;
  anidbId?: number;
  malId?: number;

  // Episode targeting
  absoluteEpisode?: number;
  absoluteEpisodeRange?: { start: number; end: number };
  seasonNumber?: number;
  episodeNumber?: number;

  // Quality filters
  minResolution?: number;
  maxResolution?: number;
  sources?: AnimeVideoSource[];

  // Release filters
  releaseGroups?: string[];
  excludeGroups?: string[];
  releaseTypes?: ('simulcast' | 'fansub' | 'bluray' | 'raw')[];

  // Audio/Subtitle filters
  requireDualAudio?: boolean;
  requireSubtitles?: boolean;
  subtitleLanguage?: string;

  // Age filter
  maxAgeDays?: number;
}

function buildNyaaSearchUrl(query: AnimeSearchQuery): string {
  const params = new URLSearchParams();

  // Build search term
  let searchTerm = query.seriesTitle || '';

  if (query.absoluteEpisode !== undefined) {
    // Format: "Title - 01" or "Title - 001"
    const epNum = query.absoluteEpisode.toString().padStart(2, '0');
    searchTerm += ` ${epNum}`;
  }

  if (query.releaseGroups && query.releaseGroups.length > 0) {
    // Add preferred group to search
    searchTerm += ` ${query.releaseGroups[0]}`;
  }

  params.set('q', searchTerm);
  params.set('c', '1_2');               // Anime - English-translated
  params.set('f', '0');                 // No filter

  return `https://nyaa.si/?${params.toString()}`;
}

function buildAnimeToshoSearchUrl(query: AnimeSearchQuery): string {
  const params = new URLSearchParams();

  if (query.anidbId) {
    params.set('aids', query.anidbId.toString());
  }

  if (query.absoluteEpisode !== undefined) {
    params.set('episode', query.absoluteEpisode.toString());
  }

  if (query.seriesTitle) {
    params.set('q', query.seriesTitle);
  }

  return `https://animetosho.org/search?${params.toString()}`;
}
```

### Download Client Integration

```typescript
interface AnimeDownloadClientConfig {
  // Standard settings
  host: string;
  port: number;
  username?: string;
  password?: string;

  // Anime-specific categories
  animeCategory: string;                // "anime" or "tv-anime"
  animeBatchCategory: string;           // "anime-batch"

  // Path settings
  animeRootPath: string;

  // Priority settings
  simulcastPriority: 'high' | 'normal' | 'low';
  bdPriority: 'high' | 'normal' | 'low';
  batchPriority: 'high' | 'normal' | 'low';

  // Seeding settings
  seedRatioLimit?: number;
  seedTimeLimit?: number;               // Minutes
}

interface AnimeDownloadRequest {
  release: ParsedAnimeRelease;
  series: AnimeSeries;
  episodes: AnimeEpisode[];

  // Download settings
  downloadClient: AnimeDownloadClientConfig;
  priority: 'high' | 'normal' | 'low';

  // Post-download
  category: string;
  tags: string[];
}

async function queueAnimeDownload(request: AnimeDownloadRequest): Promise<string> {
  const { release, series, downloadClient } = request;

  // Determine category
  let category = downloadClient.animeCategory;
  if (release.isBatch) {
    category = downloadClient.animeBatchCategory;
  }

  // Determine priority
  let priority = request.priority;
  if (release.quality.source === 'BD') {
    priority = downloadClient.bdPriority;
  } else if (release.releaseGroup && isSimulcastGroup(release.releaseGroup)) {
    priority = downloadClient.simulcastPriority;
  }

  // Build tags
  const tags = [
    `series:${series.id}`,
    `group:${release.releaseGroup}`,
    `quality:${release.quality.source}-${release.quality.resolution}p`,
  ];

  if (release.isDualAudio) tags.push('dual-audio');
  if (release.isBatch) tags.push('batch');

  // Queue download
  const downloadId = await queueTorrentDownload({
    torrentUrl: release.torrentUrl,
    category,
    priority,
    tags,
    savePath: downloadClient.animeRootPath,
  });

  return downloadId;
}
```

### Media Server Integration

```typescript
interface AnimeMediaServerConfig {
  // Server type
  serverType: 'plex' | 'jellyfin' | 'emby';

  // Connection
  baseUrl: string;
  apiKey: string;

  // Library settings
  animeLibraryId: string;

  // Naming compatibility
  useAbsoluteNumbering: boolean;
  useSeasonFolders: boolean;            // Required for some agents

  // Agent settings
  metadataAgent: 'anidb' | 'tvdb' | 'hama' | 'anilist';

  // Scan behavior
  autoScan: boolean;
  scanDelaySeconds: number;
}

// Plex/Jellyfin compatibility naming
function buildMediaServerCompatiblePath(
  episode: AnimeEpisode,
  series: AnimeSeries,
  config: AnimeMediaServerConfig
): string {
  if (config.metadataAgent === 'hama' || config.metadataAgent === 'anidb') {
    // HAMA/AniDB agent: Use absolute numbering
    // Format: Series Name - 001 - Episode Title.mkv
    const absNum = episode.absoluteNumber.toString().padStart(3, '0');
    return `${series.title.romaji} - ${absNum} - ${episode.title?.english || ''}.mkv`;
  }

  if (config.metadataAgent === 'tvdb') {
    // TVDB agent: Use season/episode format
    // Format: Series Name - S01E01 - Episode Title.mkv
    const season = (episode.seasonNumber || 1).toString().padStart(2, '0');
    const epNum = (episode.episodeNumber || episode.absoluteNumber).toString().padStart(2, '0');
    return `${series.title.romaji} - S${season}E${epNum} - ${episode.title?.english || ''}.mkv`;
  }

  // Default: Combined format
  const season = (episode.seasonNumber || 1).toString().padStart(2, '0');
  const epNum = (episode.episodeNumber || episode.absoluteNumber).toString().padStart(2, '0');
  const absNum = episode.absoluteNumber.toString().padStart(3, '0');
  return `${series.title.romaji} - S${season}E${epNum} - ${absNum} - ${episode.title?.english || ''}.mkv`;
}
```

### Import and Library Scan

```typescript
interface AnimeImportConfig {
  // Import behavior
  autoImport: boolean;
  moveFiles: boolean;
  copyFiles: boolean;                   // Copy instead of move
  hardlinkFiles: boolean;               // Hardlink instead of move/copy

  // Matching
  matchByAnidbId: boolean;
  matchByFilename: boolean;
  matchByFolder: boolean;

  // Rename on import
  renameOnImport: boolean;

  // Handling unknowns
  createSeriesForUnknown: boolean;
  unknownSeriesMonitored: boolean;
}

interface AnimeImportResult {
  success: boolean;
  seriesId?: string;
  episodeId?: string;

  // What happened
  action: 'imported' | 'upgraded' | 'skipped' | 'rejected';
  reason?: string;

  // File info
  sourcePath: string;
  destinationPath?: string;

  // Matching info
  matchMethod: 'anidb' | 'filename' | 'folder' | 'manual';
  matchConfidence: number;              // 0-100
}

async function importAnimeFile(
  filePath: string,
  config: AnimeImportConfig
): Promise<AnimeImportResult> {
  // Parse the filename
  const parsed = parseAnimeRelease(path.basename(filePath));

  if (!parsed.seriesTitle) {
    return {
      success: false,
      action: 'rejected',
      reason: 'Could not parse series title from filename',
      sourcePath: filePath,
      matchMethod: 'filename',
      matchConfidence: 0,
    };
  }

  // Try to match to existing series
  let series: AnimeSeries | null = null;
  let matchMethod: 'anidb' | 'filename' | 'folder' = 'filename';
  let matchConfidence = 0;

  // Try AniDB ID from release group database
  if (config.matchByAnidbId && parsed.releaseGroup) {
    const anidbId = await lookupAniDBFromRelease(parsed);
    if (anidbId) {
      series = await findSeriesByAnidbId(anidbId);
      if (series) {
        matchMethod = 'anidb';
        matchConfidence = 95;
      }
    }
  }

  // Try filename matching
  if (!series && config.matchByFilename) {
    const matches = await searchSeriesByTitle(parsed.cleanSeriesTitle);
    if (matches.length === 1) {
      series = matches[0];
      matchConfidence = 85;
    } else if (matches.length > 1) {
      // Fuzzy match
      series = findBestMatch(parsed.cleanSeriesTitle, matches);
      matchConfidence = 70;
    }
  }

  // Try folder matching
  if (!series && config.matchByFolder) {
    const folderName = path.basename(path.dirname(filePath));
    const folderMatches = await searchSeriesByTitle(folderName);
    if (folderMatches.length === 1) {
      series = folderMatches[0];
      matchMethod = 'folder';
      matchConfidence = 80;
    }
  }

  if (!series) {
    if (config.createSeriesForUnknown) {
      // Create new series
      series = await createSeriesFromParsed(parsed, config.unknownSeriesMonitored);
      matchConfidence = 50;
    } else {
      return {
        success: false,
        action: 'rejected',
        reason: 'Could not match to existing series',
        sourcePath: filePath,
        matchMethod,
        matchConfidence,
      };
    }
  }

  // Find or create episode
  const episode = await findOrCreateEpisode(series, parsed.absoluteEpisodeNumbers[0]);

  // Check if upgrade
  const existingFile = episode.episodeFile;
  if (existingFile) {
    const existingScore = calculateAnimeQualityScore(existingFile, series.qualityProfile);
    const newScore = calculateAnimeQualityScore(parsed, series.qualityProfile);

    if (newScore.totalScore <= existingScore.totalScore) {
      return {
        success: false,
        action: 'skipped',
        reason: 'Existing file is equal or better quality',
        sourcePath: filePath,
        matchMethod,
        matchConfidence,
      };
    }
  }

  // Perform import
  const destinationPath = buildAnimePath(episode, series, parsed, config);

  await performFileOperation(filePath, destinationPath, config);

  // Update database
  await updateEpisodeFile(episode.id, {
    path: destinationPath,
    quality: parsed.quality,
    releaseGroup: parsed.releaseGroup,
    version: parsed.version,
    crc32: parsed.crc32,
    isDualAudio: parsed.isDualAudio,
  });

  return {
    success: true,
    seriesId: series.id,
    episodeId: episode.id,
    action: existingFile ? 'upgraded' : 'imported',
    sourcePath: filePath,
    destinationPath,
    matchMethod,
    matchConfidence,
  };
}
```

### Monitoring and Automation

```typescript
interface AnimeMonitoringConfig {
  // New series monitoring
  monitorNewSeasons: boolean;
  monitorSpecials: boolean;
  monitorMovies: boolean;

  // Search behavior
  searchOnAdd: boolean;
  searchForMissing: boolean;
  searchForCutoffUnmet: boolean;

  // Automation
  autoDownloadSimulcasts: boolean;
  autoDownloadBDUpgrades: boolean;

  // Timing
  rssCheckIntervalMinutes: number;
  simulcastSearchHoursAfterAir: number;

  // Filters
  minimumSeeders: number;
  requireVerifiedUploaders: boolean;
}

interface AnimeAutomationRule {
  id: number;
  name: string;
  enabled: boolean;

  // Conditions
  conditions: AnimeAutomationCondition[];

  // Actions
  actions: AnimeAutomationAction[];

  // Priority
  priority: number;
}

interface AnimeAutomationCondition {
  type: 'season' | 'format' | 'genre' | 'studio' | 'tag' | 'score';
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan';
  value: string | number;
}

interface AnimeAutomationAction {
  type: 'monitor' | 'setQualityProfile' | 'setRootFolder' | 'addTag' | 'setReleaseGroup';
  value: string | number;
}

// Example automation rules
const EXAMPLE_AUTOMATION_RULES: AnimeAutomationRule[] = [
  {
    id: 1,
    name: 'High Score Anime - Best Quality',
    enabled: true,
    conditions: [
      { type: 'score', operator: 'greaterThan', value: 80 },
    ],
    actions: [
      { type: 'monitor', value: 'all' },
      { type: 'setQualityProfile', value: 'Anime - Best' },
    ],
    priority: 1,
  },

  {
    id: 2,
    name: 'Seasonal Anime - Standard Quality',
    enabled: true,
    conditions: [
      { type: 'season', operator: 'equals', value: 'current' },
    ],
    actions: [
      { type: 'monitor', value: 'future' },
      { type: 'setQualityProfile', value: 'Anime - Standard' },
      { type: 'setReleaseGroup', value: 'SubsPlease' },
    ],
    priority: 2,
  },

  {
    id: 3,
    name: 'MAPPA Studio - Prefer BD',
    enabled: true,
    conditions: [
      { type: 'studio', operator: 'equals', value: 'MAPPA' },
    ],
    actions: [
      { type: 'setQualityProfile', value: 'Anime - BD Preferred' },
      { type: 'addTag', value: 'mappa' },
    ],
    priority: 3,
  },
];
```

---

## Appendix: Database Schema Extensions

```sql
-- Anime-specific series fields (extends base series table)
ALTER TABLE series ADD COLUMN IF NOT EXISTS anime_data JSONB;

-- Anime data structure
COMMENT ON COLUMN series.anime_data IS 'JSON structure: {
  "anilistId": number,
  "anidbId": number,
  "malId": number,
  "format": "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL",
  "season": "WINTER" | "SPRING" | "SUMMER" | "FALL",
  "seasonYear": number,
  "titles": {
    "romaji": string,
    "english": string,
    "native": string
  },
  "studios": string[],
  "source": string,
  "genres": string[],
  "tags": { "name": string, "rank": number }[],
  "relations": { "type": string, "targetId": string }[]
}';

-- Anime episode extensions
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS absolute_episode_number INTEGER;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS scene_absolute_number INTEGER;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS anidb_episode_number VARCHAR(10);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS special_type VARCHAR(20);

-- Anime file extensions
ALTER TABLE episode_files ADD COLUMN IF NOT EXISTS release_type VARCHAR(20);
ALTER TABLE episode_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE episode_files ADD COLUMN IF NOT EXISTS crc32 VARCHAR(8);
ALTER TABLE episode_files ADD COLUMN IF NOT EXISTS is_dual_audio BOOLEAN DEFAULT FALSE;
ALTER TABLE episode_files ADD COLUMN IF NOT EXISTS video_bit_depth INTEGER DEFAULT 8;

-- Anime release group preferences
CREATE TABLE IF NOT EXISTS anime_release_group_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  preferred_groups TEXT[],
  blocked_groups TEXT[],
  prefer_fansubs BOOLEAN DEFAULT FALSE,
  prefer_bd_releases BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anime scene mappings
CREATE TABLE IF NOT EXISTS anime_scene_mappings (
  id SERIAL PRIMARY KEY,
  series_id INTEGER REFERENCES series(id),
  tvdb_id INTEGER,
  anidb_id INTEGER,
  mappings JSONB,
  source VARCHAR(20),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anime seasonal tracking
CREATE TABLE IF NOT EXISTS anime_seasonal_entries (
  id SERIAL PRIMARY KEY,
  anilist_id INTEGER UNIQUE,
  title_romaji VARCHAR(500),
  title_english VARCHAR(500),
  format VARCHAR(20),
  season VARCHAR(10),
  season_year INTEGER,
  start_date DATE,
  episodes INTEGER,
  next_airing_episode INTEGER,
  next_airing_at TIMESTAMP,
  is_monitored BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_seasonal_season ON anime_seasonal_entries(season_year, season);
CREATE INDEX idx_seasonal_airing ON anime_seasonal_entries(next_airing_at);
```

---

## Summary

This specification establishes anime as a **first-class media type** in idkarr with:

1. **Dedicated Data Model** - Anime-specific interfaces for series, episodes, and files that properly handle absolute numbering, OVA/ONA types, and anime metadata.

2. **Multi-Provider Metadata** - Integration with AniList, AniDB, MyAnimeList, and mapping services for comprehensive anime information.

3. **Specialized Parsing** - Anime-aware filename parsing that understands `[Group]` prefixes, version tags, CRC32 hashes, and anime-specific quality indicators.

4. **Seasonal Tracking** - Built-in support for anime seasons (Winter/Spring/Summer/Fall) and cour-based release schedules.

5. **Release Group Intelligence** - Database of known release groups with quality and reliability ratings.

6. **Quality Optimization** - Anime-specific quality profiles that prioritize 10-bit video, HEVC encoding, and BD upgrades.

7. **Simulcast Support** - Same-day release tracking with automatic BD upgrade paths.

8. **Scene Numbering Resolution** - XEM integration and manual mapping support for handling scene vs official numbering differences.

9. **Flexible Folder Structure** - Naming templates optimized for anime that work with various media servers.

10. **Full Integration** - Anime-specific indexers (Nyaa, AnimeTosho), download client categories, and media server agents.

Anime users deserve tooling that understands their media. This specification ensures idkarr provides that experience.
