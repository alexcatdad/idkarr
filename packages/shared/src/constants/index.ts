// ============================================================================
// idkarr Shared Constants
// ============================================================================

// ----------------------------------------------------------------------------
// Quality Definitions
// ----------------------------------------------------------------------------

export const QUALITY_DEFINITIONS = {
  UNKNOWN: { id: 0, name: 'Unknown', title: 'Unknown', source: 'unknown', resolution: 0, weight: 0, minSize: null, maxSize: null, preferredSize: null },
  SDTV: { id: 1, name: 'SDTV', title: 'SDTV', source: 'television', resolution: 480, weight: 1, minSize: 0, maxSize: 100, preferredSize: 50 },
  DVD: { id: 2, name: 'DVD', title: 'DVD', source: 'dvd', resolution: 480, weight: 2, minSize: 0, maxSize: 100, preferredSize: 50 },
  WEBDL_480P: { id: 8, name: 'WEBDL-480p', title: 'WEBDL 480p', source: 'webdl', resolution: 480, weight: 3, minSize: 0, maxSize: 100, preferredSize: 50 },
  HDTV_720P: { id: 4, name: 'HDTV-720p', title: 'HDTV 720p', source: 'television', resolution: 720, weight: 4, minSize: 0, maxSize: 125, preferredSize: 75 },
  WEBDL_720P: { id: 5, name: 'WEBDL-720p', title: 'WEBDL 720p', source: 'webdl', resolution: 720, weight: 5, minSize: 0, maxSize: 125, preferredSize: 75 },
  WEBRIP_720P: { id: 14, name: 'WEBRip-720p', title: 'WEBRip 720p', source: 'webrip', resolution: 720, weight: 6, minSize: 0, maxSize: 125, preferredSize: 75 },
  BLURAY_720P: { id: 6, name: 'Bluray-720p', title: 'Bluray 720p', source: 'bluray', resolution: 720, weight: 7, minSize: 0, maxSize: 125, preferredSize: 75 },
  HDTV_1080P: { id: 9, name: 'HDTV-1080p', title: 'HDTV 1080p', source: 'television', resolution: 1080, weight: 8, minSize: 0, maxSize: 175, preferredSize: 100 },
  WEBDL_1080P: { id: 3, name: 'WEBDL-1080p', title: 'WEBDL 1080p', source: 'webdl', resolution: 1080, weight: 9, minSize: 0, maxSize: 175, preferredSize: 100 },
  WEBRIP_1080P: { id: 15, name: 'WEBRip-1080p', title: 'WEBRip 1080p', source: 'webrip', resolution: 1080, weight: 10, minSize: 0, maxSize: 175, preferredSize: 100 },
  BLURAY_1080P: { id: 7, name: 'Bluray-1080p', title: 'Bluray 1080p', source: 'bluray', resolution: 1080, weight: 11, minSize: 0, maxSize: 175, preferredSize: 100 },
  BLURAY_1080P_REMUX: { id: 20, name: 'Bluray-1080p Remux', title: 'Bluray 1080p Remux', source: 'blurayraw', resolution: 1080, weight: 12, minSize: 0, maxSize: 400, preferredSize: 250 },
  HDTV_2160P: { id: 16, name: 'HDTV-2160p', title: 'HDTV 2160p', source: 'television', resolution: 2160, weight: 13, minSize: 0, maxSize: 350, preferredSize: 200 },
  WEBDL_2160P: { id: 18, name: 'WEBDL-2160p', title: 'WEBDL 2160p', source: 'webdl', resolution: 2160, weight: 14, minSize: 0, maxSize: 350, preferredSize: 200 },
  WEBRIP_2160P: { id: 17, name: 'WEBRip-2160p', title: 'WEBRip 2160p', source: 'webrip', resolution: 2160, weight: 15, minSize: 0, maxSize: 350, preferredSize: 200 },
  BLURAY_2160P: { id: 19, name: 'Bluray-2160p', title: 'Bluray 2160p', source: 'bluray', resolution: 2160, weight: 16, minSize: 0, maxSize: 350, preferredSize: 200 },
  BLURAY_2160P_REMUX: { id: 21, name: 'Bluray-2160p Remux', title: 'Bluray 2160p Remux', source: 'blurayraw', resolution: 2160, weight: 17, minSize: 0, maxSize: 800, preferredSize: 500 },
} as const;

export const QUALITY_IDS = Object.values(QUALITY_DEFINITIONS).map(q => q.id);

// ----------------------------------------------------------------------------
// Languages
// ----------------------------------------------------------------------------

