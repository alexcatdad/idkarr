# Claude Agent Task Prompts

> **Purpose**: Copy-paste ready prompts for instructing Claude agents on specific idkarr tasks
> **Usage**: Select the task, copy the prompt, and provide it to a Claude agent along with project context

---

## How to Use These Prompts

1. **Select the task** you want to implement
2. **Copy the full prompt** including context section
3. **Provide to Claude agent** along with access to the codebase
4. **Review output** against acceptance criteria

### Prompt Structure

Each prompt follows this structure:
```
## Context
Essential background the agent needs

## Task
What to implement

## Requirements
Specific acceptance criteria

## Constraints
Patterns and rules to follow

## Output
Expected deliverables
```

---

## Phase 0: Documentation Fixes

### P0-001: Resolve Schema Naming Conflict

```markdown
# Task: Resolve Schema Naming Conflict (P0-001)

## Context
You are working on the idkarr project, a unified media management application.
There is a critical naming conflict in the documentation:
- UNIFIED_MEDIA_MANAGER.md uses a `media` table
- MULTI_USER_ACL.md references a `series` table in userSeriesGrant

This must be resolved before any implementation can begin.

## Task
Audit all documentation files and standardize on a single approach:
- Use a unified `media` table with a `mediaType` discriminator field
- Update all references from `series` to `media` where appropriate
- Ensure userSeriesGrant becomes userMediaGrant

## Files to Review
- docs/02-architecture/DATABASE_SCHEMA.md
- docs/04-features/UNIFIED_MEDIA_MANAGER.md
- docs/04-features/MULTI_USER_ACL.md
- docs/04-features/DISCOVERY_REQUESTS.md

## Requirements
- [ ] Document the decision at the top of DATABASE_SCHEMA.md
- [ ] Update MULTI_USER_ACL.md: rename userSeriesGrant to userMediaGrant
- [ ] Update all foreign key references from series_id to media_id
- [ ] Add mediaType enum: 'series' | 'movie' | 'anime'
- [ ] Ensure no remaining references to separate series/movie tables
- [ ] Add migration notes for any existing implementations

## Constraints
- Do NOT change the overall schema design, only naming
- Preserve all existing fields and relationships
- Use consistent snake_case for database columns
- Document WHY this decision was made

## Output
- Updated documentation files
- Summary of all changes made
- List of any remaining inconsistencies found
```

---

### P0-002: Define Instance Table Schema

