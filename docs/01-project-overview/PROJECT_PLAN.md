# Sonarr Rebuild Project Plan

## Executive Summary

Rebuild Sonarr (Smart PVR for TV shows) in TypeScript with Bun runtime and modern stack, improving UX/UI and adding quality-of-life features.

**Current Stack (Sonarr v5)**: C# .NET 10 backend, React + Redux frontend, SQLite/PostgreSQL, SignalR for real-time
**Target Stack**: TypeScript (full-stack), Bun runtime, modern UI framework, PostgreSQL

---

## 1. Core Architecture Overview

### 1.1 Backend Architecture (TypeScript + Bun)

#### Domain Modules (Based on NzbDrone.Core structure)
```
src/
├── core/
│   ├── tv/                    # Series, Episode, Season entities
│   ├── indexers/              # RSS/Torrent indexers
│   ├── download/              # Download client integrations
│   ├── mediafiles/            # File operations & importing
│   ├── parser/                # Filename/release parsing
│   ├── decisionengine/        # Release scoring & filtering
│   ├── customformats/         # Release format matching
│   ├── qualities/             # Quality profiles
│   ├── notifications/         # Alert integrations
│   ├── metadata/              # TVDB/TMDB integration
│   ├── organizer/             # File renaming
│   ├── importlists/           # Trakt/etc. lists
│   ├── history/               # Download history
│   ├── blocklisting/          # Failed release tracking
│   ├── tags/                  # Tagging system
│   ├── housekeeping/          # Cleanup jobs
│   └── jobs/                  # Background tasks
├── data/
│   ├── database/              # Database layer (PostgreSQL)
│   ├── repositories/          # Data access
│   └── migrations/           # Schema migrations
├── api/
│   ├── controllers/           # REST API v5
│   ├── routes/               # API routing
│   └── middleware/          # Auth, logging, etc.
├── services/
│   ├── scheduler/            # Job scheduler
│   ├── signalr/             # WebSocket real-time
│   └── messaging/           # Event bus
└── shared/
    ├── models/               # Shared types
    ├── utils/               # Utilities
    └── config/              # Configuration
```

#### Core Services to Implement

**TV Management Service** (src/core/tv/)
- Series CRUD operations
- Episode tracking & monitoring
- Season management
- Series metadata sync (TVDB/TMDB)
- Statistics calculation

**Indexer Service** (src/core/indexers/)
- RSS feed polling
- Torrent tracker API integration
- Newznab/Torznab protocol support
- Rate limiting & throttling
- Release fetching & caching

**Download Client Service** (src/core/download/)
- SABnzbd integration
- NZBGet integration
- Transmission/qBittorrent/uTorrent
- Download progress tracking
- Failed download handling

**Parser Service** (src/core/parser/)
- Release name parsing (71,642 lines in Parser.cs)
- Quality detection (resolution, codec, audio)
- Series/season/episode extraction
- Language detection
- Release title normalization

**Decision Engine** (src/core/decisionengine/)
- Release scoring algorithm
- Custom format matching
- Quality profile comparison
- Protocol preferences (usenet vs torrent)
- Propers/repacks handling
- Rejection reasons tracking

**Organizer Service** (src/core/organizer/)
- Episode file naming patterns
- Season folder organization
- Series folder structure
- File moving/renaming
- Import into Plex/Kodi

**Media Files Service** (src/core/mediafiles/)
- Disk scanning
- Episode file detection
- Video file validation
- Subtitle handling
- File deletion & cleanup

**Import List Service** (src/core/importlists/)
- Trakt list integration
- IMDB list integration
- Sonarr list export
- TVMaze integration

**Notification Service** (src/core/notifications/)
- Discord, Telegram, Email
- Plex/Kodi notifications
- Pushover, Gotify, Join
- Webhook support

### 1.2 Database Schema

**Primary Tables** (PostgreSQL)
```sql
-- Core Entities
Series (id, tvdb_id, title, sort_title, status, monitored, path, quality_profile_id, ...)
Episodes (id, series_id, season_number, episode_number, air_date, title, monitored, ...)
Seasons (id, series_id, season_number, monitored, monitored_type, ...)
EpisodeFiles (id, series_id, season_number, episode_number, path, quality, language, ...)
RootFolders (id, path, free_space, total_space, unmapped_folders)

-- Configuration
QualityProfiles (id, name, cutoff, items)
QualityProfileItems (id, quality_profile_id, quality_id, allowed, min_score, max_score)
CustomFormats (id, name, specifications, include_custom_format_when_renaming)
Tags (id, label, ...)
Indexers (id, name, config, enabled, priority)
DownloadClients (id, name, type, config, enabled)
ImportLists (id, name, type, config, enabled)

-- Tracking
History (id, series_id, episode_id, source, quality, date, event_type)
Blocklist (id, series_id, episode_id, source_title, source, date)
Queue (id, series_id, episode_id, title, quality, added, status)
IndexerStatus (id, indexer_id, last_rss_sync, initial_failure, most_recent_failure, ...)
DownloadClientStatus (id, download_client_id, protocol, category, initial_failure, ...)

-- Metadata
SceneMappings (id, tvdb_id, term, season_number, scene_season_number)
AlternateTitles (id, series_id, title, season_number, episode_number, vote_count, vote_score)
```

