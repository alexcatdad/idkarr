# idkarr Implementation Roadmap

> **Last Updated**: 2026-01-15
> **Reference**: [Unified Vision Design](./2026-01-15-idkarr-unified-vision-design.md)

---

## Overview

This roadmap breaks down the idkarr unified vision into implementable phases. Each phase builds on the previous, delivering incremental value while working toward the complete product.

**Philosophy**: Ship working software early. Each phase should produce something usable.

---

## Phase Summary

| Phase | Name | Focus | Deliverable |
|-------|------|-------|-------------|
| 1 | Foundation | Core infrastructure | Backend API, auth, database |
| 2 | TV & Movies | Core media types | Sonarr + Radarr functionality |
| 3 | Indexers & Downloads | Acquisition pipeline | Built-in Prowlarr, download clients |
| 4 | Quality System | Release selection | Custom formats, TRaSH Guides sync |
| 5 | Anime | First-class anime | Full anime support |
| 6 | Music | Lidarr parity | Full music support |
| 7 | Discovery & Users | Household features | Requests, user profiles, watchlists |
| 8 | AI & Recommendations | Smart features | 3-tier AI system |
| 9 | Frontend | User interface | PWA with offline support |
| 10 | Polish | Production ready | Performance, testing, docs |

---

## Phase 1: Foundation

**Goal**: Core infrastructure that everything else builds on.

**Duration**: Foundation (already partially complete per DEVELOPMENT_STATUS.md)

### 1.1 Monorepo & Tooling
- [x] npm workspaces setup
- [x] Shared package (@idkarr/shared)
- [x] TypeScript configuration
- [ ] ESLint + Prettier configuration
- [ ] Husky pre-commit hooks

### 1.2 Database Layer
- [x] PostgreSQL + Drizzle ORM
- [x] Core schema (users, sessions, media, instances)
- [ ] Migration system (drizzle-kit)
- [ ] Seed data for development

### 1.3 API Framework
- [x] Hono v4 with Bun
- [x] CORS, logging middleware
- [x] Health check endpoint
- [ ] OpenAPI spec generation
- [ ] API versioning (/api/v1/)

### 1.4 Authentication
- [x] Lucia v3 session auth
- [x] API key authentication
- [x] Role-based access (admin, user, limited)
- [ ] Password reset flow
- [ ] Session management UI

### 1.5 Docker Environment
- [x] docker-compose for development
- [x] PostgreSQL + Redis containers
- [ ] Production Dockerfile
- [ ] Health checks in compose

### Deliverable
Backend API server with authentication, ready for media endpoints.

---

## Phase 2: TV & Movies

**Goal**: Core Sonarr + Radarr functionality for TV series and movies.

### 2.1 Media Data Model
- [ ] Unified media table (mediaType: tv | movie)
- [ ] Seasons and episodes tables
- [ ] Media files tracking
- [ ] Alternate titles support

### 2.2 TV Series Management
- [ ] Series CRUD API
- [ ] Season/episode management
- [ ] Monitoring (series, season, episode level)
- [ ] Series statistics

### 2.3 Movie Management
- [ ] Movie CRUD API
- [ ] Collection awareness
- [ ] Release date tracking
- [ ] Movie statistics

### 2.4 Metadata Integration
- [ ] TMDB client (movies, TV)
- [ ] TVDB client (TV series)
- [ ] Metadata sync service
- [ ] Poster/backdrop download
- [ ] Multi-source merging logic

### 2.5 Root Folders
- [ ] Root folder CRUD
- [ ] Disk space monitoring
- [ ] Folder scanning service

### Deliverable
Can add TV series and movies, fetch metadata, organize in libraries.

---

## Phase 3: Indexers & Downloads

**Goal**: Built-in Prowlarr and download client integration.

### 3.1 Indexer Framework
- [ ] Indexer data model
- [ ] Torznab protocol implementation
- [ ] Newznab protocol implementation
- [ ] Indexer CRUD API

### 3.2 Indexer Management
- [ ] Category mapping system
- [ ] Per-indexer rate limiting
- [ ] Health monitoring
- [ ] Automatic disable on failures

### 3.3 Search System
- [ ] RSS sync service
- [ ] Interactive search API
- [ ] Result aggregation & deduplication
- [ ] Search debouncing (cooldown rules)

### 3.4 Download Clients
- [ ] Download client data model
- [ ] qBittorrent integration
- [ ] Transmission integration
- [ ] SABnzbd integration
- [ ] NZBGet integration

### 3.5 Download Pipeline
- [ ] Grab release flow
- [ ] Queue management
- [ ] Progress tracking
- [ ] Failed download handling
- [ ] Blocklist management

### Deliverable
Can search indexers, grab releases, monitor downloads.

---

## Phase 4: Quality System

**Goal**: Custom formats and quality profiles for intelligent release selection.

### 4.1 Quality Definitions
- [ ] Quality definitions table
- [ ] Resolution/source/codec definitions
- [ ] Quality weights and ordering

