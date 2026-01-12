# Performance Requirements Specification

> **idkarr** - Performance targets, benchmarks, and optimization guidelines

## Table of Contents

1. [Overview](#overview)
2. [Performance Targets](#performance-targets)
3. [API Performance](#api-performance)
4. [Database Performance](#database-performance)
5. [Frontend Performance](#frontend-performance)
6. [Background Jobs](#background-jobs)
7. [Resource Limits](#resource-limits)
8. [Benchmarking](#benchmarking)

---

## Overview

### Performance Philosophy

1. **User-Perceived Performance**: Prioritize interactions users notice most
2. **Scalability**: Handle growing libraries without degradation
3. **Resource Efficiency**: Minimize CPU/memory footprint for self-hosting
4. **Predictability**: Consistent performance under varying loads

### Performance Budget

```typescript
const performanceBudget = {
  // Page load
  timeToFirstByte: 200,      // ms
  firstContentfulPaint: 1000, // ms
  largestContentfulPaint: 2500, // ms
  timeToInteractive: 3000,   // ms

  // API responses
  simpleQuery: 50,           // ms (p95)
  complexQuery: 200,         // ms (p95)
  listEndpoint: 100,         // ms (p95)
  searchEndpoint: 500,       // ms (p95)

  // Bundle sizes
  initialBundle: 200,        // KB gzipped
  routeChunk: 50,            // KB gzipped
  totalAssets: 1000,         // KB gzipped

  // Memory
  serverMemory: 512,         // MB base
  serverMemoryMax: 2048,     // MB peak
};
```

---

## Performance Targets

### Response Time Targets

| Operation | Target (p50) | Target (p95) | Target (p99) | Max |
|-----------|--------------|--------------|--------------|-----|
| Health check | 5ms | 10ms | 20ms | 50ms |
| Series list (100 items) | 30ms | 50ms | 100ms | 200ms |
| Series detail | 20ms | 40ms | 80ms | 150ms |
| Episode list | 25ms | 50ms | 100ms | 200ms |
| Search (interactive) | 100ms | 200ms | 400ms | 1000ms |
| Search (indexers) | 500ms | 2000ms | 5000ms | 30000ms |
| RSS sync | 1000ms | 3000ms | 10000ms | 60000ms |
| Import scan | 5000ms | 15000ms | 30000ms | 300000ms |

### Throughput Targets

```typescript
const throughputTargets = {
  // Requests per second
  apiRequestsPerSecond: 100,
  concurrentConnections: 50,
  websocketConnections: 100,

  // Background processing
  releasesProcessedPerMinute: 1000,
  importsPerMinute: 10,
  renamesPerMinute: 100,

  // Search
  indexerQueriesPerMinute: 60, // Rate limited
  parallelIndexerQueries: 5,
};
```

### Library Scale Targets

| Library Size | Series | Episodes | Response Time Target |
|--------------|--------|----------|---------------------|
| Small | < 100 | < 5,000 | All targets met |
| Medium | 100-500 | 5,000-25,000 | All targets met |
| Large | 500-2,000 | 25,000-100,000 | +50% tolerance |
| Very Large | 2,000+ | 100,000+ | +100% tolerance |

---

## API Performance

### Query Optimization Guidelines

```typescript
// BAD: N+1 query pattern
async function getSeriesWithEpisodes(): Promise<Series[]> {
  const series = await db.select().from(seriesTable);

  // N+1: One query per series
  for (const s of series) {
    s.episodes = await db.select()
      .from(episodeTable)
      .where(eq(episodeTable.seriesId, s.id));
  }

  return series;
}

// GOOD: Single query with join
async function getSeriesWithEpisodes(): Promise<Series[]> {
  return db.query.series.findMany({
    with: {
      episodes: true,
    },
  });
}

// BETTER: Paginated with efficient counting
async function getSeriesPaginated(
  page: number,
  pageSize: number
): Promise<PaginatedResult<Series>> {
  const [series, countResult] = await Promise.all([
    db.query.series.findMany({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: {
        episodes: {
          columns: { id: true }, // Only what we need
        },
      },
    }),
    db.select({ count: count() }).from(seriesTable),
  ]);

  return {
    items: series,
    total: countResult[0].count,
    page,
    pageSize,
  };
}
```

### Response Caching

```typescript
interface CacheConfig {
  // Static data (quality definitions, etc.)
  staticTtl: 3600,          // 1 hour

  // Semi-static data (series metadata)
  metadataTtl: 300,         // 5 minutes

  // Dynamic data (queue, activity)
  dynamicTtl: 10,           // 10 seconds

  // User-specific data
  userDataTtl: 60,          // 1 minute
}

class CachedSeriesService {
  private cache: RedisCache;

  async getSeries(id: number): Promise<Series> {
    const cacheKey = `series:${id}`;

    // Try cache first
    const cached = await this.cache.get<Series>(cacheKey);
    if (cached) return cached;

    // Query database
    const series = await db.query.series.findFirst({
      where: eq(seriesTable.id, id),
      with: {
        episodes: true,
        episodeFiles: true,
      },
    });

    if (!series) {
      throw new NotFoundError('Series not found');
    }

    // Cache for 5 minutes
    await this.cache.set(cacheKey, series, 300);

    return series;
  }

  async invalidate(id: number): Promise<void> {
    await this.cache.delete(`series:${id}`);
    await this.cache.delete('series:list'); // Invalidate list cache too
  }
}
```

### Rate Limiting

```typescript
const rateLimits = {
  // General API
  api: {
    windowMs: 60000,        // 1 minute
    max: 100,               // 100 requests per minute
  },

  // Search endpoints (more intensive)
  search: {
    windowMs: 60000,
    max: 20,
  },

  // Indexer queries (external rate limits)
  indexer: {
    windowMs: 60000,
    max: 10,                // Per indexer
  },

  // Authentication
  auth: {
    windowMs: 900000,       // 15 minutes
    max: 10,                // Login attempts
  },
};

// Rate limiter middleware
const rateLimiter = new Hono()
  .use('/api/*', rateLimit(rateLimits.api))
  .use('/api/*/search', rateLimit(rateLimits.search))
  .use('/api/auth/*', rateLimit(rateLimits.auth));
```

---

## Database Performance

### Index Strategy

```typescript
// Essential indexes for common queries
const essentialIndexes = {
  // Series lookups
  series_tvdb_idx: 'CREATE INDEX series_tvdb_idx ON series(tvdb_id)',
  series_imdb_idx: 'CREATE INDEX series_imdb_idx ON series(imdb_id)',
  series_clean_title_idx: 'CREATE INDEX series_clean_title_idx ON series(clean_title)',

  // Episode lookups
  episode_series_season_idx: 'CREATE INDEX episode_series_season_idx ON episode(series_id, season_number)',
  episode_air_date_idx: 'CREATE INDEX episode_air_date_idx ON episode(air_date_utc)',

  // File lookups
  episode_file_series_idx: 'CREATE INDEX episode_file_series_idx ON episode_file(series_id)',
  episode_file_quality_idx: 'CREATE INDEX episode_file_quality_idx ON episode_file(quality)',

  // Queue lookups
  queue_status_idx: 'CREATE INDEX queue_status_idx ON download_queue(status)',
  queue_series_idx: 'CREATE INDEX queue_series_idx ON download_queue(series_id)',

  // History lookups
  history_date_idx: 'CREATE INDEX history_date_idx ON history(date DESC)',
  history_series_idx: 'CREATE INDEX history_series_idx ON history(series_id)',
};

// Composite indexes for complex queries
const compositeIndexes = {
  // Calendar view
  episode_monitored_air_idx: 'CREATE INDEX episode_monitored_air_idx ON episode(monitored, air_date_utc) WHERE monitored = true',

  // Missing episodes
  episode_missing_idx: 'CREATE INDEX episode_missing_idx ON episode(series_id, monitored, has_file) WHERE monitored = true AND has_file = false',
};
```

### Query Analysis

```typescript
class QueryAnalyzer {
  async analyzeSlowQueries(): Promise<SlowQueryReport[]> {
    // PostgreSQL slow query log analysis
    const slowQueries = await db.execute(sql`
      SELECT
        query,
        calls,
        total_time / calls as avg_time,
        rows / calls as avg_rows
      FROM pg_stat_statements
      WHERE total_time / calls > 100  -- > 100ms average
      ORDER BY total_time DESC
      LIMIT 20
    `);

    return slowQueries.map(q => ({
      query: q.query,
      avgTimeMs: q.avg_time,
      calls: q.calls,
      avgRows: q.avg_rows,
      recommendation: this.getOptimizationRecommendation(q),
    }));
  }

  async explainQuery(query: string): Promise<QueryPlan> {
    const plan = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql.raw(query)}`);
    return this.parseExplainOutput(plan);
  }
}
```

### Connection Pooling

```typescript
const poolConfig = {
  // Pool size based on CPU cores
  min: 2,
  max: Math.max(4, os.cpus().length * 2),

  // Connection lifetime
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 5000,

  // Health checks
  healthCheckIntervalMs: 60000,
};

// Drizzle with connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ...poolConfig,
});

const db = drizzle(pool, { schema });
```

---

## Frontend Performance

### Bundle Optimization

```typescript
// next.config.js
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Code splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            minChunks: 2,
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};
```

### Component Performance

```tsx
// Virtualized list for large datasets
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedEpisodeList({ episodes }: { episodes: Episode[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: episodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Row height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const episode = episodes[virtualRow.index];
          return (
            <div
              key={episode.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <EpisodeRow episode={episode} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoized components
const EpisodeRow = memo(function EpisodeRow({ episode }: { episode: Episode }) {
  return (
    <div className="flex items-center h-12 px-4 border-b">
      <span className="w-12">{episode.episodeNumber}</span>
      <span className="flex-1">{episode.title}</span>
      <span className="w-24">{formatDate(episode.airDate)}</span>
    </div>
  );
});
```

### Data Fetching

```typescript
// Optimistic updates with TanStack Query
function useUpdateSeriesMonitored(seriesId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monitored: boolean) =>
      api.series.update(seriesId, { monitored }),

    // Optimistic update
    onMutate: async (monitored) => {
      await queryClient.cancelQueries({ queryKey: ['series', seriesId] });

      const previous = queryClient.getQueryData(['series', seriesId]);

      queryClient.setQueryData(['series', seriesId], (old: Series) => ({
        ...old,
        monitored,
      }));

      return { previous };
    },

    // Rollback on error
    onError: (err, monitored, context) => {
      queryClient.setQueryData(['series', seriesId], context?.previous);
    },

    // Refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
    },
  });
}
```

### Image Optimization

```tsx
import Image from 'next/image';

function SeriesPoster({ series }: { series: Series }) {
  return (
    <div className="relative aspect-[2/3]">
      <Image
        src={series.posterUrl ?? '/placeholder-poster.png'}
        alt={series.title}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        className="object-cover"
        loading="lazy"
        placeholder="blur"
        blurDataURL={series.posterBlurHash}
      />
    </div>
  );
}

// Generate blur hash on image import
async function generateBlurHash(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );
}
```

---

## Background Jobs

### Job Queue Performance

```typescript
const queueConfig = {
  // BullMQ settings
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,      // Keep for 1 hour
      count: 1000,    // Keep last 1000
    },
    removeOnFail: {
      age: 86400,     // Keep for 24 hours
    },
  },

  // Concurrency limits
  concurrency: {
    rssSsync: 1,      // Sequential
    search: 3,        // Parallel searches
    import: 2,        // Parallel imports
    rename: 5,        // Parallel renames
    metadata: 3,      // Parallel metadata fetches
  },

  // Rate limiting
  rateLimiting: {
    indexer: {
      max: 10,
      duration: 60000, // 10 per minute
    },
    metadata: {
      max: 40,
      duration: 60000, // 40 per minute (API limits)
    },
  },
};

