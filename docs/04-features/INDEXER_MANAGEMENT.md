# Indexer Management

## Overview

idkarr includes built-in indexer management, replacing the need for external tools like Prowlarr. This provides a single, unified location to configure all indexers with full support for Torznab and Newznab protocols.

### Why Built-in Indexer Management?

**Problems with External Indexer Managers (Prowlarr):**
- Additional application to install, configure, and maintain
- Separate database and configuration
- Network overhead for inter-service communication
- Synchronization issues between Prowlarr and media managers
- Additional resource consumption (RAM, CPU, storage)
- Complex Docker/container networking requirements
- Another point of failure in the stack

**Benefits of Built-in Management:**
- Single application for all media automation
- Unified configuration and database
- No network latency between indexer queries
- Consistent health monitoring across all services
- Reduced resource footprint
- Simplified deployment and backup
- Integrated search debouncing and rate limiting

### Feature Summary

| Feature | Description |
|---------|-------------|
| Protocol Support | Torznab, Newznab |
| Indexer Types | Public, Semi-Private, Private |
| Rate Limiting | Per-indexer configurable limits |
| Health Monitoring | Response time, failure tracking, auto-disable |
| RSS Sync | Configurable polling intervals |
| Search Debouncing | Intelligent throttling to prevent redundant searches |
| Category Mapping | Map indexer categories to idkarr media types |
| Testing | Built-in test searches and connectivity verification |

---

## Supported Protocols

### Torznab Protocol

Torznab is a standardized API for torrent indexers, based on Newznab XML format but adapted for torrent-specific attributes.

**Key Characteristics:**
- XML-based response format
- Standardized search parameters
- Category-based filtering
- Torrent-specific attributes (seeders, leechers, size, info hash)

**Standard Endpoints:**
```
GET /api?t=caps           # Get indexer capabilities
GET /api?t=search         # General search
GET /api?t=tvsearch       # TV-specific search
GET /api?t=movie          # Movie-specific search
GET /api?t=music          # Music-specific search
GET /api?t=book           # Book-specific search
```

**Search Parameters:**
```typescript
interface TorznabSearchParams {
  // Authentication
  apikey: string;

  // Search type
  t: 'search' | 'tvsearch' | 'movie' | 'music' | 'book';

  // General search
  q?: string;              // Search query
  cat?: string;            // Comma-separated category IDs
  limit?: number;          // Max results (default: 100)
  offset?: number;         // Pagination offset

  // TV-specific
  tvdbid?: number;         // TVDB ID
  rid?: number;            // TVRage ID (deprecated)
  tvmazeid?: number;       // TVMaze ID
  imdbid?: string;         // IMDB ID (tt1234567)
  season?: number;         // Season number
  ep?: number;             // Episode number

  // Movie-specific
  tmdbid?: number;         // TMDB ID

  // Extended attributes
  extended?: 1;            // Include extended attributes
}
```

**Response Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <title>Indexer Name</title>
    <item>
      <title>Release.Title.S01E01.1080p.WEB-DL</title>
      <guid>https://indexer.com/details/123456</guid>
      <link>https://indexer.com/download/123456</link>
      <pubDate>Thu, 15 Jan 2026 12:00:00 +0000</pubDate>
      <size>1500000000</size>
      <category>5030</category>
      <torznab:attr name="seeders" value="150"/>
      <torznab:attr name="peers" value="200"/>
      <torznab:attr name="infohash" value="abc123..."/>
      <torznab:attr name="downloadvolumefactor" value="0"/>
      <torznab:attr name="uploadvolumefactor" value="1"/>
      <torznab:attr name="tvdbid" value="12345"/>
      <torznab:attr name="season" value="1"/>
      <torznab:attr name="episode" value="1"/>
    </item>
  </channel>
</rss>
```

### Newznab Protocol

Newznab is the standard API for Usenet indexers, providing NZB file access.

**Key Characteristics:**
- XML-based response format
- Similar structure to Torznab
- Usenet-specific attributes (grabs, password status, completion)
- NZB file download support

**Standard Endpoints:**
```
GET /api?t=caps           # Get indexer capabilities
GET /api?t=search         # General search
GET /api?t=tvsearch       # TV-specific search
GET /api?t=movie          # Movie-specific search
GET /api?t=music          # Music-specific search
GET /api?t=book           # Book-specific search
GET /api?t=getnzb         # Download NZB file
```

**Search Parameters:**
```typescript
interface NewznabSearchParams {
  // Authentication
  apikey: string;

  // Search type
  t: 'search' | 'tvsearch' | 'movie' | 'music' | 'book' | 'getnzb';

  // General search
  q?: string;              // Search query
  cat?: string;            // Comma-separated category IDs
  limit?: number;          // Max results (default: 100)
  offset?: number;         // Pagination offset
  maxage?: number;         // Max age in days

  // TV-specific
  tvdbid?: number;         // TVDB ID
  rid?: number;            // TVRage ID (deprecated)
  tvmazeid?: number;       // TVMaze ID
  imdbid?: string;         // IMDB ID
  season?: number;         // Season number
  ep?: number;             // Episode number

  // Movie-specific
  tmdbid?: number;         // TMDB ID

  // NZB download
  id?: string;             // NZB GUID for download
}
```

**Response Format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:newznab="http://www.newznab.com/DTD/2010/feeds/attributes/">
  <channel>
    <title>Indexer Name</title>
    <item>
      <title>Release.Title.S01E01.1080p.WEB-DL</title>
      <guid>abc123-def456-ghi789</guid>
      <link>https://indexer.com/getnzb/abc123-def456-ghi789</link>
      <pubDate>Thu, 15 Jan 2026 12:00:00 +0000</pubDate>
      <size>1500000000</size>
      <category>5030</category>
      <newznab:attr name="grabs" value="100"/>
      <newznab:attr name="files" value="50"/>
      <newznab:attr name="poster" value="poster@example.com"/>
      <newznab:attr name="password" value="0"/>
      <newznab:attr name="tvdbid" value="12345"/>
      <newznab:attr name="season" value="1"/>
      <newznab:attr name="episode" value="1"/>
    </item>
  </channel>
</rss>
```

---

## Indexer Configuration

### Per-Indexer Settings

Each indexer is configured with the following settings:

```typescript
// backend/src/types/indexer.types.ts

export interface IndexerConfig {
  // Basic Info
  id: number;
  name: string;
  protocol: 'torznab' | 'newznab';
  implementation: string;

  // Connection
  baseUrl: string;
  apiPath: string;
  apiKey: string;

  // Categories
  categories: number[];
  animeCategories: number[];

  // Media Type Restrictions
  enabledMediaTypes: {
    tv: boolean;
    movies: boolean;
    anime: boolean;
    music: boolean;
  };

  // Rate Limiting
  rateLimitRequests: number;      // Requests per period
  rateLimitPeriod: number;        // Period in seconds

  // Priority & Behavior
  priority: number;               // Lower = higher priority
  seedRatio?: number;             // Minimum seed ratio (torrents only)
  seedTime?: number;              // Minimum seed time in minutes

  // Capabilities (auto-detected)
  capabilities: IndexerCapabilities;

  // State
  enabled: boolean;
  tags: number[];

  // Metadata
  added: Date;
  lastRssSync?: Date;
  lastSearch?: Date;
}

export interface IndexerCapabilities {
  supportsSearch: boolean;
  supportsTvSearch: boolean;
  supportsMovieSearch: boolean;
  supportsMusicSearch: boolean;
  supportsBookSearch: boolean;

  tvSearchParams: string[];       // ['q', 'tvdbid', 'season', 'ep']
  movieSearchParams: string[];    // ['q', 'tmdbid', 'imdbid']

  categories: IndexerCategory[];

  limits: {
    default: number;
    max: number;
  };
}

export interface IndexerCategory {
  id: number;
  name: string;
  subCategories?: IndexerCategory[];
}
```

### Configuration UI Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| Name | string | Display name for the indexer | Required |
| Protocol | enum | torznab or newznab | Required |
| Base URL | string | Indexer API base URL | Required |
| API Path | string | API endpoint path | `/api` |
| API Key | string | Authentication key | Required |
| Categories | number[] | Standard categories to search | Auto-detected |
| Anime Categories | number[] | Anime-specific categories | Auto-detected |
| Enable TV | boolean | Search for TV content | true |
| Enable Movies | boolean | Search for movie content | true |
| Enable Anime | boolean | Search for anime content | true |
| Enable Music | boolean | Search for music content | false |
| Priority | number | Search priority (1-50) | 25 |
| Rate Limit | number | Requests per minute | 20 |
| Seed Ratio | number | Minimum seed ratio | null |
| Seed Time | number | Minimum seed time (minutes) | null |
| Tags | number[] | Tags for filtering | [] |

