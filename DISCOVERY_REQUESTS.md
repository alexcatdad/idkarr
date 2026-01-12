# idkarr Discovery & Requests System (Unified Overseerr)

---

## Problem Statement

### Current Separation (Sonarr + Radarr + Overseerr)

**Sonarr/Radarr** (Media Management):
- Add and manage TV series/movies
- Configure quality profiles and download clients
- Search and download releases
- Organize files on disk
- Monitor for missing episodes/movies

**Overseerr** (Discovery & Requests):
- Browse trending, popular, upcoming content
- Request TV shows/movies
- Track watched status via Plex/Jellyfin/Emby
- User profiles and watchlists
- Social features (recommendations, voting)
- Request approval workflow

**Why Overseerr is Currently Separate:**
1. **Different focus**: Overseerr focuses on user discovery and social features
2. **Plex/Jellyfin/Emby integration**: Overseerr is designed primarily for media server integration
3. **User-centric**: Overseerr provides user profiles, watchlists, social features
4. **Request workflow**: Overseerr mediates requests between users and Sonarr/Radarr

### Why Unification Makes Sense

**Shared Data Sources (100% overlap):**
- TMDB for movie metadata
- TVDB for TV metadata
- Same search functionality
- Same trending/popular APIs
- Same genre, year, rating filters

**Redundant Functionality:**
- Duplicate user management (Overseerr has its own users, Sonarr has API keys)
- Duplicate authentication (separate logins for Overseerr and Sonarr/Radarr)
- Duplicate configuration (need to connect Overseerr to Sonarr/Radarr APIs)
- Duplicate quality profiles (users care about quality in both apps)
- Separate databases (no shared state between Overseerr and Sonarr/Radarr)

**User Experience Issues:**
- Three separate applications (Sonarr + Radarr + Overseerr)
- Three separate logins (or complex SSO setup)
- Request workflow is disconnected (Overseerr → Sonarr/Radarr → Download → Plex → Overseerr)
- No unified view of library + requests + discovery
- Discovery features hidden in separate app

**Technical Debt:**
- Overseerr duplicates ~80% of Sonarr/Radarr's data fetching and metadata logic
- Overseerr's request system is just a thin API wrapper around Sonarr/Radarr
- Separate databases with no shared queries
- Separate caching strategies (duplicate TMDB/TVDB API calls)

---

## Unified Architecture

### idkarr - Complete Media Platform

```
┌─────────────────────────────────────────────────────────────┐
│                      idkarr (Complete)                      │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              User Experience Layer                    │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │ Library  │  │Discovery │  │ Requests │         │  │
│  │  │          │  │          │  │          │         │  │
│  │  │ - My TV  │  │ - Trending│  │ - Pending │         │  │
│  │  │ - My     │  │ - Popular │  │ - Approved│         │  │
│  │  │   Movies │  │ - Upcoming│  │ - Denied  │         │  │
│  │  │ - Anime  │  │ - Similar │  │ - History │         │  │
│  │  └──────────┘  └──────────┘  └──────────┘         │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │  │
│  │  │ Calendar │  │ Activity  │  │ Profile  │         │  │
│  │  │          │  │          │  │          │         │  │
│  │  │ - Upcoming│  │ - Recent  │  │ - Watched │         │  │
│  │  │ - History │  │ - Requests│  │ - History │         │  │
│  │  │ - Airing  │  │ - Downloads│ │ - Stats   │         │  │
│  │  └──────────┘  └──────────┘  └──────────┘         │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│        ┌──────────────────┼──────────────────┐            │
│        │                  │                  │            │
┌───────▼─────────┐ ┌──────▼─────────┐ ┌──────▼──────────┐ │
│  Media Manager  │ │  Discovery     │ │  Request        │ │
│  (Sonarr/Radarr)│ │  (Overseerr)   │ │  System         │ │
│                 │ │                 │ │                 │ │
│ • Add Media     │ │ • Search       │ │ • Create        │ │
│ • Downloads     │ │ • Browse       │ │ • Approve       │ │
│ • Queue         │ │ • Trending     │ │ • Deny          │ │
│ • History       │ │ • Similar      │ │ • Auto-approve  │ │
│ • File Mgmt     │ │ • Discovery    │ │ • Notify        │ │
└─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                           │                                 │
│        ┌──────────────────┼──────────────────┐            │
│        │                  │                  │            │
┌───────▼─────────┐ ┌──────▼─────────┐ ┌──────▼──────────┐ │
│  Shared Core    │ │  Shared Core    │ │  Shared Core    │ │
│                 │ │                 │ │                 │ │
│ • Metadata      │ │ • User Auth     │ │ • Notifications│ │
│   (TVDB/TMDB)   │ │ • ACL           │ │ • WebSockets   │ │
│ • Indexers      │ │ • Profiles      │ │ • Activity     │ │
│ • Quality       │ │ • Watchlists    │ │   Feed          │ │
│ • Custom        │ │ • Stats         │ │                 │ │
│   Formats       │ │                 │ │                 │ │
└─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│  Postgres DB  │  │  Redis Cache  │  │ BullMQ Queue │
└───────────────┘  └───────────────┘  └───────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Media Server Integration                        │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │   Plex    │  │ Jellyfin │  │   Emby   │               │
│  │           │  │          │  │          │               │
│  │ - Watched  │  │ - Watched │  │ - Watched │             │
│  │   Status   │  │   Status  │  │   Status  │             │
│  │ - Library  │  │ - Library  │  │ - Library  │             │
│  │   Sync     │  │   Sync    │  │   Sync    │             │
│  └──────────┘  └──────────┘  └──────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. **Unified User System**
- Single authentication/authorization for all features
- User profiles include: watched status, watchlists, request history
- ACL system controls who can request, approve, manage

#### 2. **Discovery as First-Class Feature**
- Discovery tab integrated into main UI (not separate app)
- Trending, popular, upcoming from TMDB/TVDB
- Similar content recommendations
- Genre and year browsing

#### 3. **Native Request System**
- Users can request any TV show, movie, or anime
- Requests go to unified queue with approval workflow
- Auto-approval based on user permissions
- Notifications when request is approved/completed

#### 4. **Media Server Integration**
- Optional integration with Plex/Jellyfin/Emby
- Sync watched status from media server
- Update request status when watched
- Sync library to idkarr (auto-add what's on media server)

#### 5. **Activity Feed**
- Unified activity feed showing downloads, requests, watches
- Real-time updates via WebSockets
- Filterable by user, media type, activity type

---

## Database Schema

### User Profile Extensions

```typescript
// backend/db/schema/user.schema.ts (extended)

import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['admin', 'moderator', 'user', 'viewer', 'api-user']);

