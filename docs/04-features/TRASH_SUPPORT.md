# Trash Bin Support

## Overview

The trash bin system provides soft-delete functionality for all major entities (series, episodes, files, history, blocklist) with restore capabilities, automatic cleanup, and retention policies.

## Database Schema Changes

### Series Trash

```sql
-- Add to existing series table or create separate trash table
ALTER TABLE series ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE series ADD COLUMN deleted_reason TEXT;
ALTER TABLE series ADD COLUMN restore_point JSONB;

-- Index for deleted items
CREATE INDEX idx_series_deleted_at ON series(deleted_at) WHERE deleted_at IS NOT NULL;

-- Or use separate trash table (recommended)
CREATE TABLE series_trash (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  tvdb_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  sort_title VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  overview TEXT,
  network VARCHAR(255),
  air_time VARCHAR(50),
  monitored BOOLEAN NOT NULL,
  monitor_new_items VARCHAR(50),
  quality_profile_id INTEGER REFERENCES quality_profiles(id),
  season_folder BOOLEAN NOT NULL,
  use_scene_numbering BOOLEAN NOT NULL,
  path VARCHAR(1024),
  year INTEGER,
  runtime INTEGER,
  genres TEXT[],
  tags INTEGER[],
  added TIMESTAMP NOT NULL,
  first_aired TIMESTAMP,
  last_aired TIMESTAMP,
  root_folder_path VARCHAR(1024),
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_reason VARCHAR(255),
  deleted_by VARCHAR(255),
  restore_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_trash_deleted_at ON series_trash(deleted_at);
CREATE INDEX idx_series_trash_tvdb_id ON series_trash(tvdb_id);
CREATE INDEX idx_series_trash_title ON series_trash(LOWER(title));
```

### Episode Trash

```sql
CREATE TABLE episode_trash (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  title VARCHAR(255),
  air_date TIMESTAMP,
  air_date_utc TIMESTAMP,
  overview TEXT,
  has_file BOOLEAN NOT NULL,
  monitored BOOLEAN NOT NULL,
  absolute_episode_number INTEGER,
  unverified_scene_numbering BOOLEAN,
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_reason VARCHAR(255),
  deleted_by VARCHAR(255),
  restore_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  series_title VARCHAR(255) NOT NULL,
  series_path VARCHAR(1024),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_episode_trash_deleted_at ON episode_trash(deleted_at);
CREATE INDEX idx_episode_trash_series_id ON episode_trash(series_id);
CREATE INDEX idx_episode_trash_air_date ON episode_trash(air_date);
```

### Episode File Trash

```sql
CREATE TABLE episode_file_trash (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL REFERENCES episode_files(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_numbers INTEGER[] NOT NULL,
  relative_path VARCHAR(1024) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  size BIGINT NOT NULL,
  date_added TIMESTAMP NOT NULL,
  quality_id INTEGER REFERENCES qualities(id),
  language_id INTEGER REFERENCES languages(id),
  media_info JSONB,
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_reason VARCHAR(255),
  deleted_by VARCHAR(255),
  restore_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  series_title VARCHAR(255) NOT NULL,
  season_title VARCHAR(255),
  episode_titles TEXT[],
  file_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_episode_file_trash_deleted_at ON episode_file_trash(deleted_at);
CREATE INDEX idx_episode_file_trash_series_id ON episode_file_trash(series_id);
CREATE INDEX idx_episode_file_trash_file_hash ON episode_file_trash(file_hash);
```

### History Trash

```sql
CREATE TABLE history_trash (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL REFERENCES history(id) ON DELETE CASCADE,
  series_id INTEGER REFERENCES series(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  source_title VARCHAR(1024) NOT NULL,
  quality JSONB NOT NULL,
  custom_formats JSONB,
  custom_format_score INTEGER,
  date TIMESTAMP NOT NULL,
  data JSONB,
  event_type VARCHAR(50) NOT NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_reason VARCHAR(255),
  deleted_by VARCHAR(255),
  restore_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  series_title VARCHAR(255),
  episode_title VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_trash_deleted_at ON history_trash(deleted_at);
CREATE INDEX idx_history_trash_date ON history_trash(date);
CREATE INDEX idx_history_trash_event_type ON history_trash(event_type);
```

### Blocklist Trash

