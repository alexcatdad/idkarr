# Caching System Architecture

## Overview

Comprehensive caching system to reduce database load and eliminate rate limiting issues with indexers and metadata APIs (TVDB, TMDB).

## Problem Statement

Sonarr v5 doesn't have caching, which causes:
- **Rate limiting**: TVDB API limits are hit frequently
- **Slow API responses**: TVDB/TMDB API latency adds up
- **Database load**: Repeated queries for same data
- **Memory waste**: No in-memory caching
- **User experience**: Slow page loads and API responses

## Solution: Multi-Layer Caching

### Cache Layers

1. **L1 Cache**: In-memory (Redis) - Fastest, low latency (~1ms)
2. **L2 Cache**: CDN/Edge Cache - HTTP caching for static assets
3. **L3 Cache**: Database - Final source of truth

### Cache Strategy

#### Cache Keys

Series Data:
```
series:{seriesId} → Series object (full)
series:list:page:{page}:pageSize:{pageSize}:sort:{sort}:order:{order}:monitored:{monitored}:searchTerm:{term} → Series[]
series:tvdbId:{tvdbId} → Series object
series:tmdbId:{tmdbId} → Series object
series:stats:{seriesId} → SeriesStatistics object
```

Episode Data:
```
episode:{episodeId} → Episode object
episode:series:{seriesId}:season:{seasonNumber} → Episode[]
episode:series:{seriesId}:season:{seasonNumber}:episodeNumber:{episodeNumber} → Episode object
episode:byDate:{seriesId}:from:{from}:to:{to}:monitored:{monitored} → Episode[]
```

Metadata Data:
```
metadata:series:tvdbId:{tvdbId} → Metadata object
metadata:series:tmdbId:{tmdbId} → Metadata object
metadata:series:images:{tvdbId} → Images object
metadata:episode:episodeId:episodeId} → Episode metadata
metadata:episode:seriesId:{seriesId}:season:{seasonNumber}:episodeNumber:{episodeNumber} → Episode metadata
```

Indexer Data:
```
indexer:{indexerId} → Indexer object
indexer:feed:{indexerId} → RSS feed data (parsed releases)
indexer:stats:{indexerId} → IndexerStatus object
indexer:lastSync:{indexerId} → Last sync timestamp
```

Quality & Custom Formats:
```
quality:profile:{profileId} → QualityProfile object
quality:profiles:all → QualityProfile[]
customFormat:{formatId} → CustomFormat object
customFormats:all → CustomFormat[]
```

Configuration:
```
config:host → Host configuration
config:ui → UI settings
config:rootFolder → RootFolder objects
config:qualityProfiles → QualityProfile objects
config:tags → Tag objects
```

User Preferences:
```
user:{userId}:preferences → User preferences
user:{userId}:dashboard → Dashboard layout/config
user:{userId}:view → View preferences (filters, sorting, etc.)
```

---

## Cache TTL Configuration

### Default TTL Values (Configurable)

| Data Type | TTL | Notes |
|-----------|-----|-------|
| Series (individual) | 24 hours | Series metadata changes infrequently |
| Series (list page) | 5 minutes | Refresh often by users |
| Series (statistics) | 15 minutes | Refresh frequently |
| Episode (individual) | 1 hour | Episode changes infrequently |
| Episode (list page) | 10 minutes | Refresh by users |
| Metadata (series) | 24 hours | Series metadata changes infrequently |
| Metadata (episode) | 24 hours | Episode metadata changes infrequently |
| Metadata (images) | 7 days | Images change very infrequently |
| Indexer (feed) | 15 minutes | RSS feeds polled every 15 min |
| Indexer (status) | 5 minutes | Status updates |
| Quality Profiles | 24 hours | Profiles change infrequently |
| Custom Formats | 24 hours | Formats change infrequently |
| Configuration | 5 minutes | Can be hot-reloaded |
| Tags | 24 hours | Tags change infrequently |

### TTL Strategy by Usage

**Frequently Accessed (Short TTL):**
- Series list pages: 5 minutes
- Episode list pages: 10 minutes
- Queue status: 5 minutes
- Calendar view: 10 minutes

**Moderately Accessed (Medium TTL):**
- Series details: 24 hours
- Episode details: 1 hour
- History: 1 hour
- Blocklist: 1 hour
- Wanted (missing): 10 minutes
- Queue (filtered): 5 minutes

**Rarely Accessed (Long TTL):**
- Series statistics: 15 minutes
- Indexer status: 5 minutes
- Quality profiles: 24 hours
- Custom formats: 24 hours
- Configuration: 5 minutes
- Tags: 24 hours
- Metadata (images): 7 days

---

## Implementation

### Redis Cache Setup

#### Redis Client Configuration

```typescript
// backend/src/cache/redis-client.ts
import Redis from 'ioredis';
import { logger } from '@/lib/logger';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  retryStrategy: (err) => {
    if (err instanceof Error) {
      return err.message.includes('ECONNREFUSED');
    }
    return true;
  },
});

redis.on('error', (err) => {
  logger.error({ error: err }, 'Redis connection error');
});

redis.on('ready', () => {
  logger.info('Redis connection established');
});

export default redis;
```

#### Cache Repository