export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  
  // Authentication
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  
  // Profile
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatar: text('avatar'),
  bio: text('bio'), // User bio/description
  
  // Status
  status: text('status').notNull().default('pending'),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLogin: timestamp('last_login'),
  lastActive: timestamp('last_active'),
  
  // Discovery/Requests settings
  enableAutoApprove: boolean('enable_auto_approve').notNull().default(false),
  requestLimit: integer('request_limit'), // Max concurrent requests (null = unlimited)
  requestCount: integer('request_count').notNull().default(0), // Current active requests
  
  // Plex/Jellyfin/Emby integration
  plexUsername: text('plex_username'),
  plexToken: text('plex_token'), // Encrypted
  jellyfinUserId: text('jellyfin_user_id'),
  embyUserId: text('emby_user_id'),
  
  // Preferences
  language: text('language').notNull().default('en'),
  timezone: text('timezone').notNull().default('UTC'),
  theme: text('theme').notNull().default('dark'),
  dateFormat: text('date_format').notNull().default('YYYY-MM-DD'),
  timeFormat: text('time_format').notNull().default('24h'),
  
  // Notification preferences
  notificationSettings: jsonb('notification_settings').$type<{
    // Request notifications
    onRequestApproved?: boolean;
    onRequestDenied?: boolean;
    onRequestAvailable?: boolean;
    onRequestCompleted?: boolean;
    
    // Download notifications
    onDownloadStarted?: boolean;
    onDownloadCompleted?: boolean;
    onDownloadFailed?: boolean;
    
    // Media notifications
    onNewEpisode?: boolean;
    onNewMovie?: boolean;
    
    // Media server notifications
    onWatched?: boolean;
  }>(),
  
  // Privacy settings
  privacySettings: jsonb('privacy_settings').$type<{
    showWatchlist?: boolean;
    showWatchHistory?: boolean;
    showRequestHistory?: boolean;
    showStats?: boolean;
    allowRecommendations?: boolean;
  }>(),
  
  // API Access
  apiKey: text('api_key').unique(),
  
  // Instance Settings
  defaultInstanceId: integer('default_instance_id').references(() => instance.id),
  instancePreferences: jsonb('instance_preferences').$type<Record<number, {
    pinned?: boolean;
    sortOrder?: number;
    hidden?: boolean;
    lastViewed?: timestamp;
  }>>(),
  
  // UI Settings
  uiSettings: jsonb('ui_settings').$type<{
    calendarWeekColumnHeader?: string;
    weekColumnHeader?: string;
    showRelativeDates?: boolean;
    shortDateFormat?: string;
    longDateFormat?: string;
    timeFormat?: string;
    firstDayOfWeek?: number;
    compactView?: boolean;
    discoveryView?: string; // 'grid', 'list'
  }>(),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => user.id),
  updatedBy: integer('updated_by').references(() => user.id),
});
```

### Media Discovery Table

```typescript
// backend/db/schema/mediaDiscovery.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './media.schema';

export const discoveryTypeEnum = pgEnum('discovery_type', [
  'trending',
  'popular',
  'upcoming',
  'top-rated',
  'airing-today',
  'on-the-air',
  'similar',
  'recommended',
]);

export const mediaDiscovery = pgTable('media_discovery', {
  id: serial('id').primaryKey(),
  
  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  
  // Discovery Type
  discoveryType: discoveryTypeEnum('discovery_type').notNull(),
  
  // Media IDs (nullable based on content type)
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  aniDbId: integer('ani_db_id'),
  imdbId: text('imdb_id'),
  
  // Discovery metadata
  title: text('title').notNull(),
  year: integer('year'),
  poster: text('poster'),
  backdrop: text('backdrop'),
  overview: text('overview'),
  rating: integer('rating'), // 0-100
  voteCount: integer('vote_count'),
  genres: jsonb('genres').$type<string[]>(),
  language: text('language').notNull().default('en'),
  
  // For trending/popular
  popularity: integer('popularity'), // Popularity score from TMDB
  
  // For upcoming
  releaseDate: timestamp('release_date'),
  
  // For recommended/similar
  basedOnMediaId: integer('based_on_media_id'), // If this is recommended based on another media
  
  // Whether media exists in library
  existsInLibrary: boolean('exists_in_library').notNull().default(false),
  mediaId: integer('media_id'), // Reference to media table if exists
  
  // Cache control
  cacheKey: text('cache_key').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  
  added: timestamp('added').notNull().defaultNow(),
});

export const mediaDiscoveryRelations = relations(mediaDiscovery, ({ one }) => ({
  media: one(media, {
    fields: [mediaDiscovery.mediaId],
    references: [media.id],
  }),
}));
```

### Requests Table

```typescript
// backend/db/schema/request.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './media.schema';
import { user } from './user.schema';

export const requestStatusEnum = pgEnum('request_status', [
  'pending',    // Awaiting admin approval
  'approved',   // Approved, downloading
  'available',  // Downloaded and available
  'denied',     // Request denied by admin
  'partial',    // Partially downloaded (some episodes for TV)
  'declined',   // User declined (not implemented)
]);

