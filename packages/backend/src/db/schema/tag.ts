// ============================================================================
// Tag Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ----------------------------------------------------------------------------
// Tag Table
// ----------------------------------------------------------------------------

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),

  // Tag label (e.g., "4K", "Anime", "Kids", "Documentary")
  label: text('label').notNull(),

  // Optional description
  description: text('description'),

  // Color for UI display (hex color code)
  color: text('color'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  labelIdx: unique('tags_label_unique').on(table.label),
}));

// ----------------------------------------------------------------------------
// Tag Details Table (extended metadata for tags)
// ----------------------------------------------------------------------------

export const tagDetails = pgTable('tag_details', {
  id: serial('id').primaryKey(),

  tagId: text('tag_id').notNull(), // Composite key format: "type:id"

  // Denormalized counts for quick access
  mediaCount: text('media_count'), // JSON object with counts by type
  delayProfileCount: text('delay_profile_count'),
  importListCount: text('import_list_count'),
  notificationCount: text('notification_count'),
  releaseProfileCount: text('release_profile_count'),
  indexerCount: text('indexer_count'),
  downloadClientCount: text('download_client_count'),
  autoTagCount: text('auto_tag_count'),

  // Last updated
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tagIdIdx: index('tag_details_tag_id_idx').on(table.tagId),
}));

// ----------------------------------------------------------------------------
// Auto-Tagging Rules Table
// ----------------------------------------------------------------------------

export const autoTagRules = pgTable('auto_tag_rules', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),

  // Tags to apply when rule matches
  tagIds: text('tag_ids').array().notNull(), // Array of tag IDs

  // Rule conditions (JSON structure for flexibility)
  // e.g., { "type": "genre", "value": "Anime" }
  // e.g., { "type": "year", "operator": ">=", "value": 2020 }
  conditions: text('conditions').notNull(), // JSON array of conditions

  // Match mode
  matchAll: text('match_all').notNull().default('true'), // 'true' = AND, 'false' = OR

  // Enabled
  enabled: text('enabled').notNull().default('true'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const tagsRelations = relations(tags, () => ({
  // Tags are referenced via integer arrays in other tables
  // No direct foreign key relations needed
}));

export const autoTagRulesRelations = relations(autoTagRules, () => ({
  // Referenced via tag IDs in conditions
}));