```sql
CREATE TABLE blocklist_trash (
  id SERIAL PRIMARY KEY,
  original_id INTEGER NOT NULL REFERENCES blocklist(id) ON DELETE CASCADE,
  series_id INTEGER REFERENCES series(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  source_title VARCHAR(1024) NOT NULL,
  source VARCHAR(50) NOT NULL,
  language INTEGER REFERENCES languages(id),
  quality JSONB NOT NULL,
  date TIMESTAMP NOT NULL,
  protocol VARCHAR(50) NOT NULL,
  indexer VARCHAR(255),
  message TEXT,
  deleted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_reason VARCHAR(255),
  deleted_by VARCHAR(255),
  restore_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  series_title VARCHAR(255),
  episode_title VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocklist_trash_deleted_at ON blocklist_trash(deleted_at);
CREATE INDEX idx_blocklist_trash_date ON blocklist_trash(date);
CREATE INDEX idx_blocklist_trash_source_title ON blocklist_trash(LOWER(source_title));
```

### Trash Settings

```sql
CREATE TABLE trash_settings (
  id SERIAL PRIMARY KEY,
  retention_days INTEGER NOT NULL DEFAULT 30,
  auto_cleanup_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_cleanup_time TIME NOT NULL DEFAULT '02:00:00',
  max_size_gb INTEGER,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notify_before_cleanup_days INTEGER NOT NULL DEFAULT 7,
  include_files BOOLEAN NOT NULL DEFAULT true,
  include_history BOOLEAN NOT NULL DEFAULT true,
  include_blocklist BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO trash_settings (retention_days, auto_cleanup_enabled, auto_cleanup_time, max_size_gb)
VALUES (30, true, '02:00:00', 50);
```

## TypeScript Models

```typescript
// backend/src/core/shared/models/trash.model.ts

export type DeletedReason = 
  | 'manual'
  | 'series_deleted'
  | 'episode_deleted'
  | 'file_deleted'
  | 'upgrade'
  | 'duplicate'
  | 'corrupted'
  | 'user_request'
  | 'system_cleanup';

export interface RestoreData {
  originalId: number;
  relationships: {
    episodes?: number[];
    files?: number[];
    history?: number[];
  };
  timestamps: {
    createdAt: Date;
    deletedAt: Date;
  };
  user: {
    deletedBy: string;
    deletedAt: Date;
  };
  size?: {
    bytes: number;
    files: number;
  };
}

export interface BaseTrashItem {
  id: number;
  originalId: number;
  deletedAt: Date;
  deletedReason: DeletedReason;
  deletedBy: string;
  restoreData: RestoreData;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeriesTrashItem extends BaseTrashItem {
  tvdbId: number;
  title: string;
  sortTitle: string;
  status: SeriesStatus;
  overview?: string;
  network?: string;
  airTime?: string;
  monitored: boolean;
  monitorNewItems: NewItemMonitorTypes;
  qualityProfileId: number;
  seasonFolder: boolean;
  useSceneNumbering: boolean;
  path?: string;
  year: number;
  runtime?: number;
  genres: string[];
  tags: number[];
  added: Date;
  firstAired?: Date;
  lastAired?: Date;
  rootFolderPath: string;
  imageCount: number;
  episodeCount: number;
  fileSize?: number;
  seasonsCount: number;
}

export interface EpisodeTrashItem extends BaseTrashItem {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  airDate?: Date;
  airDateUtc?: Date;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  unverifiedSceneNumbering?: boolean;
  seriesTitle: string;
  seriesPath: string;
  file?: EpisodeFileTrashItem;
  episodeFileId?: number;
  fileSize?: number;
  releaseTitle?: string;
  quality?: Quality;
  customFormats?: CustomFormat[];
}

export interface EpisodeFileTrashItem extends BaseTrashItem {
  seriesId: number;
  seasonNumber: number;
  episodeNumbers: number[];
  relativePath: string;
  path: string;
  size: number;
  dateAdded: Date;
  quality: Quality;
  language: Language;
  mediaInfo?: MediaInfo;
  seriesTitle: string;
  seasonTitle?: string;
  episodeTitles: string[];
  fileHash: string;
  fileExtension: string;
  resolution?: string;
  videoCodec?: string;
  audioCodec?: string;
  duration?: number;
}

export interface HistoryTrashItem extends BaseTrashItem {
  seriesId?: number;
  episodeId?: number;
  sourceTitle: string;
  quality: Quality;
  customFormats?: CustomFormat[];
  customFormatScore: number;
  date: Date;
  data?: HistoryData;
  eventType: HistoryEventType;
  seriesTitle?: string;
  episodeTitle?: string;
  indexer?: string;
  downloadId?: string;
}

export interface BlocklistTrashItem extends BaseTrashItem {
  seriesId?: number;
  episodeId?: number;
  sourceTitle: string;
  source: string;
  language?: Language;
  quality: Quality;
  date: Date;
  protocol: 'torrent' | 'usenet';
  indexer?: string;
  message?: string;
  seriesTitle?: string;
  episodeTitle?: string;
  size?: number;
  indexerFlags?: string[];
}

export interface TrashSettings {
  id: number;
  retentionDays: number;
  autoCleanupEnabled: boolean;
  autoCleanupTime: string;
  maxSizeGb?: number;
  notificationsEnabled: boolean;
  notifyBeforeCleanupDays: number;
  includeFiles: boolean;
  includeHistory: boolean;
  includeBlocklist: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrashStatistics {
  totalItems: number;
  seriesCount: number;
  episodeCount: number;
  episodeFileCount: number;
  historyCount: number;
  blocklistCount: number;
  totalSizeBytes: number;
  totalSizeGb: number;
  oldestItem: Date;
  newestItem: Date;
  itemsByReason: Record<DeletedReason, number>;
  itemsByMonth: Array<{ month: string; count: number }>;
  estimatedCleanupDate: Date;
}

export interface TrashCleanupPreview {
  seriesToDelete: number;
  episodesToDelete: number;
  filesToDelete: number;
  historyToDelete: number;
  blocklistToDelete: number;
  totalSizeBytes: number;
  totalSizeGb: number;
  itemsByReason: Record<DeletedReason, number>;
  itemsToDelete: Array<{
    type: 'series' | 'episode' | 'file' | 'history' | 'blocklist';
    id: number;
    title: string;
    deletedAt: Date;
    reason: string;
  }>;
}
```