---

## Category Mapping

### Standard Category IDs

idkarr uses Newznab standardized category IDs for consistent mapping across indexers.

**Category Structure:**
```
1000 - Console
2000 - Movies
  2010 - Foreign
  2020 - Other
  2030 - SD
  2040 - HD
  2045 - UHD
  2050 - BluRay
  2060 - 3D
  2070 - Anime (Movies)
3000 - Audio
  3010 - MP3
  3020 - Video
  3030 - Audiobook
  3040 - Lossless
  3050 - Podcast
4000 - PC
5000 - TV
  5010 - Foreign
  5020 - SD
  5030 - HD
  5040 - UHD
  5045 - Other
  5050 - Sport
  5060 - Anime (TV)
  5070 - Documentary
  5080 - Pack
6000 - XXX
7000 - Books
8000 - Other
```

### Media Type to Category Mapping

```typescript
// backend/src/core/indexer/constants/category-mappings.ts

export const CATEGORY_MAPPINGS = {
  // TV Series (standard)
  tv: {
    categories: [5000, 5010, 5020, 5030, 5040, 5045, 5070, 5080],
    preferredCategories: [5030, 5040],  // HD, UHD
    excludeCategories: [5060],          // Exclude anime from TV
  },

  // Movies
  movies: {
    categories: [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060],
    preferredCategories: [2040, 2045, 2050],  // HD, UHD, BluRay
    excludeCategories: [2070],                 // Exclude anime movies
  },

  // Anime (TV and Movies)
  anime: {
    categories: [5060, 2070],
    preferredCategories: [5060],        // Anime TV
    includeGeneralTv: false,            // Don't mix with regular TV
  },

  // Music
  music: {
    categories: [3000, 3010, 3020, 3040],
    preferredCategories: [3040],        // Lossless
    excludeCategories: [3030, 3050],    // Exclude audiobooks, podcasts
  },
} as const;

export type MediaType = keyof typeof CATEGORY_MAPPINGS;
```

### Category Resolution Service

```typescript
// backend/src/core/indexer/services/category-resolver.service.ts

import { CATEGORY_MAPPINGS, MediaType } from '../constants/category-mappings';
import { IndexerConfig, IndexerCategory } from '../types/indexer.types';

export class CategoryResolverService {
  /**
   * Get categories to search for a specific media type
   */
  getCategoriesForMediaType(
    indexer: IndexerConfig,
    mediaType: MediaType,
  ): number[] {
    const mapping = CATEGORY_MAPPINGS[mediaType];
    const indexerCategories = indexer.categories;

    // Filter to categories the indexer supports
    const supportedCategories = mapping.categories.filter(cat =>
      this.indexerSupportsCategory(indexer, cat),
    );

    // Exclude unwanted categories
    const filteredCategories = supportedCategories.filter(
      cat => !mapping.excludeCategories?.includes(cat),
    );

    return filteredCategories;
  }

  /**
   * Check if indexer supports a category
   */
  indexerSupportsCategory(indexer: IndexerConfig, categoryId: number): boolean {
    const caps = indexer.capabilities;
    if (!caps?.categories) return false;

    return caps.categories.some(cat => {
      if (cat.id === categoryId) return true;
      if (cat.subCategories) {
        return cat.subCategories.some(sub => sub.id === categoryId);
      }
      // Check parent category (e.g., 5000 matches 5030)
      const parentId = Math.floor(categoryId / 1000) * 1000;
      return cat.id === parentId;
    });
  }

  /**
   * Map indexer-specific category to idkarr media type
   */
  mapCategoryToMediaType(categoryId: number): MediaType | null {
    for (const [mediaType, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
      if (mapping.categories.includes(categoryId)) {
        return mediaType as MediaType;
      }
    }
    return null;
  }

  /**
   * Get all categories as comma-separated string for API query
   */
  getCategoryString(categories: number[]): string {
    return categories.join(',');
  }
}

export const categoryResolverService = new CategoryResolverService();
```

---

## Health Monitoring

### Health Metrics Tracked

```typescript
// backend/src/types/indexer-health.types.ts

export interface IndexerHealthStatus {
  indexerId: number;

  // Current State
  isHealthy: boolean;
  isDisabled: boolean;
  disabledUntil?: Date;

  // Response Metrics
  lastResponseTime: number;          // milliseconds
  averageResponseTime: number;       // rolling average
  minResponseTime: number;
  maxResponseTime: number;

  // Success/Failure Tracking
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
  failureRate: number;               // percentage

  // Recent Errors
  lastError?: {
    message: string;
    code?: string;
    timestamp: Date;
  };

  // Timestamps
  lastSuccessfulQuery: Date;
  lastFailedQuery?: Date;
  lastHealthCheck: Date;
}

export interface IndexerHealthThresholds {
  maxConsecutiveFailures: number;    // Auto-disable threshold
  maxFailureRatePercent: number;     // Degraded threshold
  maxResponseTimeMs: number;         // Slow threshold
  healthCheckIntervalMs: number;     // How often to check
  disableDurationMs: number;         // How long to disable
}
```

### Health Monitoring Service

```typescript
// backend/src/core/indexer/services/indexer-health.service.ts

import { db } from '@/db/client';
import { indexerStatus } from '@/db/schema';
import { eq, and, lt, gte } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const DEFAULT_THRESHOLDS: IndexerHealthThresholds = {
  maxConsecutiveFailures: 5,
  maxFailureRatePercent: 50,
  maxResponseTimeMs: 30000,
  healthCheckIntervalMs: 5 * 60 * 1000,  // 5 minutes
  disableDurationMs: 60 * 60 * 1000,      // 1 hour
};

export class IndexerHealthService {
  private thresholds: IndexerHealthThresholds;

  constructor(thresholds?: Partial<IndexerHealthThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Record a successful request
   */
  async recordSuccess(indexerId: number, responseTimeMs: number): Promise<void> {
    const status = await this.getOrCreateStatus(indexerId);

    const newAverage = this.calculateRollingAverage(
      status.averageResponseTime,
      responseTimeMs,
      status.totalRequests,
    );

    await db.update(indexerStatus)
      .set({
        totalRequests: status.totalRequests + 1,
        successfulRequests: status.successfulRequests + 1,
        consecutiveFailures: 0,
        lastResponseTime: responseTimeMs,
        averageResponseTime: newAverage,
        minResponseTime: Math.min(status.minResponseTime || responseTimeMs, responseTimeMs),
        maxResponseTime: Math.max(status.maxResponseTime || 0, responseTimeMs),
        lastSuccessfulQuery: new Date(),
        lastHealthCheck: new Date(),
        isHealthy: true,
        failureRate: this.calculateFailureRate(
          status.failedRequests,
          status.totalRequests + 1,
        ),
      })
      .where(eq(indexerStatus.indexerId, indexerId));

    logger.debug({ indexerId, responseTimeMs }, 'Recorded successful indexer request');
  }

  /**
   * Record a failed request
   */
  async recordFailure(
    indexerId: number,
    error: { message: string; code?: string },
  ): Promise<void> {
    const status = await this.getOrCreateStatus(indexerId);
    const consecutiveFailures = status.consecutiveFailures + 1;

    const shouldDisable = consecutiveFailures >= this.thresholds.maxConsecutiveFailures;

    await db.update(indexerStatus)
      .set({
        totalRequests: status.totalRequests + 1,
        failedRequests: status.failedRequests + 1,
        consecutiveFailures,
        lastError: error,
        lastFailedQuery: new Date(),
        lastHealthCheck: new Date(),
        isHealthy: !shouldDisable,
        isDisabled: shouldDisable,
        disabledUntil: shouldDisable
          ? new Date(Date.now() + this.thresholds.disableDurationMs)
          : null,
        failureRate: this.calculateFailureRate(
          status.failedRequests + 1,
          status.totalRequests + 1,
        ),
      })
      .where(eq(indexerStatus.indexerId, indexerId));

    if (shouldDisable) {
      logger.warn(
        { indexerId, consecutiveFailures, error },
        'Indexer auto-disabled due to consecutive failures',
      );
    } else {
      logger.debug({ indexerId, error }, 'Recorded failed indexer request');
    }
  }

  /**
   * Check if indexer is available for queries
   */
  async isAvailable(indexerId: number): Promise<boolean> {
    const status = await this.getStatus(indexerId);
    if (!status) return true;  // New indexer, assume available

    // Check if disabled
    if (status.isDisabled) {
      if (status.disabledUntil && status.disabledUntil <= new Date()) {
        // Re-enable after disable period
        await this.reenable(indexerId);
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Re-enable a disabled indexer
   */
  async reenable(indexerId: number): Promise<void> {
    await db.update(indexerStatus)
      .set({
        isDisabled: false,
        disabledUntil: null,
        consecutiveFailures: 0,
      })
      .where(eq(indexerStatus.indexerId, indexerId));

    logger.info({ indexerId }, 'Indexer re-enabled after disable period');
  }

  /**
   * Get health status for all indexers
   */
  async getAllStatuses(): Promise<IndexerHealthStatus[]> {
    return db.select().from(indexerStatus);
  }

  /**
   * Get health status for specific indexer
   */
  async getStatus(indexerId: number): Promise<IndexerHealthStatus | null> {
    const [status] = await db.select()
      .from(indexerStatus)
      .where(eq(indexerStatus.indexerId, indexerId));
    return status || null;
  }

  private async getOrCreateStatus(indexerId: number): Promise<IndexerHealthStatus> {
    const existing = await this.getStatus(indexerId);
    if (existing) return existing;

    const [created] = await db.insert(indexerStatus)
      .values({
        indexerId,
        isHealthy: true,
        isDisabled: false,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
        failureRate: 0,
        lastHealthCheck: new Date(),
      })
      .returning();

    return created;
  }

  private calculateRollingAverage(
    currentAvg: number,
    newValue: number,
    count: number,
  ): number {
    if (count === 0) return newValue;
    return Math.round((currentAvg * count + newValue) / (count + 1));
  }

  private calculateFailureRate(failures: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((failures / total) * 100);
  }
}

export const indexerHealthService = new IndexerHealthService();
```

