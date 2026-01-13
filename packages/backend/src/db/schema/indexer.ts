// ============================================================================
// Indexer & Download Client Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { downloadProtocolEnum } from './enums.js';

// ----------------------------------------------------------------------------
// Indexer Table
// ----------------------------------------------------------------------------

export const indexers = pgTable('indexers', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // Newznab, Torznab, etc.
  protocol: downloadProtocolEnum('protocol').notNull(),

  enabled: boolean('enabled').notNull().default(true),
  priority: integer('priority').notNull().default(25),

  // Capabilities
  supportsRss: boolean('supports_rss').notNull().default(true),
  supportsSearch: boolean('supports_search').notNull().default(true),

  // Configuration (implementation-specific)
  fields: jsonb('fields').notNull().default({}),

  // Tags
  tags: integer('tags').array().notNull().default(sql`'{}'::integer[]`),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  enabledIdx: index('indexers_enabled_idx').on(table.enabled),
  protocolIdx: index('indexers_protocol_idx').on(table.protocol),
}));

// ----------------------------------------------------------------------------
// Indexer Status Table (tracks health/failures)
// ----------------------------------------------------------------------------

export const indexerStatus = pgTable('indexer_status', {
  id: serial('id').primaryKey(),

  indexerId: integer('indexer_id').notNull().references(() => indexers.id, { onDelete: 'cascade' }).unique(),

  // Last activity
  lastRssSyncTime: timestamp('last_rss_sync_time', { withTimezone: true }),
  lastSearchTime: timestamp('last_search_time', { withTimezone: true }),

  // Failure tracking
  initialFailure: timestamp('initial_failure', { withTimezone: true }),
  mostRecentFailure: timestamp('most_recent_failure', { withTimezone: true }),
  escalationLevel: integer('escalation_level').notNull().default(0),
  disabledTill: timestamp('disabled_till', { withTimezone: true }),

  // Error info
  lastError: text('last_error'),
});

// ----------------------------------------------------------------------------
// Download Client Table
// ----------------------------------------------------------------------------

export const downloadClients = pgTable('download_clients', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // qBittorrent, SABnzbd, etc.
  protocol: downloadProtocolEnum('protocol').notNull(),

  enabled: boolean('enabled').notNull().default(true),
  priority: integer('priority').notNull().default(25),

  // Behavior
  removeCompletedDownloads: boolean('remove_completed_downloads').notNull().default(true),
  removeFailedDownloads: boolean('remove_failed_downloads').notNull().default(true),

  // Configuration (implementation-specific)
  fields: jsonb('fields').notNull().default({}),

  // Tags
  tags: integer('tags').array().notNull().default(sql`'{}'::integer[]`),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  enabledIdx: index('download_clients_enabled_idx').on(table.enabled),
  protocolIdx: index('download_clients_protocol_idx').on(table.protocol),
}));

// ----------------------------------------------------------------------------
// Download Client Status Table
// ----------------------------------------------------------------------------

export const downloadClientStatus = pgTable('download_client_status', {
  id: serial('id').primaryKey(),

  downloadClientId: integer('download_client_id').notNull().references(() => downloadClients.id, { onDelete: 'cascade' }).unique(),

  // Failure tracking
  initialFailure: timestamp('initial_failure', { withTimezone: true }),
  mostRecentFailure: timestamp('most_recent_failure', { withTimezone: true }),
  escalationLevel: integer('escalation_level').notNull().default(0),
  disabledTill: timestamp('disabled_till', { withTimezone: true }),

  // Error info
  lastError: text('last_error'),
});

// ----------------------------------------------------------------------------
// Notification Table
// ----------------------------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // Discord, Email, Telegram, etc.

  // Triggers
  onGrab: boolean('on_grab').notNull().default(false),
  onDownload: boolean('on_download').notNull().default(false),
  onUpgrade: boolean('on_upgrade').notNull().default(false),
  onImportComplete: boolean('on_import_complete').notNull().default(false),
  onRename: boolean('on_rename').notNull().default(false),
  onMediaAdded: boolean('on_media_added').notNull().default(false),
  onMediaDelete: boolean('on_media_delete').notNull().default(false),
  onHealthIssue: boolean('on_health_issue').notNull().default(false),
  onHealthRestored: boolean('on_health_restored').notNull().default(false),
  onApplicationUpdate: boolean('on_application_update').notNull().default(false),

  // Only send on upgrade
  upgradeOnly: boolean('upgrade_only').notNull().default(false),

  // Configuration
  fields: jsonb('fields').notNull().default({}),

  // Tags
  tags: integer('tags').array().notNull().default(sql`'{}'::integer[]`),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Import List Table
// ----------------------------------------------------------------------------

export const importLists = pgTable('import_lists', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  implementation: text('implementation').notNull(), // Trakt, IMDB, Plex, etc.

  enabled: boolean('enabled').notNull().default(true),
  enableAuto: boolean('enable_auto').notNull().default(true),

  // Defaults for imported media
  qualityProfileId: integer('quality_profile_id').notNull(),
  rootFolderPath: text('root_folder_path').notNull(),
  monitored: boolean('monitored').notNull().default(true),
  searchOnAdd: boolean('search_on_add').notNull().default(true),

  // Configuration
  fields: jsonb('fields').notNull().default({}),

  // Tags to apply
  tags: integer('tags').array().notNull().default(sql`'{}'::integer[]`),

  // Order for processing
  listOrder: integer('list_order').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const indexersRelations = relations(indexers, ({ one }) => ({
  status: one(indexerStatus, {
    fields: [indexers.id],
    references: [indexerStatus.indexerId],
  }),
}));

export const indexerStatusRelations = relations(indexerStatus, ({ one }) => ({
  indexer: one(indexers, {
    fields: [indexerStatus.indexerId],
    references: [indexers.id],
  }),
}));

export const downloadClientsRelations = relations(downloadClients, ({ one }) => ({
  status: one(downloadClientStatus, {
    fields: [downloadClients.id],
    references: [downloadClientStatus.downloadClientId],
  }),
}));

export const downloadClientStatusRelations = relations(downloadClientStatus, ({ one }) => ({
  downloadClient: one(downloadClients, {
    fields: [downloadClientStatus.downloadClientId],
    references: [downloadClients.id],
  }),
}));

export const notificationsRelations = relations(notifications, () => ({}));

export const importListsRelations = relations(importLists, () => ({}));