class OptimizedQueueService {
  async processSearchBatch(searches: SearchRequest[]): Promise<void> {
    // Group by indexer to batch requests
    const byIndexer = groupBy(searches, 'indexerId');

    // Process indexers in parallel, respecting rate limits
    await Promise.all(
      Object.entries(byIndexer).map(([indexerId, requests]) =>
        this.processIndexerBatch(parseInt(indexerId), requests)
      )
    );
  }

  private async processIndexerBatch(
    indexerId: number,
    requests: SearchRequest[]
  ): Promise<void> {
    const indexer = await this.indexerService.get(indexerId);
    const limiter = this.getRateLimiter(indexerId);

    for (const request of requests) {
      await limiter.acquire();

      try {
        await this.executeSearch(indexer, request);
      } finally {
        limiter.release();
      }
    }
  }
}
```

### Batch Processing

```typescript
class BatchProcessor {
  // Process in batches to avoid memory issues
  async processEpisodes(
    seriesId: number,
    processor: (episode: Episode) => Promise<void>
  ): Promise<void> {
    const batchSize = 100;
    let offset = 0;

    while (true) {
      const episodes = await db.select()
        .from(episodeTable)
        .where(eq(episodeTable.seriesId, seriesId))
        .limit(batchSize)
        .offset(offset);

      if (episodes.length === 0) break;

      // Process batch in parallel (with concurrency limit)
      await pMap(episodes, processor, { concurrency: 10 });

      offset += batchSize;

      // Small delay to prevent overwhelming the system
      await sleep(10);
    }
  }