export const LANGUAGES = {
  UNKNOWN: { id: 0, name: 'Unknown', iso: null },
  ENGLISH: { id: 1, name: 'English', iso: 'en' },
  FRENCH: { id: 2, name: 'French', iso: 'fr' },
  SPANISH: { id: 3, name: 'Spanish', iso: 'es' },
  GERMAN: { id: 4, name: 'German', iso: 'de' },
  ITALIAN: { id: 5, name: 'Italian', iso: 'it' },
  DANISH: { id: 6, name: 'Danish', iso: 'da' },
  DUTCH: { id: 7, name: 'Dutch', iso: 'nl' },
  JAPANESE: { id: 8, name: 'Japanese', iso: 'ja' },
  ICELANDIC: { id: 9, name: 'Icelandic', iso: 'is' },
  CHINESE: { id: 10, name: 'Chinese', iso: 'zh' },
  RUSSIAN: { id: 11, name: 'Russian', iso: 'ru' },
  POLISH: { id: 12, name: 'Polish', iso: 'pl' },
  VIETNAMESE: { id: 13, name: 'Vietnamese', iso: 'vi' },
  SWEDISH: { id: 14, name: 'Swedish', iso: 'sv' },
  NORWEGIAN: { id: 15, name: 'Norwegian', iso: 'no' },
  FINNISH: { id: 16, name: 'Finnish', iso: 'fi' },
  TURKISH: { id: 17, name: 'Turkish', iso: 'tr' },
  PORTUGUESE: { id: 18, name: 'Portuguese', iso: 'pt' },
  FLEMISH: { id: 19, name: 'Flemish', iso: 'nl' },
  GREEK: { id: 20, name: 'Greek', iso: 'el' },
  KOREAN: { id: 21, name: 'Korean', iso: 'ko' },
  HUNGARIAN: { id: 22, name: 'Hungarian', iso: 'hu' },
  HEBREW: { id: 23, name: 'Hebrew', iso: 'he' },
  LITHUANIAN: { id: 24, name: 'Lithuanian', iso: 'lt' },
  CZECH: { id: 25, name: 'Czech', iso: 'cs' },
  HINDI: { id: 26, name: 'Hindi', iso: 'hi' },
  ROMANIAN: { id: 27, name: 'Romanian', iso: 'ro' },
  THAI: { id: 28, name: 'Thai', iso: 'th' },
  BULGARIAN: { id: 29, name: 'Bulgarian', iso: 'bg' },
  ARABIC: { id: 31, name: 'Arabic', iso: 'ar' },
  UKRAINIAN: { id: 32, name: 'Ukrainian', iso: 'uk' },
  PERSIAN: { id: 33, name: 'Persian', iso: 'fa' },
  BENGALI: { id: 34, name: 'Bengali', iso: 'bn' },
  SLOVAK: { id: 35, name: 'Slovak', iso: 'sk' },
  LATVIAN: { id: 36, name: 'Latvian', iso: 'lv' },
  ORIGINAL: { id: -2, name: 'Original', iso: null },
} as const;

// ----------------------------------------------------------------------------
// Default Quality Profiles
// ----------------------------------------------------------------------------

export const DEFAULT_QUALITY_PROFILES = [
  {
    name: 'Any',
    cutoff: QUALITY_DEFINITIONS.WEBDL_1080P.id,
    items: Object.values(QUALITY_DEFINITIONS).map(q => ({ quality: q.id, allowed: true })),
    upgradeAllowed: true,
  },
  {
    name: 'SD',
    cutoff: QUALITY_DEFINITIONS.DVD.id,
    items: [
      { quality: QUALITY_DEFINITIONS.SDTV.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.DVD.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBDL_480P.id, allowed: true },
    ],
    upgradeAllowed: true,
  },
  {
    name: 'HD-720p',
    cutoff: QUALITY_DEFINITIONS.BLURAY_720P.id,
    items: [
      { quality: QUALITY_DEFINITIONS.HDTV_720P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBDL_720P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBRIP_720P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.BLURAY_720P.id, allowed: true },
    ],
    upgradeAllowed: true,
  },
  {
    name: 'HD-1080p',
    cutoff: QUALITY_DEFINITIONS.BLURAY_1080P.id,
    items: [
      { quality: QUALITY_DEFINITIONS.HDTV_1080P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBDL_1080P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBRIP_1080P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.BLURAY_1080P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.BLURAY_1080P_REMUX.id, allowed: true },
    ],
    upgradeAllowed: true,
  },
  {
    name: 'Ultra-HD',
    cutoff: QUALITY_DEFINITIONS.BLURAY_2160P.id,
    items: [
      { quality: QUALITY_DEFINITIONS.HDTV_2160P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBDL_2160P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.WEBRIP_2160P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.BLURAY_2160P.id, allowed: true },
      { quality: QUALITY_DEFINITIONS.BLURAY_2160P_REMUX.id, allowed: true },
    ],
    upgradeAllowed: true,
  },
];