export const request = pgTable('request', {
  id: serial('id').primaryKey(),
  
  // User who made the request
  requestedById: integer('requested_by_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  
  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  
  // Media IDs
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  aniDbId: integer('ani_db_id'),
  imdbId: text('imdb_id'),
  
  // Requested media info (denormalized for performance)
  title: text('title').notNull(),
  year: integer('year'),
  poster: text('poster'),
  overview: text('overview'),
  
  // Request details
  seasons: jsonb('seasons').$type<Array<{
    seasonNumber: number;
    monitored: boolean;
  }>>(),
  
  // Status
  status: requestStatusEnum('status').notNull().default('pending'),
  
  // Approval details
  approvedAt: timestamp('approved_at'),
  approvedById: integer('approved_by_id').references(() => user.id, { onDelete: 'set null' }),
  denialReason: text('denial_reason'), // If denied
  
  // Media details (when approved/available)
  mediaId: integer('media_id').references(() => media.id, { onDelete: 'set null' }),
  instanceId: integer('instance_id').references(() => instance.id, { onDelete: 'set null' }),
  
  // Quality preferences
  qualityProfileId: integer('quality_profile_id'),
  rootFolderId: integer('root_folder_id'),
  
  // Additional info
  added: timestamp('added').notNull().defaultNow(),
  modified: timestamp('modified').notNull().defaultNow(),
  
  // For auto-expiring pending requests
  expiresAt: timestamp('expires_at'),
});

export const requestRelations = relations(request, ({ one }) => ({
  requestedBy: one(user, {
    fields: [request.requestedById],
    references: [user.id],
  }),
  approvedBy: one(user, {
    fields: [request.approvedById],
    references: [user.id],
  }),
  media: one(media, {
    fields: [request.mediaId],
    references: [media.id],
  }),
  instance: one(instance, {
    fields: [request.instanceId],
    references: [instance.id],
  }),
}));
```

### Watchlist Table

```typescript
// backend/db/schema/watchlist.schema.ts

import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './media.schema';
import { user } from './user.schema';

export const watchlistTypeEnum = pgEnum('watchlist_type', [
  'watchlist',    // Plan to watch
  'watched',      // Watched
  'watching',     // Currently watching
  'dropped',      // Stopped watching
  'hold',         // On hold
]);

export const watchlist = pgTable('watchlist', {
  id: serial('id').primaryKey(),
  
  // User
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  
  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  
  // Media IDs
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  aniDbId: integer('ani_db_id'),
  imdbId: text('imdb_id'),
  mediaId: integer('media_id').references(() => media.id, { onDelete: 'cascade' }),
  
  // Watchlist type
  type: watchlistTypeEnum('type').notNull().default('watchlist'),
  
  // Progress tracking (for TV series/anime)
  currentSeason: integer('current_season'),
  currentEpisode: integer('current_episode'),
  
  // Rating (1-10)
  rating: integer('rating'),
  review: text('review'),
  
  // Timestamps
  added: timestamp('added').notNull().defaultNow(),
  modified: timestamp('modified').notNull().defaultNow(),
  
  // Unique constraint (user + media)
}, (table) => ({
  uniqueUserMedia: unique('unique_user_media').on(table.userId, table.mediaId),
}));

export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(user, {
    fields: [watchlist.userId],
    references: [user.id],
  }),
  media: one(media, {
    fields: [watchlist.mediaId],
    references: [media.id],
  }),
}));
```

### Activity Feed Table

```typescript
// backend/db/schema/activity.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { contentTypeEnum } from './media.schema';
import { user } from './user.schema';

export const activityTypeEnum = pgEnum('activity_type', [
  // Media activities
  'media_added',
  'media_updated',
  'media_deleted',
  
  // Download activities
  'download_started',
  'download_completed',
  'download_failed',
  'download_paused',
  
  // Request activities
  'request_created',
  'request_approved',
  'request_denied',
  'request_available',
  'request_partial',
  
  // Watched activities
  'episode_watched',
  'movie_watched',
  
  // Library activities
  'episode_added',
  'movie_added',
  'episode_deleted',
  'movie_deleted',
  
  // System activities
  'user_joined',
  'user_left',
  'settings_updated',
]);