### Auto-Disable Rules

| Condition | Action | Recovery |
|-----------|--------|----------|
| 5 consecutive failures | Disable for 1 hour | Auto re-enable after period |
| 50%+ failure rate (last 100 requests) | Mark as degraded | Manual review recommended |
| Response time > 30s average | Mark as slow | No auto-action |
| HTTP 401/403 errors | Disable permanently | Manual re-enable required |
| HTTP 429 (rate limited) | Temporary backoff | Exponential backoff |

---

## RSS Sync

### RSS Sync Configuration

```typescript
// backend/src/types/rss-sync.types.ts

export interface RssSyncConfig {
  enabled: boolean;
  syncIntervalMinutes: number;       // Default: 15
  processNewReleases: boolean;       // Auto-grab matching releases

  // Per-indexer overrides
  indexerOverrides: Record<number, {
    enabled?: boolean;
    syncIntervalMinutes?: number;
  }>;
}

export interface RssSyncResult {
  indexerId: number;
  indexerName: string;
  syncedAt: Date;

  // Results
  totalReleases: number;
  newReleases: number;
  matchedReleases: number;
  grabbedReleases: number;

  // Performance
  durationMs: number;

  // Errors
  error?: string;
}
```

### RSS Sync Worker

```typescript
// backend/src/workers/rss-sync.worker.ts

import { Worker, Job } from 'bullmq';
import { redis } from '@/cache/redis-client';
import { indexerService } from '@/core/indexer/services/indexer.service';
import { releaseMatchingService } from '@/core/search/services/release-matching.service';
import { logger } from '@/lib/logger';

interface RssSyncJobData {
  indexerId?: number;              // Specific indexer or all if undefined
  force?: boolean;                 // Bypass interval check
}

async function processRssSync(job: Job<RssSyncJobData>): Promise<RssSyncResult[]> {
  const { indexerId, force } = job.data;
  const results: RssSyncResult[] = [];

  // Get indexers to sync
  const indexers = indexerId
    ? [await indexerService.getById(indexerId)]
    : await indexerService.getEnabledIndexers();

  for (const indexer of indexers) {
    if (!indexer) continue;

    // Check if sync is due (unless forced)
    if (!force && !await shouldSync(indexer.id)) {
      logger.debug({ indexerId: indexer.id }, 'RSS sync not due yet');
      continue;
    }

    const startTime = Date.now();

    try {
      // Fetch RSS feed
      const releases = await indexerService.fetchRssFeed(indexer.id);

      // Filter to new releases (not seen before)
      const newReleases = await filterNewReleases(releases);

      // Match against wanted items
      const matched = await releaseMatchingService.matchReleases(newReleases);

      // Auto-grab matching releases based on settings
      const grabbed = await autoGrabReleases(matched);

      // Update last sync time
      await indexerService.updateLastRssSync(indexer.id);

      results.push({
        indexerId: indexer.id,
        indexerName: indexer.name,
        syncedAt: new Date(),
        totalReleases: releases.length,
        newReleases: newReleases.length,
        matchedReleases: matched.length,
        grabbedReleases: grabbed.length,
        durationMs: Date.now() - startTime,
      });

      logger.info(
        { indexerId: indexer.id, newReleases: newReleases.length, matched: matched.length },
        'RSS sync completed',
      );
    } catch (error) {
      logger.error({ indexerId: indexer.id, error }, 'RSS sync failed');
      results.push({
        indexerId: indexer.id,
        indexerName: indexer.name,
        syncedAt: new Date(),
        totalReleases: 0,
        newReleases: 0,
        matchedReleases: 0,
        grabbedReleases: 0,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

async function shouldSync(indexerId: number): Promise<boolean> {
  const lastSync = await redis.get(`indexer:lastRssSync:${indexerId}`);
  if (!lastSync) return true;

  const config = await indexerService.getRssSyncConfig();
  const intervalMs = (config.indexerOverrides[indexerId]?.syncIntervalMinutes
    || config.syncIntervalMinutes) * 60 * 1000;

  return Date.now() - new Date(lastSync).getTime() >= intervalMs;
}

async function filterNewReleases(releases: Release[]): Promise<Release[]> {
  // Filter releases we haven't seen before based on GUID
  const guids = releases.map(r => r.guid);
  const seen = await redis.smembers('rss:seen_guids');
  const seenSet = new Set(seen);

  const newReleases = releases.filter(r => !seenSet.has(r.guid));

  // Mark as seen (expire after 7 days)
  if (newReleases.length > 0) {
    await redis.sadd('rss:seen_guids', ...newReleases.map(r => r.guid));
    await redis.expire('rss:seen_guids', 7 * 24 * 60 * 60);
  }

  return newReleases;
}

async function autoGrabReleases(matched: MatchedRelease[]): Promise<MatchedRelease[]> {
  const grabbed: MatchedRelease[] = [];

  for (const match of matched) {
    if (match.shouldGrab && match.qualityMeetsProfile) {
      await downloadService.grabRelease(match);
      grabbed.push(match);
    }
  }

  return grabbed;
}

// Create worker
export const rssSyncWorker = new Worker('rss-sync', processRssSync, {
  connection: redis,
  concurrency: 1,  // Process one at a time to respect rate limits
});

// Schedule periodic RSS sync
export function scheduleRssSync(intervalMinutes: number = 15): void {
  setInterval(async () => {
    await rssSyncQueue.add('periodic-sync', {});
  }, intervalMinutes * 60 * 1000);
}
```

---

## Interactive Search

### Search Request Types

```typescript
// backend/src/types/search.types.ts

export interface SearchRequest {
  // Media identification
  mediaId?: number;
  mediaType: 'tv' | 'movie' | 'anime' | 'music';

  // TV-specific
  tvdbId?: number;
  seasonNumber?: number;
  episodeNumber?: number;

  // Movie-specific
  tmdbId?: number;
  imdbId?: string;
  year?: number;

  // General
  query?: string;

  // Options
  indexerIds?: number[];           // Specific indexers to search
  categories?: number[];           // Override categories
  limit?: number;                  // Max results per indexer
}

export interface SearchResult {
  // Release identification
  guid: string;
  indexerId: number;
  indexerName: string;

  // Release info
  title: string;
  size: number;
  publishDate: Date;
  downloadUrl: string;
  infoUrl?: string;

  // Quality
  quality: ParsedQuality;
  customFormatScore: number;

  // Torrent-specific
  seeders?: number;
  leechers?: number;
  infoHash?: string;
  downloadVolumeFactor?: number;   // 0 = freeleech
  uploadVolumeFactor?: number;

  // Usenet-specific
  grabs?: number;
  files?: number;

  // Matching
  mediaId?: number;
  seasonNumber?: number;
  episodeNumbers?: number[];

  // Scoring
  releaseWeight: number;           // Overall score
  rejected: boolean;
  rejectionReasons: string[];
}

export interface AggregatedSearchResults {
  query: SearchRequest;
  results: SearchResult[];

  // Metadata
  totalResults: number;
  indexersSearched: number;
  indexersFailed: number;

  // Performance
  searchDurationMs: number;

  // Errors
  errors: Array<{
    indexerId: number;
    indexerName: string;
    error: string;
  }>;
}
```

