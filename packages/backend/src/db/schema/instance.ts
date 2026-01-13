// ============================================================================
// Instance Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { contentTypeEnum } from './enums.js';

// ----------------------------------------------------------------------------
// Instance Settings Type
// ----------------------------------------------------------------------------

export interface InstanceSettings {
  rssSyncInterval: number; // minutes, default 60
  searchOnAdd: boolean;
  seasonFolder: boolean;
}

// ----------------------------------------------------------------------------
// Instance Table
// ----------------------------------------------------------------------------

export const instances = pgTable('instances', {
  id: serial('id').primaryKey(),

  // Basic info
  name: text('name').notNull(),
  contentType: contentTypeEnum('content_type').notNull(),
  enabled: boolean('enabled').notNull().default(true),

  // Default settings
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultRootFolderId: integer('default_root_folder_id'),

  // Instance-specific settings
  settings: jsonb('settings').$type<InstanceSettings>().notNull().default({
    rssSyncInterval: 60,
    searchOnAdd: true,
    seasonFolder: true,
  }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('instances_name_idx').on(table.name),
  contentTypeIdx: index('instances_content_type_idx').on(table.contentType),
}));

// Note: Relations are defined in relations.ts to avoid circular imports