export const activity = pgTable('activity', {
  id: serial('id').primaryKey(),
  
  // User who performed the action
  userId: integer('user_id').references(() => user.id, { onDelete: 'set null' }),
  
  // Activity type
  type: activityTypeEnum('type').notNull(),
  
  // Content Type (if applicable)
  contentType: contentTypeEnum('content_type'),
  
  // Media details
  mediaId: integer('media_id').references(() => media.id, { onDelete: 'set null' }),
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  aniDbId: integer('ani_db_id'),
  imdbId: text('imdb_id'),
  
  // Episode/movie details
  episodeId: integer('episode_id'),
  seasonNumber: integer('season_number'),
  episodeNumber: integer('episode_number'),
  movieFileId: integer('movie_file_id'),
  edition: text('edition'),
  
  // Request details
  requestId: integer('request_id').references(() => request.id, { onDelete: 'set null' }),
  
  // Activity metadata
  title: text('title'),
  poster: text('poster'),
  year: integer('year'),
  overview: text('overview'),
  
  // Additional details (JSONB for flexibility)
  details: jsonb('details').$type<Record<string, unknown>>(),
  
  // Visibility
  visibility: text('visibility').notNull().default('public'), // 'public', 'private', 'friends'
  
  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const activityRelations = relations(activity, ({ one }) => ({
  user: one(user, {
    fields: [activity.userId],
    references: [user.id],
  }),
  media: one(media, {
    fields: [activity.mediaId],
    references: [media.id],
  }),
  request: one(request, {
    fields: [activity.requestId],
    references: [request.id],
  }),
}));
```

### Media Server Integration Table

```typescript
// backend/db/schema/mediaServer.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const mediaServerTypeEnum = pgEnum('media_server_type', ['plex', 'jellyfin', 'emby']);

export const mediaServer = pgTable('media_server', {
  id: serial('id').primaryKey(),
  
  // Server type
  type: mediaServerTypeEnum('type').notNull(),
  
  // Connection details
  name: text('name').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  useHttps: boolean('use_https').notNull().default(false),
  apiKey: text('api_key').notNull(), // Encrypted
  
  // Server info
  version: text('version'),
  machineIdentifier: text('machine_identifier'), // Plex machine ID
  userId: integer('user_id'), // Main user ID for the server
  
  // Sync settings
  enabled: boolean('enabled').notNull().default(true),
  syncWatchedStatus: boolean('sync_watched_status').notNull().default(true),
  syncLibrary: boolean('sync_library').notNull().default(true),
  syncInterval: integer('sync_interval').notNull().default(3600), // Seconds
  
  // Last sync
  lastSync: timestamp('last_sync'),
  lastSyncSuccess: boolean('last_sync_success').notNull().default(true),
  lastSyncError: text('last_sync_error'),
  
  // Metadata
  added: timestamp('added').notNull().defaultNow(),
});

export const mediaServerRelations = relations(mediaServer, ({ many }) => ({
  watchedItems: many(watchedItem),
}));

export const watchedItem = pgTable('watched_item', {
  id: serial('id').primaryKey(),
  
  // Media server
  mediaServerId: integer('media_server_id').notNull().references(() => mediaServer.id, { onDelete: 'cascade' }),
  
  // User
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  
  // Content Type
  contentType: contentTypeEnum('content_type').notNull(),
  
  // Media IDs
  mediaId: integer('media_id').references(() => media.id, { onDelete: 'cascade' }),
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  aniDbId: integer('ani_db_id'),
  imdbId: text('imdb_id'),
  
  // Episode/movie details
  episodeId: integer('episode_id'),
  seasonNumber: integer('season_number'),
  episodeNumber: integer('episode_number'),
  movieFileId: integer('movie_file_id'),
  edition: text('edition'),
  
  // Watched status
  watched: boolean('watched').notNull().default(true),
  lastWatched: timestamp('last_watched'),
  playCount: integer('play_count').notNull().default(1),
  
  // Media server specific
  mediaServerKey: text('media_server_key'), // Item key in Plex/Jellyfin/Emby
  
  // Timestamps
  added: timestamp('added').notNull().defaultNow(),
  updated: timestamp('updated').notNull().defaultNow(),
  
  // Unique constraint (user + media + episode/edition)
}, (table) => ({
  uniqueUserMedia: unique('unique_user_media').on(table.userId, table.mediaId, table.episodeId, table.edition),
}));

export const watchedItemRelations = relations(watchedItem, ({ one }) => ({
  mediaServer: one(mediaServer, {
    fields: [watchedItem.mediaServerId],
    references: [mediaServer.id],
  }),
  user: one(user, {
    fields: [watchedItem.userId],
    references: [user.id],
  }),
  media: one(media, {
    fields: [watchedItem.mediaId],
    references: [media.id],
  }),
}));
```

---

## Discovery Service

```typescript
// backend/core/discovery/services/discovery.service.ts

import { db } from '@/db/client';
import { mediaDiscovery, media } from '@/db/schema';
import { ContentType, DiscoveryType } from '@/types/models/discovery';
import { TMDBDiscoveryService } from './tmdb.service';
import { TVDBDiscoveryService } from './tvdb.service';

interface DiscoveryOptions {
  type: DiscoveryType;
  contentType?: ContentType;
  language?: string;
  page?: number;
  pageSize?: number;
}

interface DiscoveryItem {
  id: number;
  type: ContentType;
  title: string;
  year?: number;
  poster?: string;
  backdrop?: string;
  overview?: string;
  rating?: number;
  voteCount?: number;
  genres?: string[];
  popularity?: number;
  releaseDate?: Date;
  existsInLibrary?: boolean;
  mediaId?: number;
}

export class DiscoveryService {
  private tmdbDiscovery = new TMDBDiscoveryService();
  private tvdbDiscovery = new TVDBDiscoveryService();
  
  /**
   * Get discovery items from TMDB/TVDB or cache
   */
  async getDiscovery(options: DiscoveryOptions): Promise<DiscoveryItem[]> {
    const { type, contentType, language = 'en', page = 1, pageSize = 20 } = options;
    
    // Build cache key
    const cacheKey = `${type}:${contentType || 'all'}:${language}:${page}:${pageSize}`;
    
    // Check cache
    const cached = await db.query.mediaDiscovery.findFirst({
      where: and(
        eq(mediaDiscovery.cacheKey, cacheKey),
        gt(mediaDiscovery.expiresAt, new Date()),
      ),
    });
    
    if (cached) {
      return this.formatCachedItems(cached);
    }
    
    // Fetch from API
    const items = await this.fetchFromAPI(type, contentType, language, page, pageSize);
    
    // Cache results
    await this.cacheDiscoveryItems(type, contentType, cacheKey, items);
    
    return items;
  }
  
  /**
   * Search for media across TVDB and TMDB
   */
  async search(term: string, contentType?: ContentType): Promise<DiscoveryItem[]> {
    const results: DiscoveryItem[] = [];
    
    // Search TMDB (movies)
    if (!contentType || contentType === 'movie') {
      const tmdbMovies = await this.tmdbDiscovery.search(term, 'movie');
      results.push(...tmdbMovies);
    }
    
    // Search TVDB (TV series and anime)
    if (!contentType || contentType === 'series' || contentType === 'anime') {
      const tvdbSeries = await this.tvdbDiscovery.search(term);
      results.push(...tvdbSeries);
    }
    
    // Check which items exist in library
    return await this.markLibraryItems(results);
  }
  
  /**
   * Get similar/recommended content
   */
  async getSimilar(mediaId: number, contentType: ContentType): Promise<DiscoveryItem[]> {
    const mediaRecord = await db.query.media.findFirst({
      where: eq(media.id, mediaId),
    });
    
    if (!mediaRecord) {
      throw new Error('Media not found');
    }
    
    let similarItems: DiscoveryItem[] = [];
    
    switch (contentType) {
      case 'movie':
        similarItems = await this.tmdbDiscovery.getSimilar(mediaRecord.tmdbId!);
        break;
      case 'series':
      case 'anime':
        similarItems = await this.tvdbDiscovery.getSimilar(mediaRecord.tvdbId!);
        break;
    }
    
    return await this.markLibraryItems(similarItems);
  }
  
  /**
   * Get upcoming releases
   */
  async getUpcoming(contentType?: ContentType, days = 30): Promise<DiscoveryItem[]> {
    const results: DiscoveryItem[] = [];
    
    // Get upcoming movies
    if (!contentType || contentType === 'movie') {
      const movies = await this.tmdbDiscovery.getUpcoming(days);
      results.push(...movies);
    }
    
    // Get upcoming TV series
    if (!contentType || contentType === 'series' || contentType === 'anime') {
      const series = await this.tvdbDiscovery.getUpcoming(days);
      results.push(...series);
    }
    
    return await this.markLibraryItems(results);
  }
  
  /**
   * Fetch from TMDB/TVDB API
   */
  private async fetchFromAPI(
    type: DiscoveryType,
    contentType: ContentType | undefined,
    language: string,
    page: number,
    pageSize: number,
  ): Promise<DiscoveryItem[]> {
    switch (type) {
      case 'trending':
      case 'popular':
      case 'top-rated':
        return this.tmdbDiscovery.getTrending(type, contentType, language, page, pageSize);
      
      case 'upcoming':
        return this.tmdbDiscovery.getUpcoming(30, contentType, language, page, pageSize);
      
      case 'airing-today':
      case 'on-the-air':
        return this.tvdbDiscovery.getAiring(type, language, page, pageSize);
      
      default:
        return [];
    }
  }
  
  /**
   * Cache discovery items
   */
  private async cacheDiscoveryItems(
    type: DiscoveryType,
    contentType: ContentType | undefined,
    cacheKey: string,
    items: DiscoveryItem[],
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    
    // Delete old cache
    await db.delete(mediaDiscovery).where(eq(mediaDiscovery.cacheKey, cacheKey));
    
    // Insert new cache
    await db.insert(mediaDiscovery).values(
      items.map((item) => ({
        discoveryType: type,
        contentType: item.type,
        tvdbId: item.type !== 'movie' ? item.id : null,
        tmdbId: item.type === 'movie' ? item.id : null,
        title: item.title,
        year: item.year,
        poster: item.poster,
        backdrop: item.backdrop,
        overview: item.overview,
        rating: item.rating,
        voteCount: item.voteCount,
        genres: item.genres,
        popularity: item.popularity,
        releaseDate: item.releaseDate,
        existsInLibrary: item.existsInLibrary,
        mediaId: item.mediaId,
        cacheKey,
        expiresAt,
      })),
    );
  }
  
  /**
   * Mark which items exist in library
   */
  private async markLibraryItems(items: DiscoveryItem[]): Promise<DiscoveryItem[]> {
    // Get all TVDB IDs
    const tvdbIds = items.filter((item) => item.type !== 'movie').map((item) => item.id);
    const tmdbIds = items.filter((item) => item.type === 'movie').map((item) => item.id);
    
    // Query database
    const existingMedia = await db.query.media.findMany({
      where: or(
        tvdbIds.length > 0 ? inArray(media.tvdbId, tvdbIds) : undefined,
        tmdbIds.length > 0 ? inArray(media.tmdbId, tmdbIds) : undefined,
      ),
      columns: { id: true, tvdbId: true, tmdbId: true },
    });
    
    // Create lookup map
    const tvdbMap = new Map(existingMedia.filter((m) => m.tvdbId).map((m) => [m.tvdbId!, m.id]));
    const tmdbMap = new Map(existingMedia.filter((m) => m.tmdbId).map((m) => [m.tmdbId!, m.id]));
    
    // Mark items
    return items.map((item) => {
      const existsInLibrary = item.type === 'movie'
        ? tmdbMap.has(item.id)
        : tvdbMap.has(item.id);
      
      return {
        ...item,
        existsInLibrary,
        mediaId: existsInLibrary
          ? (item.type === 'movie' ? tmdbMap.get(item.id) : tvdbMap.get(item.id))
          : undefined,
      };
    });
  }
  
  private formatCachedItems(cached: typeof mediaDiscovery.$inferSelect): DiscoveryItem[] {
    // This would return multiple items from cache
    // For simplicity, just returning one here
    return [
      {
        id: cached.tvdbId || cached.tmdbId!,
        type: cached.contentType,
        title: cached.title,
        year: cached.year,
        poster: cached.poster,
        backdrop: cached.backdrop,
        overview: cached.overview,
        rating: cached.rating,
        voteCount: cached.voteCount,
        genres: cached.genres,
        popularity: cached.popularity,
        releaseDate: cached.releaseDate ? new Date(cached.releaseDate) : undefined,
        existsInLibrary: cached.existsInLibrary,
        mediaId: cached.mediaId || undefined,
      },
    ];
  }
}

export const discoveryService = new DiscoveryService();
```

---

## Request Service

```typescript
// backend/core/requests/services/request.service.ts

import { db } from '@/db/client';
import { request, media, user } from '@/db/schema';
import { RequestStatus, ContentType } from '@/types/models/request';
import { eq, and } from 'drizzle-orm';
import { notificationService } from '@/core/notifications/services/notification.service';
import { mediaService } from '@/core/media/services/media.service';
import { ForbiddenError, NotFoundError } from '@/errors/http.error';

interface CreateRequestOptions {
  userId: number;
  contentType: ContentType;
  tvdbId?: number;
  tmdbId?: number;
  aniDbId?: number;
  imdbId?: string;
  seasons?: Array<{ seasonNumber: number; monitored: boolean }>;
  qualityProfileId?: number;
  rootFolderId?: number;
}

export class RequestService {
  /**
   * Create a new request
   */
  async create(options: CreateRequestOptions): Promise<typeof request.$inferSelect> {
    const { userId, contentType, tvdbId, tmdbId, aniDbId, imdbId, seasons } = options;
    
    // Check if user has reached request limit
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { requestLimit: true, requestCount: true, enableAutoApprove: true },
    });
    
    if (!userRecord) {
      throw new NotFoundError('User not found', 'user', userId);
    }
    
    if (userRecord.requestLimit && userRecord.requestCount >= userRecord.requestLimit) {
      throw new ForbiddenError('Request limit reached', {
        limit: userRecord.requestLimit,
        current: userRecord.requestCount,
      });
    }
    
    // Check if media exists in library
    const mediaId = await this.checkMediaExists(contentType, tvdbId, tmdbId, aniDbId, imdbId);
    
    // Check if request already exists
    const existingRequest = await this.findExistingRequest(
      userId,
      contentType,
      tvdbId,
      tmdbId,
      aniDbId,
      imdbId,
    );
    
    if (existingRequest) {
      throw new ForbiddenError('Request already exists', {
        requestId: existingRequest.id,
        status: existingRequest.status,
      });
    }
    
    // Get media metadata
    const metadata = await this.getMediaMetadata(contentType, tvdbId, tmdbId, aniDbId, imdbId);
    
    // Create request
    const newRequest = await db.transaction(async (tx) => {
      const [created] = await tx.insert(request).values({
        requestedById: userId,
        contentType,
        tvdbId,
        tmdbId,
        aniDbId,
        imdbId,
        title: metadata.title,
        year: metadata.year,
        poster: metadata.poster,
        overview: metadata.overview,
        seasons: seasons || this.getAllSeasons(metadata),
        status: 'pending',
        added: new Date(),
        modified: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }).returning();
      
      // Update user request count
      await tx.update(user)
        .set({ requestCount: userRecord.requestCount + 1 })
        .where(eq(user.id, userId));
      
      return created;
    });
    
    // Auto-approve if user has permission
    if (userRecord.enableAutoApprove || mediaId) {
      await this.approve(newRequest.id, userId);
    }
    
    // Notify admins of new request
    await notificationService.notifyAdmins({
      type: 'request_created',
      title: `New request: ${newRequest.title}`,
      body: `${userRecord.username} requested ${newRequest.title}`,
      data: { requestId: newRequest.id },
    });
    
    // Log activity
    await activityService.log({
      userId,
      type: 'request_created',
      contentType,
      mediaId,
      requestId: newRequest.id,
      title: newRequest.title,
      poster: newRequest.poster,
      year: newRequest.year,
    });
    
    return newRequest;
  }
  
  /**
   * Approve a request
   */
  async approve(requestId: number, approvedById: number): Promise<void> {
    const existingRequest = await db.query.request.findFirst({
      where: eq(request.id, requestId),
      with: {
        requestedBy: true,
      },
    });
    
    if (!existingRequest) {
      throw new NotFoundError('Request not found', 'request', requestId);
    }
    
    if (existingRequest.status !== 'pending') {
      throw new ForbiddenError('Request is not pending', {
        requestId,
        currentStatus: existingRequest.status,
      });
    }
    
    // Add media to library
    const mediaId = await this.addMediaToLibrary(existingRequest);
    
    // Update request status
    await db.update(request)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedById,
        mediaId,
        modified: new Date(),
      })
      .where(eq(request.id, requestId));
    
    // Notify user
    await notificationService.notify(existingRequest.requestedById, {
      type: 'request_approved',
      title: 'Request approved',
      body: `Your request for "${existingRequest.title}" has been approved and will be downloaded shortly.`,
      data: { requestId, mediaId },
    });
    
    // Log activity
    await activityService.log({
      userId: approvedById,
      type: 'request_approved',
      contentType: existingRequest.contentType,
      mediaId,
      requestId,
      title: existingRequest.title,
      poster: existingRequest.poster,
      year: existingRequest.year,
    });
  }
  
  /**
   * Deny a request
   */
  async deny(requestId: number, approvedById: number, reason: string): Promise<void> {
    const existingRequest = await db.query.request.findFirst({
      where: eq(request.id, requestId),
      with: {
        requestedBy: true,
      },
    });
    
    if (!existingRequest) {
      throw new NotFoundError('Request not found', 'request', requestId);
    }
    
    if (existingRequest.status !== 'pending') {
      throw new ForbiddenError('Request is not pending', {
        requestId,
        currentStatus: existingRequest.status,
      });
    }
    
    // Update request status
    await db.update(request)
      .set({
        status: 'denied',
        approvedById,
        denialReason: reason,
        modified: new Date(),
      })
      .where(eq(request.id, requestId));
    
    // Update user request count
    await db.update(user)
      .set({
        requestCount: sql`${user.requestCount} - 1`,
      })
      .where(eq(user.id, existingRequest.requestedById));
    
    // Notify user
    await notificationService.notify(existingRequest.requestedById, {
      type: 'request_denied',
      title: 'Request denied',
      body: `Your request for "${existingRequest.title}" has been denied. Reason: ${reason}`,
      data: { requestId, reason },
    });
    
    // Log activity
    await activityService.log({
      userId: approvedById,
      type: 'request_denied',
      contentType: existingRequest.contentType,
      requestId,
      title: existingRequest.title,
      poster: existingRequest.poster,
      year: existingRequest.year,
      details: { reason },
    });
  }
  
  /**
   * Update request status to available
   */
  async markAvailable(requestId: number): Promise<void> {
    const existingRequest = await db.query.request.findFirst({
      where: eq(request.id, requestId),
    });
    
    if (!existingRequest) {
      throw new NotFoundError('Request not found', 'request', requestId);
    }
    
    if (existingRequest.status === 'available') {
      return; // Already available
    }
    
    // Update request status
    await db.update(request)
      .set({
        status: 'available',
        modified: new Date(),
      })
      .where(eq(request.id, requestId));
    
    // Notify user
    if (existingRequest.requestedById) {
      await notificationService.notify(existingRequest.requestedById, {
        type: 'request_available',
        title: 'Now available!',
        body: `"${existingRequest.title}" is now available to watch!`,
        data: { requestId, mediaId: existingRequest.mediaId },
      });
    }
    
    // Log activity
    await activityService.log({
      userId: existingRequest.requestedById,
      type: 'request_available',
      contentType: existingRequest.contentType,
      mediaId: existingRequest.mediaId || undefined,
      requestId,
      title: existingRequest.title,
      poster: existingRequest.poster,
      year: existingRequest.year,
    });
  }
  
  /**
   * Get user's requests
   */
  async getUserRequests(userId: number, status?: RequestStatus): Promise<typeof request.$inferSelect[]> {
    const conditions = [eq(request.requestedById, userId)];
    
    if (status) {
      conditions.push(eq(request.status, status));
    }
    
    return db.query.request.findMany({
      where: and(...conditions),
      orderBy: [desc(request.added)],
    });
  }
  
  /**
   * Get all requests (for admins)
   */
  async getAllRequests(status?: RequestStatus): Promise<typeof request.$inferSelect[]> {
    const conditions = status ? [eq(request.status, status)] : [];
    
    return db.query.request.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        requestedBy: true,
        approvedBy: true,
        media: true,
      },
      orderBy: [desc(request.added)],
    });
  }
  
  /**
   * Check if media exists in library
   */
  private async checkMediaExists(
    contentType: ContentType,
    tvdbId?: number,
    tmdbId?: number,
    aniDbId?: number,
    imdbId?: string,
  ): Promise<number | undefined> {
    const conditions = [];
    
    if (tvdbId) conditions.push(eq(media.tvdbId, tvdbId));
    if (tmdbId) conditions.push(eq(media.tmdbId, tmdbId));
    if (aniDbId) conditions.push(eq(media.aniDbId, aniDbId));
    if (imdbId) conditions.push(eq(media.imdbId, imdbId));
    
    const existingMedia = await db.query.media.findFirst({
      where: and(eq(media.contentType, contentType), ...conditions),
      columns: { id: true },
    });
    
    return existingMedia?.id;
  }
  
  /**
   * Find existing request
   */
  private async findExistingRequest(
    userId: number,
    contentType: ContentType,
    tvdbId?: number,
    tmdbId?: number,
    aniDbId?: number,
    imdbId?: string,
  ): Promise<typeof request.$inferSelect | undefined> {
    const conditions = [eq(request.requestedById, userId)];
    
    if (tvdbId) conditions.push(eq(request.tvdbId, tvdbId));
    if (tmdbId) conditions.push(eq(request.tmdbId, tmdbId));
    if (aniDbId) conditions.push(eq(request.aniDbId, aniDbId));
    if (imdbId) conditions.push(eq(request.imdbId, imdbId));
    
    return db.query.request.findFirst({
      where: and(...conditions),
    });
  }
  
  /**
   * Get media metadata from TVDB/TMDB
   */
  private async getMediaMetadata(
    contentType: ContentType,
    tvdbId?: number,
    tmdbId?: number,
    aniDbId?: number,
    imdbId?: string,
  ): Promise<{
    title: string;
    year?: number;
    poster?: string;
    overview?: string;
    seasons?: Array<{ seasonNumber: number; episodeCount: number }>;
  }> {
    const metadata = await metadataService.getMediaMetadata(contentType, this.getMetadataId(contentType, tvdbId, tmdbId, aniDbId, imdbId));
    
    return {
      title: metadata.title,
      year: metadata.year,
      poster: metadata.images?.[0]?.url,
      overview: metadata.overview,
      seasons: metadata.seasons,
    };
  }
  
  /**
   * Get all seasons (if not specified)
   */
  private getAllSeasons(metadata: {
    seasons?: Array<{ seasonNumber: number; episodeCount: number; monitored: boolean }>;
  }): Array<{ seasonNumber: number; monitored: boolean }> {
    if (!metadata.seasons) return [];
    
    return metadata.seasons.map((season) => ({
      seasonNumber: season.seasonNumber,
      monitored: true,
    }));
  }
  
  /**
   * Add media to library
   */
  private async addMediaToLibrary(
    requestItem: typeof request.$inferSelect,
  ): Promise<number | undefined> {
    try {
      const newMedia = await mediaService.create({
        contentType: requestItem.contentType,
        tvdbId: requestItem.tvdbId,
        tmdbId: requestItem.tmdbId,
        aniDbId: requestItem.aniDbId,
        imdbId: requestItem.imdbId,
        qualityProfileId: requestItem.qualityProfileId,
        rootFolderId: requestItem.rootFolderId,
        monitored: true,
        tags: [],
      });
      
      return newMedia.id;
    } catch (error) {
      // If media already exists, return existing media ID
      if (error instanceof Error && error.message.includes('already exists')) {
        const existingMedia = await this.checkMediaExists(
          requestItem.contentType,
          requestItem.tvdbId,
          requestItem.tmdbId,
          requestItem.aniDbId,
          requestItem.imdbId,
        );
        return existingMedia;
      }
      
      throw error;
    }
  }
  
  /**
   * Get metadata ID based on content type
   */
  private getMetadataId(
    contentType: ContentType,
    tvdbId?: number,
    tmdbId?: number,
    aniDbId?: number,
    imdbId?: string,
  ): number | string {
    switch (contentType) {
      case 'movie':
        return tmdbId!;
      case 'series':
      case 'anime':
        return tvdbId || aniDbId!;
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }
}

