// ============================================================================
// idkarr Shared Zod Schemas
// ============================================================================

import { z } from 'zod';

// ----------------------------------------------------------------------------
// Pagination Schemas
// ----------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ----------------------------------------------------------------------------
// ID Schemas
// ----------------------------------------------------------------------------

export const idSchema = z.coerce.number().int().positive();

export const idsSchema = z.array(idSchema).min(1);

// ----------------------------------------------------------------------------
// Media Schemas
// ----------------------------------------------------------------------------

export const mediaTypeSchema = z.enum(['series', 'movie', 'anime']);

export const mediaStatusSchema = z.enum(['continuing', 'ended', 'upcoming', 'released', 'deleted']);

export const addMediaSchema = z.object({
  instanceId: idSchema,
  mediaType: mediaTypeSchema,

  // External ID (at least one required)
  tvdbId: z.number().int().positive().optional(),
  tmdbId: z.number().int().positive().optional(),
  imdbId: z.string().regex(/^tt\d{7,}$/).optional(),

  // Settings
  qualityProfileId: idSchema,
  rootFolderPath: z.string().min(1),
  monitored: z.boolean().default(true),
  tags: z.array(idSchema).default([]),

  // Add options
  addOptions: z.object({
    searchForMissingEpisodes: z.boolean().default(false),
    searchForCutoffUnmetEpisodes: z.boolean().default(false),
    monitor: z.enum(['all', 'future', 'missing', 'existing', 'pilot', 'firstSeason', 'none']).default('all'),
  }).optional(),
}).refine(
  data => data.tvdbId !== undefined || data.tmdbId !== undefined || data.imdbId !== undefined,
  { message: 'At least one external ID (tvdbId, tmdbId, or imdbId) is required' }
);

export type AddMediaInput = z.infer<typeof addMediaSchema>;

export const updateMediaSchema = z.object({
  monitored: z.boolean().optional(),
  qualityProfileId: idSchema.optional(),
  path: z.string().min(1).optional(),
  tags: z.array(idSchema).optional(),
});

export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export const mediaFilterSchema = z.object({
  instanceId: idSchema.optional(),
  mediaType: mediaTypeSchema.optional(),
  monitored: z.coerce.boolean().optional(),
  status: mediaStatusSchema.optional(),
  tags: z.string().transform(s => s.split(',').map(Number).filter(n => !isNaN(n))).optional(),
}).merge(paginationSchema);

export type MediaFilterInput = z.infer<typeof mediaFilterSchema>;

// ----------------------------------------------------------------------------
// Episode Schemas
// ----------------------------------------------------------------------------

export const updateEpisodeSchema = z.object({
  monitored: z.boolean().optional(),
});

export type UpdateEpisodeInput = z.infer<typeof updateEpisodeSchema>;

export const episodeFilterSchema = z.object({
  mediaId: idSchema.optional(),
  seasonNumber: z.coerce.number().int().min(0).optional(),
  monitored: z.coerce.boolean().optional(),
  hasFile: z.coerce.boolean().optional(),
}).merge(paginationSchema);

export type EpisodeFilterInput = z.infer<typeof episodeFilterSchema>;

// ----------------------------------------------------------------------------
// Quality Profile Schemas
// ----------------------------------------------------------------------------

export const qualityProfileItemSchema = z.object({
  quality: idSchema.nullable(),
  allowed: z.boolean(),
});

export const createQualityProfileSchema = z.object({
  name: z.string().min(1).max(100),
  upgradeAllowed: z.boolean().default(true),
  cutoff: idSchema,
  items: z.array(qualityProfileItemSchema).min(1),
  minFormatScore: z.number().int().default(0),
  cutoffFormatScore: z.number().int().default(0),
});

export type CreateQualityProfileInput = z.infer<typeof createQualityProfileSchema>;

// ----------------------------------------------------------------------------
// Instance Schemas
// ----------------------------------------------------------------------------

export const contentTypeSchema = z.enum(['series', 'movie', 'anime', 'mixed']);

export const instanceSettingsSchema = z.object({
  rssSyncInterval: z.number().int().min(10).max(1440).default(60),
  searchOnAdd: z.boolean().default(true),
  seasonFolder: z.boolean().default(true),
});

