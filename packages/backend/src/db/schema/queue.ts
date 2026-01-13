// ============================================================================
// Queue & History Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  bigint,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { queueStatusEnum, downloadProtocolEnum, historyEventTypeEnum } from './enums.js';
import { media, episodes } from './media.js';

// ----------------------------------------------------------------------------
// Queue Table
// ----------------------------------------------------------------------------

export interface QueueQualityInfo {
  quality: {
    id: number;
    name: string;
    source: string;
    resolution: number | null;
  };
  revision: {
    version: number;
    real: number;
    isRepack: boolean;
  };
}

export interface QueueCustomFormat {
  id: number;
  name: string;
  score: number;
}

export const queue = pgTable('queue', {
  id: serial('id').primaryKey(),

  // References
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'set null' }),

  // Download info
  title: text('title').notNull(),
  status: queueStatusEnum('status').notNull().default('queued'),
  protocol: downloadProtocolEnum('protocol').notNull(),

  // Size
  size: bigint('size', { mode: 'number' }).notNull(),
  sizeleft: bigint('sizeleft', { mode: 'number' }).notNull(),

  // Quality
  quality: jsonb('quality').$type<QueueQualityInfo>().notNull(),
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),
  customFormats: jsonb('custom_formats').$type<QueueCustomFormat[]>().notNull().default([]),
  customFormatScore: integer('custom_format_score').notNull().default(0),

  // Timing
  estimatedCompletionTime: timestamp('estimated_completion_time', { withTimezone: true }),

  // Source
  indexer: text('indexer').notNull(),
  downloadClient: text('download_client').notNull(),
  downloadId: text('download_id').notNull(),

  // Error handling
  errorMessage: text('error_message'),
  trackedDownloadStatus: text('tracked_download_status'), // ok, warning, error
  trackedDownloadState: text('tracked_download_state'), // downloading, importing, importPending, failedPending

  // Import info
  outputPath: text('output_path'),

  // Timestamps
  added: timestamp('added', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('queue_media_idx').on(table.mediaId),
  episodeIdx: index('queue_episode_idx').on(table.episodeId),
  statusIdx: index('queue_status_idx').on(table.status),
  downloadIdIdx: index('queue_download_id_idx').on(table.downloadId),
}));

// ----------------------------------------------------------------------------
// History Table
// ----------------------------------------------------------------------------

export interface HistoryData {
  indexer?: string;
  releaseGroup?: string;
  nzbInfoUrl?: string;
  downloadClient?: string;
  downloadId?: string;
  message?: string;
  reason?: string;
  droppedPath?: string;
  importedPath?: string;
  [key: string]: unknown;
}

export const history = pgTable('history', {
  id: serial('id').primaryKey(),

  // References
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'set null' }),

  // Event info
  eventType: historyEventTypeEnum('event_type').notNull(),
  sourceTitle: text('source_title').notNull(),

  // Quality
  quality: jsonb('quality').$type<QueueQualityInfo>().notNull(),
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),
  customFormats: jsonb('custom_formats').$type<QueueCustomFormat[]>().notNull().default([]),
  customFormatScore: integer('custom_format_score').notNull().default(0),

  // Event-specific data
  data: jsonb('data').$type<HistoryData>().notNull().default({}),

  // Download info
  downloadId: text('download_id'),

  // Timestamp
  date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('history_media_idx').on(table.mediaId),
  episodeIdx: index('history_episode_idx').on(table.episodeId),
  eventTypeIdx: index('history_event_type_idx').on(table.eventType),
  dateIdx: index('history_date_idx').on(table.date),
  downloadIdIdx: index('history_download_id_idx').on(table.downloadId),
}));

// ----------------------------------------------------------------------------
// Blocklist Table
// ----------------------------------------------------------------------------

export const blocklist = pgTable('blocklist', {
  id: serial('id').primaryKey(),

  // References
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  episodeIds: integer('episode_ids').array().notNull().default(sql`'{}'::integer[]`),

  // What was blocked
  sourceTitle: text('source_title').notNull(),
  protocol: downloadProtocolEnum('protocol').notNull(),
  indexer: text('indexer').notNull(),

  // Why it was blocked
  message: text('message'),

  // Quality
  quality: jsonb('quality').$type<QueueQualityInfo>(),
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),
  customFormats: jsonb('custom_formats').$type<QueueCustomFormat[]>().notNull().default([]),

  // Timestamps
  date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('blocklist_media_idx').on(table.mediaId),
  sourceTitleIdx: index('blocklist_source_title_idx').on(table.sourceTitle),
  dateIdx: index('blocklist_date_idx').on(table.date),
}));

// ----------------------------------------------------------------------------
// Pending Release Table (for delay profiles)
// ----------------------------------------------------------------------------

export const pendingReleases = pgTable('pending_releases', {
  id: serial('id').primaryKey(),

  // References
  mediaId: integer('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  episodeId: integer('episode_id').references(() => episodes.id, { onDelete: 'set null' }),

  // Release info
  title: text('title').notNull(),
  protocol: downloadProtocolEnum('protocol').notNull(),
  indexerId: integer('indexer_id').notNull(),

  // Quality
  quality: jsonb('quality').$type<QueueQualityInfo>().notNull(),
  languages: text('languages').array().notNull().default(sql`'{}'::text[]`),
  customFormats: jsonb('custom_formats').$type<QueueCustomFormat[]>().notNull().default([]),
  customFormatScore: integer('custom_format_score').notNull().default(0),

  // Size
  size: bigint('size', { mode: 'number' }).notNull(),

  // Release data (for re-grabbing)
  releaseData: jsonb('release_data').notNull(),

  // Timing
  added: timestamp('added', { withTimezone: true }).notNull().defaultNow(),
  releaseDate: timestamp('release_date', { withTimezone: true }).notNull(),

  // Reason for pending
  reason: text('reason').notNull(), // delay, pending_quality_upgrade
}, (table) => ({
  mediaIdx: index('pending_releases_media_idx').on(table.mediaId),
  releaseDateIdx: index('pending_releases_release_date_idx').on(table.releaseDate),
}));

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const queueRelations = relations(queue, ({ one }) => ({
  media: one(media, {
    fields: [queue.mediaId],
    references: [media.id],
  }),
  episode: one(episodes, {
    fields: [queue.episodeId],
    references: [episodes.id],
  }),
}));

export const historyRelations = relations(history, ({ one }) => ({
  media: one(media, {
    fields: [history.mediaId],
    references: [media.id],
  }),
  episode: one(episodes, {
    fields: [history.episodeId],
    references: [episodes.id],
  }),
}));

export const blocklistRelations = relations(blocklist, ({ one }) => ({
  media: one(media, {
    fields: [blocklist.mediaId],
    references: [media.id],
  }),
}));

export const pendingReleasesRelations = relations(pendingReleases, ({ one }) => ({
  media: one(media, {
    fields: [pendingReleases.mediaId],
    references: [media.id],
  }),
  episode: one(episodes, {
    fields: [pendingReleases.episodeId],
    references: [episodes.id],
  }),
}));