export const requestService = new RequestService();
```

---

## API Design

### Discovery API

```typescript
// backend/api/routes/discovery.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { discoveryService } from '@/core/discovery/services/discovery.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const discoveryRoutes = new Hono();

// GET /api/v3/discovery - Get discovery items
discoveryRoutes.get(
  '/discovery',
  authMiddleware,
  validationMiddleware(
    z.object({
      type: z.enum(['trending', 'popular', 'upcoming', 'top-rated', 'airing-today', 'on-the-air']),
      contentType: z.enum(['series', 'anime', 'movie', 'all']).default('all'),
      language: z.string().default('en'),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }),
  ),
  async (c) => {
    const options = c.req.valid('query');
    const items = await discoveryService.getDiscovery(options);
    return c.json({ data: items });
  },
);

// GET /api/v3/discovery/search - Search for media
discoveryRoutes.get(
  '/discovery/search',
  authMiddleware,
  validationMiddleware(
    z.object({
      term: z.string().min(1),
      contentType: z.enum(['series', 'anime', 'movie', 'all']).default('all'),
    }),
  ),
  async (c) => {
    const { term, contentType } = c.req.valid('query');
    const items = await discoveryService.search(term, contentType as any);
    return c.json({ data: items });
  },
);

// GET /api/v3/discovery/similar - Get similar media
discoveryRoutes.get(
  '/discovery/similar/:mediaId',
  authMiddleware,
  validationMiddleware(
    z.object({
      mediaId: z.coerce.number().int(),
      contentType: z.enum(['series', 'anime', 'movie']),
    }),
  ),
  async (c) => {
    const mediaId = Number(c.req.param('mediaId'));
    const contentType = c.req.query('contentType') as 'series' | 'anime' | 'movie';
    const items = await discoveryService.getSimilar(mediaId, contentType);
    return c.json({ data: items });
  },
);