export const createInstanceSchema = z.object({
  name: z.string().min(1).max(100),
  contentType: contentTypeSchema,
  defaultQualityProfileId: idSchema.optional(),
  defaultRootFolderId: idSchema.optional(),
  settings: instanceSettingsSchema.optional(),
});

export type CreateInstanceInput = z.infer<typeof createInstanceSchema>;

export const updateInstanceSchema = createInstanceSchema.partial();

export type UpdateInstanceInput = z.infer<typeof updateInstanceSchema>;

// ----------------------------------------------------------------------------
// User Schemas
// ----------------------------------------------------------------------------

export const userRoleSchema = z.enum(['admin', 'user', 'viewer']);

export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: userRoleSchema.default('user'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  role: userRoleSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ----------------------------------------------------------------------------
// Auth Schemas
// ----------------------------------------------------------------------------

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totp: z.string().length(6).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// ----------------------------------------------------------------------------
// Search Schemas
// ----------------------------------------------------------------------------

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  mediaId: idSchema.optional(),
  episodeId: idSchema.optional(),
  seasonNumber: z.coerce.number().int().min(0).optional(),
  indexerIds: z.string().transform(s => s.split(',').map(Number).filter(n => !isNaN(n))).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

// ----------------------------------------------------------------------------
// Queue Schemas
// ----------------------------------------------------------------------------

export const queueFilterSchema = z.object({
  instanceId: idSchema.optional(),
  status: z.enum(['queued', 'downloading', 'paused', 'completed', 'failed', 'warning']).optional(),
  protocol: z.enum(['usenet', 'torrent']).optional(),
}).merge(paginationSchema);

export type QueueFilterInput = z.infer<typeof queueFilterSchema>;

// ----------------------------------------------------------------------------
// Indexer Schemas
// ----------------------------------------------------------------------------

export const indexerProtocolSchema = z.enum(['usenet', 'torrent']);

export const createIndexerSchema = z.object({
  name: z.string().min(1).max(100),
  implementation: z.string().min(1),
  protocol: indexerProtocolSchema,
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(50).default(25),
  fields: z.record(z.unknown()).default({}),
  tags: z.array(idSchema).default([]),
});

export type CreateIndexerInput = z.infer<typeof createIndexerSchema>;

export const updateIndexerSchema = createIndexerSchema.partial();

export type UpdateIndexerInput = z.infer<typeof updateIndexerSchema>;

// ----------------------------------------------------------------------------
// Download Client Schemas
// ----------------------------------------------------------------------------

export const downloadProtocolSchema = z.enum(['usenet', 'torrent']);

export const createDownloadClientSchema = z.object({
  name: z.string().min(1).max(100),
  implementation: z.string().min(1),
  protocol: downloadProtocolSchema,
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(50).default(25),
  removeCompletedDownloads: z.boolean().default(true),
  removeFailedDownloads: z.boolean().default(true),
  fields: z.record(z.unknown()).default({}),
  tags: z.array(idSchema).default([]),
});

export type CreateDownloadClientInput = z.infer<typeof createDownloadClientSchema>;

export const updateDownloadClientSchema = createDownloadClientSchema.partial();

export type UpdateDownloadClientInput = z.infer<typeof updateDownloadClientSchema>;

// ----------------------------------------------------------------------------
// Tag Schemas
// ----------------------------------------------------------------------------

export const createTagSchema = z.object({
  label: z.string().min(1).max(50),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// ----------------------------------------------------------------------------
// Root Folder Schemas
// ----------------------------------------------------------------------------

export const createRootFolderSchema = z.object({
  instanceId: idSchema,
  path: z.string().min(1),
});

export type CreateRootFolderInput = z.infer<typeof createRootFolderSchema>;

// ----------------------------------------------------------------------------
// Command Schemas
// ----------------------------------------------------------------------------

export const commandNameSchema = z.enum([
  'RefreshMedia',
  'RescanMedia',
  'SearchMedia',
  'RssSync',
  'ApplicationUpdate',
  'Backup',
  'MissingEpisodeSearch',
  'CutoffUnmetEpisodeSearch',
]);

export const commandSchema = z.object({
  name: commandNameSchema,
  mediaIds: z.array(idSchema).optional(),
  episodeIds: z.array(idSchema).optional(),
});

export type CommandInput = z.infer<typeof commandSchema>;