```markdown
# Task: Define Instance Table Schema (P0-002)

## Context
You are working on the idkarr project. The `instance` concept is referenced throughout
the documentation but never formally defined. An instance represents a content library
(e.g., "TV Shows", "Movies", "Anime") with its own settings.

## Task
Create a complete instance table schema in DATABASE_SCHEMA.md with:
- All required fields
- Relationships to other entities
- Indexes and constraints
- Default behavior

## Requirements
- [ ] Define instance table with fields:
  - id (primary key)
  - name (display name)
  - contentType ('series' | 'movie' | 'anime' | 'mixed')
  - settings (JSONB for instance-specific config)
  - defaultQualityProfileId (FK)
  - defaultRootFolderId (FK)
  - enabled (boolean)
  - created/updated timestamps
- [ ] Define relationships:
  - One-to-many with media
  - One-to-many with rootFolders
  - Many-to-many with users (via userInstanceGrant)
- [ ] Add indexes for common queries
- [ ] Document default instance behavior (created on first run)
- [ ] Add Drizzle ORM schema definition

## Schema Template
```typescript
export const instances = pgTable('instances', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contentType: contentTypeEnum('content_type').notNull(),
  settings: jsonb('settings').default({}),
  defaultQualityProfileId: integer('default_quality_profile_id'),
  defaultRootFolderId: integer('default_root_folder_id'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

## Constraints
- Must be compatible with existing media schema
- Must support multi-tenant scenarios
- Settings JSONB should have documented structure
- Follow existing schema patterns in DATABASE_SCHEMA.md

## Output
- Updated DATABASE_SCHEMA.md with instance table
- Instance settings JSON schema documentation
- Relationship diagrams updated
```

---

### P0-004: Define Permission Precedence Rules

```markdown
# Task: Define Permission Precedence Rules (P0-004)

## Context
You are working on the idkarr ACL system. The MULTI_USER_ACL.md document defines
roles, permissions, and grants but does NOT specify how conflicts are resolved.

Example conflict: User has role "Editor" (allows media:delete) but also has
a direct userPermission with permission "media:delete" and allow=false.

## Task
Define clear, unambiguous permission resolution rules and document them.

## Requirements
- [ ] Define rule hierarchy (in order of evaluation):
  1. User-specific deny (explicit deny on userPermission)
  2. User-specific allow (explicit allow on userPermission)
  3. Role-based permissions (ordered by role priority)
  4. Default deny (if no grant found)

- [ ] Document special cases:
  - Resource-specific grants (media:delete on specific mediaId)
  - Instance-scoped grants
  - Inherited permissions (if any)

- [ ] Create decision tree diagram:
```
checkPermission(userId, permission, resourceId?)
    │
    ├─► Check userPermission where userId=X, permission=Y, allow=false
    │   └─► If found: DENY
    │
    ├─► Check userPermission where userId=X, permission=Y, allow=true
    │   └─► If found: ALLOW
    │
    ├─► Get user roles ordered by priority DESC
    │   └─► For each role:
    │       └─► If rolePermission exists for permission: ALLOW
    │
    └─► DEFAULT: DENY
```

- [ ] Add test cases for each scenario:
  - User with no roles or grants → DENY
  - User with role grant → ALLOW
  - User with explicit deny overriding role → DENY
  - User with explicit allow but no role → ALLOW
  - Resource-specific grant → scoped ALLOW

- [ ] Document caching strategy:
  - Cache user permissions for 5 minutes
  - Invalidate on role/permission change
  - Use Redis for distributed cache

## Constraints
- Deny ALWAYS takes precedence over allow at same level
- More specific grants (resource-level) override general grants
- Must be implementable with O(1) cache lookup after warming
- Must be auditable (log why permission was granted/denied)

## Output
- Updated MULTI_USER_ACL.md with "Permission Resolution" section
- Decision tree diagram
- Test case matrix
- Implementation pseudocode
```

---

## Phase 1: Core Infrastructure

### P1-A-002: Database Setup & Schema

```markdown
# Task: Database Setup & Schema Implementation (P1-A-002)

## Context
You are implementing the database layer for idkarr using Drizzle ORM and PostgreSQL.
Read DATABASE_SCHEMA.md for the complete schema specification.

## Task
Implement the complete database schema with Drizzle ORM, including:
- All tables from DATABASE_SCHEMA.md
- Relationships and foreign keys
- Indexes for performance
- Initial seed data

## File Structure
```
packages/backend/src/db/
├── schema/
│   ├── index.ts           # Re-exports all schemas
│   ├── instance.ts        # Instance table
│   ├── media.ts           # Media, episodes, seasons
│   ├── quality.ts         # Quality profiles, definitions
│   ├── user.ts            # Users, roles, permissions
│   ├── queue.ts           # Download queue, history
│   ├── indexer.ts         # Indexers, download clients
│   └── enums.ts           # Shared enums
├── migrations/            # Generated by drizzle-kit
├── seed.ts                # Seed data script
├── client.ts              # Database client singleton
└── index.ts               # Main export
```

## Requirements
- [ ] Implement all tables from DATABASE_SCHEMA.md
- [ ] Use proper TypeScript types (no `any`)
- [ ] Add all indexes specified in schema
- [ ] Create relations using Drizzle's relations API
- [ ] Generate initial migration with `drizzle-kit generate`
- [ ] Create seed script for:
  - Quality definitions (SD, 720p, 1080p, 2160p)
  - Language definitions
  - Default roles (Admin, User, Viewer)
  - Default quality profiles (Any, SD, HD, Ultra-HD)
- [ ] Implement database client with connection pooling
- [ ] Add health check query

## Example Schema Pattern
```typescript
// schema/media.ts
import { pgTable, serial, text, integer, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instances } from './instance';

export const mediaTypeEnum = pgEnum('media_type', ['series', 'movie', 'anime']);

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  instanceId: integer('instance_id').notNull().references(() => instances.id),
  mediaType: mediaTypeEnum('media_type').notNull(),
  title: text('title').notNull(),
  // ... all other fields
}, (table) => ({
  instanceIdx: index('media_instance_idx').on(table.instanceId),
  titleIdx: index('media_title_idx').on(table.title),
}));

export const mediaRelations = relations(media, ({ one, many }) => ({
  instance: one(instances, {
    fields: [media.instanceId],
    references: [instances.id],
  }),
  episodes: many(episodes),
}));
```

## Constraints
- Use snake_case for all database identifiers
- All timestamps should be `timestamp with time zone`
- Use `serial` for auto-increment IDs
- Use `text` instead of `varchar` (PostgreSQL best practice)
- Ensure all foreign keys have indexes
- Use `jsonb` for flexible JSON fields, not `json`

## Testing
- [ ] Migration applies cleanly to fresh database
- [ ] Migration rolls back cleanly
- [ ] Seed data inserts without errors
- [ ] All relationships queryable via Drizzle

## Output
- Complete schema files in packages/backend/src/db/schema/
- Database client in packages/backend/src/db/client.ts
- Seed script in packages/backend/src/db/seed.ts
- drizzle.config.ts at package root
- First migration in migrations/
```

---

### P1-A-003: API Framework Setup

```markdown
# Task: API Framework Setup (P1-A-003)

## Context
You are setting up the Hono API framework for idkarr's backend.
Read DEEP_ARCHITECTURE.md for technology decisions and REST_API.md for endpoint specs.

## Task
Configure Hono with all required middleware and create the base API structure.

## File Structure
```
packages/backend/src/
├── api/
│   ├── index.ts              # Hono app setup, middleware registration
│   ├── routes/
│   │   ├── index.ts          # Route aggregation
│   │   ├── health.ts         # Health check endpoint
│   │   └── ...               # Feature routes (added later)
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   ├── error.ts          # Error handling middleware
│   │   ├── logger.ts         # Request logging middleware
│   │   ├── cors.ts           # CORS configuration
│   │   ├── rate-limit.ts     # Rate limiting middleware
│   │   └── validate.ts       # Request validation helpers
│   └── openapi/
│       └── index.ts          # OpenAPI generation
├── lib/
│   ├── logger.ts             # Pino logger setup
│   ├── config.ts             # Environment config (T3 Env)
│   └── errors.ts             # Custom error classes
└── index.ts                  # Entry point
```

## Requirements

### Core Setup
- [ ] Create Hono app with proper typing
- [ ] Configure Bun server with Hono
- [ ] Set up environment variable validation (T3 Env + Zod)

### Middleware (in order of execution)
- [ ] Request ID middleware (add unique ID to each request)
- [ ] Logger middleware (log request/response with Pino)
- [ ] CORS middleware (configurable origins)
- [ ] Rate limiting middleware (configurable limits)
- [ ] Authentication middleware (API key + session)
- [ ] Error handling middleware (catch-all)

### Error Handling
- [ ] Create custom error classes:
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
  }
}