### Search Aggregation Service

```typescript
// backend/src/core/search/services/search-aggregation.service.ts

import { indexerService } from '@/core/indexer/services/indexer.service';
import { indexerHealthService } from '@/core/indexer/services/indexer-health.service';
import { releaseParserService } from '@/core/parsing/services/release-parser.service';
import { releaseScoringService } from '@/core/search/services/release-scoring.service';
import { searchDebouncingService } from '@/core/search/services/search-debouncing.service';
import { logger } from '@/lib/logger';

export class SearchAggregationService {
  /**
   * Perform interactive search across all enabled indexers
   */
  async search(request: SearchRequest): Promise<AggregatedSearchResults> {
    const startTime = Date.now();

    // Check debouncing
    const debounceResult = await searchDebouncingService.shouldSearch(request);
    if (!debounceResult.allowed) {
      logger.debug(
        { request, reason: debounceResult.reason },
        'Search blocked by debouncing',
      );
      return this.createEmptyResult(request, debounceResult.reason);
    }

    // Get available indexers
    const indexers = await this.getAvailableIndexers(request);

    if (indexers.length === 0) {
      return this.createEmptyResult(request, 'No available indexers');
    }

    // Search all indexers in parallel
    const searchPromises = indexers.map(indexer =>
      this.searchIndexer(indexer, request),
    );

    const searchResults = await Promise.allSettled(searchPromises);

    // Aggregate results
    const allResults: SearchResult[] = [];
    const errors: Array<{ indexerId: number; indexerName: string; error: string }> = [];

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      const indexer = indexers[i];

      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      } else {
        errors.push({
          indexerId: indexer.id,
          indexerName: indexer.name,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    // Deduplicate results
    const deduplicated = this.deduplicateResults(allResults);

    // Score and sort results
    const scored = await this.scoreResults(deduplicated, request);
    const sorted = scored.sort((a, b) => b.releaseWeight - a.releaseWeight);

    // Record search for debouncing
    await searchDebouncingService.recordSearch(request);

    return {
      query: request,
      results: sorted,
      totalResults: sorted.length,
      indexersSearched: indexers.length,
      indexersFailed: errors.length,
      searchDurationMs: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Get indexers available for this search
   */
  private async getAvailableIndexers(request: SearchRequest): Promise<IndexerConfig[]> {
    // Get enabled indexers
    let indexers = await indexerService.getEnabledIndexers();

    // Filter by specific indexer IDs if provided
    if (request.indexerIds?.length) {
      indexers = indexers.filter(i => request.indexerIds!.includes(i.id));
    }

    // Filter by media type support
    indexers = indexers.filter(i => {
      switch (request.mediaType) {
        case 'tv': return i.enabledMediaTypes.tv;
        case 'movie': return i.enabledMediaTypes.movies;
        case 'anime': return i.enabledMediaTypes.anime;
        case 'music': return i.enabledMediaTypes.music;
        default: return true;
      }
    });

    // Filter by health status
    const availableIndexers: IndexerConfig[] = [];
    for (const indexer of indexers) {
      if (await indexerHealthService.isAvailable(indexer.id)) {
        availableIndexers.push(indexer);
      }
    }

    // Sort by priority
    return availableIndexers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Search a single indexer
   */
  private async searchIndexer(
    indexer: IndexerConfig,
    request: SearchRequest,
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    try {
      const rawResults = await indexerService.search(indexer.id, request);

      // Record successful search
      await indexerHealthService.recordSuccess(indexer.id, Date.now() - startTime);

      // Parse and normalize results
      return rawResults.map(raw => this.normalizeResult(raw, indexer));
    } catch (error) {
      // Record failure
      await indexerHealthService.recordFailure(indexer.id, {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Deduplicate results across indexers
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      // Generate dedup key based on release characteristics
      const key = this.generateDedupKey(result);

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, result);
      } else {
        // Keep the result with better characteristics
        if (this.isBetterResult(result, existing)) {
          seen.set(key, result);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate deduplication key for a release
   */
  private generateDedupKey(result: SearchResult): string {
    // For torrents, use info hash if available
    if (result.infoHash) {
      return `hash:${result.infoHash.toLowerCase()}`;
    }

    // Otherwise, use normalized title + size
    const normalizedTitle = result.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    return `title:${normalizedTitle}:${result.size}`;
  }

  /**
   * Compare two results to determine which is better
   */
  private isBetterResult(a: SearchResult, b: SearchResult): boolean {
    // Prefer freeleech
    if ((a.downloadVolumeFactor || 1) < (b.downloadVolumeFactor || 1)) return true;

    // Prefer more seeders (torrents)
    if (a.seeders && b.seeders && a.seeders > b.seeders) return true;

    // Prefer higher grabs (usenet)
    if (a.grabs && b.grabs && a.grabs > b.grabs) return true;

    return false;
  }

  /**
   * Score results based on quality, custom formats, etc.
   */
  private async scoreResults(
    results: SearchResult[],
    request: SearchRequest,
  ): Promise<SearchResult[]> {
    return Promise.all(
      results.map(async result => {
        const score = await releaseScoringService.scoreRelease(result, request);
        return {
          ...result,
          releaseWeight: score.totalScore,
          rejected: score.rejected,
          rejectionReasons: score.rejectionReasons,
        };
      }),
    );
  }

  private normalizeResult(raw: any, indexer: IndexerConfig): SearchResult {
    const parsed = releaseParserService.parse(raw.title);

    return {
      guid: raw.guid,
      indexerId: indexer.id,
      indexerName: indexer.name,
      title: raw.title,
      size: raw.size,
      publishDate: new Date(raw.publishDate),
      downloadUrl: raw.downloadUrl,
      infoUrl: raw.infoUrl,
      quality: parsed?.quality || { resolution: 0, source: 'unknown' },
      customFormatScore: 0,
      seeders: raw.seeders,
      leechers: raw.leechers,
      infoHash: raw.infoHash,
      downloadVolumeFactor: raw.downloadVolumeFactor,
      uploadVolumeFactor: raw.uploadVolumeFactor,
      grabs: raw.grabs,
      files: raw.files,
      releaseWeight: 0,
      rejected: false,
      rejectionReasons: [],
    };
  }

  private createEmptyResult(
    request: SearchRequest,
    reason: string,
  ): AggregatedSearchResults {
    return {
      query: request,
      results: [],
      totalResults: 0,
      indexersSearched: 0,
      indexersFailed: 0,
      searchDurationMs: 0,
      errors: [{ indexerId: 0, indexerName: 'System', error: reason }],
    };
  }
}

export const searchAggregationService = new SearchAggregationService();
```

---

## Search Debouncing

### Debouncing Strategy

Search debouncing prevents redundant searches for content that was recently searched or is unlikely to have new results. This reduces API calls to indexers and improves overall system efficiency.

### Cooldown Rules

| Content Type | Condition | Cooldown Duration | Reason |
|--------------|-----------|-------------------|--------|
| **TV Episode** | Aired this week | Until next week | New releases unlikely before next episode |
| **TV Episode** | Aired < 24 hours ago | 4 hours | Allow time for releases to appear |
| **TV Episode** | Aired > 7 days ago | 24 hours | Releases should be available |
| **TV Season** | Currently airing | 12 hours | New episodes coming regularly |
| **TV Season** | Ended | 7 days | No new releases expected |
| **Movie** | Released < 30 days | 12 hours | New releases still appearing |
| **Movie** | Released 30-90 days | 24 hours | Most releases available |
| **Movie** | Released > 90 days | 7 days | Unlikely to find new releases |
| **Anime Episode** | Aired this week | 6 hours | Fansub groups may release at different times |
| **Any** | Manual search | No cooldown | User-initiated searches always allowed |
| **Any** | Previous search failed | 1 hour | Allow retry after failure |

### Debouncing Service