**Indexes**: Primary key on all tables, indexes on:
- series.title, series.sort_title
- episodes.series_id, episodes.air_date
- episodes.series_id, episodes.season_number, episodes.episode_number
- history.date
- queue.status
- blocklist.source_title

### 1.3 API Architecture

**REST API v5** (OpenAPI specification)
- Base path: `/api/v3` (for compatibility)
- Authentication: API key header (X-Api-Key)
- Response format: JSON

**Key Endpoints**
```
GET    /api/v3/series                    # List all series
GET    /api/v3/series/{id}               # Get series details
POST   /api/v3/series                    # Add series
PUT    /api/v3/series/{id}               # Update series
DELETE /api/v3/series/{id}               # Delete series
PUT    /api/v3/series/{id}/season         # Update season monitoring

GET    /api/v3/episode                   # List episodes
GET    /api/v3/episode/{id}              # Get episode details
PUT    /api/v3/episode/{id}              # Update episode
PUT    /api/v3/episode/{id}/monitor       # Toggle monitoring

GET    /api/v3/wanted/missing             # Missing episodes
GET    /api/v3/wanted/cutoff              # Cutoff episodes
POST   /api/v3/wanted/missing             # Search missing

GET    /api/v3/queue                     # Download queue
DELETE /api/v3/queue/{id}                # Remove from queue
POST   /api/v3/queue/grab                # Manual grab

GET    /api/v3/release                    # Search releases
POST   /api/v3/release/{id}               # Grab release

GET    /api/v3/calendar                  # Calendar view
GET    /api/v3/history                   # Download history

GET    /api/v3/indexer                   # List indexers
GET    /api/v3/indexer/{id}/status       # Indexer status

GET    /api/v3/downloadclient             # List download clients
GET    /api/v3/downloadclient/{id}/status # Client status

GET    /api/v3/rootfolder                # List root folders
POST   /api/v3/rootfolder                # Add root folder

GET    /api/v3/qualityprofile            # List quality profiles
GET    /api/v3/qualityprofile/{id}       # Get quality profile
PUT    /api/v3/qualityprofile/{id}       # Update quality profile

GET    /api/v3/customformat              # List custom formats
PUT    /api/v3/customformat/{id}         # Update custom format

GET    /api/v3/tag                       # List tags
GET    /api/v3/notification              # List notifications
POST   /api/v3/notification              # Test notification

GET    /api/v3/system/status             # System status
GET    /api/v3/system/health             # Health checks
POST   /api/v3/command                  # Execute commands

GET    /api/v3/log/file                  # Get log file
GET    /api/v3/log/update                # Get updates via SSE

GET    /api/v3/config/host               # Get host config
PUT    /api/v3/config/host               # Update host config
```

**SignalR/WebSocket** for real-time events
- Series updates (add/edit/delete)
- Episode updates
- Download queue changes
- Import completion
- Health status changes
- Notification broadcasts

### 1.4 Frontend Architecture (Modern TypeScript + UI Framework)

**UI Framework Options**:
1. **Next.js 14+** (App Router) - Recommended
   - Server components for initial load
   - API routes for backend proxy
   - Built-in TypeScript support
   - Excellent DX

2. **SvelteKit 5+**
   - Lightweight & fast
   - Great performance
   - Smaller bundle size

3. **SolidJS**
   - React-like but faster
   - Fine-grained reactivity
   - Great DX

**State Management**:
- Zustand (replacing Redux - simpler & better TypeScript)
- TanStack Query for server state
- Context API for global app state