export class ValidationError extends AppError { ... }
export class NotFoundError extends AppError { ... }
export class UnauthorizedError extends AppError { ... }
export class ForbiddenError extends AppError { ... }
```

- [ ] Implement error response format:
```typescript
{
  error: "ERROR_CODE",
  message: "Human readable message",
  details: { ... },
  requestId: "uuid"
}
```

### Health Check
- [ ] GET /api/health returns:
```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  version: "1.0.0",
  uptime: 12345,
  checks: {
    database: { status: "healthy", latency: 5 },
    redis: { status: "healthy", latency: 2 },
  }
}
```

### OpenAPI
- [ ] Generate OpenAPI 3.0 spec from routes
- [ ] Serve Swagger UI at /api/docs

## Example Implementation
```typescript
// api/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { healthRoutes } from './routes/health';

const app = new Hono()
  .use('*', requestId())
  .use('*', logger())
  .use('*', cors({ origin: config.CORS_ORIGINS }))
  .use('/api/*', authMiddleware())
  .onError(errorHandler)
  .route('/api', healthRoutes);

export { app };
```

## Constraints
- All middleware must be type-safe
- No `any` types
- Proper async error handling (no unhandled promises)
- Request validation with Zod (use @hono/zod-validator)
- Structured JSON logging only (no console.log)

## Testing
- [ ] Health check returns 200
- [ ] Invalid routes return 404
- [ ] Validation errors return 422
- [ ] Auth failures return 401
- [ ] Rate limit exceeded returns 429
- [ ] Server errors return 500 with sanitized message

## Output
- Complete API setup in packages/backend/src/api/
- Logger in packages/backend/src/lib/logger.ts
- Config in packages/backend/src/lib/config.ts
- Entry point in packages/backend/src/index.ts
```