## Trash Service Implementation

### Core Trash Service

```typescript
// backend/src/core/trash/services/trash.service.ts
import { SeriesTrashRepository } from '../repositories/series-trash.repository';
import { EpisodeTrashRepository } from '../repositories/episode-trash.repository';
import { EpisodeFileTrashRepository } from '../repositories/episode-file-trash.repository';
import { HistoryTrashRepository } from '../repositories/history-trash.repository';
import { BlocklistTrashRepository } from '../repositories/blocklist-trash.repository';
import { TrashSettingsRepository } from '../repositories/trash-settings.repository';
import { logger } from '@/lib/logger';
import { TrashStatistics, TrashCleanupPreview } from '../models/trash.model';
import { Redis } from 'ioredis';

interface TrashServiceDependencies {
  seriesTrashRepo: SeriesTrashRepository;
  episodeTrashRepo: EpisodeTrashRepository;
  episodeFileTrashRepo: EpisodeFileTrashRepository;
  historyTrashRepo: HistoryTrashRepository;
  blocklistTrashRepo: BlocklistTrashRepository;
  trashSettingsRepo: TrashSettingsRepository;
  redis: Redis;
}

export class TrashService {
  private readonly CACHE_TTL = 60 * 5; // 5 minutes

  constructor(
    private readonly deps: TrashServiceDependencies,
  ) {}

  // Move series to trash
  async moveToSeriesTrash(
    seriesId: number,
    reason: DeletedReason,
    deletedBy: string,
  ): Promise<void> {
    logger.info({ seriesId, reason, deletedBy }, 'Moving series to trash');

    // Fetch series with all relationships
    const series = await this.deps.seriesTrashRepo.findByIdWithRelations(seriesId);
    if (!series) {
      throw new NotFoundError('Series not found', 'series', seriesId);
    }

    // Build restore data
    const restoreData = {
      originalId: series.id,
      relationships: {
        episodes: series.episodes?.map(ep => ep.id),
        files: series.episodes?.map(ep => ep.fileId).filter(Boolean),
        history: await this.getSeriesHistoryIds(seriesId),
      },
      timestamps: {
        createdAt: series.added,
        deletedAt: new Date(),
      },
      user: {
        deletedBy,
        deletedAt: new Date(),
      },
      size: {
        bytes: series.episodes?.reduce((sum, ep) => sum + (ep.file?.size || 0), 0) || 0,
        files: series.episodes?.filter(ep => ep.hasFile).length || 0,
      },
    };

    // Insert into trash
    await this.deps.seriesTrashRepo.create({
      ...series,
      deletedAt: new Date(),
      deletedReason: reason,
      deletedBy,
      restoreData,
    });

    // Soft delete original (mark as deleted but keep record)
    await this.deps.seriesTrashRepo.softDelete(seriesId);

    // Invalidate cache
    await this.invalidateCache('series');
    await this.invalidateCache('trash');

    // Publish event
    await this.publishEvent({
      type: 'SeriesMovedToTrash',
      data: {
        seriesId,
        tvdbId: series.tvdbId,
        title: series.title,
        reason,
        deletedBy,
      },
    });

    logger.info(
      { seriesId, tvdbId: series.tvdbId, title: series.title },
      'Series moved to trash',
    );
  }

  // Restore series from trash
  async restoreSeries(trashId: number, restoredBy: string): Promise<void> {
    logger.info({ trashId, restoredBy }, 'Restoring series from trash');

    // Fetch trash item
    const trashItem = await this.deps.seriesTrashRepo.findById(trashId);
    if (!trashItem) {
      throw new NotFoundError('Trash item not found', 'trash', trashId);
    }

    // Check if original series still exists (conflict detection)
    const existing = await this.deps.seriesTrashRepo.findByTvdbId(trashItem.tvdbId);
    if (existing && existing.id !== trashItem.originalId) {
      throw new ConflictError(
        'Series with this TVDB ID already exists',
        'series',
        trashItem.tvdbId,
      );
    }

    // Restore series
    const restoredSeries = await this.deps.seriesTrashRepo.restore(trashItem, restoredBy);

    // Delete from trash
    await this.deps.seriesTrashRepo.delete(trashId);

    // Invalidate cache
    await this.invalidateCache('series');
    await this.invalidateCache('trash');

    // Publish event
    await this.publishEvent({
      type: 'SeriesRestored',
      data: {
        trashId,
        seriesId: restoredSeries.id,
        tvdbId: restoredSeries.tvdbId,
        title: restoredSeries.title,
        restoredBy,
      },
    });

    logger.info(
      { trashId, seriesId: restoredSeries.id, tvdbId: restoredSeries.tvdbId },
      'Series restored from trash',
    );
  }

  // Delete series from trash (permanent)
  async deleteSeriesFromTrash(trashId: number, userId: string): Promise<void> {
    logger.info({ trashId, userId }, 'Permanently deleting series from trash');

    const trashItem = await this.deps.seriesTrashRepo.findById(trashId);
    if (!trashItem) {
      throw new NotFoundError('Trash item not found', 'trash', trashId);
    }

    // Delete files from disk
    if (trashItem.restoreData.size?.files) {
      await this.deleteSeriesFiles(trashItem.path);
    }

    // Permanently delete from trash
    await this.deps.seriesTrashRepo.delete(trashId);

    // Publish event
    await this.publishEvent({
      type: 'SeriesPermanentlyDeleted',
      data: {
        trashId,
        tvdbId: trashItem.tvdbId,
        title: trashItem.title,
        userId,
      },
    });

    logger.info(
      { trashId, tvdbId: trashItem.tvdbId, title: trashItem.title },
      'Series permanently deleted from trash',
    );
  }

  // Empty trash (all types)
  async emptyTrash(type?: 'series' | 'episodes' | 'files' | 'history' | 'blocklist', userId: string): Promise<void> {
    logger.info({ type, userId }, 'Emptying trash');

    const deletedCounts: Record<string, number> = {};

    if (!type || type === 'series') {
      const count = await this.deps.seriesTrashRepo.count();
      await this.deps.seriesTrashRepo.deleteAll();
      deletedCounts.series = count;
    }

    if (!type || type === 'episodes') {
      const count = await this.deps.episodeTrashRepo.count();
      await this.deps.episodeTrashRepo.deleteAll();
      deletedCounts.episodes = count;
    }

    if (!type || type === 'files') {
      const count = await this.deps.episodeFileTrashRepo.count();
      await this.deps.episodeFileTrashRepo.deleteAll();
      deletedCounts.files = count;
    }

    if (!type || type === 'history') {
      const count = await this.deps.historyTrashRepo.count();
      await this.deps.historyTrashRepo.deleteAll();
      deletedCounts.history = count;
    }

    if (!type || type === 'blocklist') {
      const count = await this.deps.blocklistTrashRepo.count();
      await this.deps.blocklistTrashRepo.deleteAll();
      deletedCounts.blocklist = count;
    }

    // Invalidate cache
    await this.invalidateCache('trash');

    // Publish event
    await this.publishEvent({
      type: 'TrashEmptied',
      data: {
        type,
        deletedCounts,
        userId,
      },
    });

    logger.info({ type, deletedCounts }, 'Trash emptied');
  }

  // Get trash statistics
  async getStatistics(): Promise<TrashStatistics> {
    const cacheKey = 'trash:statistics';

    // Try cache first
    const cached = await this.deps.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate statistics
    const [
      seriesCount,
      episodeCount,
      episodeFileCount,
      historyCount,
      blocklistCount,
      totalSizeBytes,
      oldestItem,
      newestItem,
      itemsByReason,
    ] = await Promise.all([
      this.deps.seriesTrashRepo.count(),
      this.deps.episodeTrashRepo.count(),
      this.deps.episodeFileTrashRepo.count(),
      this.deps.historyTrashRepo.count(),
      this.deps.blocklistTrashRepo.count(),
      this.calculateTotalSize(),
      this.getOldestItemDate(),
      this.getNewestItemDate(),
      this.getItemsByReason(),
    ]);

    const statistics: TrashStatistics = {
      totalItems: seriesCount + episodeCount + episodeFileCount + historyCount + blocklistCount,
      seriesCount,
      episodeCount,
      episodeFileCount,
      historyCount,
      blocklistCount,
      totalSizeBytes,
      totalSizeGb: totalSizeBytes / (1024 ** 3),
      oldestItem,
      newestItem,
      itemsByReason,
      itemsByMonth: await this.getItemsByMonth(),
      estimatedCleanupDate: await this.calculateEstimatedCleanupDate(),
    };

    // Cache statistics
    await this.deps.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(statistics));

    return statistics;
  }

  // Get cleanup preview
  async getCleanupPreview(): Promise<TrashCleanupPreview> {
    const settings = await this.deps.trashSettingsRepo.getSettings();
    const cutoffDate = this.calculateCutoffDate(settings.retentionDays);

    const [
      seriesToDelete,
      episodesToDelete,
      filesToDelete,
      historyToDelete,
      blocklistToDelete,
    ] = await Promise.all([
      this.deps.seriesTrashRepo.countOlderThan(cutoffDate),
      this.deps.episodeTrashRepo.countOlderThan(cutoffDate),
      this.deps.episodeFileTrashRepo.countOlderThan(cutoffDate),
      this.deps.historyTrashRepo.countOlderThan(cutoffDate),
      this.deps.blocklistTrashRepo.countOlderThan(cutoffDate),
    ]);

    const itemsToDelete = await this.getItemsToDelete(cutoffDate, 100);

    const totalSizeBytes = await this.calculateSizeOfItems(itemsToDelete);

    return {
      seriesToDelete,
      episodesToDelete,
      filesToDelete,
      historyToDelete,
      blocklistToDelete,
      totalSizeBytes,
      totalSizeGb: totalSizeBytes / (1024 ** 3),
      itemsByReason: this.groupItemsByReason(itemsToDelete),
      itemsToDelete,
    };
  }

  // Auto cleanup job (scheduled)
  async autoCleanup(): Promise<void> {
    logger.info('Starting auto cleanup job');

    const settings = await this.deps.trashSettingsRepo.getSettings();

    if (!settings.autoCleanupEnabled) {
      logger.info('Auto cleanup is disabled, skipping');
      return;
    }

    const preview = await this.getCleanupPreview();

    if (preview.totalSizeBytes === 0) {
      logger.info('No items to clean up');
      return;
    }

    logger.info(
      {
        itemsToDelete: preview.totalItems,
        sizeGb: preview.totalSizeGb,
      },
      'Auto cleanup running',
    );

    // Send notification before cleanup
    if (settings.notificationsEnabled && settings.notifyBeforeCleanupDays > 0) {
      await this.sendCleanupNotification(preview, settings);
    }

    // Perform cleanup
    const cutoffDate = this.calculateCutoffDate(settings.retentionDays);

    const [seriesDeleted, episodesDeleted, filesDeleted, historyDeleted, blocklistDeleted] =
      await Promise.all([
        this.deps.seriesTrashRepo.deleteOlderThan(cutoffDate),
        this.deps.episodeTrashRepo.deleteOlderThan(cutoffDate),
        this.deps.episodeFileTrashRepo.deleteOlderThan(cutoffDate),
        this.deps.historyTrashRepo.deleteOlderThan(cutoffDate),
        this.deps.blocklistTrashRepo.deleteOlderThan(cutoffDate),
      ]);

    // Invalidate cache
    await this.invalidateCache('trash');

    // Publish event
    await this.publishEvent({
      type: 'AutoCleanupCompleted',
      data: {
        seriesDeleted,
        episodesDeleted,
        filesDeleted,
        historyDeleted,
        blocklistDeleted,
        totalDeleted: seriesDeleted + episodesDeleted + filesDeleted + historyDeleted + blocklistDeleted,
      },
    });

    logger.info(
      {
        seriesDeleted,
        episodesDeleted,
        filesDeleted,
        historyDeleted,
        blocklistDeleted,
        totalDeleted: seriesDeleted + episodesDeleted + filesDeleted + historyDeleted + blocklistDeleted,
      },
      'Auto cleanup completed',
    );
  }

  // Update trash settings
  async updateSettings(settings: Partial<TrashSettings>): Promise<TrashSettings> {
    logger.info({ settings }, 'Updating trash settings');

    const updated = await this.deps.trashSettingsRepo.update(settings);

    // Invalidate cache
    await this.invalidateCache('trash:settings');

    return updated;
  }

  // Private helpers
  private async getSeriesHistoryIds(seriesId: number): Promise<number[]> {
    const history = await this.deps.historyTrashRepo.findBySeriesId(seriesId);
    return history.map(h => h.originalId);
  }

  private async deleteSeriesFiles(path: string): Promise<void> {
    const fs = await import('fs/promises');
    const { rm } = await import('fs/promises');

    try {
      await rm(path, { recursive: true, force: true });
      logger.info({ path }, 'Deleted series files from disk');
    } catch (error) {
      logger.error({ path, error }, 'Failed to delete series files');
    }
  }

  private calculateCutoffDate(retentionDays: number): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    return cutoff;
  }

  private async calculateTotalSize(): Promise<number> {
    const [
      seriesSize,
      episodesSize,
      filesSize,
    ] = await Promise.all([
      this.deps.seriesTrashRepo.calculateSize(),
      this.deps.episodeTrashRepo.calculateSize(),
      this.deps.episodeFileTrashRepo.calculateSize(),
    ]);

    return seriesSize + episodesSize + filesSize;
  }

  private async getOldestItemDate(): Promise<Date> {
    const dates = await Promise.all([
      this.deps.seriesTrashRepo.getOldestDate(),
      this.deps.episodeTrashRepo.getOldestDate(),
      this.deps.episodeFileTrashRepo.getOldestDate(),
      this.deps.historyTrashRepo.getOldestDate(),
      this.deps.blocklistTrashRepo.getOldestDate(),
    ]);

    const validDates = dates.filter(Boolean);
    return new Date(Math.min(...validDates.map(d => d!.getTime())));
  }

  private async getNewestItemDate(): Promise<Date> {
    const dates = await Promise.all([
      this.deps.seriesTrashRepo.getNewestDate(),
      this.deps.episodeTrashRepo.getNewestDate(),
      this.deps.episodeFileTrashRepo.getNewestDate(),
      this.deps.historyTrashRepo.getNewestDate(),
      this.deps.blocklistTrashRepo.getNewestDate(),
    ]);

    const validDates = dates.filter(Boolean);
    return new Date(Math.max(...validDates.map(d => d!.getTime())));
  }

  private async getItemsByReason(): Promise<Record<DeletedReason, number>> {
    const [
      seriesByReason,
      episodesByReason,
      filesByReason,
      historyByReason,
      blocklistByReason,
    ] = await Promise.all([
      this.deps.seriesTrashRepo.countByReason(),
      this.deps.episodeTrashRepo.countByReason(),
      this.deps.episodeFileTrashRepo.countByReason(),
      this.deps.historyTrashRepo.countByReason(),
      this.deps.blocklistTrashRepo.countByReason(),
    ]);

    const combined: Record<DeletedReason, number> = {};

    Object.keys(seriesByReason).forEach(key => {
      combined[key as DeletedReason] = (combined[key as DeletedReason] || 0) + seriesByReason[key as DeletedReason];
    });

    // Combine all reasons
    Object.keys(episodesByReason).forEach(key => {
      combined[key as DeletedReason] = (combined[key as DeletedReason] || 0) + episodesByReason[key as DeletedReason];
    });

    // ... etc for other types

    return combined;
  }

  private async getItemsByMonth(): Promise<Array<{ month: string; count: number }>> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);

    const items = await this.deps.seriesTrashRepo.findByDateRange(cutoffDate, new Date());

    const byMonth: Record<string, number> = {};

    items.forEach(item => {
      const month = item.deletedAt.toISOString().slice(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    return Object.entries(byMonth).map(([month, count]) => ({ month, count }));
  }

  private async calculateEstimatedCleanupDate(): Promise<Date> {
    const settings = await this.deps.trashSettingsRepo.getSettings();
    const [autoCleanupTime, retentionDays] = await Promise.all([
      settings.autoCleanupTime,
      settings.retentionDays,
    ]);

    const cleanupDate = new Date();
    const [hours, minutes] = autoCleanupTime.split(':').map(Number);
    cleanupDate.setHours(hours, minutes, 0, 0);
    cleanupDate.setDate(cleanupDate.getDate() + retentionDays);

    return cleanupDate;
  }

  private async getItemsToDelete(cutoffDate: Date, limit: number): Promise<Array<any>> {
    const [seriesItems, episodeItems, fileItems, historyItems, blocklistItems] =
      await Promise.all([
        this.deps.seriesTrashRepo.findOlderThan(cutoffDate, limit),
        this.deps.episodeTrashRepo.findOlderThan(cutoffDate, limit),
        this.deps.episodeFileTrashRepo.findOlderThan(cutoffDate, limit),
        this.deps.historyTrashRepo.findOlderThan(cutoffDate, limit),
        this.deps.blocklistTrashRepo.findOlderThan(cutoffDate, limit),
      ]);

    return [
      ...seriesItems.map(item => ({ ...item, type: 'series' as const })),
      ...episodeItems.map(item => ({ ...item, type: 'episode' as const })),
      ...fileItems.map(item => ({ ...item, type: 'file' as const })),
      ...historyItems.map(item => ({ ...item, type: 'history' as const })),
      ...blocklistItems.map(item => ({ ...item, type: 'blocklist' as const })),
    ];
  }

  private async calculateSizeOfItems(items: any[]): Promise<number> {
    return items.reduce((sum, item) => sum + (item.size || 0), 0);
  }

  private groupItemsByReason(items: any[]): Record<DeletedReason, number> {
    const grouped: Record<DeletedReason, number> = {};
    items.forEach(item => {
      grouped[item.deletedReason] = (grouped[item.deletedReason] || 0) + 1;
    });
    return grouped;
  }

  private async sendCleanupNotification(preview: TrashCleanupPreview, settings: TrashSettings): Promise<void> {
    const { notificationService } = await import('@/core/notifications/services/notification.service');

    await notificationService.send({
      type: 'trash_cleanup_warning',
      title: 'Trash Cleanup Scheduled',
      message: `${preview.totalItems} items (${preview.totalSizeGb.toFixed(2)} GB) will be permanently deleted in ${settings.notifyBeforeCleanupDays} days`,
      data: {
        preview,
        settings,
      },
    });

    logger.info('Sent cleanup warning notification');
  }

  private async publishEvent(event: any): Promise<void> {
    const { eventPublisher } = await import('@/lib/pubsub/publisher');
    await eventPublisher.publish(event);
  }

  private async invalidateCache(key: string): Promise<void> {
    const pattern = key.includes(':') ? key : `${key}*`;
    const keys = await this.deps.redis.keys(pattern);
    if (keys.length > 0) {
      await this.deps.redis.del(...keys);
    }
  }
}
```