```typescript
// backend/src/core/search/services/search-debouncing.service.ts

import { redis } from '@/cache/redis-client';
import { mediaService } from '@/core/media/services/media.service';
import { logger } from '@/lib/logger';

interface DebounceResult {
  allowed: boolean;
  reason?: string;
  nextSearchAllowed?: Date;
}

interface CooldownRule {
  condition: (context: SearchContext) => boolean;
  cooldownMs: number;
  reason: string;
}

interface SearchContext {
  mediaType: 'tv' | 'movie' | 'anime' | 'music';
  mediaId?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  airDate?: Date;
  releaseDate?: Date;
  isManual: boolean;
  previousSearchFailed: boolean;
}

export class SearchDebouncingService {
  private rules: CooldownRule[] = [
    // Manual searches always allowed
    {
      condition: (ctx) => ctx.isManual,
      cooldownMs: 0,
      reason: 'Manual search',
    },

    // Retry after failure
    {
      condition: (ctx) => ctx.previousSearchFailed,
      cooldownMs: 60 * 60 * 1000,  // 1 hour
      reason: 'Retry after previous failure',
    },

    // TV Episode - aired this week
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'tv' || !ctx.airDate) return false;
        const daysSinceAir = this.daysSince(ctx.airDate);
        return daysSinceAir >= 0 && daysSinceAir < 7;
      },
      cooldownMs: 7 * 24 * 60 * 60 * 1000,  // Until next week
      reason: 'Episode aired this week - waiting for next episode cycle',
    },

    // TV Episode - aired < 24 hours
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'tv' || !ctx.airDate) return false;
        const hoursSinceAir = this.hoursSince(ctx.airDate);
        return hoursSinceAir >= 0 && hoursSinceAir < 24;
      },
      cooldownMs: 4 * 60 * 60 * 1000,  // 4 hours
      reason: 'Recently aired - allowing time for releases',
    },

    // TV Episode - aired > 7 days
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'tv' || !ctx.airDate) return false;
        return this.daysSince(ctx.airDate) > 7;
      },
      cooldownMs: 24 * 60 * 60 * 1000,  // 24 hours
      reason: 'Older episode - releases should be available',
    },

    // Movie - released < 30 days
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'movie' || !ctx.releaseDate) return false;
        return this.daysSince(ctx.releaseDate) < 30;
      },
      cooldownMs: 12 * 60 * 60 * 1000,  // 12 hours
      reason: 'Recent movie release - new versions may appear',
    },

    // Movie - released 30-90 days
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'movie' || !ctx.releaseDate) return false;
        const days = this.daysSince(ctx.releaseDate);
        return days >= 30 && days < 90;
      },
      cooldownMs: 24 * 60 * 60 * 1000,  // 24 hours
      reason: 'Movie in release window',
    },

    // Movie - released > 90 days
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'movie' || !ctx.releaseDate) return false;
        return this.daysSince(ctx.releaseDate) >= 90;
      },
      cooldownMs: 7 * 24 * 60 * 60 * 1000,  // 7 days
      reason: 'Older movie - unlikely to find new releases',
    },

    // Anime Episode - aired this week
    {
      condition: (ctx) => {
        if (ctx.mediaType !== 'anime' || !ctx.airDate) return false;
        const daysSinceAir = this.daysSince(ctx.airDate);
        return daysSinceAir >= 0 && daysSinceAir < 7;
      },
      cooldownMs: 6 * 60 * 60 * 1000,  // 6 hours
      reason: 'Recent anime - fansub groups release at different times',
    },
  ];

  /**
   * Check if search is allowed based on debouncing rules
   */
  async shouldSearch(request: SearchRequest): Promise<DebounceResult> {
    // Build search context
    const context = await this.buildContext(request);

    // Find applicable rule
    const rule = this.rules.find(r => r.condition(context));

    if (!rule) {
      // No rule applies, use default cooldown
      return this.checkDefaultCooldown(request);
    }

    if (rule.cooldownMs === 0) {
      return { allowed: true };
    }

    // Check if cooldown has passed
    const lastSearch = await this.getLastSearchTime(request);
    if (!lastSearch) {
      return { allowed: true };
    }

    const timeSinceSearch = Date.now() - lastSearch.getTime();
    if (timeSinceSearch >= rule.cooldownMs) {
      return { allowed: true };
    }

    const nextAllowed = new Date(lastSearch.getTime() + rule.cooldownMs);
    return {
      allowed: false,
      reason: rule.reason,
      nextSearchAllowed: nextAllowed,
    };
  }

  /**
   * Record that a search was performed
   */
  async recordSearch(request: SearchRequest): Promise<void> {
    const key = this.getSearchKey(request);
    await redis.set(key, new Date().toISOString());
    await redis.expire(key, 30 * 24 * 60 * 60);  // 30 day TTL
  }

  /**
   * Mark a search as failed (for retry logic)
   */
  async recordFailure(request: SearchRequest): Promise<void> {
    const key = `${this.getSearchKey(request)}:failed`;
    await redis.set(key, 'true');
    await redis.expire(key, 24 * 60 * 60);  // 24 hour TTL
  }

  /**
   * Clear cooldown for specific search (force re-search)
   */
  async clearCooldown(request: SearchRequest): Promise<void> {
    const key = this.getSearchKey(request);
    await redis.del(key);
    await redis.del(`${key}:failed`);
  }

  private async buildContext(request: SearchRequest): Promise<SearchContext> {
    const context: SearchContext = {
      mediaType: request.mediaType,
      mediaId: request.mediaId,
      seasonNumber: request.seasonNumber,
      episodeNumber: request.episodeNumber,
      isManual: request.isManual || false,
      previousSearchFailed: false,
    };

    // Check if previous search failed
    const failKey = `${this.getSearchKey(request)}:failed`;
    context.previousSearchFailed = (await redis.get(failKey)) === 'true';

    // Get media details for date info
    if (request.mediaId) {
      const media = await mediaService.getById(request.mediaId);
      if (media) {
        if (request.mediaType === 'movie') {
          context.releaseDate = media.releaseDate;
        } else if (request.episodeNumber !== undefined) {
          // Get episode air date
          const episode = await mediaService.getEpisode(
            request.mediaId,
            request.seasonNumber!,
            request.episodeNumber,
          );
          context.airDate = episode?.airDateUtc;
        }
      }
    }

    return context;
  }

  private async getLastSearchTime(request: SearchRequest): Promise<Date | null> {
    const key = this.getSearchKey(request);
    const timestamp = await redis.get(key);
    return timestamp ? new Date(timestamp) : null;
  }

  private async checkDefaultCooldown(request: SearchRequest): Promise<DebounceResult> {
    const lastSearch = await this.getLastSearchTime(request);
    if (!lastSearch) {
      return { allowed: true };
    }

    // Default 1 hour cooldown
    const defaultCooldown = 60 * 60 * 1000;
    const timeSince = Date.now() - lastSearch.getTime();

    if (timeSince >= defaultCooldown) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Default cooldown period',
      nextSearchAllowed: new Date(lastSearch.getTime() + defaultCooldown),
    };
  }

  private getSearchKey(request: SearchRequest): string {
    const parts = ['search', request.mediaType];

    if (request.mediaId) parts.push(`media:${request.mediaId}`);
    if (request.tvdbId) parts.push(`tvdb:${request.tvdbId}`);
    if (request.tmdbId) parts.push(`tmdb:${request.tmdbId}`);
    if (request.seasonNumber !== undefined) parts.push(`s${request.seasonNumber}`);
    if (request.episodeNumber !== undefined) parts.push(`e${request.episodeNumber}`);

    return parts.join(':');
  }

  private daysSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  }

  private hoursSince(date: Date): number {
    return Math.floor((Date.now() - date.getTime()) / (60 * 60 * 1000));
  }
}

export const searchDebouncingService = new SearchDebouncingService();
```

---

## Rate Limiting

### Rate Limiting Strategy