---

### P1-A-004: Authentication System

```markdown
# Task: Authentication System (P1-A-004)

## Context
You are implementing authentication for idkarr using Lucia v3.
Read MULTI_USER_ACL.md for the user model and SECURITY.md for requirements.

## Task
Implement complete authentication with:
- Session-based auth for web UI
- API key auth for programmatic access
- Password hashing with Argon2
- Optional 2FA with TOTP

## File Structure
```
packages/backend/src/
├── auth/
│   ├── lucia.ts              # Lucia configuration
│   ├── session.ts            # Session management
│   ├── api-key.ts            # API key validation
│   ├── password.ts           # Password hashing
│   ├── totp.ts               # 2FA implementation
│   └── index.ts              # Auth exports
├── api/
│   ├── routes/
│   │   └── auth.ts           # Auth endpoints
│   └── middleware/
│       └── auth.ts           # Auth middleware (update)
```

## Requirements

### Lucia Setup
- [ ] Configure Lucia with PostgreSQL adapter
- [ ] Use existing user/session tables from schema
- [ ] Configure session cookie:
  - httpOnly: true
  - secure: true (in production)
  - sameSite: 'lax'
  - maxAge: 30 days

### Password Handling
- [ ] Hash passwords with Argon2id
- [ ] Minimum password length: 8 characters
- [ ] Password strength validation (optional)

### API Key Authentication
- [ ] Generate secure API keys (32 bytes, base64)
- [ ] Store hashed API key in database
- [ ] Validate via X-Api-Key header
- [ ] API keys have optional expiration

### Session Management
- [ ] Create session on login
- [ ] Validate session on each request
- [ ] Refresh session sliding expiration
- [ ] Destroy session on logout
- [ ] Destroy all user sessions (logout everywhere)

### Endpoints
```typescript
POST /api/v3/auth/login
  Body: { username, password, totp? }
  Response: { user, sessionId } + Set-Cookie

POST /api/v3/auth/logout
  Response: 204 + Clear-Cookie

POST /api/v3/auth/register (if enabled)
  Body: { username, email, password }
  Response: { user }

GET /api/v3/auth/me
  Response: { user }

POST /api/v3/auth/api-key
  Body: { name, expiresAt? }
  Response: { apiKey } (only shown once)

DELETE /api/v3/auth/api-key/:id
  Response: 204

POST /api/v3/auth/2fa/enable
  Response: { secret, qrCode }

POST /api/v3/auth/2fa/verify
  Body: { code }
  Response: { backupCodes }

POST /api/v3/auth/2fa/disable
  Body: { code }
  Response: 204
```

### Rate Limiting
- [ ] Login: 5 attempts per 15 minutes per IP
- [ ] Register: 3 per hour per IP
- [ ] API key creation: 10 per day per user

## Example Implementation
```typescript
// auth/lucia.ts
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '@/db/client';
import { users, sessions } from '@/db/schema';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
  getUserAttributes: (attributes) => ({
    username: attributes.username,
    email: attributes.email,
    role: attributes.role,
  }),
});

// auth/password.ts
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password);
}
```

## Constraints
- Never log passwords or API keys
- Always hash passwords before storing
- API keys shown only once on creation
- Session tokens must be cryptographically random
- 2FA secrets stored encrypted

## Testing
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails (generic error)
- [ ] Rate limiting triggers after threshold
- [ ] Session validates correctly
- [ ] API key authentication works
- [ ] Logout invalidates session
- [ ] 2FA flow works end-to-end

## Output
- Auth implementation in packages/backend/src/auth/
- Auth routes in packages/backend/src/api/routes/auth.ts
- Updated auth middleware
- Tests in packages/backend/tests/
```

---

## Phase 2: Media Management

### P2-A-002: Series Management

```markdown
# Task: Series Management (P2-A-002)

## Context
You are implementing TV series management for idkarr.
Series are stored in the unified `media` table with mediaType='series'.
Read UNIFIED_MEDIA_MANAGER.md and REST_API.md for specifications.

## Task
Implement complete series CRUD with:
- API endpoints
- Service layer with business logic
- TVDB metadata integration
- Frontend pages

## File Structure
```
packages/backend/src/
├── services/
│   ├── media.service.ts      # Base media service
│   └── series.service.ts     # Series-specific logic
├── providers/
│   └── tvdb.provider.ts      # TVDB API integration
├── api/routes/
│   └── series.ts             # Series endpoints