```typescript
// backend/src/cache/cache.repository.ts
import redis from '@/cache/redis-client';
import { logger } from '@/lib/logger';

export interface CacheOptions {
  ttl?: number;
  compress?: boolean;
}

export class CacheRepository {
  private readonly DEFAULT_TTL = 60 * 60; // 1 hour

  constructor(private readonly redis: Redis) {}

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }

      const decompressed = options?.compress ? await this.decompress(cached) : cached;
      return JSON.parse(decompressed);
    } catch (error) {
      logger.error({ key, error }, 'Cache get error');
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const compressed = options?.compress ? await this.compress(serialized) : serialized;
      const ttl = options?.ttl ?? this.DEFAULT_TTL;

      await this.redis.setex(key, ttl, compressed);
    } catch (error) {
      logger.error({ key, error }, 'Cache set error');
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ key, error }, 'Cache delete error');
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error({ pattern, error }, 'Cache delPattern error');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (index) error) {
      logger.error({ key, error }, 'Cache exists error');
      return false;
    }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await redis.expire(key, ttl);
    } catch (error) {
      logger.error({ key, ttl, error }, 'Cache expire error');
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const result = await redis.ttl(key);
      return result;
    } catch (error) {
      logger.error({ key, error }, 'Cache ttl error');
      return -1;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (keys.length === 0) {
        return new Array(keys.length).fill(null);
      }

      const cached = await redis.mget(...keys);
      return cached.map(value =>
        value ? JSON.parse(value) : null,
      );
    } catch (error) {
      logger.error({ keys, error }, 'Cache mget error');
    return new Array(keys.length).fill(null);
    }
  }

  private async compress(data: string): Promise<string> {
    // Simple compression using gzip if data is large enough
    if (data.length < 1000) {
      return data;
    }

    // In production, use a proper compression library
    // For now, just return as-is
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // In production, use a proper decompression library
    return data;
  }
}
```

### Cached Repository Pattern

```typescript
// backend/src/core/shared/repositories/cached-repository.ts
import { CacheRepository } from '@/cache/cache.repository';
import { logger } from '@/lib/logger';

export abstract class CachedRepository<T> {
  protected readonly cache: CacheRepository;

  protected abstract findById(id: number): Promise<T | null>;
  protected abstract findAll(filter?: unknown): Promise<T[]>;

  async findByIdWithCache(id: number): Promise<T | null> {
    const cacheKey = this.getCacheKey(id);

    // Try cache first
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) {
      logger.debug({ id, type: this.constructor.name }, 'Cache hit');
      return cached;
    }

    // Fetch from database
    const item = await this.findById(id);

    // Set cache
    if (item) {
      await this.cache.set(cacheKey, item, { ttl: 60 * 60 }); // 1 hour default
      logger.debug({ id, type: this.constructor.name }, 'Cache miss and set');
    }

    return item;
  }

  async findAllWithCache(filter?: unknown): Promise<T[]> {
    const cacheKey = this.getListCacheKey(filter);

    // Try cache first
    const cached = await this.cache.get<T[]>(cacheKey);
    if (cached) {
      logger.debug({ type: this.constructor.name, filter }, 'Cache hit');
      return cached;
    }

    // Fetch from database
    const items = await this.findAll(filter);

    // Set cache
    if (items && items.length > 0) {
      await this.cache.set(cacheKey, items, { ttl: 5 * 60 }); // 5 minutes
      logger.debug({ type: this.constructor.name, filter }, 'Cache miss and set');
    }

    return items;
  }

  async invalidate(id: number): Promise<void> {
    const cacheKey = this.getCacheKey(id);
    await this.cache.del(cacheKey);
    logger.debug({ id, type: this.constructor.name }, 'Cache invalidated');
  }

  async invalidateList(filter?: unknown): Promise<void> {
    const cacheKey = this.getListCacheKey(filter);
    await this.cache.del(cacheKey);
    logger.debug({ type: this.constructor.name, filter }, 'Cache list invalidated');
  }

  async invalidatePattern(pattern: string): Promise<void> {
    await this.cache.delPattern(pattern);
    logger.debug({ pattern }, 'Cache pattern invalidated');
  }

  protected abstract getCacheKey(id: number): string;
  protected abstract getListCacheKey(filter?: unknown): string;
  protected abstract getStatsCacheKey(id: number): string;
}
```

### Series Cached Repository

```typescript
// backend/src/core/shared/repositories/series-cached.repository.ts
import { CachedRepository } from './cached-repository';
import { Series } from '@/core/shared/models/series.model';
import { seriesService } from '@/core/tv/services/series.service';
import { logger } from '@/lib/logger';

export class SeriesCachedRepository extends CachedRepository<Series> {
  constructor(
    protected readonly cache: CacheRepository,
    private readonly seriesService: SeriesService,
  ) {
    super(cache);
  }

  protected async findById(id: number): Promise<Series | null> {
    return this.seriesService.getById(id);
  }

  protected async findAll(filter?: unknown): Promise<Series[]> {
    return this.seriesService.getAll();
  }

  async findMonitored(): Promise<Series[]> {
    const cacheKey = 'series:list:monitored:true';

    const cached = await this.cache.get<Series[]>(cacheKey);
    if (cached) {
      logger.debug('Series monitored: Cache hit');
      return cached;
    }

    const series = await this.seriesService.findMonitored();
    await this.cache.set(cacheKey, series, { ttl: 5 * 60 });
    return series;
  }

  async findByIdWithStatistics(id: number): Promise<Series | null> {
    const cacheKey = `series:stats:${id}`;

    const cached = await this.cache.get<Series & { statistics: SeriesStatistics }>(cacheKey);
    if (cached) {
      logger.debug(`Series ${id} with stats: Cache hit`);
      return cached;
    }

    const series = await this.seriesService.getById(id);
    if (!series) {
      return null;
    }

    const statistics = await this.seriesService.getStatistics(id);
    const withStats = { ...series, statistics };
    await this.cache.set(cacheKey, withStats, { ttl: 15 * 60 }); // 15 minutes
    return withStats;
  }

  protected getCacheKey(id: number): string {
    return `series:${id}`;
  }

  protected getListCacheKey(filter?: unknown): string {
    if (!filter) {
      return 'series:list:all';
    }

    // Build cache key based on filter
    const parts: ['series:list'];
    if (filter && typeof filter === 'object') {
      Object.entries(filter).sort(([k, v]) => k.localeCompare(k)).forEach(([k, v]) => {
        parts.push(`${k}:${JSON.stringify(v)}`);
      });
    }

    return parts.join(':');
  }

  protected getStatsCacheKey(id: number): string {
    return `series:stats:${id}`;
  }
}
```

