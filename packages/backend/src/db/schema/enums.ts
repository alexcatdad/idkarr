// ============================================================================
// Database Enums
// ============================================================================

import { pgEnum } from 'drizzle-orm/pg-core';

// ----------------------------------------------------------------------------
// Media Enums
// ----------------------------------------------------------------------------

export const mediaTypeEnum = pgEnum('media_type', ['series', 'movie', 'anime']);

export const mediaStatusEnum = pgEnum('media_status', [
  'continuing',
  'ended',
  'upcoming',
  'released',
  'deleted',
]);

export const contentTypeEnum = pgEnum('content_type', ['series', 'movie', 'anime', 'mixed']);

// ----------------------------------------------------------------------------
// Quality Enums
// ----------------------------------------------------------------------------

export const qualitySourceEnum = pgEnum('quality_source', [
  'unknown',
  'television',
  'web',
  'webdl',
  'webrip',
  'dvd',
  'bluray',
  'blurayraw',
]);

// ----------------------------------------------------------------------------
// User Enums
// ----------------------------------------------------------------------------

export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'viewer']);

// ----------------------------------------------------------------------------
// Download Enums
// ----------------------------------------------------------------------------

export const downloadProtocolEnum = pgEnum('download_protocol', ['usenet', 'torrent']);

export const queueStatusEnum = pgEnum('queue_status', [
  'queued',
  'downloading',
  'paused',
  'completed',
  'failed',
  'warning',
]);

// ----------------------------------------------------------------------------
// History Enums
// ----------------------------------------------------------------------------

export const historyEventTypeEnum = pgEnum('history_event_type', [
  'grabbed',
  'downloadFolderImported',
  'downloadFailed',
  'episodeFileDeleted',
  'episodeFileRenamed',
  'downloadIgnored',
]);

// ----------------------------------------------------------------------------
// Command Enums
// ----------------------------------------------------------------------------

export const commandStatusEnum = pgEnum('command_status', [
  'queued',
  'started',
  'completed',
  'failed',
]);

export const commandTriggerEnum = pgEnum('command_trigger', [
  'manual',
  'scheduled',
  'system',
  'api',
]);

export const commandPriorityEnum = pgEnum('command_priority', [
  'low',
  'normal',
  'high',
]);