**Component Structure** (Based on frontend/src/)
```
src/
├── app/                          # Next.js app router (or pages)
├── components/
│   ├── series/
│   │   ├── SeriesIndex.tsx
│   │   ├── SeriesDetails.tsx
│   │   ├── SeriesEditor.tsx
│   │   ├── SeasonPass.tsx
│   │   └── AddSeries.tsx
│   ├── episode/
│   │   ├── EpisodeIndex.tsx
│   │   ├── EpisodeDetails.tsx
│   │   └── EpisodeEditor.tsx
│   ├── calendar/
│   ├── wanted/
│   │   ├── Missing.tsx
│   │   └── Cutoff.tsx
│   ├── queue/
│   │   ├── QueueRow.tsx
│   │   └── QueueStatus.tsx
│   ├── history/
│   ├── activity/
│   ├── settings/
│   │   ├── IndexerSettings.tsx
│   │   ├── DownloadClientSettings.tsx
│   │   ├── QualityProfileSettings.tsx
│   │   ├── NotificationSettings.tsx
│   │   └── MediaManagementSettings.tsx
│   └── shared/
│       ├── PageHeader.tsx
│       ├── Icon.tsx
│       ├── Spinner.tsx
│       └── Modal.tsx
├── hooks/
│   ├── useSignalR.ts
│   ├── useSeries.ts
│   ├── useQueue.ts
│   └── useDebounce.ts
├── store/
│   ├── seriesStore.ts
│   ├── settingsStore.ts
│   └── uiStore.ts
├── api/
│   ├── client.ts              # API client with auth
│   ├── series.ts
│   ├── episode.ts
│   ├── release.ts
│   └── indexer.ts
├── types/
│   ├── series.ts
│   ├── episode.ts
│   ├── release.ts
│   └── index.ts
├── utils/
│   ├── formatDate.ts
│   ├── formatBytes.ts
│   └── parsers.ts
└── styles/
    └── globals.css
```

**UI/UX Improvements** (Quality of Life Features)

1. **Modern Design System**
   - Dark/light mode toggle (shadcn/ui based)
   - Smooth animations & transitions
   - Responsive mobile-first design
   - Better visual hierarchy
   - Improved contrast & accessibility (WCAG AA)

2. **Enhanced Series Management**
   - Drag & drop series reordering
   - Bulk actions with better UI
   - Quick search with fuzzy matching
   - Poster grid/list toggle
   - Advanced filters (genre, network, status)
   - Series grouping (collections/tags)

3. **Improved Calendar View**
   - Multiple calendar views (month/week/day)
   - Customizable time zones
   - Episode preview on hover
   - Filter by monitored status
   - Export calendar (ICS format)

4. **Better Queue Management**
   - Real-time progress bars
   - Visual status indicators
   - Auto-refresh (SignalR)
   - Queue priority management
   - Bulk actions (pause/resume/remove)

5. **Enhanced Search**
   - Global search (Cmd+K)
   - Search by series name, episode, release
   - Advanced filters (quality, indexer, language)
   - Save search presets
   - Search history

6. **Improved Settings**
   - Organized sections with tabs
   - Live validation feedback
   - Tooltips & help text
   - Reset to defaults
   - Import/export settings
   - Settings presets (minimal/standard/power user)

7. **Analytics Dashboard**
   - Download statistics (charts)
   - Storage usage over time
   - indexer performance metrics
   - Series completion status
   - Daily/weekly activity summary

8. **Quality of Life Features**
   - Keyboard shortcuts throughout
   - Undo/redo for common actions
   - Copy to clipboard (series paths, API key)
   - Quick actions on series cards
   - Customizable dashboard widgets
   - Notification filtering
   - Email digest options
   - Backup/restore configuration

9. **Mobile Enhancements**
   - Touch-friendly gestures
   - Swipe actions (left/right)
   - Bottom navigation bar
   - Pull-to-refresh
   - Offline mode indicator

10. **Advanced Features**
    - AI-powered release scoring (optional)
    - Automatic quality upgrades with preferences
    - Smart episode monitoring (skip specials, etc.)
    - Series recommendations based on library
    - Duplicate detection across library
    - Media info display (resolution, codec, audio)
    - Subtitle management integration

---

## 2. Technology Stack

### 2.1 Backend
- **Runtime**: Bun 1.0+
- **Language**: TypeScript 5.7+
- **Framework**: Hono (lightweight) or Express
- **ORM**: Prisma or Drizzle ORM
- **Database**: PostgreSQL 16+
- **Real-time**: Bun WebSockets (or Socket.IO)
- **Task Scheduler**: Bun workers + BullMQ
- **Authentication**: API keys, JWT for web UI
- **Validation**: Zod
- **Logging**: pino or winston
- **Testing**: Bun test + Vitest

### 2.2 Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts or Chart.js
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Testing**: Vitest + Playwright

### 2.3 DevOps
- **Container**: Docker multi-stage builds
- **Process**: PM2 or systemd
- **CI/CD**: GitHub Actions
- **Database Migrations**: Prisma migrate
- **Reverse Proxy**: Caddy or nginx

---

## 3. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)
**Goal**: Project setup and core infrastructure

#### Week 1: Project Setup
- [ ] Initialize Bun project with TypeScript
- [ ] Set up Next.js frontend
- [ ] Configure Prisma with PostgreSQL
- [ ] Set up monorepo (turborepo or workspace)
- [ ] Configure ESLint, Prettier, TypeScript strict mode
- [ ] Set up Docker Compose (dev env)
- [ ] Create GitHub Actions CI/CD
- [ ] Design system setup (shadcn/ui)