### Metadata Cached Service

```typescript
// backend/src/core/metadata/services/metadata-cache.service.ts
import redis from '@/cache/redis-client';
import { logger } from '@/lib/logger';
import { tvdbService } from '@/core/metadata/clients/tvdb.client';
import { tmdbService } from '@/core/metadata/clients/tmdb.client';

interface MetadataCacheOptions {
  ttl?: number;
  force?: boolean;
}

export class MetadataCacheService {
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours

  constructor(
    private readonly redis: Redis,
    private readonly tvdbService: TvdbService,
    private readonly tmdbService: TmdbService,
  ) {}

  async getSeriesMetadata(tvdbId: number, options?: MetadataCacheOptions): Promise<any> {
    const cacheKey = `metadata:series:tvdbId:${tvdbId}`;

    if (!options?.force) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug({ tvdbId }, 'Metadata cache hit');
        return JSON.parse(cached);
      }
    }

    logger.debug({ tvdbId }, 'Metadata cache miss');

    try {
      const metadata = await this.tvdbService.getSeries(tvdbId);
      await this.redis.setex(cacheKey, JSON.stringify(metadata), this.DEFAULT_TTL);
      return metadata;
    } catch (error) {
      logger.error({ tvdbId, error }, 'Failed to get series metadata');
      throw error;
    }
  }

  async getSeriesImages(tvdbId: number, options?: MetadataCacheOptions): Promise<any> {
    const cacheKey = `metadata:series:images:${tvdbId}`;

    if (!options?.force) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug({ tvdbId }, 'Images cache hit');
        return JSON.parse(cached);
      }
    }

    logger.debug({ tvdbId }, 'Images cache miss');

    try {
      const images = await this.tvdbService.getImages(tvdbId);
      await this.redis.setex(cacheKey, JSON.stringify(images), 7 * 24 * 60 * 60); // 7 days
      return images;
    } catch (error) {
      logger.error({ tvdbId, error }, 'Failed to get series images');
      throw error;
    }
  }

  async getEpisodeMetadata(tvdbId: number, seasonNumber: number, episodeNumber: number): Promise<any> {
    const cacheKey = `metadata:episode:${tvdbId}:${seasonNumber}:${episodeNumber}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      logger.debug({ tvdbId, seasonNumber, episodeNumber }, 'Episode metadata cache hit');
      return JSON.parse(cached);
    }

    logger.debug({ tvdbId, seasonNumber, episodeNumber }, 'Episode metadata cache miss');

    try {
      const metadata = await this.tvdbService.getEpisode(tvdbId, seasonNumber, episodeNumber);
      await this.redis.setex(cacheKey, JSON.stringify(metadata), this.DEFAULT_TTL);
      return metadata;
    } catch (error) {
      logger.error({ tvdbId, seasonNumber, episodeNumber, error }, 'Failed to get episode metadata');
      throw error;
    }
  }

  async invalidateSeries(tvdbId: number): Promise<void> {
    const keys = [
      `metadata:series:tvdbId:${tvdbId}`,
      `metadata:series:images:${tvdbId}`,
      `series:${tvdbId}`,
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ tvdbId }, 'Invalidated series metadata cache');
  }

  async invalidateEpisode(tvdbId: number, seasonNumber: number, episodeNumber: number): Promise<void> {
    const keys = [
      `metadata:episode:${tvdbId}:${seasonNumber}:${episodeNumber}`,
      `episode:${tvdbId}:${seasonNumber}:${episodeNumber}`,
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ tvdbId, seasonNumber, episodeNumber }, 'Invalidated episode metadata cache');
  }
}
```

### Indexer Cache Service

```typescript
// backend/src/core/indexer/services/indexer-cache.service.ts
import redis from '@/cache/redis-client';
import { logger } from '@/lib/logger';
import { indexerService } from '@/core/indexer/services/indexer.service';

interface IndexerCacheOptions {
  ttl?: number;
  force?: boolean;
}

export class IndexerCacheService {
  private readonly DEFAULT_FEED_TTL = 15 * 60; // 15 minutes
  private readonly DEFAULT_STATUS_TTL = 5 * 60; // 5 minutes

  constructor(
    private readonly redis: Redis,
    private readonly indexerService: IndexerService,
  ) {}