## API Endpoints

### Trash API Routes

```typescript
// backend/src/app/routes/api/v3/trash/index.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { trashService } from '@/core/trash/services/trash.service';
import { paginationSchema } from '@/shared/pagination';

const app = new Hono();

// Get all trash items
app.get('/', async (c) => {
  const { page = 1, pageSize = 20, type, sort = 'deletedAt', order = 'desc' } = c.req.query();

  const [items, total] = await Promise.all([
    trashService.getAll({
      type: type as any,
      sort: sort as any,
      order: order as 'asc' | 'desc',
      page: Number(page),
      pageSize: Number(pageSize),
    }),
    trashService.getCount(type as any),
  ]);

  return c.json({
    data: items,
    page: Number(page),
    pageSize: Number(pageSize),
    totalRecords: total,
    totalPages: Math.ceil(total / Number(pageSize)),
  });
});

// Get trash statistics
app.get('/statistics', async (c) => {
  const statistics = await trashService.getStatistics();
  return c.json({ data: statistics });
});

// Get cleanup preview
app.get('/cleanup/preview', async (c) => {
  const preview = await trashService.getCleanupPreview();
  return c.json({ data: preview });
});

// Restore series
app.post('/series/:trashId/restore', async (c) => {
  const trashId = Number(c.req.param('trashId'));
  const { restoredBy } = c.req.json();

  await trashService.restoreSeries(trashId, restoredBy);

  return c.json({ success: true }, 200);
});

// Delete series from trash
app.delete('/series/:trashId', async (c) => {
  const trashId = Number(c.req.param('trashId'));
  const userId = c.req.header('X-User-Id') || 'unknown';

  await trashService.deleteSeriesFromTrash(trashId, userId);

  return c.json({ success: true }, 204);
});

// Empty trash
app.post('/empty', async (c) => {
  const { type } = c.req.json();
  const userId = c.req.header('X-User-Id') || 'unknown';

  await trashService.emptyTrash(type, userId);

  return c.json({ success: true }, 200);
});

// Update trash settings
app.put('/settings', async (c) => {
  const body = await c.req.json();

  const settings = await trashService.updateSettings(body);

  return c.json({ data: settings });
});

// Get trash settings
app.get('/settings', async (c) => {
  const settings = await trashService.getSettings();
  return c.json({ data: settings });
});

export default app;
```