#### Week 2: Database & Models
- [ ] Define Prisma schema (all core tables)
- [ ] Create initial migration
- [ ] Set up seed data (quality profiles, languages)
- [ ] Create repository base class
- [ ] Implement basic CRUD operations
- [ ] Write unit tests for repositories

#### Week 3: API Infrastructure
- [ ] Set up Hono/Express server
- [ ] Create middleware (auth, logging, CORS)
- [ ] Implement API key authentication
- [ ] Create base controller class
- [ ] Set up validation middleware (Zod)
- [ ] Create error handling middleware
- [ ] Set up OpenAPI/Swagger docs

#### Week 4: Frontend Foundation
- [ ] Create app layout structure
- [ ] Set up Zustand stores
- [ ] Create API client with fetch
- [ ] Implement auth provider
- [ ] Create routing structure
- [ ] Build basic components (Button, Input, Card, Modal)
- [ ] Set up SignalR/WebSocket hook

### Phase 2: Core TV Management (Weeks 5-8)
**Goal**: Series and episode management

#### Week 5: Series CRUD
- [ ] Series API endpoints (GET, POST, PUT, DELETE)
- [ ] Series details API
- [ ] Series statistics calculation
- [ ] Series search API
- [ ] Frontend: Series index page
- [ ] Frontend: Series details page
- [ ] Frontend: Add series modal

#### Week 6: Episode Management
- [ ] Episode API endpoints
- [ ] Episode monitoring toggle
- [ ] Episode search & filtering
- [ ] Frontend: Episode list page
- [ ] Frontend: Episode details page
- [ ] Bulk episode actions

#### Week 7: Season Management
- [ ] Season API endpoints
- [ ] Season monitoring options
- [ ] Frontend: Season pass page
- [ ] Season monitoring bulk edit
- [ ] Season folder management

#### Week 8: Import & Discovery
- [ ] TVDB API integration
- [ ] TMDB API integration
- [ ] Series metadata sync service
- [ ] Poster/fanart download
- [ ] Frontend: Add series search
- [ ] Frontend: Import list display

### Phase 3: Download Pipeline (Weeks 9-12)
**Goal**: Indexing and downloading

#### Week 9: Indexer Integration
- [ ] Indexer base class
- [ ] RSS feed parser
- [ ] Torznab/Newznab protocol
- [ ] Indexer API endpoints
- [ ] Indexer status tracking
- [ ] Frontend: Indexer settings page

#### Week 10: Release Parser
- [ ] Filename parser (quality, series, season/episode)
- [ ] Language detection
- [ ] Release title normalization
- [ ] Parser API (test parsing)
- [ ] Unit tests for parser

#### Week 11: Download Clients
- [ ] Download client base class
- [ ] SABnzbd integration
- [ ] NZBGet integration
- [ ] qBittorrent integration
- [ ] Download client API endpoints
- [ ] Frontend: Download client settings

#### Week 12: Decision Engine
- [ ] Release scoring algorithm
- [ ] Quality profile matching
- [ ] Custom format support
- [ ] Release rejection logic
- [ ] Release search API
- [ ] Frontend: Release search UI

### Phase 4: Queue & Import (Weeks 13-16)
**Goal**: Download queue and media importing

#### Week 13: Queue Management
- [ ] Queue model & API
- [ ] Download tracking service
- [ ] Queue status updates
- [ ] SignalR real-time updates
- [ ] Frontend: Queue page with real-time updates
- [ ] Queue actions (pause, resume, remove)

#### Week 14: Media Files Service
- [ ] Disk scanner
- [ ] Episode file detection
- [ ] Video file validation
- [ ] Import decision logic
- [ ] Episode file API

#### Week 15: Import Process
- [ ] Automatic import from download clients
- [ ] Manual import flow
- [ ] Interactive import UI
- [ ] Import event handling
- [ ] SignalR import notifications

#### Week 16: History & Blocklist
- [ ] History API endpoints
- [ ] Blocklist API endpoints
- [ ] Frontend: History page
- [ ] Frontend: Blocklist page
- [ ] History statistics

### Phase 5: Organization & Renaming (Weeks 17-20)
**Goal**: File organization and renaming

#### Week 17: Naming Configuration
- [ ] Naming pattern system
- [ ] Pattern editor UI
- [ ] Pattern validation
- [ ] Test renaming preview
- [ ] Naming API

#### Week 18: File Organizer
- [ ] File moving service
- [ ] File renaming service
- [ ] Season folder creation
- [ ] Series folder management
- [ ] Root folder monitoring

#### Week 19: Quality Profiles
- [ ] Quality profile CRUD
- [ ] Quality profile items
- [ ] Cutoff quality logic
- [ ] Frontend: Quality profile editor
- [ ] Quality profile presets

