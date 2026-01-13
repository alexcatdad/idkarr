# Migration Guide

## Overview

This document provides comprehensive guidance for migrating from existing *arr applications (Sonarr, Radarr, Overseerr) to idkarr. It covers database migration, configuration migration, and strategies for parallel running during transition.

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Sonarr Migration](#sonarr-migration)
4. [Radarr Migration](#radarr-migration)
5. [Overseerr Migration](#overseerr-migration)
6. [Database Migration](#database-migration)
7. [Configuration Migration](#configuration-migration)
8. [Parallel Running](#parallel-running)
9. [Rollback Procedures](#rollback-procedures)
10. [Post-Migration Verification](#post-migration-verification)

---

## Migration Overview

### Migration Paths

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Migration Paths                                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                           ┌──────────────┐
│   Sonarr     │──────────────────────────▶│              │
│   (TV)       │    TV Series, Episodes,   │              │
│              │    History, Queue         │              │
└──────────────┘                           │              │
                                           │              │
┌──────────────┐                           │   idkarr     │
│   Radarr     │──────────────────────────▶│              │
│   (Movies)   │    Movies, Files,         │   (Unified)  │
│              │    History, Queue         │              │
└──────────────┘                           │              │
                                           │              │
┌──────────────┐                           │              │
│  Overseerr   │──────────────────────────▶│              │
│  (Requests)  │    Users, Requests,       │              │
│              │    Watchlists             │              │
└──────────────┘                           └──────────────┘
```

### Migration Complexity

| Source | Complexity | Duration | Risk |
|--------|------------|----------|------|
| Sonarr v3 | Medium | 30-60 min | Low |
| Sonarr v4/v5 | Low | 15-30 min | Low |
| Radarr | Low | 15-30 min | Low |
| Overseerr | Medium | 30-60 min | Medium |
| All Combined | High | 2-4 hours | Medium |

---

## Pre-Migration Checklist

### Before Starting

```markdown
## Pre-Migration Checklist

### Backups
- [ ] Sonarr database backed up (sonarr.db)
- [ ] Sonarr config folder backed up
- [ ] Radarr database backed up (radarr.db)
- [ ] Radarr config folder backed up
- [ ] Overseerr database backed up (db.sqlite3)
- [ ] All backups verified (can restore)

### System Requirements
- [ ] PostgreSQL 16+ installed
- [ ] Redis 7+ installed
- [ ] Sufficient disk space (2x database size)
- [ ] idkarr installed and running

### Preparation
- [ ] Document current quality profiles
- [ ] Document custom formats
- [ ] Document root folder paths
- [ ] Document indexer configurations
- [ ] Document download client settings
- [ ] Export all data from source apps

### Access
- [ ] Admin access to all source applications
- [ ] Admin access to idkarr
- [ ] Access to file system (media folders)
- [ ] Access to download clients

### Timing
- [ ] Schedule migration during low activity
- [ ] Pause all RSS syncs
- [ ] Complete or remove all active downloads
- [ ] Notify users of maintenance window
```

### System Verification

```bash
# Verify PostgreSQL
psql --version
# Expected: psql (PostgreSQL) 16.x

# Verify Redis
redis-cli ping
# Expected: PONG

# Verify idkarr
curl http://localhost:3000/api/v3/system/status
# Expected: {"version": "1.0.0", ...}

# Check disk space
df -h /path/to/idkarr/data
```

---

## Sonarr Migration

### Sonarr v5 Migration

```typescript
// migration/sonarr-v5.ts

interface SonarrV5Migration {
  sourceDb: string;      // Path to sonarr.db (SQLite)
  targetDb: string;      // PostgreSQL connection string
  mediaPath: string;     // Path to verify media files
  options: {
    migrateHistory: boolean;
    migrateBlocklist: boolean;
    verifyFiles: boolean;
    dryRun: boolean;
  };
}

async function migrateSonarrV5(config: SonarrV5Migration): Promise<MigrationResult> {
  const sourceDb = new Database(config.sourceDb);
  const targetDb = await connectPostgres(config.targetDb);

  const result: MigrationResult = {
    series: { migrated: 0, failed: 0, skipped: 0 },
    episodes: { migrated: 0, failed: 0, skipped: 0 },
    episodeFiles: { migrated: 0, failed: 0, skipped: 0 },
    history: { migrated: 0, failed: 0, skipped: 0 },
    qualityProfiles: { migrated: 0, failed: 0, skipped: 0 },
    customFormats: { migrated: 0, failed: 0, skipped: 0 },
    indexers: { migrated: 0, failed: 0, skipped: 0 },
    downloadClients: { migrated: 0, failed: 0, skipped: 0 },
    errors: [],
  };

  try {
    // 1. Migrate quality profiles first (dependencies)
    await migrateQualityProfiles(sourceDb, targetDb, result);

    // 2. Migrate custom formats
    await migrateCustomFormats(sourceDb, targetDb, result);

    // 3. Migrate root folders
    await migrateRootFolders(sourceDb, targetDb, result);

    // 4. Migrate tags
    await migrateTags(sourceDb, targetDb, result);

    // 5. Migrate series
    await migrateSeries(sourceDb, targetDb, config, result);

    // 6. Migrate episodes
    await migrateEpisodes(sourceDb, targetDb, config, result);

    // 7. Migrate episode files
    await migrateEpisodeFiles(sourceDb, targetDb, config, result);

    // 8. Migrate indexers
    await migrateIndexers(sourceDb, targetDb, result);

    // 9. Migrate download clients
    await migrateDownloadClients(sourceDb, targetDb, result);

    // 10. Migrate history (optional)
    if (config.options.migrateHistory) {
      await migrateHistory(sourceDb, targetDb, result);
    }

    // 11. Migrate blocklist (optional)
    if (config.options.migrateBlocklist) {
      await migrateBlocklist(sourceDb, targetDb, result);
    }

  } finally {
    sourceDb.close();
    await targetDb.end();
  }

  return result;
}
```

### Series Migration

```typescript
// Migrate series from Sonarr

async function migrateSeries(
  source: Database,
  target: PostgresClient,
  config: SonarrV5Migration,
  result: MigrationResult
): Promise<void> {
  const series = source.prepare(`
    SELECT
      Id, TvdbId, TmdbId, ImdbId,
      Title, SortTitle, CleanTitle,
      Status, SeriesType,
      Path, RootFolderPath,
      Monitored, MonitorNewItems,
      QualityProfileId,
      SeasonFolder, UseSceneNumbering,
      Overview, Network, AirTime, Runtime,
      Year, FirstAired, LastAired,
      Ratings, Certification, Genres,
      Tags, Images,
      Added, LastInfoSync
    FROM Series
    WHERE Id NOT IN (SELECT SeriesId FROM SeriesMetadata WHERE Deleted = 1)
  `).all();

  for (const row of series) {
    try {
      // Map quality profile
      const qualityProfileId = await mapQualityProfile(row.QualityProfileId, target);

      // Verify path exists (optional)
      if (config.options.verifyFiles && !fs.existsSync(row.Path)) {
        result.series.skipped++;
        result.errors.push({
          type: 'series',
          id: row.Id,
          message: `Path not found: ${row.Path}`,
        });
        continue;
      }

      // Map status
      const status = mapSeriesStatus(row.Status);

      // Map series type
      const seriesType = mapSeriesType(row.SeriesType);

      // Insert into idkarr
      await target.query(`
        INSERT INTO series (
          tvdb_id, tmdb_id, imdb_id,
          title, sort_title, clean_title,
          status, series_type,
          path, root_folder_path,
          monitored, monitor_new_items,
          quality_profile_id,
          season_folder, use_scene_numbering,
          overview, network, air_time, runtime,
          year, first_aired, last_aired,
          ratings, certification, genres,
          tags, images,
          added, last_info_sync,
          instance_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
        ON CONFLICT (tvdb_id, instance_id) DO NOTHING
      `, [
        row.TvdbId, row.TmdbId, row.ImdbId,
        row.Title, row.SortTitle, row.CleanTitle,
        status, seriesType,
        row.Path, row.RootFolderPath,
        Boolean(row.Monitored), row.MonitorNewItems || 'all',
        qualityProfileId,
        Boolean(row.SeasonFolder), Boolean(row.UseSceneNumbering),
        row.Overview, row.Network, row.AirTime, row.Runtime,
        row.Year, row.FirstAired, row.LastAired,
        JSON.parse(row.Ratings || '{}'),
        row.Certification,
        JSON.parse(row.Genres || '[]'),
        JSON.parse(row.Tags || '[]'),
        JSON.parse(row.Images || '[]'),
        row.Added, row.LastInfoSync,
        1, // Default instance ID
      ]);

      result.series.migrated++;
    } catch (error) {
      result.series.failed++;
      result.errors.push({
        type: 'series',
        id: row.Id,
        message: error.message,
      });
    }
  }
}
```

### Quality Profile Mapping

```typescript
// Map Sonarr quality profiles to idkarr

async function migrateQualityProfiles(
  source: Database,
  target: PostgresClient,
  result: MigrationResult
): Promise<Map<number, number>> {
  const mapping = new Map<number, number>();

  const profiles = source.prepare(`
    SELECT
      Id, Name, UpgradeAllowed, Cutoff,
      Items, MinFormatScore, CutoffFormatScore,
      FormatItems
    FROM QualityProfiles
  `).all();

  for (const profile of profiles) {
    try {
      // Parse quality items
      const items = JSON.parse(profile.Items || '[]');
      const formatItems = JSON.parse(profile.FormatItems || '[]');

      // Map quality IDs
      const mappedItems = items.map((item: any) => ({
        ...item,
        quality: item.quality ? {
          ...item.quality,
          id: mapQualityId(item.quality.id),
        } : undefined,
      }));

      // Insert into idkarr
      const inserted = await target.query(`
        INSERT INTO quality_profile (
          name, upgrade_allowed, cutoff,
          items, min_format_score, cutoff_format_score,
          format_items
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        profile.Name,
        Boolean(profile.UpgradeAllowed),
        mapQualityId(profile.Cutoff),
        JSON.stringify(mappedItems),
        profile.MinFormatScore || 0,
        profile.CutoffFormatScore || 0,
        JSON.stringify(formatItems),
      ]);

      mapping.set(profile.Id, inserted.rows[0].id);
      result.qualityProfiles.migrated++;
    } catch (error) {
      result.qualityProfiles.failed++;
      result.errors.push({
        type: 'qualityProfile',
        id: profile.Id,
        message: error.message,
      });
    }
  }

  return mapping;
}

// Quality ID mapping (Sonarr → idkarr)
function mapQualityId(sonarrId: number): number {
  const qualityMap: Record<number, number> = {
    0: 0,   // Unknown
    1: 1,   // SDTV
    2: 2,   // DVD
    3: 3,   // WEBDL-480p
    4: 4,   // HDTV-720p → HDTV-720p
    5: 6,   // WEBDL-720p
    6: 5,   // Bluray-720p
    7: 8,   // WEBDL-1080p → WEBDL-1080p
    8: 9,   // Bluray-1080p
    9: 10,  // HDTV-1080p
    10: 12, // Raw-HD
    14: 11, // WEBDL-2160p
    15: 13, // HDTV-2160p
    16: 14, // Bluray-2160p
    17: 15, // Bluray-2160p Remux
    18: 7,  // WEBDL-1080p (duplicate)
    19: 16, // Bluray-1080p Remux
  };

  return qualityMap[sonarrId] ?? 0;
}
```

---

## Radarr Migration

### Radarr Migration Process

```typescript
// migration/radarr.ts

async function migrateRadarr(config: RadarrMigration): Promise<MigrationResult> {
  const sourceDb = new Database(config.sourceDb);
  const targetDb = await connectPostgres(config.targetDb);

  const result: MigrationResult = {
    movies: { migrated: 0, failed: 0, skipped: 0 },
    movieFiles: { migrated: 0, failed: 0, skipped: 0 },
    history: { migrated: 0, failed: 0, skipped: 0 },
    errors: [],
  };

  try {
    // 1. Migrate quality profiles
    await migrateRadarrQualityProfiles(sourceDb, targetDb, result);

    // 2. Migrate custom formats
    await migrateRadarrCustomFormats(sourceDb, targetDb, result);

    // 3. Migrate root folders
    await migrateRadarrRootFolders(sourceDb, targetDb, result);

    // 4. Migrate movies
    await migrateMovies(sourceDb, targetDb, config, result);

    // 5. Migrate movie files
    await migrateMovieFiles(sourceDb, targetDb, config, result);

    // 6. Migrate indexers
    await migrateRadarrIndexers(sourceDb, targetDb, result);

    // 7. Migrate download clients
    await migrateRadarrDownloadClients(sourceDb, targetDb, result);

    // 8. Migrate history
    if (config.options.migrateHistory) {
      await migrateRadarrHistory(sourceDb, targetDb, result);
    }

  } finally {
    sourceDb.close();
    await targetDb.end();
  }

  return result;
}

async function migrateMovies(
  source: Database,
  target: PostgresClient,
  config: RadarrMigration,
  result: MigrationResult
): Promise<void> {
  const movies = source.prepare(`
    SELECT
      Id, TmdbId, ImdbId,
      Title, SortTitle, CleanTitle, OriginalTitle,
      Status, MinimumAvailability,
      Path, RootFolderPath,
      Monitored, QualityProfileId,
      Year, InCinemas, PhysicalRelease, DigitalRelease,
      Overview, Studio, Runtime,
      Ratings, Certification, Genres,
      Tags, Images, Collection,
      YouTubeTrailerId, Website,
      Added, LastInfoSync, HasFile
    FROM Movies
  `).all();

  for (const row of movies) {
    try {
      const qualityProfileId = await mapQualityProfile(row.QualityProfileId, target);

      await target.query(`
        INSERT INTO movie (
          tmdb_id, imdb_id,
          title, sort_title, clean_title, original_title,
          status, minimum_availability,
          path, root_folder_path,
          monitored, quality_profile_id,
          year, in_cinemas, physical_release, digital_release,
          overview, studio, runtime,
          ratings, certification, genres,
          tags, images, collection,
          youtube_trailer_id, website,
          added, last_info_sync, has_file,
          instance_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
        ON CONFLICT (tmdb_id, instance_id) DO NOTHING
      `, [
        row.TmdbId, row.ImdbId,
        row.Title, row.SortTitle, row.CleanTitle, row.OriginalTitle,
        mapMovieStatus(row.Status), row.MinimumAvailability,
        row.Path, row.RootFolderPath,
        Boolean(row.Monitored), qualityProfileId,
        row.Year, row.InCinemas, row.PhysicalRelease, row.DigitalRelease,
        row.Overview, row.Studio, row.Runtime,
        JSON.parse(row.Ratings || '{}'),
        row.Certification,
        JSON.parse(row.Genres || '[]'),
        JSON.parse(row.Tags || '[]'),
        JSON.parse(row.Images || '[]'),
        JSON.parse(row.Collection || 'null'),
        row.YouTubeTrailerId, row.Website,
        row.Added, row.LastInfoSync, Boolean(row.HasFile),
        2, // Movies instance ID
      ]);

      result.movies.migrated++;
    } catch (error) {
      result.movies.failed++;
      result.errors.push({
        type: 'movie',
        id: row.Id,
        message: error.message,
      });
    }
  }
}
```

---

## Overseerr Migration

### User Migration

```typescript
// migration/overseerr.ts

async function migrateOverseerr(config: OverseerrMigration): Promise<MigrationResult> {
  const sourceDb = new Database(config.sourceDb);
  const targetDb = await connectPostgres(config.targetDb);

  const result: MigrationResult = {
    users: { migrated: 0, failed: 0, skipped: 0 },
    requests: { migrated: 0, failed: 0, skipped: 0 },
    watchlists: { migrated: 0, failed: 0, skipped: 0 },
    errors: [],
  };

  try {
    // 1. Migrate users
    const userMapping = await migrateOverseerrUsers(sourceDb, targetDb, result);

    // 2. Migrate requests
    await migrateRequests(sourceDb, targetDb, userMapping, result);

    // 3. Migrate watchlists
    await migrateWatchlists(sourceDb, targetDb, userMapping, result);

  } finally {
    sourceDb.close();
    await targetDb.end();
  }

  return result;
}

async function migrateOverseerrUsers(
  source: Database,
  target: PostgresClient,
  result: MigrationResult
): Promise<Map<number, string>> {
  const userMapping = new Map<number, string>();

  const users = source.prepare(`
    SELECT
      id, email, username, plexId, plexToken,
      permissions, avatar, createdAt, updatedAt,
      settings
    FROM user
  `).all();

  for (const user of users) {
    try {
      // Check if user exists by email
      const existing = await target.query(
        'SELECT id FROM "user" WHERE email = $1',
        [user.email]
      );

      if (existing.rows.length > 0) {
        userMapping.set(user.id, existing.rows[0].id);
        result.users.skipped++;
        continue;
      }

      // Map Overseerr permissions to idkarr roles
      const roles = mapOverseerrPermissions(user.permissions);

      // Parse settings
      const settings = JSON.parse(user.settings || '{}');

      // Create user
      const inserted = await target.query(`
        INSERT INTO "user" (
          username, email,
          password_hash,
          status, email_verified,
          plex_id, plex_token,
          avatar,
          preferences,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        user.username || user.email.split('@')[0],
        user.email,
        '', // No password - will need to be set via reset
        'active',
        true, // Assume verified since they had Overseerr account
        user.plexId,
        user.plexToken, // Note: Should be encrypted
        user.avatar,
        JSON.stringify({
          language: settings.locale || 'en',
          theme: 'dark',
        }),
        user.createdAt,
        user.updatedAt,
      ]);

      const userId = inserted.rows[0].id;
      userMapping.set(user.id, userId);

      // Assign roles
      for (const role of roles) {
        await target.query(`
          INSERT INTO user_role (user_id, role_id)
          SELECT $1, id FROM role WHERE name = $2
          ON CONFLICT DO NOTHING
        `, [userId, role]);
      }

      result.users.migrated++;
    } catch (error) {
      result.users.failed++;
      result.errors.push({
        type: 'user',
        id: user.id,
        message: error.message,
      });
    }
  }

  return userMapping;
}

function mapOverseerrPermissions(permissions: number): string[] {
  // Overseerr permission flags
  const ADMIN = 2;
  const MANAGE_USERS = 8;
  const MANAGE_REQUESTS = 16;
  const REQUEST = 32;
  const AUTO_APPROVE = 128;

  const roles: string[] = [];

  if (permissions & ADMIN) {
    roles.push('admin');
  } else if (permissions & MANAGE_USERS || permissions & MANAGE_REQUESTS) {
    roles.push('moderator');
  } else if (permissions & REQUEST) {
    roles.push('user');
  } else {
    roles.push('viewer');
  }

  return roles;
}
```

### Request Migration

```typescript
async function migrateRequests(
  source: Database,
  target: PostgresClient,
  userMapping: Map<number, string>,
  result: MigrationResult
): Promise<void> {
  const requests = source.prepare(`
    SELECT
      id, status, type,
      media_tmdbId, media_tvdbId, media_imdbId,
      media_type, media_status,
      requestedBy_id, modifiedBy_id,
      createdAt, updatedAt,
      seasons
    FROM media_request
  `).all();

  for (const request of requests) {
    try {
      const requestedById = userMapping.get(request.requestedBy_id);
      if (!requestedById) {
        result.requests.skipped++;
        continue;
      }

      // Map status
      const status = mapRequestStatus(request.status);

      // Map content type
      const contentType = request.media_type === 'tv' ? 'series' : 'movie';

      await target.query(`
        INSERT INTO request (
          requested_by_id,
          content_type,
          tvdb_id, tmdb_id, imdb_id,
          title, year,
          seasons,
          status,
          requested_at, modified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        requestedById,
        contentType,
        request.media_tvdbId,
        request.media_tmdbId,
        request.media_imdbId,
        '', // Title will be fetched
        null, // Year will be fetched
        JSON.parse(request.seasons || 'null'),
        status,
        request.createdAt,
        request.updatedAt,
      ]);

      result.requests.migrated++;
    } catch (error) {
      result.requests.failed++;
      result.errors.push({
        type: 'request',
        id: request.id,
        message: error.message,
      });
    }
  }
}

function mapRequestStatus(overseerrStatus: number): string {
  const statusMap: Record<number, string> = {
    1: 'pending',
    2: 'approved',
    3: 'denied',
    4: 'available',
    5: 'partial',
  };
  return statusMap[overseerrStatus] || 'pending';
}
```

---

## Database Migration

### SQLite to PostgreSQL

```typescript
// Generic SQLite to PostgreSQL migration

interface TableMapping {
  sourceTable: string;
  targetTable: string;
  columns: ColumnMapping[];
  transform?: (row: any) => any;
}

interface ColumnMapping {
  source: string;
  target: string;
  type?: 'string' | 'number' | 'boolean' | 'json' | 'timestamp';
  transform?: (value: any) => any;
}

async function migrateTable(
  source: Database,
  target: PostgresClient,
  mapping: TableMapping
): Promise<{ migrated: number; failed: number }> {
  const rows = source.prepare(`SELECT * FROM ${mapping.sourceTable}`).all();

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // Apply row transform if provided
      const transformedRow = mapping.transform ? mapping.transform(row) : row;

      // Build insert query
      const columns: string[] = [];
      const placeholders: string[] = [];
      const values: any[] = [];

      for (let i = 0; i < mapping.columns.length; i++) {
        const col = mapping.columns[i];
        let value = transformedRow[col.source];

        // Apply column transform
        if (col.transform) {
          value = col.transform(value);
        }

        // Type conversion
        switch (col.type) {
          case 'boolean':
            value = Boolean(value);
            break;
          case 'json':
            value = typeof value === 'string' ? JSON.parse(value) : value;
            break;
          case 'timestamp':
            value = value ? new Date(value) : null;
            break;
        }

        columns.push(col.target);
        placeholders.push(`$${i + 1}`);
        values.push(value);
      }

      await target.query(`
        INSERT INTO ${mapping.targetTable} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT DO NOTHING
      `, values);

      migrated++;
    } catch (error) {
      failed++;
      console.error(`Failed to migrate row from ${mapping.sourceTable}:`, error);
    }
  }

  return { migrated, failed };
}
```

### Schema Differences

```typescript
// Handle schema differences between Sonarr and idkarr

const schemaDifferences = {
  // Column renames
  renames: {
    'Series.SeriesId': 'series.id',
    'Series.TvDbId': 'series.tvdb_id',
    'Series.TvMazeId': 'series.tv_maze_id',
    'Episodes.EpisodeId': 'episode.id',
    'Episodes.SeriesId': 'episode.series_id',
  },

  // Type changes
  typeChanges: {
    'series.monitored': 'boolean', // SQLite INTEGER → PostgreSQL BOOLEAN
    'series.season_folder': 'boolean',
    'series.tags': 'jsonb',        // SQLite TEXT → PostgreSQL JSONB
    'series.images': 'jsonb',
  },

  // New columns (with defaults)
  newColumns: {
    'series.instance_id': 1,
    'series.deleted_at': null,
    'episode.grabbed': false,
  },

  // Removed columns (data migration required)
  removedColumns: [
    'Series.Path', // Now computed from root_folder + series folder
  ],
};
```

---

## Configuration Migration

### Settings Migration

```typescript
// Migrate application settings

interface SettingsMigration {
  naming: {
    sonarr: string;  // Sonarr naming pattern
    idkarr: string;  // idkarr naming pattern
  };
  rootFolders: Array<{
    sonarrPath: string;
    idkarrPath: string;
    instanceId: number;
  }>;
}

async function migrateSettings(
  source: Database,
  target: PostgresClient
): Promise<void> {
  // Migrate naming config
  const namingConfig = source.prepare(`
    SELECT * FROM NamingConfig
  `).get();

  if (namingConfig) {
    await target.query(`
      INSERT INTO naming_config (
        content_type,
        rename_episodes,
        replace_illegal_characters,
        standard_episode_format,
        daily_episode_format,
        anime_episode_format,
        season_folder_format,
        series_folder_format
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'series',
      Boolean(namingConfig.RenameEpisodes),
      Boolean(namingConfig.ReplaceIllegalCharacters),
      convertNamingPattern(namingConfig.StandardEpisodeFormat),
      convertNamingPattern(namingConfig.DailyEpisodeFormat),
      convertNamingPattern(namingConfig.AnimeEpisodeFormat),
      convertNamingPattern(namingConfig.SeasonFolderFormat),
      convertNamingPattern(namingConfig.SeriesFolderFormat),
    ]);
  }

  // Migrate delay profiles
  const delayProfiles = source.prepare(`
    SELECT * FROM DelayProfiles
  `).all();

  for (const profile of delayProfiles) {
    await target.query(`
      INSERT INTO delay_profile (
        enable_usenet, enable_torrent,
        preferred_protocol,
        usenet_delay, torrent_delay,
        bypass_if_highest_quality,
        "order", tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      Boolean(profile.EnableUsenet),
      Boolean(profile.EnableTorrent),
      profile.PreferredProtocol?.toLowerCase() || 'usenet',
      profile.UsenetDelay || 0,
      profile.TorrentDelay || 0,
      Boolean(profile.BypassIfHighestQuality),
      profile.Order || 0,
      JSON.parse(profile.Tags || '[]'),
    ]);
  }
}

// Convert Sonarr naming patterns to idkarr format
function convertNamingPattern(pattern: string): string {
  if (!pattern) return pattern;

  // Most patterns are compatible, but some need conversion
  const conversions: Record<string, string> = {
    '{Series Title}': '{Series Title}',
    '{Series CleanTitle}': '{Series CleanTitle}',
    '{season}': '{season}',
    '{season:00}': '{season:00}',
    '{episode}': '{episode}',
    '{episode:00}': '{episode:00}',
    '{Episode Title}': '{Episode Title}',
    '{Quality Full}': '{Quality Full}',
    '{Quality Title}': '{Quality Title}',
    '{MediaInfo Video}': '{MediaInfo Video}',
    '{MediaInfo Audio}': '{MediaInfo Audio}',
    '{Release Group}': '{Release Group}',
  };

  let converted = pattern;
  for (const [from, to] of Object.entries(conversions)) {
    converted = converted.replace(new RegExp(from, 'g'), to);
  }

  return converted;
}
```

### Indexer Migration

```typescript
// Migrate indexer configurations

async function migrateIndexers(
  source: Database,
  target: PostgresClient,
  result: MigrationResult
): Promise<void> {
  const indexers = source.prepare(`
    SELECT
      Id, Name, Implementation, ConfigContract,
      Settings, EnableRss, EnableInteractiveSearch,
      EnableAutomaticSearch, Priority, Tags
    FROM Indexers
  `).all();

  for (const indexer of indexers) {
    try {
      // Parse settings
      const settings = JSON.parse(indexer.Settings || '{}');

      // Map implementation names
      const implementation = mapIndexerImplementation(indexer.Implementation);

      // Encrypt API key if present
      if (settings.apiKey) {
        settings.apiKey = await encrypt(settings.apiKey);
      }

      await target.query(`
        INSERT INTO indexer (
          name, implementation, config_contract,
          protocol, enabled, priority,
          tags, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        indexer.Name,
        implementation,
        indexer.ConfigContract,
        implementation.includes('Torznab') ? 'torrent' : 'usenet',
        Boolean(indexer.EnableAutomaticSearch || indexer.EnableRss),
        indexer.Priority || 25,
        JSON.parse(indexer.Tags || '[]'),
        settings,
      ]);

      result.indexers.migrated++;
    } catch (error) {
      result.indexers.failed++;
      result.errors.push({
        type: 'indexer',
        id: indexer.Id,
        message: error.message,
      });
    }
  }
}

function mapIndexerImplementation(sonarrImpl: string): string {
  const implMap: Record<string, string> = {
    'Newznab': 'Newznab',
    'Torznab': 'Torznab',
    'NzbDrone.Core.Indexers.Newznab.Newznab': 'Newznab',
    'NzbDrone.Core.Indexers.Torznab.Torznab': 'Torznab',
  };
  return implMap[sonarrImpl] || sonarrImpl;
}
```

---

## Parallel Running

### Running Both Systems

```yaml
# docker-compose.parallel.yml

version: '3.9'

services:
  # Existing Sonarr (read-only during migration)
  sonarr:
    image: linuxserver/sonarr:latest
    environment:
      - PUID=1000
      - PGID=1000
    volumes:
      - ./sonarr-config:/config
      - ./media:/media:ro  # Read-only during migration
    ports:
      - "8989:8989"

  # New idkarr instance
  idkarr:
    image: idkarr:latest
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./idkarr-config:/config
      - ./media:/media
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  # Shared database for idkarr
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7

volumes:
  postgres_data:
```

### Sync Strategy

```typescript
// Keep both systems in sync during transition

interface SyncConfig {
  sonarrUrl: string;
  sonarrApiKey: string;
  idkarrUrl: string;
  idkarrApiKey: string;
  direction: 'sonarr-to-idkarr' | 'bidirectional';
}

class ParallelSync {
  constructor(private config: SyncConfig) {}

  async syncNewSeries(): Promise<void> {
    // Get series added to Sonarr since last sync
    const sonarrSeries = await this.getSonarrSeriesSince(this.lastSync);

    for (const series of sonarrSeries) {
      // Check if exists in idkarr
      const exists = await this.checkIdkarrSeries(series.tvdbId);

      if (!exists) {
        await this.addToIdkarr(series);
      }
    }
  }

  async syncHistory(): Promise<void> {
    // Sync download history from Sonarr to idkarr
    const history = await this.getSonarrHistorySince(this.lastSync);

    for (const event of history) {
      await this.addIdkarrHistory(event);
    }
  }
}
```

---

## Rollback Procedures

### Rollback Plan

```markdown
## Rollback Checklist

### If Migration Fails

1. [ ] Stop idkarr services
2. [ ] Verify Sonarr/Radarr backups are intact
3. [ ] Restore Sonarr database from backup
4. [ ] Restart Sonarr/Radarr services
5. [ ] Verify all series/movies are present
6. [ ] Verify download clients are connected
7. [ ] Resume RSS sync and monitoring
8. [ ] Document failure reason

### Partial Rollback (Keep Some Data)

1. [ ] Identify successfully migrated data
2. [ ] Export from idkarr what works
3. [ ] Restore source applications
4. [ ] Plan incremental re-migration

### Database Rollback

```bash
# Restore Sonarr database
cp /backup/sonarr.db /config/sonarr.db
docker restart sonarr

# Restore Radarr database
cp /backup/radarr.db /config/radarr.db
docker restart radarr

# Drop idkarr database (if needed)
psql -c "DROP DATABASE idkarr;"
```
```

### Validation Before Cutover

```typescript
// Validate migration before switching

async function validateMigration(
  sourceUrl: string,
  targetUrl: string
): Promise<ValidationResult> {
  const validation: ValidationResult = {
    passed: true,
    checks: [],
  };

  // Check series count
  const sourceSeries = await getSeriesCount(sourceUrl);
  const targetSeries = await getSeriesCount(targetUrl);

  validation.checks.push({
    name: 'Series Count',
    source: sourceSeries,
    target: targetSeries,
    passed: targetSeries >= sourceSeries * 0.99, // Allow 1% loss
  });

  // Check episode count
  const sourceEpisodes = await getEpisodeCount(sourceUrl);
  const targetEpisodes = await getEpisodeCount(targetUrl);

  validation.checks.push({
    name: 'Episode Count',
    source: sourceEpisodes,
    target: targetEpisodes,
    passed: targetEpisodes >= sourceEpisodes * 0.99,
  });

  // Check quality profiles
  const sourceProfiles = await getQualityProfiles(sourceUrl);
  const targetProfiles = await getQualityProfiles(targetUrl);

  validation.checks.push({
    name: 'Quality Profiles',
    source: sourceProfiles.length,
    target: targetProfiles.length,
    passed: targetProfiles.length === sourceProfiles.length,
  });

  // Overall result
  validation.passed = validation.checks.every((c) => c.passed);

  return validation;
}
```

---

## Post-Migration Verification

### Verification Checklist

```markdown
## Post-Migration Verification

### Data Integrity
- [ ] All series count matches
- [ ] All episode count matches
- [ ] All movie count matches
- [ ] All episode files are linked
- [ ] Quality profiles are correct
- [ ] Custom formats are present
- [ ] Tags are migrated

### Functionality
- [ ] RSS sync works
- [ ] Manual search works
- [ ] Automatic search works
- [ ] Download client connected
- [ ] Indexers are responding
- [ ] Notifications are working

### File System
- [ ] All media paths accessible
- [ ] File permissions correct
- [ ] Can rename files
- [ ] Can import files

### Users (if migrated)
- [ ] Users can log in
- [ ] Permissions are correct
- [ ] API keys work
- [ ] Requests are visible

### Performance
- [ ] Page load times acceptable
- [ ] Search response times acceptable
- [ ] Queue updates in real-time
```

### Automated Verification Script

```typescript
// Post-migration verification script

async function verifyMigration(): Promise<VerificationReport> {
  const report: VerificationReport = {
    timestamp: new Date(),
    status: 'passed',
    sections: [],
  };

  // 1. Database connectivity
  report.sections.push(await verifyDatabaseConnection());

  // 2. Series data
  report.sections.push(await verifySeriesData());

  // 3. Episode data
  report.sections.push(await verifyEpisodeData());

  // 4. File system access
  report.sections.push(await verifyFileSystemAccess());

  // 5. External services
  report.sections.push(await verifyExternalServices());

  // 6. Download clients
  report.sections.push(await verifyDownloadClients());

  // 7. Indexers
  report.sections.push(await verifyIndexers());

  // Overall status
  report.status = report.sections.every((s) => s.status === 'passed')
    ? 'passed'
    : report.sections.some((s) => s.status === 'failed')
    ? 'failed'
    : 'warning';

  return report;
}
```

---

*This migration guide provides a comprehensive path from existing *arr applications to idkarr. Always test migrations in a non-production environment first.*