  // Streaming for very large operations
  async *streamAllEpisodes(): AsyncGenerator<Episode> {
    const batchSize = 1000;
    let cursor: number | undefined;

    while (true) {
      const episodes = await db.select()
        .from(episodeTable)
        .where(cursor ? gt(episodeTable.id, cursor) : undefined)
        .orderBy(episodeTable.id)
        .limit(batchSize);

      if (episodes.length === 0) break;

      for (const episode of episodes) {
        yield episode;
      }

      cursor = episodes[episodes.length - 1].id;
    }
  }
}
```

---

## Resource Limits

### Memory Management

```typescript
const memoryLimits = {
  // Heap size limits
  maxHeapSize: 2048, // MB

  // Per-operation limits
  importBufferSize: 100, // MB
  imageProcessingBuffer: 50, // MB

  // Cache limits
  metadataCache: 100, // MB
  searchResultsCache: 50, // MB
};

class MemoryMonitor {
  private checkInterval: Timer;

  start(): void {
    this.checkInterval = setInterval(() => {
      const usage = process.memoryUsage();

      this.metrics.gauge('memory.heap_used', usage.heapUsed);
      this.metrics.gauge('memory.heap_total', usage.heapTotal);
      this.metrics.gauge('memory.rss', usage.rss);
      this.metrics.gauge('memory.external', usage.external);

      // Warn if approaching limits
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      if (heapUsedMB > memoryLimits.maxHeapSize * 0.8) {
        this.logger.warn('Memory usage high', {
          heapUsedMB,
          limit: memoryLimits.maxHeapSize,
        });

        // Trigger GC if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000);
  }
}
```

### CPU Limits

```typescript
const cpuLimits = {
  // Parser timeout
  parserTimeout: 1000, // ms

  // Image processing
  imageProcessingTimeout: 5000, // ms

  // Search timeout
  searchTimeout: 30000, // ms

  // Import timeout
  importTimeout: 300000, // 5 minutes
};

// CPU-intensive operations with timeout
async function parseReleaseWithTimeout(title: string): Promise<ParsedRelease> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    cpuLimits.parserTimeout
  );

  try {
    return await Promise.race([
      parseRelease(title),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new TimeoutError('Parser timeout'))
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
```

---

## Benchmarking

### Performance Test Suite

```typescript
import { bench, describe } from 'vitest';

describe('API Performance', () => {
  bench('GET /api/v1/series', async () => {
    await fetch('http://localhost:8989/api/v1/series');
  }, {
    iterations: 100,
    time: 5000,
  });

  bench('GET /api/v1/series/:id', async () => {
    await fetch('http://localhost:8989/api/v1/series/1');
  });

  bench('GET /api/v1/episode (filtered)', async () => {
    await fetch('http://localhost:8989/api/v1/episode?seriesId=1');
  });

  bench('POST /api/v1/series/lookup', async () => {
    await fetch('http://localhost:8989/api/v1/series/lookup?term=test', {
      method: 'POST',
    });
  });
});

describe('Database Performance', () => {
  bench('Series list query', async () => {
    await db.select().from(seriesTable).limit(100);
  });

  bench('Series with episodes', async () => {
    await db.query.series.findMany({
      limit: 10,
      with: { episodes: true },
    });
  });

  bench('Calendar query', async () => {
    const start = new Date();
    const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.select()
      .from(episodeTable)
      .where(
        and(
          gte(episodeTable.airDateUtc, start),
          lte(episodeTable.airDateUtc, end)
        )
      );
  });
});
```

### Load Testing

```typescript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at 50
    { duration: '30s', target: 100 }, // Spike
    { duration: '1m', target: 50 },   // Back to 50
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% under 200ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
  },
};

export default function () {
  const base = 'http://localhost:8989/api/v1';

  // Series list
  let res = http.get(`${base}/series`);
  check(res, {
    'series list status 200': (r) => r.status === 200,
    'series list duration < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(1);

  // Series detail
  res = http.get(`${base}/series/1`);
  check(res, {
    'series detail status 200': (r) => r.status === 200,
    'series detail duration < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(1);
}
```

### Continuous Performance Monitoring

```typescript
class PerformanceReporter {
  async generateReport(): Promise<PerformanceReport> {
    const [
      apiMetrics,
      dbMetrics,
      queueMetrics,
      resourceMetrics,
    ] = await Promise.all([
      this.collectApiMetrics(),
      this.collectDatabaseMetrics(),
      this.collectQueueMetrics(),
      this.collectResourceMetrics(),
    ]);

    const report: PerformanceReport = {
      timestamp: new Date(),
      period: '24h',

      api: {
        requestCount: apiMetrics.totalRequests,
        errorRate: apiMetrics.errors / apiMetrics.totalRequests,
        p50Latency: apiMetrics.latencyP50,
        p95Latency: apiMetrics.latencyP95,
        p99Latency: apiMetrics.latencyP99,
        slowestEndpoints: apiMetrics.slowest,
      },

      database: {
        queryCount: dbMetrics.totalQueries,
        avgQueryTime: dbMetrics.avgQueryTime,
        slowQueries: dbMetrics.slowQueries,
        connectionPoolUsage: dbMetrics.poolUsage,
      },

      queue: {
        jobsProcessed: queueMetrics.processed,
        jobsFailed: queueMetrics.failed,
        avgProcessingTime: queueMetrics.avgTime,
        queueDepth: queueMetrics.depth,
      },

      resources: {
        avgCpuUsage: resourceMetrics.avgCpu,
        maxCpuUsage: resourceMetrics.maxCpu,
        avgMemoryUsage: resourceMetrics.avgMemory,
        maxMemoryUsage: resourceMetrics.maxMemory,
      },
    };

    // Check against targets
    report.violations = this.checkViolations(report);

    return report;
  }

  private checkViolations(report: PerformanceReport): PerformanceViolation[] {
    const violations: PerformanceViolation[] = [];

    if (report.api.p95Latency > 200) {
      violations.push({
        metric: 'api.p95Latency',
        value: report.api.p95Latency,
        target: 200,
        severity: 'warning',
      });
    }

    if (report.api.errorRate > 0.01) {
      violations.push({
        metric: 'api.errorRate',
        value: report.api.errorRate,
        target: 0.01,
        severity: 'critical',
      });
    }

    // More checks...

    return violations;
  }
}
```

---

## Related Documents

- [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md) - Metrics and monitoring
- [CACHING.md](./CACHING.md) - Caching strategies
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database optimization
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) - Performance testing