#### Week 20: Custom Formats
- [ ] Custom format model
- [ ] Format specifications
- [ ] Format matching logic
- [ ] Format editor UI
- [ ] Custom format API

### Phase 6: Notifications & Settings (Weeks 21-24)
**Goal**: Notifications and configuration

#### Week 21: Notifications
- [ ] Notification base class
- [ ] Discord integration
- [ ] Email integration
- [ ] Telegram integration
- [ ] Notification API endpoints
- [ ] Frontend: Notification settings

#### Week 22: System Settings
- [ ] Host settings API
- [ ] Security settings
- [ ] Logging configuration
- [ ] Frontend: System settings pages
- [ ] System status dashboard

#### Week 23: Import Lists
- [ ] Import list base class
- [ ] Trakt integration
- [ ] IMDB integration
- [ ] Import list sync service
- [ ] Frontend: Import list management

#### Week 24: Tags & Filters
- [ ] Tag CRUD
- [ ] Tag assignment
- [ ] Custom filters
- [ ] Frontend: Tag management
- [ ] Frontend: Filter builder

### Phase 7: Polish & Optimization (Weeks 25-28)
**Goal**: Performance, UX, and quality

#### Week 25: Performance
- [ ] Database query optimization
- [ ] API response caching
- [ ] Frontend code splitting
- [ ] Image optimization
- [ ] Bundle size reduction

#### Week 26: Real-time Updates
- [ ] SignalR/WebSocket for all updates
- [ ] Real-time queue sync
- [ ] Real-time series updates
- [ ] Real-time notifications
- [ ] Connection management

#### Week 27: Testing & QA
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Load testing
- [ ] Security audit
- [ ] Accessibility testing

#### Week 28: Documentation & Deployment
- [ ] API documentation
- [ ] User guide
- [ ] Deployment guide
- [ ] Docker images
- [ ] Release preparation

---

## 4. Quality of Life Features (Detailed)

### 4.1 User Experience Improvements

1. **Smart Dashboard**
   - Customizeable widgets (drag & drop)
   - Widget types: Calendar, Queue, Recent History, System Health, Storage, Activity
   - Widget size configuration (small/medium/large)
   - Dashboard presets (minimal, default, power user)

2. **Advanced Search**
   - Global keyboard shortcut (Cmd+K / Ctrl+K)
   - Search across series, episodes, releases
   - Boolean operators (AND, OR, NOT)
   - Field-specific search (title:, quality:, indexer:)
   - Search history & saved searches
   - Quick actions from search results

3. **Enhanced Series Cards**
   - Hover actions (edit, delete, search, monitor)
   - Show download progress on poster
   - Episode count badge (downloaded/total)
   - Quality indicators
   - Custom tags display
   - Last activity timestamp

4. **Better Queue Management**
   - Visual download progress (circular or bar)
   - ETA calculation
   - Download speed display
   - Queue item grouping by series
   - Automatic queue sorting options
   - Queue item priority controls

5. **Improved Calendar**
   - Mini calendar widget on dashboard
   - Episode thumbnails on hover
   - Episode preview modal
   - Export to Google Calendar
   - Calendar sharing (public/private link)
   - Custom date formats

6. **Keyboard Shortcuts**
   - Global: Cmd+K (search), Cmd+? (help), Cmd+, (settings)
   - Series: N (new series), / (search), Esc (close modal)
   - Navigation: Arrow keys, Enter (select), Esc (go back)
   - Actions: D (download), M (monitor toggle), E (edit)

7. **Bulk Actions**
   - Multi-select with checkboxes
   - Action menu with options
   - Confirmation modals
   - Progress indicator
   - Undo capability

8. **Smart Notifications**
   - Notification filtering (by type, severity)
   - Notification grouping
   - Quiet hours configuration
   - Email digest (daily/weekly)
   - Notification sounds (optional)

9. **Theme & Customization**
   - Light/dark mode (system preference or manual)
   - Accent color selection
   - Font size adjustment
   - Compact/comfortable density
   - Custom CSS injection (advanced)
   - Reset to defaults

10. **Accessibility**
    - Full keyboard navigation
    - Screen reader support
    - High contrast mode
    - Reduced motion mode
    - Focus indicators
    - ARIA labels throughout
    - WCAG AA compliance

### 4.2 Power User Features

1. **Advanced Filtering**
   - Save filter presets
   - Share filter presets
   - Filter by multiple conditions
   - Filter by custom format
   - Filter by quality profile
   - Filter by tag

2. **Analytics & Reporting**
   - Download statistics (chart)
   - Storage usage trend
   - Indexer success rate
   - Series completion rate
   - Activity heat map
   - Export to CSV/JSON

