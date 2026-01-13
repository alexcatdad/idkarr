# Monitoring & Observability Specification

## Overview

This document defines the monitoring and observability strategy for idkarr, covering logging, metrics, tracing, alerting, and dashboards. Comprehensive observability enables quick issue detection, debugging, and performance optimization.

---

## Table of Contents

1. [Observability Pillars](#observability-pillars)
2. [Logging](#logging)
3. [Metrics](#metrics)
4. [Tracing](#tracing)
5. [Health Checks](#health-checks)
6. [Alerting](#alerting)
7. [Dashboards](#dashboards)
8. [Error Tracking](#error-tracking)

---

## Observability Pillars

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Observability Architecture                        │
└─────────────────────────────────────────────────────────────────────┘

                           ┌─────────────┐
                           │   idkarr    │
                           │  Application│
                           └──────┬──────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Logs        │    │    Metrics      │    │    Traces       │
│                 │    │                 │    │                 │
│  - Pino         │    │  - Prometheus   │    │  - OpenTelemetry│
│  - Structured   │    │  - Custom       │    │  - Request IDs  │
│  - JSON         │    │    counters     │    │  - Spans        │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Log Storage   │    │ Metrics Storage │    │  Trace Storage  │
│                 │    │                 │    │                 │
│  - Logtail      │    │  - Prometheus   │    │  - Jaeger       │
│  - Loki         │    │  - InfluxDB     │    │  - Tempo        │
│  - CloudWatch   │    │  - TimescaleDB  │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                      ┌─────────────────┐
                      │   Grafana       │
                      │   Dashboards    │
                      └────────┬────────┘
                               │
                      ┌────────┴────────┐
                      │                 │
                      ▼                 ▼
              ┌─────────────┐   ┌─────────────┐
              │  Alerting   │   │   Sentry    │
              │             │   │   Errors    │
              └─────────────┘   └─────────────┘
```

---

## Logging

### Logging Configuration

```typescript
// backend/src/lib/logger.ts

import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: logLevel,

  // Structured JSON output
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({}),
  },

  // Standard fields
  base: {
    service: 'idkarr',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },

  // Timestamp format
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'passwordHash',
      'apiKey',
      'token',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
    ],
    censor: '[REDACTED]',
  },

  // Serializers for common objects
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-request-id': req.headers['x-request-id'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Transport for development
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

// Child logger factory
export function createLogger(context: string): pino.Logger {
  return logger.child({ context });
}
```

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **trace** | Detailed debugging | Variable values, flow tracing |
| **debug** | Debugging info | Function entry/exit, state changes |
| **info** | Normal operations | Request handled, job completed |
| **warn** | Potential issues | Retry attempt, deprecated usage |
| **error** | Errors (recovered) | Failed operation, exception caught |
| **fatal** | Critical failures | Startup failure, unrecoverable |

### Logging Patterns

```typescript
// Request logging middleware
const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = c.get('requestId');

  // Log request
  logger.info({
    type: 'request',
    requestId,
    method: c.req.method,
    path: c.req.path,
    query: c.req.query(),
    userId: c.get('user')?.id,
  }, 'Incoming request');

  await next();

  // Log response
  const duration = Date.now() - start;
  logger.info({
    type: 'response',
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  }, 'Request completed');
};

// Business operation logging
async function addSeries(data: CreateSeriesDto): Promise<Series> {
  const log = createLogger('series.service');

  log.info({ tvdbId: data.tvdbId }, 'Adding series');

  try {
    const series = await seriesRepository.create(data);
    log.info({ seriesId: series.id, tvdbId: series.tvdbId }, 'Series added');
    return series;
  } catch (error) {
    log.error({ error, tvdbId: data.tvdbId }, 'Failed to add series');
    throw error;
  }
}

// Job/Worker logging
async function processDownload(job: Job): Promise<void> {
  const log = createLogger('download.worker');

  log.info({
    jobId: job.id,
    downloadId: job.data.downloadId,
  }, 'Processing download job');

  try {
    await performDownload(job.data);
    log.info({ jobId: job.id }, 'Download job completed');
  } catch (error) {
    log.error({ error, jobId: job.id }, 'Download job failed');
    throw error;
  }
}
```

### Log Aggregation

```typescript
// Logtail transport configuration
const logtailTransport = {
  target: '@logtail/pino',
  options: {
    sourceToken: process.env.LOGTAIL_SOURCE_TOKEN,
  },
  level: 'info',
};

// Multi-transport for production
const transports = pino.transport({
  targets: [
    // Console output
    {
      target: 'pino/file',
      options: { destination: 1 },
      level: 'info',
    },
    // Logtail
    logtailTransport,
  ],
});
```

---

## Metrics

### Metrics Configuration

```typescript
// backend/src/lib/metrics.ts

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

// Default metrics (CPU, memory, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register: registry });

// Custom metrics

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Database metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  registers: [registry],
});

// Queue metrics
export const queueJobsTotal = new Counter({
  name: 'queue_jobs_total',
  help: 'Total number of queue jobs',
  labelNames: ['queue', 'status'],
  registers: [registry],
});

export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Queue job duration in seconds',
  labelNames: ['queue', 'job_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Number of jobs in queue',
  labelNames: ['queue', 'state'],
  registers: [registry],
});

// Download metrics
export const downloadsTotal = new Counter({
  name: 'downloads_total',
  help: 'Total number of downloads',
  labelNames: ['status', 'protocol', 'indexer'],
  registers: [registry],
});

export const downloadDuration = new Histogram({
  name: 'download_duration_seconds',
  help: 'Download duration in seconds',
  labelNames: ['protocol'],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
  registers: [registry],
});

// Indexer metrics
export const indexerRequestsTotal = new Counter({
  name: 'indexer_requests_total',
  help: 'Total number of indexer requests',
  labelNames: ['indexer', 'type', 'status'],
  registers: [registry],
});

export const indexerResponseTime = new Histogram({
  name: 'indexer_response_time_seconds',
  help: 'Indexer response time in seconds',
  labelNames: ['indexer'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

// Media metrics
export const seriesCount = new Gauge({
  name: 'series_count',
  help: 'Total number of series',
  labelNames: ['instance', 'status'],
  registers: [registry],
});

export const moviesCount = new Gauge({
  name: 'movies_count',
  help: 'Total number of movies',
  labelNames: ['instance', 'status'],
  registers: [registry],
});

export const episodeFilesCount = new Gauge({
  name: 'episode_files_count',
  help: 'Total number of episode files',
  registers: [registry],
});

export const mediaStorageBytes = new Gauge({
  name: 'media_storage_bytes',
  help: 'Total media storage in bytes',
  labelNames: ['instance', 'type'],
  registers: [registry],
});

// External API metrics
export const externalApiRequestsTotal = new Counter({
  name: 'external_api_requests_total',
  help: 'Total external API requests',
  labelNames: ['service', 'endpoint', 'status'],
  registers: [registry],
});

export const externalApiResponseTime = new Histogram({
  name: 'external_api_response_time_seconds',
  help: 'External API response time',
  labelNames: ['service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

// WebSocket metrics
export const wsConnectionsActive = new Gauge({
  name: 'ws_connections_active',
  help: 'Active WebSocket connections',
  registers: [registry],
});

export const wsMessagesTotal = new Counter({
  name: 'ws_messages_total',
  help: 'Total WebSocket messages',
  labelNames: ['direction', 'type'],
  registers: [registry],
});
```

### Metrics Endpoint

```typescript
// Prometheus metrics endpoint
app.get('/metrics', async (c) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, {
    'Content-Type': registry.contentType,
  });
});

// Metrics middleware
const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();

  await next();

  const duration = (Date.now() - start) / 1000;
  const path = normalizePath(c.req.path);

  httpRequestsTotal.inc({
    method: c.req.method,
    path,
    status: c.res.status,
  });

  httpRequestDuration.observe({
    method: c.req.method,
    path,
    status: c.res.status,
  }, duration);
};

// Normalize paths to avoid high cardinality
function normalizePath(path: string): string {
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid');
}
```

### Business Metrics Collection

```typescript
// Periodic metrics collection
async function collectBusinessMetrics(): Promise<void> {
  // Series counts
  const seriesByStatus = await db.series.groupBy({
    by: ['instanceId', 'status'],
    _count: true,
  });

  for (const row of seriesByStatus) {
    seriesCount.set({
      instance: row.instanceId.toString(),
      status: row.status,
    }, row._count);
  }

  // Storage usage
  const storage = await db.episodeFile.aggregate({
    _sum: { size: true },
  });

  mediaStorageBytes.set({
    instance: '1',
    type: 'series',
  }, storage._sum.size || 0);

  // Queue depths
  for (const queue of ['download', 'import', 'rss']) {
    const counts = await getQueueCounts(queue);
    queueDepth.set({ queue, state: 'waiting' }, counts.waiting);
    queueDepth.set({ queue, state: 'active' }, counts.active);
    queueDepth.set({ queue, state: 'delayed' }, counts.delayed);
  }
}

// Schedule periodic collection
setInterval(collectBusinessMetrics, 60000); // Every minute
```

---

## Tracing

### OpenTelemetry Setup

```typescript
// backend/src/lib/tracing.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'idkarr',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

export function startTracing(): void {
  sdk.start();
  logger.info('OpenTelemetry tracing started');
}

export function stopTracing(): Promise<void> {
  return sdk.shutdown();
}
```

### Custom Spans

```typescript
// Creating custom spans

import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('idkarr');

async function searchIndexer(
  indexerId: number,
  query: SearchQuery
): Promise<Release[]> {
  return tracer.startActiveSpan('indexer.search', {
    kind: SpanKind.CLIENT,
    attributes: {
      'indexer.id': indexerId,
      'search.query': query.term,
      'search.categories': query.categories.join(','),
    },
  }, async (span) => {
    try {
      const results = await indexerClient.search(indexerId, query);

      span.setAttribute('search.result_count', results.length);
      span.setStatus({ code: SpanStatusCode.OK });

      return results;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Request ID Propagation

```typescript
// Request ID middleware for tracing context

import { context, propagation } from '@opentelemetry/api';

const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  // Extract trace context from headers
  const carrier = {};
  for (const [key, value] of Object.entries(c.req.header())) {
    carrier[key.toLowerCase()] = value;
  }

  const ctx = propagation.extract(context.active(), carrier);

  // Generate or use existing request ID
  const requestId = c.req.header('X-Request-Id') || generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  // Run request in trace context
  await context.with(ctx, () => next());
};
```

---

## Health Checks

### Health Check Endpoints

```typescript
// backend/src/routes/health.ts

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: HealthCheck[];
}

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
}

// Liveness probe (is the process running?)
app.get('/health/live', (c) => {
  return c.json({ status: 'ok' });
});

// Readiness probe (can it accept traffic?)
app.get('/health/ready', async (c) => {
  const checks: HealthCheck[] = [];

  // Database check
  checks.push(await checkDatabase());

  // Redis check
  checks.push(await checkRedis());

  const isReady = checks.every((c) => c.status !== 'fail');

  return c.json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
  }, isReady ? 200 : 503);
});

// Detailed health status
app.get('/health', async (c) => {
  const checks: HealthCheck[] = [];

  // Core services
  checks.push(await checkDatabase());
  checks.push(await checkRedis());

  // External services
  checks.push(await checkTvdb());
  checks.push(await checkTmdb());

  // Download clients
  const downloadClients = await getDownloadClients();
  for (const client of downloadClients) {
    checks.push(await checkDownloadClient(client));
  }

  // Indexers
  const indexers = await getIndexers();
  for (const indexer of indexers) {
    checks.push(await checkIndexer(indexer));
  }

  // Disk space
  const rootFolders = await getRootFolders();
  for (const folder of rootFolders) {
    checks.push(await checkDiskSpace(folder));
  }

  // Determine overall status
  const hasFailure = checks.some((c) => c.status === 'fail');
  const hasWarning = checks.some((c) => c.status === 'warn');

  const status: HealthStatus = {
    status: hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy',
    version: process.env.APP_VERSION || 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  };

  return c.json(status, status.status === 'unhealthy' ? 503 : 200);
});
```

### Health Check Implementations

```typescript
// Individual health checks

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      name: 'database',
      status: 'pass',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'fail',
      message: (error as Error).message,
      duration: Date.now() - start,
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return {
      name: 'redis',
      status: 'pass',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: 'redis',
      status: 'fail',
      message: (error as Error).message,
      duration: Date.now() - start,
    };
  }
}

async function checkDiskSpace(folder: RootFolder): Promise<HealthCheck> {
  try {
    const stats = await fs.statfs(folder.path);
    const freePercent = (stats.bavail / stats.blocks) * 100;

    if (freePercent < 5) {
      return {
        name: `disk:${folder.path}`,
        status: 'fail',
        message: `Only ${freePercent.toFixed(1)}% free space`,
      };
    } else if (freePercent < 10) {
      return {
        name: `disk:${folder.path}`,
        status: 'warn',
        message: `Low disk space: ${freePercent.toFixed(1)}% free`,
      };
    }

    return {
      name: `disk:${folder.path}`,
      status: 'pass',
    };
  } catch (error) {
    return {
      name: `disk:${folder.path}`,
      status: 'fail',
      message: (error as Error).message,
    };
  }
}

async function checkDownloadClient(client: DownloadClient): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await downloadClientService.testConnection(client);
    return {
      name: `download_client:${client.name}`,
      status: 'pass',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name: `download_client:${client.name}`,
      status: 'fail',
      message: (error as Error).message,
      duration: Date.now() - start,
    };
  }
}
```

---

## Alerting

### Alert Rules

```yaml
# alerting/rules.yml

groups:
  - name: idkarr
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency"
          description: "P95 latency is {{ $value | humanizeDuration }}"

      # Database connection issues
      - alert: DatabaseConnectionLow
        expr: db_connections_active < 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No database connections"
          description: "Database appears to be disconnected"

      # Queue backup
      - alert: QueueBacklog
        expr: queue_depth{state="waiting"} > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Queue backlog detected"
          description: "Queue {{ $labels.queue }} has {{ $value }} waiting jobs"

      # Download client down
      - alert: DownloadClientDown
        expr: |
          health_check_status{check=~"download_client:.*"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Download client unreachable"
          description: "{{ $labels.check }} is not responding"

      # Indexer down
      - alert: IndexerDown
        expr: |
          health_check_status{check=~"indexer:.*"} == 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Indexer unreachable"
          description: "{{ $labels.check }} is not responding"

      # Low disk space
      - alert: LowDiskSpace
        expr: |
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk {{ $labels.mountpoint }} has {{ $value | humanizePercentage }} free"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (process_resident_memory_bytes / 1073741824) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanize }}GB"

      # External API failures
      - alert: ExternalAPIFailures
        expr: |
          rate(external_api_requests_total{status="error"}[5m]) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "External API failures"
          description: "{{ $labels.service }} API is failing"
```

### Alert Notification

```typescript
// Alert notification handler

interface AlertNotification {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  source: string;
  timestamp: Date;
  labels?: Record<string, string>;
}

class AlertManager {
  async sendAlert(alert: AlertNotification): Promise<void> {
    // Log alert
    logger.warn({ alert }, 'Alert triggered');

    // Send to configured channels
    const channels = await getAlertChannels(alert.severity);

    for (const channel of channels) {
      try {
        switch (channel.type) {
          case 'discord':
            await this.sendDiscordAlert(channel, alert);
            break;
          case 'slack':
            await this.sendSlackAlert(channel, alert);
            break;
          case 'email':
            await this.sendEmailAlert(channel, alert);
            break;
          case 'webhook':
            await this.sendWebhookAlert(channel, alert);
            break;
        }
      } catch (error) {
        logger.error({ error, channel: channel.type }, 'Failed to send alert');
      }
    }
  }

  private async sendDiscordAlert(
    channel: AlertChannel,
    alert: AlertNotification
  ): Promise<void> {
    const color = {
      info: 0x3498db,
      warning: 0xf39c12,
      critical: 0xe74c3c,
    }[alert.severity];

    await fetch(channel.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: alert.title,
          description: alert.message,
          color,
          timestamp: alert.timestamp.toISOString(),
          footer: { text: `Source: ${alert.source}` },
        }],
      }),
    });
  }
}
```

---

## Dashboards

### Grafana Dashboard Configuration

```json
{
  "title": "idkarr Overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "timeseries",
      "targets": [{
        "expr": "sum(rate(http_requests_total[5m])) by (status)",
        "legendFormat": "{{ status }}"
      }]
    },
    {
      "title": "Request Latency (P95)",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
        "legendFormat": "P95"
      }]
    },
    {
      "title": "Active Downloads",
      "type": "stat",
      "targets": [{
        "expr": "queue_depth{queue=\"download\", state=\"active\"}"
      }]
    },
    {
      "title": "Queue Depth",
      "type": "timeseries",
      "targets": [{
        "expr": "queue_depth",
        "legendFormat": "{{ queue }} ({{ state }})"
      }]
    },
    {
      "title": "Series Count",
      "type": "stat",
      "targets": [{
        "expr": "sum(series_count)"
      }]
    },
    {
      "title": "Storage Usage",
      "type": "gauge",
      "targets": [{
        "expr": "sum(media_storage_bytes)"
      }]
    },
    {
      "title": "Download Success Rate",
      "type": "gauge",
      "targets": [{
        "expr": "sum(rate(downloads_total{status=\"success\"}[1h])) / sum(rate(downloads_total[1h]))"
      }]
    },
    {
      "title": "Indexer Response Time",
      "type": "timeseries",
      "targets": [{
        "expr": "histogram_quantile(0.95, sum(rate(indexer_response_time_seconds_bucket[5m])) by (le, indexer))",
        "legendFormat": "{{ indexer }}"
      }]
    }
  ]
}
```

---

## Error Tracking

### Sentry Integration

```typescript
// backend/src/lib/sentry.ts

import * as Sentry from '@sentry/bun';

export function initSentry(): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `idkarr@${process.env.APP_VERSION}`,

    // Performance
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,

    // Integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Postgres(),
    ],

    // Filter events
    beforeSend(event, hint) {
      // Filter out expected errors
      const error = hint.originalException;
      if (error instanceof AppError && error.status < 500) {
        return null;
      }

      // Sanitize data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['x-api-key'];
        }
      }

      return event;
    },

    // Fingerprinting
    beforeSendTransaction(event) {
      // Group similar transactions
      if (event.transaction) {
        event.transaction = event.transaction
          .replace(/\/\d+/g, '/:id')
          .replace(/\/[a-f0-9-]{36}/g, '/:uuid');
      }
      return event;
    },
  });
}

// Capture error with context
export function captureError(
  error: Error,
  context?: Record<string, unknown>
): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

// Set user context
export function setUserContext(user: { id: string; email?: string }): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}
```

---

*This monitoring specification ensures comprehensive observability across all system components for effective debugging and performance optimization.*