packages/frontend/src/
├── app/(dashboard)/series/
│   ├── page.tsx              # Series index
│   ├── [id]/page.tsx         # Series detail
│   └── add/page.tsx          # Add series
├── components/series/
│   ├── series-card.tsx
│   ├── series-grid.tsx
│   ├── series-detail.tsx
│   └── add-series-modal.tsx
└── hooks/
    └── use-series.ts
```

## Requirements

### API Endpoints
```typescript
GET /api/v3/series
  Query: instanceId?, monitored?, page, pageSize
  Response: { data: Series[], page, pageSize, totalRecords }

GET /api/v3/series/:id
  Response: { data: SeriesDetail }

POST /api/v3/series
  Body: {
    tvdbId: number,
    instanceId: number,
    qualityProfileId: number,
    rootFolderPath: string,
    monitored?: boolean,
    monitorNewSeasons?: boolean,
    seasonFolder?: boolean,
    tags?: number[],
    addOptions?: {
      searchForMissingEpisodes?: boolean,
      searchForCutoffUnmetEpisodes?: boolean,
      monitor?: 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'none'
    }
  }
  Response: { data: Series } (201)

PUT /api/v3/series/:id
  Body: Partial<Series>
  Response: { data: Series }

DELETE /api/v3/series/:id
  Query: deleteFiles?: boolean
  Response: 204

GET /api/v3/series/lookup
  Query: term (search term)
  Response: { data: TVDBSeries[] }

POST /api/v3/series/:id/refresh
  Response: 202 (job queued)
```

### Service Implementation
```typescript
// services/series.service.ts
export class SeriesService {
  constructor(
    private readonly db: Database,
    private readonly tvdbProvider: TVDBProvider,
    private readonly logger: Logger,
  ) {}

  async search(term: string): Promise<TVDBSeries[]> {
    return this.tvdbProvider.search(term);
  }

  async add(data: AddSeriesInput): Promise<Series> {
    // 1. Fetch metadata from TVDB
    const metadata = await this.tvdbProvider.getSeries(data.tvdbId);

    // 2. Create series in database
    const series = await this.db.transaction(async (tx) => {
      const [newSeries] = await tx.insert(media).values({
        mediaType: 'series',
        tvdbId: data.tvdbId,
        title: metadata.name,
        sortTitle: this.generateSortTitle(metadata.name),
        overview: metadata.overview,
        status: metadata.status,
        year: metadata.year,
        // ... other fields
      }).returning();

      // 3. Create seasons
      await tx.insert(seasons).values(
        metadata.seasons.map(s => ({
          mediaId: newSeries.id,
          seasonNumber: s.seasonNumber,
          monitored: this.shouldMonitorSeason(s, data.addOptions),
        }))
      );

      // 4. Create episodes
      await tx.insert(episodes).values(
        metadata.episodes.map(e => ({
          mediaId: newSeries.id,
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
          title: e.name,
          airDate: e.airDate,
          monitored: this.shouldMonitorEpisode(e, data.addOptions),
        }))
      );

      return newSeries;
    });

    // 4. Download poster/fanart
    await this.downloadImages(series.id, metadata.images);

    // 5. Queue search job if requested
    if (data.addOptions?.searchForMissingEpisodes) {
      await this.queueService.add('search-series', { seriesId: series.id });
    }

    return series;
  }
}
```

### Frontend Components
- [ ] SeriesCard: Poster, title, status badge, quick actions
- [ ] SeriesGrid: Responsive grid with filter/sort
- [ ] SeriesDetail: Full series info, seasons, episodes
- [ ] AddSeriesModal: Search, preview, options, add

### Acceptance Criteria
- [ ] Can search for series by name
- [ ] Can add series with metadata from TVDB
- [ ] Poster images displayed
- [ ] Can edit series settings
- [ ] Can delete series (with option to delete files)
- [ ] Can refresh series metadata
- [ ] Monitoring toggles work
- [ ] Statistics calculated correctly
- [ ] Path validation works
- [ ] Tags can be assigned

## Constraints
- Use TanStack Query for data fetching
- Implement optimistic updates for toggles
- Cache TVDB responses (1 hour)
- Handle TVDB rate limits gracefully
- All components accessible (WCAG AA)

## Testing
- [ ] CRUD operations work correctly
- [ ] TVDB lookup returns results
- [ ] Invalid paths rejected
- [ ] Duplicate TVDB ID prevented
- [ ] ACL filtering works
- [ ] Statistics accurate

## Output
- Backend: service, provider, routes
- Frontend: pages, components, hooks
- Tests for service and API
```