```typescript
// backend/src/core/indexer/services/rate-limiter.service.ts

import { redis } from '@/cache/redis-client';
import { logger } from '@/lib/logger';

interface RateLimitConfig {
  requestsPerPeriod: number;
  periodSeconds: number;
  backoffStrategy: 'linear' | 'exponential';
  maxBackoffSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remainingRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  requestsPerPeriod: 20,
  periodSeconds: 60,
  backoffStrategy: 'exponential',
  maxBackoffSeconds: 3600,  // 1 hour max backoff
};

export class RateLimiterService {
  /**
   * Check if request is allowed under rate limit
   */
  async checkLimit(indexerId: number): Promise<RateLimitResult> {
    const config = await this.getConfig(indexerId);
    const key = `ratelimit:${indexerId}`;

    // Get current request count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= config.requestsPerPeriod) {
      // Check for backoff
      const backoffKey = `ratelimit:backoff:${indexerId}`;
      const backoffUntil = await redis.get(backoffKey);

      if (backoffUntil) {
        const retryAfter = new Date(backoffUntil).getTime() - Date.now();
        if (retryAfter > 0) {
          return {
            allowed: false,
            retryAfterMs: retryAfter,
            remainingRequests: 0,
          };
        }
      }

      // Calculate backoff
      const backoffMs = this.calculateBackoff(indexerId, config);
      await this.setBackoff(indexerId, backoffMs);

      return {
        allowed: false,
        retryAfterMs: backoffMs,
        remainingRequests: 0,
      };
    }

    return {
      allowed: true,
      remainingRequests: config.requestsPerPeriod - count - 1,
    };
  }

  /**
   * Record a request (increment counter)
   */
  async recordRequest(indexerId: number): Promise<void> {
    const config = await this.getConfig(indexerId);
    const key = `ratelimit:${indexerId}`;

    const count = await redis.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, config.periodSeconds);
    }

    logger.debug(
      { indexerId, count, max: config.requestsPerPeriod },
      'Rate limit request recorded',
    );
  }

  /**
   * Handle HTTP 429 response from indexer
   */
  async handleRateLimitResponse(
    indexerId: number,
    retryAfterHeader?: string,
  ): Promise<void> {
    const config = await this.getConfig(indexerId);

    let backoffMs: number;
    if (retryAfterHeader) {
      // Use server-provided retry-after
      const retryAfter = parseInt(retryAfterHeader, 10);
      backoffMs = isNaN(retryAfter) ?
        this.calculateBackoff(indexerId, config) :
        retryAfter * 1000;
    } else {
      backoffMs = this.calculateBackoff(indexerId, config);
    }

    await this.setBackoff(indexerId, backoffMs);

    logger.warn(
      { indexerId, backoffMs },
      'Indexer rate limited, applying backoff',
    );
  }

  /**
   * Get remaining requests in current period
   */
  async getRemainingRequests(indexerId: number): Promise<number> {
    const config = await this.getConfig(indexerId);
    const key = `ratelimit:${indexerId}`;

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    return Math.max(0, config.requestsPerPeriod - count);
  }

  /**
   * Reset rate limit for indexer
   */
  async reset(indexerId: number): Promise<void> {
    await redis.del(`ratelimit:${indexerId}`);
    await redis.del(`ratelimit:backoff:${indexerId}`);
    await redis.del(`ratelimit:backoff_count:${indexerId}`);

    logger.info({ indexerId }, 'Rate limit reset');
  }

  private async getConfig(indexerId: number): Promise<RateLimitConfig> {
    // Get indexer-specific config from database
    const indexer = await indexerService.getById(indexerId);

    if (!indexer) {
      return DEFAULT_CONFIG;
    }

    return {
      requestsPerPeriod: indexer.rateLimitRequests || DEFAULT_CONFIG.requestsPerPeriod,
      periodSeconds: indexer.rateLimitPeriod || DEFAULT_CONFIG.periodSeconds,
      backoffStrategy: DEFAULT_CONFIG.backoffStrategy,
      maxBackoffSeconds: DEFAULT_CONFIG.maxBackoffSeconds,
    };
  }

  private async calculateBackoff(
    indexerId: number,
    config: RateLimitConfig,
  ): Promise<number> {
    const countKey = `ratelimit:backoff_count:${indexerId}`;
    const count = await redis.incr(countKey);
    await redis.expire(countKey, 24 * 60 * 60);  // Reset after 24 hours

    let backoffSeconds: number;

    if (config.backoffStrategy === 'exponential') {
      // Exponential backoff: 30s, 60s, 120s, 240s, ...
      backoffSeconds = Math.min(
        30 * Math.pow(2, count - 1),
        config.maxBackoffSeconds,
      );
    } else {
      // Linear backoff: 60s, 120s, 180s, ...
      backoffSeconds = Math.min(
        60 * count,
        config.maxBackoffSeconds,
      );
    }

    return backoffSeconds * 1000;
  }

  private async setBackoff(indexerId: number, backoffMs: number): Promise<void> {
    const key = `ratelimit:backoff:${indexerId}`;
    const until = new Date(Date.now() + backoffMs).toISOString();

    await redis.set(key, until);
    await redis.expire(key, Math.ceil(backoffMs / 1000) + 60);
  }
}

export const rateLimiterService = new RateLimiterService();
```

### Rate Limit Middleware

```typescript
// backend/src/core/indexer/middleware/rate-limit.middleware.ts

import { rateLimiterService } from '../services/rate-limiter.service';
import { logger } from '@/lib/logger';

export async function withRateLimit<T>(
  indexerId: number,
  operation: () => Promise<T>,
): Promise<T> {
  // Check if request is allowed
  const limitResult = await rateLimiterService.checkLimit(indexerId);

  if (!limitResult.allowed) {
    const error = new Error('Rate limit exceeded');
    (error as any).retryAfterMs = limitResult.retryAfterMs;
    throw error;
  }

  try {
    // Record the request
    await rateLimiterService.recordRequest(indexerId);

    // Execute operation
    return await operation();
  } catch (error) {
    // Check if it's a 429 response
    if ((error as any).status === 429) {
      await rateLimiterService.handleRateLimitResponse(
        indexerId,
        (error as any).headers?.['retry-after'],
      );
    }
    throw error;
  }
}
```

---

## Search Testing

### Test Search Interface

```typescript
// backend/src/types/test-search.types.ts

export interface TestSearchRequest {
  indexerId: number;
  searchType: 'capabilities' | 'search' | 'tvsearch' | 'movie';

  // Search parameters
  query?: string;
  tvdbId?: number;
  tmdbId?: number;
  season?: number;
  episode?: number;
  categories?: number[];
}

export interface TestSearchResult {
  success: boolean;

  // Connection info
  connectionTime: number;
  responseTime: number;

  // Capabilities (if requested)
  capabilities?: IndexerCapabilities;

  // Search results (if requested)
  results?: Array<{
    title: string;
    size: number;
    seeders?: number;
    category: number;
  }>;
  resultCount?: number;

  // Category mapping test
  categoryMapping?: {
    indexerCategories: number[];
    mappedMediaTypes: string[];
    unmappedCategories: number[];
  };

  // Errors
  error?: string;
  errorDetails?: string;
}
```

### Test Search Service

```typescript
// backend/src/core/indexer/services/test-search.service.ts

import { indexerService } from './indexer.service';
import { categoryResolverService } from './category-resolver.service';
import { logger } from '@/lib/logger';

export class TestSearchService {
  /**
   * Test indexer connectivity and capabilities
   */
  async testCapabilities(indexerId: number): Promise<TestSearchResult> {
    const startTime = Date.now();

    try {
      const indexer = await indexerService.getById(indexerId);
      if (!indexer) {
        return { success: false, connectionTime: 0, responseTime: 0, error: 'Indexer not found' };
      }

      const connectionStart = Date.now();
      const capabilities = await indexerService.fetchCapabilities(indexerId);
      const connectionTime = Date.now() - connectionStart;

      // Test category mapping
      const categoryMapping = this.testCategoryMapping(capabilities);

      return {
        success: true,
        connectionTime,
        responseTime: Date.now() - startTime,
        capabilities,
        categoryMapping,
      };
    } catch (error) {
      return {
        success: false,
        connectionTime: 0,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? error.stack : undefined,
      };
    }
  }

  /**
   * Perform test search
   */
  async testSearch(request: TestSearchRequest): Promise<TestSearchResult> {
    const startTime = Date.now();

    try {
      const indexer = await indexerService.getById(request.indexerId);
      if (!indexer) {
        return { success: false, connectionTime: 0, responseTime: 0, error: 'Indexer not found' };
      }

      // Build search query based on type
      const searchParams = this.buildSearchParams(request);

      const connectionStart = Date.now();
      const rawResults = await indexerService.searchRaw(request.indexerId, searchParams);
      const connectionTime = Date.now() - connectionStart;

      // Parse and summarize results
      const results = rawResults.slice(0, 10).map(r => ({
        title: r.title,
        size: r.size,
        seeders: r.seeders,
        category: r.category,
      }));

      return {
        success: true,
        connectionTime,
        responseTime: Date.now() - startTime,
        results,
        resultCount: rawResults.length,
      };
    } catch (error) {
      return {
        success: false,
        connectionTime: 0,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? error.stack : undefined,
      };
    }
  }

  /**
   * Test all enabled indexers
   */
  async testAllIndexers(): Promise<Map<number, TestSearchResult>> {
    const indexers = await indexerService.getEnabledIndexers();
    const results = new Map<number, TestSearchResult>();

    for (const indexer of indexers) {
      const result = await this.testCapabilities(indexer.id);
      results.set(indexer.id, result);
    }

    return results;
  }

  private buildSearchParams(request: TestSearchRequest): Record<string, any> {
    const params: Record<string, any> = {
      t: request.searchType,
      limit: 25,
    };

    if (request.query) params.q = request.query;
    if (request.tvdbId) params.tvdbid = request.tvdbId;
    if (request.tmdbId) params.tmdbid = request.tmdbId;
    if (request.season !== undefined) params.season = request.season;
    if (request.episode !== undefined) params.ep = request.episode;
    if (request.categories?.length) params.cat = request.categories.join(',');

    return params;
  }

  private testCategoryMapping(capabilities: IndexerCapabilities): {
    indexerCategories: number[];
    mappedMediaTypes: string[];
    unmappedCategories: number[];
  } {
    const indexerCategories = capabilities.categories.flatMap(c =>
      [c.id, ...(c.subCategories?.map(s => s.id) || [])],
    );

    const mappedMediaTypes = new Set<string>();
    const unmappedCategories: number[] = [];

    for (const catId of indexerCategories) {
      const mediaType = categoryResolverService.mapCategoryToMediaType(catId);
      if (mediaType) {
        mappedMediaTypes.add(mediaType);
      } else {
        unmappedCategories.push(catId);
      }
    }

    return {
      indexerCategories,
      mappedMediaTypes: Array.from(mappedMediaTypes),
      unmappedCategories,
    };
  }
}

export const testSearchService = new TestSearchService();
```