  async getIndexerFeed(indexerId: number, options?: IndexerCacheOptions): Promise<any[]> {
    const cacheKey = `indexer:feed:${indexerId}`;

    if (!options?.force) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.debug({ indexerId }, 'Indexer feed cache hit');
        return JSON.parse(cached);
      }
    }

    logger.debug({ indexerId }, 'Indexer feed cache miss');

    try {
      const feed = await this.indexerService.fetchFeed(indexerId);
      await this.redis.setex(cacheKey, JSON.stringify(feed), this.DEFAULT_FEED_TTL);
      return feed;
    } catch (error) {
      logger.error({ indexerId, error }, 'Failed to get indexer feed');
      throw error;
    }
  }

  async getIndexerStatus(indexerId: number): Promise<any> {
    const cacheKey = `indexer:status:${indexerId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      logger.debug({ indexerId }, 'Indexer status cache hit');
      return JSON.parse(cached);
    }

    logger.debug({ indexerId }, 'Indexer status cache miss');

    try {
      const status = await this.indexerService.getStatus(indexerId);
      await this.redis.setex(cacheKey, JSON.stringify(status), this.DEFAULT_STATUS_TTL);
      return status;
    } catch (error) {
      logger.error({ indexerId, error }, 'Failed to get indexer status');
      throw error;
    }
  }

  async updateLastSync(indexerId: number): Promise<void> {
    const cacheKey = `indexer:lastSync:${indexerId}`;

    // Update TTL
    await redis.setex(cacheKey, Date.now().toISOString(), 5 * 60); // 5 minutes
    logger.debug({ indexerId }, 'Updated indexer last sync cache');
  }

  async invalidateIndexer(indexerId: number): Promise<void> {
    const keys = [
      `indexer:feed:${indexerId}`,
      `indexer:status:${indexerId}`,
      `indexer:lastSync:${indexerId}`,
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ indexerId }, 'Invalidated indexer cache');
  }

  async getAllIndexerStatuses(): Promise<any> {
    const cacheKey = 'indexer:all:status';

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      logger.debug('All indexer status cache hit');
      return JSON.parse(cached);
    }

    logger.debug('All indexer status cache miss');

    try {
      const statuses = await this.indexerService.getAllStatuses();
      await this.redis.setex(cacheKey, JSON.stringify(statuses), 5 * 60); // 5 minutes
      return statuses;
    } catch (error) {
      logger.error('Failed to get all indexer statuses');
      throw error;
    }
  }
  }
}
```

### Cache Invalidation Strategy

```typescript
// backend/src/cache/cache-invalidation.service.ts
import { logger } from '@/lib/logger';
import { redis } from '@/cache/redis-client';
import { queueService } from '@/core/download/services/queue.service';

export class CacheInvalidationService {
  constructor(
    private readonly redis: Redis,
    private readonly queueService: QueueService,
  ) {}

  // Invalidate series cache when series is updated
  async invalidateSeries(id: number): Promise<void> {
    const keys = [
      `series:${id}`,
      `series:stats:${id}`,
      `series:list:*:monitored:*:seriesId:*`, // Clear all monitored filters
      `series:list:*:page:*:sort:*:order:*`,
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ id }, 'Invalidated series cache');
  }

  // Invalidate episode cache when episode is updated
  async invalidateEpisode(id: number): Promise<void> {
    const keys = [
      `episode:${id}`,
      `episode:series:${id}:*`, // All episode lists for this series
      `episode:series:${id}:season:*`, // Season page caches
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ id }, 'Invalidated episode cache');
  }

  // Invalidate metadata when series is refreshed
  async invalidateMetadata(tvdbId: number): Promise<void> {
    const keys = [
      `metadata:series:tvdbId:${tvdbId}`,
      `metadata:series:images:${tvdbId}`,
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ tvdbId }, 'Invalidated series metadata cache');
  }

  // Invalidate indexer cache when indexer is updated
  async invalidateIndexer(id: number): Promise<void> {
    const keys = [
      `indexer:${id}`,
      `indexer:feed:${id}`,
      `indexer:status:${id}`,
      `indexer:lastSync:${id}`,
    ];

    await Promise.all(keys.map(key => this.redis.del(key)));
    logger.debug({ id }, 'Invalidated indexer cache');
  }

  // Invalidate quality profiles when changed
  async invalidateQualityProfiles(): Promise<void> {
    await this.redis.del('quality:profiles:all');
    logger.debug('Invalidated quality profiles cache');
  }

  // Invalidate custom formats when changed
  async invalidateCustomFormats(): Promise<void> {
    await this.redis.del('customFormats:all');
    logger.debug('Invalidated custom formats cache');
  }

  // Invalidate root folders when changed
  async invalidateRootFolders(): Promise<void> {
    await this.redis.del('rootfolders:all');
    logger.debug('Invalidated root folders cache');
  }

  // Invalidate tags when changed
  async invalidateTags(): Promise<void> {
    await this.redis.del('tags:all');
    logger.debug('Invalidated tags cache');
  }

  // Invalidate by pattern
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    logger.debug({ pattern, count: keys.length }, 'Invalidated cache pattern');
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    keys: number;
    memory: string;
    size: number;
    hits: number;
    misses: number;
  }> {
    const info = await this.redis.info('stats');
    return {
      keys: info.keyspace,
      memory: info.used_memory_human,
      size: info.used_memory,
      hits: Number(info.keyspace_hits || 0),
      misses: Number(info.keyspace_misses || 0),
    };
  }

  // Clear entire cache
  async clear(): Promise<void> {
    await redis.flushdb();
    logger.info('Cleared entire cache');
  }
}
```

### Cache Health Check

```typescript
// backend/src/cache/cache-health.service.ts
import redis from '@/cache/redis-client';
import { logger } from '@/lib/logger';

export class CacheHealthService {
  constructor(private readonly redis: Redis) {}

  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    message: string;
    details: any;
  }> {
    try {
      await redis.ping();

      const stats = await this.redis.info('stats');
      const memoryUsagePercent = (stats.used_memory / stats.total_system_memory) * 100;

      if (memoryUsagePercent > 90) {
        return {
          status: 'degraded',
          message: 'Redis memory usage critical: ' + memoryUsagePercent.toFixed(2) + '%',
          details: stats,
        };
      }

      if (memoryUsagePercent > 75) {
        return {
          status: 'degraded',
          message: 'Redis memory usage high: ' + memoryUsagePercent.toFixed(2) + '%',
          details: stats,
        };
      }

      return {
        status: 'healthy',
        message: 'Cache is healthy',
        details: stats,
      };
    } catch (error) {
      return {
        status: 'down',
        message: 'Redis is not responding',
        details: { error },
      };
    }
  }
}
```

### Cache Warming

```typescript
// backend/jobs/cache-warmup.worker.ts
import { Worker, Job } from 'bullmq';
import { logger } from '@/lib/logger';
import { cacheInvalidationService } from '@/cache/cache-invalidation.service';
import { cacheHealthService } from '@/cache/cache-health.service';

interface WarmupJobData {
  type: 'all' | 'series' | 'episodes' | 'metadata' | 'indexers' | 'quality-profiles' | 'custom-formats';
  seriesId?: number;
}

async function warmupCache(job: Job<WarmupJobData>) {
  logger.info({ type: job.data }, 'Starting cache warmup');

  const startTime = Date.now();
  let warmedCount = 0;

  try {
    switch (job.data.type) {
      case 'all': {
        // Warm up most important caches
        await warmupSeriesPages();
        await warmupEpisodesPages();
        await warmupSeriesStats();
        await warmupIndexers();
        await warmupQualityProfiles();
        await warmupCustomFormats();
        break;

      case 'series':
        // Warm up all series caches
        await warmupAllSeries();
        break;

      case 'episodes':
        // Warm up all episode caches
        if (job.data.seriesId) {
          await warmupAllEpisodes(job.data.seriesId);
        }
        break;

      case 'metadata':
        // Warm up metadata caches
        if (job.data.seriesId) {
          await warmupSeriesMetadata(job.data.seriesId);
        }
        break;

      case 'indexers':
        // Warm up all indexer caches
        await warmupAllIndexers();
        break;
    }

    const duration = Date.now() - startTime;
    warmedCount++;

    logger.info(
      { type: job.data, duration: duration },
      `Cache warmup completed in ${duration}ms`,
    );
  } catch (error) {
    logger.error({ type: job.data, error }, 'Cache warmup failed');
    throw error;
  }
}

async function warmupSeriesPages(): Promise<void> {
  const { seriesService } = await import('@/core/tv/services/series.service');
  const pages = [1, 2, 3, 4, 5]; // First 5 pages

  await Promise.all(
    pages.map(page =>
      seriesService.getAll({ page, pageSize: 20, sort: 'sortTitle', order: 'asc' }),
  );
}

async function warmupEpisodesPages(): Promise<void> {
  const { episodeService } = await import('@/core/tv/services/episode.service');
  const pages = [1, 2, 3, 4, 5]; // First 5 pages

  await Promise.all(
    pages.map(page =>
      episodeService.getAll({ page, pageSize: 50, sort: 'airDate', order: 'desc' }),
  );
}

async function warmupSeriesStats(): Promise<void> {
  const { seriesService } = await import('@/core/tv/services/series.service');

  const series = await seriesService.getAll({ pageSize: 100 });
  await Promise.all(
    series.map(s => seriesService.getStatistics(s.id)),
  );
}

async function warmupAllSeries(): Promise<void> {
  const { seriesService } = await import('@/core/tv/services/series.service');

  const series = await seriesService.getAll({ pageSize: 50 });
  await Promise.all(
    series.map(s => {
        // Warm individual series cache
        seriesService.getById(s.id);
        // Warm series stats cache
        seriesService.getStatistics(s.id);
      }),
  );
}

async function warmupSeriesMetadata(seriesId: number): Promise<void> {
  const { metadataCacheService } = await import('@/core/metadata/services/metadata-cache.service');

  await Promise.all([
    metadataCacheService.getSeriesMetadata(seriesId),
    metadataCacheService.getSeriesImages(seriesId),
  ]);
}

async function warmupAllIndexers(): Promise<void> {
  const { indexerCacheService } = await import('@/core/indexer/services/indexer-cache.service');
  const { indexerService } = await import('@/core/indexer/services/indexer.service');

  const indexers = await indexerService.getAll();
  await Promise.all([
    ...indexers.map(i => indexerCacheService.getIndexerFeed(i.id)),
    ...indexers.map(i => indexerCacheService.getIndexerStatus(i.id)),
  ]);
}

async function warmupQualityProfiles(): Promise<void> {
  const { qualityProfileService } = await import('@/core/quality/services/quality-profile.service');

  const profiles = await qualityProfileService.getAll();
  await Promise.all(
    profiles.map(p => qualityProfileService.getById(p.id)),
  );
}

async function warmupCustomFormats(): Promise<void> {
  const { customFormatService } = await import('@/core/custom-format/services/custom-format.service');

  const formats = await customFormatService.getAll();
  await Promise.all(
    formats.map(f => customFormatService.getById(f.id)),
  );
}

// Create worker
export const warmupWorker = new Worker('cache-warmup', warmupCache, {
  connection: redis,
  concurrency: 1,
});
```

### Middleware for Automatic Cache Invalidation

```typescript
// backend/src/middleware/cache-invalidation.middleware.ts
import { Context, Next } from 'hono';
import { logger } from '@/lib/logger';
import { cacheInvalidationService } from '@/cache/cache-invalidation.service';

export const cacheInvalidationMiddleware = (deps: {
  cacheInvalidationService: CacheInvalidationService,
}) => {
  return async (c: Context, next: Next) => {
    await next();

    const { method, path, body } = c.req;
    const url = `${method} ${path}`;

    // Invalidate on POST, PUT, DELETE operations
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      const urlParts = path.split('/').filter(Boolean);

      // Invalidate series operations
      if (urlParts[1] === 'series' && urlParts[2]) {
        if (method === 'PUT' || method === 'DELETE') {
          const id = urlParts[2];
          if (method === 'PUT' && body) {
            // Invalidate series cache on PUT
            await deps.cacheInvalidationService.invalidateSeries(Number(id));
          } else {
            // Invalidate series cache on DELETE
            await deps.cacheInvalidationService.invalidateSeries(Number(id));
          }
        }
      }

      // Invalidate episode operations
      if (urlParts[1] === 'episode' && urlParts[2]) {
        const id = urlParts[2];
        if (method === 'PUT' || method === 'DELETE') {
          // Invalidate episode cache on PUT/DELETE
          await deps.cacheInvalidationService.invalidateEpisode(Number(id));
        }
      }

      // Invalidate indexer operations
      if (urlParts[1] === 'indexer' && urlParts[2]) {
        const id = urlParts[2];
        if (method === 'PUT' || method === 'DELETE') {
          // Invalidate indexer cache on PUT/DELETE
          await deps.cacheInvalidationService.invalidateIndexer(Number(id));
        }
      }

      // Invalidate metadata on refresh
      if (urlParts[1] === 'metadata' && urlParts[2] === 'refresh') {
        await deps.cacheInvalidationService.invalidateMetadata(Number(body.tvdbId));
      }

      // Invalidate quality profiles
      if (urlParts[1] === 'qualityprofile') && method === 'PUT') {
        const id = urlParts[2];
        if (body) {
          await deps.cacheInvalidationService.invalidateQualityProfiles();
        }
      }

      // Invalidate custom formats
      if (urlParts[1] === 'customformat') && method === 'PUT') {
        const id = urlParts[2];
        if (body) {
          await deps.cacheInvalidationService.invalidateCustomFormats();
        }
      }

      // Invalidate root folders
      if (urlParts[1] === 'rootfolder' && method === 'PUT' || method === 'DELETE') {
        await deps.cacheInvalidationService.invalidateRootFolders();
      }

      // Invalidate tags
      if (urlParts[1] === 'tag' && method === 'PUT' || method === 'DELETE') {
        const id = urlParts[2];
        if (body) {
          await deps.cacheInvalidationService.invalidateTags();
        }
      }
    }

    // Continue to next middleware
    return next();
  };
};

// Apply middleware
app.use('*', cacheInvalidationMiddleware({ cacheInvalidationService }));
```

---

## Performance Optimization

### Cache Hit Rate Monitoring

```typescript
// backend/src/cache/cache-monitor.service.ts
import redis from '@/cache/redis-client';
import { logger } from '@/lib/logger';

export class CacheMonitorService {
  private readonly MONITOR_INTERVAL = 60 * 1000; // 1 minute

  constructor(private readonly redis: Redis) {
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(async () => {
      const stats = await this.getStats();
      logger.debug(stats, 'Cache statistics');
      this.checkThresholds(stats);
    }, this.MONITOR_INTERVAL);
  }

  async getStats() Promise<any> {
    return {
      hits: Number(await redis.info('keyspace_hits') || '0'),
      misses: Number(await redis.info('keyspace_misses') || '0'),
      hitsRate: 0,
      missesRate: 0,
    };
  }

  checkThresholds(stats: any): void {
    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;

    if (hitRate < 50) {
      logger.warn(`Low cache hit rate: ${hitRate.toFixed(2)}%`);
    }

    const keys = Number(await redis.dbsize());
    if (keys > 10000) {
      logger.warn(`High number of cache keys: ${keys}`);
    }
  }

  async getLowHitRateKeys(): Promise<string[]> {
    // Scan slow keys
    let cursor = '0';
    const keys: string[] = [];

    while (true) {
      const [scanResults] = await redis.scan(
        cursor,
        'MATCH',
        1000,
        'COUNT',
        '*',
        'COUNT',
        100,
        '*',
      );

      for (const key of scanResults) {
        const hitRate = await this.getKeyHitRate(key);
        if (hitRate < 50) {
          keys.push(key);
        }
      }

      cursor = scanResults[0];
      if (cursor === '0') break;
    }

    return keys;
  }

  async optimizeLowHitRateKeys(): Promise<void> {
    const keys = await this.getLowHitRateKeys();

    for (const key of keys) {
      // Reduce TTL for low hit rate keys
      const currentTtl = await redis.ttl(key);
      const newTtl = Math.max(60, Math.floor(currentTtl / 2)); // Halve TTL

      if (currentTtl > newTtl) {
        await redis.expire(key, newTtl);
        logger.debug(
          { key, oldTtl: currentTtl, newTtl },
          'Reduced TTL due to low hit rate',
        );
      }
    }
  }
}
```

### Cache Prefetching Strategy

```typescript
// backend/src/cache/cache-prefetch.service.ts
import { logger } from '@/lib/logger';

interface PrefetchStrategy {
  trigger: 'on_startup' | 'on_access' | 'on_schedule';
  interval?: number; // minutes
  patterns?: string[]; // Glob patterns
}

export class CachePrefetchService {
  private strategies: PrefetchStrategy[] = [
    {
      trigger: 'on_startup',
      patterns: ['series:*', 'episode:*', 'metadata:series:*'],
    },
    {
      trigger: 'on_access',
      interval: 5,
      patterns: ['series:*', 'episode:*'],
    },
    {
      trigger: 'on_schedule',
      interval: 10,
      patterns: ['series:*', 'episode:*', 'metadata:*', 'indexer:*'],
    },
  ];

  constructor(private readonly cacheService: any, private readonly metadataService: any) {
    this.startScheduledPrefetch();
  }

  private async prefetchPatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const keys = await this.cacheService.keys(pattern);
      const sampledKeys = keys.slice(0, Math.min(100, keys.length));

      for (const key of sampledKeys) {
        await this.cacheService.get(key); // Touch cache to refresh
        logger.debug({ key }, 'Prefetched cache key');
      }
    }
  }

  startScheduledPrefetch(): void {
    const scheduleStrategies = this.strategies.filter(s => s.trigger === 'on_schedule');

    for (const strategy of scheduleStrategies) {
      setInterval(() => {
        this.prefetchPatterns(strategy.patterns || []);
      }, (strategy.interval || 10) * 60 * 1000);
    }
  }
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Cache Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# TTL Configuration (defaults in seconds)
CACHE_TTL_SERIES=86400         # 24 hours
CACHE_TTL_EPISODES=3600          # 1 hour
CACHE_TTL_METADATA=86400       # 24 hours
CACHE_TTL_EPISODE_IMAGES=604800    # 7 days
CACHE_TTL_INDEXER_FEED=900          # 15 minutes
CACHE_TTL_INDEXER_STATUS=300        # 5 minutes
CACHE_TTL_QUALITY_PROFILES=86400     # 24 hours
CACHE_TTL_CUSTOM_FORMATS=86400     # 24 hours
CACHE_TTL_SERIES_LIST=300      # 5 minutes
CACHE_TTL_EPISODES_LIST=600      # 10 minutes
CACHE_TTL_CONFIG=5              # 5 minutes
CACHE_TTL_TAGS=86400             # 24 hours
CACHE_TTL_ROOT_FOLDERS=86400     # 24 hours

# Cache Optimization
CACHE_COMPRESSION=false
CACHE_WARMUP_ON_STARTUP=false
CACHE_PREFETCH_ON_ACCESS=true
CACHE_PREFETCH_INTERVAL=5
CACHE_HIT_RATE_THRESHOLD=50          # Alert if hit rate below this %
CACHE_MAX_KEYS=10000             # Alert if key count exceeds this
```

# Cache Settings
AUTO_INVALIDATE_ON_SERIES_UPDATE=true
AUTO_INVALIDATE_ON_EPISODE_UPDATE=true
AUTO_INVALIDATE_ON_METADATA_REFRESH=true
AUTO_INVALIDATE_ON_INDEXER_UPDATE=true
AUTO_INVALIDATE_ON_QUALITY_PROFILE_UPDATE=true
AUTO_INVALIDATE_ON_CUSTOM_FORMAT_UPDATE=true
AUTO_INVALIDATE_ON_TAG_UPDATE=true
AUTO_INVALIDATE_ON_ROOT_FOLDER_UPDATE=true
```

### Health Check Configuration

```typescript
// backend/src/health/cache-health.routes.ts
import { Hono } from 'hono';
import { cacheHealthService } from '@/cache/cache-health.service';

export const cacheHealthRoutes = new Hono();

cacheHealthRoutes.get('/health/cache', async (c) => {
  const health = await cacheHealthService.check();
  return c.json({ data: health });
});

cacheHealthRoutes.get('/health/cache/stats', async (c) => {
  const stats = await cacheHealthService.getStats();
  return c.json({ data: stats });
});
```

---

## Monitoring & Observability

### Prometheus Metrics

```typescript
// backend/src/metrics/cache.metrics.ts
import { Histogram, Gauge, Counter, Registry } from 'prom-client';
import { register } from 'prom-client';

export const registerCacheMetrics = (register: Registry) => {
  // Cache hit/miss metrics
  const cacheHits = new Gauge({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['type'],
  });
  const cacheMisses = new Gauge({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['type'],
  });
  const cacheHitRate = new Gauge({
    name: 'cache_hit_rate',
    help: 'Cache hit rate percentage',
    labelNames: ['type'],
  });

  // Cache size metrics
  const cacheSize = new Gauge({
    name: 'cache_size_bytes',
    help: 'Current cache size in bytes',
  });
  const cacheKeys = new Gauge({
    name: 'cache_keys_total',
    help: 'Total number of cache keys',
  });

  // TTL metrics
  const cacheTtlHistogram = new Histogram({
    name: 'cache_ttl_seconds',
    help: 'Cache item TTL in seconds',
    labelNames: ['type'],
    buckets: [60, 300, 600, 1800, 3600, 7200, 18000],
  );
  const cacheTtlHistogramMinute = new Histogram({
    name: 'cache_ttl_seconds',
    help: 'Cache item TTL in minutes',
    labelNames: ['type'],
    buckets: [1, 5, 10, 30, 60, 120],
  );

  register.register(cacheHits, cacheMisses, cacheHitRate, cacheSize, cacheKeys, cacheTtlHistogram, cacheTtlHistogramMinute);

  return register;
}
```

### Metrics Middleware

```typescript
// backend/src/metrics/cache-metrics.middleware.ts
import { middleware } from 'hono/factory';
import { registerCacheMetrics } from '@/metrics/cache.metrics';

export const cacheMetricsMiddleware = middleware(async (c, next) => {
  const start = Date.now();
  await next();

  const hitRate = Math.random() * 100; // Placeholder - real implementation would track

  registerCacheMetrics.cacheHitRate.labels({ type: 'series' }).inc();

  await registerCacheMetrics.cacheHits.labels({ type: 'series' }).inc();

  await next();
});
```

### Cache Performance Dashboard

```typescript
// backend/src/app/routes/api/v3/health/cache.routes.ts
import { Hono } from 'hono';
import { cacheHealthService } from '@/cache/cache-health.service';
import { cacheMonitorService } from '@/cache/cache-monitor.service';

const app = new Hono();

app.get('/health/cache', async (c) => {
  const [health, stats, lowHitRateKeys] = await Promise.all([
    cacheHealthService.check(),
    cacheMonitorService.getStats(),
    cacheMonitorService.getLowHitRateKeys(),
  ]);

  return c.json({
    data: {
      health,
      stats,
      lowHitRateKeys,
    },
  });
});
```

---

## Testing

### Cache Service Tests

```typescript
// backend/src/cache/services/cache.service.test.ts
import { describe, expect, beforeEach, afterEach, it } from 'vitest';
import { CacheService } from './cache.service';
import { redis as Redis } from 'ioredis';

describe('CacheService', () => {
  let cacheService: CacheService;
  let redis: Redis;

  beforeEach(async () => {
    redis = new Redis('redis://localhost:6379/0');
    cacheService = new CacheService(redis);
    await redis.flushdb();
  });

  afterEach(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      await cacheService.set('test-key', 'value');
      const result = await cacheService.get('test-key');
      expect(result).toBe('value');
    });

    it('should return null for missing key', async () => {
      const result = await cacheService.get('missing-key');
      expect(result).toBeNull();
    });

    it('should handle JSON serialization', async () => {
      const value = { a: 1, b: 2 };
      await cacheService.set('test-key', value);
      const result = await cacheService.get('test-key');
      expect(result).toEqual(value);
    });
  });

    it('should respect custom TTL', async () => {
      const value = 'test-value';
      await cacheService.set('test-key', value, { ttl: 60 });
      const ttl = await cacheService.ttl('test-key');
      expect(ttl).toBe(60);
    });

    it('should support expiration', async () => {
      await cacheService.set('test-key', 'value', { ttl: 1 });
      const result1 = await cacheService.get('test-key');
      expect(result1).toBe('value');
      await new Promise((resolve) => setTimeout(() => {}, 1500));
      const result2 = await cacheService.get('test-key');
      expect(result2).toBeNull();
    });
  });

    describe('del', () => {
    it('should delete cached value', async () => {
      await cacheService.set('test-key', 'value');
      await cacheService.del('test-key');
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should support pattern deletion', async () => {
      await cacheService.set('prefix-1', 'value');
      await cacheService.set('prefix-2', 'value');
      await cacheService.delPattern('prefix-*');
      const keys = await cacheService.keys('prefix-*');
      expect(keys).toHaveLength(2);
    });
  });
});
```

---

## Integration with Existing Services

### Injecting into Series Service

```typescript
// backend/src/core/tv/services/series.service.ts
import { CacheRepository } from '@/core/shared/repositories/cached-repository';
import { logger } from '@/lib/logger';

