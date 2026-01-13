// ============================================================================
// Root Folder Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  bigint,
  boolean,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './enums.js';
import { instances } from './instance.js';

// ----------------------------------------------------------------------------
// Root Folder Table
// ----------------------------------------------------------------------------

export const rootFolders = pgTable('root_folders', {
  id: serial('id').primaryKey(),

  // Instance scoping
  instanceId: integer('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),

  // Path and naming
  path: text('path').notNull(),
  name: text('name'), // Optional friendly name

  // Content type (movies, series, etc.)
  contentType: contentTypeEnum('content_type').notNull(),

  // Default settings for new media in this folder
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultMetadataProfileId: integer('default_metadata_profile_id'),

  // Status
  accessible: boolean('accessible').notNull().default(true),

  // Space tracking
  freeSpace: bigint('free_space', { mode: 'number' }),
  totalSpace: bigint('total_space', { mode: 'number' }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  instanceIdx: index('root_folders_instance_idx').on(table.instanceId),
  contentTypeIdx: index('root_folders_content_type_idx').on(table.contentType),
  pathIdx: index('root_folders_path_idx').on(table.path),
}));

// ----------------------------------------------------------------------------
// Unmapped Folder Table (folders found but not matched to media)
// ----------------------------------------------------------------------------

export const unmappedFolders = pgTable('unmapped_folders', {
  id: serial('id').primaryKey(),

  rootFolderId: integer('root_folder_id').notNull().references(() => rootFolders.id, { onDelete: 'cascade' }),

  path: text('path').notNull(),
  relativePath: text('relative_path').notNull(),

  // Suggested matches (from metadata lookup)
  suggestedTvdbId: integer('suggested_tvdb_id'),
  suggestedTmdbId: integer('suggested_tmdb_id'),
  suggestedImdbId: text('suggested_imdb_id'),

  // Status
  lastScanned: timestamp('last_scanned', { withTimezone: true }).notNull().defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  rootFolderIdx: index('unmapped_folders_root_folder_idx').on(table.rootFolderId),
}));

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const rootFoldersRelations = relations(rootFolders, ({ one, many }) => ({
  instance: one(instances, {
    fields: [rootFolders.instanceId],
    references: [instances.id],
  }),
  unmappedFolders: many(unmappedFolders),
}));

export const unmappedFoldersRelations = relations(unmappedFolders, ({ one }) => ({
  rootFolder: one(rootFolders, {
    fields: [unmappedFolders.rootFolderId],
    references: [rootFolders.id],
  }),
}));