3. **API Enhancements**
   - GraphQL support (optional)
   - Webhook callbacks
   - API rate limiting
   - API key management
   - API activity log

4. **Import/Export**
   - Import settings from Sonarr
   - Export configuration
   - Backup to cloud (S3, Dropbox)
   - Schedule automatic backups
   - Restore from backup

5. **Automation**
   - Custom scripts on events (import, download, etc.)
   - Webhook triggers
   - IFTTT/Zapier integration
   - Email notifications for specific events

---

## 5. Data Models (TypeScript Interfaces)

### 5.1 Core Models

```typescript
// Series Model
interface Series {
  id: number;
  tvdbId: number;
  tmdbId: number;
  imdbId: string;
  title: string;
  sortTitle: string;
  status: 'continuing' | 'ended' | 'upcoming';
  overview: string;
  network: string;
  airTime: string;
  monitored: boolean;
  monitorNewItems: 'all' | 'new' | 'none';
  qualityProfileId: number;
  seasonFolder: boolean;
  useSceneNumbering: boolean;
  path: string;
  year: number;
  runtime: number;
  genres: string[];
  tags: number[];
  added: Date;
  firstAired?: Date;
  lastAired?: Date;
  images: MediaCover[];
  seasons: Season[];
  statistics?: SeriesStatistics;
}

// Episode Model
interface Episode {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  airDate: Date;
  airDateUtc?: Date;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  unverifiedSceneNumbering?: boolean;
  file?: EpisodeFile;
  images?: MediaCover[];
}

// EpisodeFile Model
interface EpisodeFile {
  id: number;
  seriesId: number;
  seasonNumber: number;
  episodeNumbers: number[];
  relativePath: string;
  path: string;
  size: number;
  dateAdded: Date;
  quality: Quality;
  language: Language;
  mediaInfo: MediaInfo;
}

// Quality Model
interface Quality {
  quality: QualityDefinition;
  revision: {
    version: number;
    real: number;
  };
}

interface QualityDefinition {
  id: number;
  name: string;
  source: 'television' | 'web' | 'bluray' | 'dvd';
  resolution: number | null;
  modifier: 'none' | 'proper' | 'repack' | 'remux' | 'dub' | 'subbed';
}

// Custom Format Model
interface CustomFormat {
  id: number;
  name: string;
  includeCustomFormatWhenRenaming: boolean;
  specifications: Specification[];
  name: string;
  tags: number[];
}

// Indexer Model
interface Indexer {
  id: number;
  name: string;
  config: IndexerConfig;
  enable: boolean;
  protocol: 'torrent' | 'usenet';
  priority: number;
  downloadClientId?: number;
}

// Download Client Model
interface DownloadClient {
  id: number;
  name: string;
  enable: boolean;
  protocol: 'torrent' | 'usenet';
  priority: number;
  removeCompletedDownloads: boolean;
  removeFailedDownloads: boolean;
  config: DownloadClientConfig;
}

// Queue Item Model
interface QueueItem {
  id: number;
  seriesId: number;
  episodeId: number;
  series?: Series;
  episode?: Episode;
  language: Language;
  quality: Quality;
  customFormats: CustomFormat[];
  customFormatScore: number;
  indexer: string;
  downloadClient: string;
  size: number;
  title: string;
  sizeleft: number;
  timeleft: string;
  estimatedCompletionTime: Date;
  status: 'queued' | 'grabbed' | 'downloading' | 'completed' | 'failed';
  trackedDownloadStatus?: 'ok' | 'warning' | 'error';
  trackedDownloadState?: 'downloading' | 'importing' | 'failed';
  errorMessage?: string;
}

// History Item Model
interface HistoryItem {
  id: number;
  seriesId: number;
  episodeId: number;
  sourceTitle: string;
  quality: Quality;
  customFormats: CustomFormat[];
  customFormatScore: number;
  date: Date;
  data?: HistoryData;
  eventType: 'grabbed' | 'downloadFolderImported' | 'downloadFailed' | 'downloadIgnored' | 'fileDeleted' | 'seriesDeleted';
}

// Quality Profile Model
interface QualityProfile {
  id: number;
  name: string;
  cutoff: number;
  items: QualityProfileItem[];
  minFormatScore: number;
  upgradeAllowed: boolean;
}

interface QualityProfileItem {
  id: number;
  quality: QualityDefinition;
  allowed: boolean;
  name: string;
}

// Tag Model
interface Tag {
  id: number;
  label: string;
}

// Import List Model
interface ImportList {
  id: number;
  name: string;
  enabled: boolean;
  enableAuto: boolean;
  listType: ImportListType;
  qualityProfileId: number;
  rootFolderPath: string;
  tags: number[];
  listOrder: number;
  config: ImportListConfig;
}
```

---

## 6. API Client Implementation

