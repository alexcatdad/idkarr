// ============================================================================
// Command & Scheduled Task Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { commandStatusEnum, commandTriggerEnum, commandPriorityEnum } from './enums.js';

// ----------------------------------------------------------------------------
// Command Table (represents queued/running/completed commands)
// ----------------------------------------------------------------------------

export const commands = pgTable('commands', {
  id: serial('id').primaryKey(),

  name: text('name').notNull(), // e.g., "RefreshSeries", "RssSyncAll", "SearchMissing"

  // Status tracking
  status: commandStatusEnum('status').notNull().default('queued'),
  priority: commandPriorityEnum('priority').notNull().default('normal'),

  // Trigger source
  trigger: commandTriggerEnum('trigger').notNull().default('manual'),

  // Command body (type-specific parameters)
  body: jsonb('body').notNull().default({}),

  // Progress tracking
  message: text('message'), // Current status message

  // Timing
  queued: timestamp('queued', { withTimezone: true }).notNull().defaultNow(),
  started: timestamp('started', { withTimezone: true }),
  ended: timestamp('ended', { withTimezone: true }),

  // Duration in milliseconds
  duration: integer('duration'),

  // Error info if failed
  exception: text('exception'),

  // State checkpointing for long-running commands
  stateChangeTime: timestamp('state_change_time', { withTimezone: true }).notNull().defaultNow(),
  lastExecutionTime: timestamp('last_execution_time', { withTimezone: true }),

  // Send updates to clients
  sendUpdatesToClient: boolean('send_updates_to_client').notNull().default(true),
  updateScheduledTask: boolean('update_scheduled_task').notNull().default(true),

  // Client-specific identifier
  clientUserAgent: text('client_user_agent'),
}, (table) => ({
  statusIdx: index('commands_status_idx').on(table.status),
  nameIdx: index('commands_name_idx').on(table.name),
  queuedIdx: index('commands_queued_idx').on(table.queued),
}));

// ----------------------------------------------------------------------------
// Scheduled Task Table (recurring tasks)
// ----------------------------------------------------------------------------

export const scheduledTasks = pgTable('scheduled_tasks', {
  id: serial('id').primaryKey(),

  // Task identifier (maps to command name)
  name: text('name').notNull().unique(),
  taskName: text('task_name').notNull(), // Display name

  // Schedule (cron expression or interval)
  interval: integer('interval').notNull(), // In minutes

  // Execution tracking
  lastExecution: timestamp('last_execution', { withTimezone: true }),
  lastStartTime: timestamp('last_start_time', { withTimezone: true }),
  lastDuration: integer('last_duration'), // In milliseconds

  // Enabled
  enabled: boolean('enabled').notNull().default(true),

  // Priority
  priority: commandPriorityEnum('priority').notNull().default('normal'),
});

// ----------------------------------------------------------------------------
// Update History Table (for tracking updates/migrations)
// ----------------------------------------------------------------------------

export const updateHistory = pgTable('update_history', {
  id: serial('id').primaryKey(),

  version: text('version').notNull(),
  date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),

  // Update type
  eventType: text('event_type').notNull(), // 'update', 'migration', 'rollback'

  // Details
  previousVersion: text('previous_version'),
  message: text('message'),
});

// ----------------------------------------------------------------------------
// System Configuration Table (app-wide settings)
// ----------------------------------------------------------------------------

export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),

  key: text('key').notNull().unique(),
  value: text('value').notNull(),

  // Type hint for parsing
  valueType: text('value_type').notNull().default('string'), // string, number, boolean, json

  // Metadata
  description: text('description'),
  isSecret: boolean('is_secret').notNull().default(false),

  // Timestamps
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Log Entry Table (for persistent logging)
// ----------------------------------------------------------------------------

export const logs = pgTable('logs', {
  id: serial('id').primaryKey(),

  // Log level
  level: text('level').notNull(), // debug, info, warn, error

  // Logger name (component)
  logger: text('logger').notNull(),

  // Message and exception
  message: text('message').notNull(),
  exception: text('exception'),
  exceptionType: text('exception_type'),

  // Timestamp
  time: timestamp('time', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  timeIdx: index('logs_time_idx').on(table.time),
  levelIdx: index('logs_level_idx').on(table.level),
  loggerIdx: index('logs_logger_idx').on(table.logger),
}));

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const commandsRelations = relations(commands, () => ({}));
export const scheduledTasksRelations = relations(scheduledTasks, () => ({}));
export const updateHistoryRelations = relations(updateHistory, () => ({}));
export const systemConfigRelations = relations(systemConfig, () => ({}));
export const logsRelations = relations(logs, () => ({}));