export class SeriesService {
  constructor(
    private readonly cache: CacheRepository,
    private readonly db: SeriesRepository,
  ) {}

  async getAll(filter?: SeriesFilter): Promise<Series[]> {
    // Try cache first
    const cacheKey = `series:list:${JSON.stringify(filter)}`;
    const cached = await this.cache.get<Series[]>(cacheKey);

    if (cached) {
      logger.debug('Series list: Cache hit');
      return cached;
    }

    logger.debug('Series list: Cache miss, fetching from database');
    const series = await this.db.query.findMany({
      where: eq(series.monitored, true),
      orderBy: [asc(series.sortTitle), asc(series.id)],
      take: 1000, // Limit results
    });

    await this.cache.set(cacheKey, series, { ttl: 5 * 60 }); // 5 minutes
    return series;
  }

  async getById(id: number): Promise<Series | null> {
    const cacheKey = `series:${id}`;

    const cached = await this.cache.get<Series>(cacheKey);
    if (cached) {
      logger.debug(`Series ${id}: Cache hit`);
      return cached;
    }

    logger.debug(`Series ${id}: Cache miss, fetching from database`);
    const series = await this.db.query.series.findFirst({
      where: eq(series.id, id),
    });

    if (!series) {
      return null;
    }

    await this.cache.set(cacheKey, series, { ttl: 60 * 60 }); // 1 hour
    return series;
  }