---

## Database Schema

### Drizzle Schema for Indexers

```typescript
// backend/src/db/schema/indexer.schema.ts

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const indexerProtocolEnum = pgEnum('indexer_protocol', ['torznab', 'newznab']);

// Main indexer table
export const indexer = pgTable('indexer', {
  id: serial('id').primaryKey(),

  // Basic Info
  name: text('name').notNull(),
  protocol: indexerProtocolEnum('protocol').notNull(),
  implementation: text('implementation').notNull().default('generic'),

  // Connection
  baseUrl: text('base_url').notNull(),
  apiPath: text('api_path').notNull().default('/api'),
  apiKey: text('api_key').notNull(),

  // Categories
  categories: jsonb('categories').$type<number[]>().notNull().default([]),
  animeCategories: jsonb('anime_categories').$type<number[]>().notNull().default([]),

  // Media Type Restrictions
  enableTv: boolean('enable_tv').notNull().default(true),
  enableMovies: boolean('enable_movies').notNull().default(true),
  enableAnime: boolean('enable_anime').notNull().default(true),
  enableMusic: boolean('enable_music').notNull().default(false),

  // Rate Limiting
  rateLimitRequests: integer('rate_limit_requests').notNull().default(20),
  rateLimitPeriod: integer('rate_limit_period').notNull().default(60),

  // Priority & Behavior
  priority: integer('priority').notNull().default(25),
  seedRatio: real('seed_ratio'),
  seedTime: integer('seed_time'),  // minutes

  // Capabilities (cached from indexer)
  capabilities: jsonb('capabilities').$type<{
    supportsSearch: boolean;
    supportsTvSearch: boolean;
    supportsMovieSearch: boolean;
    supportsMusicSearch: boolean;
    supportsBookSearch: boolean;
    tvSearchParams: string[];
    movieSearchParams: string[];
    categories: Array<{
      id: number;
      name: string;
      subCategories?: Array<{ id: number; name: string }>;
    }>;
    limits: { default: number; max: number };
  }>(),

  // State
  enabled: boolean('enabled').notNull().default(true),
  tags: jsonb('tags').$type<number[]>().notNull().default([]),

  // Metadata
  added: timestamp('added').notNull().defaultNow(),
  lastRssSync: timestamp('last_rss_sync'),
  lastSearch: timestamp('last_search'),
  lastCapabilitiesUpdate: timestamp('last_capabilities_update'),
});

// Indexer status/health tracking
export const indexerStatus = pgTable('indexer_status', {
  id: serial('id').primaryKey(),
  indexerId: integer('indexer_id').notNull().references(() => indexer.id, { onDelete: 'cascade' }),

  // Current State
  isHealthy: boolean('is_healthy').notNull().default(true),
  isDisabled: boolean('is_disabled').notNull().default(false),
  disabledUntil: timestamp('disabled_until'),

  // Response Metrics
  lastResponseTime: integer('last_response_time'),
  averageResponseTime: integer('average_response_time'),
  minResponseTime: integer('min_response_time'),
  maxResponseTime: integer('max_response_time'),

  // Success/Failure Tracking
  totalRequests: integer('total_requests').notNull().default(0),
  successfulRequests: integer('successful_requests').notNull().default(0),
  failedRequests: integer('failed_requests').notNull().default(0),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  failureRate: real('failure_rate').notNull().default(0),

  // Recent Errors
  lastError: jsonb('last_error').$type<{
    message: string;
    code?: string;
    timestamp: string;
  }>(),

  // Timestamps
  lastSuccessfulQuery: timestamp('last_successful_query'),
  lastFailedQuery: timestamp('last_failed_query'),
  lastHealthCheck: timestamp('last_health_check'),
});

// Search history for debouncing
export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),

  // Search identification
  searchKey: text('search_key').notNull(),  // Unique key for this search type
  mediaType: text('media_type').notNull(),
  mediaId: integer('media_id'),
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  seasonNumber: integer('season_number'),
  episodeNumber: integer('episode_number'),

  // Search metadata
  indexerIds: jsonb('indexer_ids').$type<number[]>(),
  resultCount: integer('result_count'),
  wasSuccessful: boolean('was_successful').notNull().default(true),

  // Timestamps
  searchedAt: timestamp('searched_at').notNull().defaultNow(),
  nextSearchAllowed: timestamp('next_search_allowed'),
});

// Relations
export const indexerRelations = relations(indexer, ({ one }) => ({
  status: one(indexerStatus, {
    fields: [indexer.id],
    references: [indexerStatus.indexerId],
  }),
}));

export const indexerStatusRelations = relations(indexerStatus, ({ one }) => ({
  indexer: one(indexer, {
    fields: [indexerStatus.indexerId],
    references: [indexer.id],
  }),
}));

// Indexes
export const indexerIndexes = {
  enabledIdx: index('idx_indexer_enabled').on(indexer.enabled),
  protocolIdx: index('idx_indexer_protocol').on(indexer.protocol),
};

export const searchHistoryIndexes = {
  searchKeyIdx: index('idx_search_history_key').on(searchHistory.searchKey),
  mediaIdIdx: index('idx_search_history_media').on(searchHistory.mediaId),
  searchedAtIdx: index('idx_search_history_searched_at').on(searchHistory.searchedAt),
};
```

### TypeScript Types from Schema

```typescript
// backend/src/types/db/indexer.types.ts

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { indexer, indexerStatus, searchHistory } from '@/db/schema/indexer.schema';

export type Indexer = InferSelectModel<typeof indexer>;
export type NewIndexer = InferInsertModel<typeof indexer>;

export type IndexerStatus = InferSelectModel<typeof indexerStatus>;
export type NewIndexerStatus = InferInsertModel<typeof indexerStatus>;

export type SearchHistory = InferSelectModel<typeof searchHistory>;
export type NewSearchHistory = InferInsertModel<typeof searchHistory>;

// Extended types with relations
export type IndexerWithStatus = Indexer & {
  status: IndexerStatus | null;
};
```

---

## API Endpoints

### REST API Routes