### 4.2 Quality Profiles
- [ ] Quality profile CRUD
- [ ] Cutoff configuration
- [ ] Upgrade allowed toggle
- [ ] Profile presets (HD, 4K, etc.)

### 4.3 Custom Formats
- [ ] Custom format data model
- [ ] Regex-based condition matching
- [ ] Score-based selection
- [ ] Format CRUD API

### 4.4 TRaSH Guides Integration
- [ ] TRaSH Guides repo sync
- [ ] Auto-import profiles
- [ ] Auto-update on changes
- [ ] Manual format preservation

### 4.5 Release Parser
- [ ] Quality detection (resolution, source, codec, audio)
- [ ] Custom format matching
- [ ] Release scoring algorithm

### 4.6 Import Pipeline
- [ ] Completed download detection
- [ ] File parsing and matching
- [ ] Rename on import
- [ ] Move to library

### Deliverable
Intelligent release selection with TRaSH Guides integration.

---

## Phase 5: Anime

**Goal**: First-class anime support as a separate media type.

### 5.1 Anime Data Model
- [ ] Anime as mediaType: anime
- [ ] Absolute episode numbering
- [ ] Scene numbering support
- [ ] OVA/ONA/Special types

### 5.2 Anime Metadata
- [ ] AniList client (primary)
- [ ] AniDB client
- [ ] MyAnimeList client
- [ ] Cross-reference mapping (AniList ↔ TVDB ↔ TMDB)

### 5.3 Anime Parsing
- [ ] [Group] pattern parsing
- [ ] Absolute episode extraction
- [ ] Version tag detection (v2)
- [ ] CRC32 hash extraction
- [ ] Batch release detection

### 5.4 Anime-Specific Features
- [ ] Seasonal tracking (Winter 2026, etc.)
- [ ] Release group preferences
- [ ] Fansub vs official distinction
- [ ] Simulcast awareness

### 5.5 Anime Indexers
- [ ] Nyaa integration
- [ ] AnimeTosho integration
- [ ] Anime-specific category mapping

### Deliverable
Full anime support on par with dedicated anime Sonarr instance.

---

## Phase 6: Music

**Goal**: Full Lidarr parity for music management.

### 6.1 Music Data Model
- [ ] Artist → Album → Track hierarchy
- [ ] Release groups (original, remaster, deluxe)
- [ ] Multi-artist support
- [ ] Compilation albums

### 6.2 Music Metadata
- [ ] MusicBrainz client
- [ ] Release vs release group handling
- [ ] Artist images and metadata
- [ ] Album artwork

### 6.3 Audio Quality
- [ ] Audio quality definitions (FLAC, MP3 320, etc.)
- [ ] Audio quality profiles
- [ ] Bitrate detection
- [ ] Source detection (CD, WEB, Vinyl)

### 6.4 Music Parsing
- [ ] "Artist - Album (Year) [Format]" patterns
- [ ] Audio codec detection
- [ ] Multi-disc handling
- [ ] Release type detection (LP, EP, Single)

### 6.5 Music-Specific Features
- [ ] Discography tracking
- [ ] Featured artist handling
- [ ] Album type filtering

### Deliverable
Full music management on par with Lidarr.

---

## Phase 7: Discovery & Users

**Goal**: Household features - requests, profiles, watchlists.

### 7.1 User Profiles
- [ ] Per-user watchlists
- [ ] Watch history (from media servers)
- [ ] User preferences

### 7.2 Request System
- [ ] Request data model
- [ ] Submit request flow
- [ ] Approval workflow
- [ ] Auto-approve option
- [ ] Request quotas

### 7.3 Media Server Integration
- [ ] Plex integration
- [ ] Jellyfin integration
- [ ] Emby integration
- [ ] Library scan triggers
- [ ] Watch status sync

### 7.4 Discovery Features
- [ ] Trending content
- [ ] Popular in your library
- [ ] New releases
- [ ] Coming soon

### Deliverable
Household-ready with requests and media server sync.

---

## Phase 8: AI & Recommendations

**Goal**: Three-tier AI system from local to cloud.

### 8.1 Tier 1: Local Recommendations
- [ ] Library analysis engine
- [ ] Genre/actor/director similarity
- [ ] "Because you watched X" logic
- [ ] Trending in library

### 8.2 Tier 2: RAG Discovery
- [ ] Vector embedding generation
- [ ] pgvector integration
- [ ] Natural language search
- [ ] Semantic similarity matching
- [ ] Ollama integration (local)
- [ ] OpenAI embeddings (cloud)

### 8.3 Tier 3: AI Assistant
- [ ] LLM integration (Ollama/OpenAI/Anthropic)
- [ ] Conversational interface
- [ ] Action execution ("add to library")
- [ ] Explanation generation

### 8.4 Privacy Controls
- [ ] Tier selection in settings
- [ ] Clear data flow labeling
- [ ] Local-only mode enforcement

