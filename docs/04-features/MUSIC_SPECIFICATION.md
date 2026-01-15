# Music Specification

> Comprehensive specification for music management in idkarr, providing full Lidarr parity with unified media management capabilities.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Data Model](#data-model)
  - [Artist](#artist)
  - [Album](#album)
  - [Track](#track)
  - [Release Groups](#release-groups)
  - [Multi-Artist Support](#multi-artist-support)
  - [Compilations](#compilations)
- [Metadata Providers](#metadata-providers)
  - [MusicBrainz Integration](#musicbrainz-integration)
  - [Release vs Release Group](#release-vs-release-group)
  - [Fanart.tv Integration](#fanarttv-integration)
  - [Provider Fallback Chain](#provider-fallback-chain)
- [Audio Quality Profiles](#audio-quality-profiles)
  - [Quality Definitions](#quality-definitions)
  - [Format Specifications](#format-specifications)
  - [Quality Scoring](#quality-scoring)
  - [Preferred Quality Selection](#preferred-quality-selection)
- [Music Parsing](#music-parsing)
  - [Release Name Patterns](#release-name-patterns)
  - [Quality Detection](#quality-detection)
  - [Tag Extraction](#tag-extraction)
  - [Edge Cases](#edge-cases)
- [Folder Structure](#folder-structure)
  - [Artist Organization](#artist-organization)
  - [Album Organization](#album-organization)
  - [Multi-Disc Handling](#multi-disc-handling)
  - [Naming Tokens](#naming-tokens)
- [Import Flow](#import-flow)
  - [File Discovery](#file-discovery)
  - [Metadata Matching](#metadata-matching)
  - [Quality Assessment](#quality-assessment)
  - [File Organization](#file-organization)
- [Music-Specific Features](#music-specific-features)
  - [Discography Tracking](#discography-tracking)
  - [Featured Artists](#featured-artists)
  - [Album Types](#album-types)
  - [Release Editions](#release-editions)
- [Integration Points](#integration-points)
  - [Indexer Integration](#indexer-integration)
  - [Download Client Integration](#download-client-integration)
  - [Notification Integration](#notification-integration)
- [Related Documents](#related-documents)

---

## Overview

Music management in idkarr provides comprehensive support for organizing, tracking, and acquiring music content. The system is designed to handle the complex hierarchical nature of music metadata while maintaining consistency with idkarr's unified media management approach.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Artist Management** | Track artists, their discographies, and associated metadata |
| **Album Tracking** | Monitor albums with support for various release types and editions |
| **Quality Management** | Define and enforce audio quality preferences |
| **Automated Downloads** | Search indexers and manage downloads for wanted music |
| **Library Organization** | Automatically organize music files with consistent naming |
| **Metadata Enrichment** | Pull comprehensive metadata from MusicBrainz and other sources |

### Music vs Other Media Types

Music differs from other media types in idkarr in several key ways:

| Aspect | Movies/Series | Music |
|--------|---------------|-------|
| **Hierarchy** | Movie or Series → Season → Episode | Artist → Album → Track |
| **Releases** | Single canonical release | Multiple release groups (original, remaster, deluxe) |
| **Quality** | Video codecs (H.264, H.265) | Audio codecs (FLAC, MP3, AAC) |
| **Metadata Source** | TMDB/TVDB | MusicBrainz |
| **File Count** | 1 file per item | Multiple files per album |
| **Artist Credit** | Cast/Crew | Primary artist, featured artists, composers |

---

## Design Principles

1. **MusicBrainz-First**: Use MusicBrainz as the authoritative source for music metadata
2. **Release Group Awareness**: Track release groups separately from individual releases
3. **Quality Flexibility**: Support both lossless and lossy formats with configurable preferences
4. **Multi-Artist Support**: Handle collaborations, featured artists, and various artists compilations
5. **Unified Experience**: Maintain consistency with idkarr's approach to other media types
6. **Discography Completeness**: Enable users to track and complete artist discographies
7. **Edition Tracking**: Distinguish between original releases, remasters, deluxe editions

---

## Data Model

### Artist

The Artist entity represents a musical artist or band.

```typescript
/**
 * Represents a musical artist in the idkarr system.
 * Artists are the top-level entity in the music hierarchy.
 */
interface Artist {
  /** Internal idkarr identifier */
  id: string;

  /** MusicBrainz Artist ID (MBID) */
  musicBrainzId: string;

  /** Primary artist name */
  name: string;

  /** Name used for sorting (e.g., "Beatles, The") */
  sortName: string;

  /** Artist disambiguation (e.g., "UK rock band") */
  disambiguation?: string;

  /** Artist type */
  type: ArtistType;

  /** Artist status in idkarr */
  status: ArtistStatus;

  /** Quality profile for this artist */
  qualityProfileId: string;

  /** Metadata profile for this artist */
  metadataProfileId: string;

  /** Root folder path for this artist */
  rootFolderPath: string;

  /** Full path to artist folder */
  path: string;

  /** Whether to monitor new releases */
  monitored: boolean;

  /** Monitor type for new albums */
  monitorNewItems: MonitorNewItemsType;

  /** Artist overview/biography */
  overview?: string;

  /** Artist images */
  images: ArtistImage[];

  /** Associated genres */
  genres: string[];

  /** External links */
  links: ExternalLink[];

  /** Associated tags */
  tags: string[];

  /** Career start date */
  beginDate?: Date;

  /** Career end date (if disbanded/deceased) */
  endDate?: Date;

  /** Associated record labels */
  labels: string[];

  /** Country of origin (ISO 3166-1 alpha-2) */
  country?: string;

  /** Artist rating (0-10) */
  rating?: number;

  /** Timestamp of last metadata refresh */
  lastInfoSync?: Date;

  /** Timestamp of last disk scan */
  lastDiskSync?: Date;

  /** Record timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/** Artist type classification */
type ArtistType =
  | 'person'      // Solo artist
  | 'group'       // Band or musical group
  | 'orchestra'   // Classical orchestra
  | 'choir'       // Vocal choir
  | 'character'   // Fictional character
  | 'other';      // Other type

/** Artist monitoring status */
type ArtistStatus =
  | 'continuing'  // Still active/releasing music
  | 'ended'       // Disbanded or deceased
  | 'unknown';    // Status unknown

/** Monitor behavior for new items */
type MonitorNewItemsType =
  | 'all'         // Monitor all new albums
  | 'none'        // Don't monitor new albums
  | 'new';        // Monitor only future releases

/** Artist image types */
interface ArtistImage {
  /** Image type */
  type: 'poster' | 'banner' | 'fanart' | 'logo' | 'thumb';
  /** Image URL */
  url: string;
  /** Remote URL (original source) */
  remoteUrl?: string;
}

/** External link to artist profiles */
interface ExternalLink {
  /** Link type */
  type: 'discogs' | 'wikipedia' | 'official' | 'twitter' | 'facebook' | 'instagram' | 'allmusic' | 'lastfm';
  /** URL */
  url: string;
}
```

### Album

The Album entity represents a music release (album, EP, single, etc.).

```typescript
/**
 * Represents a music album/release in the idkarr system.
 * Albums belong to one or more artists and contain tracks.
 */
interface Album {
  /** Internal idkarr identifier */
  id: string;

  /** MusicBrainz Release Group ID */
  musicBrainzReleaseGroupId: string;

  /** MusicBrainz Release ID (specific release within group) */
  musicBrainzReleaseId?: string;

  /** Parent artist ID */
  artistId: string;

  /** Album title */
  title: string;

  /** Title used for sorting */
  sortTitle: string;

  /** Album disambiguation */
  disambiguation?: string;

  /** Album type */
  albumType: AlbumType;

  /** Secondary types (live, compilation, remix, etc.) */
  secondaryTypes: AlbumSecondaryType[];

  /** Release status */
  releaseStatus: ReleaseStatus;

  /** Original release date */
  releaseDate?: Date;

  /** This specific release date */
  releaseVersionDate?: Date;

  /** Release edition/version */
  edition?: string;

  /** Is this the preferred release in the group */
  isPreferredRelease: boolean;

  /** Whether this album is monitored */
  monitored: boolean;

  /** Album overview/description */
  overview?: string;

  /** Album images */
  images: AlbumImage[];

  /** Associated genres */
  genres: string[];

  /** Associated tags */
  tags: string[];

  /** Record label */
  label?: string;

  /** Catalog number */
  catalogNumber?: string;

  /** Country of release (ISO 3166-1 alpha-2) */
  country?: string;

  /** Media format of physical release */
  mediaFormat?: MediaFormat;

  /** Number of discs */
  discCount: number;

  /** Total track count */
  trackCount: number;

  /** Total duration in seconds */
  duration: number;

  /** Album rating (0-10) */
  rating?: number;

  /** Artist credits for this album */
  artistCredits: ArtistCredit[];

  /** Path to album folder */
  path?: string;

  /** Quality of current files */
  quality?: QualityDefinition;

  /** Download statistics */
  statistics: AlbumStatistics;

  /** Record timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/** Primary album type */
type AlbumType =
  | 'album'       // Full-length album (LP)
  | 'ep'          // Extended play
  | 'single'      // Single release
  | 'broadcast'   // Radio/podcast broadcast
  | 'other';      // Other type

/** Secondary album type modifiers */
type AlbumSecondaryType =
  | 'compilation'     // Compilation/greatest hits
  | 'soundtrack'      // Film/game soundtrack
  | 'spokenword'      // Audiobook, podcast
  | 'interview'       // Interview recording
  | 'live'            // Live recording
  | 'remix'           // Remix album
  | 'djmix'           // DJ mix
  | 'mixtape'         // Mixtape/street album
  | 'demo'            // Demo recording
  | 'audiobook'       // Audiobook
  | 'audiodrama';     // Audio drama

/** Release status in MusicBrainz */
type ReleaseStatus =
  | 'official'        // Official release
  | 'promotional'     // Promotional release
  | 'bootleg'         // Unofficial/bootleg
  | 'pseudoRelease';  // Pseudo-release

/** Physical media format */
type MediaFormat =
  | 'cd'              // Compact Disc
  | 'vinyl'           // Vinyl record
  | 'cassette'        // Audio cassette
  | 'digital'         // Digital download
  | 'streaming'       // Streaming only
  | 'sacd'            // Super Audio CD
  | 'dvdAudio'        // DVD-Audio
  | 'blurayAudio';    // Blu-ray Audio

/** Album image types */
interface AlbumImage {
  type: 'cover' | 'disc' | 'back' | 'booklet' | 'medium';
  url: string;
  remoteUrl?: string;
}

/** Album statistics */
interface AlbumStatistics {
  trackCount: number;
  trackFileCount: number;
  percentComplete: number;
  sizeOnDisk: number;
}
```

### Track

The Track entity represents an individual song or audio track.

```typescript
/**
 * Represents an individual track/song in an album.
 */
interface Track {
  /** Internal idkarr identifier */
  id: string;

  /** MusicBrainz Recording ID */
  musicBrainzRecordingId: string;

  /** MusicBrainz Track ID (specific to release) */
  musicBrainzTrackId?: string;

  /** Parent album ID */
  albumId: string;

  /** Track title */
  title: string;

  /** Track number on disc */
  trackNumber: number;

  /** Disc number */
  discNumber: number;

  /** Absolute track number across all discs */
  absoluteTrackNumber: number;

  /** Duration in milliseconds */
  duration: number;

  /** Whether this track has explicit content */
  explicit: boolean;

  /** Whether this track is monitored */
  monitored: boolean;

  /** Track rating (0-10) */
  rating?: number;

  /** Artist credits for this track */
  artistCredits: ArtistCredit[];

  /** Associated track file (if exists) */
  trackFile?: TrackFile;

  /** Record timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a physical audio file on disk.
 */
interface TrackFile {
  /** Internal idkarr identifier */
  id: string;

  /** Associated track ID */
  trackId: string;

  /** Associated album ID */
  albumId: string;

  /** Associated artist ID */
  artistId: string;

  /** Relative path from root folder */
  relativePath: string;

  /** Full path to file */
  path: string;

  /** File size in bytes */
  size: number;

  /** File quality */
  quality: QualityDefinition;

  /** Audio codec */
  codec: AudioCodec;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Bit depth */
  bitDepth?: number;

  /** Bitrate in kbps */
  bitrate: number;

  /** Number of audio channels */
  channels: number;

  /** Duration in milliseconds */
  duration: number;

  /** Embedded tags */
  tags: AudioTags;

  /** File hash for deduplication */
  hash?: string;

  /** Date file was added */
  dateAdded: Date;

  /** Scene name if from scene release */
  sceneName?: string;

  /** Release group */
  releaseGroup?: string;

  /** Record timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/** Audio codec types */
type AudioCodec =
  | 'flac'        // Free Lossless Audio Codec
  | 'alac'        // Apple Lossless Audio Codec
  | 'wav'         // Waveform Audio
  | 'aiff'        // Audio Interchange File Format
  | 'mp3'         // MPEG Audio Layer III
  | 'aac'         // Advanced Audio Coding
  | 'ogg'         // Ogg Vorbis
  | 'opus'        // Opus
  | 'wma'         // Windows Media Audio
  | 'ape'         // Monkey's Audio
  | 'wavpack'     // WavPack
  | 'dsd'         // Direct Stream Digital
  | 'unknown';    // Unknown codec

/** Embedded audio tags */
interface AudioTags {
  title?: string;
  artist?: string;
  albumArtist?: string;
  album?: string;
  year?: number;
  trackNumber?: number;
  trackTotal?: number;
  discNumber?: number;
  discTotal?: number;
  genre?: string[];
  comment?: string;
  composer?: string;
  conductor?: string;
  lyrics?: string;
  musicBrainzArtistId?: string;
  musicBrainzAlbumId?: string;
  musicBrainzTrackId?: string;
  replayGain?: ReplayGainTags;
}

/** ReplayGain normalization tags */
interface ReplayGainTags {
  trackGain?: number;
  trackPeak?: number;
  albumGain?: number;
  albumPeak?: number;
}
```

### Release Groups

Release groups allow tracking multiple versions of the same album.

```typescript
/**
 * Represents a MusicBrainz Release Group.
 * A release group contains multiple releases that are essentially
 * the same album (original, remaster, deluxe, etc.).
 */
interface ReleaseGroup {
  /** MusicBrainz Release Group ID */
  musicBrainzId: string;

  /** Title of the release group */
  title: string;

  /** Primary type */
  primaryType: AlbumType;

  /** Secondary types */
  secondaryTypes: AlbumSecondaryType[];

  /** Original release date */
  firstReleaseDate?: Date;

  /** Artist credits */
  artistCredits: ArtistCredit[];

  /** Available releases in this group */
  releases: ReleaseInfo[];
}

/**
 * Information about a specific release within a release group.
 */
interface ReleaseInfo {
  /** MusicBrainz Release ID */
  musicBrainzId: string;

  /** Release title (may differ from group title) */
  title: string;

  /** Release date */
  releaseDate?: Date;

  /** Country of release */
  country?: string;

  /** Release status */
  status: ReleaseStatus;

  /** Record label */
  label?: string;

  /** Catalog number */
  catalogNumber?: string;

  /** Media format */
  format?: MediaFormat;

  /** Track count */
  trackCount: number;

  /** Disc count */
  discCount: number;

  /** Edition name (e.g., "Deluxe Edition", "Remastered") */
  edition?: string;

  /** Quality score for release selection */
  qualityScore: number;
}

/**
 * User preferences for release selection within groups.
 */
interface ReleasePreferences {
  /** Preferred countries (ISO codes, in order) */
  preferredCountries: string[];

  /** Preferred formats */
  preferredFormats: MediaFormat[];

  /** Include releases with these statuses */
  includeStatuses: ReleaseStatus[];

  /** Minimum track count (filter out incomplete releases) */
  minimumTrackCount?: number;

  /** Prefer releases with specific editions */
  preferredEditions: string[];

  /** Avoid releases with these edition keywords */
  avoidEditions: string[];
}
```

### Multi-Artist Support

Support for tracks and albums with multiple artists.

```typescript
/**
 * Represents an artist credit on an album or track.
 * Handles primary artists, featured artists, and collaborations.
 */
interface ArtistCredit {
  /** Position in credit list */
  position: number;

  /** Artist ID (if artist exists in library) */
  artistId?: string;

  /** MusicBrainz Artist ID */
  musicBrainzArtistId: string;

  /** Artist name as credited */
  name: string;

  /** Join phrase to next artist (e.g., " & ", " feat. ") */
  joinPhrase?: string;

  /** Credit type */
  creditType: ArtistCreditType;
}

/** Types of artist credits */
type ArtistCreditType =
  | 'primary'      // Primary/main artist
  | 'featured'     // Featured artist
  | 'guest'        // Guest appearance
  | 'remixer'      // Remixer
  | 'producer'     // Producer
  | 'composer'     // Composer/songwriter
  | 'conductor'    // Conductor
  | 'orchestra'    // Orchestra
  | 'choir'        // Choir
  | 'compiler';    // Compilation compiler

/**
 * Helper function to build display string from credits.
 */
function buildArtistCreditString(credits: ArtistCredit[]): string {
  return credits
    .sort((a, b) => a.position - b.position)
    .map((credit, index, arr) => {
      const name = credit.name;
      const join = index < arr.length - 1 ? (credit.joinPhrase || ', ') : '';
      return name + join;
    })
    .join('');
}

// Example: "Artist A feat. Artist B & Artist C"
```

### Compilations

Special handling for various artists compilations and soundtracks.

```typescript
/**
 * Configuration for handling compilation albums.
 */
interface CompilationConfig {
  /** How to handle various artists compilations */
  variousArtistsHandling: VariousArtistsHandling;

  /** Custom "Various Artists" folder name */
  variousArtistsFolderName: string;

  /** Whether to create artist folders for compilation tracks */
  createArtistFoldersForCompilations: boolean;

  /** Minimum percentage of tracks by one artist to not be "Various" */
  singleArtistThreshold: number;
}

/** How to organize various artists compilations */
type VariousArtistsHandling =
  | 'variousArtistsFolder'   // Put in "Various Artists" folder
  | 'standardFolder'         // Use standard album artist folder
  | 'compilationsFolder';    // Put in dedicated "Compilations" folder

/**
 * Determine if an album is a various artists compilation.
 */
interface CompilationDetection {
  /** Album has "Various Artists" as album artist */
  hasVariousArtistsTag: boolean;

  /** Album has compilation secondary type */
  hasCompilationType: boolean;

  /** Track artists are mostly different */
  hasDiverseTrackArtists: boolean;

  /** Percentage of tracks by primary artist */
  primaryArtistPercentage: number;
}
```

---

## Metadata Providers

### MusicBrainz Integration

MusicBrainz serves as the primary metadata source for music in idkarr.

```typescript
/**
 * MusicBrainz API client configuration.
 */
interface MusicBrainzConfig {
  /** Base API URL */
  baseUrl: string;

  /** User agent for API requests (required by MB) */
  userAgent: string;

  /** Rate limit (requests per second) */
  rateLimit: number;

  /** Include these relationships in queries */
  includeRelationships: MusicBrainzRelationship[];

  /** Mirror URL (optional, for self-hosted) */
  mirrorUrl?: string;
}

/** Default MusicBrainz configuration */
const DEFAULT_MUSICBRAINZ_CONFIG: MusicBrainzConfig = {
  baseUrl: 'https://musicbrainz.org/ws/2',
  userAgent: 'idkarr/1.0.0 (https://github.com/idkarr/idkarr)',
  rateLimit: 1.0, // 1 request per second
  includeRelationships: [
    'artist-rels',
    'release-group-rels',
    'url-rels',
    'recording-rels'
  ]
};

/** MusicBrainz relationship types to fetch */
type MusicBrainzRelationship =
  | 'artist-rels'
  | 'release-group-rels'
  | 'release-rels'
  | 'recording-rels'
  | 'work-rels'
  | 'url-rels'
  | 'area-rels'
  | 'label-rels';

/**
 * MusicBrainz search result for artists.
 */
interface MusicBrainzArtistSearchResult {
  id: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  score: number;
  tags?: Array<{ name: string; count: number }>;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended: boolean;
  };
}

/**
 * MusicBrainz search result for release groups.
 */
interface MusicBrainzReleaseGroupSearchResult {
  id: string;
  title: string;
  primaryType?: string;
  secondaryTypes?: string[];
  artistCredit: Array<{
    artist: { id: string; name: string };
    joinphrase?: string;
  }>;
  firstReleaseDate?: string;
  score: number;
}
```

### Release vs Release Group

Understanding the distinction between releases and release groups is crucial.

```typescript
/**
 * MusicBrainz Entity Hierarchy:
 *
 * ARTIST
 *   └── RELEASE GROUP (conceptual album)
 *         ├── RELEASE (specific version - US CD, UK Vinyl, etc.)
 *         │     └── MEDIUM (disc 1, disc 2)
 *         │           └── TRACK (position on medium)
 *         │                 └── RECORDING (actual audio)
 *         └── RELEASE (another version)
 *               └── ...
 */

/**
 * Strategy for selecting preferred release from a release group.
 */
interface ReleaseSelectionStrategy {
  /** Score multipliers for different criteria */
  scoring: {
    /** Bonus for matching preferred country */
    countryMatch: number;
    /** Bonus for matching preferred format */
    formatMatch: number;
    /** Bonus for official status */
    officialStatus: number;
    /** Penalty per missing track vs max */
    missingTrackPenalty: number;
    /** Bonus for remaster (if preferred) */
    remasterBonus: number;
    /** Bonus for original release (if preferred) */
    originalBonus: number;
  };

  /** Preferred release characteristics */
  preferences: ReleasePreferences;
}

/**
 * Default release selection scoring.
 */
const DEFAULT_RELEASE_SCORING: ReleaseSelectionStrategy = {
  scoring: {
    countryMatch: 100,
    formatMatch: 50,
    officialStatus: 200,
    missingTrackPenalty: -25,
    remasterBonus: 0,
    originalBonus: 0
  },
  preferences: {
    preferredCountries: ['US', 'GB', 'XW'], // XW = Worldwide
    preferredFormats: ['digital', 'cd'],
    includeStatuses: ['official'],
    preferredEditions: [],
    avoidEditions: ['clean', 'censored']
  }
};

/**
 * Calculate release score for selection.
 */
function calculateReleaseScore(
  release: ReleaseInfo,
  strategy: ReleaseSelectionStrategy,
  maxTrackCount: number
): number {
  let score = 0;

  // Country matching
  const countryIndex = strategy.preferences.preferredCountries
    .indexOf(release.country || '');
  if (countryIndex >= 0) {
    score += strategy.scoring.countryMatch * (1 - countryIndex * 0.1);
  }

  // Format matching
  if (release.format && strategy.preferences.preferredFormats.includes(release.format)) {
    score += strategy.scoring.formatMatch;
  }

  // Official status bonus
  if (release.status === 'official') {
    score += strategy.scoring.officialStatus;
  }

  // Track count penalty
  const missingTracks = maxTrackCount - release.trackCount;
  score += missingTracks * strategy.scoring.missingTrackPenalty;

  // Edition bonuses
  if (release.edition) {
    const editionLower = release.edition.toLowerCase();
    if (editionLower.includes('remaster')) {
      score += strategy.scoring.remasterBonus;
    }
    if (strategy.preferences.avoidEditions.some(e =>
      editionLower.includes(e.toLowerCase())
    )) {
      score -= 500; // Heavy penalty for avoided editions
    }
  }

  return score;
}
```

### Fanart.tv Integration

Additional artwork from Fanart.tv.

```typescript
/**
 * Fanart.tv configuration for music artwork.
 */
interface FanartTvConfig {
  /** API key */
  apiKey: string;

  /** Base API URL */
  baseUrl: string;

  /** Preferred image languages */
  preferredLanguages: string[];
}

/**
 * Fanart.tv music artist images response.
 */
interface FanartTvArtistImages {
  /** Artist backgrounds */
  artistbackground?: FanartTvImage[];
  /** Artist thumbnails */
  artistthumb?: FanartTvImage[];
  /** HD music logos */
  hdmusiclogo?: FanartTvImage[];
  /** Music logos */
  musiclogo?: FanartTvImage[];
  /** Music banners */
  musicbanner?: FanartTvImage[];
}

/**
 * Fanart.tv album images response.
 */
interface FanartTvAlbumImages {
  /** Album covers */
  albumcover?: FanartTvImage[];
  /** CD art (disc images) */
  cdart?: FanartTvImage[];
}

interface FanartTvImage {
  id: string;
  url: string;
  lang: string;
  likes: string;
}
```

### Provider Fallback Chain

Order of metadata provider consultation.

```typescript
/**
 * Metadata provider priority configuration.
 */
interface MetadataProviderChain {
  /** Primary provider (always consulted first) */
  primary: 'musicbrainz';

  /** Secondary providers in order */
  secondary: MetadataProvider[];

  /** Artwork providers in order */
  artwork: ArtworkProvider[];
}

type MetadataProvider =
  | 'musicbrainz'
  | 'lastfm'
  | 'discogs';

type ArtworkProvider =
  | 'musicbrainz'    // Cover Art Archive
  | 'fanart.tv'
  | 'lastfm'
  | 'discogs'
  | 'embedded';      // Extract from audio files

const DEFAULT_PROVIDER_CHAIN: MetadataProviderChain = {
  primary: 'musicbrainz',
  secondary: ['lastfm'],
  artwork: ['musicbrainz', 'fanart.tv', 'embedded']
};
```

---

## Audio Quality Profiles

### Quality Definitions

```typescript
/**
 * Audio quality definition.
 */
interface AudioQualityDefinition {
  /** Quality ID */
  id: number;

  /** Quality name */
  name: string;

  /** Quality category */
  category: QualityCategory;

  /** Lossless or lossy */
  isLossless: boolean;

  /** Minimum bitrate in kbps (for lossy) */
  minBitrate?: number;

  /** Maximum bitrate in kbps (for lossy) */
  maxBitrate?: number;

  /** Expected bit depth (for lossless) */
  bitDepth?: number;

  /** Expected sample rate range */
  sampleRateRange?: {
    min: number;
    max: number;
  };

  /** Quality weight for comparison */
  weight: number;

  /** Allowed codecs for this quality */
  allowedCodecs: AudioCodec[];
}

type QualityCategory =
  | 'lossless'      // CD quality and above
  | 'highBitrate'   // High quality lossy (256+ kbps)
  | 'standard'      // Standard lossy (128-255 kbps)
  | 'low';          // Low quality (<128 kbps)
```

### Format Specifications

| Quality Name | Category | Lossless | Bitrate | Bit Depth | Sample Rate | Weight |
|--------------|----------|----------|---------|-----------|-------------|--------|
| FLAC 24-bit | lossless | Yes | - | 24 | 44.1-192 kHz | 1000 |
| FLAC | lossless | Yes | - | 16 | 44.1 kHz | 900 |
| ALAC 24-bit | lossless | Yes | - | 24 | 44.1-192 kHz | 950 |
| ALAC | lossless | Yes | - | 16 | 44.1 kHz | 850 |
| WAV | lossless | Yes | - | 16-24 | 44.1+ kHz | 800 |
| AIFF | lossless | Yes | - | 16-24 | 44.1+ kHz | 800 |
| MP3 320 | highBitrate | No | 320 | - | - | 500 |
| MP3 V0 | highBitrate | No | 220-260 | - | - | 480 |
| AAC 320 | highBitrate | No | 320 | - | - | 490 |
| MP3 256 | highBitrate | No | 256 | - | - | 400 |
| OGG Q10 | highBitrate | No | ~500 | - | - | 470 |
| Opus 256 | highBitrate | No | 256 | - | - | 485 |
| MP3 V2 | standard | No | 170-210 | - | - | 300 |
| MP3 192 | standard | No | 192 | - | - | 250 |
| MP3 128 | standard | No | 128 | - | - | 100 |
| Unknown | low | No | <128 | - | - | 0 |

```typescript
/**
 * Predefined audio quality definitions.
 */
const AUDIO_QUALITY_DEFINITIONS: AudioQualityDefinition[] = [
  {
    id: 1,
    name: 'FLAC 24-bit',
    category: 'lossless',
    isLossless: true,
    bitDepth: 24,
    sampleRateRange: { min: 44100, max: 192000 },
    weight: 1000,
    allowedCodecs: ['flac']
  },
  {
    id: 2,
    name: 'FLAC',
    category: 'lossless',
    isLossless: true,
    bitDepth: 16,
    sampleRateRange: { min: 44100, max: 48000 },
    weight: 900,
    allowedCodecs: ['flac']
  },
  {
    id: 3,
    name: 'ALAC 24-bit',
    category: 'lossless',
    isLossless: true,
    bitDepth: 24,
    sampleRateRange: { min: 44100, max: 192000 },
    weight: 950,
    allowedCodecs: ['alac']
  },
  {
    id: 4,
    name: 'ALAC',
    category: 'lossless',
    isLossless: true,
    bitDepth: 16,
    sampleRateRange: { min: 44100, max: 48000 },
    weight: 850,
    allowedCodecs: ['alac']
  },
  {
    id: 5,
    name: 'WAV',
    category: 'lossless',
    isLossless: true,
    weight: 800,
    allowedCodecs: ['wav']
  },
  {
    id: 10,
    name: 'MP3 320',
    category: 'highBitrate',
    isLossless: false,
    minBitrate: 315,
    maxBitrate: 325,
    weight: 500,
    allowedCodecs: ['mp3']
  },
  {
    id: 11,
    name: 'MP3 V0',
    category: 'highBitrate',
    isLossless: false,
    minBitrate: 220,
    maxBitrate: 260,
    weight: 480,
    allowedCodecs: ['mp3']
  },
  {
    id: 12,
    name: 'AAC 320',
    category: 'highBitrate',
    isLossless: false,
    minBitrate: 315,
    maxBitrate: 325,
    weight: 490,
    allowedCodecs: ['aac']
  },
  {
    id: 20,
    name: 'MP3 256',
    category: 'highBitrate',
    isLossless: false,
    minBitrate: 250,
    maxBitrate: 260,
    weight: 400,
    allowedCodecs: ['mp3']
  },
  {
    id: 30,
    name: 'MP3 192',
    category: 'standard',
    isLossless: false,
    minBitrate: 185,
    maxBitrate: 200,
    weight: 250,
    allowedCodecs: ['mp3']
  },
  {
    id: 40,
    name: 'MP3 128',
    category: 'standard',
    isLossless: false,
    minBitrate: 125,
    maxBitrate: 135,
    weight: 100,
    allowedCodecs: ['mp3']
  },
  {
    id: 99,
    name: 'Unknown',
    category: 'low',
    isLossless: false,
    weight: 0,
    allowedCodecs: ['unknown']
  }
];
```

### Quality Scoring

```typescript
/**
 * Quality profile for an artist or globally.
 */
interface QualityProfile {
  /** Profile ID */
  id: string;

  /** Profile name */
  name: string;

  /** Cutoff quality ID (minimum acceptable) */
  cutoffQualityId: number;

  /** Preferred qualities in order */
  preferredQualities: number[];

  /** Whether to upgrade from cutoff to preferred */
  upgradeAllowed: boolean;

  /** Qualities to accept */
  acceptedQualities: AcceptedQuality[];
}

interface AcceptedQuality {
  /** Quality definition ID */
  qualityId: number;

  /** Whether this quality is allowed */
  allowed: boolean;
}

/**
 * Predefined quality profiles.
 */
const QUALITY_PROFILES: QualityProfile[] = [
  {
    id: 'lossless',
    name: 'Lossless',
    cutoffQualityId: 2, // FLAC
    preferredQualities: [1, 2, 3, 4], // 24-bit FLAC, FLAC, 24-bit ALAC, ALAC
    upgradeAllowed: true,
    acceptedQualities: [
      { qualityId: 1, allowed: true },
      { qualityId: 2, allowed: true },
      { qualityId: 3, allowed: true },
      { qualityId: 4, allowed: true },
      { qualityId: 5, allowed: true },
      { qualityId: 10, allowed: false },
      { qualityId: 11, allowed: false }
    ]
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    cutoffQualityId: 10, // MP3 320
    preferredQualities: [2, 10, 11], // FLAC, MP3 320, MP3 V0
    upgradeAllowed: true,
    acceptedQualities: [
      { qualityId: 1, allowed: true },
      { qualityId: 2, allowed: true },
      { qualityId: 10, allowed: true },
      { qualityId: 11, allowed: true },
      { qualityId: 12, allowed: true },
      { qualityId: 20, allowed: false }
    ]
  },
  {
    id: 'any',
    name: 'Any',
    cutoffQualityId: 40, // MP3 128
    preferredQualities: [2, 10, 11, 20, 30, 40],
    upgradeAllowed: true,
    acceptedQualities: [
      { qualityId: 1, allowed: true },
      { qualityId: 2, allowed: true },
      { qualityId: 10, allowed: true },
      { qualityId: 11, allowed: true },
      { qualityId: 20, allowed: true },
      { qualityId: 30, allowed: true },
      { qualityId: 40, allowed: true }
    ]
  }
];
```

### Preferred Quality Selection

```typescript
/**
 * Determine the best quality from available options.
 */
function selectBestQuality(
  available: AudioQualityDefinition[],
  profile: QualityProfile
): AudioQualityDefinition | null {
  // Filter to accepted qualities
  const accepted = available.filter(q =>
    profile.acceptedQualities.find(aq => aq.qualityId === q.id)?.allowed
  );

  if (accepted.length === 0) return null;

  // Sort by preference order, then by weight
  return accepted.sort((a, b) => {
    const aPreferenceIndex = profile.preferredQualities.indexOf(a.id);
    const bPreferenceIndex = profile.preferredQualities.indexOf(b.id);

    // Preferred qualities come first
    if (aPreferenceIndex >= 0 && bPreferenceIndex < 0) return -1;
    if (bPreferenceIndex >= 0 && aPreferenceIndex < 0) return 1;
    if (aPreferenceIndex >= 0 && bPreferenceIndex >= 0) {
      return aPreferenceIndex - bPreferenceIndex;
    }

    // Fall back to weight
    return b.weight - a.weight;
  })[0];
}

/**
 * Check if a quality upgrade is beneficial.
 */
function shouldUpgrade(
  current: AudioQualityDefinition,
  candidate: AudioQualityDefinition,
  profile: QualityProfile
): boolean {
  if (!profile.upgradeAllowed) return false;

  // Check if candidate is in preferred list
  const currentPreferenceIndex = profile.preferredQualities.indexOf(current.id);
  const candidatePreferenceIndex = profile.preferredQualities.indexOf(candidate.id);

  // If candidate is more preferred, upgrade
  if (candidatePreferenceIndex >= 0 &&
      (currentPreferenceIndex < 0 || candidatePreferenceIndex < currentPreferenceIndex)) {
    return true;
  }

  // If candidate has higher weight and current is not preferred, upgrade
  if (currentPreferenceIndex < 0 && candidate.weight > current.weight) {
    return true;
  }

  return false;
}
```

---

## Music Parsing

### Release Name Patterns

```typescript
/**
 * Music release name pattern definitions.
 * Patterns are applied in order; first match wins.
 */
interface MusicReleasePattern {
  /** Pattern name for debugging */
  name: string;

  /** Regular expression pattern */
  pattern: RegExp;

  /** Named capture groups expected */
  groups: MusicPatternGroup[];
}

type MusicPatternGroup =
  | 'artist'
  | 'album'
  | 'year'
  | 'format'
  | 'quality'
  | 'source'
  | 'group'
  | 'discNumber'
  | 'edition';

/**
 * Standard music release patterns.
 */
const MUSIC_RELEASE_PATTERNS: MusicReleasePattern[] = [
  // Standard scene format: Artist - Album (Year) [Format] {Source}-GROUP
  {
    name: 'scene-standard',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\((?<year>\d{4})\)\s*\[(?<format>[^\]]+)\]\s*(?:\{(?<source>[^}]+)\})?\s*-(?<group>\w+)$/i,
    groups: ['artist', 'album', 'year', 'format', 'source', 'group']
  },

  // Scene format without source: Artist - Album (Year) [Format]-GROUP
  {
    name: 'scene-no-source',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\((?<year>\d{4})\)\s*\[(?<format>[^\]]+)\]\s*-(?<group>\w+)$/i,
    groups: ['artist', 'album', 'year', 'format', 'group']
  },

  // With edition: Artist - Album (Edition) (Year) [Format]-GROUP
  {
    name: 'scene-edition',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\((?<edition>[^)]+Edition|Remaster(?:ed)?|Deluxe|Expanded)[^)]*\)\s*\((?<year>\d{4})\)\s*\[(?<format>[^\]]+)\]\s*-(?<group>\w+)$/i,
    groups: ['artist', 'album', 'edition', 'year', 'format', 'group']
  },

  // Multi-disc: Artist - Album (Year) [Format] CD1-GROUP
  {
    name: 'scene-multi-disc',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\((?<year>\d{4})\)\s*\[(?<format>[^\]]+)\]\s*(?:CD|Disc)\s*(?<discNumber>\d+)\s*-(?<group>\w+)$/i,
    groups: ['artist', 'album', 'year', 'format', 'discNumber', 'group']
  },

  // P2P format: Artist - Album [Year] [Format]
  {
    name: 'p2p-brackets',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\[(?<year>\d{4})\]\s*\[(?<format>[^\]]+)\]$/i,
    groups: ['artist', 'album', 'year', 'format']
  },

  // Simple: Artist - Album (Year)
  {
    name: 'simple-year',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\((?<year>\d{4})\)$/i,
    groups: ['artist', 'album', 'year']
  },

  // Minimal: Artist - Album
  {
    name: 'minimal',
    pattern: /^(?<artist>.+?)\s*-\s*(?<album>.+?)$/i,
    groups: ['artist', 'album']
  }
];

/**
 * Parsed music release information.
 */
interface ParsedMusicRelease {
  /** Detected artist name */
  artist?: string;

  /** Detected album title */
  album?: string;

  /** Release year */
  year?: number;

  /** Audio format/quality */
  format?: string;

  /** Parsed quality definition */
  quality?: AudioQualityDefinition;

  /** Release source (WEB, CD, Vinyl, etc.) */
  source?: MusicSource;

  /** Release group */
  releaseGroup?: string;

  /** Disc number (for multi-disc releases) */
  discNumber?: number;

  /** Edition (Deluxe, Remastered, etc.) */
  edition?: string;

  /** Pattern that matched */
  matchedPattern?: string;

  /** Confidence score (0-100) */
  confidence: number;
}

type MusicSource =
  | 'CD'
  | 'WEB'
  | 'Vinyl'
  | 'SACD'
  | 'DVD-A'
  | 'Blu-Ray'
  | 'Cassette'
  | 'DAT'
  | 'Unknown';
```

### Quality Detection

```typescript
/**
 * Format tokens for quality detection from release names.
 */
const FORMAT_QUALITY_MAPPING: Record<string, Partial<AudioQualityDefinition>> = {
  // Lossless
  'FLAC': { id: 2, name: 'FLAC', isLossless: true },
  'FLAC24': { id: 1, name: 'FLAC 24-bit', isLossless: true, bitDepth: 24 },
  'FLAC 24BIT': { id: 1, name: 'FLAC 24-bit', isLossless: true, bitDepth: 24 },
  'FLAC 24-BIT': { id: 1, name: 'FLAC 24-bit', isLossless: true, bitDepth: 24 },
  '24BIT FLAC': { id: 1, name: 'FLAC 24-bit', isLossless: true, bitDepth: 24 },
  '24-BIT FLAC': { id: 1, name: 'FLAC 24-bit', isLossless: true, bitDepth: 24 },
  'ALAC': { id: 4, name: 'ALAC', isLossless: true },
  'ALAC24': { id: 3, name: 'ALAC 24-bit', isLossless: true, bitDepth: 24 },
  'WAV': { id: 5, name: 'WAV', isLossless: true },
  'LOSSLESS': { id: 2, name: 'FLAC', isLossless: true },

  // High bitrate lossy
  'MP3 320': { id: 10, name: 'MP3 320', isLossless: false },
  'MP3-320': { id: 10, name: 'MP3 320', isLossless: false },
  '320': { id: 10, name: 'MP3 320', isLossless: false },
  '320KBPS': { id: 10, name: 'MP3 320', isLossless: false },
  '320 KBPS': { id: 10, name: 'MP3 320', isLossless: false },
  'V0': { id: 11, name: 'MP3 V0', isLossless: false },
  'MP3 V0': { id: 11, name: 'MP3 V0', isLossless: false },
  'VBR V0': { id: 11, name: 'MP3 V0', isLossless: false },
  'AAC 320': { id: 12, name: 'AAC 320', isLossless: false },

  // Standard lossy
  '256': { id: 20, name: 'MP3 256', isLossless: false },
  'MP3 256': { id: 20, name: 'MP3 256', isLossless: false },
  '256KBPS': { id: 20, name: 'MP3 256', isLossless: false },
  'V2': { id: 21, name: 'MP3 V2', isLossless: false },
  'MP3 V2': { id: 21, name: 'MP3 V2', isLossless: false },
  '192': { id: 30, name: 'MP3 192', isLossless: false },
  'MP3 192': { id: 30, name: 'MP3 192', isLossless: false },
  '192KBPS': { id: 30, name: 'MP3 192', isLossless: false },
  '128': { id: 40, name: 'MP3 128', isLossless: false },
  'MP3 128': { id: 40, name: 'MP3 128', isLossless: false },
  '128KBPS': { id: 40, name: 'MP3 128', isLossless: false },

  // Generic
  'MP3': { id: 30, name: 'MP3 192', isLossless: false }, // Assume 192 for generic MP3
  'AAC': { id: 20, name: 'AAC 256', isLossless: false },
  'OGG': { id: 30, name: 'OGG', isLossless: false },
  'OPUS': { id: 25, name: 'Opus', isLossless: false }
};

/**
 * Source detection patterns.
 */
const SOURCE_PATTERNS: Record<string, MusicSource> = {
  'CD': 'CD',
  'CDDA': 'CD',
  'WEB': 'WEB',
  'WEBDL': 'WEB',
  'WEB-DL': 'WEB',
  'VINYL': 'Vinyl',
  'LP': 'Vinyl',
  'SACD': 'SACD',
  'DVD-A': 'DVD-A',
  'DVDA': 'DVD-A',
  'DVD-AUDIO': 'DVD-A',
  'BLU-RAY': 'Blu-Ray',
  'BLURAY': 'Blu-Ray',
  'CASSETTE': 'Cassette',
  'DAT': 'DAT'
};

/**
 * Parse quality from format string.
 */
function parseQualityFromFormat(format: string): Partial<AudioQualityDefinition> | null {
  const normalizedFormat = format.toUpperCase().trim();

  // Direct match
  if (FORMAT_QUALITY_MAPPING[normalizedFormat]) {
    return FORMAT_QUALITY_MAPPING[normalizedFormat];
  }

  // Pattern matching for complex formats
  for (const [pattern, quality] of Object.entries(FORMAT_QUALITY_MAPPING)) {
    if (normalizedFormat.includes(pattern)) {
      return quality;
    }
  }

  return null;
}

/**
 * Parse source from format/source string.
 */
function parseSource(input: string): MusicSource {
  const normalized = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  for (const [pattern, source] of Object.entries(SOURCE_PATTERNS)) {
    if (normalized.includes(pattern.replace(/[^A-Z0-9]/g, ''))) {
      return source;
    }
  }

  return 'Unknown';
}
```

### Tag Extraction

```typescript
/**
 * Audio file metadata extraction interface.
 */
interface AudioMetadataExtractor {
  /**
   * Extract metadata from an audio file.
   */
  extract(filePath: string): Promise<ExtractedAudioMetadata>;
}

interface ExtractedAudioMetadata {
  /** Technical format information */
  format: {
    codec: AudioCodec;
    bitrate: number;
    sampleRate: number;
    bitDepth?: number;
    channels: number;
    duration: number;
    lossless: boolean;
  };

  /** Embedded tags */
  tags: AudioTags;

  /** Embedded artwork */
  artwork?: {
    type: 'front' | 'back' | 'disc' | 'other';
    mimeType: string;
    data: Buffer;
  }[];

  /** File hash */
  hash: string;
}

/**
 * Detect audio quality from file metadata.
 */
function detectQualityFromFile(metadata: ExtractedAudioMetadata): AudioQualityDefinition {
  const { format } = metadata;

  // Lossless detection
  if (format.lossless) {
    if (format.codec === 'flac') {
      return format.bitDepth && format.bitDepth > 16
        ? AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 1)! // FLAC 24-bit
        : AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 2)!; // FLAC
    }
    if (format.codec === 'alac') {
      return format.bitDepth && format.bitDepth > 16
        ? AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 3)! // ALAC 24-bit
        : AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 4)!; // ALAC
    }
    return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 5)!; // WAV/other lossless
  }

  // Lossy detection based on bitrate
  if (format.codec === 'mp3') {
    if (format.bitrate >= 315) {
      return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 10)!; // MP3 320
    }
    if (format.bitrate >= 220) {
      return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 11)!; // MP3 V0
    }
    if (format.bitrate >= 250) {
      return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 20)!; // MP3 256
    }
    if (format.bitrate >= 185) {
      return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 30)!; // MP3 192
    }
    if (format.bitrate >= 125) {
      return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 40)!; // MP3 128
    }
  }

  if (format.codec === 'aac' && format.bitrate >= 315) {
    return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 12)!; // AAC 320
  }

  return AUDIO_QUALITY_DEFINITIONS.find(q => q.id === 99)!; // Unknown
}
```

### Edge Cases

```typescript
/**
 * Edge case handling for music parsing.
 */
interface MusicParsingEdgeCases {
  /**
   * Handle self-titled albums.
   * When artist name equals album name.
   */
  handleSelfTitled(artist: string, album: string): {
    isSelfTitled: boolean;
    displayTitle: string;
  };

  /**
   * Handle "The" prefix variations.
   * "The Beatles" vs "Beatles, The"
   */
  normalizeThePrefix(name: string): {
    displayName: string;
    sortName: string;
  };

  /**
   * Handle featuring artists in title.
   * "Song (feat. Artist B)" -> extract featured artists
   */
  extractFeaturedFromTitle(title: string): {
    cleanTitle: string;
    featuredArtists: string[];
  };

  /**
   * Handle remix/version suffixes.
   * "Song (Radio Edit)" or "Song (Club Mix)"
   */
  extractVersionFromTitle(title: string): {
    cleanTitle: string;
    version?: string;
  };
}

/**
 * Implementation of edge case handlers.
 */
const EDGE_CASE_HANDLERS: MusicParsingEdgeCases = {
  handleSelfTitled(artist: string, album: string) {
    const normalizedArtist = artist.toLowerCase().trim();
    const normalizedAlbum = album.toLowerCase().trim();

    return {
      isSelfTitled: normalizedArtist === normalizedAlbum,
      displayTitle: normalizedArtist === normalizedAlbum
        ? `${artist} (Self-Titled)`
        : album
    };
  },

  normalizeThePrefix(name: string) {
    const theMatch = name.match(/^(The\s+)(.+)$/i);
    if (theMatch) {
      return {
        displayName: name,
        sortName: `${theMatch[2]}, The`
      };
    }
    return {
      displayName: name,
      sortName: name
    };
  },

  extractFeaturedFromTitle(title: string) {
    const featPatterns = [
      /\s*\(feat\.?\s+([^)]+)\)/i,
      /\s*\(ft\.?\s+([^)]+)\)/i,
      /\s*\(featuring\s+([^)]+)\)/i,
      /\s*\[feat\.?\s+([^\]]+)\]/i,
      /\s*feat\.?\s+(.+)$/i
    ];

    let cleanTitle = title;
    const featuredArtists: string[] = [];

    for (const pattern of featPatterns) {
      const match = cleanTitle.match(pattern);
      if (match) {
        featuredArtists.push(...match[1].split(/\s*[,&]\s*/));
        cleanTitle = cleanTitle.replace(pattern, '').trim();
      }
    }

    return { cleanTitle, featuredArtists };
  },

  extractVersionFromTitle(title: string) {
    const versionPatterns = [
      /\s*\((Radio\s+Edit|Single\s+Version|Album\s+Version|Extended|Club\s+Mix|Remix|Acoustic|Live|Demo|Instrumental|A\s+Cappella)\)/i,
      /\s*\[(Radio\s+Edit|Single\s+Version|Album\s+Version|Extended|Club\s+Mix|Remix|Acoustic|Live|Demo|Instrumental|A\s+Cappella)\]/i
    ];

    for (const pattern of versionPatterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          cleanTitle: title.replace(pattern, '').trim(),
          version: match[1]
        };
      }
    }

    return { cleanTitle: title };
  }
};
```

---

## Folder Structure

### Artist Organization

```typescript
/**
 * Artist folder structure configuration.
 */
interface ArtistFolderConfig {
  /** Root folder for music library */
  rootFolder: string;

  /** Artist folder naming format */
  artistFolderFormat: string;

  /** Whether to use sort name for folder */
  useSortName: boolean;

  /** Character replacement rules */
  characterReplacements: CharacterReplacement[];

  /** How to handle special characters */
  illegalCharacterReplacement: string;
}

interface CharacterReplacement {
  /** Character to replace */
  from: string;
  /** Replacement string */
  to: string;
}

/**
 * Default artist folder configuration.
 */
const DEFAULT_ARTIST_FOLDER_CONFIG: ArtistFolderConfig = {
  rootFolder: '/music',
  artistFolderFormat: '{Artist Name}',
  useSortName: false,
  characterReplacements: [
    { from: ':', to: ' -' },
    { from: '/', to: '-' },
    { from: '?', to: '' },
    { from: '*', to: '' },
    { from: '"', to: "'" },
    { from: '<', to: '' },
    { from: '>', to: '' },
    { from: '|', to: '' }
  ],
  illegalCharacterReplacement: ''
};

/**
 * Available tokens for artist folder naming.
 */
const ARTIST_FOLDER_TOKENS = {
  '{Artist Name}': 'Primary artist name',
  '{Artist SortName}': 'Sort name (e.g., "Beatles, The")',
  '{Artist MbId}': 'MusicBrainz Artist ID',
  '{Artist Disambiguation}': 'Disambiguation text',
  '{Artist Genre}': 'Primary genre',
  '{Artist Type}': 'Artist type (person, group, etc.)'
};
```

### Album Organization

```typescript
/**
 * Album folder structure configuration.
 */
interface AlbumFolderConfig {
  /** Album folder naming format */
  albumFolderFormat: string;

  /** Whether to include year in folder name */
  includeYear: boolean;

  /** Year format */
  yearFormat: 'YYYY' | 'YY';

  /** Whether to include release type */
  includeReleaseType: boolean;

  /** Track file naming format */
  trackFormat: string;

  /** Multi-disc folder naming format */
  multiDiscFormat: string;
}

/**
 * Default album folder configuration.
 */
const DEFAULT_ALBUM_FOLDER_CONFIG: AlbumFolderConfig = {
  albumFolderFormat: '{Album Title} ({Release Year})',
  includeYear: true,
  yearFormat: 'YYYY',
  includeReleaseType: false,
  trackFormat: '{Track Number:00} - {Track Title}',
  multiDiscFormat: 'CD{Disc Number}'
};

/**
 * Available tokens for album/track naming.
 */
const ALBUM_TOKENS = {
  // Album tokens
  '{Album Title}': 'Album title',
  '{Album SortTitle}': 'Album sort title',
  '{Album MbId}': 'MusicBrainz Release Group ID',
  '{Album Type}': 'Album type (album, ep, single)',
  '{Album Disambiguation}': 'Album disambiguation',
  '{Album Genre}': 'Primary album genre',
  '{Album Label}': 'Record label',
  '{Album CatalogNumber}': 'Catalog number',

  // Release tokens
  '{Release Year}': 'Original release year',
  '{Release Date}': 'Full release date',
  '{Release Country}': 'Release country code',
  '{Release Edition}': 'Edition name (Deluxe, Remastered)',

  // Quality tokens
  '{Quality}': 'Quality name (FLAC, MP3 320)',
  '{Quality Category}': 'Quality category (lossless, highBitrate)',
  '{Codec}': 'Audio codec',
  '{Bitrate}': 'Bitrate in kbps',
  '{SampleRate}': 'Sample rate in kHz',
  '{BitDepth}': 'Bit depth',

  // Track tokens
  '{Track Number}': 'Track number',
  '{Track Number:00}': 'Zero-padded track number',
  '{Track Title}': 'Track title',
  '{Track Artist}': 'Track artist(s)',
  '{Track MbId}': 'MusicBrainz Recording ID',

  // Disc tokens
  '{Disc Number}': 'Disc number',
  '{Disc Count}': 'Total disc count',

  // Media info
  '{MediaInfo Audio}': 'Audio codec info',
  '{Original Filename}': 'Original filename before rename'
};

/**
 * Example folder structures.
 */
const FOLDER_STRUCTURE_EXAMPLES = {
  standard: {
    artistFormat: '{Artist Name}',
    albumFormat: '{Album Title} ({Release Year})',
    trackFormat: '{Track Number:00} - {Track Title}',
    example: '/music/The Beatles/Abbey Road (1969)/01 - Come Together.flac'
  },

  withQuality: {
    artistFormat: '{Artist Name}',
    albumFormat: '{Album Title} ({Release Year}) [{Quality}]',
    trackFormat: '{Track Number:00} - {Track Title}',
    example: '/music/The Beatles/Abbey Road (1969) [FLAC]/01 - Come Together.flac'
  },

  catalogNumber: {
    artistFormat: '{Artist Name}',
    albumFormat: '[{Album CatalogNumber}] {Album Title} ({Release Year})',
    trackFormat: '{Track Number:00} - {Track Title}',
    example: '/music/The Beatles/[PCS 7088] Abbey Road (1969)/01 - Come Together.flac'
  },

  sortName: {
    artistFormat: '{Artist SortName}',
    albumFormat: '{Album Title} ({Release Year})',
    trackFormat: '{Track Number:00} - {Track Title}',
    example: '/music/Beatles, The/Abbey Road (1969)/01 - Come Together.flac'
  }
};
```

### Multi-Disc Handling

```typescript
/**
 * Multi-disc album handling configuration.
 */
interface MultiDiscConfig {
  /** Whether to create subfolders for multi-disc albums */
  createDiscFolders: boolean;

  /** Disc folder format */
  discFolderFormat: string;

  /** Minimum discs to trigger subfolder creation */
  minDiscsForFolders: number;

  /** Whether to include disc in track number */
  includeDiscInTrackNumber: boolean;

  /** Track numbering for multi-disc (absolute vs per-disc) */
  trackNumbering: 'absolute' | 'perDisc';
}

/**
 * Default multi-disc configuration.
 */
const DEFAULT_MULTI_DISC_CONFIG: MultiDiscConfig = {
  createDiscFolders: true,
  discFolderFormat: 'CD{Disc Number}',
  minDiscsForFolders: 2,
  includeDiscInTrackNumber: false,
  trackNumbering: 'perDisc'
};

/**
 * Examples of multi-disc folder structures.
 */
const MULTI_DISC_EXAMPLES = {
  withFolders: {
    config: { createDiscFolders: true, discFolderFormat: 'CD{Disc Number}' },
    structure: `
      /music/Artist/Album (Year)/
        CD1/
          01 - Track 1.flac
          02 - Track 2.flac
        CD2/
          01 - Track 1.flac
          02 - Track 2.flac
    `
  },

  flatAbsolute: {
    config: { createDiscFolders: false, trackNumbering: 'absolute' },
    structure: `
      /music/Artist/Album (Year)/
        01 - Track 1 (Disc 1).flac
        02 - Track 2 (Disc 1).flac
        03 - Track 1 (Disc 2).flac
        04 - Track 2 (Disc 2).flac
    `
  },

  flatPerDisc: {
    config: { createDiscFolders: false, trackNumbering: 'perDisc', includeDiscInTrackNumber: true },
    structure: `
      /music/Artist/Album (Year)/
        1-01 - Track 1.flac
        1-02 - Track 2.flac
        2-01 - Track 1.flac
        2-02 - Track 2.flac
    `
  }
};
```

### Naming Tokens

```typescript
/**
 * Token processor for folder and file naming.
 */
interface TokenProcessor {
  /**
   * Process a format string with given context.
   */
  process(format: string, context: NamingContext): string;

  /**
   * Validate a format string.
   */
  validate(format: string): TokenValidationResult;
}

interface NamingContext {
  artist?: Artist;
  album?: Album;
  track?: Track;
  trackFile?: TrackFile;
  quality?: AudioQualityDefinition;
}

interface TokenValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  usedTokens: string[];
}

/**
 * Token processing implementation.
 */
function processToken(
  token: string,
  context: NamingContext
): string {
  // Handle formatting modifiers
  const paddingMatch = token.match(/\{([^:}]+):(\d+)\}/);
  if (paddingMatch) {
    const [, tokenName, padding] = paddingMatch;
    const value = getTokenValue(tokenName, context);
    return String(value).padStart(parseInt(padding), '0');
  }

  // Standard token
  const tokenName = token.replace(/[{}]/g, '');
  return getTokenValue(tokenName, context);
}

function getTokenValue(tokenName: string, context: NamingContext): string {
  const { artist, album, track, trackFile, quality } = context;

  switch (tokenName) {
    case 'Artist Name':
      return artist?.name || 'Unknown Artist';
    case 'Artist SortName':
      return artist?.sortName || artist?.name || 'Unknown Artist';
    case 'Album Title':
      return album?.title || 'Unknown Album';
    case 'Release Year':
      return album?.releaseDate?.getFullYear().toString() || '';
    case 'Track Number':
      return track?.trackNumber.toString() || '0';
    case 'Track Title':
      return track?.title || 'Unknown Track';
    case 'Disc Number':
      return track?.discNumber.toString() || '1';
    case 'Quality':
      return quality?.name || trackFile?.quality?.name || 'Unknown';
    case 'Codec':
      return trackFile?.codec || 'Unknown';
    default:
      return '';
  }
}
```

---

## Import Flow

### File Discovery

```typescript
/**
 * Music file discovery configuration.
 */
interface MusicDiscoveryConfig {
  /** File extensions to scan */
  audioExtensions: string[];

  /** Whether to scan subdirectories */
  recursive: boolean;

  /** Directories to exclude */
  excludeDirectories: string[];

  /** Maximum directory depth */
  maxDepth: number;
}

/**
 * Default discovery configuration.
 */
const DEFAULT_DISCOVERY_CONFIG: MusicDiscoveryConfig = {
  audioExtensions: [
    '.flac', '.alac', '.wav', '.aiff', '.aif',
    '.mp3', '.m4a', '.aac', '.ogg', '.opus',
    '.wma', '.ape', '.wv', '.dsd', '.dsf', '.dff'
  ],
  recursive: true,
  excludeDirectories: [
    '@eaDir',       // Synology
    '#recycle',     // Synology recycle bin
    '.@__thumb',    // Synology thumbnails
    '$RECYCLE.BIN', // Windows recycle bin
    '.Trash-*',     // Linux trash
    'lost+found'    // Linux lost+found
  ],
  maxDepth: 10
};

/**
 * Discovered music folder structure.
 */
interface DiscoveredMusicFolder {
  /** Folder path */
  path: string;

  /** Detected artist (from folder structure or tags) */
  detectedArtist?: string;

  /** Detected album (from folder structure or tags) */
  detectedAlbum?: string;

  /** Audio files found */
  files: DiscoveredAudioFile[];

  /** Cover art files found */
  artworkFiles: string[];

  /** Other files (cue, log, etc.) */
  otherFiles: string[];

  /** Discovery confidence */
  confidence: number;
}

interface DiscoveredAudioFile {
  /** File path */
  path: string;

  /** File size */
  size: number;

  /** Detected quality */
  quality?: AudioQualityDefinition;

  /** Extracted tags */
  tags?: AudioTags;

  /** Detected track number */
  trackNumber?: number;

  /** Detected disc number */
  discNumber?: number;
}
```

### Metadata Matching

```typescript
/**
 * Music metadata matching strategies.
 */
interface MusicMatchingConfig {
  /** Matching strategy order */
  strategies: MatchingStrategy[];

  /** Minimum match score to accept */
  minimumScore: number;

  /** Whether to use fingerprinting as fallback */
  useFingerprinting: boolean;

  /** Fingerprinting service */
  fingerprintService?: 'acoustid' | 'musicbrainz';
}

type MatchingStrategy =
  | 'mbid'           // Match by embedded MusicBrainz IDs
  | 'tags'           // Match by embedded tags (artist, album, title)
  | 'folderStructure'// Match by folder/file naming
  | 'fingerprint';   // Match by audio fingerprint

/**
 * Match result from metadata matching.
 */
interface MusicMatchResult {
  /** Whether a match was found */
  matched: boolean;

  /** Match confidence (0-100) */
  confidence: number;

  /** Strategy that produced the match */
  strategy?: MatchingStrategy;

  /** Matched artist */
  artist?: MusicBrainzArtistSearchResult;

  /** Matched release group */
  releaseGroup?: MusicBrainzReleaseGroupSearchResult;

  /** Matched release */
  release?: ReleaseInfo;

  /** Track matches */
  trackMatches?: TrackMatchResult[];

  /** Issues found during matching */
  issues: MatchingIssue[];
}

interface TrackMatchResult {
  /** Local file */
  file: DiscoveredAudioFile;

  /** Matched track */
  track?: Track;

  /** Match confidence */
  confidence: number;

  /** Reason for low confidence (if applicable) */
  lowConfidenceReason?: string;
}

interface MatchingIssue {
  /** Issue type */
  type: 'missingTrack' | 'extraTrack' | 'qualityMismatch' | 'durationMismatch' | 'artistMismatch';

  /** Issue description */
  description: string;

  /** Affected file/track */
  affectedItem?: string;
}

/**
 * Matching configuration defaults.
 */
const DEFAULT_MATCHING_CONFIG: MusicMatchingConfig = {
  strategies: ['mbid', 'tags', 'folderStructure', 'fingerprint'],
  minimumScore: 60,
  useFingerprinting: true,
  fingerprintService: 'acoustid'
};
```

### Quality Assessment

```typescript
/**
 * Quality assessment for imported music.
 */
interface QualityAssessment {
  /** Overall quality score */
  overallScore: number;

  /** Detected quality definition */
  quality: AudioQualityDefinition;

  /** Whether quality meets profile requirements */
  meetsProfile: boolean;

  /** Quality issues found */
  issues: QualityIssue[];

  /** Technical details */
  technical: TechnicalQualityDetails;
}

interface QualityIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info';

  /** Issue type */
  type: QualityIssueType;

  /** Issue description */
  description: string;

  /** Affected files */
  affectedFiles?: string[];
}

type QualityIssueType =
  | 'transcoded'        // Lossy to lossless transcode detected
  | 'lowBitrate'        // Bitrate below expected
  | 'inconsistentQuality'// Mixed quality in album
  | 'corruptFile'       // File corruption detected
  | 'truncated'         // Truncated file
  | 'silence'           // Excessive silence
  | 'clipping';         // Audio clipping detected

interface TechnicalQualityDetails {
  /** Average bitrate across album */
  averageBitrate: number;

  /** Bitrate standard deviation */
  bitrateDeviation: number;

  /** Sample rates used */
  sampleRates: number[];

  /** Bit depths used */
  bitDepths: number[];

  /** Codecs used */
  codecs: AudioCodec[];

  /** Spectral analysis results (for transcode detection) */
  spectralAnalysis?: SpectralAnalysis;
}

interface SpectralAnalysis {
  /** Frequency cutoff detected */
  frequencyCutoff?: number;

  /** Likelihood of transcode (0-100) */
  transcodelikelihood: number;

  /** Original quality estimate */
  estimatedOriginalQuality?: string;
}
```

### File Organization

```typescript
/**
 * File organization actions.
 */
interface OrganizationPlan {
  /** Artist organization */
  artist: ArtistOrganization;

  /** Album organization */
  album: AlbumOrganization;

  /** Track organization */
  tracks: TrackOrganization[];

  /** Additional actions */
  additionalActions: OrganizationAction[];
}

interface ArtistOrganization {
  /** Whether artist exists in library */
  exists: boolean;

  /** Artist ID (if exists) */
  artistId?: string;

  /** Target artist folder path */
  targetPath: string;

  /** Action to take */
  action: 'use_existing' | 'create' | 'merge';
}

interface AlbumOrganization {
  /** Whether album exists in library */
  exists: boolean;

  /** Album ID (if exists) */
  albumId?: string;

  /** Target album folder path */
  targetPath: string;

  /** Action to take */
  action: 'use_existing' | 'create' | 'replace' | 'upgrade';

  /** Reason for action */
  reason?: string;
}

interface TrackOrganization {
  /** Source file path */
  sourcePath: string;

  /** Target file path */
  targetPath: string;

  /** Matched track */
  track?: Track;

  /** Action to take */
  action: 'move' | 'copy' | 'skip' | 'replace';

  /** Whether to update tags */
  updateTags: boolean;

  /** Tags to update */
  tagsToUpdate?: Partial<AudioTags>;
}

type OrganizationAction =
  | { type: 'create_folder'; path: string }
  | { type: 'copy_artwork'; source: string; target: string }
  | { type: 'delete_source'; path: string }
  | { type: 'update_database'; entity: 'artist' | 'album' | 'track'; id: string };

/**
 * Import options.
 */
interface ImportOptions {
  /** Copy vs move files */
  mode: 'copy' | 'move' | 'hardlink' | 'symlink';

  /** Delete source after successful import */
  deleteSource: boolean;

  /** Update embedded tags */
  updateTags: boolean;

  /** Tag update options */
  tagOptions?: {
    writeArtist: boolean;
    writeAlbum: boolean;
    writeTrack: boolean;
    writeMusicBrainzIds: boolean;
    writeReplayGain: boolean;
    preserveExistingTags: boolean;
  };

  /** Handle album artwork */
  artworkHandling: 'embed' | 'external' | 'both' | 'none';

  /** Replace existing files of lower quality */
  replaceExisting: boolean;

  /** Minimum quality improvement for replacement */
  minimumQualityImprovement: number;
}
```

---

## Music-Specific Features

### Discography Tracking

```typescript
/**
 * Artist discography tracking configuration.
 */
interface DiscographyConfig {
  /** Album types to include in discography */
  includedTypes: AlbumType[];

  /** Secondary types to include */
  includedSecondaryTypes: AlbumSecondaryType[];

  /** Exclude albums before this year */
  earliestYear?: number;

  /** Include future releases */
  includeFutureReleases: boolean;

  /** Monitoring defaults for new albums */
  monitoringDefaults: DiscographyMonitoringDefaults;
}

interface DiscographyMonitoringDefaults {
  /** Monitor all existing albums */
  monitorExisting: boolean;

  /** Monitor future albums */
  monitorNew: boolean;

  /** Album types to auto-monitor */
  autoMonitorTypes: AlbumType[];
}

/**
 * Discography statistics.
 */
interface DiscographyStats {
  /** Total albums in discography */
  totalAlbums: number;

  /** Albums by type */
  albumsByType: Record<AlbumType, number>;

  /** Albums owned/downloaded */
  ownedAlbums: number;

  /** Percentage complete */
  percentComplete: number;

  /** Missing albums */
  missingAlbums: Album[];

  /** Quality breakdown */
  qualityBreakdown: Record<string, number>;

  /** Total tracks */
  totalTracks: number;

  /** Total duration (seconds) */
  totalDuration: number;

  /** Total size on disk */
  totalSize: number;
}

/**
 * Default discography configuration.
 */
const DEFAULT_DISCOGRAPHY_CONFIG: DiscographyConfig = {
  includedTypes: ['album', 'ep'],
  includedSecondaryTypes: [],
  includeFutureReleases: true,
  monitoringDefaults: {
    monitorExisting: false,
    monitorNew: true,
    autoMonitorTypes: ['album']
  }
};
```

### Featured Artists

```typescript
/**
 * Featured artist handling configuration.
 */
interface FeaturedArtistConfig {
  /** How to handle featured artists in artist folder */
  folderHandling: FeaturedArtistFolderHandling;

  /** Create artist entries for featured artists */
  createArtistEntries: boolean;

  /** Link featured appearances to artist */
  linkAppearances: boolean;

  /** Featured artist display format */
  displayFormat: string;
}

type FeaturedArtistFolderHandling =
  | 'primaryArtistOnly'    // Put in primary artist folder only
  | 'allArtists'           // Create links in all artist folders
  | 'featuredSubfolder';   // Put in "Featured On" subfolder

/**
 * Featured artist appearance tracking.
 */
interface ArtistAppearance {
  /** Artist who appears */
  artistId: string;

  /** Track where they appear */
  trackId: string;

  /** Album containing the track */
  albumId: string;

  /** Primary artist of the album */
  primaryArtistId: string;

  /** Type of appearance */
  appearanceType: ArtistCreditType;

  /** Credit as shown */
  creditedAs: string;
}

/**
 * Get all appearances for an artist.
 */
interface ArtistAppearanceSummary {
  /** Artist ID */
  artistId: string;

  /** Own albums */
  ownAlbums: Album[];

  /** Featured appearances */
  appearances: ArtistAppearance[];

  /** Total tracks with this artist */
  totalTracks: number;

  /** Artists collaborated with */
  collaborators: Array<{
    artistId: string;
    trackCount: number;
  }>;
}
```

### Album Types

```typescript
/**
 * Album type definitions and handling.
 */
interface AlbumTypeDefinition {
  /** Type identifier */
  type: AlbumType;

  /** Display name */
  displayName: string;

  /** Typical track count range */
  typicalTrackCount: { min: number; max: number };

  /** Typical duration range (minutes) */
  typicalDuration: { min: number; max: number };

  /** Icon identifier */
  icon: string;

  /** Sort priority */
  sortPriority: number;
}

const ALBUM_TYPE_DEFINITIONS: AlbumTypeDefinition[] = [
  {
    type: 'album',
    displayName: 'Album',
    typicalTrackCount: { min: 8, max: 25 },
    typicalDuration: { min: 30, max: 80 },
    icon: 'album',
    sortPriority: 1
  },
  {
    type: 'ep',
    displayName: 'EP',
    typicalTrackCount: { min: 3, max: 7 },
    typicalDuration: { min: 10, max: 30 },
    icon: 'ep',
    sortPriority: 2
  },
  {
    type: 'single',
    displayName: 'Single',
    typicalTrackCount: { min: 1, max: 4 },
    typicalDuration: { min: 2, max: 15 },
    icon: 'single',
    sortPriority: 3
  },
  {
    type: 'broadcast',
    displayName: 'Broadcast',
    typicalTrackCount: { min: 1, max: 100 },
    typicalDuration: { min: 1, max: 240 },
    icon: 'broadcast',
    sortPriority: 4
  },
  {
    type: 'other',
    displayName: 'Other',
    typicalTrackCount: { min: 1, max: 100 },
    typicalDuration: { min: 1, max: 300 },
    icon: 'other',
    sortPriority: 5
  }
];

/**
 * Secondary type modifiers for albums.
 */
interface SecondaryTypeDefinition {
  /** Type identifier */
  type: AlbumSecondaryType;

  /** Display name */
  displayName: string;

  /** Description */
  description: string;

  /** Affects folder naming */
  affectsFolderName: boolean;

  /** Folder name suffix (if affects naming) */
  folderSuffix?: string;
}

const SECONDARY_TYPE_DEFINITIONS: SecondaryTypeDefinition[] = [
  {
    type: 'compilation',
    displayName: 'Compilation',
    description: 'Greatest hits or collection album',
    affectsFolderName: false
  },
  {
    type: 'live',
    displayName: 'Live',
    description: 'Live recording',
    affectsFolderName: true,
    folderSuffix: '(Live)'
  },
  {
    type: 'remix',
    displayName: 'Remix',
    description: 'Remix album',
    affectsFolderName: true,
    folderSuffix: '(Remixes)'
  },
  {
    type: 'soundtrack',
    displayName: 'Soundtrack',
    description: 'Film or game soundtrack',
    affectsFolderName: false
  },
  {
    type: 'demo',
    displayName: 'Demo',
    description: 'Demo recordings',
    affectsFolderName: true,
    folderSuffix: '(Demos)'
  }
];
```

### Release Editions

```typescript
/**
 * Release edition handling.
 */
interface EditionConfig {
  /** Preferred edition keywords (in order) */
  preferredEditions: string[];

  /** Editions to avoid */
  avoidedEditions: string[];

  /** Whether to distinguish editions in library */
  trackEditionsSeparately: boolean;

  /** Edition detection patterns */
  editionPatterns: EditionPattern[];
}

interface EditionPattern {
  /** Edition name */
  name: string;

  /** Detection patterns */
  patterns: RegExp[];

  /** Priority (higher = more preferred) */
  priority: number;

  /** Whether this edition typically has bonus content */
  hasExtraContent: boolean;
}

const EDITION_PATTERNS: EditionPattern[] = [
  {
    name: 'Original',
    patterns: [/^(?!.*(deluxe|expanded|remaster|anniversary|special|collector|box)).*$/i],
    priority: 50,
    hasExtraContent: false
  },
  {
    name: 'Remastered',
    patterns: [/remaster(ed)?/i, /\d{4}\s+remaster/i],
    priority: 60,
    hasExtraContent: false
  },
  {
    name: 'Deluxe',
    patterns: [/deluxe/i, /deluxe\s+edition/i],
    priority: 70,
    hasExtraContent: true
  },
  {
    name: 'Expanded',
    patterns: [/expanded/i, /expanded\s+edition/i],
    priority: 65,
    hasExtraContent: true
  },
  {
    name: 'Anniversary',
    patterns: [/\d+(?:th|st|nd|rd)?\s*anniversary/i, /anniversary\s+edition/i],
    priority: 75,
    hasExtraContent: true
  },
  {
    name: 'Super Deluxe',
    patterns: [/super\s+deluxe/i],
    priority: 80,
    hasExtraContent: true
  },
  {
    name: 'Box Set',
    patterns: [/box\s*set/i, /complete\s+collection/i],
    priority: 85,
    hasExtraContent: true
  },
  {
    name: 'Clean',
    patterns: [/clean/i, /edited/i, /censored/i, /radio\s+edit/i],
    priority: 10,
    hasExtraContent: false
  }
];

/**
 * Default edition configuration.
 */
const DEFAULT_EDITION_CONFIG: EditionConfig = {
  preferredEditions: ['Remastered', 'Deluxe', 'Original'],
  avoidedEditions: ['Clean', 'Edited', 'Censored'],
  trackEditionsSeparately: false,
  editionPatterns: EDITION_PATTERNS
};
```

---

## Integration Points

### Indexer Integration

```typescript
/**
 * Music-specific indexer configuration.
 */
interface MusicIndexerConfig {
  /** Newznab categories for music */
  categories: number[];

  /** Search parameters */
  searchParams: MusicSearchParams;

  /** Result processing */
  resultProcessing: MusicResultProcessing;
}

/**
 * Newznab categories for music.
 * Referenced from INTEGRATION_SPECIFICATIONS.md
 */
const MUSIC_NEWZNAB_CATEGORIES = {
  MUSIC: 3000,
  MUSIC_MP3: 3010,
  MUSIC_VIDEO: 3020,
  MUSIC_AUDIOBOOK: 3030,
  MUSIC_LOSSLESS: 3040,
  MUSIC_OTHER: 3050,
  MUSIC_FOREIGN: 3060
};

interface MusicSearchParams {
  /** Artist name for search */
  artist?: string;

  /** Album title for search */
  album?: string;

  /** Track title for search */
  track?: string;

  /** Release year */
  year?: number;

  /** Label for search */
  label?: string;

  /** Quality keywords */
  quality?: string[];

  /** Source keywords */
  source?: string[];
}

interface MusicResultProcessing {
  /** Parse release names using music patterns */
  parseReleaseNames: boolean;

  /** Filter by quality profile */
  filterByQuality: boolean;

  /** Prefer results with complete albums */
  preferCompleteAlbums: boolean;

  /** Size estimation per track (MB) */
  estimatedTrackSize: {
    lossless: number;
    highBitrate: number;
    standard: number;
  };
}

/**
 * Default music indexer configuration.
 */
const DEFAULT_MUSIC_INDEXER_CONFIG: MusicIndexerConfig = {
  categories: [3000, 3010, 3040],
  searchParams: {},
  resultProcessing: {
    parseReleaseNames: true,
    filterByQuality: true,
    preferCompleteAlbums: true,
    estimatedTrackSize: {
      lossless: 40,    // ~40MB per track for FLAC
      highBitrate: 10, // ~10MB per track for 320kbps
      standard: 5      // ~5MB per track for 192kbps
    }
  }
};
```

### Download Client Integration

```typescript
/**
 * Music download handling configuration.
 */
interface MusicDownloadConfig {
  /** Category for music downloads */
  category: string;

  /** Post-processing settings */
  postProcessing: MusicPostProcessing;

  /** Completed download handling */
  completedHandling: CompletedDownloadHandling;
}

interface MusicPostProcessing {
  /** Check for complete albums before importing */
  requireCompleteAlbum: boolean;

  /** Minimum tracks percentage for incomplete import */
  minimumTracksPercentage: number;

  /** Verify audio file integrity */
  verifyIntegrity: boolean;

  /** Run spectral analysis for transcode detection */
  detectTranscodes: boolean;

  /** Extract and apply ReplayGain */
  applyReplayGain: boolean;

  /** ReplayGain mode */
  replayGainMode: 'track' | 'album' | 'both';
}

interface CompletedDownloadHandling {
  /** Wait time before processing (seconds) */
  waitTime: number;

  /** Retry incomplete downloads */
  retryIncomplete: boolean;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Remove download after successful import */
  removeAfterImport: boolean;

  /** Keep seeding for this long (hours, for torrents) */
  seedingTime?: number;
}

/**
 * Default music download configuration.
 */
const DEFAULT_MUSIC_DOWNLOAD_CONFIG: MusicDownloadConfig = {
  category: 'music',
  postProcessing: {
    requireCompleteAlbum: false,
    minimumTracksPercentage: 80,
    verifyIntegrity: true,
    detectTranscodes: true,
    applyReplayGain: true,
    replayGainMode: 'album'
  },
  completedHandling: {
    waitTime: 60,
    retryIncomplete: true,
    maxRetries: 3,
    removeAfterImport: false,
    seedingTime: 168 // 1 week
  }
};
```

### Notification Integration

```typescript
/**
 * Music-specific notification events.
 */
interface MusicNotificationEvents {
  /** Artist events */
  artist: {
    onArtistAdded: boolean;
    onArtistDeleted: boolean;
  };

  /** Album events */
  album: {
    onAlbumAdded: boolean;
    onAlbumImported: boolean;
    onAlbumUpgraded: boolean;
    onAlbumDeleted: boolean;
    onAlbumMissing: boolean;
  };

  /** Track events */
  track: {
    onTrackFileDeleted: boolean;
    onTrackFileRenamed: boolean;
  };

  /** Quality events */
  quality: {
    onQualityUpgrade: boolean;
    onTranscodeDetected: boolean;
  };

  /** Health events */
  health: {
    onImportFailed: boolean;
    onDownloadFailed: boolean;
  };
}

/**
 * Notification payload for music events.
 */
interface MusicNotificationPayload {
  /** Event type */
  eventType: string;

  /** Artist information */
  artist?: {
    id: string;
    name: string;
    mbId: string;
  };

  /** Album information */
  album?: {
    id: string;
    title: string;
    mbId: string;
    releaseDate?: string;
  };

  /** Track information */
  track?: {
    id: string;
    title: string;
    trackNumber: number;
  };

  /** Quality information */
  quality?: {
    name: string;
    previous?: string;
  };

  /** Additional message */
  message?: string;

  /** Timestamp */
  timestamp: string;
}

/**
 * Default notification configuration.
 */
const DEFAULT_MUSIC_NOTIFICATIONS: MusicNotificationEvents = {
  artist: {
    onArtistAdded: true,
    onArtistDeleted: false
  },
  album: {
    onAlbumAdded: true,
    onAlbumImported: true,
    onAlbumUpgraded: true,
    onAlbumDeleted: false,
    onAlbumMissing: false
  },
  track: {
    onTrackFileDeleted: false,
    onTrackFileRenamed: false
  },
  quality: {
    onQualityUpgrade: true,
    onTranscodeDetected: true
  },
  health: {
    onImportFailed: true,
    onDownloadFailed: true
  }
};
```

---

## Related Documents

| Document | Description |
|----------|-------------|
| [DATABASE_SCHEMA.md](../02-architecture/DATABASE_SCHEMA.md) | Database schema including music tables |
| [PARSER_SPECIFICATION.md](./PARSER_SPECIFICATION.md) | General parsing specification |
| [FILE_NAMING_RULES.md](./FILE_NAMING_RULES.md) | File naming conventions |
| [INTEGRATION_SPECIFICATIONS.md](../05-infrastructure/INTEGRATION_SPECIFICATIONS.md) | External service integrations |
| [AI_RECOMMENDATIONS.md](./AI_RECOMMENDATIONS.md) | AI recommendation system |

---

## Appendix A: MusicBrainz Entity Reference

| Entity | Description | idkarr Mapping |
|--------|-------------|----------------|
| Artist | Musical artist or group | Artist |
| Release Group | Conceptual album | Album (release group level) |
| Release | Specific version of album | Album release selection |
| Medium | Physical disc/side | Disc information |
| Track | Position on medium | Track position |
| Recording | Actual audio recording | Track content |

## Appendix B: Audio Format Reference

| Format | Extension | Lossless | Typical Bitrate | Container |
|--------|-----------|----------|-----------------|-----------|
| FLAC | .flac | Yes | ~1000 kbps | Native |
| ALAC | .m4a | Yes | ~1000 kbps | MP4 |
| WAV | .wav | Yes | 1411 kbps | RIFF |
| AIFF | .aiff, .aif | Yes | 1411 kbps | IFF |
| MP3 | .mp3 | No | 128-320 kbps | Native |
| AAC | .m4a, .aac | No | 128-320 kbps | MP4/ADTS |
| Ogg Vorbis | .ogg | No | 80-500 kbps | Ogg |
| Opus | .opus | No | 64-510 kbps | Ogg |
| WMA | .wma | No/Yes | Variable | ASF |
| DSD | .dsf, .dff | Yes | 2822-11289 kbps | Native |

## Appendix C: Quality Profile Examples

### Audiophile Profile
```json
{
  "name": "Audiophile",
  "cutoff": "FLAC 24-bit",
  "preferred": ["FLAC 24-bit", "FLAC", "ALAC 24-bit", "ALAC"],
  "accepted": ["FLAC 24-bit", "FLAC", "ALAC 24-bit", "ALAC", "WAV"],
  "upgradeAllowed": true
}
```

### Standard Lossless Profile
```json
{
  "name": "Lossless",
  "cutoff": "FLAC",
  "preferred": ["FLAC", "ALAC"],
  "accepted": ["FLAC 24-bit", "FLAC", "ALAC 24-bit", "ALAC", "WAV"],
  "upgradeAllowed": true
}
```

### High Quality Profile
```json
{
  "name": "High Quality",
  "cutoff": "MP3 320",
  "preferred": ["FLAC", "MP3 320", "MP3 V0"],
  "accepted": ["FLAC", "MP3 320", "MP3 V0", "AAC 320"],
  "upgradeAllowed": true
}
```

### Any Quality Profile
```json
{
  "name": "Any",
  "cutoff": "MP3 128",
  "preferred": ["FLAC", "MP3 320", "MP3 V0", "MP3 256", "MP3 192", "MP3 128"],
  "accepted": ["all"],
  "upgradeAllowed": true
}
```
