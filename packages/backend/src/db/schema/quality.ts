// ============================================================================
// Quality Profile Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { qualitySourceEnum } from './enums.js';

// ----------------------------------------------------------------------------
// Quality Definition Table
// ----------------------------------------------------------------------------

export const qualityDefinitions = pgTable('quality_definitions', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),
  title: text('title').notNull(),
  source: qualitySourceEnum('source').notNull(),
  resolution: integer('resolution'), // null for unknown

  // Size limits (MB per minute)
  minSize: text('min_size'), // Using text for decimal precision
  maxSize: text('max_size'),
  preferredSize: text('preferred_size'),

  // Display order
  weight: integer('weight').notNull().default(0),
});

// ----------------------------------------------------------------------------
// Quality Profile Types
// ----------------------------------------------------------------------------

export interface QualityProfileItem {
  id: number | null;
  name: string | null;
  quality: number | null;
  items: QualityProfileItem[];
  allowed: boolean;
}

export interface FormatItem {
  format: number;
  score: number;
}

// ----------------------------------------------------------------------------
// Quality Profile Table
// ----------------------------------------------------------------------------

export const qualityProfiles = pgTable('quality_profiles', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),
  upgradeAllowed: boolean('upgrade_allowed').notNull().default(true),
  cutoff: integer('cutoff').notNull(),

  // Quality items (hierarchical)
  items: jsonb('items').$type<QualityProfileItem[]>().notNull().default([]),

  // Custom format scoring
  minFormatScore: integer('min_format_score').notNull().default(0),
  cutoffFormatScore: integer('cutoff_format_score').notNull().default(0),
  formatItems: jsonb('format_items').$type<FormatItem[]>().notNull().default([]),
});

// ----------------------------------------------------------------------------
// Custom Format Table
// ----------------------------------------------------------------------------

export interface CustomFormatSpecification {
  id: number;
  name: string;
  implementation: string;
  negate: boolean;
  required: boolean;
  fields: Record<string, unknown>;
}

export const customFormats = pgTable('custom_formats', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),
  includeCustomFormatWhenRenaming: boolean('include_custom_format_when_renaming').notNull().default(false),

  specifications: jsonb('specifications').$type<CustomFormatSpecification[]>().notNull().default([]),
});

// ----------------------------------------------------------------------------
// Delay Profile Table
// ----------------------------------------------------------------------------

export const delayProfiles = pgTable('delay_profiles', {
  id: serial('id').primaryKey(),

  enableUsenet: boolean('enable_usenet').notNull().default(true),
  enableTorrent: boolean('enable_torrent').notNull().default(true),

  preferredProtocol: text('preferred_protocol').notNull().default('usenet'), // usenet, torrent

  usenetDelay: integer('usenet_delay').notNull().default(0), // minutes
  torrentDelay: integer('torrent_delay').notNull().default(0), // minutes

  bypassIfHighestQuality: boolean('bypass_if_highest_quality').notNull().default(true),
  bypassIfAboveCustomFormatScore: boolean('bypass_if_above_custom_format_score').notNull().default(false),
  minimumCustomFormatScore: integer('minimum_custom_format_score').notNull().default(0),

  // Order for evaluation
  order: integer('order').notNull().default(2147483647),

  // Tags (empty = applies to all)
  tags: integer('tags').array().notNull().default([]),
});

// ----------------------------------------------------------------------------
// Release Profile Table (for preferred words/must contain/must not contain)
// ----------------------------------------------------------------------------

export const releaseProfiles = pgTable('release_profiles', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(),
  enabled: boolean('enabled').notNull().default(true),

  // Required terms (must contain at least one)
  required: text('required').array().notNull().default([]),

  // Ignored terms (will be rejected)
  ignored: text('ignored').array().notNull().default([]),

  // Preferred terms with scores
  preferred: jsonb('preferred').$type<Array<{ term: string; score: number }>>().notNull().default([]),

  includePreferredWhenRenaming: boolean('include_preferred_when_renaming').notNull().default(false),

  // Indexer restriction (empty = all indexers)
  indexerId: integer('indexer_id'),

  // Tags
  tags: integer('tags').array().notNull().default([]),
});

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const qualityDefinitionsRelations = relations(qualityDefinitions, () => ({}));

export const qualityProfilesRelations = relations(qualityProfiles, () => ({}));

export const customFormatsRelations = relations(customFormats, () => ({}));

export const delayProfilesRelations = relations(delayProfiles, () => ({}));

export const releaseProfilesRelations = relations(releaseProfiles, () => ({}));

// Note: Cross-table relations (like qualityProfiles -> media) are defined in relations.ts