```typescript
// api/client.ts
import { createFetchClient } from '@hey-api/client-fetch';
import type { client } from '@hey-api/openapi-ts';

const apiClient = createFetchClient<client>({
  baseUrl: `${window.location.origin}/api/v3`,
  headers: {
    'X-Api-Key': localStorage.getItem('apiKey') || '',
    'Content-Type': 'application/json',
  },
});

export default apiClient;

// api/series.ts
import { Service } from '@hey-api/client-fetch';
import { getSeries, getSeriesId, postSeries, putSeriesId, deleteSeriesId } from '@hey-api/openapi-ts';

export const seriesService = new Service({
  fetch: apiClient,
});

export async function getAllSeries() {
  return getSeries({}, { client: seriesService });
}

export async function getSeriesById(id: number) {
  return getSeriesId({ id }, { client: seriesService });
}

export async function addSeries(series: Series) {
  return postSeries({ body: series }, { client: seriesService });
}

export async function updateSeries(id: number, series: Partial<Series>) {
  return putSeriesId({ id, body: series }, { client: seriesService });
}

export async function deleteSeries(id: number) {
  return deleteSeriesId({ id }, { client: seriesService });
}
```

---

## 7. Database Schema (Prisma)

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Series {
  id              Int          @id @default(autoincrement())
  tvdbId          Int          @unique
  tmdbId          Int?
  imdbId          String?
  title           String
  sortTitle       String
  status          SeriesStatus
  overview        String?      @db.Text
  network         String?
  airTime         String?
  monitored       Boolean      @default(false)
  monitorNewItems NewItemMonitorTypes
  qualityProfileId  Int
  seasonFolder     Boolean      @default(true)
  useSceneNumbering Boolean      @default(false)
  path            String       @unique
  year            Int
  runtime         Int
  genres          String[]
  added           DateTime     @default(now())
  firstAired      DateTime?
  lastAired       DateTime?
  rootFolderPath  String

  episodes        Episode[]
  seasonPass      SeasonPass[]
  history         History[]
  queue           Queue[]
  tags            SeriesTag[]
  qualityProfile   QualityProfile @relation(fields: [qualityProfileId], references: [id])

  @@index([title])
  @@index([sortTitle])
}

model Episode {
  id                     Int        @id @default(autoincrement())
  seriesId               Int
  seasonNumber           Int
  episodeNumber          Int
  title                  String
  airDate                DateTime
  airDateUtc             DateTime?
  overview               String?     @db.Text
  hasFile                Boolean     @default(false)
  monitored              Boolean     @default(false)
  absoluteEpisodeNumber    Int?
  unverifiedSceneNumbering Boolean     @default(false)

  series                 Series      @relation(fields: [seriesId], references: [id])
  file                   EpisodeFile?
  history                History[]
  queue                  Queue[]

  @@index([seriesId])
  @@index([seriesId, seasonNumber, episodeNumber])
  @@index([airDate])
}

model EpisodeFile {
  id             Int      @id @default(autoincrement())
  seriesId       Int
  seasonNumber    Int
  episodeNumbers Int[]
  relativePath    String
  path           String   @unique
  size           BigInt
  dateAdded      DateTime @default(now())
  qualityId      Int
  languageId      Int

  series         Series   @relation(fields: [seriesId], references: [id])
  quality        Quality  @relation(fields: [qualityId], references: [id])
  language       Language  @relation(fields: [languageId], references: [id])
  episodes       Episode[]
}

model QualityProfile {
  id            Int                  @id @default(autoincrement())
  name          String               @unique
  cutoff        Int
  items         QualityProfileItem[]
  series        Series[]

  minFormatScore Int                  @default(0)
  upgradeAllowed Boolean              @default(true)
}

model QualityProfileItem {
  id              Int      @id @default(autoincrement())
  qualityProfileId Int
  qualityId       Int
  allowed         Boolean
  name            String

  qualityProfile   QualityProfile @relation(fields: [qualityProfileId], references: [id], onDelete: Cascade)
  quality         Quality       @relation(fields: [qualityId], references: [id], onDelete: Cascade)
}

// ... (more models)
```

---

## 8. Deployment Strategy

### 8.1 Development
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: sonarr_dev
      POSTGRES_USER: sonarr
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    command: bun run --watch src/index.ts
    environment:
      DATABASE_URL: postgresql://sonarr:password@postgres:5432/sonarr_dev
      REDIS_URL: redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    command: bun run dev
    ports:
      - "3001:3001"
    volumes:
      - ./frontend:/app/frontend

volumes:
  postgres_data:
```

