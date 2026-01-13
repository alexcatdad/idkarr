// ============================================================================
// idkarr Shared Types
// ============================================================================

// ----------------------------------------------------------------------------
// Media Types
// ----------------------------------------------------------------------------

export type MediaType = 'series' | 'movie' | 'anime';
export type MediaStatus = 'continuing' | 'ended' | 'upcoming' | 'released' | 'deleted';
export type ContentType = 'series' | 'movie' | 'anime' | 'mixed';

export interface Media {
  id: number;
  instanceId: number;
  mediaType: MediaType;

  // External IDs
  tvdbId: number | null;
  tmdbId: number | null;
  imdbId: string | null;

  // Core
  title: string;
  sortTitle: string;
  originalTitle: string | null;
  status: MediaStatus;
  overview: string | null;

  // Metadata
  year: number | null;
  runtime: number | null; // minutes
  genres: string[];
  network: string | null;

  // Settings
  monitored: boolean;
  qualityProfileId: number;
  path: string;
  rootFolderPath: string;

  // Images
  posterUrl: string | null;
  fanartUrl: string | null;
  bannerUrl: string | null;

  // Timestamps
  added: Date;
  lastInfoSync: Date | null;

  // Tags
  tags: number[];
}

export interface Episode {
  id: number;
  mediaId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber: number | null;

  title: string;
  overview: string | null;
  airDate: Date | null;
  airDateUtc: Date | null;

  hasFile: boolean;
  monitored: boolean;

  episodeFileId: number | null;
}

export interface Season {
  id: number;
  mediaId: number;
  seasonNumber: number;
  monitored: boolean;
  statistics: SeasonStatistics | null;
}

export interface SeasonStatistics {
  episodeCount: number;
  episodeFileCount: number;
  percentOfEpisodes: number;
  sizeOnDisk: number;
}

export interface MediaFile {
  id: number;
  mediaId: number;
  seasonNumber: number | null;
  episodeIds: number[];

  relativePath: string;
  path: string;
  size: number;
  dateAdded: Date;

  quality: QualityInfo;
  languages: string[];

  mediaInfo: MediaInfo | null;
}

export interface MediaInfo {
  videoCodec: string | null;
  videoBitrate: number | null;
  videoResolution: string | null;
  audioBitrate: number | null;
  audioChannels: number | null;
  audioCodec: string | null;
  runTime: string | null;
}

// ----------------------------------------------------------------------------
// Quality Types
// ----------------------------------------------------------------------------

export type QualitySource = 'unknown' | 'television' | 'web' | 'webdl' | 'webrip' | 'dvd' | 'bluray' | 'blurayraw';

export interface QualityDefinition {
  id: number;
  name: string;
  source: QualitySource;
  resolution: number | null;
  minSize: number | null;
  maxSize: number | null;
}

export interface QualityInfo {
  quality: QualityDefinition;
  revision: {
    version: number;
    real: number;
    isRepack: boolean;
  };
}

export interface QualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: QualityProfileItem[];
  minFormatScore: number;
  cutoffFormatScore: number;
  formatItems: FormatItem[];
}

export interface QualityProfileItem {
  id: number | null;
  name: string | null;
  quality: QualityDefinition | null;
  items: QualityProfileItem[];
  allowed: boolean;
}

export interface FormatItem {
  format: number;
  score: number;
}

// ----------------------------------------------------------------------------
// Custom Format Types
// ----------------------------------------------------------------------------

export interface CustomFormat {
  id: number;
  name: string;
  includeCustomFormatWhenRenaming: boolean;
  specifications: CustomFormatSpecification[];
}

export interface CustomFormatSpecification {
  id: number;
  name: string;
  implementation: string;
  negate: boolean;
  required: boolean;
  fields: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Instance Types
// ----------------------------------------------------------------------------

export interface Instance {
  id: number;
  name: string;
  contentType: ContentType;
  enabled: boolean;

  defaultQualityProfileId: number | null;
  defaultRootFolderId: number | null;

  settings: InstanceSettings;