## Frontend Components

### Trash Page

```typescript
// frontend/src/app/(dashboard)/trash/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash, Restore, AlertTriangle, RefreshCw, Settings, Info } from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import { trashApi } from '@/lib/api/trash';

export default function TrashPage() {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showEmptyDialog, setShowEmptyDialog] = useState(false);

  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ['trash', 'statistics'],
    queryFn: () => trashApi.getStatistics(),
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['trash', selectedTab],
    queryFn: () => trashApi.getItems({ type: selectedTab === 'all' ? undefined : selectedTab }),
  });

  const { data: settings } = useQuery({
    queryKey: ['trash', 'settings'],
    queryFn: () => trashApi.getSettings(),
  });

  const { data: preview } = useQuery({
    queryKey: ['trash', 'cleanup', 'preview'],
    queryFn: () => trashApi.getCleanupPreview(),
    refetchInterval: 60 * 1000 * 60, // Refresh every hour
  });

  const restoreMutation = useMutation({
    mutationFn: (trashId: number) => trashApi.restoreSeries(trashId),
    onSuccess: () => {
      toast.success('Series restored successfully');
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: (type?: string) => trashApi.emptyTrash(type),
    onSuccess: () => {
      toast.success('Trash emptied successfully');
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const handleRestore = async () => {
    for (const trashId of selectedItems) {
      await restoreMutation.mutateAsync(trashId);
    }
    setSelectedItems([]);
    setShowRestoreDialog(false);
  };

  const handleEmpty = async () => {
    await emptyTrashMutation.mutateAsync(selectedTab === 'all' ? undefined : selectedTab);
    setSelectedItems([]);
    setShowEmptyDialog(false);
  };

  if (isLoading || statsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Trash</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['trash', 'cleanup', 'preview'] })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Preview
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Series</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.seriesCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Episodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.episodeCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.episodeFileCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.historyCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Blocklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.blocklistCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Items</div>
              <div className="text-2xl font-bold">{statistics?.totalItems || 0}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Size</div>
              <div className="text-2xl font-bold">
                {statistics?.totalSizeGb ? statistics.totalSizeGb.toFixed(2) : '0.00'} GB
              </div>
            </div>
          </div>

          {statistics?.estimatedCleanupDate && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-900">Auto Cleanup Scheduled</div>
                  <div className="text-sm text-yellow-700">
                    {formatDate(statistics.estimatedCleanupDate, 'PPP p')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Preview */}
      {preview && preview.totalSizeBytes > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Cleanup Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Series to delete:</span>
                <span className="font-medium">{preview.seriesToDelete}</span>
              </div>
              <div className="flex justify-between">
                <span>Episodes to delete:</span>
                <span className="font-medium">{preview.episodesToDelete}</span>
              </div>
              <div className="flex justify-between">
                <span>Files to delete:</span>
                <span className="font-medium">{preview.filesToDelete}</span>
              </div>
              <div className="flex justify-between">
                <span>History to delete:</span>
                <span className="font-medium">{preview.historyToDelete}</span>
              </div>
              <div className="flex justify-between">
                <span>Blocklist to delete:</span>
                <span className="font-medium">{preview.blocklistToDelete}</span>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total Size:</span>
                  <span>{preview.totalSizeGb.toFixed(2)} GB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="episodes">Episodes</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="blocklist">Blocklist</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <>
              <Button
                onClick={() => setShowRestoreDialog(true)}
                disabled={restoreMutation.isPending}
              >
                <Restore className="w-4 h-4 mr-2" />
                Restore ({selectedItems.length})
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowEmptyDialog(true)}
                disabled={emptyTrashMutation.isPending}
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete Permanently
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => handleEmpty()}
            disabled={emptyTrashMutation.isPending}
          >
            <Trash className="w-4 h-4 mr-2" />
            Empty Trash
          </Button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {items?.data.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems([...selectedItems, item.id]);
                    } else {
                      setSelectedItems(selectedItems.filter(id => id !== item.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-500">
                    Deleted: {formatDate(item.deletedAt)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Reason: {item.deletedReason}
                  </div>
                </div>
                <Badge variant="outline">{item.type}</Badge>
                {item.size && (
                  <div className="text-sm text-gray-500">
                    {formatBytes(item.size)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Items</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to restore {selectedItems.length} items? This will restore them to your library.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={restoreMutation.isPending}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empty Trash Dialog */}
      <Dialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permanently</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to permanently delete {selectedItems.length || 'all'} items? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmptyDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleEmpty} disabled={emptyTrashMutation.isPending}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## Scheduled Cleanup Job

```typescript
// backend/jobs/cleanup.worker.ts
import { Worker } from 'bullmq';
import { logger } from '@/lib/logger';
import { trashQueue } from '@/queues';
import { trashService } from '@/core/trash/services/trash.service';

async function cleanupProcessor() {
  logger.info('Starting trash auto cleanup job');

  try {
    await trashService.autoCleanup();
    logger.info('Trash auto cleanup completed successfully');
  } catch (error) {
    logger.error('Trash auto cleanup failed', { error });
    throw error;
  }
}

const cleanupWorker = new Worker('trash-cleanup', cleanupProcessor, {
  connection: trashQueue.opts.connection,
  concurrency: 1,
});

cleanupWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Trash cleanup job completed');
});

cleanupWorker.on('failed', (job, error) => {
  logger.error({ jobId: job.id, error }, 'Trash cleanup job failed');
});

export { cleanupWorker };
```

---

*This trash bin implementation provides comprehensive soft-delete functionality with restore capabilities, automatic cleanup, and retention policies.*