# Backup & Recovery Specification

> **idkarr** - Data backup and disaster recovery specification

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Database Backups](#database-backups)
4. [Configuration Backups](#configuration-backups)
5. [Media Library Backups](#media-library-backups)
6. [Automated Backups](#automated-backups)
7. [Recovery Procedures](#recovery-procedures)
8. [Disaster Recovery](#disaster-recovery)

---

## Overview

### Backup Philosophy

1. **Regular Automated Backups**: Scheduled backups without user intervention
2. **Multiple Retention Periods**: Keep daily, weekly, and monthly backups
3. **Verification**: Validate backups can be restored
4. **Multiple Destinations**: Support local and remote backup targets
5. **Encryption**: Protect sensitive data in backups

### Backup Scope

| Component | Criticality | Frequency | Retention |
|-----------|-------------|-----------|-----------|
| Database | Critical | Daily | 30 days |
| Configuration | Critical | On change | 14 days |
| API Keys/Secrets | Critical | On change | 7 days |
| Custom Scripts | High | Weekly | 30 days |
| Metadata Cache | Low | None | Rebuild |

### Backup Configuration

```typescript
interface BackupConfig {
  // Schedule
  enabled: boolean;
  schedule: string; // Cron expression
  retentionDays: number;

  // Database
  includeDatabase: boolean;
  databaseBackupFormat: 'sql' | 'pgdump' | 'custom';

  // Configuration
  includeConfiguration: boolean;
  includeSecrets: boolean;
  encryptSecrets: boolean;

  // Storage
  localPath: string;
  remoteDestinations: RemoteDestination[];

  // Limits
  maxBackupSize: number; // bytes
  maxBackupCount: number;

  // Verification
  verifyAfterBackup: boolean;
  notifyOnFailure: boolean;
}

interface RemoteDestination {
  type: 'sftp' | 's3' | 'gcs' | 'azure' | 'webdav';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
}
```

---

## Backup Strategy

### 3-2-1 Rule Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    3-2-1 Backup Rule                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  3 Copies of Data                                           │
│  ├── Production Database (Primary)                          │
│  ├── Local Backup (Secondary)                               │
│  └── Remote Backup (Tertiary)                               │
│                                                             │
│  2 Different Media Types                                    │
│  ├── Local SSD/HDD Storage                                  │
│  └── Cloud Object Storage (S3/GCS)                          │
│                                                             │
│  1 Offsite Copy                                             │
│  └── Remote cloud storage in different region               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Retention Policy

```typescript
interface RetentionPolicy {
  // Keep all backups from last N days
  dailyRetention: number; // Default: 7

  // Keep one backup per week for N weeks
  weeklyRetention: number; // Default: 4

  // Keep one backup per month for N months
  monthlyRetention: number; // Default: 12

  // Keep one backup per year for N years
  yearlyRetention: number; // Default: 3
}

class BackupRetentionManager {
  async applyRetention(backups: BackupInfo[]): Promise<void> {
    const now = new Date();
    const toDelete: BackupInfo[] = [];

    // Sort by date descending
    const sorted = backups.sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    // Track which periods are covered
    const keptDays = new Set<string>();
    const keptWeeks = new Set<string>();
    const keptMonths = new Set<string>();
    const keptYears = new Set<string>();

    for (const backup of sorted) {
      const age = this.getDaysBetween(backup.createdAt, now);
      const dayKey = this.formatDate(backup.createdAt, 'yyyy-MM-dd');
      const weekKey = this.formatDate(backup.createdAt, 'yyyy-ww');
      const monthKey = this.formatDate(backup.createdAt, 'yyyy-MM');
      const yearKey = this.formatDate(backup.createdAt, 'yyyy');

      let shouldKeep = false;

      // Daily retention
      if (age <= this.policy.dailyRetention) {
        if (!keptDays.has(dayKey)) {
          keptDays.add(dayKey);
          shouldKeep = true;
        }
      }

      // Weekly retention
      if (age <= this.policy.weeklyRetention * 7) {
        if (!keptWeeks.has(weekKey)) {
          keptWeeks.add(weekKey);
          shouldKeep = true;
        }
      }

      // Monthly retention
      if (age <= this.policy.monthlyRetention * 30) {
        if (!keptMonths.has(monthKey)) {
          keptMonths.add(monthKey);
          shouldKeep = true;
        }
      }

      // Yearly retention
      if (age <= this.policy.yearlyRetention * 365) {
        if (!keptYears.has(yearKey)) {
          keptYears.add(yearKey);
          shouldKeep = true;
        }
      }

      if (!shouldKeep) {
        toDelete.push(backup);
      }
    }

    // Delete old backups
    for (const backup of toDelete) {
      await this.deleteBackup(backup);
    }
  }
}
```

---

## Database Backups

### PostgreSQL Backup

```typescript
interface DatabaseBackupConfig {
  // Connection
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;

  // Backup options
  format: 'plain' | 'custom' | 'directory' | 'tar';
  compression: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  jobs: number; // Parallel jobs for directory format

  // Include/exclude
  excludeTables?: string[];
  includeSchemas?: string[];
}

class PostgresBackupService {
  async createBackup(config: DatabaseBackupConfig): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `idkarr-db-${timestamp}`;

    const args: string[] = [
      '-h', config.host,
      '-p', config.port.toString(),
      '-U', config.username,
      '-d', config.database,
      '-F', this.getFormatFlag(config.format),
      '-Z', config.compression.toString(),
    ];

    // Add parallel jobs for directory format
    if (config.format === 'directory' && config.jobs > 1) {
      args.push('-j', config.jobs.toString());
    }

    // Add excluded tables
    for (const table of config.excludeTables ?? []) {
      args.push('--exclude-table', table);
    }

    // Set output file/directory
    const extension = this.getExtension(config.format);
    const outputPath = `${this.backupDir}/${filename}${extension}`;
    args.push('-f', outputPath);

    // Execute pg_dump
    const env = { PGPASSWORD: config.password };
    const result = await this.execute('pg_dump', args, env);

    if (result.exitCode !== 0) {
      throw new BackupError(`pg_dump failed: ${result.stderr}`);
    }

    // Get backup size
    const stats = await Bun.file(outputPath).stat();

    return {
      filename: `${filename}${extension}`,
      path: outputPath,
      size: stats.size,
      createdAt: new Date(),
      type: 'database',
      format: config.format,
    };
  }

  async verifyBackup(backupPath: string): Promise<VerifyResult> {
    // Use pg_restore to verify custom format backups
    if (backupPath.endsWith('.dump')) {
      const result = await this.execute('pg_restore', [
        '--list',
        backupPath,
      ]);

      return {
        valid: result.exitCode === 0,
        message: result.exitCode === 0
          ? 'Backup verified successfully'
          : `Verification failed: ${result.stderr}`,
      };
    }

    // For plain SQL, check file integrity
    const content = await Bun.file(backupPath).text();
    const hasCommit = content.includes('COMMIT');
    const hasEOF = content.trim().endsWith('--');

    return {
      valid: hasCommit,
      message: hasCommit
        ? 'SQL backup appears complete'
        : 'SQL backup may be incomplete',
    };
  }

  private getFormatFlag(format: string): string {
    const map: Record<string, string> = {
      plain: 'p',
      custom: 'c',
      directory: 'd',
      tar: 't',
    };
    return map[format];
  }

  private getExtension(format: string): string {
    const map: Record<string, string> = {
      plain: '.sql',
      custom: '.dump',
      directory: '',
      tar: '.tar',
    };
    return map[format];
  }
}
```

### Point-in-Time Recovery

```typescript
interface WALArchiveConfig {
  enabled: boolean;
  archiveCommand: string;
  archiveDir: string;
  walLevel: 'minimal' | 'replica' | 'logical';
}

class PointInTimeRecovery {
  /**
   * Configure PostgreSQL for WAL archiving
   */
  async configureWALArchiving(config: WALArchiveConfig): Promise<void> {
    const pgConfig = `
# WAL Archiving for Point-in-Time Recovery
wal_level = ${config.walLevel}
archive_mode = on
archive_command = '${config.archiveCommand}'
archive_timeout = 60
    `;

    await Bun.write(
      '/etc/postgresql/conf.d/wal_archive.conf',
      pgConfig
    );
  }

  /**
   * Restore to specific point in time
   */
  async restoreToPointInTime(
    baseBackup: string,
    targetTime: Date,
    walArchiveDir: string
  ): Promise<void> {
    // Stop the database
    await this.execute('pg_ctl', ['stop', '-D', this.dataDir]);

    // Clear existing data
    await this.clearDataDir();

    // Restore base backup
    await this.execute('pg_restore', [
      '-d', 'postgres',
      '-C',
      baseBackup,
    ]);

    // Create recovery configuration
    const recoveryConf = `
restore_command = 'cp ${walArchiveDir}/%f %p'
recovery_target_time = '${targetTime.toISOString()}'
recovery_target_action = 'promote'
    `;

    await Bun.write(`${this.dataDir}/recovery.signal`, '');
    await Bun.write(`${this.dataDir}/postgresql.auto.conf`, recoveryConf);

    // Start the database (will replay WAL)
    await this.execute('pg_ctl', ['start', '-D', this.dataDir]);
  }
}
```

---

## Configuration Backups

### Configuration Export

```typescript
interface ConfigBackup {
  version: string;
  timestamp: string;
  configuration: {
    general: GeneralConfig;
    mediaManagement: MediaManagementConfig;
    profiles: QualityProfile[];
    customFormats: CustomFormat[];
    indexers: IndexerConfigExport[];
    downloadClients: DownloadClientConfigExport[];
    notifications: NotificationConfigExport[];
    metadata: MetadataConfig;
    ui: UIConfig;
  };
  // Secrets stored separately
  secrets?: EncryptedSecrets;
}

class ConfigurationBackupService {
  async exportConfiguration(
    includeSecrets: boolean = false
  ): Promise<ConfigBackup> {
    const [
      general,
      mediaManagement,
      profiles,
      customFormats,
      indexers,
      downloadClients,
      notifications,
      metadata,
      ui,
    ] = await Promise.all([
      this.configService.get('general'),
      this.configService.get('mediaManagement'),
      this.profileService.getAll(),
      this.customFormatService.getAll(),
      this.indexerService.getAll(),
      this.downloadClientService.getAll(),
      this.notificationService.getAll(),
      this.configService.get('metadata'),
      this.configService.get('ui'),
    ]);

    const backup: ConfigBackup = {
      version: this.appVersion,
      timestamp: new Date().toISOString(),
      configuration: {
        general,
        mediaManagement,
        profiles,
        customFormats,
        indexers: this.sanitizeIndexers(indexers),
        downloadClients: this.sanitizeDownloadClients(downloadClients),
        notifications: this.sanitizeNotifications(notifications),
        metadata,
        ui,
      },
    };

    if (includeSecrets) {
      backup.secrets = await this.exportSecrets();
    }

    return backup;
  }

  private sanitizeIndexers(indexers: Indexer[]): IndexerConfigExport[] {
    return indexers.map(i => ({
      id: i.id,
      name: i.name,
      implementation: i.implementation,
      configContract: i.configContract,
      settings: this.redactSecrets(i.settings),
      enableRss: i.enableRss,
      enableAutomaticSearch: i.enableAutomaticSearch,
      enableInteractiveSearch: i.enableInteractiveSearch,
      priority: i.priority,
      tags: i.tags,
    }));
  }

  private redactSecrets(settings: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['apiKey', 'password', 'secret', 'token', 'passkey'];
    const redacted = { ...settings };

    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = '**REDACTED**';
      }
    }

    return redacted;
  }

  private async exportSecrets(): Promise<EncryptedSecrets> {
    // Collect all secrets
    const secrets = await this.secretService.getAll();

    // Encrypt with backup key
    const encrypted = await this.encryptionService.encrypt(
      JSON.stringify(secrets),
      this.backupEncryptionKey
    );

    return {
      data: encrypted,
      algorithm: 'aes-256-gcm',
      keyHint: this.getKeyHint(),
    };
  }
}
```

### Configuration Import

```typescript
class ConfigurationImportService {
  async importConfiguration(
    backup: ConfigBackup,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: [],
      skipped: [],
      errors: [],
    };

    // Version compatibility check
    if (!this.isCompatibleVersion(backup.version)) {
      throw new ImportError(
        `Backup version ${backup.version} is not compatible with current version ${this.appVersion}`
      );
    }

    // Import in order of dependencies
    await this.importWithTransaction(async () => {
      // 1. Quality profiles (no dependencies)
      if (options.includeProfiles) {
        for (const profile of backup.configuration.profiles) {
          try {
            await this.profileService.import(profile);
            result.imported.push({ type: 'profile', name: profile.name });
          } catch (error) {
            result.errors.push({
              type: 'profile',
              name: profile.name,
              error: error.message,
            });
          }
        }
      }

      // 2. Custom formats (no dependencies)
      if (options.includeCustomFormats) {
        for (const format of backup.configuration.customFormats) {
          try {
            await this.customFormatService.import(format);
            result.imported.push({ type: 'customFormat', name: format.name });
          } catch (error) {
            result.errors.push({
              type: 'customFormat',
              name: format.name,
              error: error.message,
            });
          }
        }
      }

      // 3. Indexers (may reference tags)
      if (options.includeIndexers) {
        for (const indexer of backup.configuration.indexers) {
          // Skip if secrets are redacted and not provided
          if (this.hasRedactedSecrets(indexer) && !options.secrets?.[indexer.id]) {
            result.skipped.push({
              type: 'indexer',
              name: indexer.name,
              reason: 'Missing API key/credentials',
            });
            continue;
          }

          try {
            await this.indexerService.import(indexer, options.secrets);
            result.imported.push({ type: 'indexer', name: indexer.name });
          } catch (error) {
            result.errors.push({
              type: 'indexer',
              name: indexer.name,
              error: error.message,
            });
          }
        }
      }

      // Continue with download clients, notifications, etc.
    });

    result.success = result.errors.length === 0;
    return result;
  }

  private async importWithTransaction(fn: () => Promise<void>): Promise<void> {
    const db = this.database;

    try {
      await db.transaction(async (tx) => {
        this.setTransactionContext(tx);
        await fn();
      });
    } catch (error) {
      this.logger.error('Import failed, transaction rolled back', error);
      throw error;
    }
  }
}
```

---

## Media Library Backups

### Library Metadata Export

```typescript
interface MediaLibraryBackup {
  version: string;
  timestamp: string;
  series: SeriesExport[];
  movies: MovieExport[];
  collections: CollectionExport[];
}

interface SeriesExport {
  tvdbId: number;
  imdbId?: string;
  tmdbId?: number;
  title: string;
  path: string;
  monitored: boolean;
  qualityProfileId: number;
  seriesType: string;
  seasonFolder: boolean;
  tags: number[];
  seasons: SeasonExport[];
}

interface SeasonExport {
  seasonNumber: number;
  monitored: boolean;
}

class MediaLibraryBackupService {
  async exportLibrary(): Promise<MediaLibraryBackup> {
    const [series, movies, collections] = await Promise.all([
      this.seriesService.getAll(),
      this.movieService.getAll(),
      this.collectionService.getAll(),
    ]);

    return {
      version: this.appVersion,
      timestamp: new Date().toISOString(),
      series: series.map(this.exportSeries),
      movies: movies.map(this.exportMovie),
      collections: collections.map(this.exportCollection),
    };
  }

  private exportSeries(series: Series): SeriesExport {
    return {
      tvdbId: series.tvdbId!,
      imdbId: series.imdbId,
      tmdbId: series.tmdbId,
      title: series.title,
      path: series.path,
      monitored: series.monitored,
      qualityProfileId: series.qualityProfileId,
      seriesType: series.seriesType,
      seasonFolder: series.seasonFolder,
      tags: series.tags,
      seasons: series.seasons.map(s => ({
        seasonNumber: s.seasonNumber,
        monitored: s.monitored,
      })),
    };
  }

  async importLibrary(
    backup: MediaLibraryBackup,
    options: LibraryImportOptions
  ): Promise<LibraryImportResult> {
    const result: LibraryImportResult = {
      seriesImported: 0,
      seriesSkipped: 0,
      moviesImported: 0,
      moviesSkipped: 0,
      errors: [],
    };

    // Import series
    for (const series of backup.series) {
      try {
        // Check if already exists
        const existing = await this.seriesService.findByTvdbId(series.tvdbId);

        if (existing && !options.overwrite) {
          result.seriesSkipped++;
          continue;
        }

        // Verify path exists if required
        if (options.verifyPaths && !await this.pathExists(series.path)) {
          result.errors.push({
            type: 'series',
            title: series.title,
            error: `Path does not exist: ${series.path}`,
          });
          continue;
        }

        // Map quality profile
        const profileId = await this.mapQualityProfile(
          series.qualityProfileId,
          options.profileMapping
        );

        await this.seriesService.add({
          ...series,
          qualityProfileId: profileId,
        });

        result.seriesImported++;
      } catch (error) {
        result.errors.push({
          type: 'series',
          title: series.title,
          error: error.message,
        });
      }
    }

    // Import movies (similar process)
    // ...

    return result;
  }
}
```

---

## Automated Backups

### Backup Scheduler

```typescript
interface BackupSchedule {
  database: {
    enabled: boolean;
    cron: string; // "0 3 * * *" = 3 AM daily
  };
  configuration: {
    enabled: boolean;
    cron: string;
  };
  library: {
    enabled: boolean;
    cron: string;
  };
}

class BackupScheduler {
  private jobs: Map<string, CronJob> = new Map();

  async initialize(schedule: BackupSchedule): Promise<void> {
    // Database backup job
    if (schedule.database.enabled) {
      this.scheduleJob('database', schedule.database.cron, async () => {
        await this.performDatabaseBackup();
      });
    }

    // Configuration backup job
    if (schedule.configuration.enabled) {
      this.scheduleJob('configuration', schedule.configuration.cron, async () => {
        await this.performConfigurationBackup();
      });
    }

    // Library backup job
    if (schedule.library.enabled) {
      this.scheduleJob('library', schedule.library.cron, async () => {
        await this.performLibraryBackup();
      });
    }

    this.logger.info('Backup scheduler initialized', {
      databaseEnabled: schedule.database.enabled,
      configEnabled: schedule.configuration.enabled,
      libraryEnabled: schedule.library.enabled,
    });
  }

  private scheduleJob(name: string, cron: string, handler: () => Promise<void>): void {
    const job = new CronJob(cron, async () => {
      this.logger.info(`Starting scheduled ${name} backup`);

      try {
        await handler();
        this.logger.info(`Completed ${name} backup`);
      } catch (error) {
        this.logger.error(`Failed ${name} backup`, error);
        await this.notifyBackupFailure(name, error);
      }
    });

    job.start();
    this.jobs.set(name, job);
  }

  private async performDatabaseBackup(): Promise<void> {
    const backup = await this.databaseBackupService.createBackup(this.config);

    // Verify backup
    if (this.config.verifyAfterBackup) {
      const verification = await this.databaseBackupService.verifyBackup(backup.path);
      if (!verification.valid) {
        throw new BackupError(`Backup verification failed: ${verification.message}`);
      }
    }

    // Upload to remote destinations
    await this.uploadToRemote(backup);

    // Apply retention policy
    await this.retentionManager.applyRetention(
      await this.getBackupList('database')
    );
  }

  private async uploadToRemote(backup: BackupResult): Promise<void> {
    for (const destination of this.config.remoteDestinations) {
      if (!destination.enabled) continue;

      try {
        await this.uploadService.upload(backup, destination);
        this.logger.info(`Uploaded backup to ${destination.name}`);
      } catch (error) {
        this.logger.error(`Failed to upload to ${destination.name}`, error);
        // Continue with other destinations
      }
    }
  }
}
```

### Remote Upload Services

```typescript
interface UploadService {
  upload(backup: BackupResult, destination: RemoteDestination): Promise<void>;
  list(destination: RemoteDestination): Promise<RemoteBackupInfo[]>;
  delete(destination: RemoteDestination, filename: string): Promise<void>;
  download(destination: RemoteDestination, filename: string, localPath: string): Promise<void>;
}

class S3UploadService implements UploadService {
  async upload(backup: BackupResult, destination: RemoteDestination): Promise<void> {
    const config = destination.config as S3Config;
    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    const fileStream = Bun.file(backup.path).stream();

    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: `${config.prefix}/${backup.filename}`,
      Body: fileStream,
      StorageClass: config.storageClass ?? 'STANDARD_IA',
      ServerSideEncryption: 'AES256',
    }));
  }

  async list(destination: RemoteDestination): Promise<RemoteBackupInfo[]> {
    const config = destination.config as S3Config;
    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    const response = await client.send(new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: config.prefix,
    }));

    return (response.Contents ?? []).map(obj => ({
      filename: obj.Key!.replace(`${config.prefix}/`, ''),
      size: obj.Size!,
      lastModified: obj.LastModified!,
    }));
  }

  async download(
    destination: RemoteDestination,
    filename: string,
    localPath: string
  ): Promise<void> {
    const config = destination.config as S3Config;
    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    const response = await client.send(new GetObjectCommand({
      Bucket: config.bucket,
      Key: `${config.prefix}/${filename}`,
    }));

    const body = response.Body as Readable;
    const writer = Bun.file(localPath).writer();

    for await (const chunk of body) {
      writer.write(chunk);
    }

    await writer.end();
  }
}
```

---

## Recovery Procedures

### Full System Recovery

```typescript
interface RecoveryPlan {
  steps: RecoveryStep[];
  estimatedTime: number; // minutes
  dataLoss: string;
}

interface RecoveryStep {
  order: number;
  name: string;
  description: string;
  action: () => Promise<void>;
  rollback?: () => Promise<void>;
}

class RecoveryService {
  async createRecoveryPlan(
    scenario: RecoveryScenario
  ): Promise<RecoveryPlan> {
    switch (scenario) {
      case 'database_corruption':
        return this.databaseCorruptionPlan();

      case 'full_system_loss':
        return this.fullSystemLossPlan();

      case 'configuration_loss':
        return this.configurationLossPlan();

      case 'accidental_deletion':
        return this.accidentalDeletionPlan();

      default:
        throw new Error(`Unknown recovery scenario: ${scenario}`);
    }
  }

  private databaseCorruptionPlan(): RecoveryPlan {
    return {
      estimatedTime: 30,
      dataLoss: 'Data since last backup',
      steps: [
        {
          order: 1,
          name: 'Stop Application',
          description: 'Stop idkarr to prevent further database access',
          action: async () => {
            await this.appService.stop();
          },
        },
        {
          order: 2,
          name: 'Backup Corrupted Database',
          description: 'Create backup of corrupted database for analysis',
          action: async () => {
            await this.backupCorruptedData();
          },
        },
        {
          order: 3,
          name: 'Identify Latest Backup',
          description: 'Find most recent valid backup',
          action: async () => {
            const backups = await this.listBackups('database');
            this.selectedBackup = await this.findLatestValidBackup(backups);
          },
        },
        {
          order: 4,
          name: 'Restore Database',
          description: 'Restore database from backup',
          action: async () => {
            await this.databaseBackupService.restore(this.selectedBackup!);
          },
        },
        {
          order: 5,
          name: 'Verify Restoration',
          description: 'Run integrity checks on restored database',
          action: async () => {
            await this.verifyDatabaseIntegrity();
          },
        },
        {
          order: 6,
          name: 'Start Application',
          description: 'Start idkarr and verify functionality',
          action: async () => {
            await this.appService.start();
            await this.healthCheck();
          },
        },
      ],
    };
  }

  async executeRecovery(plan: RecoveryPlan): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      success: true,
      completedSteps: [],
      failedStep: null,
      duration: 0,
    };

    const startTime = Date.now();

    for (const step of plan.steps) {
      this.logger.info(`Executing recovery step: ${step.name}`);

      try {
        await step.action();
        result.completedSteps.push(step.name);
        this.logger.info(`Completed step: ${step.name}`);
      } catch (error) {
        this.logger.error(`Failed step: ${step.name}`, error);
        result.success = false;
        result.failedStep = step.name;
        result.error = error.message;

        // Attempt rollback of completed steps
        await this.rollback(plan.steps, result.completedSteps);
        break;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async rollback(
    steps: RecoveryStep[],
    completedSteps: string[]
  ): Promise<void> {
    // Rollback in reverse order
    const stepsToRollback = steps
      .filter(s => completedSteps.includes(s.name) && s.rollback)
      .reverse();

    for (const step of stepsToRollback) {
      try {
        this.logger.info(`Rolling back step: ${step.name}`);
        await step.rollback!();
      } catch (error) {
        this.logger.error(`Rollback failed for step: ${step.name}`, error);
      }
    }
  }
}
```

### Database Restore

```typescript
class DatabaseRestoreService {
  async restore(backup: BackupInfo): Promise<RestoreResult> {
    // Validate backup
    const validation = await this.validateBackup(backup);
    if (!validation.valid) {
      throw new RestoreError(`Invalid backup: ${validation.message}`);
    }

    // Create restore point
    const restorePoint = await this.createRestorePoint();

    try {
      // Stop connections
      await this.terminateConnections();

      // Drop existing database
      await this.dropDatabase();

      // Restore from backup
      await this.restoreFromBackup(backup);

      // Run migrations (if schema version differs)
      await this.runMigrations();

      // Verify restoration
      const verification = await this.verifyRestoration();
      if (!verification.success) {
        throw new RestoreError(`Verification failed: ${verification.message}`);
      }

      return {
        success: true,
        restoredFrom: backup.filename,
        duration: Date.now() - restorePoint.timestamp,
      };
    } catch (error) {
      // Rollback to restore point
      this.logger.error('Restore failed, rolling back', error);
      await this.rollbackToPoint(restorePoint);
      throw error;
    }
  }

  private async restoreFromBackup(backup: BackupInfo): Promise<void> {
    const format = this.detectFormat(backup.filename);

    switch (format) {
      case 'custom':
        await this.restoreCustomFormat(backup);
        break;

      case 'plain':
        await this.restorePlainFormat(backup);
        break;

      case 'directory':
        await this.restoreDirectoryFormat(backup);
        break;

      default:
        throw new RestoreError(`Unsupported backup format: ${format}`);
    }
  }

  private async restoreCustomFormat(backup: BackupInfo): Promise<void> {
    const args = [
      '-h', this.config.host,
      '-p', this.config.port.toString(),
      '-U', this.config.username,
      '-d', this.config.database,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      '--jobs', '4',
      backup.path,
    ];

    const result = await this.execute('pg_restore', args, {
      PGPASSWORD: this.config.password,
    });

    if (result.exitCode !== 0) {
      throw new RestoreError(`pg_restore failed: ${result.stderr}`);
    }
  }
}
```

---

## Disaster Recovery

### Disaster Recovery Plan

```typescript
interface DisasterRecoveryPlan {
  // Recovery Time Objective (RTO)
  rtoMinutes: number;

  // Recovery Point Objective (RPO)
  rpoMinutes: number;

  // Recovery procedures by severity
  procedures: {
    minor: RecoveryProcedure;    // Single component failure
    major: RecoveryProcedure;    // Multiple component failure
    critical: RecoveryProcedure; // Complete system loss
  };

  // Contact information
  contacts: EmergencyContact[];

  // Runbook
  runbook: RunbookStep[];
}

interface RunbookStep {
  order: number;
  title: string;
  description: string;
  commands?: string[];
  verificationSteps: string[];
  estimatedTime: number; // minutes
}

const disasterRecoveryPlan: DisasterRecoveryPlan = {
  rtoMinutes: 60,
  rpoMinutes: 1440, // 24 hours (daily backups)

  procedures: {
    minor: {
      name: 'Single Component Recovery',
      steps: [
        'Identify failed component',
        'Check component logs for root cause',
        'Restart component if transient failure',
        'Restore component from backup if persistent failure',
        'Verify component functionality',
        'Monitor for recurrence',
      ],
    },

    major: {
      name: 'Multi-Component Recovery',
      steps: [
        'Stop all idkarr services',
        'Assess damage and identify affected components',
        'Prioritize recovery order (database → config → app)',
        'Restore database from latest backup',
        'Restore configuration from latest backup',
        'Start services in order',
        'Run health checks',
        'Verify data integrity',
        'Resume normal operations',
      ],
    },

    critical: {
      name: 'Full System Recovery',
      steps: [
        'Provision new server/infrastructure',
        'Install base OS and dependencies',
        'Install idkarr application',
        'Download latest backups from remote storage',
        'Restore database backup',
        'Restore configuration backup',
        'Restore library metadata backup',
        'Update network/DNS configuration',
        'Start application',
        'Verify all integrations',
        'Run comprehensive health checks',
        'Update monitoring systems',
        'Document incident and lessons learned',
      ],
    },
  },

  runbook: [
    {
      order: 1,
      title: 'Initial Assessment',
      description: 'Determine scope and severity of the disaster',
      verificationSteps: [
        'Check server accessibility',
        'Verify database connectivity',
        'Check filesystem integrity',
        'Review recent logs for errors',
      ],
      estimatedTime: 5,
    },
    {
      order: 2,
      title: 'Download Remote Backups',
      description: 'Retrieve latest backups from remote storage',
      commands: [
        'aws s3 cp s3://backups/idkarr/latest/ /restore/ --recursive',
        'ls -la /restore/',
      ],
      verificationSteps: [
        'Verify all expected backup files present',
        'Check file sizes match remote',
        'Validate backup checksums',
      ],
      estimatedTime: 10,
    },
    {
      order: 3,
      title: 'Restore Database',
      description: 'Restore PostgreSQL database from backup',
      commands: [
        'createdb idkarr',
        'pg_restore -d idkarr /restore/idkarr-db-latest.dump',
        'psql -d idkarr -c "SELECT count(*) FROM series;"',
      ],
      verificationSteps: [
        'Database created successfully',
        'No errors during restore',
        'Table counts match expected',
      ],
      estimatedTime: 15,
    },
    // Additional steps...
  ],
};
```

### Health Verification

```typescript
class DisasterRecoveryVerification {
  async runFullVerification(): Promise<VerificationReport> {
    const report: VerificationReport = {
      timestamp: new Date(),
      checks: [],
      passed: true,
    };

    // Database checks
    report.checks.push(await this.verifyDatabase());

    // Configuration checks
    report.checks.push(await this.verifyConfiguration());

    // Integration checks
    report.checks.push(await this.verifyIntegrations());

    // Library checks
    report.checks.push(await this.verifyLibrary());

    // Set overall status
    report.passed = report.checks.every(c => c.passed);

    return report;
  }

  private async verifyDatabase(): Promise<VerificationCheck> {
    const check: VerificationCheck = {
      name: 'Database Verification',
      passed: true,
      details: [],
    };

    try {
      // Connection test
      await this.db.execute('SELECT 1');
      check.details.push({ test: 'Connection', passed: true });

      // Table existence
      const tables = ['series', 'movie', 'episode', 'episodeFile', 'user'];
      for (const table of tables) {
        const exists = await this.tableExists(table);
        check.details.push({ test: `Table ${table}`, passed: exists });
        if (!exists) check.passed = false;
      }

      // Row counts
      const seriesCount = await this.db.select().from(series).execute();
      check.details.push({
        test: 'Series count',
        passed: true,
        value: seriesCount.length,
      });

      // Foreign key integrity
      const orphanedEpisodes = await this.findOrphanedEpisodes();
      const hasOrphans = orphanedEpisodes.length > 0;
      check.details.push({
        test: 'Foreign key integrity',
        passed: !hasOrphans,
        value: hasOrphans ? `${orphanedEpisodes.length} orphaned episodes` : 'OK',
      });
      if (hasOrphans) check.passed = false;

    } catch (error) {
      check.passed = false;
      check.error = error.message;
    }

    return check;
  }

  private async verifyIntegrations(): Promise<VerificationCheck> {
    const check: VerificationCheck = {
      name: 'Integration Verification',
      passed: true,
      details: [],
    };

    // Test each configured integration
    const indexers = await this.indexerService.getAll();
    for (const indexer of indexers) {
      if (!indexer.enabled) continue;

      try {
        const testResult = await this.indexerService.test(indexer.id);
        check.details.push({
          test: `Indexer: ${indexer.name}`,
          passed: testResult.success,
        });
        if (!testResult.success) check.passed = false;
      } catch (error) {
        check.details.push({
          test: `Indexer: ${indexer.name}`,
          passed: false,
          value: error.message,
        });
        check.passed = false;
      }
    }

    // Similar for download clients, media servers, etc.

    return check;
  }
}
```

---

## Related Documents

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Database structure
- [SECURITY.md](./SECURITY.md) - Encryption and secrets management
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment architecture
- [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md) - Health monitoring
