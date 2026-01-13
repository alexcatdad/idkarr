# idkarr Project Task Breakdown

> **Generated**: January 13, 2026
> **Purpose**: Refined task breakdown for the idkarr project with user stories, acceptance criteria, and parallelization strategy
> **Format**: Scrum-compliant with User, Developer, and Business Stakeholder perspectives

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Documentation Gaps & Issues Found](#documentation-gaps--issues-found)
3. [Epic Structure](#epic-structure)
4. [Phase 0: Foundation & Critical Fixes](#phase-0-foundation--critical-fixes)
5. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
6. [Phase 2: Media Management](#phase-2-media-management)
7. [Phase 3: Download Pipeline](#phase-3-download-pipeline)
8. [Phase 4: User & Discovery](#phase-4-user--discovery)
9. [Phase 5: Advanced Features](#phase-5-advanced-features)
10. [Phase 6: Polish & Production](#phase-6-polish--production)
11. [Parallelization Strategy](#parallelization-strategy)
12. [Dependency Graph](#dependency-graph)
13. [Risk Register](#risk-register)

---

## Executive Summary

This document provides a refined, parallelizable task breakdown for the idkarr project. Based on analysis of existing documentation, we identified:

- **20+ critical documentation gaps** requiring resolution before implementation
- **8 logical inconsistencies** between feature documents
- **15+ missing API endpoints** referenced in features but not documented
- **Cross-document naming conflicts** (media vs series tables)

The tasks are organized into 6 phases with maximum parallelization opportunity. Each task follows Scrum format with three perspectives:
- **As a User** - End-user value
- **As a Developer** - Technical requirements
- **As a Business Stakeholder** - Business value and metrics

---

## Documentation Gaps & Issues Found

### Critical Issues (Must Fix Before Development)

| Issue ID | Description | Affected Docs | Impact |
|----------|-------------|---------------|--------|
| GAP-001 | `media` vs `series` table naming conflict | UNIFIED_MEDIA_MANAGER, MULTI_USER_ACL | Blocks schema implementation |
| GAP-002 | Instance table schema undefined | All feature docs | Multi-instance won't work |
| GAP-003 | Missing instance API endpoints | REST_API.md | Cannot manage instances via API |
| GAP-004 | Permission precedence rules undefined | MULTI_USER_ACL | ACL behavior unpredictable |
| GAP-005 | Language profile schema missing | UNIFIED_MEDIA_MANAGER | Language features blocked |
| GAP-006 | WebSocket events incomplete | WEBSOCKET_EVENTS.md | Real-time updates incomplete |
| GAP-007 | Error response format inconsistent | REST_API, WEBSOCKET | Client implementation confusion |
| GAP-008 | Service implementations undocumented | All feature docs | activityService, metadataService undefined |

### Logical Inconsistencies

| Issue ID | Description | Documents | Resolution Needed |
|----------|-------------|-----------|-------------------|
| LOGIC-001 | `runtime` field overloaded (movies vs episodes) | UNIFIED_MEDIA_MANAGER | Use separate fields |
| LOGIC-002 | `mediaId` nullable with unique constraint | DISCOVERY_REQUESTS | Constraint allows duplicate nulls |
| LOGIC-003 | userSeriesGrant refs series but media table exists | MULTI_USER_ACL | Update to mediaGrant |
| LOGIC-004 | Auto-approval condition ambiguous | DISCOVERY_REQUESTS | Clarify boolean logic |
| LOGIC-005 | Role priority sorting vs permission granting | MULTI_USER_ACL | Define precedence rules |
| LOGIC-006 | collaborativeFilter() defined but never called | AI_RECOMMENDATIONS | Dead code or missing integration |
| LOGIC-007 | Vector store type-specific but config generic | AI_RECOMMENDATIONS | Schema-config mismatch |
| LOGIC-008 | Session userId type mismatch (text vs integer) | DATABASE_SCHEMA | Standardize on integer |

### Missing Specifications

| Spec | Priority | Impact |
|------|----------|--------|
| Multi-region deployment strategy | P1 | Production readiness |
| Database failover RTO/RPO | P1 | Disaster recovery |
| TLS certificate automation | P1 | Security compliance |
| Incident response runbooks | P1 | Operations |
| SLO targets and alerting | P2 | Monitoring |
| Feature flag system | P2 | Release management |
| Cold start recommendations | P2 | AI feature UX |
| Privacy compliance for AI | P2 | Legal/compliance |

---

## Epic Structure

```
EPIC-0: Documentation & Schema Fixes (Prerequisite)
EPIC-1: Core Infrastructure
EPIC-2: Database & API Foundation
EPIC-3: Media Management (Series/Movies/Anime)
EPIC-4: Download Pipeline (Indexers, Clients, Queue)
EPIC-5: User Management & ACL
EPIC-6: Discovery & Requests
EPIC-7: Real-Time & WebSocket
EPIC-8: AI Recommendations
EPIC-9: Quality of Life Features
EPIC-10: Production Readiness
```

---

## Phase 0: Foundation & Critical Fixes

> **Duration**: 1 Sprint (2 weeks)
> **Prerequisite for**: All other phases
> **Parallelization**: Tasks P0-001 through P0-005 can run in parallel

### P0-001: Resolve Schema Naming Conflict

**As a Developer**, I need a unified naming convention for media entities so that I can implement consistent database schemas without ambiguity.

**As a Business Stakeholder**, I need technical debt resolved early so that we avoid costly refactoring later.

**Acceptance Criteria**:
- [ ] Decision documented: Use `media` table OR separate `series`/`movie` tables
- [ ] All documentation updated to reflect decision
- [ ] DATABASE_SCHEMA.md is single source of truth
- [ ] No references to conflicting table names remain

**Story Points**: 3
**Dependencies**: None
**Blocks**: All Phase 1+ tasks

---

### P0-002: Define Instance Table Schema

**As a Developer**, I need a complete instance table schema with all fields and relationships so that I can implement multi-instance support.

**As a User**, I need to manage separate TV, Movie, and Anime libraries so that I can organize my media collections.

**Acceptance Criteria**:
- [ ] Instance table schema added to DATABASE_SCHEMA.md
- [ ] Relationships to media, rootFolder, qualityProfile documented
- [ ] Instance-specific settings structure defined
- [ ] Default instance behavior specified
- [ ] Migration path for single-instance to multi-instance documented

**Story Points**: 5
**Dependencies**: P0-001
**Blocks**: EPIC-2, EPIC-3

---

### P0-003: Document Missing API Endpoints

**As a Developer**, I need complete API documentation so that I can implement all required endpoints without guessing.

**As a User**, I need programmatic access to all features so that I can build automations and integrations.

**Acceptance Criteria**:
- [ ] Instance management endpoints documented (CRUD)
- [ ] Release profile endpoints documented
- [ ] Request/Watchlist endpoints documented
- [ ] Role/Permission management endpoints documented
- [ ] Audit log query endpoints documented
- [ ] All endpoints have request/response examples
- [ ] Error responses standardized across all endpoints

**Story Points**: 8
**Dependencies**: P0-001, P0-002
**Blocks**: EPIC-2

---

### P0-004: Define Permission Precedence Rules

**As a Developer**, I need clear permission resolution rules so that I can implement ACL correctly.

**As a User**, I need predictable permission behavior so that I know what actions I can perform.

**As a Business Stakeholder**, I need proper access control so that data is protected and compliance is maintained.

**Acceptance Criteria**:
- [ ] Rule: User-specific grants override role grants (documented)
- [ ] Rule: Deny takes precedence over allow at same level (documented)
- [ ] Rule: Higher priority roles evaluated first (documented)
- [ ] Rule: Instance grants scope applies correctly (documented)
- [ ] Decision tree diagram for permission resolution
- [ ] Test cases for all permission scenarios
- [ ] Edge cases documented (conflicting grants, no grants)

**Story Points**: 5
**Dependencies**: None
**Blocks**: EPIC-5

---

### P0-005: Standardize Error Response Format

**As a Developer**, I need consistent error responses across REST API and WebSocket so that I can handle errors uniformly in the frontend.

**As a User**, I need clear error messages so that I understand what went wrong and how to fix it.

**Acceptance Criteria**:
- [ ] Single error response schema documented
- [ ] REST and WebSocket use identical error structure
- [ ] Error codes catalog complete (min 50 codes)
- [ ] Localization keys defined for all error messages
- [ ] Validation error format standardized
- [ ] Example errors for each error category

**Story Points**: 3
**Dependencies**: None
**Blocks**: EPIC-2, EPIC-7

---

### P0-006: Complete WebSocket Event Catalog

**As a Developer**, I need all WebSocket events documented so that I can implement real-time features completely.

**As a User**, I need real-time updates for all actions so that my UI stays synchronized.

**Acceptance Criteria**:
- [ ] Indexer status events added
- [ ] Download client status events added
- [ ] Quality profile update events added
- [ ] Custom format update events added
- [ ] Tag management events added
- [ ] Movie lifecycle events completed
- [ ] File organization events added
- [ ] Parse error events added
- [ ] All events have TypeScript interfaces defined

**Story Points**: 5
**Dependencies**: None
**Blocks**: EPIC-7

---

### P0-007: Document Core Services

**As a Developer**, I need service interfaces documented so that I can implement them with correct contracts.

**Acceptance Criteria**:
- [ ] ActivityService interface and methods documented
- [ ] MetadataService interface and methods documented
- [ ] NotificationService interface and methods documented
- [ ] QueueService interface and methods documented
- [ ] SearchService interface and methods documented
- [ ] Each service has error handling documented
- [ ] Each service has logging requirements

**Story Points**: 5
**Dependencies**: None
**Blocks**: EPIC-3, EPIC-4, EPIC-6

---

## Phase 1: Core Infrastructure

> **Duration**: 2 Sprints (4 weeks)
> **Parallel Streams**: 3 (Backend, Frontend, DevOps)
> **Prerequisites**: Phase 0 complete

### Stream A: Backend Infrastructure

#### P1-A-001: Project Setup & Monorepo

**As a Developer**, I need a well-structured monorepo so that I can work on backend and frontend with shared types.

**Acceptance Criteria**:
- [ ] Bun workspace configured with packages: `@idkarr/backend`, `@idkarr/frontend`, `@idkarr/shared`
- [ ] TypeScript strict mode enabled
- [ ] ESLint + Prettier configured
- [ ] Husky pre-commit hooks configured
- [ ] Path aliases working (@idkarr/shared imports)
- [ ] Hot reload working for all packages

**Story Points**: 5
**Dependencies**: None
**Parallelizable**: Yes (with P1-B-001, P1-C-001)

---

#### P1-A-002: Database Setup & Schema

**As a Developer**, I need PostgreSQL with Drizzle ORM configured so that I can start implementing data access.

**Acceptance Criteria**:
- [ ] PostgreSQL 16 container configured
- [ ] Drizzle ORM initialized
- [ ] All schema files from DATABASE_SCHEMA.md implemented
- [ ] Initial migration generated and tested
- [ ] Seed data for quality definitions, languages, default roles
- [ ] Database client singleton with connection pooling
- [ ] Type-safe query builder working

**Story Points**: 13
**Dependencies**: P0-001, P0-002
**Parallelizable**: Yes (after P1-A-001)

---

#### P1-A-003: API Framework Setup

**As a Developer**, I need Hono framework configured with middleware so that I can implement API endpoints.

**Acceptance Criteria**:
- [ ] Hono v4 configured with Bun
- [ ] Request validation middleware (Zod)
- [ ] Error handling middleware
- [ ] Logging middleware (Pino)
- [ ] CORS middleware configured
- [ ] Rate limiting middleware (configurable)
- [ ] OpenAPI documentation generation
- [ ] Health check endpoint (/api/health)
- [ ] Response time < 10ms for health check

**Story Points**: 8
**Dependencies**: P1-A-001
**Parallelizable**: Yes (with P1-A-002)

---

#### P1-A-004: Authentication System

**As a User**, I need to log in securely so that I can access my media library.

**As a Developer**, I need Lucia auth configured so that I can implement session management.

**Acceptance Criteria**:
- [ ] Lucia v3 configured with PostgreSQL adapter
- [ ] Password hashing with Argon2
- [ ] Session management (create, validate, destroy)
- [ ] API key authentication
- [ ] Session cookie configuration (httpOnly, secure, sameSite)
- [ ] Login endpoint with rate limiting (5 attempts/15 min)
- [ ] Session expiry (30 days, configurable)
- [ ] 2FA TOTP support (optional)
- [ ] Password reset flow

**Story Points**: 13
**Dependencies**: P1-A-002, P1-A-003
**Blocks**: EPIC-5

---

#### P1-A-005: Background Job System

**As a Developer**, I need BullMQ configured so that I can implement async tasks like RSS sync and metadata refresh.

**Acceptance Criteria**:
- [ ] BullMQ configured with Redis
- [ ] Job queues: `rss-sync`, `metadata-refresh`, `search`, `import`, `notification`
- [ ] Job retry configuration (3 retries, exponential backoff)
- [ ] Job priority levels (low, normal, high, critical)
- [ ] Bull Board UI configured for job monitoring
- [ ] Dead letter queue for failed jobs
- [ ] Job rate limiting per queue
- [ ] Graceful shutdown handling

**Story Points**: 8
**Dependencies**: P1-A-001
**Parallelizable**: Yes (with P1-A-002, P1-A-003)

---

### Stream B: Frontend Infrastructure

#### P1-B-001: Next.js Project Setup

**As a Developer**, I need Next.js 15 configured so that I can build the frontend application.

**Acceptance Criteria**:
- [ ] Next.js 15 with App Router configured
- [ ] TypeScript strict mode
- [ ] Tailwind CSS v4 configured
- [ ] shadcn/ui components installed
- [ ] Zustand store setup
- [ ] TanStack Query configured
- [ ] Environment variables validated (T3 Env)
- [ ] Dark/light theme toggle working

**Story Points**: 5
**Dependencies**: None
**Parallelizable**: Yes (with P1-A-001)

---

#### P1-B-002: Design System & Components

**As a User**, I need a consistent, accessible UI so that I can navigate the application easily.

**As a Developer**, I need reusable components so that I can build features faster.

**Acceptance Criteria**:
- [ ] Color palette defined (light + dark)
- [ ] Typography scale defined
- [ ] Spacing system defined
- [ ] Core components: Button, Input, Select, Checkbox, Radio, Switch
- [ ] Layout components: Card, Modal, Drawer, Dropdown
- [ ] Feedback components: Toast, Alert, Badge, Spinner
- [ ] All components accessible (WCAG AA)
- [ ] All components have TypeScript props
- [ ] Storybook stories for all components

**Story Points**: 13
**Dependencies**: P1-B-001
**Parallelizable**: Yes (with P1-B-003)

---

#### P1-B-003: API Client & State Management

**As a Developer**, I need a type-safe API client so that I can fetch data from the backend.

**Acceptance Criteria**:
- [ ] API client configured with fetch
- [ ] Request/response interceptors
- [ ] API key injection
- [ ] Error handling standardized
- [ ] TanStack Query hooks for all entity types
- [ ] Zustand stores for UI state
- [ ] Optimistic updates working
- [ ] Cache invalidation strategy implemented

**Story Points**: 8
**Dependencies**: P1-B-001, P0-005
**Parallelizable**: Yes (with P1-B-002)

---

### Stream C: DevOps Infrastructure

#### P1-C-001: Docker & Local Development

**As a Developer**, I need Docker Compose for local development so that I can run all services easily.

**Acceptance Criteria**:
- [ ] docker-compose.dev.yml with all services
- [ ] PostgreSQL with health check
- [ ] Redis with persistence
- [ ] Hot reload for backend and frontend
- [ ] Volume mounts for development
- [ ] Network configuration
- [ ] Environment file template
- [ ] Setup script for first-time developers

**Story Points**: 5
**Dependencies**: None
**Parallelizable**: Yes (with P1-A-001, P1-B-001)

---

#### P1-C-002: CI/CD Pipeline

**As a Developer**, I need automated testing and deployment so that I can ship with confidence.

**As a Business Stakeholder**, I need reliable releases so that users get stable updates.

**Acceptance Criteria**:
- [ ] GitHub Actions workflow for PR checks
- [ ] Lint, type-check, test on every PR
- [ ] Build validation
- [ ] Docker image build and push
- [ ] Staging deployment on merge to develop
- [ ] Production deployment on merge to main
- [ ] Slack/Discord notifications for failures
- [ ] Build time < 5 minutes

**Story Points**: 8
**Dependencies**: P1-C-001
**Parallelizable**: Yes

---

#### P1-C-003: Monitoring Setup

**As a Developer**, I need monitoring and alerting so that I can detect and fix issues quickly.

**As a Business Stakeholder**, I need visibility into system health so that I can ensure service reliability.

**Acceptance Criteria**:
- [ ] Pino logging configured
- [ ] Log aggregation setup (Logtail or similar)
- [ ] Sentry error tracking configured
- [ ] Health check dashboard
- [ ] Key metrics: response time, error rate, queue depth
- [ ] Alerting rules for critical issues
- [ ] Structured log format documented

**Story Points**: 5
**Dependencies**: P1-A-003
**Parallelizable**: Yes (with P1-C-002)

---

## Phase 2: Media Management

> **Duration**: 3 Sprints (6 weeks)
> **Parallel Streams**: 2 (Series/Movies, Quality/Profiles)
> **Prerequisites**: Phase 1 complete

### Stream A: Core Media Entities

#### P2-A-001: Instance Management

**As a User**, I need to create and manage instances so that I can organize my media by type.

**As a Developer**, I need instance CRUD operations so that media can be scoped properly.

**Acceptance Criteria**:
- [ ] Instance entity implemented
- [ ] API endpoints: GET/POST/PUT/DELETE /api/v3/instance
- [ ] Instance settings (RSS interval, default profiles)
- [ ] Instance-specific root folders
- [ ] Default instance on first setup
- [ ] Instance switching in UI
- [ ] Instance selector in navigation
- [ ] All media APIs scoped to instance

**Story Points**: 13
**Dependencies**: P1-A-002, P1-A-003
**Blocks**: P2-A-002, P2-A-003

---

#### P2-A-002: Series Management

**As a User**, I need to add and manage TV series so that I can track and download shows.

**Acceptance Criteria**:
- [ ] Series entity with all fields from schema
- [ ] API endpoints: GET/POST/PUT/DELETE /api/v3/series
- [ ] Series search (by title, TVDB ID)
- [ ] TVDB metadata integration
- [ ] Poster/banner image fetching and caching
- [ ] Series statistics calculation
- [ ] Frontend: Series index page with grid/list toggle
- [ ] Frontend: Series details page
- [ ] Frontend: Add series modal with search
- [ ] Monitoring toggle working
- [ ] Path validation and folder creation

**Story Points**: 21
**Dependencies**: P2-A-001, P1-A-004
**Parallelizable**: Yes (with P2-A-003, P2-B-001)

---

#### P2-A-003: Movie Management

**As a User**, I need to add and manage movies so that I can track and download films.

**Acceptance Criteria**:
- [ ] Movie entity with all fields from schema
- [ ] API endpoints: GET/POST/PUT/DELETE /api/v3/movie
- [ ] Movie search (by title, TMDB ID)
- [ ] TMDB metadata integration
- [ ] Poster/fanart fetching and caching
- [ ] Minimum availability options
- [ ] Frontend: Movie index page
- [ ] Frontend: Movie details page
- [ ] Frontend: Add movie modal
- [ ] Collection support
- [ ] Path validation

**Story Points**: 21
**Dependencies**: P2-A-001
**Parallelizable**: Yes (with P2-A-002, P2-B-001)

---

#### P2-A-004: Episode Management

**As a User**, I need to see episodes and their status so that I know what's downloaded and missing.

**Acceptance Criteria**:
- [ ] Episode entity implementation
- [ ] Season entity implementation
- [ ] API endpoints: GET/PUT /api/v3/episode
- [ ] Episode monitoring toggle
- [ ] Episode search
- [ ] Frontend: Episode list in series detail
- [ ] Frontend: Season accordion
- [ ] Frontend: Episode monitoring bulk toggle
- [ ] Frontend: Episode file info display
- [ ] Air date handling with timezone support

**Story Points**: 13
**Dependencies**: P2-A-002
**Blocks**: P3-A-003 (Import flow)

---

#### P2-A-005: Media Files & Disk Scanning

**As a User**, I need idkarr to recognize my existing media files so that I don't need to re-download.

**As a Developer**, I need disk scanning service so that existing files can be matched to episodes/movies.

**Acceptance Criteria**:
- [ ] EpisodeFile entity implementation
- [ ] MovieFile entity implementation
- [ ] Disk scanner service
- [ ] File matching algorithm (filename → episode)
- [ ] MediaInfo extraction (ffprobe)
- [ ] API: POST /api/v3/series/{id}/refresh
- [ ] Manual import UI
- [ ] Scan progress tracking
- [ ] Duplicate file detection
- [ ] Performance: Scan 10,000 files < 60 seconds

**Story Points**: 21
**Dependencies**: P2-A-004
**Parallelizable**: Yes (with P2-B-002)

---

### Stream B: Profiles & Configuration

#### P2-B-001: Quality Profiles

**As a User**, I need quality profiles so that I can define what quality I want for my media.

**Acceptance Criteria**:
- [ ] QualityProfile entity implementation
- [ ] QualityDefinition entity (720p, 1080p, etc.)
- [ ] API endpoints: CRUD /api/v3/qualityprofile
- [ ] Quality ordering (preference)
- [ ] Cutoff quality setting
- [ ] Upgrade until cutoff
- [ ] Frontend: Quality profile editor
- [ ] Default profiles (SD, HD, Ultra-HD)
- [ ] Profile cloning
- [ ] Profile assignment to series/movies

**Story Points**: 13
**Dependencies**: P1-A-002
**Parallelizable**: Yes (with P2-A-002, P2-A-003)

---

#### P2-B-002: Custom Formats

**As a User**, I need custom formats so that I can prefer specific release characteristics (DTS, Remux, etc.).

**Acceptance Criteria**:
- [ ] CustomFormat entity implementation
- [ ] Specification types: release title, quality, language, indexer, etc.
- [ ] API endpoints: CRUD /api/v3/customformat
- [ ] Format scoring in quality profiles
- [ ] Frontend: Custom format editor
- [ ] Specification builder UI
- [ ] Test release title against format
- [ ] Import/export custom formats
- [ ] Default formats (DTS-HD, Atmos, HDR)

**Story Points**: 13
**Dependencies**: P2-B-001
**Parallelizable**: Yes (with P2-A-005)

---

#### P2-B-003: Tags & Root Folders

**As a User**, I need tags and root folders to organize my media library.

**Acceptance Criteria**:
- [ ] Tag entity implementation
- [ ] RootFolder entity implementation
- [ ] API endpoints: CRUD /api/v3/tag, /api/v3/rootfolder
- [ ] Free space display for root folders
- [ ] Tag assignment to series/movies
- [ ] Tag filtering in series/movie list
- [ ] Frontend: Tag management page
- [ ] Frontend: Root folder management
- [ ] Root folder validation (accessible, writable)

**Story Points**: 8
**Dependencies**: P1-A-002
**Parallelizable**: Yes (with P2-B-001)

---

#### P2-B-004: Naming Configuration

**As a User**, I need to configure how files are named so that they match my organization preferences.

**Acceptance Criteria**:
- [ ] NamingConfig entity implementation
- [ ] Token system ({Series Title}, {Season:00}, etc.)
- [ ] API endpoints: GET/PUT /api/v3/config/naming
- [ ] Episode naming pattern
- [ ] Season folder pattern
- [ ] Series folder pattern
- [ ] Movie naming pattern
- [ ] Preview rename before save
- [ ] Illegal character replacement
- [ ] Frontend: Naming editor with live preview

**Story Points**: 8
**Dependencies**: P1-A-002
**Parallelizable**: Yes (with P2-B-002)

---

## Phase 3: Download Pipeline

> **Duration**: 3 Sprints (6 weeks)
> **Parallel Streams**: 2 (Indexers/Search, Download Clients/Queue)
> **Prerequisites**: Phase 2 Stream A complete

### Stream A: Indexers & Search

#### P3-A-001: Indexer Framework

**As a Developer**, I need an indexer abstraction so that different indexer types can be supported.

**Acceptance Criteria**:
- [ ] BaseIndexer abstract class
- [ ] Newznab protocol implementation
- [ ] Torznab protocol implementation
- [ ] Rate limiting per indexer
- [ ] Indexer status tracking
- [ ] API endpoints: CRUD /api/v3/indexer
- [ ] Connection test endpoint
- [ ] Indexer settings schema (dynamic form)

**Story Points**: 13
**Dependencies**: P1-A-003
**Blocks**: P3-A-002

---

#### P3-A-002: Release Parser

**As a Developer**, I need a release parser so that release titles can be analyzed for quality, series, episode.

**This is the most critical component** - Sonarr has 71,000+ lines of parser code.

**Acceptance Criteria**:
- [ ] Title parsing: series name extraction
- [ ] Season/episode number extraction
- [ ] Absolute episode number (anime)
- [ ] Quality detection (source, resolution, codec)
- [ ] Language detection
- [ ] Release group extraction
- [ ] Proper/Repack detection
- [ ] Multi-episode detection
- [ ] Daily show date parsing
- [ ] Hash detection
- [ ] Scene numbering support
- [ ] Parser test endpoint
- [ ] Minimum 500 test cases passing
- [ ] Parser accuracy > 98%

**Story Points**: 34
**Dependencies**: P3-A-001
**Blocks**: P3-A-003, P3-B-002

---

#### P3-A-003: Search & Decision Engine

**As a User**, I need to search for releases and have idkarr pick the best one automatically.

**Acceptance Criteria**:
- [ ] Release search across all enabled indexers
- [ ] API endpoints: GET /api/v3/release, POST /api/v3/release
- [ ] Decision engine: quality scoring
- [ ] Decision engine: custom format scoring
- [ ] Decision engine: protocol preference
- [ ] Decision engine: indexer priority
- [ ] Rejection reasons tracking
- [ ] Upgrade detection
- [ ] Cutoff comparison
- [ ] Delay profile support
- [ ] Frontend: Release search UI
- [ ] Frontend: Manual grab button
- [ ] Search performance < 10 seconds across 10 indexers

**Story Points**: 21
**Dependencies**: P3-A-002, P2-B-001, P2-B-002
**Parallelizable**: Yes (with P3-B-001)

---

#### P3-A-004: RSS Sync

**As a User**, I need automatic RSS monitoring so that new releases are grabbed without manual intervention.

**Acceptance Criteria**:
- [ ] RSS sync job implementation
- [ ] Configurable sync interval (15 min - 4 hours)
- [ ] Per-indexer RSS feed fetching
- [ ] Release deduplication
- [ ] Auto-grab qualifying releases
- [ ] RSS sync status tracking
- [ ] Last sync timestamp display
- [ ] Manual trigger endpoint
- [ ] RSS sync statistics

**Story Points**: 13
**Dependencies**: P3-A-003, P1-A-005
**Parallelizable**: Yes (with P3-B-003)

---

### Stream B: Download Clients & Queue

#### P3-B-001: Download Client Framework

**As a Developer**, I need a download client abstraction so that different clients can be supported.

**Acceptance Criteria**:
- [ ] BaseDownloadClient abstract class
- [ ] qBittorrent implementation
- [ ] Transmission implementation
- [ ] SABnzbd implementation
- [ ] NZBGet implementation
- [ ] Client status tracking
- [ ] API endpoints: CRUD /api/v3/downloadclient
- [ ] Connection test endpoint
- [ ] Category/directory configuration

**Story Points**: 21
**Dependencies**: P1-A-003
**Parallelizable**: Yes (with P3-A-001)

---

#### P3-B-002: Download Queue

**As a User**, I need to see my download queue and its progress in real-time.

**Acceptance Criteria**:
- [ ] Queue entity implementation
- [ ] API endpoints: GET /api/v3/queue, DELETE /api/v3/queue/{id}
- [ ] Download progress tracking
- [ ] ETA calculation
- [ ] Download speed display
- [ ] Status transitions (queued → downloading → completed → imported)
- [ ] WebSocket: queue:updated events
- [ ] Frontend: Queue page with real-time updates
- [ ] Queue item actions (pause, resume, remove)
- [ ] Priority management

**Story Points**: 13
**Dependencies**: P3-B-001, P0-006
**Parallelizable**: Yes (with P3-A-003)

---

#### P3-B-003: Import Process

**As a User**, I need downloaded files to be automatically imported, renamed, and organized.

**Acceptance Criteria**:
- [ ] Download completed detection
- [ ] Import service implementation
- [ ] File moving (configurable: move vs copy)
- [ ] File renaming based on naming config
- [ ] Season folder creation
- [ ] Series folder organization
- [ ] Import history tracking
- [ ] Upgrade handling (delete old file)
- [ ] Import failure handling
- [ ] Manual import endpoint
- [ ] Frontend: Import modal for manual imports

**Story Points**: 21
**Dependencies**: P2-A-005, P2-B-004, P3-B-002
**Blocks**: P3-B-004

---

#### P3-B-004: History & Blocklist

**As a User**, I need to see download history and block problematic releases.

**Acceptance Criteria**:
- [ ] History entity implementation
- [ ] Blocklist entity implementation
- [ ] API endpoints: GET /api/v3/history, CRUD /api/v3/blocklist
- [ ] History event types (grabbed, imported, failed, deleted)
- [ ] History filtering and search
- [ ] Blocklist automatic addition on failure
- [ ] Blocklist management UI
- [ ] History statistics
- [ ] Export history to CSV

**Story Points**: 13
**Dependencies**: P3-B-003
**Parallelizable**: Yes (with P3-A-004)

---

## Phase 4: User & Discovery

> **Duration**: 2 Sprints (4 weeks)
> **Parallel Streams**: 2 (User/ACL, Discovery/Requests)
> **Prerequisites**: Phase 1 complete, Phase 2 Stream A in progress

### Stream A: User Management & ACL

#### P4-A-001: User CRUD

**As an Admin**, I need to manage users so that I can control who accesses the system.

**Acceptance Criteria**:
- [ ] User entity with all fields
- [ ] API endpoints: CRUD /api/v3/user
- [ ] User profile management
- [ ] Password change
- [ ] User preferences storage
- [ ] Avatar support
- [ ] Frontend: User management page
- [ ] Frontend: User profile page
- [ ] User activation/deactivation
- [ ] User deletion with data cleanup

**Story Points**: 13
**Dependencies**: P1-A-004
**Parallelizable**: Yes (with P4-B-001)

---

#### P4-A-002: Role & Permission System

**As an Admin**, I need roles and permissions so that I can control what users can do.

**Acceptance Criteria**:
- [ ] Role entity implementation
- [ ] Permission entity implementation
- [ ] Role-permission junction
- [ ] User-role junction
- [ ] User-permission override
- [ ] API endpoints: CRUD /api/v3/role, /api/v3/permission
- [ ] Default roles: Admin, Power User, User, Viewer
- [ ] Permission check middleware
- [ ] Frontend: Role management
- [ ] Frontend: Permission matrix UI
- [ ] Instance-scoped permissions

**Story Points**: 21
**Dependencies**: P4-A-001, P0-004
**Blocks**: P4-A-003

---

#### P4-A-003: ACL Enforcement

**As a User**, I expect to only see and access what I'm permitted to.

**As a Business Stakeholder**, I need proper access control for compliance and security.

**Acceptance Criteria**:
- [ ] Permission check on all API endpoints
- [ ] Permission check on all UI routes
- [ ] Instance access filtering
- [ ] Series/movie access filtering
- [ ] Action authorization (read vs write)
- [ ] Audit logging for permission denials
- [ ] 403 responses with clear messages
- [ ] Frontend: Hide unavailable actions
- [ ] Performance: Permission check < 5ms

**Story Points**: 13
**Dependencies**: P4-A-002
**Parallelizable**: Yes (with P4-B-003)

---

#### P4-A-004: Audit Logging

**As an Admin**, I need audit logs so that I can see who did what and when.

**Acceptance Criteria**:
- [ ] AuditLog entity implementation
- [ ] API endpoint: GET /api/v3/audit-log
- [ ] Log all create/update/delete actions
- [ ] Log authentication events
- [ ] Log permission changes
- [ ] Log configuration changes
- [ ] Change detail capture (before/after)
- [ ] Frontend: Audit log viewer
- [ ] Filtering by user, action, resource
- [ ] Log retention policy (configurable)

**Story Points**: 8
**Dependencies**: P4-A-001
**Parallelizable**: Yes (with P4-A-002)

---

### Stream B: Discovery & Requests

#### P4-B-001: Discovery Browse

**As a User**, I need to browse and discover new content so that I can add it to my library.

**Acceptance Criteria**:
- [ ] TMDB/TVDB integration for discovery
- [ ] API endpoint: GET /api/v3/discover
- [ ] Trending movies/series
- [ ] Popular this week
- [ ] Genre filtering
- [ ] Network filtering
- [ ] Year filtering
- [ ] Search within discovery
- [ ] Frontend: Discovery page
- [ ] Pagination/infinite scroll
- [ ] "Add to Library" action

**Story Points**: 13
**Dependencies**: P2-A-002, P2-A-003
**Parallelizable**: Yes (with P4-A-001)

---

#### P4-B-002: Request System

**As a User**, I need to request content so that admins can add it to the library.

**As an Admin**, I need to review and approve requests.

**Acceptance Criteria**:
- [ ] Request entity implementation
- [ ] API endpoints: CRUD /api/v3/request
- [ ] Request status workflow (pending → approved/denied → available)
- [ ] Request notifications to admins
- [ ] Auto-approval for certain roles
- [ ] Request limits per user
- [ ] Season selection for series requests
- [ ] Frontend: Request modal
- [ ] Frontend: Request management page
- [ ] Frontend: My requests view
- [ ] Request denial with reason

**Story Points**: 21
**Dependencies**: P4-B-001, P4-A-002
**Blocks**: P4-B-003

---

#### P4-B-003: Watchlist

**As a User**, I need a watchlist so that I can track what I want to watch.

**Acceptance Criteria**:
- [ ] Watchlist entity implementation
- [ ] API endpoints: CRUD /api/v3/watchlist
- [ ] Watchlist status types (plan to watch, watching, completed, etc.)
- [ ] Progress tracking (current season/episode)
- [ ] Rating support
- [ ] Notes support
- [ ] Frontend: Watchlist page
- [ ] Add to watchlist from anywhere
- [ ] Watchlist sharing (optional)
- [ ] Integration with request system

**Story Points**: 13
**Dependencies**: P4-B-002
**Parallelizable**: Yes (with P4-A-003)

---

## Phase 5: Advanced Features

> **Duration**: 2 Sprints (4 weeks)
> **Parallel Streams**: 3 (WebSocket, Notifications, AI)
> **Prerequisites**: Phase 3 and Phase 4 complete

### Stream A: Real-Time & WebSocket

#### P5-A-001: WebSocket Server

**As a Developer**, I need a WebSocket server so that clients can receive real-time updates.

**Acceptance Criteria**:
- [ ] Bun WebSocket server implementation
- [ ] Authentication on connection
- [ ] Channel subscription system
- [ ] Event broadcast to subscribers
- [ ] Connection management
- [ ] Reconnection handling
- [ ] Message rate limiting
- [ ] Frontend: WebSocket hook
- [ ] Frontend: Auto-reconnect
- [ ] Performance: Support 100 concurrent connections

**Story Points**: 13
**Dependencies**: P1-A-003, P0-006
**Blocks**: P5-A-002

---

#### P5-A-002: Real-Time Event Integration

**As a User**, I need real-time updates so that my UI stays synchronized without refreshing.

**Acceptance Criteria**:
- [ ] Queue updates via WebSocket
- [ ] Series updates via WebSocket
- [ ] Episode updates via WebSocket
- [ ] History updates via WebSocket
- [ ] System health via WebSocket
- [ ] Notification delivery via WebSocket
- [ ] Frontend: Real-time queue progress
- [ ] Frontend: Real-time import notifications
- [ ] Frontend: Real-time health status
- [ ] Event throttling (max 10/second per type)

**Story Points**: 13
**Dependencies**: P5-A-001, All Phase 3 tasks
**Parallelizable**: Yes (with P5-B-001, P5-C-001)

---

### Stream B: Notifications

#### P5-B-001: Notification Framework

**As a User**, I need notifications so that I'm informed about important events.

**Acceptance Criteria**:
- [ ] Notification entity implementation
- [ ] Notification provider abstraction
- [ ] API endpoints: CRUD /api/v3/notification
- [ ] Provider: Discord webhook
- [ ] Provider: Email (Resend)
- [ ] Provider: Telegram
- [ ] Provider: Pushover
- [ ] Provider: Webhook (generic)
- [ ] Test notification endpoint
- [ ] Frontend: Notification settings

**Story Points**: 21
**Dependencies**: P1-A-003
**Parallelizable**: Yes (with P5-A-001)

---

#### P5-B-002: Notification Events

**As a User**, I need to choose what events trigger notifications.

**Acceptance Criteria**:
- [ ] Event: on grab
- [ ] Event: on download/import
- [ ] Event: on upgrade
- [ ] Event: on series add/delete
- [ ] Event: on health issue
- [ ] Event: on request approved/denied
- [ ] Event: on request available
- [ ] Tag-based notification filtering
- [ ] Notification templating
- [ ] Notification queue (BullMQ)

**Story Points**: 13
**Dependencies**: P5-B-001, All Phase 3 tasks
**Parallelizable**: Yes (with P5-A-002)

---

### Stream C: AI Recommendations (Optional/Future)

#### P5-C-001: Recommendation Engine Setup

**As a User**, I need personalized recommendations so that I can discover content I'll enjoy.

**Note**: This is P2 priority due to complexity and privacy considerations.

**Acceptance Criteria**:
- [ ] Vector database setup (pgvector)
- [ ] Embedding generation pipeline
- [ ] Content embedding storage
- [ ] User preference embedding
- [ ] Similarity search implementation
- [ ] API endpoint: GET /api/v3/recommendations
- [ ] Privacy documentation (data handling)
- [ ] Rate limiting for AI features
- [ ] Fallback to trending when no history

**Story Points**: 21
**Dependencies**: P4-B-003
**Parallelizable**: Yes (with P5-A-002, P5-B-002)

---

## Phase 6: Polish & Production

> **Duration**: 2 Sprints (4 weeks)
> **Parallel Streams**: 2 (Quality/Testing, Production)
> **Prerequisites**: All previous phases complete

### Stream A: Quality & Testing

#### P6-A-001: Integration Testing

**As a Developer**, I need comprehensive tests so that I can ship with confidence.

**Acceptance Criteria**:
- [ ] API integration tests (all endpoints)
- [ ] Database integration tests
- [ ] Parser tests (500+ cases)
- [ ] Service unit tests
- [ ] Test coverage > 80%
- [ ] CI test pipeline passing
- [ ] Test data factories
- [ ] Mock providers for external services

**Story Points**: 21
**Dependencies**: All feature development
**Parallelizable**: Yes (with P6-A-002)

---

#### P6-A-002: E2E Testing

**As a Business Stakeholder**, I need E2E tests so that critical user flows work correctly.

**Acceptance Criteria**:
- [ ] Playwright setup
- [ ] Test: Add series flow
- [ ] Test: Search and grab release
- [ ] Test: Queue and import flow
- [ ] Test: User registration and login
- [ ] Test: Request and approval flow
- [ ] Test: Settings configuration
- [ ] E2E tests in CI pipeline
- [ ] Visual regression tests (optional)

**Story Points**: 13
**Dependencies**: P6-A-001
**Parallelizable**: Yes (with P6-B-001)

---

#### P6-A-003: Performance Testing

**As a Business Stakeholder**, I need performance validation so that the system scales.

**Acceptance Criteria**:
- [ ] Load test setup (k6)
- [ ] API response time < 200ms (p95)
- [ ] Support 50 concurrent users
- [ ] Database query < 50ms (p95)
- [ ] WebSocket latency < 100ms
- [ ] Bundle size < 500KB (gzipped)
- [ ] Performance regression tests in CI

**Story Points**: 8
**Dependencies**: All feature development
**Parallelizable**: Yes (with P6-A-001, P6-A-002)

---

### Stream B: Production Readiness

#### P6-B-001: Production Docker Build

**As a DevOps Engineer**, I need production-optimized Docker images.

**Acceptance Criteria**:
- [ ] Multi-stage Dockerfile
- [ ] Image size < 200MB
- [ ] Health check endpoint
- [ ] Non-root user
- [ ] Security scanning (Trivy)
- [ ] ARM64 support
- [ ] Docker Hub publishing
- [ ] Version tagging

**Story Points**: 8
**Dependencies**: All feature development
**Parallelizable**: Yes (with P6-A-001)

---

#### P6-B-002: Migration & Upgrade System

**As a User**, I need smooth upgrades so that I don't lose data.

**Acceptance Criteria**:
- [ ] Database migration system
- [ ] Automatic migration on startup
- [ ] Rollback capability
- [ ] Backup before migration
- [ ] Migration testing
- [ ] Sonarr import tool (optional)
- [ ] Configuration migration
- [ ] Upgrade documentation

**Story Points**: 13
**Dependencies**: P6-A-001
**Blocks**: P6-B-004

---

#### P6-B-003: Security Hardening

**As a Business Stakeholder**, I need security hardening for production deployment.

**Acceptance Criteria**:
- [ ] Security headers configured
- [ ] CSP policy defined
- [ ] Rate limiting tuned
- [ ] Input sanitization audit
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] Dependency vulnerability scan
- [ ] Security documentation

**Story Points**: 8
**Dependencies**: All feature development
**Parallelizable**: Yes (with P6-B-001, P6-B-002)

---

#### P6-B-004: Documentation

**As a User**, I need documentation so that I can install and use the application.

**As a Developer**, I need API documentation so that I can build integrations.

**Acceptance Criteria**:
- [ ] Installation guide
- [ ] Quick start guide
- [ ] API documentation (OpenAPI)
- [ ] Configuration reference
- [ ] Troubleshooting guide
- [ ] FAQ
- [ ] Docker deployment guide
- [ ] Kubernetes deployment guide (optional)

**Story Points**: 13
**Dependencies**: All feature development
**Parallelizable**: Yes (with P6-A-002, P6-B-003)

---

## Parallelization Strategy

### Maximum Parallel Tracks

```
Phase 0 (2 weeks):     [████████████████████]
                       ├─ P0-001 ─┤
                       ├─ P0-002 ─┤
                       ├─ P0-003 ─────────┤
                       ├─ P0-004 ─┤
                       ├─ P0-005 ─┤
                       ├─ P0-006 ─┤
                       ├─ P0-007 ─┤

Phase 1 (4 weeks):     [████████████████████████████████████████]
Stream A (Backend):    ├─ P1-A-001 ─┤─ P1-A-002 ─────┤─ P1-A-004 ─────┤
                       │            ├─ P1-A-003 ─────┤
                       │            ├─ P1-A-005 ─────┤
Stream B (Frontend):   ├─ P1-B-001 ─┤─ P1-B-002 ─────────────────────┤
                       │            ├─ P1-B-003 ─────┤
Stream C (DevOps):     ├─ P1-C-001 ─┤─ P1-C-002 ─────┤
                                   ├─ P1-C-003 ─────┤

Phase 2 (6 weeks):     [████████████████████████████████████████████████████████████]
Stream A (Media):      ├─ P2-A-001 ─────┤─ P2-A-002 ─────────────┤─ P2-A-004 ─────┤─ P2-A-005 ─────────┤
                       │                ├─ P2-A-003 ─────────────┤
Stream B (Profiles):   ├─ P2-B-001 ─────────────┤─ P2-B-002 ─────────────┤
                       ├─ P2-B-003 ─────┤        ├─ P2-B-004 ─────┤

Phase 3 (6 weeks):     [████████████████████████████████████████████████████████████]
Stream A (Search):     ├─ P3-A-001 ─────┤─ P3-A-002 ────────────────────┤─ P3-A-003 ─────────────┤─ P3-A-004 ─────┤
Stream B (Downloads):  ├─ P3-B-001 ─────────────┤─ P3-B-002 ─────────────┤─ P3-B-003 ─────────────┤─ P3-B-004 ─────┤

Phase 4 (4 weeks):     [████████████████████████████████████████]
Stream A (Users):      ├─ P4-A-001 ─────┤─ P4-A-002 ─────────────┤─ P4-A-003 ─────┤
                       │                ├─ P4-A-004 ─────┤
Stream B (Discovery):  ├─ P4-B-001 ─────┤─ P4-B-002 ─────────────┤─ P4-B-003 ─────┤

Phase 5 (4 weeks):     [████████████████████████████████████████]
Stream A (WebSocket):  ├─ P5-A-001 ─────────────┤─ P5-A-002 ─────┤
Stream B (Notifs):     ├─ P5-B-001 ─────────────┤─ P5-B-002 ─────┤
Stream C (AI):         ├─ P5-C-001 ─────────────────────────────┤ (Optional)

Phase 6 (4 weeks):     [████████████████████████████████████████]
Stream A (Testing):    ├─ P6-A-001 ─────────────┤─ P6-A-002 ─────┤
                       ├─ P6-A-003 ─────┤
Stream B (Production): ├─ P6-B-001 ─────┤─ P6-B-002 ─────────────┤─ P6-B-004 ─────┤
                       ├─ P6-B-003 ─────┤
```

### Team Allocation (3-5 Developer Team)

| Role | Primary Track | Secondary Track |
|------|--------------|-----------------|
| Backend Lead | Phase 1-3 Stream A | Phase 5 Stream A |
| Backend Dev | Phase 2-3 Stream B | Phase 4 Stream A |
| Frontend Lead | Phase 1-2 Stream B | Phase 4-5 Frontend |
| Full Stack | Phase 4 Stream B | Phase 5 Stream B |
| DevOps | Phase 1 Stream C | Phase 6 Stream B |

---

## Dependency Graph

```
P0-001 (Schema Naming) ──┬──▶ P0-002 (Instance Schema) ──▶ P1-A-002 (Database) ──▶ P2-A-001 (Instance CRUD)
                         │                                                        │
                         ▼                                                        ▼
                    P0-003 (API Docs) ──────────────────────────────────────▶ All API Tasks

P0-004 (Permission Rules) ──▶ P4-A-002 (Role/Permission) ──▶ P4-A-003 (ACL Enforcement)

P0-005 (Error Format) ──┬──▶ P1-A-003 (API Framework)
                        └──▶ P5-A-001 (WebSocket)

P0-006 (WebSocket Events) ──▶ P5-A-001 (WebSocket) ──▶ P5-A-002 (Real-time)

P0-007 (Services) ──┬──▶ P2-A-002 (Series) ──┬──▶ P2-A-004 (Episodes) ──▶ P3-B-003 (Import)
                    │                        │
                    ├──▶ P2-A-003 (Movies)   ▼
                    │                   P2-A-005 (Disk Scan)
                    │
                    └──▶ P3-A-003 (Decision Engine)

P1-A-004 (Auth) ──▶ P4-A-001 (Users) ──▶ P4-A-002 (Roles)

P3-A-002 (Parser) ──┬──▶ P3-A-003 (Search)
                    └──▶ P3-B-003 (Import)

P3-B-002 (Queue) ──▶ P3-B-003 (Import) ──▶ P3-B-004 (History)

P4-B-001 (Discovery) ──▶ P4-B-002 (Requests) ──▶ P4-B-003 (Watchlist)
```

---

## Risk Register

| Risk ID | Description | Probability | Impact | Mitigation |
|---------|-------------|-------------|--------|------------|
| R001 | Parser complexity exceeds estimates | High | High | Allocate extra sprint, port test cases from Sonarr |
| R002 | External API changes (TVDB/TMDB) | Medium | Medium | Abstract providers, add fallbacks |
| R003 | Performance issues with large libraries | Medium | High | Load test early, optimize queries iteratively |
| R004 | WebSocket scalability | Medium | Medium | Test with 100+ connections early |
| R005 | Schema migration complexity | Low | High | Maintain backward compatibility, test migrations |
| R006 | AI recommendation privacy concerns | Medium | High | Document data handling, allow opt-out |
| R007 | Third-party integrations breaking | Medium | Medium | Mock in tests, version pin dependencies |
| R008 | Team velocity overestimated | Medium | Medium | Buffer 20% in estimates, prioritize MVP features |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total Phases | 7 (including Phase 0) |
| Total Tasks | 53 |
| Total Story Points | ~550 |
| Estimated Duration | 30 weeks (7.5 months) |
| Maximum Parallel Streams | 3 |
| Critical Path Tasks | 12 |
| MVP Critical Tasks | 35 (Phases 0-3) |
| Optional/Future Tasks | 3 (AI features) |

---

*This document should be reviewed and updated at the start of each sprint. Task estimates should be refined based on team velocity after Phase 1.*