---

### P3-A-002: Release Parser

```markdown
# Task: Release Parser Implementation (P3-A-002)

## Context
You are implementing the release title parser for idkarr.
This is the MOST CRITICAL component - it must correctly parse thousands of
release title formats. Read PARSER_SPECIFICATION.md for patterns.

## Task
Implement a comprehensive release parser that extracts:
- Series/movie title
- Season and episode numbers
- Quality information
- Language
- Release group
- And more...

## File Structure
```
packages/backend/src/
├── services/
│   └── parser/
│       ├── index.ts              # Main parser export
│       ├── parser.service.ts     # Parser orchestration
│       ├── title.parser.ts       # Title extraction
│       ├── episode.parser.ts     # S01E01, absolute, daily
│       ├── quality.parser.ts     # Resolution, source, codec
│       ├── language.parser.ts    # Language detection
│       ├── release.parser.ts     # Group, hash, flags
│       └── types.ts              # Parser types
├── api/routes/
│   └── parser.ts                 # Test endpoint

packages/backend/tests/
└── parser/
    ├── title.test.ts
    ├── episode.test.ts
    ├── quality.test.ts
    └── fixtures/
        └── releases.json         # 500+ test cases
```

## Requirements

### Parser Output
```typescript
interface ParsedRelease {
  // Title
  seriesTitle: string;
  cleanTitle: string;           // Normalized for matching

  // Episode identification
  seasonNumber?: number;
  episodeNumbers: number[];     // Can be multiple
  absoluteEpisodeNumber?: number;
  airDate?: string;             // For daily shows (YYYY-MM-DD)

  // Quality
  quality: {
    resolution?: 720 | 1080 | 2160 | 480;
    source: 'hdtv' | 'webdl' | 'webrip' | 'bluray' | 'dvd' | 'unknown';
    codec?: 'x264' | 'x265' | 'av1' | 'xvid';
    modifier?: 'remux' | 'proper' | 'repack' | 'real';
  };

  // Audio
  audio?: {
    codec?: 'aac' | 'ac3' | 'dts' | 'truehd' | 'atmos' | 'flac';
    channels?: '2.0' | '5.1' | '7.1';
  };

  // Language
  languages: string[];          // ISO 639-1 codes

  // Release info
  releaseGroup?: string;
  releaseHash?: string;
  isProper: boolean;
  isRepack: boolean;
  isReal: boolean;

  // Special flags
  is3D: boolean;
  isHDR: boolean;
  isDualAudio: boolean;

