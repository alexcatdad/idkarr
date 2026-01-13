# idkarr Development Status

**Last Updated**: January 13, 2026
**Current Phase**: Phase 2 - Core Backend APIs

## Project Overview

idkarr is a unified media management application combining the functionality of Sonarr, Radarr, Overseerr, and Prowlarr into a single, modern application.

## Completed Work

### Phase 0: Planning & Documentation
- [x] Created comprehensive specification documents (34+ docs)
- [x] Defined task breakdown (53 tasks, 7 phases, ~550 story points)
- [x] Created agent implementation documents
- [x] Resolved schema naming conflicts

### Phase 1-A: Backend Foundation

#### P1-A-001: Monorepo Setup
- [x] Initialized npm workspaces
- [x] Created package.json structure
- [x] Set up shared package (@idkarr/shared)
  - Type definitions
  - Constants
  - Zod schemas
  - Utility functions

#### P1-A-002: Database Schema (Drizzle ORM)
- [x] Created all database schema files:
  - `enums.ts` - All PostgreSQL enums
  - `user.ts` - Users, sessions, API keys, roles, permissions, audit logs
  - `instance.ts` - Instance configuration
  - `media.ts` - Media, seasons, episodes, media files, alternate titles
  - `quality.ts` - Quality profiles and definitions
  - `indexer.ts` - Indexers and indexer-instance mappings
  - `download-client.ts` - Download clients and their instance mappings
  - `notification.ts` - Notification templates and delivery tracking
  - `root-folder.ts` - Root folder management
  - `tag.ts` - Tags and tag assignments
  - `command.ts` - Command queue
  - `queue.ts` - Download queue management
- [x] Set up database client with Drizzle
- [x] Created drizzle.config.ts
- [x] Created seed.ts for initial data

#### P1-A-003: Hono API Framework
- [x] Set up Hono v4 with Bun target
- [x] Configured CORS middleware
- [x] Added request logging
- [x] Created health check endpoint
- [x] Created API info endpoint
- [x] Set up error handlers (404, validation, global)

### Phase 1-C: Docker Environment

#### P1-C-001: Docker Development Environment
- [x] Created docker-compose.yml with:
  - PostgreSQL 16 (Alpine)
  - Redis 7 (Alpine)
  - Backend service (Bun)
  - pgAdmin 4 (optional)
- [x] Created Dockerfile.dev for development
- [x] Created init-db.sql for database initialization
- [x] Created .env.example with all environment variables
- [x] Updated .gitignore for project structure

### Phase 2-A: Authentication & Core APIs

#### P2-A-001: Authentication with Lucia
- [x] Configured Lucia v3 with Drizzle adapter
- [x] Implemented session-based authentication
- [x] Implemented API key authentication
- [x] Created auth middleware (session + API key)
- [x] Implemented requireAuth middleware
- [x] Implemented requireRole middleware
- [x] Extended Hono context with user/session types

#### P2-A-002: Media CRUD API Routes
- [x] GET /media - List with pagination, filtering, sorting
- [x] GET /media/:id - Single media with seasons/episodes
- [x] POST /media - Create media item
- [x] PUT /media/:id - Update media item
- [x] DELETE /media/:id - Delete media item
- [x] POST /media/:id/refresh - Queue metadata refresh
- [x] POST /media/:id/search - Queue missing search

#### P2-A-003: Search and Filtering
- [x] Implemented pagination (page, pageSize)
- [x] Implemented sorting (title, year, added, updated)
- [x] Implemented filters:
  - mediaType (series, movie, anime)
  - status (continuing, ended, upcoming, released, deleted)
  - monitored (boolean)
  - instanceId (number)
  - search (text search on title/sortTitle)
  - tags (array intersection)

### Auth Routes (/api/v1/auth)
- [x] POST /login - User login with session cookie
- [x] POST /register - User registration (first user = admin)
- [x] POST /logout - Session invalidation
- [x] GET /me - Current user info
- [x] POST /api-keys - Create API key
- [x] GET /api-keys - List user's API keys
- [x] DELETE /api-keys/:id - Revoke API key

### Instance Routes (/api/v1/instances)
- [x] GET / - List all instances with media counts
- [x] GET /:id - Get single instance
- [x] POST / - Create instance (admin only)
- [x] PUT /:id - Update instance (admin only)
- [x] DELETE /:id - Delete instance (admin only, requires empty)

## Current File Structure

```
idkarr/
├── docs/                          # Documentation (reorganized)
│   ├── 01-project-overview/
│   ├── 02-architecture/
│   ├── 03-api-specification/
│   ├── 04-features/
│   ├── 05-infrastructure/
│   ├── 06-development/
│   ├── 07-reference/
│   └── 08-project-management/
├── docker/
│   ├── Dockerfile.dev
│   └── init-db.sql
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/         # All Drizzle schemas
│   │   │   │   ├── client.ts       # Database connection
│   │   │   │   ├── index.ts        # DB exports
│   │   │   │   └── seed.ts         # Seed data
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts         # Lucia configuration
│   │   │   │   └── password.ts     # Argon2 hashing
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts         # Auth middleware
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # Auth routes
│   │   │   │   ├── media.ts        # Media CRUD
│   │   │   │   ├── instance.ts     # Instance management
│   │   │   │   └── index.ts        # Route exports
│   │   │   └── index.ts            # App entry point
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       │   ├── types/
│       │   ├── constants/
│       │   ├── schemas/
│       │   └── utils/
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml
├── package.json                   # Root workspace config
├── tsconfig.json                  # Root TypeScript config
├── .env.example
└── .gitignore
```

## Technical Decisions

### Schema Changes for Lucia Compatibility
- Changed `users.id` from `serial` to `text` (Lucia requires string IDs)
- Changed `sessions.userId` from `integer` to `text` (FK consistency)
- Changed `apiKeys.userId` from `integer` to `text` (FK consistency)
- Added `displayName` field to users table
- API keys store full key (should be hashed in production)

### Media Schema Timestamps
- Uses `added` instead of `createdAt` (following Sonarr convention)
- Uses `lastInfoSync` for tracking metadata updates
- Uses `lastSearched` for tracking search operations

### TypeScript Configuration
- Using `exactOptionalPropertyTypes: true` for strict typing
- All optional fields explicitly handle `undefined`

## Next Steps

### Immediate (Phase 2 continuation)
1. Run database migrations with `drizzle-kit push`
2. Test auth flow end-to-end
3. Add quality profile routes
4. Add download client routes
5. Add indexer routes

### Upcoming (Phase 3)
1. Implement external API integrations (TMDB, TVDB)
2. Build download client integrations
3. Implement indexer/Prowlarr proxy

### Future
1. Frontend development (Phase 4)
2. Background job system (Phase 5)
3. Advanced features (Phase 6)
4. Production deployment (Phase 7)

## Running the Project

### Prerequisites
- Docker & Docker Compose
- Bun runtime (or Node.js with npm)

### Development Setup
```bash
# Start database and Redis
docker compose up db redis -d

# Install dependencies
npm install

# Run migrations
cd packages/backend
npx drizzle-kit push

# Start backend
bun run dev
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for session tokens
- `PORT` - Server port (default: 3000)

## Known Issues

1. ESLint not configured (using TSC for type checking only)
2. Bun not available in all environments (fallback to Node.js needed)
3. Docker not available in CI environment for integration tests
