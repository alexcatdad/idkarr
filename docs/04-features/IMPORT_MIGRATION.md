# Import & Migration Specification

> **idkarr** - Comprehensive guide for importing existing media and migrating from other *arr applications

## Table of Contents

1. [Overview](#overview)
2. [Migration from Existing *arr Apps](#migration-from-existing-arr-apps)
3. [Supported Source Formats](#supported-source-formats)
4. [Bulk Import Flow](#bulk-import-flow)
5. [File Parsing](#file-parsing)
6. [Matching Algorithm](#matching-algorithm)
7. [Rename on Import](#rename-on-import)
8. [Folder Reorganization](#folder-reorganization)
9. [Conflict Resolution](#conflict-resolution)
10. [Progress Tracking](#progress-tracking)
11. [Rollback Considerations](#rollback-considerations)
12. [API Endpoints](#api-endpoints)

---

## Overview

### Rename on Import Philosophy

idkarr enforces a **rename-on-import** philosophy to ensure consistency across your entire media library. When media is imported into idkarr, whether from a fresh download or existing files on disk, all files are renamed to follow idkarr's standardized naming conventions.

**Core Principles:**

1. **Consistency First**: All media files follow the same naming pattern, regardless of source
2. **Media Server Compatibility**: Named files work seamlessly with Plex, Jellyfin, Emby, and other media servers
3. **Reversibility via Metadata**: Original filenames are stored in the database for reference
4. **No Exceptions**: Scene releases, P2P releases, and manually named files all get renamed

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Rename on Import Philosophy                           │
└─────────────────────────────────────────────────────────────────────────────┘

  Import Sources:                     idkarr Processing:              Output:
  ┌─────────────────┐                ┌──────────────────┐        ┌───────────────────┐
  │ Scene Releases  │──────┐         │                  │        │ Consistent Naming │
  │ NZB.Grp-NAME    │      │         │   Parse Title    │        │                   │
  └─────────────────┘      │         │        ↓         │        │ Series (2008)/    │
                           │         │  Match Metadata  │        │ └─Season 01/      │
  ┌─────────────────┐      │         │        ↓         │──────▶ │   └─S01E01.mkv   │
  │ P2P Releases    │──────┼────────▶│  Rename File     │        │                   │
  │ Show.S01E01...  │      │         │        ↓         │        │ Movie (2023)/     │
  └─────────────────┘      │         │  Move to Library │        │ └─Movie (2023).mkv│
                           │         │                  │        │                   │
  ┌─────────────────┐      │         └──────────────────┘        └───────────────────┘
  │ User Collections│──────┘
  │ My.Show.EP01... │
  └─────────────────┘
```

### Why Rename Everything?

| Benefit | Description |
|---------|-------------|
| **Media Server Metadata** | Plex/Jellyfin/Emby can reliably match files to metadata |
| **Predictable Paths** | Scripts and automation can rely on consistent file locations |
| **Duplicate Detection** | Easier to identify duplicates when all files follow same pattern |
| **Quality Organization** | Quality information embedded in filename for quick identification |
| **Multi-Edition Support** | Different editions clearly distinguished in filenames |
| **Search & Browse** | Easier to find content when browsing file system directly |

---

## Migration from Existing *arr Apps

### Copy & Point Approach

idkarr uses a **Copy & Point** migration strategy that requires no configuration export from your existing *arr applications. Simply point idkarr at your existing media folders and let it scan and import.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Copy & Point Migration                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Existing Setup:                     Migration:                   idkarr:
  ┌─────────────────┐               ┌────────────────┐           ┌────────────────┐
  │     Sonarr      │               │                │           │                │
  │  /media/tv/*    │───────────────│  Point idkarr  │           │  Unified       │
  └─────────────────┘               │  at existing   │           │  Library       │
                                    │  media folders │──────────▶│                │
  ┌─────────────────┐               │                │           │  /media/       │
  │     Radarr      │───────────────│  Scan & Match  │           │  └─library/    │
  │  /media/movies/*│               │                │           │    └─...       │
  └─────────────────┘               └────────────────┘           └────────────────┘

  No config export needed!          idkarr handles              Files renamed to
  No database migration!            all parsing                 idkarr format
```

### Migration Modes

```typescript
// types/import/migration.types.ts

export type MigrationMode =
  | 'scan-only'        // Scan and preview, no changes
  | 'import-in-place'  // Import without moving, rename only
  | 'import-and-move'  // Import and move to new root folder
  | 'copy-and-import'; // Copy files (preserve originals)

export interface MigrationConfig {
  mode: MigrationMode;
  sourcePaths: string[];
  destinationRootFolder?: string;  // Required for import-and-move

  // Content type hints
  contentTypeHint?: 'series' | 'movie' | 'anime' | 'auto';

  // Matching options
  matchingStrategy: MatchingStrategy;
  confidenceThreshold: number;  // 0-100, default 80

  // Rename options
  renameFiles: boolean;         // Default: true
  renameFolders: boolean;       // Default: true

  // Conflict handling
  conflictResolution: ConflictResolution;

  // Performance
  parallelScans: number;        // Default: 4
  batchSize: number;            // Default: 100
}

export interface MatchingStrategy {
  useTitleMatching: boolean;    // Default: true
  useYearDisambiguation: boolean; // Default: true
  useFuzzyMatching: boolean;    // Default: true
  useAliasMatching: boolean;    // Default: true
  useExternalIds: boolean;      // Default: true (TVDB, TMDB, IMDB)
  maxFuzzyDistance: number;     // Default: 3 (Levenshtein distance)
}
```

### What Gets Migrated

| Source | What idkarr Extracts |
|--------|---------------------|
| **Existing Files** | Media files, quality info, release group, edition |
| **Folder Structure** | Series/movie identification, season organization |
| **File Metadata** | Resolution, codec, audio from MediaInfo |
| **Embedded Metadata** | NFO files, subtitles, artwork (optional) |

### What Is NOT Migrated (By Design)

| Item | Reason |
|------|--------|
| **Configuration** | idkarr has its own config system |
| **Quality Profiles** | Set up fresh with idkarr defaults or customize |
| **Download History** | Clean slate, no old baggage |
| **Blocklists** | Fresh start with new release evaluation |
| **Indexer Settings** | Configure directly in idkarr |

---

## Supported Source Formats

### Sonarr/Radarr Naming Patterns

idkarr recognizes all standard *arr naming conventions and can parse them to extract metadata.

```typescript
// core/import/parsers/arrPatterns.ts

export const sonarrPatterns = {
  // Standard Sonarr naming
  standard: [
    // {Series Title} - S{season:00}E{episode:00} - {Episode Title} [{Quality Full}]
    /^(.+?)\s*-\s*S(\d{2})E(\d{2,3})(?:-E(\d{2,3}))?\s*-\s*(.+?)\s*\[(.+?)\]/i,

    // {Series Title} - S{season:00}E{episode:00} [{Quality Full}]
    /^(.+?)\s*-\s*S(\d{2})E(\d{2,3})(?:-E(\d{2,3}))?\s*\[(.+?)\]/i,

    // {Series Title} S{season:00}E{episode:00}
    /^(.+?)\s+S(\d{2})E(\d{2,3})(?:-E(\d{2,3}))?/i,
  ],

  // Daily show format
  daily: [
    // {Series Title} - {Air-Date} - {Episode Title} [{Quality Full}]
    /^(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})\s*-\s*(.+?)\s*\[(.+?)\]/i,

    // {Series Title} - {Air.Date} [{Quality Full}]
    /^(.+?)\s*-\s*(\d{4}\.\d{2}\.\d{2})\s*\[(.+?)\]/i,
  ],

  // Anime format
  anime: [
    // {Series Title} - S{season:00}E{episode:00} - {Absolute Episode:000} [{Quality Full}]
    /^(.+?)\s*-\s*S(\d{2})E(\d{2,3})\s*-\s*(\d{3,4})\s*\[(.+?)\]/i,

    // {Series Title} - {Absolute Episode:000} [{Quality Full}]
    /^(.+?)\s*-\s*(\d{3,4})\s*\[(.+?)\]/i,
  ],
};

export const radarrPatterns = {
  // Standard Radarr naming
  standard: [
    // {Movie Title} ({Movie Year}) [{Quality Full}]
    /^(.+?)\s*\((\d{4})\)\s*\[(.+?)\]/i,

    // {Movie Title} ({Movie Year}) {Edition Tags} [{Quality Full}]
    /^(.+?)\s*\((\d{4})\)\s*(.+?)\s*\[(.+?)\]/i,

    // {Movie Title} ({Movie Year})
    /^(.+?)\s*\((\d{4})\)/i,
  ],

  // With quality in filename
  withQuality: [
    // {Movie Title} ({Movie Year}) - {Quality Full}
    /^(.+?)\s*\((\d{4})\)\s*-\s*(.+)/i,
  ],
};
```

### Scene Release Patterns

idkarr fully supports scene release naming conventions.

```typescript
// core/import/parsers/scenePatterns.ts

export const scenePatterns = {
  // TV Scene releases
  tvScene: [
    // Show.Name.S01E01.1080p.AMZN.WEB-DL.DDP5.1.H.264-GROUP
    /^(.+?)\.S(\d{2})E(\d{2,3})(?:E(\d{2,3}))?\.(.+?)-([A-Za-z0-9]+)$/i,

    // Show.Name.S01E01.Episode.Title.1080p.WEB-DL-GROUP
    /^(.+?)\.S(\d{2})E(\d{2,3})\.(.+?)\.(\d{3,4}p)\.(.+?)-([A-Za-z0-9]+)$/i,

    // Show.Name.1x01.Title.HDTV.x264-GROUP
    /^(.+?)\.(\d+)x(\d{2,3})\.(.+?)-([A-Za-z0-9]+)$/i,
  ],

  // Movie Scene releases
  movieScene: [
    // Movie.Name.2023.1080p.BluRay.x264-GROUP
    /^(.+?)\.(\d{4})\.(.+?)-([A-Za-z0-9]+)$/i,

    // Movie.Name.2023.Directors.Cut.2160p.UHD.BluRay-GROUP
    /^(.+?)\.(\d{4})\.(.+?)\.(\d{3,4}p)\.(.+?)-([A-Za-z0-9]+)$/i,
  ],

  // Anime Scene releases
  animeScene: [
    // [SubGroup] Anime Name - 01 [1080p]
    /^\[([^\]]+)\]\s*(.+?)\s*-\s*(\d{2,4})(?:v\d)?\s*\[([^\]]+)\]/i,

    // [SubGroup] Anime Name - 01 (1080p) [Hash]
    /^\[([^\]]+)\]\s*(.+?)\s*-\s*(\d{2,4})(?:v\d)?\s*\(([^\)]+)\)\s*\[[A-Fa-f0-9]+\]/i,
  ],
};

// Quality detection from scene releases
export const sceneQualityPatterns = {
  resolution: {
    '2160p': /\b(2160p|4k|uhd)\b/i,
    '1080p': /\b(1080p|1080i)\b/i,
    '720p': /\b(720p)\b/i,
    '480p': /\b(480p|sd)\b/i,
  },

  source: {
    'BluRay': /\b(blu[\s\-]?ray|bd[\s\-]?rip|bdrip|brrip)\b/i,
    'WEB-DL': /\b(web[\s\-]?dl|webdl)\b/i,
    'WEBRip': /\b(web[\s\-]?rip|webrip)\b/i,
    'HDTV': /\b(hdtv|pdtv)\b/i,
    'DVD': /\b(dvd[\s\-]?rip|dvdr)\b/i,
    'Remux': /\b(remux)\b/i,
  },

  streamingService: {
    'AMZN': /\b(amzn|amazon)\b/i,
    'NF': /\b(nf|netflix)\b/i,
    'DSNP': /\b(dsnp|disneyplus|disney\+)\b/i,
    'ATVP': /\b(atvp|appletv)\b/i,
    'HMAX': /\b(hmax|hbomax)\b/i,
    'PCOK': /\b(pcok|peacock)\b/i,
    'PMTP': /\b(pmtp|paramount\+)\b/i,
  },
};
```

### Arbitrary User Naming

idkarr handles non-standard user naming through aggressive parsing and fuzzy matching.

```typescript
// core/import/parsers/userPatterns.ts

export const userNamingPatterns = {
  // Common user naming styles
  patterns: [
    // Show Name - 1x01 - Episode Title
    /^(.+?)\s*-\s*(\d+)x(\d{2,3})\s*-\s*(.+)$/i,

    // Show Name Episode 1
    /^(.+?)\s+Episode\s+(\d+)/i,

    // Show Name Ep 01
    /^(.+?)\s+Ep\.?\s*(\d+)/i,

    // Show Name 101 (3-digit episode)
    /^(.+?)\s+(\d)(\d{2})$/,

    // Movie Name (Year)
    /^(.+?)\s*[\(\[](\d{4})[\)\]]/,

    // Movie Name Year
    /^(.+?)\s+(\d{4})$/,

    // Just the title (will need metadata lookup)
    /^(.+?)$/,
  ],

  // Clean up common artifacts
  cleanupPatterns: [
    /\s*[\(\[][^\)\]]*quality[^\)\]]*[\)\]]\s*/gi,
    /\s*[\(\[][^\)\]]*\d{3,4}p[^\)\]]*[\)\]]\s*/gi,
    /\s*-\s*Copy\s*$/i,
    /\s*\(\d+\)\s*$/,  // Duplicate markers like (1), (2)
    /\s*\[.*?\]\s*$/,  // Trailing brackets
  ],
};

// Extract clean title from messy filename
export function extractCleanTitle(filename: string): string {
  let clean = filename;

  // Remove file extension
  clean = clean.replace(/\.[^.]+$/, '');

  // Replace separators with spaces
  clean = clean.replace(/[._]/g, ' ');

  // Apply cleanup patterns
  for (const pattern of userNamingPatterns.cleanupPatterns) {
    clean = clean.replace(pattern, '');
  }

  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}
```

---

## Bulk Import Flow

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Bulk Import Flow                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: Scan Folder                  Step 2: Parse Files
┌────────────────────┐              ┌────────────────────┐
│ User selects       │              │ For each file:     │
│ source folder(s)   │─────────────▶│ - Extract filename │
│                    │              │ - Parse metadata   │
│ /media/existing/   │              │ - Detect quality   │
└────────────────────┘              └────────────────────┘
                                              │
                                              ▼
Step 3: Match Content               Step 4: Present Results
┌────────────────────┐              ┌────────────────────┐
│ For each parsed:   │              │ Show user:         │
│ - Search TVDB/TMDB │◀─────────────│ - Matched items    │
│ - Calculate score  │              │ - Confidence %     │
│ - Find best match  │              │ - Proposed names   │
└────────────────────┘              └────────────────────┘
                                              │
                                              ▼
Step 5: User Confirms               Step 6: Execute Import
┌────────────────────┐              ┌────────────────────┐
│ User reviews:      │              │ For confirmed:     │
│ - Accept matches   │─────────────▶│ - Rename files     │
│ - Fix mismatches   │              │ - Move to library  │
│ - Skip unknowns    │              │ - Update database  │
└────────────────────┘              └────────────────────┘
```

### Implementation

```typescript
// core/import/services/bulkImport.service.ts

import { EventEmitter } from 'events';

export interface BulkImportOptions {
  sourcePaths: string[];
  contentType: 'series' | 'movie' | 'anime' | 'auto';
  destinationRootFolder: string;
  dryRun: boolean;
  autoConfirmThreshold: number;  // Auto-confirm matches above this confidence
}

export interface ScanResult {
  totalFiles: number;
  scannedFiles: number;
  parsedFiles: ParsedFile[];
  errors: ScanError[];
}

export interface ParsedFile {
  id: string;
  originalPath: string;
  originalFilename: string;

  // Parsed information
  parsedTitle: string;
  parsedYear?: number;
  parsedSeason?: number;
  parsedEpisodes?: number[];
  parsedQuality: QualityInfo;

  // Match results
  matches: MatchResult[];
  bestMatch?: MatchResult;

  // Import status
  status: 'pending' | 'matched' | 'unmatched' | 'confirmed' | 'imported' | 'error';
  error?: string;

  // Proposed changes
  proposedPath?: string;
  proposedFilename?: string;
}

export interface MatchResult {
  mediaId?: number;
  externalId: string;  // TVDB, TMDB, etc.
  title: string;
  year?: number;
  contentType: 'series' | 'movie' | 'anime';
  confidence: number;  // 0-100
  matchMethod: MatchMethod;

  // For series
  seasonNumber?: number;
  episodeNumbers?: number[];
  episodeTitle?: string;
}

export type MatchMethod =
  | 'exact-title'
  | 'fuzzy-title'
  | 'alias'
  | 'external-id'
  | 'year-disambiguation';

export class BulkImportService extends EventEmitter {
  constructor(
    private metadataService: MetadataService,
    private fileSystemService: FileSystemService,
    private parserService: ParserService,
    private matchingService: MatchingService,
    private namingService: NamingService,
  ) {
    super();
  }

  /**
   * Step 1: Scan source folders for media files
   */
  async scan(paths: string[]): Promise<ScanResult> {
    const result: ScanResult = {
      totalFiles: 0,
      scannedFiles: 0,
      parsedFiles: [],
      errors: [],
    };

    for (const path of paths) {
      this.emit('scan:start', { path });

      const files = await this.fileSystemService.scanDirectory(path, {
        recursive: true,
        extensions: MEDIA_EXTENSIONS,
      });

      result.totalFiles += files.length;

      for (const file of files) {
        try {
          const parsed = await this.parseFile(file);
          result.parsedFiles.push(parsed);
          result.scannedFiles++;

          this.emit('scan:progress', {
            current: result.scannedFiles,
            total: result.totalFiles,
            file: file.path,
          });
        } catch (error) {
          result.errors.push({
            path: file.path,
            error: error.message,
          });
        }
      }

      this.emit('scan:complete', { path, count: files.length });
    }

    return result;
  }

  /**
   * Step 2-3: Parse file and find matches
   */
  async parseFile(file: FileInfo): Promise<ParsedFile> {
    const parsed: ParsedFile = {
      id: generateId(),
      originalPath: file.path,
      originalFilename: file.name,
      parsedTitle: '',
      parsedQuality: { source: 'unknown', resolution: 0 },
      matches: [],
      status: 'pending',
    };

    // Parse the filename
    const parseResult = this.parserService.parse(file.name);
    if (parseResult) {
      parsed.parsedTitle = parseResult.title;
      parsed.parsedYear = parseResult.year;
      parsed.parsedSeason = parseResult.seasonNumber;
      parsed.parsedEpisodes = parseResult.episodeNumbers;
      parsed.parsedQuality = parseResult.quality;
    } else {
      // Fallback to basic extraction
      parsed.parsedTitle = extractCleanTitle(file.name);
    }

    // Find matches
    parsed.matches = await this.matchingService.findMatches(parsed);

    if (parsed.matches.length > 0) {
      parsed.bestMatch = parsed.matches[0];
      parsed.status = parsed.bestMatch.confidence >= 80 ? 'matched' : 'unmatched';

      // Generate proposed path
      if (parsed.bestMatch) {
        const naming = await this.namingService.generatePath(
          parsed.bestMatch,
          parsed.parsedQuality,
        );
        parsed.proposedPath = naming.path;
        parsed.proposedFilename = naming.filename;
      }
    } else {
      parsed.status = 'unmatched';
    }

    return parsed;
  }

  /**
   * Step 4: Get import preview for user review
   */
  async getPreview(scanResult: ScanResult): Promise<ImportPreview> {
    const preview: ImportPreview = {
      matched: [],
      unmatched: [],
      duplicates: [],
      errors: [],
      statistics: {
        totalFiles: scanResult.totalFiles,
        matchedCount: 0,
        unmatchedCount: 0,
        duplicateCount: 0,
        errorCount: scanResult.errors.length,
      },
    };

    for (const file of scanResult.parsedFiles) {
      if (file.status === 'matched') {
        preview.matched.push(file);
        preview.statistics.matchedCount++;
      } else if (file.status === 'unmatched') {
        preview.unmatched.push(file);
        preview.statistics.unmatchedCount++;
      }
    }

    // Check for duplicates
    const duplicates = this.findDuplicates(preview.matched);
    preview.duplicates = duplicates;
    preview.statistics.duplicateCount = duplicates.length;

    return preview;
  }

  /**
   * Step 5: Confirm matches (user selection)
   */
  async confirmMatches(
    files: ParsedFile[],
    confirmations: ImportConfirmation[],
  ): Promise<ParsedFile[]> {
    const confirmed: ParsedFile[] = [];

    for (const conf of confirmations) {
      const file = files.find(f => f.id === conf.fileId);
      if (!file) continue;

      if (conf.action === 'accept') {
        file.status = 'confirmed';
        if (conf.selectedMatchIndex !== undefined) {
          file.bestMatch = file.matches[conf.selectedMatchIndex];
        }
        confirmed.push(file);
      } else if (conf.action === 'manual') {
        // User provided manual match
        file.bestMatch = conf.manualMatch;
        file.status = 'confirmed';
        confirmed.push(file);
      }
      // action === 'skip' means we don't add to confirmed
    }

    return confirmed;
  }

  /**
   * Step 6: Execute the import
   */
  async executeImport(
    files: ParsedFile[],
    options: ImportExecutionOptions,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      successful: [],
      failed: [],
      skipped: [],
    };

    for (const file of files) {
      if (file.status !== 'confirmed') {
        result.skipped.push({ file, reason: 'not-confirmed' });
        continue;
      }

      try {
        this.emit('import:file:start', { file });

        // Generate final path
        const finalPath = await this.namingService.generateFinalPath(
          file.bestMatch!,
          file.parsedQuality,
          options.destinationRootFolder,
        );

        // Create directory if needed
        await this.fileSystemService.ensureDirectory(finalPath.directory);

        // Move/copy and rename file
        if (options.mode === 'copy-and-import') {
          await this.fileSystemService.copyFile(
            file.originalPath,
            finalPath.fullPath,
          );
        } else {
          await this.fileSystemService.moveFile(
            file.originalPath,
            finalPath.fullPath,
          );
        }

        // Update database
        await this.updateDatabase(file, finalPath);

        file.status = 'imported';
        result.successful.push({
          file,
          newPath: finalPath.fullPath,
        });

        this.emit('import:file:complete', { file, newPath: finalPath.fullPath });
      } catch (error) {
        file.status = 'error';
        file.error = error.message;
        result.failed.push({ file, error: error.message });

        this.emit('import:file:error', { file, error: error.message });
      }
    }

    this.emit('import:complete', result);
    return result;
  }

  private findDuplicates(files: ParsedFile[]): DuplicateGroup[] {
    // Group by media ID / external ID
    const groups = new Map<string, ParsedFile[]>();

    for (const file of files) {
      if (!file.bestMatch) continue;

      const key = `${file.bestMatch.contentType}-${file.bestMatch.externalId}`;
      const existing = groups.get(key) || [];
      existing.push(file);
      groups.set(key, existing);
    }

    // Return groups with more than one file
    return Array.from(groups.entries())
      .filter(([, files]) => files.length > 1)
      .map(([key, files]) => ({
        key,
        files,
        bestQuality: this.selectBestQuality(files),
      }));
  }

  private selectBestQuality(files: ParsedFile[]): ParsedFile {
    return files.sort((a, b) => {
      // Sort by resolution (higher is better)
      const resA = a.parsedQuality.resolution || 0;
      const resB = b.parsedQuality.resolution || 0;
      if (resA !== resB) return resB - resA;

      // Sort by source (BluRay > WEB-DL > HDTV)
      const sourceOrder = ['bluray', 'web-dl', 'webrip', 'hdtv', 'dvd', 'unknown'];
      const srcA = sourceOrder.indexOf(a.parsedQuality.source.toLowerCase());
      const srcB = sourceOrder.indexOf(b.parsedQuality.source.toLowerCase());
      return srcA - srcB;
    })[0];
  }
}
```

---

## File Parsing

### How idkarr Parses Existing Filenames

idkarr uses a multi-stage parsing pipeline to extract metadata from any filename format.

```typescript
// core/import/parsers/pipeline.ts

export interface ParsePipeline {
  stages: ParseStage[];
}

export interface ParseStage {
  name: string;
  priority: number;
  parser: (input: string) => ParseResult | null;
}

export interface ParseResult {
  title: string;
  cleanTitle: string;
  year?: number;

  // TV Series
  seasonNumber?: number;
  episodeNumbers?: number[];
  episodeTitle?: string;
  absoluteEpisodeNumber?: number;
  airDate?: string;

  // Quality
  quality: QualityInfo;

  // Release info
  releaseGroup?: string;
  releaseHash?: string;

  // Modifiers
  isProper?: boolean;
  isRepack?: boolean;
  edition?: string;

  // Confidence
  confidence: number;
  parserUsed: string;
}

export const defaultPipeline: ParsePipeline = {
  stages: [
    // Stage 1: Try *arr naming patterns (highest confidence)
    {
      name: 'arr-patterns',
      priority: 100,
      parser: parseArrPatterns,
    },

    // Stage 2: Try scene release patterns
    {
      name: 'scene-patterns',
      priority: 90,
      parser: parseScenePatterns,
    },

    // Stage 3: Try anime patterns
    {
      name: 'anime-patterns',
      priority: 85,
      parser: parseAnimePatterns,
    },

    // Stage 4: Try common user patterns
    {
      name: 'user-patterns',
      priority: 70,
      parser: parseUserPatterns,
    },

    // Stage 5: Fallback - extract what we can
    {
      name: 'fallback',
      priority: 50,
      parser: parseFallback,
    },
  ],
};

export class FileParserService {
  private pipeline: ParsePipeline;

  constructor(pipeline: ParsePipeline = defaultPipeline) {
    this.pipeline = pipeline;
    // Sort stages by priority
    this.pipeline.stages.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Parse a filename through the pipeline
   */
  parse(filename: string): ParseResult | null {
    // Pre-process filename
    const processed = this.preProcess(filename);

    // Try each stage in priority order
    for (const stage of this.pipeline.stages) {
      try {
        const result = stage.parser(processed);
        if (result && result.confidence >= 50) {
          result.parserUsed = stage.name;
          return this.postProcess(result);
        }
      } catch (error) {
        // Continue to next stage
        console.warn(`Parser ${stage.name} failed:`, error);
      }
    }

    return null;
  }

  /**
   * Pre-process filename before parsing
   */
  private preProcess(filename: string): string {
    let processed = filename;

    // Remove file extension
    processed = processed.replace(/\.[^.]+$/, '');

    // Normalize unicode
    processed = processed.normalize('NFKC');

    // Remove common garbage
    processed = processed
      .replace(/\s*\[.*?sample.*?\]\s*/gi, '')
      .replace(/\s*\(.*?sample.*?\)\s*/gi, '')
      .replace(/\s*-\s*sample\s*$/i, '');

    return processed;
  }

  /**
   * Post-process parse result
   */
  private postProcess(result: ParseResult): ParseResult {
    // Clean title
    result.cleanTitle = this.cleanTitle(result.title);

    // Validate episode numbers
    if (result.episodeNumbers) {
      result.episodeNumbers = result.episodeNumbers.filter(n => n > 0 && n < 10000);
    }

    // Validate season number
    if (result.seasonNumber !== undefined) {
      if (result.seasonNumber < 0 || result.seasonNumber > 100) {
        delete result.seasonNumber;
      }
    }

    // Validate year
    if (result.year !== undefined) {
      if (result.year < 1900 || result.year > new Date().getFullYear() + 5) {
        delete result.year;
      }
    }

    return result;
  }

  /**
   * Clean title for matching
   */
  private cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
```

### Quality Extraction

```typescript
// core/import/parsers/quality.ts

export interface QualityInfo {
  source: QualitySource;
  resolution: number;
  codec?: string;
  bitDepth?: number;
  hdr?: HDRType;
  audio?: AudioInfo;
  streamingService?: string;
}

export type QualitySource =
  | 'bluray' | 'bluray-remux'
  | 'web-dl' | 'webrip'
  | 'hdtv' | 'sdtv'
  | 'dvd' | 'dvd-r'
  | 'unknown';

export type HDRType = 'hdr10' | 'hdr10+' | 'dolby-vision' | 'hlg' | 'sdr';

export interface AudioInfo {
  codec: string;
  channels?: string;
  isAtmos?: boolean;
}

export function parseQuality(input: string): QualityInfo {
  const quality: QualityInfo = {
    source: 'unknown',
    resolution: 0,
  };

  // Resolution
  if (/2160p|4k|uhd/i.test(input)) {
    quality.resolution = 2160;
  } else if (/1080p|1080i/i.test(input)) {
    quality.resolution = 1080;
  } else if (/720p/i.test(input)) {
    quality.resolution = 720;
  } else if (/480p|576p|sd/i.test(input)) {
    quality.resolution = 480;
  }

  // Source
  if (/remux/i.test(input)) {
    quality.source = 'bluray-remux';
  } else if (/blu[\-\s]?ray|bd[\-\s]?rip|brrip/i.test(input)) {
    quality.source = 'bluray';
  } else if (/web[\-\s]?dl|webdl/i.test(input)) {
    quality.source = 'web-dl';
  } else if (/web[\-\s]?rip|webrip/i.test(input)) {
    quality.source = 'webrip';
  } else if (/hdtv/i.test(input)) {
    quality.source = 'hdtv';
  } else if (/dvd[\-\s]?r/i.test(input)) {
    quality.source = 'dvd-r';
  } else if (/dvd/i.test(input)) {
    quality.source = 'dvd';
  }

  // Video codec
  if (/x265|h\.?265|hevc/i.test(input)) {
    quality.codec = 'h265';
  } else if (/x264|h\.?264|avc/i.test(input)) {
    quality.codec = 'h264';
  } else if (/av1/i.test(input)) {
    quality.codec = 'av1';
  } else if (/xvid|divx/i.test(input)) {
    quality.codec = 'xvid';
  }

  // Bit depth
  if (/10[\-\s]?bit/i.test(input)) {
    quality.bitDepth = 10;
  } else if (/8[\-\s]?bit/i.test(input)) {
    quality.bitDepth = 8;
  }

  // HDR
  if (/dolby[\-\s]?vision|dovi|dv/i.test(input)) {
    quality.hdr = 'dolby-vision';
  } else if (/hdr10\+|hdr10plus/i.test(input)) {
    quality.hdr = 'hdr10+';
  } else if (/hdr10|hdr/i.test(input)) {
    quality.hdr = 'hdr10';
  } else if (/hlg/i.test(input)) {
    quality.hdr = 'hlg';
  }

  // Audio
  quality.audio = parseAudio(input);

  // Streaming service
  const serviceMatch = input.match(/\b(AMZN|NF|DSNP|ATVP|HMAX|PCOK|PMTP)\b/i);
  if (serviceMatch) {
    quality.streamingService = serviceMatch[1].toUpperCase();
  }

  return quality;
}

function parseAudio(input: string): AudioInfo | undefined {
  const audio: AudioInfo = { codec: 'unknown' };

  // Codec
  if (/truehd/i.test(input)) {
    audio.codec = 'truehd';
  } else if (/dts[\-\s]?hd[\-\s]?ma/i.test(input)) {
    audio.codec = 'dts-hd-ma';
  } else if (/dts[\-\s]?hd/i.test(input)) {
    audio.codec = 'dts-hd';
  } else if (/dts[\-\s]?x/i.test(input)) {
    audio.codec = 'dts-x';
  } else if (/dts/i.test(input)) {
    audio.codec = 'dts';
  } else if (/ddp|e[\-\s]?ac[\-\s]?3|eac3/i.test(input)) {
    audio.codec = 'ddp';
  } else if (/dd|ac[\-\s]?3|ac3/i.test(input)) {
    audio.codec = 'dd';
  } else if (/aac/i.test(input)) {
    audio.codec = 'aac';
  } else if (/flac/i.test(input)) {
    audio.codec = 'flac';
  }

  // Channels
  if (/7\.1/i.test(input)) {
    audio.channels = '7.1';
  } else if (/5\.1/i.test(input)) {
    audio.channels = '5.1';
  } else if (/2\.0|stereo/i.test(input)) {
    audio.channels = '2.0';
  }

  // Atmos
  audio.isAtmos = /atmos/i.test(input);

  return audio.codec !== 'unknown' ? audio : undefined;
}
```

---

## Matching Algorithm

### Title Matching Strategy

```typescript
// core/import/matching/matcher.service.ts

export interface MatchConfig {
  useTitleMatching: boolean;
  useYearDisambiguation: boolean;
  useFuzzyMatching: boolean;
  useAliasMatching: boolean;
  useExternalIds: boolean;
  maxFuzzyDistance: number;
  minConfidence: number;
}

export class MatchingService {
  constructor(
    private metadataService: MetadataService,
    private aliasService: AliasService,
    private config: MatchConfig,
  ) {}

  /**
   * Find matches for a parsed file
   */
  async findMatches(file: ParsedFile): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];

    // Strategy 1: Exact title match
    if (this.config.useTitleMatching) {
      const exactMatches = await this.findExactMatches(file);
      matches.push(...exactMatches);
    }

    // Strategy 2: Year disambiguation
    if (this.config.useYearDisambiguation && file.parsedYear) {
      const yearMatches = await this.findWithYearDisambiguation(file);
      matches.push(...yearMatches);
    }

    // Strategy 3: Fuzzy matching
    if (this.config.useFuzzyMatching) {
      const fuzzyMatches = await this.findFuzzyMatches(file);
      matches.push(...fuzzyMatches);
    }

    // Strategy 4: Alias matching
    if (this.config.useAliasMatching) {
      const aliasMatches = await this.findAliasMatches(file);
      matches.push(...aliasMatches);
    }

    // Deduplicate and sort by confidence
    const unique = this.deduplicateMatches(matches);
    return unique.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Exact title match
   */
  private async findExactMatches(file: ParsedFile): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    const cleanTitle = this.cleanTitle(file.parsedTitle);

    // Search TVDB for series
    const tvdbResults = await this.metadataService.searchTVDB(cleanTitle);
    for (const result of tvdbResults) {
      if (this.cleanTitle(result.title) === cleanTitle) {
        results.push({
          externalId: `tvdb:${result.tvdbId}`,
          title: result.title,
          year: result.year,
          contentType: 'series',
          confidence: 95,
          matchMethod: 'exact-title',
        });
      }
    }

    // Search TMDB for movies
    const tmdbResults = await this.metadataService.searchTMDB(cleanTitle);
    for (const result of tmdbResults) {
      if (this.cleanTitle(result.title) === cleanTitle) {
        results.push({
          externalId: `tmdb:${result.tmdbId}`,
          title: result.title,
          year: result.year,
          contentType: 'movie',
          confidence: 95,
          matchMethod: 'exact-title',
        });
      }
    }

    return results;
  }

  /**
   * Year disambiguation for same-title media
   */
  private async findWithYearDisambiguation(file: ParsedFile): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    const cleanTitle = this.cleanTitle(file.parsedTitle);

    // Search with year filter
    const tvdbResults = await this.metadataService.searchTVDB(cleanTitle, {
      year: file.parsedYear,
    });

    for (const result of tvdbResults) {
      const titleMatch = this.calculateTitleSimilarity(cleanTitle, result.title);
      const yearMatch = result.year === file.parsedYear ? 20 : 0;

      results.push({
        externalId: `tvdb:${result.tvdbId}`,
        title: result.title,
        year: result.year,
        contentType: 'series',
        confidence: Math.min(titleMatch + yearMatch, 100),
        matchMethod: 'year-disambiguation',
      });
    }

    const tmdbResults = await this.metadataService.searchTMDB(cleanTitle, {
      year: file.parsedYear,
    });

    for (const result of tmdbResults) {
      const titleMatch = this.calculateTitleSimilarity(cleanTitle, result.title);
      const yearMatch = result.year === file.parsedYear ? 20 : 0;

      results.push({
        externalId: `tmdb:${result.tmdbId}`,
        title: result.title,
        year: result.year,
        contentType: 'movie',
        confidence: Math.min(titleMatch + yearMatch, 100),
        matchMethod: 'year-disambiguation',
      });
    }

    return results;
  }

  /**
   * Fuzzy matching using Levenshtein distance
   */
  private async findFuzzyMatches(file: ParsedFile): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    const cleanTitle = this.cleanTitle(file.parsedTitle);

    // Get broader search results
    const words = cleanTitle.split(' ');
    const searchTerm = words.slice(0, 3).join(' '); // First 3 words

    const tvdbResults = await this.metadataService.searchTVDB(searchTerm);
    const tmdbResults = await this.metadataService.searchTMDB(searchTerm);

    for (const result of [...tvdbResults, ...tmdbResults]) {
      const distance = this.levenshteinDistance(cleanTitle, this.cleanTitle(result.title));

      if (distance <= this.config.maxFuzzyDistance) {
        // Convert distance to confidence (0 distance = 90%, max distance = 60%)
        const confidence = 90 - ((distance / this.config.maxFuzzyDistance) * 30);

        results.push({
          externalId: 'tvdbId' in result
            ? `tvdb:${result.tvdbId}`
            : `tmdb:${result.tmdbId}`,
          title: result.title,
          year: result.year,
          contentType: 'tvdbId' in result ? 'series' : 'movie',
          confidence: Math.round(confidence),
          matchMethod: 'fuzzy-title',
        });
      }
    }

    return results;
  }

  /**
   * Alias matching - alternate titles, foreign titles
   */
  private async findAliasMatches(file: ParsedFile): Promise<MatchResult[]> {
    const results: MatchResult[] = [];
    const cleanTitle = this.cleanTitle(file.parsedTitle);

    // Check our alias database
    const aliases = await this.aliasService.findByTitle(cleanTitle);

    for (const alias of aliases) {
      results.push({
        externalId: alias.externalId,
        title: alias.primaryTitle,
        year: alias.year,
        contentType: alias.contentType,
        confidence: 85,
        matchMethod: 'alias',
      });
    }

    return results;
  }

  /**
   * Calculate title similarity (0-100)
   */
  private calculateTitleSimilarity(a: string, b: string): number {
    const cleanA = this.cleanTitle(a);
    const cleanB = this.cleanTitle(b);

    if (cleanA === cleanB) return 100;

    // Check if one contains the other
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      const ratio = Math.min(cleanA.length, cleanB.length) /
                    Math.max(cleanA.length, cleanB.length);
      return Math.round(70 + (ratio * 25));
    }

    // Levenshtein-based similarity
    const maxLen = Math.max(cleanA.length, cleanB.length);
    const distance = this.levenshteinDistance(cleanA, cleanB);
    return Math.round((1 - distance / maxLen) * 100);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,     // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  private cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private deduplicateMatches(matches: MatchResult[]): MatchResult[] {
    const seen = new Set<string>();
    return matches.filter(m => {
      if (seen.has(m.externalId)) return false;
      seen.add(m.externalId);
      return true;
    });
  }
}
```

### Confidence Score Calculation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Confidence Score Breakdown                            │
└─────────────────────────────────────────────────────────────────────────────┘

Match Method          Base Score    Modifiers                      Final Range
─────────────────────────────────────────────────────────────────────────────
Exact Title Match     95%           +5% if year matches            95-100%
Year Disambiguation   75%           +20% exact year, +10% +/-1yr   75-95%
Fuzzy Title Match     60-90%        Based on Levenshtein distance  60-90%
Alias Match           85%           +10% if primary alias          85-95%
External ID Match     100%          N/A (direct lookup)            100%

Additional Modifiers:
- Episode/Season match confirmed:  +5%
- Quality info matches expected:   +2%
- Release group recognized:        +2%
- Multiple metadata sources agree: +5%
```

---

## Rename on Import

### Enforced Naming Convention

All imported files are renamed to follow idkarr's standardized format. This is **not optional** - consistency is enforced across the entire library.

```typescript
// core/import/naming/renamer.service.ts

export class FileRenamerService {
  constructor(
    private namingConfig: NamingConfig,
    private tokenResolver: TokenResolver,
  ) {}

  /**
   * Generate the new filename for an imported file
   */
  generateFilename(
    match: MatchResult,
    quality: QualityInfo,
    originalExtension: string,
  ): string {
    const context = this.buildNamingContext(match, quality);

    let template: string;

    switch (match.contentType) {
      case 'series':
        template = this.namingConfig.standardEpisodeFormat;
        break;
      case 'anime':
        template = this.namingConfig.animeEpisodeFormat;
        break;
      case 'movie':
        template = this.namingConfig.movieFileFormat;
        break;
      default:
        throw new Error(`Unknown content type: ${match.contentType}`);
    }

    let filename = this.tokenResolver.resolve(template, context);
    filename = this.sanitizeFilename(filename);

    return `${filename}.${originalExtension}`;
  }

  /**
   * Generate the full path including folder structure
   */
  generateFullPath(
    match: MatchResult,
    quality: QualityInfo,
    rootFolder: string,
    originalExtension: string,
  ): { directory: string; filename: string; fullPath: string } {
    const filename = this.generateFilename(match, quality, originalExtension);
    const folderPath = this.generateFolderPath(match, rootFolder);

    return {
      directory: folderPath,
      filename,
      fullPath: path.join(folderPath, filename),
    };
  }

  /**
   * Generate folder path based on content type
   */
  private generateFolderPath(match: MatchResult, rootFolder: string): string {
    const context = this.buildNamingContext(match, {});

    let folderPath = rootFolder;

    switch (match.contentType) {
      case 'series':
      case 'anime': {
        // Series folder
        const seriesFolder = this.tokenResolver.resolve(
          this.namingConfig.seriesFolderFormat,
          context,
        );
        folderPath = path.join(folderPath, this.sanitizePath(seriesFolder));

        // Season folder
        if (match.seasonNumber !== undefined) {
          const seasonFolder = this.tokenResolver.resolve(
            this.namingConfig.seasonFolderFormat,
            context,
          );
          folderPath = path.join(folderPath, this.sanitizePath(seasonFolder));
        }
        break;
      }

      case 'movie': {
        // Movie folder
        const movieFolder = this.tokenResolver.resolve(
          this.namingConfig.movieFolderFormat,
          context,
        );
        folderPath = path.join(folderPath, this.sanitizePath(movieFolder));
        break;
      }
    }

    return folderPath;
  }

  /**
   * Build naming context from match and quality
   */
  private buildNamingContext(
    match: MatchResult,
    quality: QualityInfo,
  ): NamingContext {
    return {
      // Series/Movie info
      series: match.contentType !== 'movie' ? {
        title: match.title,
        cleanTitle: this.cleanTitle(match.title),
        sortTitle: this.sortTitle(match.title),
        year: match.year,
      } : undefined,

      movie: match.contentType === 'movie' ? {
        title: match.title,
        cleanTitle: this.cleanTitle(match.title),
        sortTitle: this.sortTitle(match.title),
        year: match.year,
      } : undefined,

      // Episode info
      episode: match.seasonNumber !== undefined ? {
        seasonNumber: match.seasonNumber,
        episodeNumber: match.episodeNumbers?.[0],
        title: match.episodeTitle,
        absoluteEpisodeNumber: match.absoluteEpisodeNumber,
      } : undefined,

      // Quality info
      quality: {
        full: this.formatQualityFull(quality),
        title: this.formatQualityTitle(quality),
        resolution: quality.resolution,
        source: quality.source,
      },

      // Release info
      releaseInfo: match.releaseGroup ? {
        releaseGroup: match.releaseGroup,
      } : undefined,
    };
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    // Replace illegal characters
    let safe = filename.replace(/[\\/:*?"<>|]/g, (char) => {
      const replacements: Record<string, string> = {
        '\\': '-',
        '/': '-',
        ':': this.namingConfig.colonReplacementFormat === 'delete' ? '' : ' -',
        '*': '',
        '?': '',
        '"': "'",
        '<': '',
        '>': '',
        '|': '-',
      };
      return replacements[char] ?? '';
    });

    // Collapse multiple spaces/dashes
    safe = safe.replace(/\s+/g, ' ').replace(/-{2,}/g, '-');

    // Trim
    safe = safe.trim().replace(/^-|-$/g, '');

    return safe;
  }

  /**
   * Sanitize path component
   */
  private sanitizePath(component: string): string {
    return this.sanitizeFilename(component);
  }

  private cleanTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private sortTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '')
      .trim();
  }

  private formatQualityFull(quality: QualityInfo): string {
    const parts: string[] = [];

    if (quality.source && quality.source !== 'unknown') {
      const sourceMap: Record<string, string> = {
        'bluray': 'Bluray',
        'bluray-remux': 'Bluray Remux',
        'web-dl': 'WEB-DL',
        'webrip': 'WEBRip',
        'hdtv': 'HDTV',
        'dvd': 'DVD',
      };
      parts.push(sourceMap[quality.source] || quality.source);
    }

    if (quality.resolution) {
      parts.push(`${quality.resolution}p`);
    }

    return parts.join('-');
  }

  private formatQualityTitle(quality: QualityInfo): string {
    return quality.source !== 'unknown' ? quality.source : 'Unknown';
  }
}
```

### Naming Examples

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Rename Examples                                     │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE (Scene Release):
  The.Walking.Dead.S11E08.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv

AFTER (idkarr Format):
  /TV Shows/The Walking Dead (2010)/Season 11/
  The Walking Dead - S11E08 - For Blood [WEB-DL-1080p].mkv

─────────────────────────────────────────────────────────────────────────────

BEFORE (User Naming):
  breaking bad s01e01.avi

AFTER (idkarr Format):
  /TV Shows/Breaking Bad (2008)/Season 01/
  Breaking Bad - S01E01 - Pilot [DVD-480p].avi

─────────────────────────────────────────────────────────────────────────────

BEFORE (Movie - Scene):
  Oppenheimer.2023.2160p.UHD.BluRay.Remux.HDR.HEVC.TrueHD.7.1.Atmos-FGT.mkv

AFTER (idkarr Format):
  /Movies/Oppenheimer (2023)/
  Oppenheimer (2023) [Bluray Remux-2160p].mkv

─────────────────────────────────────────────────────────────────────────────

BEFORE (Anime):
  [SubsPlease] Demon Slayer - Kimetsu no Yaiba - 43 (1080p) [ABCD1234].mkv

AFTER (idkarr Format):
  /Anime/Demon Slayer - Kimetsu no Yaiba (2019)/Season 03/
  Demon Slayer - Kimetsu no Yaiba - S03E06 - 043 - Swordsmith Village [WEB-DL-1080p].mkv
```

---

## Folder Reorganization

### How Existing Structures Get Reorganized

```typescript
// core/import/reorganization/reorganizer.service.ts

export interface ReorganizationPlan {
  sourceStructure: FolderNode;
  targetStructure: FolderNode;
  moves: FileMove[];
  creates: string[];  // Directories to create
  deletes: string[];  // Empty directories to remove
}

export interface FolderNode {
  path: string;
  name: string;
  type: 'directory' | 'file';
  children?: FolderNode[];
  metadata?: {
    mediaId?: number;
    contentType?: string;
  };
}

export interface FileMove {
  sourcePath: string;
  targetPath: string;
  file: ParsedFile;
}

export class FolderReorganizer {
  /**
   * Generate reorganization plan from import results
   */
  generatePlan(
    files: ParsedFile[],
    rootFolder: string,
    options: ReorganizationOptions,
  ): ReorganizationPlan {
    const plan: ReorganizationPlan = {
      sourceStructure: this.buildSourceTree(files),
      targetStructure: { path: rootFolder, name: '', type: 'directory', children: [] },
      moves: [],
      creates: [],
      deletes: [],
    };

    // Group files by media
    const mediaGroups = this.groupByMedia(files);

    for (const [mediaKey, mediaFiles] of mediaGroups) {
      const firstFile = mediaFiles[0];
      const match = firstFile.bestMatch!;

      // Determine target folder structure
      const targetFolder = this.getTargetFolder(match, rootFolder);

      // Add folder to target structure
      this.addFolderToStructure(plan.targetStructure, targetFolder);
      plan.creates.push(targetFolder);

      // Plan file moves
      for (const file of mediaFiles) {
        const targetPath = path.join(targetFolder, file.proposedFilename!);
        plan.moves.push({
          sourcePath: file.originalPath,
          targetPath,
          file,
        });
      }
    }

    // Identify empty source directories for cleanup
    if (options.cleanupEmptyFolders) {
      plan.deletes = this.findEmptyAfterMoves(plan.moves);
    }

    return plan;
  }

  /**
   * Execute the reorganization plan
   */
  async executePlan(
    plan: ReorganizationPlan,
    options: ExecutionOptions,
  ): Promise<ReorganizationResult> {
    const result: ReorganizationResult = {
      createdDirectories: [],
      movedFiles: [],
      deletedDirectories: [],
      errors: [],
    };

    // Create directories
    for (const dir of plan.creates) {
      try {
        await fs.mkdir(dir, { recursive: true });
        result.createdDirectories.push(dir);
      } catch (error) {
        result.errors.push({ path: dir, error: error.message, type: 'create' });
      }
    }

    // Move files
    for (const move of plan.moves) {
      try {
        if (options.dryRun) {
          result.movedFiles.push({ from: move.sourcePath, to: move.targetPath, dryRun: true });
        } else {
          await fs.rename(move.sourcePath, move.targetPath);
          result.movedFiles.push({ from: move.sourcePath, to: move.targetPath, dryRun: false });
        }
      } catch (error) {
        result.errors.push({ path: move.sourcePath, error: error.message, type: 'move' });
      }
    }

    // Delete empty directories
    if (!options.dryRun) {
      for (const dir of plan.deletes) {
        try {
          await fs.rmdir(dir);
          result.deletedDirectories.push(dir);
        } catch (error) {
          // Directory not empty or other error - skip silently
        }
      }
    }

    return result;
  }

  private getTargetFolder(match: MatchResult, rootFolder: string): string {
    switch (match.contentType) {
      case 'series':
      case 'anime': {
        const seriesFolder = `${match.title} (${match.year})`;
        const seasonFolder = match.seasonNumber !== undefined
          ? `Season ${String(match.seasonNumber).padStart(2, '0')}`
          : '';
        return path.join(rootFolder, seriesFolder, seasonFolder);
      }

      case 'movie': {
        const movieFolder = `${match.title} (${match.year})`;
        return path.join(rootFolder, movieFolder);
      }

      default:
        return rootFolder;
    }
  }

  private groupByMedia(files: ParsedFile[]): Map<string, ParsedFile[]> {
    const groups = new Map<string, ParsedFile[]>();

    for (const file of files) {
      if (!file.bestMatch) continue;

      const key = file.bestMatch.externalId;
      const existing = groups.get(key) || [];
      existing.push(file);
      groups.set(key, existing);
    }

    return groups;
  }

  private buildSourceTree(files: ParsedFile[]): FolderNode {
    // Build tree from file paths
    const root: FolderNode = { path: '', name: '', type: 'directory', children: [] };
    // ... implementation
    return root;
  }

  private addFolderToStructure(root: FolderNode, folderPath: string): void {
    // Add folder to tree structure
    // ... implementation
  }

  private findEmptyAfterMoves(moves: FileMove[]): string[] {
    // Find directories that will be empty after moves
    const sourceDirs = new Set<string>();
    for (const move of moves) {
      sourceDirs.add(path.dirname(move.sourcePath));
    }
    // ... check if dirs will be empty
    return Array.from(sourceDirs);
  }
}
```

### Reorganization Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Folder Reorganization Example                            │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE (Unorganized):
/downloads/
├── Breaking.Bad.S01E01.720p.WEB-DL.mkv
├── Breaking.Bad.S01E02.720p.WEB-DL.mkv
├── movies/
│   ├── Oppenheimer.2023.1080p.BluRay.mkv
│   └── Barbie.2023.1080p.WEB-DL.mkv
├── anime/
│   └── [SubsPlease] Demon Slayer - 01.mkv
└── random/
    └── The.Walking.Dead.S11E08.mkv

─────────────────────────────────────────────────────────────────────────────

AFTER (idkarr Organized):
/media/
├── TV Shows/
│   ├── Breaking Bad (2008)/
│   │   └── Season 01/
│   │       ├── Breaking Bad - S01E01 - Pilot [WEB-DL-720p].mkv
│   │       └── Breaking Bad - S01E02 - Cat's in the Bag [WEB-DL-720p].mkv
│   └── The Walking Dead (2010)/
│       └── Season 11/
│           └── The Walking Dead - S11E08 - For Blood [WEB-DL-1080p].mkv
├── Movies/
│   ├── Barbie (2023)/
│   │   └── Barbie (2023) [WEB-DL-1080p].mkv
│   └── Oppenheimer (2023)/
│       └── Oppenheimer (2023) [Bluray-1080p].mkv
└── Anime/
    └── Demon Slayer - Kimetsu no Yaiba (2019)/
        └── Season 01/
            └── Demon Slayer - S01E01 - 001 - Cruelty [WEB-DL-1080p].mkv
```

---

## Conflict Resolution

### Handling Duplicates

```typescript
// core/import/conflicts/resolver.service.ts

export type ConflictResolution =
  | 'skip'           // Skip importing duplicate
  | 'replace'        // Replace existing with new
  | 'keep-both'      // Keep both (add suffix)
  | 'keep-better'    // Keep higher quality
  | 'ask';           // Ask user

export interface Conflict {
  type: 'duplicate-file' | 'duplicate-media' | 'quality-upgrade' | 'edition-variant';
  existingFile: MediaFile;
  newFile: ParsedFile;
  recommendation: ConflictResolution;
  reason: string;
}

export class ConflictResolverService {
  constructor(private config: { defaultResolution: ConflictResolution }) {}

  /**
   * Detect conflicts between new files and existing library
   */
  async detectConflicts(
    files: ParsedFile[],
    existingLibrary: MediaFile[],
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (const file of files) {
      if (!file.bestMatch) continue;

      // Find existing files for the same media
      const existing = existingLibrary.filter(
        f => f.mediaId === file.bestMatch!.mediaId ||
             f.externalId === file.bestMatch!.externalId
      );

      for (const existingFile of existing) {
        const conflict = this.analyzeConflict(file, existingFile);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Analyze a potential conflict between two files
   */
  private analyzeConflict(newFile: ParsedFile, existing: MediaFile): Conflict | null {
    // Same season/episode for series
    if (newFile.bestMatch?.contentType === 'series') {
      const sameEpisode =
        newFile.parsedSeason === existing.seasonNumber &&
        newFile.parsedEpisodes?.some(ep => existing.episodeNumbers?.includes(ep));

      if (!sameEpisode) return null;
    }

    // Compare quality
    const qualityComparison = this.compareQuality(
      newFile.parsedQuality,
      existing.quality,
    );

    // Determine conflict type and recommendation
    if (qualityComparison > 0) {
      return {
        type: 'quality-upgrade',
        existingFile: existing,
        newFile,
        recommendation: 'replace',
        reason: `New file has better quality (${this.formatQuality(newFile.parsedQuality)} vs ${this.formatQuality(existing.quality)})`,
      };
    } else if (qualityComparison < 0) {
      return {
        type: 'duplicate-file',
        existingFile: existing,
        newFile,
        recommendation: 'skip',
        reason: `Existing file has better quality (${this.formatQuality(existing.quality)} vs ${this.formatQuality(newFile.parsedQuality)})`,
      };
    } else {
      // Same quality - check for edition differences
      if (newFile.bestMatch?.edition !== existing.edition) {
        return {
          type: 'edition-variant',
          existingFile: existing,
          newFile,
          recommendation: 'keep-both',
          reason: `Different editions: "${newFile.bestMatch?.edition || 'Standard'}" vs "${existing.edition || 'Standard'}"`,
        };
      }

      return {
        type: 'duplicate-file',
        existingFile: existing,
        newFile,
        recommendation: 'skip',
        reason: 'Identical quality and edition',
      };
    }
  }

  /**
   * Compare quality between two files
   * Returns: positive if a is better, negative if b is better, 0 if equal
   */
  private compareQuality(a: QualityInfo, b: QualityInfo): number {
    // Resolution comparison
    const resolutionDiff = (a.resolution || 0) - (b.resolution || 0);
    if (resolutionDiff !== 0) return resolutionDiff;

    // Source comparison
    const sourceOrder = ['bluray-remux', 'bluray', 'web-dl', 'webrip', 'hdtv', 'dvd', 'unknown'];
    const sourceA = sourceOrder.indexOf(a.source);
    const sourceB = sourceOrder.indexOf(b.source);
    if (sourceA !== sourceB) return sourceB - sourceA;

    // HDR comparison
    const hdrOrder = ['dolby-vision', 'hdr10+', 'hdr10', 'hlg', 'sdr', undefined];
    const hdrA = hdrOrder.indexOf(a.hdr);
    const hdrB = hdrOrder.indexOf(b.hdr);
    if (hdrA !== hdrB) return hdrB - hdrA;

    return 0;
  }

  /**
   * Apply resolution to conflicts
   */
  async resolveConflicts(
    conflicts: Conflict[],
    resolutions: Map<string, ConflictResolution>,
  ): Promise<ResolvedConflict[]> {
    const resolved: ResolvedConflict[] = [];

    for (const conflict of conflicts) {
      const resolution = resolutions.get(conflict.newFile.id) ||
                        conflict.recommendation;

      resolved.push({
        conflict,
        resolution,
        action: this.getAction(conflict, resolution),
      });
    }

    return resolved;
  }

  private getAction(
    conflict: Conflict,
    resolution: ConflictResolution,
  ): ConflictAction {
    switch (resolution) {
      case 'skip':
        return { type: 'skip' };
      case 'replace':
        return { type: 'replace', deleteExisting: true };
      case 'keep-both':
        return { type: 'import', suffix: this.generateSuffix(conflict) };
      case 'keep-better':
        const isBetter = this.compareQuality(
          conflict.newFile.parsedQuality,
          conflict.existingFile.quality,
        ) > 0;
        return isBetter
          ? { type: 'replace', deleteExisting: true }
          : { type: 'skip' };
      default:
        return { type: 'ask' };
    }
  }

  private generateSuffix(conflict: Conflict): string {
    if (conflict.type === 'edition-variant') {
      return conflict.newFile.bestMatch?.edition || 'alt';
    }
    return 'copy';
  }

  private formatQuality(quality: QualityInfo): string {
    return `${quality.source}-${quality.resolution}p`;
  }
}
```

### Conflict Resolution UI Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Conflict Resolution UI                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CONFLICT DETECTED                                                           │
│                                                                             │
│ File: Breaking.Bad.S01E01.2160p.UHD.BluRay.mkv                             │
│                                                                             │
│ ┌─────────────────────────────────────┬────────────────────────────────┐   │
│ │ EXISTING FILE                       │ NEW FILE                        │   │
│ ├─────────────────────────────────────┼────────────────────────────────┤   │
│ │ Breaking Bad - S01E01 - Pilot       │ Breaking.Bad.S01E01.2160p...   │   │
│ │ [Bluray-1080p].mkv                  │                                │   │
│ │                                     │                                │   │
│ │ Resolution: 1080p                   │ Resolution: 2160p              │   │
│ │ Source: Bluray                      │ Source: Bluray                 │   │
│ │ Size: 4.2 GB                        │ Size: 18.7 GB                  │   │
│ │ HDR: No                             │ HDR: HDR10+                    │   │
│ └─────────────────────────────────────┴────────────────────────────────┘   │
│                                                                             │
│ RECOMMENDATION: Replace (New file is higher quality)                        │
│                                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │   Replace    │ │    Skip      │ │  Keep Both   │ │  Ask Later   │       │
│ │  (Delete     │ │  (Keep       │ │  (Import as  │ │              │       │
│ │   existing)  │ │   existing)  │ │   alternate) │ │              │       │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Progress Tracking

### Import Progress UI

```typescript
// core/import/progress/tracker.service.ts

export interface ImportProgress {
  id: string;
  status: ImportStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Scan phase
  scan: {
    status: 'pending' | 'in-progress' | 'complete' | 'error';
    totalFiles: number;
    scannedFiles: number;
    currentFile?: string;
    errors: ScanError[];
  };

  // Match phase
  match: {
    status: 'pending' | 'in-progress' | 'complete' | 'error';
    totalFiles: number;
    matchedFiles: number;
    unmatchedFiles: number;
    currentFile?: string;
  };

  // Import phase
  import: {
    status: 'pending' | 'in-progress' | 'complete' | 'error';
    totalFiles: number;
    importedFiles: number;
    failedFiles: number;
    currentFile?: string;
    errors: ImportError[];
  };

  // Overall
  overall: {
    percentage: number;
    currentPhase: 'scan' | 'match' | 'import' | 'complete';
    estimatedTimeRemaining?: number;  // seconds
  };
}

export type ImportStatus =
  | 'pending'
  | 'scanning'
  | 'matching'
  | 'awaiting-confirmation'
  | 'importing'
  | 'complete'
  | 'error'
  | 'cancelled';

export class ImportProgressTracker {
  private progress: Map<string, ImportProgress> = new Map();
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Create a new import progress tracker
   */
  create(id: string): ImportProgress {
    const progress: ImportProgress = {
      id,
      status: 'pending',
      startedAt: new Date(),
      updatedAt: new Date(),
      scan: {
        status: 'pending',
        totalFiles: 0,
        scannedFiles: 0,
        errors: [],
      },
      match: {
        status: 'pending',
        totalFiles: 0,
        matchedFiles: 0,
        unmatchedFiles: 0,
      },
      import: {
        status: 'pending',
        totalFiles: 0,
        importedFiles: 0,
        failedFiles: 0,
        errors: [],
      },
      overall: {
        percentage: 0,
        currentPhase: 'scan',
      },
    };

    this.progress.set(id, progress);
    return progress;
  }

  /**
   * Update scan progress
   */
  updateScan(id: string, update: Partial<ImportProgress['scan']>): void {
    const progress = this.progress.get(id);
    if (!progress) return;

    Object.assign(progress.scan, update);
    progress.updatedAt = new Date();

    // Calculate overall percentage
    if (progress.scan.totalFiles > 0) {
      const scanPct = (progress.scan.scannedFiles / progress.scan.totalFiles) * 33;
      progress.overall.percentage = Math.round(scanPct);
    }

    this.emit('progress', progress);
  }

  /**
   * Update match progress
   */
  updateMatch(id: string, update: Partial<ImportProgress['match']>): void {
    const progress = this.progress.get(id);
    if (!progress) return;

    Object.assign(progress.match, update);
    progress.updatedAt = new Date();
    progress.overall.currentPhase = 'match';

    // Calculate overall percentage (33-66%)
    if (progress.match.totalFiles > 0) {
      const matchedTotal = progress.match.matchedFiles + progress.match.unmatchedFiles;
      const matchPct = (matchedTotal / progress.match.totalFiles) * 33;
      progress.overall.percentage = Math.round(33 + matchPct);
    }

    this.emit('progress', progress);
  }

  /**
   * Update import progress
   */
  updateImport(id: string, update: Partial<ImportProgress['import']>): void {
    const progress = this.progress.get(id);
    if (!progress) return;

    Object.assign(progress.import, update);
    progress.updatedAt = new Date();
    progress.overall.currentPhase = 'import';

    // Calculate overall percentage (66-100%)
    if (progress.import.totalFiles > 0) {
      const importedTotal = progress.import.importedFiles + progress.import.failedFiles;
      const importPct = (importedTotal / progress.import.totalFiles) * 34;
      progress.overall.percentage = Math.round(66 + importPct);
    }

    this.emit('progress', progress);
  }

  /**
   * Mark import as complete
   */
  complete(id: string): void {
    const progress = this.progress.get(id);
    if (!progress) return;

    progress.status = 'complete';
    progress.completedAt = new Date();
    progress.overall.percentage = 100;
    progress.overall.currentPhase = 'complete';

    this.emit('complete', progress);
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: (progress: ImportProgress) => void): () => void {
    this.eventEmitter.on('progress', callback);
    return () => this.eventEmitter.off('progress', callback);
  }

  private emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }
}
```

### WebSocket Progress Updates

```typescript
// api/websocket/import.ws.ts

export const importWebSocketHandler = {
  /**
   * Handle WebSocket connection for import progress
   */
  connection(ws: WebSocket, importId: string) {
    const tracker = getImportTracker();

    // Send current progress
    const progress = tracker.get(importId);
    if (progress) {
      ws.send(JSON.stringify({
        type: 'import:progress',
        data: progress,
      }));
    }

    // Subscribe to updates
    const unsubscribe = tracker.subscribe((update) => {
      if (update.id === importId) {
        ws.send(JSON.stringify({
          type: 'import:progress',
          data: update,
        }));
      }
    });

    ws.on('close', unsubscribe);
  },
};
```

### Progress UI Component

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Import Progress                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ BULK IMPORT IN PROGRESS                                                     │
│                                                                             │
│ Overall Progress: ████████████████████░░░░░░░░░░░░░░░░░ 47%                │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Phase 1: SCAN                                              COMPLETE  │   │
│ │ ████████████████████████████████████████████████████████████ 100%   │   │
│ │ Scanned 1,247 files in 45 seconds                                   │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Phase 2: MATCH                                            IN PROGRESS│   │
│ │ ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 42%       │   │
│ │ Matching: Breaking.Bad.S01E01.mkv                                   │   │
│ │ Matched: 523 | Unmatched: 12 | Remaining: 712                       │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Phase 3: IMPORT                                             PENDING  │   │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%       │   │
│ │ Waiting for confirmation...                                         │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ Estimated time remaining: ~8 minutes                                        │
│                                                                             │
│ ┌────────────┐ ┌────────────┐                                              │
│ │   Pause    │ │   Cancel   │                                              │
│ └────────────┘ └────────────┘                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Rollback Considerations

### No Undo for Renames

**Important**: Once files are renamed and moved, the operation cannot be automatically undone. This is by design - idkarr treats renames as permanent operations.

```typescript
// core/import/rollback/limitations.ts

/**
 * ROLLBACK LIMITATIONS
 *
 * idkarr does NOT support automatic rollback of import operations because:
 *
 * 1. File moves are atomic OS operations
 * 2. Original filenames are stored in database, not on disk
 * 3. Rollback would require reverse-parsing new names to old names
 * 4. Media servers may have already scanned the new structure
 *
 * WHAT YOU CAN DO:
 *
 * 1. Use dry-run mode to preview changes before executing
 * 2. Use copy-and-import mode to preserve original files
 * 3. Re-scan and re-import if you need to change naming format
 * 4. Export original filename list from database
 */

export interface ImportRecord {
  id: string;
  importedAt: Date;
  originalPath: string;
  originalFilename: string;
  newPath: string;
  newFilename: string;
  mediaId: number;

  // Allows reconstructing original if needed
  parsedMetadata: {
    title: string;
    season?: number;
    episode?: number[];
    quality: QualityInfo;
    releaseGroup?: string;
  };
}

export class ImportHistoryService {
  /**
   * Get import history for a file
   */
  async getHistory(mediaId: number): Promise<ImportRecord[]> {
    return db.query.importHistory.findMany({
      where: eq(importHistory.mediaId, mediaId),
      orderBy: desc(importHistory.importedAt),
    });
  }

  /**
   * Export original filenames
   */
  async exportOriginalNames(mediaId?: number): Promise<string> {
    const records = mediaId
      ? await this.getHistory(mediaId)
      : await db.query.importHistory.findMany();

    return records
      .map(r => `${r.newPath}\t${r.originalFilename}`)
      .join('\n');
  }

  /**
   * Re-scan to apply new naming format
   */
  async rescan(rootFolder: string): Promise<ScanResult> {
    // Scan existing library and regenerate names based on current config
    // This effectively "re-imports" without moving files
  }
}
```

### Recovery Options

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Recovery Options                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Scenario: You want to change your naming format after import

Option 1: RE-SCAN LIBRARY
┌─────────────────────────────────────────────────────────────────────────────┐
│ idkarr can re-scan your library and rename files to match new format.      │
│ Original metadata is preserved in database.                                 │
│                                                                             │
│ Command: Settings > Library > Re-organize Library                           │
└─────────────────────────────────────────────────────────────────────────────┘

Option 2: EXPORT ORIGINAL NAMES
┌─────────────────────────────────────────────────────────────────────────────┐
│ Export a CSV/TSV of all original filenames for manual recovery.            │
│                                                                             │
│ API: GET /api/v3/import/history/export                                      │
│ Output: current_path <TAB> original_filename                                │
└─────────────────────────────────────────────────────────────────────────────┘

Option 3: RESTORE FROM BACKUP
┌─────────────────────────────────────────────────────────────────────────────┐
│ If you used copy-and-import mode, original files still exist.              │
│ Delete idkarr library and start fresh from copies.                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Import API

```typescript
// api/routes/import.routes.ts

/**
 * POST /api/v3/import/scan
 *
 * Start a new import scan
 */
interface ScanRequest {
  paths: string[];
  contentTypeHint?: 'series' | 'movie' | 'anime' | 'auto';
}

interface ScanResponse {
  importId: string;
  status: 'started';
}

/**
 * GET /api/v3/import/:importId/status
 *
 * Get import progress
 */
interface ImportStatusResponse {
  id: string;
  status: ImportStatus;
  progress: ImportProgress;
}

/**
 * GET /api/v3/import/:importId/preview
 *
 * Get import preview (after scan complete)
 */
interface ImportPreviewResponse {
  importId: string;
  matched: ParsedFile[];
  unmatched: ParsedFile[];
  duplicates: DuplicateGroup[];
  conflicts: Conflict[];
  statistics: {
    totalFiles: number;
    matchedCount: number;
    unmatchedCount: number;
    duplicateCount: number;
    conflictCount: number;
  };
}

/**
 * POST /api/v3/import/:importId/confirm
 *
 * Confirm matches and start import
 */
interface ConfirmRequest {
  confirmations: Array<{
    fileId: string;
    action: 'accept' | 'skip' | 'manual';
    selectedMatchIndex?: number;
    manualMatch?: MatchResult;
  }>;
  conflictResolutions: Array<{
    conflictId: string;
    resolution: ConflictResolution;
  }>;
  options: {
    mode: 'import-in-place' | 'import-and-move' | 'copy-and-import';
    destinationRootFolder?: string;
  };
}

interface ConfirmResponse {
  status: 'importing';
  confirmedCount: number;
  skippedCount: number;
}

/**
 * DELETE /api/v3/import/:importId
 *
 * Cancel an import
 */
interface CancelResponse {
  status: 'cancelled';
  filesProcessed: number;
  filesRemaining: number;
}

/**
 * GET /api/v3/import/history
 *
 * Get import history
 */
interface ImportHistoryResponse {
  imports: Array<{
    id: string;
    startedAt: Date;
    completedAt?: Date;
    status: ImportStatus;
    statistics: {
      totalFiles: number;
      importedCount: number;
      failedCount: number;
      skippedCount: number;
    };
  }>;
}

/**
 * GET /api/v3/import/history/export
 *
 * Export original filename mapping
 */
// Returns: text/tab-separated-values
// Format: current_path\toriginal_filename
```

### REST API Documentation

```http
### Start Import Scan
POST /api/v3/import/scan
Content-Type: application/json
X-Api-Key: your-api-key

{
  "paths": ["/downloads/completed", "/media/unsorted"],
  "contentTypeHint": "auto"
}

Response:
{
  "importId": "imp_abc123",
  "status": "started"
}

### Get Import Status
GET /api/v3/import/imp_abc123/status
X-Api-Key: your-api-key

Response:
{
  "id": "imp_abc123",
  "status": "matching",
  "progress": {
    "scan": { "status": "complete", "scannedFiles": 1247 },
    "match": { "status": "in-progress", "matchedFiles": 523, "unmatchedFiles": 12 },
    "import": { "status": "pending" },
    "overall": { "percentage": 47, "currentPhase": "match" }
  }
}

### Get Import Preview
GET /api/v3/import/imp_abc123/preview
X-Api-Key: your-api-key

Response:
{
  "importId": "imp_abc123",
  "matched": [
    {
      "id": "file_001",
      "originalPath": "/downloads/Breaking.Bad.S01E01.mkv",
      "bestMatch": {
        "externalId": "tvdb:81189",
        "title": "Breaking Bad",
        "confidence": 98,
        "seasonNumber": 1,
        "episodeNumbers": [1]
      },
      "proposedPath": "/media/TV Shows/Breaking Bad (2008)/Season 01/",
      "proposedFilename": "Breaking Bad - S01E01 - Pilot [WEB-DL-720p].mkv"
    }
  ],
  "unmatched": [
    {
      "id": "file_999",
      "originalPath": "/downloads/unknown_show.mkv",
      "parsedTitle": "Unknown Show",
      "matches": []
    }
  ],
  "statistics": {
    "totalFiles": 1247,
    "matchedCount": 1235,
    "unmatchedCount": 12
  }
}

### Confirm and Execute Import
POST /api/v3/import/imp_abc123/confirm
Content-Type: application/json
X-Api-Key: your-api-key

{
  "confirmations": [
    { "fileId": "file_001", "action": "accept" },
    { "fileId": "file_002", "action": "accept" },
    { "fileId": "file_999", "action": "skip" }
  ],
  "conflictResolutions": [
    { "conflictId": "conf_001", "resolution": "replace" }
  ],
  "options": {
    "mode": "import-and-move",
    "destinationRootFolder": "/media/TV Shows"
  }
}

Response:
{
  "status": "importing",
  "confirmedCount": 1235,
  "skippedCount": 12
}

### Cancel Import
DELETE /api/v3/import/imp_abc123
X-Api-Key: your-api-key

Response:
{
  "status": "cancelled",
  "filesProcessed": 500,
  "filesRemaining": 735
}

### Export Original Filenames
GET /api/v3/import/history/export?format=tsv
X-Api-Key: your-api-key

Response (text/tab-separated-values):
/media/TV Shows/Breaking Bad (2008)/Season 01/Breaking Bad - S01E01 - Pilot [WEB-DL-720p].mkv	Breaking.Bad.S01E01.720p.WEB-DL.mkv
/media/TV Shows/Breaking Bad (2008)/Season 01/Breaking Bad - S01E02 - Cat's in the Bag [WEB-DL-720p].mkv	Breaking.Bad.S01E02.720p.WEB-DL.mkv
```

### WebSocket Events

```typescript
// WebSocket events for real-time import progress

// Subscribe to import progress
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'import:imp_abc123',
}));

// Progress update event
{
  type: 'import:progress',
  data: {
    id: 'imp_abc123',
    overall: { percentage: 47, currentPhase: 'match' },
    scan: { status: 'complete', scannedFiles: 1247 },
    match: {
      status: 'in-progress',
      matchedFiles: 523,
      currentFile: 'Breaking.Bad.S01E01.mkv'
    }
  }
}

// File imported event
{
  type: 'import:file:complete',
  data: {
    fileId: 'file_001',
    originalPath: '/downloads/Breaking.Bad.S01E01.mkv',
    newPath: '/media/TV Shows/Breaking Bad (2008)/Season 01/Breaking Bad - S01E01 - Pilot [WEB-DL-720p].mkv'
  }
}

// Import complete event
{
  type: 'import:complete',
  data: {
    id: 'imp_abc123',
    statistics: {
      imported: 1235,
      failed: 2,
      skipped: 10
    }
  }
}
```

---

## Related Documents

- [PARSER_SPECIFICATION.md](./PARSER_SPECIFICATION.md) - Release parsing specification
- [FILE_NAMING_RULES.md](./FILE_NAMING_RULES.md) - File naming conventions
- [MIGRATION_GUIDE.md](../06-development/MIGRATION_GUIDE.md) - Database migration from *arr apps
- [REST_API.md](../03-api-specification/REST_API.md) - Complete API documentation
- [WEBSOCKET_EVENTS.md](../03-api-specification/WEBSOCKET_EVENTS.md) - WebSocket event specification

---

*This specification provides comprehensive guidance for importing existing media and migrating from other *arr applications. The rename-on-import philosophy ensures consistent library organization across all content types.*