```typescript
// backend/src/api/routes/indexer.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { indexerService } from '@/core/indexer/services/indexer.service';
import { testSearchService } from '@/core/indexer/services/test-search.service';
import { indexerHealthService } from '@/core/indexer/services/indexer-health.service';
import { authMiddleware, requirePermission } from '@/middleware/auth.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const indexerRoutes = new Hono();

// Validation schemas
const createIndexerSchema = z.object({
  name: z.string().min(1).max(100),
  protocol: z.enum(['torznab', 'newznab']),
  baseUrl: z.string().url(),
  apiPath: z.string().default('/api'),
  apiKey: z.string().min(1),
  categories: z.array(z.number()).default([]),
  animeCategories: z.array(z.number()).default([]),
  enableTv: z.boolean().default(true),
  enableMovies: z.boolean().default(true),
  enableAnime: z.boolean().default(true),
  enableMusic: z.boolean().default(false),
  rateLimitRequests: z.number().min(1).max(1000).default(20),
  rateLimitPeriod: z.number().min(1).max(3600).default(60),
  priority: z.number().min(1).max(50).default(25),
  seedRatio: z.number().min(0).optional(),
  seedTime: z.number().min(0).optional(),
  enabled: z.boolean().default(true),
  tags: z.array(z.number()).default([]),
});

const updateIndexerSchema = createIndexerSchema.partial();

const testSearchSchema = z.object({
  searchType: z.enum(['capabilities', 'search', 'tvsearch', 'movie']),
  query: z.string().optional(),
  tvdbId: z.number().optional(),
  tmdbId: z.number().optional(),
  season: z.number().optional(),
  episode: z.number().optional(),
  categories: z.array(z.number()).optional(),
});

// GET /api/v3/indexer - List all indexers
indexerRoutes.get('/', authMiddleware, async (c) => {
  const indexers = await indexerService.getAll();
  return c.json({ data: indexers });
});

// GET /api/v3/indexer/:id - Get indexer by ID
indexerRoutes.get('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const indexer = await indexerService.getById(id);

  if (!indexer) {
    return c.json({ error: 'Indexer not found' }, 404);
  }

  return c.json({ data: indexer });
});

// POST /api/v3/indexer - Create indexer
indexerRoutes.post(
  '/',
  authMiddleware,
  requirePermission('indexer', 'create'),
  validationMiddleware(createIndexerSchema),
  async (c) => {
    const body = c.req.valid('json');
    const indexer = await indexerService.create(body);
    return c.json({ data: indexer }, 201);
  },
);

// PUT /api/v3/indexer/:id - Update indexer
indexerRoutes.put(
  '/:id',
  authMiddleware,
  requirePermission('indexer', 'update'),
  validationMiddleware(updateIndexerSchema),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const indexer = await indexerService.update(id, body);

    if (!indexer) {
      return c.json({ error: 'Indexer not found' }, 404);
    }

    return c.json({ data: indexer });
  },
);

// DELETE /api/v3/indexer/:id - Delete indexer
indexerRoutes.delete(
  '/:id',
  authMiddleware,
  requirePermission('indexer', 'delete'),
  async (c) => {
    const id = Number(c.req.param('id'));
    await indexerService.delete(id);
    return c.json({ success: true });
  },
);

// GET /api/v3/indexer/:id/status - Get indexer health status
indexerRoutes.get('/:id/status', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'));
  const status = await indexerHealthService.getStatus(id);
  return c.json({ data: status });
});

// POST /api/v3/indexer/:id/test - Test indexer
indexerRoutes.post(
  '/:id/test',
  authMiddleware,
  validationMiddleware(testSearchSchema),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');

    let result;
    if (body.searchType === 'capabilities') {
      result = await testSearchService.testCapabilities(id);
    } else {
      result = await testSearchService.testSearch({
        indexerId: id,
        ...body,
      });
    }

    return c.json({ data: result });
  },
);

// POST /api/v3/indexer/:id/enable - Enable indexer
indexerRoutes.post(
  '/:id/enable',
  authMiddleware,
  requirePermission('indexer', 'update'),
  async (c) => {
    const id = Number(c.req.param('id'));
    await indexerService.setEnabled(id, true);
    await indexerHealthService.reenable(id);
    return c.json({ success: true });
  },
);

// POST /api/v3/indexer/:id/disable - Disable indexer
indexerRoutes.post(
  '/:id/disable',
  authMiddleware,
  requirePermission('indexer', 'update'),
  async (c) => {
    const id = Number(c.req.param('id'));
    await indexerService.setEnabled(id, false);
    return c.json({ success: true });
  },
);

// POST /api/v3/indexer/:id/sync - Trigger RSS sync
indexerRoutes.post(
  '/:id/sync',
  authMiddleware,
  requirePermission('indexer', 'update'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const result = await indexerService.triggerRssSync(id);
    return c.json({ data: result });
  },
);

// GET /api/v3/indexer/status - Get all indexer statuses
indexerRoutes.get('/status/all', authMiddleware, async (c) => {
  const statuses = await indexerHealthService.getAllStatuses();
  return c.json({ data: statuses });
});

// POST /api/v3/indexer/test/all - Test all indexers
indexerRoutes.post(
  '/test/all',
  authMiddleware,
  async (c) => {
    const results = await testSearchService.testAllIndexers();
    return c.json({ data: Object.fromEntries(results) });
  },
);

export default indexerRoutes;
```

### API Response Types

```typescript
// backend/src/types/api/indexer.responses.ts

import type { Indexer, IndexerStatus } from '@/types/db/indexer.types';

// GET /api/v3/indexer
export interface ListIndexersResponse {
  data: Indexer[];
}

// GET /api/v3/indexer/:id
export interface GetIndexerResponse {
  data: Indexer;
}

// POST /api/v3/indexer
export interface CreateIndexerResponse {
  data: Indexer;
}

// PUT /api/v3/indexer/:id
export interface UpdateIndexerResponse {
  data: Indexer;
}

// DELETE /api/v3/indexer/:id
export interface DeleteIndexerResponse {
  success: boolean;
}

// GET /api/v3/indexer/:id/status
export interface GetIndexerStatusResponse {
  data: IndexerStatus;
}

// POST /api/v3/indexer/:id/test
export interface TestIndexerResponse {
  data: {
    success: boolean;
    connectionTime: number;
    responseTime: number;
    capabilities?: object;
    results?: Array<{
      title: string;
      size: number;
      seeders?: number;
      category: number;
    }>;
    resultCount?: number;
    categoryMapping?: {
      indexerCategories: number[];
      mappedMediaTypes: string[];
      unmappedCategories: number[];
    };
    error?: string;
    errorDetails?: string;
  };
}

// GET /api/v3/indexer/status/all
export interface GetAllIndexerStatusesResponse {
  data: IndexerStatus[];
}

// Error response
export interface IndexerErrorResponse {
  error: string;
  details?: string;
}
```

---

## Configuration Examples

### Example Indexer Configurations

**Public Torznab Indexer:**
```json
{
  "name": "1337x",
  "protocol": "torznab",
  "baseUrl": "https://torznab.example.com",
  "apiPath": "/api",
  "apiKey": "your-api-key",
  "categories": [2000, 5000],
  "enableTv": true,
  "enableMovies": true,
  "enableAnime": false,
  "rateLimitRequests": 10,
  "rateLimitPeriod": 60,
  "priority": 30,
  "enabled": true
}
```

**Private Usenet Indexer:**
```json
{
  "name": "NZBGeek",
  "protocol": "newznab",
  "baseUrl": "https://api.nzbgeek.info",
  "apiPath": "/api",
  "apiKey": "your-nzbgeek-api-key",
  "categories": [2000, 2040, 2045, 5000, 5030, 5040],
  "enableTv": true,
  "enableMovies": true,
  "enableAnime": true,
  "rateLimitRequests": 100,
  "rateLimitPeriod": 60,
  "priority": 10,
  "enabled": true
}
```

**Anime-Specific Indexer:**
```json
{
  "name": "Nyaa",
  "protocol": "torznab",
  "baseUrl": "https://nyaa.example.com",
  "apiPath": "/api",
  "apiKey": "your-api-key",
  "categories": [5060, 2070],
  "animeCategories": [5060, 2070],
  "enableTv": false,
  "enableMovies": false,
  "enableAnime": true,
  "rateLimitRequests": 20,
  "rateLimitPeriod": 60,
  "priority": 5,
  "enabled": true
}
```

---

## Summary

This indexer management system provides:

1. **Built-in Prowlarr Replacement**: No external indexer manager needed
2. **Full Protocol Support**: Torznab and Newznab with all standard features
3. **Comprehensive Configuration**: Per-indexer settings for all use cases
4. **Smart Category Mapping**: Automatic mapping between indexer categories and media types
5. **Robust Health Monitoring**: Response tracking, failure detection, auto-disable
6. **Efficient RSS Sync**: Configurable intervals, new release detection, auto-grab
7. **Intelligent Search**: Result aggregation, deduplication, scoring
8. **Search Debouncing**: Prevents redundant searches based on content state
9. **Rate Limiting**: Per-indexer limits with exponential backoff
10. **Testing Tools**: Built-in test searches and capability verification
11. **Type-Safe Schema**: Full Drizzle schema with TypeScript types
12. **Complete API**: RESTful endpoints for all indexer operations

This replaces the need for Prowlarr while providing tighter integration with the idkarr media management system.

*End of Indexer Management Documentation*