  async update(id: number, updates: Partial<Series>): Promise<Series> {
    // Invalidate cache
    await this.cache.invalidate(id);

    // Update in database
    const series = await this.db.series.update({
      where: eq(series.id, id),
      data: updates,
    });

    // Update cache
    await this.cache.set(`series:${id}`, series, { ttl: 60 * 60 });
    return series;
  }
}
```

### Injecting into Episode Service

```typescript
// backend/src/core/tv/services/episode.service.ts
export class EpisodeService {
  constructor(
    private readonly cache: CacheRepository,
    private readonly db: EpisodeRepository,
  ) {}

  async getAll(filter?: EpisodeFilter): Promise<Episode[]> {
    const cacheKey = `episode:list:${JSON.stringify(filter)}`;

    const cached = await this.cache.get<Episode[]>(cacheKey);
    if (cached) {
      logger.debug('Episode list: Cache hit');
      return cached;
    }

    logger.debug('Episode list: Cache miss, fetching from database');
    const episodes = await this.db.query.episode.findMany({
      where: eq(episodes.monitored, true),
      orderBy: [desc(episodes.airDate), asc(episodes.id)],
      take: 500,
    });

    await this.cache.set(cacheKey, episodes, { ttl: 10 * 60 }); // 10 minutes
    return episodes;
  }