// GET /api/v3/discovery/upcoming - Get upcoming releases
discoveryRoutes.get(
  '/discovery/upcoming',
  authMiddleware,
  validationMiddleware(
    z.object({
      contentType: z.enum(['series', 'anime', 'movie', 'all']).default('all'),
      days: z.coerce.number().int().min(1).max(365).default(30),
    }),
  ),
  async (c) => {
    const { contentType, days } = c.req.valid('query');
    const items = await discoveryService.getUpcoming(contentType as any, days);
    return c.json({ data: items });
  },
);

export default discoveryRoutes;
```

### Request API

```typescript
// backend/api/routes/requests.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { requestService } from '@/core/requests/services/request.service';
import { authMiddleware, requirePermission } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const requestRoutes = new Hono();

// GET /api/v3/requests - Get all requests (admin only)
requestRoutes.get(
  '/requests',
  authMiddleware,
  requirePermission('requests', 'read'),
  validationMiddleware(
    z.object({
      status: z.enum(['pending', 'approved', 'available', 'denied', 'partial']).optional(),
    }),
  ),
  async (c) => {
    const { status } = c.req.valid('query');
    const requests = await requestService.getAllRequests(status as any);
    return c.json({ data: requests });
  },
);

// GET /api/v3/requests/my - Get current user's requests
requestRoutes.get('/requests/my', authMiddleware, async (c) => {
  const user = c.get('user');
  const { status } = c.req.query();
  const requests = await requestService.getUserRequests(user.id, status as any);
  return c.json({ data: requests });
});

