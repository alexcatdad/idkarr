// ============================================================================
// Media Schema (Unified: Series, Movies, Anime)
// ============================================================================

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  bigint,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { mediaTypeEnum, mediaStatusEnum } from './enums.js';
import { instances } from './instance.js';
import { qualityProfiles } from './quality.js';

// ----------------------------------------------------------------------------
// Media Table (Series, Movies, Anime)
// ----------------------------------------------------------------------------

export const media = pgTable('media', {
  id: serial('id').primaryKey(),

  // Instance relationship
  instanceId: integer('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),

  // Type discriminator
  mediaType: mediaTypeEnum('media_type').notNull(),

  // External IDs
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  imdbId: text('imdb_id'),

  // Core fields
  title: text('title').notNull(),
  sortTitle: text('sort_title').notNull(),
  originalTitle: text('original_title'),
  cleanTitle: text('clean_title').notNull(), // Normalized for matching
  status: mediaStatusEnum('status').notNull().default('continuing'),

  // Metadata
  overview: text('overview'),
  year: integer('year'),
  runtime: integer('runtime'), // minutes
  genres: text('genres').array().notNull().default(sql`'{}'::text[]`),
  network: text('network'), // TV network or studio
  certification: text('certification'), // TV rating or movie rating

  // For series
  airTime: text('air_time'), // e.g., "21:00"
  firstAired: date('first_aired'),
  lastAired: date('last_aired'),

  // For movies
  inCinemas: date('in_cinemas'),
  physicalRelease: date('physical_release'),
  digitalRelease: date('digital_release'),

  // Settings
  monitored: boolean('monitored').notNull().default(false),
  qualityProfileId: integer('quality_profile_id').notNull().references(() => qualityProfiles.id),
  path: text('path').notNull(),
  rootFolderPath: text('root_folder_path').notNull(),

  // Series-specific settings
  seasonFolder: boolean('season_folder').notNull().default(true),
  useSceneNumbering: boolean('use_scene_numbering').notNull().default(false),
  monitorNewItems: text('monitor_new_items').notNull().default('all'), // all, none

  // Images
  posterUrl: text('poster_url'),
  fanartUrl: text('fanart_url'),
  bannerUrl: text('banner_url'),

  // Statistics (denormalized for performance)
  episodeCount: integer('episode_count').notNull().default(0),
  episodeFileCount: integer('episode_file_count').notNull().default(0),
  sizeOnDisk: bigint('size_on_disk', { mode: 'number' }).notNull().default(0),

  // Tags (stored as array of tag IDs)
  tags: integer('tags').array().notNull().default(sql`'{}'::integer[]`),

  // Timestamps
  added: timestamp('added', { withTimezone: true }).notNull().defaultNow(),
  lastInfoSync: timestamp('last_info_sync', { withTimezone: true }),
  lastSearched: timestamp('last_searched', { withTimezone: true }),
}, (table) => ({
  instanceIdx: index('media_instance_idx').on(table.instanceId),
  mediaTypeIdx: index('media_type_idx').on(table.mediaType),
  tvdbIdx: uniqueIndex('media_tvdb_idx').on(table.tvdbId).where(sql`${table.tvdbId} IS NOT NULL`),
  tmdbIdx: uniqueIndex('media_tmdb_idx').on(table.tmdbId).where(sql`${table.tmdbId} IS NOT NULL`),
  imdbIdx: index('media_imdb_idx').on(table.imdbId),
  titleIdx: index('media_title_idx').on(table.title),
  sortTitleIdx: index('media_sort_title_idx').on(table.sortTitle),
  cleanTitleIdx: index('media_clean_title_idx').on(table.cleanTitle),
  pathIdx: uniqueIndex('media_path_idx').on(table.path),
  monitoredIdx: index('media_monitored_idx').on(table.monitored),
  statusIdx: index('media_status_idx').on(table.status),
}));

// ----------------------------------------------------------------------------
// Season Table
// ----------------------------------------------------------------------------

export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),

  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  seasonNumber: integer('season_number').notNull(),

  monitored: boolean('monitored').notNull().default(true),

  // Statistics
  episodeCount: integer('episode_count').notNull().default(0),
  episodeFileCount: integer('episode_file_count').notNull().default(0),
  sizeOnDisk: bigint('size_on_disk', { mode: 'number' }).notNull().default(0),
  percentOfEpisodes: integer('percent_of_episodes').notNull().default(0),
}, (table) => ({
  mediaSeasonIdx: uniqueIndex('seasons_media_season_idx').on(table.mediaId, table.seasonNumber),
}));

// ----------------------------------------------------------------------------
// Episode Table
// ----------------------------------------------------------------------------