  // Confidence
  confidence: number;           // 0-100
}
```

### Patterns to Handle

**Standard Series:**
```
Show.Name.S01E01.720p.HDTV.x264-GROUP
Show.Name.S01E01E02.720p.WEB.x264-GROUP        (multi-episode)
Show.Name.S01E01-E03.Episode.Title.720p        (range)
Show Name - S01E01 - Episode Title [720p]
Show_Name_S01E01_720p_HDTV
```

**Anime:**
```
[SubGroup] Anime Name - 01 [720p]
[SubGroup] Anime Name - 01v2 [720p]            (version)
Anime Name - 01 (720p) [Hash]
Anime.Name.-.01.[720p].[Hash]
```

**Daily Shows:**
```
Show.Name.2024.01.15.720p.WEB.x264-GROUP
Show Name - 2024-01-15 - Episode Title
```

**Movies:**
```
Movie.Name.2024.1080p.BluRay.x264-GROUP
Movie Name (2024) [1080p] [BluRay] [x264]
```

**Quality Patterns:**
```
Resolution: 480p, 576p, 720p, 1080p, 2160p, 4K, UHD
Source: HDTV, PDTV, WEB-DL, WEBRip, BluRay, BDRip, DVDRip, DVDR
Codec: x264, x265, HEVC, H.264, H.265, AV1, XviD, DivX
Audio: AAC, AC3, DTS, DTS-HD, TrueHD, Atmos, FLAC, MP3
HDR: HDR, HDR10, HDR10+, DV, Dolby Vision
```

### Implementation Strategy
```typescript
// parser/parser.service.ts
export class ParserService {
  parse(title: string): ParsedRelease {
    // 1. Clean and normalize title
    const cleaned = this.cleanTitle(title);

    // 2. Extract episode info first (most variable)
    const episodeInfo = this.episodeParser.parse(cleaned);

    // 3. Extract quality info
    const qualityInfo = this.qualityParser.parse(cleaned);

    // 4. Extract release info
    const releaseInfo = this.releaseParser.parse(cleaned);

    // 5. Extract series title (what's left)
    const seriesTitle = this.titleParser.extract(cleaned, episodeInfo);

    // 6. Detect language
    const languages = this.languageParser.detect(cleaned);

    // 7. Calculate confidence
    const confidence = this.calculateConfidence({
      episodeInfo,
      qualityInfo,
      releaseInfo,
      seriesTitle,
    });

    return {
      seriesTitle,
      cleanTitle: this.generateCleanTitle(seriesTitle),
      ...episodeInfo,
      quality: qualityInfo,
      ...releaseInfo,
      languages,
      confidence,
    };
  }
}
```

### Test Requirements
- [ ] Minimum 500 test cases
- [ ] Cover all pattern types (standard, anime, daily, movie)
- [ ] Cover edge cases (no group, no quality, non-English)
- [ ] Parser accuracy > 98%
- [ ] Parser performance < 5ms per title

### Test Format
```typescript
// tests/parser/fixtures/releases.json
[
  {
    "input": "Show.Name.S01E01.720p.HDTV.x264-GROUP",
    "expected": {
      "seriesTitle": "Show Name",
      "seasonNumber": 1,
      "episodeNumbers": [1],
      "quality": { "resolution": 720, "source": "hdtv", "codec": "x264" },
      "releaseGroup": "GROUP"
    }
  },
  // ... 499 more
]
```

## Constraints
- Use regex for pattern matching (not AI/ML)
- Optimize for performance (called frequently)
- Handle international characters
- Don't crash on malformed input (return best effort)
- Return confidence score for each parse

## Output
- Parser service implementation
- 500+ test cases with fixtures
- API endpoint for testing: POST /api/v3/parser/test
- Performance benchmarks
```

---

## Usage Tips for Agents

### Starting a Task

```markdown
When starting any task, the agent should:

1. **Acknowledge the task**: "I'll implement [task name] for idkarr."

2. **List what I'll read first**:
   - "First, I'll read the relevant documentation..."
   - Read DATABASE_SCHEMA.md
   - Read DEEP_ARCHITECTURE.md
   - Read task-specific docs

3. **Outline the approach**:
   - "My implementation plan is..."
   - List files to create/modify
   - List key components

4. **Implement incrementally**:
   - Start with types/interfaces
   - Implement core logic
   - Add tests
   - Create API endpoints
   - Build UI (if applicable)

5. **Verify against acceptance criteria**:
   - Check each criterion
   - Run tests
   - Note any deviations
```

### Handling Blockers

```markdown
If the agent encounters a blocker:

1. **Document the blocker clearly**:
   - "I cannot proceed because..."
   - Reference the specific dependency

2. **Propose alternatives** (if possible):
   - "I could work around this by..."
   - "Alternatively, I could implement X first..."

3. **Create stub/interface**:
   - If blocked by another service, create interface
   - Implement against the interface
   - Note that implementation is needed

4. **Flag for human review**:
   - "This requires a decision: ..."
   - Provide options with pros/cons
```

### Completing a Task

```markdown
When completing a task:

1. **Summarize what was done**:
   - Files created/modified
   - Key implementation decisions
   - Any deviations from spec

2. **List test coverage**:
   - Tests written
   - Coverage percentage
   - Edge cases covered

3. **Note known issues**:
   - TODOs with task IDs
   - Performance considerations
   - Security considerations

4. **Handoff notes**:
   - What dependent tasks can now proceed
   - Any context needed for next agent
```

---

*Keep this document updated as new tasks are defined or patterns evolve.*