### 8.2 Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  sonarr:
    image: your-registry/sonarr:latest
    restart: unless-stopped
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      API_KEY: ${API_KEY}
    ports:
      - "8989:8989"
    volumes:
      - ./config:/config
      - ./media:/media
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: sonarr
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - ./redis:/data
```

---

## 9. Key Considerations & Risks

### 9.1 Technical Risks
- **Parser Complexity**: Release parsing is complex (70k lines in Sonarr) - need comprehensive test suite
- **API Compatibility**: Need to maintain compatibility with existing tools (Plex, etc.)
- **Performance**: Large libraries (1000+ series) require optimized queries and pagination
- **Database Migration**: From SQLite to PostgreSQL needs migration scripts
- **Real-time Scaling**: SignalR alternatives need to handle multiple concurrent connections

### 9.2 Challenges
- **Feature Parity**: Sonarr has 10+ years of development - need to prioritize core features
- **Third-party Integrations**: Many indexers/clients to support - plugin architecture needed
- **Testing**: E2E tests for complex workflows (import, download, organize)
- **Documentation**: Extensive user and API documentation needed

### 9.3 Mitigation Strategies
- Start with core features only (Series, Episodes, Basic Search, Download)
- Modular architecture allows adding features incrementally
- Comprehensive test coverage (unit, integration, E2E)
- Early user feedback through beta testing
- Focus on UX improvements over feature bloat

---

## 10. Success Metrics

### 10.1 Performance Targets
- API response time: < 200ms (p95)
- Page load time: < 2s
- Time to interactive: < 3s
- Database query time: < 50ms (p95)
- WebSocket latency: < 100ms
- Bundle size: < 500KB (gzipped)

### 10.2 Quality Metrics
- Test coverage: > 80%
- Accessibility score: > 95 (Lighthouse)
- Type coverage: 100%
- Zero critical security vulnerabilities
- Zero TypeScript errors

### 10.3 User Experience Metrics
- Task completion rate: > 90%
- Error rate: < 1%
- Time to add series: < 30s
- Time to find download: < 10s
- User satisfaction: > 4.5/5 (surveys)

---

## 11. Next Steps (Immediate Actions)

1. **Tech Stack Finalization**
   - Finalize UI framework choice (Next.js vs SvelteKit vs Solid)
   - Choose ORM (Prisma vs Drizzle)
   - Select real-time solution

2. **Design System**
   - Create design tokens (colors, typography, spacing)
   - Build core component library (Button, Input, Card, Modal)
   - Document component usage

3. **Prototype Development**
   - Build simple series list page
   - Implement series details view
   - Create basic API endpoints
   - Test database operations

4. **User Research**
   - Survey current Sonarr users for pain points
   - Identify most requested features
   - Prioritize based on user feedback

5. **Infrastructure Setup**
   - Set up CI/CD pipeline
   - Configure staging environment
   - Set up monitoring (Sentry, logs)

---

## 12. Open Questions

1. **Migration Path**: Should we provide import from Sonarr v3/v4/v5 databases?
2. **API Compatibility**: Maintain Sonarr API v3 compatibility or create v4?
3. **Web UI vs API Only**: Should we build full web UI or focus on API-first?
4. **Plugin Architecture**: How to handle third-party indexer/download client plugins?
5. **Testing Strategy**: How much E2E testing vs unit testing?
6. **Performance**: How to handle libraries with 10,000+ episodes?
7. **Deployment**: Docker-only or also support native packages?

---

## 13. Timeline Overview

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Foundation | 4 weeks | Project setup, database, API infra, UI framework |
| Core TV Management | 4 weeks | Series, episodes, seasons, metadata sync |
| Download Pipeline | 4 weeks | Indexers, parser, download clients, decision engine |
| Queue & Import | 4 weeks | Queue management, media files, history |
| Organization | 4 weeks | Naming, organizing, quality profiles, custom formats |
| Notifications & Settings | 4 weeks | Notifications, system settings, import lists, tags |
| Polish & Optimization | 4 weeks | Performance, real-time, testing, docs |

**Total**: 28 weeks (~7 months) for full feature parity with basic UI improvements

**MVP Path**: 12 weeks (~3 months) for core functionality (Series, Episodes, Basic Search, Download, Import)

---

## 14. Resources & References

- **Sonarr Source**: https://github.com/Sonarr/Sonarr
- **Sonarr Wiki**: https://wiki.servarr.com/Sonarr
- **Sonarr API Docs**: https://sonarr.tv/docs/api
- **TVDB API**: https://thetvdb.com/api
- **TMDB API**: https://www.themoviedb.org/documentation/api
- **Torznab/Newznab Specs**: https://github.com/Servarr/Newznab
- **Prisma**: https://www.prisma.io/docs
- **Next.js**: https://nextjs.org/docs
- **Bun**: https://bun.sh/docs
- **shadcn/ui**: https://ui.shadcn.com

---

*This project plan serves as a comprehensive guide for rebuilding Sonarr with modern technologies. Adjust timelines and priorities based on team size, resources, and market feedback.*