  createdAt: Date;
  updatedAt: Date;
}

export interface InstanceSettings {
  rssSyncInterval: number; // minutes
  searchOnAdd: boolean;
  seasonFolder: boolean;
}

// ----------------------------------------------------------------------------
// User & Auth Types
// ----------------------------------------------------------------------------

export type UserRole = 'admin' | 'user' | 'viewer';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;

  avatarUrl: string | null;

  twoFactorEnabled: boolean;

  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

export interface ApiKey {
  id: number;
  userId: number;
  name: string;
  keyPrefix: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// ----------------------------------------------------------------------------
// Queue Types
// ----------------------------------------------------------------------------

export type QueueStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'warning';
export type DownloadProtocol = 'usenet' | 'torrent';

export interface QueueItem {
  id: number;
  mediaId: number;
  episodeId: number | null;

  title: string;
  status: QueueStatus;
  protocol: DownloadProtocol;

  quality: QualityInfo;
  languages: string[];
  customFormats: CustomFormat[];
  customFormatScore: number;

  size: number;
  sizeleft: number;

  estimatedCompletionTime: Date | null;

  indexer: string;
  downloadClient: string;
  downloadId: string;

  errorMessage: string | null;

  added: Date;
}

// ----------------------------------------------------------------------------
// History Types
// ----------------------------------------------------------------------------

export type HistoryEventType =
  | 'grabbed'
  | 'downloadFolderImported'
  | 'downloadFailed'
  | 'episodeFileDeleted'
  | 'episodeFileRenamed'
  | 'downloadIgnored';

export interface HistoryItem {
  id: number;
  mediaId: number;
  episodeId: number | null;

  eventType: HistoryEventType;
  sourceTitle: string;

  quality: QualityInfo;
  languages: string[];
  customFormats: CustomFormat[];
  customFormatScore: number;

  date: Date;

  data: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Indexer Types
// ----------------------------------------------------------------------------

export type IndexerProtocol = 'usenet' | 'torrent';

export interface Indexer {
  id: number;
  name: string;
  implementation: string;
  protocol: IndexerProtocol;

  enabled: boolean;
  priority: number;

  supportsRss: boolean;
  supportsSearch: boolean;

  fields: Record<string, unknown>;
  tags: number[];
}

// ----------------------------------------------------------------------------
// Download Client Types
// ----------------------------------------------------------------------------

export interface DownloadClient {
  id: number;
  name: string;
  implementation: string;
  protocol: DownloadProtocol;

  enabled: boolean;
  priority: number;

  removeCompletedDownloads: boolean;
  removeFailedDownloads: boolean;

  fields: Record<string, unknown>;
  tags: number[];
}

// ----------------------------------------------------------------------------
// Notification Types
// ----------------------------------------------------------------------------

export interface Notification {
  id: number;
  name: string;
  implementation: string;

  onGrab: boolean;
  onDownload: boolean;
  onUpgrade: boolean;
  onImportComplete: boolean;
  onHealthIssue: boolean;
  onApplicationUpdate: boolean;

  fields: Record<string, unknown>;
  tags: number[];
}

// ----------------------------------------------------------------------------
// Tag Types
// ----------------------------------------------------------------------------

export interface Tag {
  id: number;
  label: string;
}

// ----------------------------------------------------------------------------
// Root Folder Types
// ----------------------------------------------------------------------------

export interface RootFolder {
  id: number;
  instanceId: number;
  path: string;
  freeSpace: number | null;
  totalSpace: number | null;
  unmappedFolders: UnmappedFolder[];
}

export interface UnmappedFolder {
  name: string;
  path: string;
}

// ----------------------------------------------------------------------------
// API Response Types
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

// ----------------------------------------------------------------------------
// WebSocket Event Types
// ----------------------------------------------------------------------------

export type WebSocketEventType =
  | 'queue:added'
  | 'queue:updated'
  | 'queue:removed'
  | 'media:added'
  | 'media:updated'
  | 'media:deleted'
  | 'episode:updated'
  | 'episode:imported'
  | 'health:updated'
  | 'system:status';

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp: number;
}