export const episodes = pgTable('episodes', {
  id: serial('id').primaryKey(),

  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  seasonNumber: integer('season_number').notNull(),
  episodeNumber: integer('episode_number').notNull(),

  // For anime
  absoluteEpisodeNumber: integer('absolute_episode_number'),
  sceneSeasonNumber: integer('scene_season_number'),
  sceneEpisodeNumber: integer('scene_episode_number'),
  sceneAbsoluteEpisodeNumber: integer('scene_absolute_episode_number'),

  // Metadata
  title: text('title').notNull().default('TBA'),
  overview: text('overview'),
  airDate: date('air_date'),
  airDateUtc: timestamp('air_date_utc', { withTimezone: true }),
  runtime: integer('runtime'), // minutes

  // Status
  hasFile: boolean('has_file').notNull().default(false),
  monitored: boolean('monitored').notNull().default(true),
  unverifiedSceneNumbering: boolean('unverified_scene_numbering').notNull().default(false),

  // File reference
  episodeFileId: integer('episode_file_id'),

  // Timestamps
  lastSearched: timestamp('last_searched', { withTimezone: true }),
}, (table) => ({
  mediaIdx: index('episodes_media_idx').on(table.mediaId),
  mediaSeasonEpisodeIdx: uniqueIndex('episodes_media_season_episode_idx')
    .on(table.mediaId, table.seasonNumber, table.episodeNumber),
  airDateIdx: index('episodes_air_date_idx').on(table.airDate),
  monitoredIdx: index('episodes_monitored_idx').on(table.monitored),
  hasFileIdx: index('episodes_has_file_idx').on(table.hasFile),
}));

// ----------------------------------------------------------------------------
// Media File Table
// ----------------------------------------------------------------------------

export interface MediaInfo {
  videoCodec: string | null;
  videoBitrate: number | null;
  videoBitDepth: number | null;
  videoResolution: string | null;
  videoDynamicRange: string | null;
  videoFps: number | null;
  audioBitrate: number | null;
  audioChannels: number | null;
  audioCodec: string | null;
  audioLanguages: string[];
  subtitles: string[];
  runTime: string | null;
  scanType: string | null;
}

export const mediaFiles = pgTable('media_files', {
  id: serial('id').primaryKey(),

  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  seasonNumber: integer('season_number'),

  // For multi-episode files
  episodeIds: integer('episode_ids').array().notNull().default(sql`'{}'::integer[]`),

  // File info
  relativePath: text('relative_path').notNull(),
  path: text('path').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),

  // Quality
  qualityId: integer('quality_id').notNull(),
  qualityRevisionVersion: integer('quality_revision_version').notNull().default(1),
  qualityRevisionReal: integer('quality_revision_real').notNull().default(0),
  qualityRevisionIsRepack: boolean('quality_revision_is_repack').notNull().default(false),

  // Languages
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),

  // Media info (from ffprobe)
  mediaInfo: jsonb('media_info').$type<MediaInfo>(),

  // Release info
  releaseGroup: text('release_group'),
  releaseHash: text('release_hash'),
  sceneName: text('scene_name'),

  // Timestamps
  dateAdded: timestamp('date_added', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('media_files_media_idx').on(table.mediaId),
  pathIdx: uniqueIndex('media_files_path_idx').on(table.path),
}));

// ----------------------------------------------------------------------------
// Alternate Titles Table
// ----------------------------------------------------------------------------

export const alternateTitles = pgTable('alternate_titles', {
  id: serial('id').primaryKey(),

  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  cleanTitle: text('clean_title').notNull(),

  // For scene mappings
  seasonNumber: integer('season_number'),
  sceneSeasonNumber: integer('scene_season_number'),

  // Source info
  sourceType: text('source_type'), // tvdb, tmdb, scene
  sourceId: integer('source_id'),
}, (table) => ({
  mediaIdx: index('alternate_titles_media_idx').on(table.mediaId),
  cleanTitleIdx: index('alternate_titles_clean_title_idx').on(table.cleanTitle),
}));

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const mediaRelations = relations(media, ({ one, many }) => ({
  instance: one(instances, {
    fields: [media.instanceId],
    references: [instances.id],
  }),
  qualityProfile: one(qualityProfiles, {
    fields: [media.qualityProfileId],
    references: [qualityProfiles.id],
  }),
  seasons: many(seasons),
  episodes: many(episodes),
  files: many(mediaFiles),
  alternateTitles: many(alternateTitles),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  media: one(media, {
    fields: [seasons.mediaId],
    references: [media.id],
  }),
  episodes: many(episodes),
}));

export const episodesRelations = relations(episodes, ({ one }) => ({
  media: one(media, {
    fields: [episodes.mediaId],
    references: [media.id],
  }),
  file: one(mediaFiles, {
    fields: [episodes.episodeFileId],
    references: [mediaFiles.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  media: one(media, {
    fields: [mediaFiles.mediaId],
    references: [media.id],
  }),
}));

export const alternateTitlesRelations = relations(alternateTitles, ({ one }) => ({
  media: one(media, {
    fields: [alternateTitles.mediaId],
    references: [media.id],
  }),
}));