// ----------------------------------------------------------------------------
// Default Roles & Permissions
// ----------------------------------------------------------------------------

export const DEFAULT_ROLES = [
  {
    name: 'Admin',
    priority: 100,
    permissions: ['*'], // All permissions
  },
  {
    name: 'User',
    priority: 50,
    permissions: [
      'media:read',
      'media:create',
      'media:update',
      'queue:read',
      'queue:create',
      'history:read',
      'calendar:read',
      'search:read',
      'profile:read',
      'profile:update',
    ],
  },
  {
    name: 'Viewer',
    priority: 10,
    permissions: [
      'media:read',
      'queue:read',
      'history:read',
      'calendar:read',
      'profile:read',
    ],
  },
] as const;

export const PERMISSIONS = [
  // Media
  'media:read',
  'media:create',
  'media:update',
  'media:delete',

  // Queue
  'queue:read',
  'queue:create',
  'queue:delete',

  // History
  'history:read',
  'history:delete',

  // Calendar
  'calendar:read',

  // Search
  'search:read',

  // Settings
  'settings:read',
  'settings:update',

  // Users
  'users:read',
  'users:create',
  'users:update',
  'users:delete',

  // System
  'system:read',
  'system:update',
  'system:logs',
  'system:backup',

  // Profile
  'profile:read',
  'profile:update',

  // Indexers
  'indexers:read',
  'indexers:create',
  'indexers:update',
  'indexers:delete',

  // Download Clients
  'downloadclients:read',
  'downloadclients:create',
  'downloadclients:update',
  'downloadclients:delete',

  // Notifications
  'notifications:read',
  'notifications:create',
  'notifications:update',
  'notifications:delete',
] as const;

// ----------------------------------------------------------------------------
// HTTP Status Codes
// ----------------------------------------------------------------------------

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ----------------------------------------------------------------------------
// Error Codes
// ----------------------------------------------------------------------------

export const ERROR_CODES = {
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMITED: 'RATE_LIMITED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  INVALID_TWO_FACTOR: 'INVALID_TWO_FACTOR',

  // Media
  MEDIA_NOT_FOUND: 'MEDIA_NOT_FOUND',
  MEDIA_ALREADY_EXISTS: 'MEDIA_ALREADY_EXISTS',
  INVALID_PATH: 'INVALID_PATH',
  PATH_NOT_ACCESSIBLE: 'PATH_NOT_ACCESSIBLE',

  // Queue
  QUEUE_ITEM_NOT_FOUND: 'QUEUE_ITEM_NOT_FOUND',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',

  // Indexer
  INDEXER_NOT_FOUND: 'INDEXER_NOT_FOUND',
  INDEXER_CONNECTION_FAILED: 'INDEXER_CONNECTION_FAILED',
  INDEXER_AUTH_FAILED: 'INDEXER_AUTH_FAILED',

  // Download Client
  DOWNLOAD_CLIENT_NOT_FOUND: 'DOWNLOAD_CLIENT_NOT_FOUND',
  DOWNLOAD_CLIENT_CONNECTION_FAILED: 'DOWNLOAD_CLIENT_CONNECTION_FAILED',

  // External API
  TVDB_API_ERROR: 'TVDB_API_ERROR',
  TMDB_API_ERROR: 'TMDB_API_ERROR',
} as const;

// ----------------------------------------------------------------------------
// Limits
// ----------------------------------------------------------------------------

export const LIMITS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_SEARCH_RESULTS: 100,
  MAX_QUEUE_ITEMS: 1000,
  MAX_HISTORY_DAYS: 365,
  MAX_API_KEYS_PER_USER: 10,
  SESSION_DURATION_DAYS: 30,
  API_KEY_LENGTH: 32,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
} as const;

// ----------------------------------------------------------------------------
// Timeouts (in milliseconds)
// ----------------------------------------------------------------------------

export const TIMEOUTS = {
  API_REQUEST: 30_000,
  INDEXER_REQUEST: 60_000,
  DOWNLOAD_CLIENT_REQUEST: 30_000,
  METADATA_REQUEST: 30_000,
  HEALTH_CHECK: 5_000,
} as const;

// ----------------------------------------------------------------------------
// Cache TTLs (in seconds)
// ----------------------------------------------------------------------------

export const CACHE_TTL = {
  USER_PERMISSIONS: 300, // 5 minutes
  QUALITY_PROFILES: 3600, // 1 hour
  INDEXER_CAPS: 3600, // 1 hour
  METADATA: 3600, // 1 hour
  SEARCH_RESULTS: 300, // 5 minutes
} as const;