### Deliverable
Smart recommendations with user-controlled privacy.

---

## Phase 9: Frontend

**Goal**: Media-rich PWA with offline support.

### 9.1 Frontend Framework
- [ ] Next.js 14+ setup
- [ ] shadcn/ui components
- [ ] Tailwind CSS
- [ ] Dark/light theme

### 9.2 Core Views
- [ ] Dashboard (activity, upcoming, recent)
- [ ] Library browser (all media types)
- [ ] Media detail pages
- [ ] Settings pages

### 9.3 Media-Rich Experience
- [ ] Poster grids and carousels
- [ ] Backdrop images
- [ ] Trailer playback
- [ ] Quick preview on hover

### 9.4 PWA Features
- [ ] Service worker
- [ ] Offline library browsing
- [ ] Push notifications
- [ ] Install prompt

### 9.5 Real-time Updates
- [ ] WebSocket connection
- [ ] Queue updates
- [ ] Import notifications
- [ ] Activity feed

### Deliverable
Beautiful, responsive UI that works offline.

---

## Phase 10: Polish

**Goal**: Production-ready quality.

### 10.1 Performance
- [ ] Database query optimization
- [ ] API response caching
- [ ] Frontend code splitting
- [ ] Image optimization

### 10.2 Testing
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Parser test suite

### 10.3 Documentation
- [ ] API documentation (OpenAPI)
- [ ] User guide
- [ ] Deployment guide
- [ ] Contributing guide

### 10.4 Operations
- [ ] Scheduled backups
- [ ] Health monitoring
- [ ] Error tracking (Sentry)
- [ ] Log aggregation

### 10.5 Release
- [ ] Docker images
- [ ] Release automation
- [ ] Changelog generation
- [ ] Migration guides

### Deliverable
Production-ready idkarr 1.0.

---

## Dependency Graph

```
Phase 1 (Foundation)
    │
    ├── Phase 2 (TV & Movies)
    │       │
    │       └── Phase 3 (Indexers & Downloads)
    │               │
    │               └── Phase 4 (Quality System)
    │                       │
    │                       ├── Phase 5 (Anime)
    │                       │
    │                       └── Phase 6 (Music)
    │
    └── Phase 7 (Discovery & Users) ──────┐
                                          │
                                          └── Phase 8 (AI & Recommendations)

Phase 9 (Frontend) can start after Phase 2, progresses with each phase

Phase 10 (Polish) runs continuously, intensifies before release
```

---

## Milestones

### MVP (Phases 1-4)
- TV and Movies with quality selection
- Built-in indexer management
- Download client integration
- TRaSH Guides sync
- Basic web UI

**Target**: Replaces Sonarr + Radarr + Prowlarr for TV/Movie users

### Anime Release (Phase 5)
- First-class anime support
- Anime metadata providers
- Anime-specific parsing

**Target**: Anime users can switch from separate anime Sonarr

### Music Release (Phase 6)
- Full Lidarr parity
- MusicBrainz integration
- Audio quality profiles

**Target**: Replaces Lidarr

### Household Release (Phases 7-8)
- Request system
- User profiles
- AI recommendations
- Media server integration

**Target**: Replaces Overseerr, full household solution

### 1.0 Release (Phases 9-10)
- Polished PWA
- Full documentation
- Production hardening

**Target**: Production-ready for all users

---

## Success Criteria

### Technical
- API response time: < 200ms (p95)
- Page load time: < 2s
- Test coverage: > 80%
- Zero critical security vulnerabilities

### User Experience
- First media added within 5 minutes of install
- Successful import rate > 95%
- Request approval flow < 3 clicks

### Adoption
- Can migrate from *arr apps without data loss
- TRaSH Guides profiles work out of the box
- Positive community feedback

---

## Risk Mitigation

### Parser Complexity
**Risk**: Release parsing is complex (Sonarr has 71k lines)
**Mitigation**: Comprehensive test suite, start with common patterns, iterate

### Metadata Provider APIs
**Risk**: Third-party APIs may change or have rate limits
**Mitigation**: Caching, multiple providers, graceful degradation

### Scope Creep
**Risk**: Feature requests expand scope
**Mitigation**: MVP first, strict phase boundaries, say no often

### Performance at Scale
**Risk**: Large libraries (10k+ items) may be slow
**Mitigation**: Pagination everywhere, query optimization, caching

---

## Getting Started

### For Contributors
1. Read [Unified Vision Design](./2026-01-15-idkarr-unified-vision-design.md)
2. Check [DEVELOPMENT_STATUS.md](../08-project-management/DEVELOPMENT_STATUS.md) for current state
3. Pick a task from the current phase
4. Follow the coding standards in existing code

### For Testing
1. Start with Phase 1-2 deliverables
2. Report bugs via GitHub issues
3. Suggest improvements via discussions

---

*This roadmap is a living document. Update as phases complete and priorities shift.*