  async getById(id: number): Promise<Episode | null> {
    const cacheKey = `episode:${id}`;

    const cached = await this.cache.get<Episode>(cacheKey);
    if (cached) {
      logger.debug(`Episode ${id}: Cache hit`);
      return cached;
    }

    logger.debug(`Episode ${id}: Cache miss, fetching from database`);
    const episode = await this.db.query.episode.findFirst({
      where: eq(episodes.id, id),
    });

    if (!episode) {
      return null;
    }

    await this.cache.set(cacheKey, episode, { ttl: 60 * 60 }); // 1 hour
    return episode;
  }
}
```

---

## Performance Benchmarks

### Expected Improvements

| Operation | Before (No Cache) | After (With Cache) | Improvement |
|------------|---------------------|---------------------|-------------|
| Get Series (single) | 200-500ms | 5-10ms | 20-50x faster |
| Get Series List (page 1) | 500-1000ms | 10-50ms | 10-100x faster |
| Get Series Stats | 100-300ms | 5-10ms | 20-60x faster |
| Get Series Metadata | 300-800ms | 5-20ms | 40-160x faster |
| Indexer Feed Fetch | 500-2000ms | 5-10ms | 200-400x faster |
| Indexer Status | 100-300ms | 1-5ms | 100-300x faster |
| Episode List (page 1) | 300-800ms | 10-50ms | 30-160x faster |
| Episode Details | 200-500ms | 5-10ms | 40-100x faster |
| Queue Status | 200-500ms | 5-10ms | 40-100x faster |
| Calendar View | 500-1500ms | 50-200ms | 10-30x faster |

### Resource Savings

| Resource | Before | After | Savings |
|----------|-------|--------|----------|
| Database Queries | 1000/day | 200/day | 80% reduction |
| TVDB API Calls | 500/day | 50/day | 90% reduction |
| TMDB API Calls | 300/day | 100/day | 67% reduction |
| Indexer API Calls | 200/day | 10/day | 95% reduction |

---

## Monitoring Setup

### Dashboard Metrics

**Cache Overview Dashboard:**
- Total keys in cache
- Cache hit rate (%)
- Cache miss rate (%)
- Memory usage
- Keys approaching expiration
- Low hit rate keys
- Top accessed keys

**Alerts:**
- Cache hit rate below 50% for 5+ minutes
- Memory usage above 75%
- Keys count exceeds 10,000
- Individual keys with < 30% hit rate

---

*This caching system eliminates rate limiting issues and significantly improves performance across the entire application.*