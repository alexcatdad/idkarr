# idkarr Implementation Guide for Claude Agents

> **Purpose**: Specialized instructions for Claude AI agents implementing the idkarr project
> **Version**: 1.0
> **Last Updated**: January 13, 2026

---

## Table of Contents

1. [Agent Roles & Specializations](#agent-roles--specializations)
2. [Project Context](#project-context)
3. [Code Standards & Patterns](#code-standards--patterns)
4. [Task Execution Protocol](#task-execution-protocol)
5. [Phase-Specific Instructions](#phase-specific-instructions)
6. [File Structure & Naming](#file-structure--naming)
7. [Testing Requirements](#testing-requirements)
8. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
9. [Inter-Agent Communication](#inter-agent-communication)
10. [Quality Gates](#quality-gates)

---

## Agent Roles & Specializations

### Agent Type Definitions

When spawning agents for idkarr tasks, use these specialized configurations:

```yaml
# Backend Implementation Agent
backend-agent:
  focus: "Backend TypeScript implementation with Bun, Hono, Drizzle"
  context_files:
    - docs/02-architecture/DEEP_ARCHITECTURE.md
    - docs/02-architecture/DATABASE_SCHEMA.md
    - docs/03-api-specification/REST_API.md
  tools: [Read, Write, Edit, Bash, Grep, Glob]
  constraints:
    - Always use Drizzle ORM, never raw SQL in application code
    - Use Zod for all validation
    - Follow repository pattern for data access
    - Use dependency injection via constructor

# Frontend Implementation Agent
frontend-agent:
  focus: "Frontend React/Next.js implementation with shadcn/ui"
  context_files:
    - docs/02-architecture/DEEP_ARCHITECTURE.md
    - docs/07-reference/UI_UX_SPECIFICATION.md
    - docs/03-api-specification/REST_API.md
  tools: [Read, Write, Edit, Bash, Grep, Glob]
  constraints:
    - Use Next.js 15 App Router patterns
    - Use TanStack Query for server state
    - Use Zustand for client state
    - All components must be accessible (WCAG AA)

# Database/Schema Agent
database-agent:
  focus: "Database schema design and migrations with Drizzle"
  context_files:
    - docs/02-architecture/DATABASE_SCHEMA.md
    - docs/02-architecture/DATA_FLOW_DIAGRAMS.md
  tools: [Read, Write, Edit, Bash]
  constraints:
    - Use Drizzle ORM schema definitions
    - Always create indexes for foreign keys
    - Use snake_case for database columns
    - Document all relationships

# Testing Agent
testing-agent:
  focus: "Test implementation with Vitest and Playwright"
  context_files:
    - docs/06-development/TESTING_STRATEGY.md
    - docs/06-development/ERROR_HANDLING.md
  tools: [Read, Write, Edit, Bash, Grep]
  constraints:
    - Minimum 80% coverage for new code
    - Use factories for test data
    - Mock external services
    - Include edge cases

# DevOps Agent
devops-agent:
  focus: "Docker, CI/CD, deployment configuration"
  context_files:
    - docs/05-infrastructure/DEPLOYMENT.md
    - docs/05-infrastructure/SECURITY.md
  tools: [Read, Write, Edit, Bash]
  constraints:
    - Multi-stage Docker builds
    - Non-root containers
    - Health checks required
    - Security scanning in CI
```

---

## Project Context

### Essential Background

Before implementing any task, agents MUST understand:

```markdown
## What is idkarr?

idkarr is a unified media management application combining functionality of:
- Sonarr (TV series management)
- Radarr (movie management)
- Overseerr (request management)
- Prowlarr (indexer management)

## Tech Stack (Non-Negotiable)

Backend:
- Runtime: Bun 1.0+
- Framework: Hono v4
- ORM: Drizzle ORM
- Database: PostgreSQL 16+
- Queue: BullMQ with Redis
- Auth: Lucia v3
- Validation: Zod v4
- WebSocket: Bun native WebSockets

Frontend:
- Framework: Next.js 15 (App Router)
- UI: shadcn/ui + Radix UI
- Styling: Tailwind CSS v4
- State: Zustand v5 + TanStack Query v5
- Forms: React Hook Form + Zod

## Critical Design Decisions

1. MEDIA TABLE: Use unified `media` table with `mediaType` discriminator
   - NOT separate series/movie tables
   - mediaType: 'series' | 'movie' | 'anime'

2. INSTANCE SCOPING: All media belongs to an instance
   - instance.contentType determines allowed media types
   - Default instance created on first run

3. PERMISSION MODEL: Deny-takes-precedence
   - User grants override role grants
   - Explicit deny always wins over allow
   - Higher priority roles evaluated first

4. ERROR FORMAT: Unified across REST and WebSocket
   {
     "error": "ERROR_CODE",
     "message": "Human readable message",
     "details": { ... },
     "requestId": "uuid"
   }
```

### File Reading Priority

When starting any task, read files in this order:

```typescript
const CONTEXT_PRIORITY = [
  // Always read first
  'docs/02-architecture/DATABASE_SCHEMA.md',
  'docs/02-architecture/DEEP_ARCHITECTURE.md',

  // Read for API tasks
  'docs/03-api-specification/REST_API.md',
  'docs/03-api-specification/WEBSOCKET_EVENTS.md',

  // Read for feature tasks
  'docs/04-features/UNIFIED_MEDIA_MANAGER.md',
  'docs/04-features/MULTI_USER_ACL.md',

  // Read for specific domains
  'docs/04-features/PARSER_SPECIFICATION.md',      // Parser tasks
  'docs/04-features/DISCOVERY_REQUESTS.md',        // Discovery tasks
  'docs/04-features/AI_RECOMMENDATIONS.md',        // AI tasks
];
```

---

## Code Standards & Patterns

### TypeScript Standards

```typescript
// ✅ CORRECT: Use explicit types, Zod schemas, and proper error handling

import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { media } from '@/db/schema';

// Schema from Drizzle table
export const insertMediaSchema = createInsertSchema(media, {
  title: z.string().min(1).max(255),
  year: z.number().int().min(1900).max(2100),
});

export const selectMediaSchema = createSelectSchema(media);

// Infer types from schemas
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = z.infer<typeof selectMediaSchema>;

// Service with dependency injection
export class MediaService {
  constructor(
    private readonly db: Database,
    private readonly metadataProvider: MetadataProvider,
    private readonly logger: Logger,
  ) {}

  async create(data: InsertMedia): Promise<Media> {
    const validated = insertMediaSchema.parse(data);

    const [result] = await this.db
      .insert(media)
      .values(validated)
      .returning();

    this.logger.info('Media created', { id: result.id, title: result.title });
    return result;
  }
}

// ❌ WRONG: Avoid these patterns
// - any types
// - unvalidated input
// - raw SQL strings
// - console.log instead of logger
// - missing error handling
```

### API Endpoint Pattern

```typescript
// src/api/routes/media.ts

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireAuth, requirePermission } from '@/api/middleware/auth';
import { MediaService } from '@/services/media.service';

const mediaRoutes = new Hono()
  .basePath('/api/v3/media')

  // GET /api/v3/media - List all media
  .get(
    '/',
    requireAuth(),
    requirePermission('media:read'),
    zValidator('query', z.object({
      instanceId: z.coerce.number().optional(),
      mediaType: z.enum(['series', 'movie', 'anime']).optional(),
      page: z.coerce.number().default(1),
      pageSize: z.coerce.number().default(20),
    })),
    async (c) => {
      const query = c.req.valid('query');
      const user = c.get('user');

      const mediaService = c.get('mediaService') as MediaService;
      const result = await mediaService.list({
        ...query,
        userId: user.id, // For ACL filtering
      });

      return c.json({
        data: result.items,
        page: result.page,
        pageSize: result.pageSize,
        totalRecords: result.total,
      });
    }
  )

  // POST /api/v3/media - Create media
  .post(
    '/',
    requireAuth(),
    requirePermission('media:create'),
    zValidator('json', insertMediaSchema),
    async (c) => {
      const data = c.req.valid('json');
      const user = c.get('user');

      const mediaService = c.get('mediaService') as MediaService;
      const result = await mediaService.create({
        ...data,
        addedBy: user.id,
      });

      return c.json({ data: result }, 201);
    }
  );

export { mediaRoutes };
```

### Database Schema Pattern

```typescript
// src/db/schema/media.ts

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { instances } from './instance';
import { qualityProfiles } from './quality-profile';

// Enums
export const mediaTypeEnum = pgEnum('media_type', ['series', 'movie', 'anime']);
export const mediaStatusEnum = pgEnum('media_status', ['continuing', 'ended', 'upcoming', 'released']);

// Table
export const media = pgTable('media', {
  id: serial('id').primaryKey(),

  // External IDs
  tvdbId: integer('tvdb_id'),
  tmdbId: integer('tmdb_id'),
  imdbId: text('imdb_id'),

  // Core fields
  title: text('title').notNull(),
  sortTitle: text('sort_title').notNull(),
  originalTitle: text('original_title'),
  mediaType: mediaTypeEnum('media_type').notNull(),
  status: mediaStatusEnum('status').notNull().default('continuing'),

  // Relationships
  instanceId: integer('instance_id').notNull().references(() => instances.id),
  qualityProfileId: integer('quality_profile_id').notNull().references(() => qualityProfiles.id),

  // Settings
  monitored: boolean('monitored').notNull().default(false),
  path: text('path').notNull(),

  // Metadata
  overview: text('overview'),
  year: integer('year'),
  runtime: integer('runtime'), // minutes

  // Timestamps
  added: timestamp('added').notNull().defaultNow(),
  lastInfoSync: timestamp('last_info_sync'),

}, (table) => ({
  // Indexes
  instanceIdx: index('media_instance_idx').on(table.instanceId),
  tvdbIdx: uniqueIndex('media_tvdb_idx').on(table.tvdbId).where(sql`tvdb_id IS NOT NULL`),
  tmdbIdx: uniqueIndex('media_tmdb_idx').on(table.tmdbId).where(sql`tmdb_id IS NOT NULL`),
  titleIdx: index('media_title_idx').on(table.title),
  typeIdx: index('media_type_idx').on(table.mediaType),
}));

// Relations
export const mediaRelations = relations(media, ({ one, many }) => ({
  instance: one(instances, {
    fields: [media.instanceId],
    references: [instances.id],
  }),
  qualityProfile: one(qualityProfiles, {
    fields: [media.qualityProfileId],
    references: [qualityProfiles.id],
  }),
  episodes: many(episodes),
  files: many(mediaFiles),
  history: many(history),
}));
```

### React Component Pattern

```typescript
// src/components/media/media-card.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Play, Search, Trash2 } from 'lucide-react';
import { useMediaActions } from '@/hooks/use-media-actions';
import { cn } from '@/lib/utils';
import type { Media } from '@/types/media';

interface MediaCardProps {
  media: Media;
  className?: string;
}

export function MediaCard({ media, className }: MediaCardProps) {
  const router = useRouter();
  const { searchMedia, deleteMedia, isLoading } = useMediaActions();
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    router.push(`/media/${media.id}`);
  };

  const handleSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    searchMedia(media.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMedia(media.id);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:ring-2 hover:ring-primary',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`View details for ${media.title}`}
    >
      <CardContent className="relative p-0">
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
          {!imageError && media.posterUrl ? (
            <Image
              src={media.posterUrl}
              alt={`${media.title} poster`}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <Play className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-full items-center justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleSearch}>
                <Search className="mr-1 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <Badge
          variant={media.monitored ? 'default' : 'secondary'}
          className="absolute right-2 top-2"
        >
          {media.monitored ? 'Monitored' : 'Unmonitored'}
        </Badge>
      </CardContent>

      <CardFooter className="flex items-start justify-between p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium" title={media.title}>
            {media.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {media.year} • {media.mediaType}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              Search
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
```

---

## Task Execution Protocol

### Before Starting Any Task

```markdown
## Pre-Task Checklist

1. READ the task description completely
2. READ relevant documentation files (see priority list)
3. CHECK existing code for patterns to follow
4. IDENTIFY dependencies (other tasks, existing code)
5. PLAN the implementation approach
6. VERIFY you understand acceptance criteria

## Questions to Answer Before Coding

- [ ] What files need to be created/modified?
- [ ] What existing patterns should I follow?
- [ ] What tests are required?
- [ ] What edge cases should I handle?
- [ ] Are there security considerations?
- [ ] What error scenarios need handling?
```

### During Task Execution

```markdown
## Implementation Steps

1. CREATE/MODIFY schema files first (if database changes)
2. IMPLEMENT service layer with business logic
3. CREATE API routes using service
4. WRITE unit tests for service
5. WRITE integration tests for API
6. IMPLEMENT frontend components (if applicable)
7. UPDATE documentation if behavior changes

## Commit Protocol

- Commit after each logical unit of work
- Use conventional commits: feat:, fix:, test:, docs:
- Include task ID in commit message: "feat(P2-A-002): implement series CRUD"
- Never commit broken code or failing tests
```

### After Task Completion

```markdown
## Post-Task Checklist

- [ ] All acceptance criteria met
- [ ] Tests passing (npm test)
- [ ] TypeScript compiling (npm run typecheck)
- [ ] Linting passing (npm run lint)
- [ ] Documentation updated if needed
- [ ] No console.log statements left
- [ ] No TODO comments without task IDs
- [ ] Self-review completed
```

---

## Phase-Specific Instructions

### Phase 0: Documentation Fixes

```markdown
## Agent Instructions for Phase 0

You are fixing critical documentation gaps. DO NOT write implementation code.

For each task:
1. READ the current documentation
2. IDENTIFY the specific gap or inconsistency
3. WRITE clear, unambiguous specifications
4. USE concrete examples (TypeScript interfaces, SQL schemas)
5. ENSURE consistency with existing documents

Output format: Markdown documentation updates

Example for P0-001 (Schema Naming):
- Read UNIFIED_MEDIA_MANAGER.md and MULTI_USER_ACL.md
- Document decision: "Use `media` table with `mediaType` discriminator"
- Update all references in both documents
- Add migration note for existing `series` references
```

### Phase 1: Core Infrastructure

```markdown
## Agent Instructions for Phase 1

You are setting up project infrastructure. Focus on:
- Clean architecture
- Type safety
- Developer experience
- CI/CD reliability

For P1-A-001 (Monorepo Setup):
```bash
# Initialize workspace
bun init -y
mkdir -p packages/{backend,frontend,shared}

# Configure workspace in package.json
{
  "workspaces": ["packages/*"]
}

# Each package needs:
# - package.json with name @idkarr/[package]
# - tsconfig.json extending root
# - Proper exports in package.json
```

For P1-A-002 (Database):
- Use Drizzle schema files in packages/backend/src/db/schema/
- One file per domain (media.ts, user.ts, queue.ts, etc.)
- Export all from index.ts
- Run `drizzle-kit generate` for migrations

For P1-A-003 (API Framework):
- Entry point: packages/backend/src/index.ts
- Routes in packages/backend/src/api/routes/
- Middleware in packages/backend/src/api/middleware/
- Use Hono's built-in OpenAPI generation
```

### Phase 2: Media Management

```markdown
## Agent Instructions for Phase 2

You are implementing core media functionality.

CRITICAL: Follow the unified media model:

```typescript
// CORRECT: Single media table with discriminator
const media = pgTable('media', {
  id: serial('id').primaryKey(),
  mediaType: mediaTypeEnum('media_type').notNull(), // 'series' | 'movie' | 'anime'
  // ... shared fields
});

// WRONG: Separate tables
const series = pgTable('series', { ... });
const movies = pgTable('movies', { ... });
```

For P2-A-002 (Series) and P2-A-003 (Movies):
- Both use the `media` table
- Differentiate by `mediaType` field
- Series-specific logic in SeriesService
- Movie-specific logic in MovieService
- Shared logic in MediaService base class

For P2-A-005 (Disk Scanning):
- Use Node.js fs/promises for file operations
- Implement worker for background scanning
- Use BullMQ for scan jobs
- Report progress via WebSocket
```

### Phase 3: Download Pipeline

```markdown
## Agent Instructions for Phase 3

You are implementing the download pipeline. This is the most complex phase.

CRITICAL for P3-A-002 (Parser):
- This is the MOST IMPORTANT component
- Port test cases from Sonarr's parser tests
- Handle edge cases: anime, daily shows, multi-episode
- Use regex for pattern matching
- Return confidence scores

Parser structure:
```typescript
interface ParsedRelease {
  seriesTitle: string;
  seasonNumber?: number;
  episodeNumbers: number[];
  absoluteEpisodeNumber?: number;
  quality: QualityInfo;
  language: Language[];
  releaseGroup?: string;
  releaseHash?: string;
  isProper: boolean;
  isRepack: boolean;
  confidence: number; // 0-100
}

// Parser should handle:
// "Show.Name.S01E01.720p.HDTV.x264-GROUP"
// "Show Name - 01 [720p]" (anime)
// "Show.Name.2024.01.15.720p.WEB" (daily)
// "Show.Name.S01E01E02.720p" (multi-episode)
```

For P3-A-003 (Decision Engine):
- Score releases based on quality profile
- Apply custom format scoring
- Consider indexer priority
- Track rejection reasons
- Return ranked list
```

### Phase 4: User & Discovery

```markdown
## Agent Instructions for Phase 4

You are implementing user management and discovery features.

CRITICAL for P4-A-002 (Permissions):
- Follow deny-takes-precedence model
- User grants override role grants
- Cache permissions in Redis (5 min TTL)
- Log all permission checks for debugging

Permission check flow:
```typescript
async function checkPermission(
  userId: number,
  permission: string,
  resourceId?: number
): Promise<boolean> {
  // 1. Check user-specific deny
  const userDeny = await getUserDeny(userId, permission, resourceId);
  if (userDeny) return false;

  // 2. Check user-specific allow
  const userAllow = await getUserAllow(userId, permission, resourceId);
  if (userAllow) return true;

  // 3. Check role permissions (highest priority first)
  const roles = await getUserRoles(userId);
  for (const role of roles.sort((a, b) => b.priority - a.priority)) {
    if (await roleHasPermission(role.id, permission)) {
      return true;
    }
  }

  return false;
}
```

For P4-B-002 (Requests):
- Implement state machine for request status
- Send notifications on status change
- Auto-approve based on role settings
- Validate media doesn't already exist
```

### Phase 5: Advanced Features

```markdown
## Agent Instructions for Phase 5

You are implementing WebSocket, notifications, and optional AI features.

For P5-A-001 (WebSocket):
```typescript
// Use Bun native WebSocket
Bun.serve({
  fetch(req, server) {
    if (req.url.endsWith('/ws')) {
      const upgraded = server.upgrade(req, {
        data: { userId: extractUserId(req) }
      });
      return upgraded ? undefined : new Response('Upgrade failed', { status: 500 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      // Validate auth, join default channels
      const userId = ws.data.userId;
      ws.subscribe(`user:${userId}`);
      ws.subscribe('system');
    },
    message(ws, message) {
      // Handle subscriptions, commands
      const { type, channel } = JSON.parse(message);
      if (type === 'subscribe') {
        ws.subscribe(channel);
      }
    },
    close(ws) {
      // Cleanup
    }
  }
});
```

For P5-C-001 (AI - Optional):
- Use pgvector for embeddings
- Implement cold-start fallback (trending content)
- Document data handling for privacy
- Allow users to opt-out
```

### Phase 6: Production

```markdown
## Agent Instructions for Phase 6

You are preparing for production deployment.

For P6-A-001 (Testing):
- Minimum 500 parser test cases
- Integration tests for all API endpoints
- Test with realistic data volumes
- Mock external APIs (TVDB, TMDB)

For P6-B-001 (Docker):
```dockerfile
# Multi-stage build
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
RUN adduser --disabled-password --gecos '' idkarr
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER idkarr
EXPOSE 8989
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8989/api/health || exit 1
CMD ["bun", "run", "dist/index.js"]
```

For P6-B-003 (Security):
- Set security headers (Helmet)
- Configure CSP
- Sanitize all user input
- Run npm audit
- Scan Docker image with Trivy
```

---

## File Structure & Naming

### Project Structure

```
idkarr/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── routes/           # Hono route handlers
│   │   │   │   │   ├── media.ts
│   │   │   │   │   ├── user.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── middleware/       # Auth, validation, etc.
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── error.ts
│   │   │   │   │   └── validate.ts
│   │   │   │   └── index.ts          # Hono app setup
│   │   │   ├── db/
│   │   │   │   ├── schema/           # Drizzle schemas
│   │   │   │   │   ├── media.ts
│   │   │   │   │   ├── user.ts
│   │   │   │   │   ├── queue.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── migrations/       # Generated migrations
│   │   │   │   └── client.ts         # Database client
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── media.service.ts
│   │   │   │   ├── parser.service.ts
│   │   │   │   └── queue.service.ts
│   │   │   ├── jobs/                 # BullMQ workers
│   │   │   │   ├── rss-sync.job.ts
│   │   │   │   └── import.job.ts
│   │   │   ├── providers/            # External integrations
│   │   │   │   ├── tvdb.provider.ts
│   │   │   │   ├── tmdb.provider.ts
│   │   │   │   └── indexer/
│   │   │   │       ├── base.ts
│   │   │   │       ├── newznab.ts
│   │   │   │       └── torznab.ts
│   │   │   ├── websocket/            # WebSocket handlers
│   │   │   │   ├── server.ts
│   │   │   │   └── handlers.ts
│   │   │   ├── lib/                  # Utilities
│   │   │   │   ├── logger.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── errors.ts
│   │   │   └── index.ts              # Entry point
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/                  # Next.js App Router
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── media/
│   │   │   │   │   ├── queue/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn components
│   │   │   │   ├── media/
│   │   │   │   ├── queue/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   │   ├── use-media.ts
│   │   │   │   ├── use-websocket.ts
│   │   │   │   └── use-auth.ts
│   │   │   ├── stores/               # Zustand stores
│   │   │   │   ├── ui.store.ts
│   │   │   │   └── auth.store.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   └── utils.ts
│   │   │   └── types/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── shared/
│       ├── src/
│       │   ├── types/                # Shared TypeScript types
│       │   ├── schemas/              # Shared Zod schemas
│       │   └── constants/
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── docs/                             # Documentation (existing)
│
├── package.json                      # Workspace root
├── tsconfig.json                     # Base TypeScript config
└── turbo.json                        # Turborepo config (optional)
```

### Naming Conventions

```typescript
// Files
// - Use kebab-case for files: media-card.tsx, queue.service.ts
// - Use .ts for pure TypeScript, .tsx for React components
// - Suffix services: *.service.ts
// - Suffix jobs: *.job.ts
// - Suffix providers: *.provider.ts

// Database
// - Tables: snake_case plural (media, users, quality_profiles)
// - Columns: snake_case (created_at, quality_profile_id)
// - Enums: snake_case (media_type, media_status)

// TypeScript
// - Interfaces/Types: PascalCase (Media, QueueItem)
// - Functions: camelCase (getMedia, createUser)
// - Constants: SCREAMING_SNAKE_CASE (MAX_RETRIES, DEFAULT_PAGE_SIZE)
// - Enums: PascalCase name, PascalCase values

// React Components
// - Component files: PascalCase or kebab-case (MediaCard.tsx or media-card.tsx)
// - Component names: PascalCase (MediaCard, QueueList)
// - Hooks: camelCase with use prefix (useMedia, useWebSocket)

// API Routes
// - Paths: kebab-case (/api/v3/quality-profiles)
// - Query params: camelCase (pageSize, mediaType)
// - Body fields: camelCase (qualityProfileId)
```

---

## Testing Requirements

### Test Structure

```typescript
// tests/unit/services/media.service.test.ts

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { MediaService } from '@/services/media.service';
import { createMockDb, createMockLogger } from '../mocks';

describe('MediaService', () => {
  let service: MediaService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    service = new MediaService(mockDb, createMockLogger());
  });

  describe('create', () => {
    it('should create media with valid data', async () => {
      const input = {
        title: 'Test Show',
        mediaType: 'series' as const,
        tvdbId: 12345,
        instanceId: 1,
        qualityProfileId: 1,
        path: '/tv/test-show',
      };

      mockDb.insert.mockResolvedValue([{ id: 1, ...input }]);

      const result = await service.create(input);

      expect(result.id).toBe(1);
      expect(result.title).toBe('Test Show');
      expect(mockDb.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Show',
      }));
    });

    it('should throw validation error for invalid data', async () => {
      const input = { title: '' }; // Missing required fields

      await expect(service.create(input as any))
        .rejects.toThrow('Validation error');
    });
  });
});
```

### Parser Test Cases

```typescript
// tests/unit/services/parser.test.ts

import { describe, it, expect } from 'bun:test';
import { parseRelease } from '@/services/parser.service';

describe('Parser', () => {
  // Standard formats
  describe('standard series', () => {
    it.each([
      ['Show.Name.S01E01.720p.HDTV.x264-GROUP', {
        seriesTitle: 'Show Name',
        seasonNumber: 1,
        episodeNumbers: [1],
        quality: { resolution: 720, source: 'hdtv', codec: 'x264' },
        releaseGroup: 'GROUP',
      }],
      ['Show Name - S01E01 - Episode Title [720p]', {
        seriesTitle: 'Show Name',
        seasonNumber: 1,
        episodeNumbers: [1],
        quality: { resolution: 720 },
      }],
      // Add 100+ more test cases...
    ])('should parse: %s', (input, expected) => {
      const result = parseRelease(input);
      expect(result).toMatchObject(expected);
    });
  });

  // Anime formats
  describe('anime', () => {
    it.each([
      ['[SubGroup] Anime Name - 01 [720p]', {
        seriesTitle: 'Anime Name',
        absoluteEpisodeNumber: 1,
        releaseGroup: 'SubGroup',
      }],
      // Add 100+ anime test cases...
    ])('should parse anime: %s', (input, expected) => {
      const result = parseRelease(input);
      expect(result).toMatchObject(expected);
    });
  });

  // Daily shows
  describe('daily shows', () => {
    it.each([
      ['Show.Name.2024.01.15.720p.WEB.x264-GROUP', {
        seriesTitle: 'Show Name',
        airDate: '2024-01-15',
        quality: { resolution: 720, source: 'web' },
      }],
      // Add daily show test cases...
    ])('should parse daily: %s', (input, expected) => {
      const result = parseRelease(input);
      expect(result).toMatchObject(expected);
    });
  });

  // Multi-episode
  describe('multi-episode', () => {
    it.each([
      ['Show.Name.S01E01E02.720p', {
        seriesTitle: 'Show Name',
        episodeNumbers: [1, 2],
      }],
      ['Show.Name.S01E01-E03.720p', {
        seriesTitle: 'Show Name',
        episodeNumbers: [1, 2, 3],
      }],
    ])('should parse multi: %s', (input, expected) => {
      const result = parseRelease(input);
      expect(result).toMatchObject(expected);
    });
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api/media.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { app } from '@/api';
import { db } from '@/db/client';
import { media } from '@/db/schema';
import { createTestUser, createTestInstance } from '../helpers';

describe('Media API', () => {
  let testUser: { id: number; apiKey: string };
  let testInstance: { id: number };

  beforeAll(async () => {
    testUser = await createTestUser({ role: 'admin' });
    testInstance = await createTestInstance();
  });

  afterAll(async () => {
    await db.delete(media).where(eq(media.instanceId, testInstance.id));
  });

  describe('POST /api/v3/media', () => {
    it('should create media with valid data', async () => {
      const response = await app.request('/api/v3/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': testUser.apiKey,
        },
        body: JSON.stringify({
          title: 'Test Series',
          mediaType: 'series',
          tvdbId: 12345,
          instanceId: testInstance.id,
          qualityProfileId: 1,
          path: '/tv/test-series',
        }),
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('Test Series');
    });

    it('should return 401 without API key', async () => {
      const response = await app.request('/api/v3/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 422 for invalid data', async () => {
      const response = await app.request('/api/v3/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': testUser.apiKey,
        },
        body: JSON.stringify({ title: '' }), // Invalid
      });

      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });
  });
});
```

---

## Common Pitfalls to Avoid

### Database Pitfalls

```typescript
// ❌ WRONG: N+1 queries
const media = await db.select().from(mediaTable);
for (const m of media) {
  const episodes = await db.select().from(episodesTable).where(eq(episodesTable.mediaId, m.id));
  m.episodes = episodes;
}

// ✅ CORRECT: Use joins or include relations
const media = await db.query.media.findMany({
  with: {
    episodes: true,
    qualityProfile: true,
  },
});

// ❌ WRONG: Missing transaction for related operations
await db.insert(mediaTable).values(mediaData);
await db.insert(episodesTable).values(episodeData); // Could fail, leaving orphaned media

// ✅ CORRECT: Use transaction
await db.transaction(async (tx) => {
  const [newMedia] = await tx.insert(mediaTable).values(mediaData).returning();
  await tx.insert(episodesTable).values(
    episodeData.map(e => ({ ...e, mediaId: newMedia.id }))
  );
});
```

### API Pitfalls

```typescript
// ❌ WRONG: Exposing internal errors
app.onError((err, c) => {
  return c.json({ error: err.message, stack: err.stack }, 500);
});

// ✅ CORRECT: Sanitize error responses
app.onError((err, c) => {
  logger.error('Unhandled error', { error: err, requestId: c.get('requestId') });

  if (err instanceof ValidationError) {
    return c.json({ error: 'VALIDATION_ERROR', message: err.message, details: err.issues }, 422);
  }

  if (err instanceof NotFoundError) {
    return c.json({ error: 'NOT_FOUND', message: err.message }, 404);
  }

  // Don't expose internal errors
  return c.json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, 500);
});

// ❌ WRONG: No pagination for list endpoints
app.get('/api/v3/media', async (c) => {
  const allMedia = await db.select().from(media); // Could be 10,000+ rows
  return c.json({ data: allMedia });
});

// ✅ CORRECT: Always paginate
app.get('/api/v3/media', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const pageSize = Math.min(Number(c.req.query('pageSize')) || 20, 100);

  const [items, [{ count }]] = await Promise.all([
    db.select().from(media).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ count: sql`count(*)` }).from(media),
  ]);

  return c.json({
    data: items,
    page,
    pageSize,
    totalRecords: Number(count),
  });
});
```

### Frontend Pitfalls

```typescript
// ❌ WRONG: Not handling loading/error states
function MediaList() {
  const { data } = useQuery({ queryKey: ['media'], queryFn: fetchMedia });
  return <ul>{data.map(m => <li key={m.id}>{m.title}</li>)}</ul>; // Crashes if data undefined
}

// ✅ CORRECT: Handle all states
function MediaList() {
  const { data, isLoading, error } = useQuery({ queryKey: ['media'], queryFn: fetchMedia });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;

  return <ul>{data.map(m => <li key={m.id}>{m.title}</li>)}</ul>;
}

// ❌ WRONG: Missing accessibility
<div onClick={handleClick}>Click me</div>

// ✅ CORRECT: Accessible button
<button
  onClick={handleClick}
  aria-label="Descriptive action"
>
  Click me
</button>

// Or if it must be a div:
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-label="Descriptive action"
>
  Click me
</div>
```

### WebSocket Pitfalls

```typescript
// ❌ WRONG: Broadcasting to all without filtering
function broadcastQueueUpdate(update: QueueUpdate) {
  for (const client of clients) {
    client.send(JSON.stringify(update)); // Sends to ALL users
  }
}

// ✅ CORRECT: Respect subscriptions and permissions
function broadcastQueueUpdate(update: QueueUpdate) {
  const channel = `instance:${update.instanceId}:queue`;
  server.publish(channel, JSON.stringify({
    type: 'queue:updated',
    data: update,
    timestamp: Date.now(),
  }));
}

// ❌ WRONG: No reconnection handling
const ws = new WebSocket(url);
ws.onclose = () => console.log('disconnected'); // User stuck without updates

// ✅ CORRECT: Auto-reconnect with backoff
function createWebSocket(url: string) {
  let retryCount = 0;
  const maxRetries = 10;

  function connect() {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      retryCount = 0;
      resubscribe(ws);
    };

    ws.onclose = () => {
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        setTimeout(connect, delay);
      }
    };

    return ws;
  }

  return connect();
}
```

---

## Inter-Agent Communication

### Handoff Protocol

When one agent completes a task that another depends on:

```markdown
## Handoff Template

### Task Completed: [Task ID]

**Summary**: Brief description of what was implemented

**Files Created/Modified**:
- path/to/file.ts - Description of changes
- path/to/another.ts - Description of changes

**Database Changes**:
- New table: `table_name` - Purpose
- New migration: `001_description.sql`

**API Endpoints Added**:
- `GET /api/v3/resource` - Description
- `POST /api/v3/resource` - Description

**Dependencies Introduced**:
- package@version - Why it was added

**Testing**:
- Unit tests: path/to/tests
- Coverage: X%

**Known Issues/TODOs**:
- Issue 1 (Task ID for follow-up)
- Issue 2

**Ready for**:
- [x] Code review
- [x] Integration by dependent tasks
- [ ] Production deployment (needs X)
```

### Dependency Signals

```typescript
// When implementing a service that others depend on, export clear interfaces

// ✅ CORRECT: Export interface for dependent agents
// src/services/media.service.ts

export interface IMediaService {
  create(data: InsertMedia): Promise<Media>;
  getById(id: number): Promise<Media | null>;
  list(query: MediaQuery): Promise<PaginatedResult<Media>>;
  update(id: number, data: Partial<InsertMedia>): Promise<Media>;
  delete(id: number): Promise<void>;
  search(query: string): Promise<Media[]>;
}

export class MediaService implements IMediaService {
  // Implementation
}

// Dependent agent can now implement against the interface
// even before the implementation is complete
```

---

## Quality Gates

### Before PR/Merge

```bash
# All of these must pass:

# 1. Type checking
bun run typecheck

# 2. Linting
bun run lint

# 3. Tests
bun run test

# 4. Build
bun run build

# 5. No console.logs (except in designated files)
grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "logger"
# Should return empty

# 6. No TODOs without task IDs
grep -r "TODO" src/ --include="*.ts" --include="*.tsx" | grep -v "TODO(P"
# Should return empty (all TODOs should be TODO(P1-A-001): description)
```

### Code Review Checklist

```markdown
## Review Checklist

### General
- [ ] Code follows project patterns
- [ ] No unnecessary comments (self-documenting code)
- [ ] No dead code
- [ ] No hardcoded values (use constants/config)

### TypeScript
- [ ] No `any` types (unless justified)
- [ ] Proper null/undefined handling
- [ ] Zod validation for external inputs
- [ ] Proper error types

### API
- [ ] Proper HTTP status codes
- [ ] Consistent response format
- [ ] Input validation
- [ ] Authorization checks
- [ ] Rate limiting (if applicable)

### Database
- [ ] Proper indexes
- [ ] Transactions where needed
- [ ] No N+1 queries
- [ ] Migration included

### Frontend
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Accessibility (WCAG AA)
- [ ] Responsive design

### Security
- [ ] No sensitive data in logs
- [ ] Input sanitization
- [ ] Proper authentication
- [ ] Authorization checks

### Testing
- [ ] Unit tests for business logic
- [ ] Integration tests for APIs
- [ ] Edge cases covered
- [ ] Mocks for external services
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    IDKARR AGENT QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────────────┤
│ TECH STACK                                                       │
│ Backend:  Bun + Hono + Drizzle + PostgreSQL + BullMQ + Lucia    │
│ Frontend: Next.js 15 + shadcn/ui + Zustand + TanStack Query     │
├─────────────────────────────────────────────────────────────────┤
│ KEY DECISIONS                                                    │
│ • Use unified `media` table with `mediaType` discriminator       │
│ • All media scoped to `instance`                                 │
│ • Deny-takes-precedence for permissions                          │
│ • Unified error format across REST and WebSocket                 │
├─────────────────────────────────────────────────────────────────┤
│ FILE NAMING                                                      │
│ • Files: kebab-case (media-card.tsx)                            │
│ • Database: snake_case (quality_profile_id)                      │
│ • TypeScript: camelCase (getMedia) / PascalCase (MediaService)  │
├─────────────────────────────────────────────────────────────────┤
│ BEFORE CODING                                                    │
│ 1. Read DATABASE_SCHEMA.md                                       │
│ 2. Read DEEP_ARCHITECTURE.md                                     │
│ 3. Check existing patterns in codebase                           │
│ 4. Understand acceptance criteria                                │
├─────────────────────────────────────────────────────────────────┤
│ BEFORE COMMITTING                                                │
│ • bun run typecheck ✓                                           │
│ • bun run lint ✓                                                │
│ • bun run test ✓                                                │
│ • No console.log ✓                                              │
│ • No TODO without task ID ✓                                     │
├─────────────────────────────────────────────────────────────────┤
│ COMMON PATTERNS                                                  │
│ • Services: Constructor injection, interface-first              │
│ • APIs: Zod validation, proper status codes, pagination         │
│ • Components: Loading/error/empty states, accessibility         │
│ • Tests: Factories for data, mocks for external services        │
└─────────────────────────────────────────────────────────────────┘
```

---

*This guide should be provided to any Claude agent working on idkarr tasks. Update as patterns evolve.*
