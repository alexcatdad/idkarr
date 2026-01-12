# Analytics & Reporting Specification

> **idkarr** - Analytics, statistics, and reporting system specification

## Table of Contents

1. [Overview](#overview)
2. [Library Statistics](#library-statistics)
3. [Activity Analytics](#activity-analytics)
4. [Quality Reports](#quality-reports)
5. [Storage Analytics](#storage-analytics)
6. [Indexer Performance](#indexer-performance)
7. [Download Statistics](#download-statistics)
8. [Report Generation](#report-generation)

---

## Overview

### Analytics Goals

1. **Library Insights**: Understand library composition and growth
2. **Quality Tracking**: Monitor quality upgrades and gaps
3. **Performance Metrics**: Track system and integration performance
4. **Storage Planning**: Analyze storage usage and trends
5. **Actionable Reports**: Generate useful summaries for users

### Analytics Architecture

```typescript
interface AnalyticsConfig {
  // Collection
  enabled: boolean;
  collectionInterval: number; // minutes

  // Retention
  hourlyRetention: number;    // days
  dailyRetention: number;     // days
  monthlyRetention: number;   // months

  // Privacy
  anonymizeData: boolean;
  excludeFromTelemetry: boolean;
}

const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: true,
  collectionInterval: 60,
  hourlyRetention: 7,
  dailyRetention: 90,
  monthlyRetention: 24,
  anonymizeData: false,
  excludeFromTelemetry: true,
};
```

---

## Library Statistics

### Series Statistics

```typescript
interface SeriesStatistics {
  // Counts
  totalSeries: number;
  monitoredSeries: number;
  unmonitoredSeries: number;

  // By status
  byStatus: {
    continuing: number;
    ended: number;
    upcoming: number;
  };

  // By type
  byType: {
    standard: number;
    daily: number;
    anime: number;
  };

  // Episode statistics
  totalEpisodes: number;
  monitoredEpisodes: number;
  episodesWithFiles: number;
  missingEpisodes: number;
  episodesOnDisk: number;

  // Percentages
  completionPercentage: number;
  monitoredCompletionPercentage: number;
}

class SeriesStatisticsService {
  async getStatistics(): Promise<SeriesStatistics> {
    const [
      seriesCounts,
      statusCounts,
      typeCounts,
      episodeCounts,
    ] = await Promise.all([
      this.getSeriesCounts(),
      this.getStatusCounts(),
      this.getTypeCounts(),
      this.getEpisodeCounts(),
    ]);

    return {
      ...seriesCounts,
      byStatus: statusCounts,
      byType: typeCounts,
      ...episodeCounts,
      completionPercentage: this.calculateCompletion(episodeCounts),
      monitoredCompletionPercentage: this.calculateMonitoredCompletion(episodeCounts),
    };
  }

  private async getSeriesCounts(): Promise<Partial<SeriesStatistics>> {
    const result = await db.select({
      total: count(),
      monitored: count(sql`CASE WHEN monitored THEN 1 END`),
    }).from(series);

    return {
      totalSeries: result[0].total,
      monitoredSeries: result[0].monitored,
      unmonitoredSeries: result[0].total - result[0].monitored,
    };
  }

  private async getEpisodeCounts(): Promise<Partial<SeriesStatistics>> {
    const result = await db.select({
      total: count(),
      monitored: count(sql`CASE WHEN monitored THEN 1 END`),
      withFiles: count(sql`CASE WHEN has_file THEN 1 END`),
    }).from(episode);

    return {
      totalEpisodes: result[0].total,
      monitoredEpisodes: result[0].monitored,
      episodesWithFiles: result[0].withFiles,
      missingEpisodes: result[0].monitored - result[0].withFiles,
      episodesOnDisk: result[0].withFiles,
    };
  }
}
```

### Movie Statistics

```typescript
interface MovieStatistics {
  // Counts
  totalMovies: number;
  monitoredMovies: number;
  unmonitoredMovies: number;
  moviesWithFiles: number;
  missingMovies: number;

  // By year
  byDecade: Record<string, number>;

  // By genre
  byGenre: Record<string, number>;

  // Collections
  totalCollections: number;
  completeCollections: number;
  partialCollections: number;

  // Percentages
  completionPercentage: number;
}

class MovieStatisticsService {
  async getStatistics(): Promise<MovieStatistics> {
    const [counts, decades, genres, collections] = await Promise.all([
      this.getMovieCounts(),
      this.getByDecade(),
      this.getByGenre(),
      this.getCollectionStats(),
    ]);

    return {
      ...counts,
      byDecade: decades,
      byGenre: genres,
      ...collections,
      completionPercentage: (counts.moviesWithFiles / counts.monitoredMovies) * 100,
    };
  }

  private async getByDecade(): Promise<Record<string, number>> {
    const result = await db.select({
      decade: sql<string>`FLOOR(year / 10) * 10`,
      count: count(),
    })
    .from(movie)
    .groupBy(sql`FLOOR(year / 10) * 10`)
    .orderBy(sql`FLOOR(year / 10) * 10`);

    return Object.fromEntries(
      result.map(r => [`${r.decade}s`, r.count])
    );
  }
}
```

### Library Growth

```typescript
interface LibraryGrowth {
  period: 'day' | 'week' | 'month' | 'year';
  dataPoints: GrowthDataPoint[];
}

interface GrowthDataPoint {
  date: string;
  seriesCount: number;
  episodeCount: number;
  movieCount: number;
  filesAdded: number;
  sizeAdded: number;
}

class LibraryGrowthService {
  async getGrowth(period: 'day' | 'week' | 'month' | 'year'): Promise<LibraryGrowth> {
    const interval = this.getIntervalForPeriod(period);
    const startDate = this.getStartDateForPeriod(period);

    const result = await db.select({
      date: sql<string>`DATE_TRUNC(${interval}, added_at)`,
      seriesCount: count(sql`CASE WHEN type = 'series' THEN 1 END`),
      episodeCount: count(sql`CASE WHEN type = 'episode_file' THEN 1 END`),
      movieCount: count(sql`CASE WHEN type = 'movie_file' THEN 1 END`),
      sizeAdded: sum(sql`size`),
    })
    .from(history)
    .where(and(
      gte(history.date, startDate),
      eq(history.eventType, 'downloadFolderImported')
    ))
    .groupBy(sql`DATE_TRUNC(${interval}, added_at)`)
    .orderBy(sql`DATE_TRUNC(${interval}, added_at)`);

    return {
      period,
      dataPoints: result.map(r => ({
        date: r.date,
        seriesCount: r.seriesCount,
        episodeCount: r.episodeCount,
        movieCount: r.movieCount,
        filesAdded: r.episodeCount + r.movieCount,
        sizeAdded: r.sizeAdded,
      })),
    };
  }
}
```

---

## Activity Analytics

### Activity Summary

```typescript
interface ActivitySummary {
  period: string;

  // Downloads
  totalDownloads: number;
  successfulDownloads: number;
  failedDownloads: number;
  downloadSuccessRate: number;

  // By protocol
  usenetDownloads: number;
  torrentDownloads: number;

  // Imports
  totalImports: number;
  upgradeImports: number;
  newImports: number;

  // Grabs
  totalGrabs: number;
  automaticGrabs: number;
  manualGrabs: number;

  // Searches
  totalSearches: number;
  interactiveSearches: number;
  automaticSearches: number;
}

class ActivityAnalyticsService {
  async getSummary(startDate: Date, endDate: Date): Promise<ActivitySummary> {
    const history = await db.select()
      .from(historyTable)
      .where(and(
        gte(historyTable.date, startDate),
        lte(historyTable.date, endDate)
      ));

    const downloads = history.filter(h => h.eventType === 'grabbed');
    const imports = history.filter(h => h.eventType === 'downloadFolderImported');
    const failures = history.filter(h => h.eventType === 'downloadFailed');

    return {
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      totalDownloads: downloads.length,
      successfulDownloads: imports.length,
      failedDownloads: failures.length,
      downloadSuccessRate: (imports.length / downloads.length) * 100,
      usenetDownloads: downloads.filter(d => d.protocol === 'usenet').length,
      torrentDownloads: downloads.filter(d => d.protocol === 'torrent').length,
      totalImports: imports.length,
      upgradeImports: imports.filter(i => i.data?.isUpgrade).length,
      newImports: imports.filter(i => !i.data?.isUpgrade).length,
      totalGrabs: downloads.length,
      automaticGrabs: downloads.filter(d => !d.data?.userInvokedSearch).length,
      manualGrabs: downloads.filter(d => d.data?.userInvokedSearch).length,
      totalSearches: 0, // From search history
      interactiveSearches: 0,
      automaticSearches: 0,
    };
  }
}
```

### Activity Timeline

```typescript
interface ActivityEvent {
  id: number;
  timestamp: Date;
  eventType: string;
  title: string;
  description: string;
  mediaType: 'series' | 'movie';
  mediaId: number;
  quality?: string;
  indexer?: string;
  downloadClient?: string;
}

class ActivityTimelineService {
  async getTimeline(
    limit: number = 50,
    offset: number = 0,
    mediaType?: 'series' | 'movie'
  ): Promise<ActivityEvent[]> {
    const query = db.select()
      .from(historyTable)
      .orderBy(desc(historyTable.date))
      .limit(limit)
      .offset(offset);

    if (mediaType === 'series') {
      query.where(isNotNull(historyTable.seriesId));
    } else if (mediaType === 'movie') {
      query.where(isNotNull(historyTable.movieId));
    }

    const results = await query;

    return results.map(r => ({
      id: r.id,
      timestamp: r.date,
      eventType: r.eventType,
      title: this.getEventTitle(r),
      description: this.getEventDescription(r),
      mediaType: r.seriesId ? 'series' : 'movie',
      mediaId: r.seriesId ?? r.movieId!,
      quality: r.quality,
      indexer: r.data?.indexer,
      downloadClient: r.data?.downloadClient,
    }));
  }

  private getEventTitle(history: History): string {
    const titles: Record<string, string> = {
      grabbed: 'Download Started',
      downloadFolderImported: 'Imported',
      downloadFailed: 'Download Failed',
      episodeFileDeleted: 'File Deleted',
      episodeFileRenamed: 'File Renamed',
    };
    return titles[history.eventType] ?? history.eventType;
  }
}
```

---

## Quality Reports

### Quality Distribution

```typescript
interface QualityDistribution {
  mediaType: 'series' | 'movie';
  distribution: QualityCount[];
  upgradeProgress: UpgradeProgress;
}

interface QualityCount {
  quality: string;
  count: number;
  percentage: number;
  size: number;
}

interface UpgradeProgress {
  atCutoff: number;
  belowCutoff: number;
  aboveCutoff: number;
  cutoffUnmetPercentage: number;
}

class QualityReportService {
  async getEpisodeQualityDistribution(): Promise<QualityDistribution> {
    const result = await db.select({
      quality: episodeFile.quality,
      count: count(),
      size: sum(episodeFile.size),
    })
    .from(episodeFile)
    .groupBy(episodeFile.quality)
    .orderBy(desc(count()));

    const total = result.reduce((sum, r) => sum + r.count, 0);

    return {
      mediaType: 'series',
      distribution: result.map(r => ({
        quality: r.quality,
        count: r.count,
        percentage: (r.count / total) * 100,
        size: r.size,
      })),
      upgradeProgress: await this.getUpgradeProgress('series'),
    };
  }

  private async getUpgradeProgress(mediaType: 'series' | 'movie'): Promise<UpgradeProgress> {
    // Get files with their quality profile cutoffs
    const filesWithCutoff = await this.getFilesWithCutoffStatus(mediaType);

    const atCutoff = filesWithCutoff.filter(f => f.status === 'at').length;
    const belowCutoff = filesWithCutoff.filter(f => f.status === 'below').length;
    const aboveCutoff = filesWithCutoff.filter(f => f.status === 'above').length;

    return {
      atCutoff,
      belowCutoff,
      aboveCutoff,
      cutoffUnmetPercentage: (belowCutoff / filesWithCutoff.length) * 100,
    };
  }
}
```

### Quality History

```typescript
interface QualityUpgradeHistory {
  period: string;
  upgrades: QualityUpgrade[];
  summary: {
    totalUpgrades: number;
    averageQualityIncrease: number;
    mostCommonUpgrade: string;
  };
}

interface QualityUpgrade {
  date: Date;
  mediaTitle: string;
  previousQuality: string;
  newQuality: string;
  qualityIncrease: number; // Quality rank difference
}

class QualityHistoryService {
  async getUpgradeHistory(days: number = 30): Promise<QualityUpgradeHistory> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const upgrades = await db.select()
      .from(historyTable)
      .where(and(
        eq(historyTable.eventType, 'downloadFolderImported'),
        gte(historyTable.date, startDate),
        sql`data->>'isUpgrade' = 'true'`
      ))
      .orderBy(desc(historyTable.date));

    const mappedUpgrades = upgrades.map(u => ({
      date: u.date,
      mediaTitle: u.sourceTitle,
      previousQuality: u.data?.previousQuality ?? 'Unknown',
      newQuality: u.quality,
      qualityIncrease: this.calculateQualityIncrease(
        u.data?.previousQuality,
        u.quality
      ),
    }));

    return {
      period: `Last ${days} days`,
      upgrades: mappedUpgrades,
      summary: {
        totalUpgrades: mappedUpgrades.length,
        averageQualityIncrease: this.average(
          mappedUpgrades.map(u => u.qualityIncrease)
        ),
        mostCommonUpgrade: this.getMostCommonUpgrade(mappedUpgrades),
      },
    };
  }
}
```

---

## Storage Analytics

### Storage Overview

```typescript
interface StorageOverview {
  totalSize: number;
  seriesSize: number;
  movieSize: number;
  freeSpace: number;
  usedPercentage: number;

  byRootFolder: RootFolderStorage[];
  byQuality: QualityStorage[];
  byYear: YearStorage[];
}

interface RootFolderStorage {
  path: string;
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  mediaSize: number;
  fileCount: number;
}

class StorageAnalyticsService {
  async getOverview(): Promise<StorageOverview> {
    const [rootFolders, qualityBreakdown, yearBreakdown] = await Promise.all([
      this.getRootFolderStorage(),
      this.getByQuality(),
      this.getByYear(),
    ]);

    const totalSize = rootFolders.reduce((sum, rf) => sum + rf.mediaSize, 0);
    const seriesSize = await this.getSeriesSize();
    const movieSize = await this.getMovieSize();
    const freeSpace = rootFolders.reduce((sum, rf) => sum + rf.freeSpace, 0);
    const totalSpace = rootFolders.reduce((sum, rf) => sum + rf.totalSpace, 0);

    return {
      totalSize,
      seriesSize,
      movieSize,
      freeSpace,
      usedPercentage: ((totalSpace - freeSpace) / totalSpace) * 100,
      byRootFolder: rootFolders,
      byQuality: qualityBreakdown,
      byYear: yearBreakdown,
    };
  }

  private async getRootFolderStorage(): Promise<RootFolderStorage[]> {
    const rootFolders = await db.select().from(rootFolderTable);

    return Promise.all(rootFolders.map(async (rf) => {
      const diskInfo = await this.getDiskInfo(rf.path);
      const mediaInfo = await this.getMediaInFolder(rf.path);

      return {
        path: rf.path,
        totalSpace: diskInfo.total,
        freeSpace: diskInfo.free,
        usedSpace: diskInfo.total - diskInfo.free,
        mediaSize: mediaInfo.size,
        fileCount: mediaInfo.count,
      };
    }));
  }

  private async getByQuality(): Promise<QualityStorage[]> {
    const episodeFiles = await db.select({
      quality: episodeFile.quality,
      size: sum(episodeFile.size),
      count: count(),
    })
    .from(episodeFile)
    .groupBy(episodeFile.quality);

    const movieFiles = await db.select({
      quality: movieFile.quality,
      size: sum(movieFile.size),
      count: count(),
    })
    .from(movieFile)
    .groupBy(movieFile.quality);

    // Combine and aggregate
    const combined = new Map<string, QualityStorage>();

    for (const ef of episodeFiles) {
      combined.set(ef.quality, {
        quality: ef.quality,
        size: ef.size,
        count: ef.count,
        percentage: 0,
      });
    }

    for (const mf of movieFiles) {
      const existing = combined.get(mf.quality);
      if (existing) {
        existing.size += mf.size;
        existing.count += mf.count;
      } else {
        combined.set(mf.quality, {
          quality: mf.quality,
          size: mf.size,
          count: mf.count,
          percentage: 0,
        });
      }
    }

    const total = Array.from(combined.values()).reduce((sum, q) => sum + q.size, 0);

    return Array.from(combined.values()).map(q => ({
      ...q,
      percentage: (q.size / total) * 100,
    }));
  }
}
```

### Storage Predictions

```typescript
interface StoragePrediction {
  currentUsage: number;
  predictedUsage30Days: number;
  predictedUsage90Days: number;
  dailyGrowthRate: number;
  daysUntilFull: number | null;
  recommendation: string;
}

class StoragePredictionService {
  async getPrediction(): Promise<StoragePrediction> {
    // Get historical growth data
    const growthData = await this.getGrowthHistory(90);

    // Calculate daily growth rate
    const dailyGrowthRate = this.calculateDailyGrowthRate(growthData);

    // Get current usage
    const currentUsage = await this.getCurrentUsage();
    const freeSpace = await this.getFreeSpace();
    const totalSpace = currentUsage + freeSpace;

    // Predict future usage
    const predictedUsage30Days = currentUsage + (dailyGrowthRate * 30);
    const predictedUsage90Days = currentUsage + (dailyGrowthRate * 90);

    // Calculate days until full
    const daysUntilFull = dailyGrowthRate > 0
      ? Math.floor(freeSpace / dailyGrowthRate)
      : null;

    return {
      currentUsage,
      predictedUsage30Days,
      predictedUsage90Days,
      dailyGrowthRate,
      daysUntilFull,
      recommendation: this.getRecommendation(daysUntilFull, freeSpace, totalSpace),
    };
  }

  private getRecommendation(
    daysUntilFull: number | null,
    freeSpace: number,
    totalSpace: number
  ): string {
    const freePercentage = (freeSpace / totalSpace) * 100;

    if (daysUntilFull !== null && daysUntilFull < 30) {
      return 'Critical: Storage will be full within 30 days. Consider adding more storage or removing old content.';
    }

    if (daysUntilFull !== null && daysUntilFull < 90) {
      return 'Warning: Storage will be full within 90 days. Plan for additional storage.';
    }

    if (freePercentage < 10) {
      return 'Low space: Less than 10% free. Consider cleanup or expansion.';
    }

    return 'Storage usage is healthy.';
  }
}
```

---

## Indexer Performance

### Indexer Statistics

```typescript
interface IndexerStatistics {
  indexerId: number;
  indexerName: string;

  // Queries
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  successRate: number;

  // Results
  totalResults: number;
  averageResults: number;
  grabCount: number;
  grabRate: number;

  // Performance
  averageResponseTime: number;
  p95ResponseTime: number;

  // Availability
  uptime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

class IndexerStatsService {
  async getStatistics(indexerId: number, days: number = 30): Promise<IndexerStatistics> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const queries = await db.select()
      .from(indexerQueryLog)
      .where(and(
        eq(indexerQueryLog.indexerId, indexerId),
        gte(indexerQueryLog.timestamp, startDate)
      ));

    const successful = queries.filter(q => q.success);
    const failed = queries.filter(q => !q.success);
    const responseTimes = successful.map(q => q.responseTimeMs);

    const grabs = await this.getGrabCount(indexerId, startDate);

    return {
      indexerId,
      indexerName: queries[0]?.indexerName ?? 'Unknown',
      totalQueries: queries.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      successRate: (successful.length / queries.length) * 100,
      totalResults: successful.reduce((sum, q) => sum + q.resultCount, 0),
      averageResults: this.average(successful.map(q => q.resultCount)),
      grabCount: grabs,
      grabRate: (grabs / successful.length) * 100,
      averageResponseTime: this.average(responseTimes),
      p95ResponseTime: this.percentile(responseTimes, 95),
      uptime: this.calculateUptime(queries),
      lastError: failed[0]?.error,
      lastErrorTime: failed[0]?.timestamp,
    };
  }

  async getAllIndexerComparison(): Promise<IndexerComparison> {
    const indexers = await this.indexerService.getAll();
    const stats = await Promise.all(
      indexers.map(i => this.getStatistics(i.id))
    );

    return {
      indexers: stats,
      bestGrabRate: stats.reduce((best, s) =>
        s.grabRate > best.grabRate ? s : best
      ),
      bestResponseTime: stats.reduce((best, s) =>
        s.averageResponseTime < best.averageResponseTime ? s : best
      ),
      mostReliable: stats.reduce((best, s) =>
        s.successRate > best.successRate ? s : best
      ),
    };
  }
}
```

---

## Download Statistics

### Download Performance

```typescript
interface DownloadStatistics {
  // Overview
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  averageDownloadTime: number;

  // By client
  byClient: ClientDownloadStats[];

  // By protocol
  usenet: ProtocolStats;
  torrent: ProtocolStats;

  // Size
  totalDownloaded: number;
  averageSize: number;
  largestDownload: number;
}

interface ClientDownloadStats {
  clientName: string;
  downloadCount: number;
  failureCount: number;
  successRate: number;
  averageSpeed: number;
}

interface ProtocolStats {
  downloadCount: number;
  successRate: number;
  averageSpeed: number;
  totalSize: number;
}

class DownloadStatsService {
  async getStatistics(days: number = 30): Promise<DownloadStatistics> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await db.select()
      .from(historyTable)
      .where(and(
        gte(historyTable.date, startDate),
        inArray(historyTable.eventType, ['grabbed', 'downloadFolderImported', 'downloadFailed'])
      ));

    const grabs = history.filter(h => h.eventType === 'grabbed');
    const completed = history.filter(h => h.eventType === 'downloadFolderImported');
    const failed = history.filter(h => h.eventType === 'downloadFailed');

    return {
      totalDownloads: grabs.length,
      completedDownloads: completed.length,
      failedDownloads: failed.length,
      averageDownloadTime: this.calculateAverageDownloadTime(grabs, completed),
      byClient: await this.getByClient(history),
      usenet: this.getProtocolStats(history, 'usenet'),
      torrent: this.getProtocolStats(history, 'torrent'),
      totalDownloaded: completed.reduce((sum, c) => sum + (c.data?.size ?? 0), 0),
      averageSize: this.average(completed.map(c => c.data?.size ?? 0)),
      largestDownload: Math.max(...completed.map(c => c.data?.size ?? 0)),
    };
  }
}
```

---

## Report Generation

### Scheduled Reports

```typescript
interface ReportSchedule {
  id: number;
  name: string;
  type: ReportType;
  schedule: string; // Cron expression
  recipients: string[];
  format: 'html' | 'pdf' | 'json';
  enabled: boolean;
}

type ReportType =
  | 'library-summary'
  | 'activity-report'
  | 'quality-report'
  | 'storage-report'
  | 'performance-report';

class ReportGenerator {
  async generate(type: ReportType, options: ReportOptions): Promise<Report> {
    switch (type) {
      case 'library-summary':
        return this.generateLibrarySummary(options);
      case 'activity-report':
        return this.generateActivityReport(options);
      case 'quality-report':
        return this.generateQualityReport(options);
      case 'storage-report':
        return this.generateStorageReport(options);
      case 'performance-report':
        return this.generatePerformanceReport(options);
    }
  }

  private async generateLibrarySummary(options: ReportOptions): Promise<Report> {
    const [seriesStats, movieStats, growth] = await Promise.all([
      this.seriesStatsService.getStatistics(),
      this.movieStatsService.getStatistics(),
      this.growthService.getGrowth(options.period ?? 'month'),
    ]);

    return {
      type: 'library-summary',
      generatedAt: new Date(),
      period: options.period ?? 'month',
      data: {
        series: seriesStats,
        movies: movieStats,
        growth,
      },
    };
  }

  async exportReport(report: Report, format: 'html' | 'pdf' | 'json'): Promise<Buffer> {
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(report, null, 2));

      case 'html':
        const template = await this.getTemplate(report.type);
        return Buffer.from(this.renderHtml(template, report));

      case 'pdf':
        const html = await this.exportReport(report, 'html');
        return this.htmlToPdf(html);
    }
  }
}
```

### Report API

```typescript
// GET /api/v1/reports/library-summary
app.get('/api/v1/reports/library-summary', async (c) => {
  const period = c.req.query('period') ?? 'month';
  const format = c.req.query('format') ?? 'json';

  const report = await reportGenerator.generate('library-summary', { period });

  if (format === 'json') {
    return c.json(report);
  }

  const exported = await reportGenerator.exportReport(report, format);

  return new Response(exported, {
    headers: {
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'text/html',
      'Content-Disposition': `attachment; filename="library-summary.${format}"`,
    },
  });
});

// GET /api/v1/stats/overview
app.get('/api/v1/stats/overview', async (c) => {
  const [series, movies, storage, activity] = await Promise.all([
    seriesStatsService.getStatistics(),
    movieStatsService.getStatistics(),
    storageService.getOverview(),
    activityService.getSummary(getStartOfWeek(), new Date()),
  ]);

  return c.json({
    series,
    movies,
    storage,
    activity,
  });
});
```

---

## Related Documents

- [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md) - System metrics
- [REST_API.md](./REST_API.md) - API endpoints
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Data structures
- [UI_UX_SPECIFICATION.md](./UI_UX_SPECIFICATION.md) - Dashboard design