// POST /api/v3/requests - Create a new request
requestRoutes.post(
  '/requests',
  authMiddleware,
  requirePermission('requests', 'create'),
  validationMiddleware(
    z.object({
      contentType: z.enum(['series', 'anime', 'movie']),
      tvdbId: z.number().optional(),
      tmdbId: z.number().optional(),
      aniDbId: z.number().optional(),
      imdbId: z.string().optional(),
      seasons: z.array(
        z.object({
          seasonNumber: z.number().int(),
          monitored: z.boolean(),
        }),
      ).optional(),
      qualityProfileId: z.number().optional(),
      rootFolderId: z.number().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const user = c.get('user');
    const newRequest = await requestService.create({
      userId: user.id,
      ...body,
    });
    return c.json({ data: newRequest }, 201);
  },
);

// POST /api/v3/requests/:id/approve - Approve a request (admin only)
requestRoutes.post(
  '/requests/:id/approve',
  authMiddleware,
  requirePermission('requests', 'manage'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const user = c.get('user');
    await requestService.approve(id, user.id);
    return c.json({ success: true });
  },
);

// POST /api/v3/requests/:id/deny - Deny a request (admin only)
requestRoutes.post(
  '/requests/:id/deny',
  authMiddleware,
  requirePermission('requests', 'manage'),
  validationMiddleware(
    z.object({
      reason: z.string().min(1).max(500),
    }),
  ),
  async (c) => {
    const id = Number(c.req.param('id'));
    const { reason } = c.req.valid('json');
    const user = c.get('user');
    await requestService.deny(id, user.id, reason);
    return c.json({ success: true });
  },
);

export default requestRoutes;
```

### Activity Feed API

```typescript
// backend/api/routes/activity.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { activityService } from '@/core/activity/services/activity.service';
import { authMiddleware } from '@/middleware/auth.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const activityRoutes = new Hono();

// GET /api/v3/activity - Get activity feed
activityRoutes.get(
  '/activity',
  authMiddleware,
  validationMiddleware(
    z.object({
      type: z.enum([
        'media_added',
        'media_updated',
        'media_deleted',
        'download_started',
        'download_completed',
        'download_failed',
        'request_created',
        'request_approved',
        'request_denied',
        'request_available',
        'episode_watched',
        'movie_watched',
        'episode_added',
        'movie_added',
        'user_joined',
        'settings_updated',
      ]).optional(),
      contentType: z.enum(['series', 'anime', 'movie']).optional(),
      userId: z.coerce.number().int().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  ),
  async (c) => {
    const filters = c.req.valid('query');
    const activities = await activityService.getActivity(filters);
    return c.json({ data: activities });
  },
);

// GET /api/v3/activity/my - Get current user's activity
activityRoutes.get(
  '/activity/my',
  authMiddleware,
  validationMiddleware(
    z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  ),
  async (c) => {
    const user = c.get('user');
    const { limit, offset } = c.req.valid('query');
    const activities = await activityService.getUserActivity(user.id, { limit, offset });
    return c.json({ data: activities });
  },
);

export default activityRoutes;
```

---

## Frontend Design

### Discovery Page

```typescript
// frontend/app/[instance]/discovery/page.tsx

'use client';

import { useState } from 'react';
import { useDiscovery } from '@/hooks/useDiscovery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { Search } from 'lucide-react';

export function DiscoveryPage({ params }: { params: { instance: string } }) {
  const [contentType, setContentType] = useState<'all' | 'series' | 'anime' | 'movie'>('all');
  const [discoveryType, setDiscoveryType] = useState<'trending' | 'popular' | 'upcoming' | 'top-rated'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: items } = useDiscovery(params.instance, {
    type: discoveryType,
    contentType,
  });
  
  const { data: searchResults } = useDiscoverySearch(searchQuery, contentType);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Discover</h1>
        <Button>My Requests</Button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for TV shows, movies, anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {!searchQuery && (
        <Tabs value={discoveryType} onValueChange={(v) => setDiscoveryType(v as any)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="top-rated">Top Rated</TabsTrigger>
            </TabsList>
            
            <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="series">TV Series</TabsTrigger>
                <TabsTrigger value="anime">Anime</TabsTrigger>
                <TabsTrigger value="movie">Movies</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <TabsContent value={discoveryType} className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items?.map((item) => (
                <DiscoveryCard key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      {searchQuery && searchResults && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {searchResults.map((item) => (
            <DiscoveryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Discovery Card Component

```typescript
// frontend/components/discovery/DiscoveryCard.tsx

'use client';

import { tv, film, clapperboard, plus, check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRequest } from '@/hooks/useRequests';
import type { DiscoveryItem } from '@/types/models/discovery';

interface DiscoveryCardProps {
  item: DiscoveryItem;
}

export function DiscoveryCard({ item }: DiscoveryCardProps) {
  const { data: request, mutate: createRequest } = useRequest();
  
  const getTypeIcon = () => {
    switch (item.type) {
      case 'series':
        return <tv className="w-4 h-4" />;
      case 'anime':
        return <clapperboard className="w-4 h-4" />;
      case 'movie':
        return <film className="w-4 h-4" />;
    }
  };
  
  const handleRequest = async () => {
    await createRequest({
      contentType: item.type,
      tvdbId: item.type !== 'movie' ? item.id : undefined,
      tmdbId: item.type === 'movie' ? item.id : undefined,
    });
  };
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[2/3] relative bg-gray-200">
        {item.poster && (
          <img
            src={item.poster}
            alt={item.title}
            className="object-cover w-full h-full"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white text-sm line-clamp-3">{item.overview}</p>
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {getTypeIcon()}
            {item.type}
          </Badge>
        </div>
        {item.existsInLibrary && (
          <div className="absolute top-2 right-2">
            <Badge variant="default" className="flex items-center gap-1">
              <check className="w-3 h-3" />
              In Library
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{item.year}</p>
        
        {!item.existsInLibrary && (
          <Button
            size="sm"
            className="w-full mt-2"
            onClick={handleRequest}
            disabled={request?.status === 'pending'}
          >
            {request?.status === 'pending' ? 'Requested' : (
              <>
                <plus className="w-4 h-4 mr-1" />
                Request
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Requests Page

```typescript
// frontend/app/[instance]/requests/page.tsx

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequestCard } from '@/components/requests/RequestCard';
import { useRequests } from '@/hooks/useRequests';

export function RequestsPage({ params }: { params: { instance: string } }) {
  const { data: pendingRequests } = useRequests('pending');
  const { data: approvedRequests } = useRequests('approved');
  const { data: availableRequests } = useRequests('available');
  const { data: deniedRequests } = useRequests('denied');
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Requests</h1>
      
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="denied">Denied</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <div className="space-y-4">
            {pendingRequests?.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="approved" className="mt-6">
          <div className="space-y-4">
            {approvedRequests?.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="available" className="mt-6">
          <div className="space-y-4">
            {availableRequests?.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="denied" className="mt-6">
          <div className="space-y-4">
            {deniedRequests?.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Expected Outcomes

### User Experience Improvements

**Before (Sonarr + Radarr + Overseerr):**
- Three separate applications to use
- Three separate logins or complex SSO
- Overseerr is just a thin wrapper around Sonarr/Radarr APIs
- Discovery features hidden in separate app
- No unified view of library + requests + discovery
- Duplicate user management

**After (Unified idkarr):**
- Single application for library, discovery, and requests
- Single login with unified ACL system
- Native request system (no API wrapper)
- Discovery integrated into main app
- Unified view of everything
- User profiles with watchlists and watched status

### Performance Improvements

**Resource Usage:**
- **Before**: 3 installations (Sonarr + Radarr + Overseerr) = 3x resources
- **After**: 1 installation (idkarr) = 1/3 resources

**Data Fetching:**
- Single metadata service for all operations
- Shared caching reduces redundant API calls
- Unified database queries

**Development:**
- Single codebase instead of 80% duplicate code
- Single release to maintain
- Single bug tracker

### Developer Benefits

**Simplified Architecture:**
- Unified database schema
- Shared services and utilities
- Consistent API patterns
- Type-safe relationships

**Better Testing:**
- Unified test suite
- Shared test utilities
- Easier to add new features

---

## Summary

This discovery and requests system provides:

1. **Native Discovery**: Trending, popular, upcoming, similar content integrated into main app
2. **Native Request System**: User requests with approval workflow (no API wrapper)
3. **Unified User System**: Single authentication/authorization for all features
4. **Activity Feed**: Real-time feed of all user activity
5. **Watchlists**: Personal watchlists with progress tracking
6. **Media Server Integration**: Optional Plex/Jellyfin/Emby sync for watched status
7. **Shared Infrastructure**: Single database, caching, and metadata services
8. **Reduced Resource Usage**: 1 app instead of 3 (1/3 resources)
9. **Social Features**: User profiles, recommendations, activity feed
10. **Clear Migration Path**: From separate Overseerr to integrated system

This solves the fundamental inefficiency of running Overseerr separately when it's just a thin wrapper around Sonarr/Radarr with duplicate data fetching and user management.

*End of Discovery & Requests Documentation*
