# AGENTS.md

Agentic Coding Guide for TypeScript/Bun Sonarr Rebuild

---

## Build / Lint / Test Commands

### Installation
```bash
# Install all dependencies (monorepo)
bun install

# Install backend dependencies
cd backend && bun install

# Install frontend dependencies
cd frontend && bun install
```

### Development
```bash
# Start all services (backend + frontend + postgres + redis)
bun run dev

# Start backend only
bun run dev:backend

# Start frontend only
bun run dev:frontend

# Start with hot reload
bun run dev:watch
```

### Building
```bash
# Build all packages
bun run build

# Build backend only
bun run build:backend

# Build frontend only
bun run build:frontend

# Build for production
bun run build:prod
```

### Testing
```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run a single test file
bun test path/to/test.test.ts

# Run tests matching a pattern
bun test --grep "SeriesService"

# Run with coverage
bun test --coverage

# Run integration tests
bun test:integration

# Run E2E tests
bun test:e2e
```

### Type Checking
```bash
# Type check all packages
bun run typecheck

# Type check backend
bun run typecheck:backend

# Type check frontend
bun run typecheck:frontend
```

### Linting
```bash
# Lint all code
bun run lint

# Lint and auto-fix
bun run lint:fix

# Lint backend
bun run lint:backend

# Lint frontend
bun run lint:frontend
```

### Database (Drizzle)
```bash
# Generate Drizzle client
bun run db:generate

# Create migration
bun run db:migrate:create

# Run migrations
bun run db:migrate:push

# Rollback migration
bun run db:migrate:rollback

# Reset database (dev only)
bun run db:reset

# Seed database
bun run db:seed

# Open Drizzle Studio
bun run db:studio
```

### Queue (BullMQ)
```bash
# Start queue workers
bun run queue:workers

# View queue dashboard
bun run queue:dashboard

# Pause queue
bun run queue:pause

# Resume queue
bun run queue:resume
```

---

## Tech Stack

### Backend
- **Runtime**: Bun 1.0+
- **Framework**: Hono v4
- **ORM**: Drizzle ORM v0.32
- **Database**: PostgreSQL 16
- **Cache**: Redis 8
- **Queue**: BullMQ v5
- **WebSocket**: Bun native WebSockets
- **Authentication**: Lucia v3
- **Validation**: Zod v4
- **Logging**: Pino v9
- **Email**: Resend v4
- **File Upload**: @uploadthing/react v7
- **Media Processing**: fluent-ffmpeg v2.1

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand v5
- **Data Fetching**: TanStack Query v5
- **Forms**: React Hook Form v7 + Zod
- **Date Handling**: date-fns v4
- **Icons**: Lucide React v0.454
- **Charts**: Recharts v2
- **Animations**: Framer Motion v12
- **Virtualization**: @tanstack/react-window v3
- **Toast**: Sonner v2
- **PDF**: @react-pdf/renderer v4

### DevOps
- **Container**: Bun Docker
- **Process Manager**: PM2
- **Reverse Proxy**: Caddy v2
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry v8
- **Logging**: Logtail v2

---

## Code Style Guidelines

### Imports
- Use ES modules (import/export) throughout
- Organize imports by type in this order:
  1. External packages (from 'react', 'hono', 'drizzle-orm', etc.)
  2. Internal packages (from '@/core', '@/lib', '@/components', etc.)
  3. Relative imports (from './utils', './types', etc.)
  4. Types (from '@/types', './types', etc.)
- Use absolute imports with @/ prefix for internal modules
- No default exports from packages (use named exports)
- Remove unused imports
- Import styles directly in component files

**Good:**
```typescript
// Backend
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '@/db/client';
import { seriesService } from '@/core/tv/services/series.service';
import type { Series } from '@/core/shared/models/series.model';
import { logger } from '@/lib/logger';

// Frontend
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { seriesService } from '@/lib/api/series';
import type { Series } from '@/types/models/series';
import './SeriesCard.css';
```

**Bad:**
```typescript
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
const seriesService = require('@/lib/api/series');
```

### Formatting
- Use Prettier for automatic formatting
- 2 space indentation (no tabs)
- Single quotes for strings
- Trailing commas
- Max line length: 100 characters
- No semicolons (allow ESLint to handle)
- Arrow functions preferred over function declarations

**Good:**
```typescript
const formatSeries = (series: Series) => {
  return {
    ...series,
    title: series.title.trim(),
  };
};

const processEpisodes = (
  episodes: Episode[],
  filter?: (ep: Episode) => boolean,
) => {
  if (!filter) return episodes;
  return episodes.filter(filter);
};
```

### Types
- Use TypeScript strict mode
- Type all functions, variables, and return values
- Prefer interface over type for object shapes (allows declaration merging)
- Use type for unions, primitives, and function signatures
- Use generics with constraints where appropriate
- Avoid `any` - use `unknown` if type is truly unknown
- Use utility types (Partial, Pick, Omit, Record, etc.)
- Define types in dedicated types files or near usage
- Export types used across boundaries

**Good:**
```typescript
interface Series {
  id: number;
  title: string;
  status: SeriesStatus;
  episodes?: Episode[];
}

type SeriesStatus = 'continuing' | 'ended' | 'upcoming';

interface SeriesService {
  getAll(): Promise<Series[]>;
  getById(id: number): Promise<Series | null>;
  create(series: CreateSeriesDto): Promise<Series>;
  update(id: number, updates: Partial<Series>): Promise<Series>;
  delete(id: number): Promise<void>;
}

// Generic with constraint
function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}

// Utility types
type SeriesUpdate = Partial<Pick<Series, 'title' | 'status' | 'monitored'>>;
```

**Bad:**
```typescript
const series: any = {};
function getSeries(id): any {  // No return type
  return fetch(`/series/${id}`);
}
```

### Naming Conventions

**Files:**
- Components: PascalCase (SeriesCard.tsx, EpisodeList.tsx)
- Utilities: camelCase (formatDate.ts, debounce.ts)
- Types: PascalCase (Series.ts, Episode.ts)
- Hooks: camelCase with 'use' prefix (useSeries.ts, useQueue.ts)
- API services: camelCase (seriesService.ts, episodeService.ts)
- Stores: camelCase with 'Store' suffix (seriesStore.ts)
- Tests: camelCase with `.test.ts` suffix (seriesService.test.ts)

**Variables:**
- Constants: UPPER_SNAKE_CASE (MAX_SERIES_PER_PAGE)
- Regular variables: camelCase (seriesId, episodeTitle)
- Boolean: prefix with 'is', 'has', 'should' (isMonitored, hasFile, shouldUpdate)
- Functions: camelCase, verb-first (getSeriesById, updateEpisode, deleteSeries)
- Classes: PascalCase (SeriesService, Parser, DecisionEngine)
- Interfaces: PascalCase (ISeriesService is NOT needed, use SeriesService)
- Types: PascalCase (Series, Episode, Quality)

**Database Models (Drizzle):**
- Tables: PascalCase (Series, Episode, EpisodeFile)
- Columns: camelCase (seasonNumber, episodeNumber, qualityId)

**API Routes (Backend):**
- Paths: kebab-case (/api/v3/series, /api/v3/download-client)
- Query params: camelCase (?seasonNumber=1)
- Route params: camelCase (/:seriesId/:episodeId)

**API Routes (Frontend - Next.js):**
- Pages: kebab-case (/series/[id], /episodes/[id])
- API Routes: kebab-case (/api/v3/series/route.ts)

**Good:**
```typescript
// Constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;

// Variables
const seriesId = 123;
const episodeTitle = "Pilot";
const isMonitored = true;
const hasFile = false;

// Functions
function getSeriesById(id: number): Promise<Series> { }
function updateSeries(series: SeriesUpdate): Promise<Series> { }
function shouldDownloadEpisode(episode: Episode): boolean { }

// Classes
class SeriesService { }
class ReleaseParser { }

// Components
function SeriesCard({ series }: { series: Series }) { }
```

**Bad:**
```typescript
// Variables
const SeriesID = 123;  // UPPER_SNAKE_CASE for non-constants
const Ep_Title = "Pilot";  // Inconsistent casing
const monitored = true;  // Should be isMonitored for boolean

// Functions
function SeriesById(id: number) { }  // Not verb-first
function process(episodes) { }  // No type annotations
```

### Error Handling

**Error Types:**
- Create custom error classes extending Error
- Use specific error types for different scenarios
- Include error codes for client handling

**Throwing Errors:**
- Throw errors for invalid operations
- Include meaningful error messages
- Include context (id, action, etc.) in error

**Catching Errors:**
- Use try-catch for async operations
- Log errors with context
- Return user-friendly error messages
- Distinguish between expected and unexpected errors

**API Errors:**
- Return appropriate HTTP status codes
- Include error code and message in response
- Use consistent error response format

**Good:**
```typescript
// Custom error types
class ValidationError extends HttpError {
  constructor(message: string, public field?: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends HttpError {
  constructor(message: string, public resource: string, public id: number) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Throwing errors
function validateSeries(series: Partial<Series>): void {
  if (!series.title) {
    throw new ValidationError('Title is required', 'title');
  }
  if (!series.tvdbId || series.tvdbId <= 0) {
    throw new ValidationError('Invalid TVDB ID', 'tvdbId');
  }
}

async function getSeriesById(id: number): Promise<Series> {
  const series = await db.query.series.findFirst({
    where: eq(series.id, id),
  });
  if (!series) {
    throw new NotFoundError('Series not found', 'series', id);
  }
  return series;
}

// Catching errors
try {
  const series = await getSeriesById(id);
  return c.json({ data: series });
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Validation error', { error: error.message, field: error.field });
    return c.json(
      { error: 'VALIDATION_ERROR', message: error.message },
      400,
    );
  } else if (error instanceof NotFoundError) {
    logger.warn('Not found', { resource: error.resource, id: error.id });
    return c.json(
      { error: 'NOT_FOUND', message: error.message },
      404,
    );
  } else {
    logger.error('Unexpected error', { error });
    return c.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      500,
    );
  }
}
```

**Bad:**
```typescript
// Generic errors
throw new Error('Something went wrong');

// Swallowing errors
try {
  await getSeries();
} catch (e) {
  // No logging or handling
}

// Returning inconsistent error formats
if (!series) {
  return { error: 'NOT_FOUND' };
} else {
  return { status: 404, message: 'Not found' };
}
```

### Function Design

**Pure Functions:**
- Prefer pure functions (no side effects)
- Same input always produces same output
- Don't mutate input parameters

**Function Length:**
- Keep functions focused and short (< 50 lines)
- Extract complex logic to separate functions
- Use composition to build complex operations

**Parameters:**
- Use object parameters for > 3 arguments
- Destructure objects in function signature
- Provide default values where appropriate
- Use optional parameters (?) rarely - prefer explicit undefined checks

**Returns:**
- Always return something (undefined is ok for no return)
- Use early returns for error conditions
- Avoid nested if-else chains

**Good:**
```typescript
// Pure function
function calculateQualityScore(quality: Quality): number {
  const { resolution, source, modifier } = quality;
  let score = 0;

  if (resolution === 2160) score += 100;
  else if (resolution === 1080) score += 80;
  else if (resolution === 720) score += 60;
  else score += 40;

  if (source === 'bluray') score += 20;
  else if (source === 'web') score += 15;
  else if (source === 'dvd') score += 10;

  if (modifier === 'proper') score += 5;
  else if (modifier === 'repack') score += 5;

  return score;
}

// Object parameters
async function searchSeries({
  query,
  year,
  genre,
  page = 1,
  pageSize = 20,
}: SearchSeriesOptions): Promise<Series[]> {
  const conditions = [
    query ? sql`${series.title} ILIKE ${`%${query}%`}` : sql`1=1`,
    year ? eq(series.year, year) : sql`1=1`,
  ];

  return db.query.series.findMany({
    where: and(...conditions),
    offset: (page - 1) * pageSize,
    limit: pageSize,
  });
}

// Early returns
function validateEpisode(episode: Episode): ValidationResult {
  if (!episode.title) {
    return { valid: false, error: 'Title is required' };
  }

  if (episode.seasonNumber < 0) {
    return { valid: false, error: 'Season number must be >= 0' };
  }

  if (episode.episodeNumber < 0) {
    return { valid: false, error: 'Episode number must be >= 0' };
  }

  return { valid: true };
}

// Composition
const isMonitored = (s: Series) => s.monitored;
const isContinuing = (s: Series) => s.status === 'continuing';
const isDownloaded = (s: Series) => s.episodes?.some(ep => ep.hasFile) ?? false;

const activeSeries = (series: Series[]) =>
  series.filter(s => isMonitored(s) && isContinuing(s));

const completedSeries = (series: Series[]) =>
  series.filter(s => isDownloaded(s));
```

**Bad:**
```typescript
// Too many parameters
function searchSeries(query: string, year: number, genre: string, page: number, pageSize: number) { }

// Mutating input
function addMetadata(series: Series): Series {
  series.metadata = { added: true };
  return series;  // Input was mutated
}

// Nested conditionals
function processSeries(series: Series): ProcessResult {
  if (series) {
    if (series.monitored) {
      if (series.status === 'continuing') {
        if (series.episodes) {
          // ... deep nesting
        }
      }
    }
  }
}
```

### Component Design (Frontend)

**Component Guidelines:**
- Use functional components with hooks
- Keep components small and focused
- Extract repeated logic to custom hooks
- Use TypeScript interfaces for props
- Provide default props where appropriate
- Use children prop for composition
- Use Server Components for data fetching (Next.js 15)
- Use Client Components for interactivity

**Props Interface:**
- Define props interface without I prefix
- Use readonly for props (React handles this)
- Use descriptive prop names
- Add JSDoc comments for complex props

**Component Structure:**
- 1. Imports
- 2. Props interface
- 3. Component definition
- 4. Hooks and state
- 5. Effects
- 6. Event handlers
- 7. Render helpers
- 8. JSX return

**Good:**
```typescript
'use client';  // Only if using hooks/state

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Series } from '@/types/models/series';
import { deleteSeries } from '@/lib/api/series';

interface SeriesCardProps {
  series: Series;
  onEdit?: (series: Series) => void;
  onDelete?: (series: Series) => void;
}

export function SeriesCard({ series, onEdit, onDelete }: SeriesCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEdit = () => {
    onEdit?.(series);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteSeries(series.id);
      onDelete?.(series);
    } finally {
      setIsLoading(false);
    }
  };

  const formatStatus = (status: SeriesStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="series-card">
      <img src={series.poster} alt={series.title} />
      <h3>{series.title}</h3>
      <span>{formatStatus(series.status)}</span>
      <div className="actions">
        <Button onClick={handleEdit} disabled={isLoading}>
          Edit
        </Button>
        <Button onClick={handleDelete} variant="destructive" disabled={isLoading}>
          Delete
        </Button>
      </div>
    </div>
  );
}
```

**Bad:**
```typescript
// No TypeScript props
export function SeriesCard({ series, onEdit, onDelete }) { }

// Too much logic in component
export function SeriesList({ series }: { series: Series[] }) {
  // 200+ lines of component logic
}

// Inline styles
<div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
```

### Database (Drizzle)

**Schema Design:**
- Use descriptive table and column names
- Add indexes for frequently queried columns
- Use appropriate column types
- Define relations with .references() helper
- Use $defaultFn for default values
- Add .unique() for unique constraints

**Query Patterns:**
- Use db.query for type-safe queries
- Use .select() to limit returned columns
- Use .with() for relations (avoid N+1 queries)
- Use .where() for filtering
- Use .findFirst() vs .findUnique() appropriately
- Use transactions for multi-step operations

**Good:**
```typescript
// Simple query
const series = await db.query.series.findFirst({
  where: eq(series.id, seriesId),
  with: {
    episodes: true,
    qualityProfile: true,
  },
});

// With select
const seriesList = await db.query.series.findMany({
  columns: {
    id: true,
    title: true,
    status: true,
  },
  with: {
    _count: {
      columns: { episodes: true },
    },
  },
  where: eq(series.monitored, true),
});

// With relations and nested select
const seriesWithEpisodes = await db.query.series.findMany({
  with: {
    episodes: {
      where: eq(episodes.hasFile, true),
      columns: {
        id: true,
        episodeNumber: true,
      },
    },
    qualityProfile: true,
  },
});

// Pagination
const paginated = await db.query.series.findMany({
  offset: (page - 1) * pageSize,
  limit: pageSize,
  orderBy: asc(series.title),
});

// Transaction
const newSeries = await db.transaction(async (tx) => {
  const created = await tx.insert(series)
    .values(createSeriesDto)
    .returning()
    .get();

  await tx.insert(season)
    .values(
      createSeriesDto.seasons.map(s => ({
        seriesId: created.id,
        seasonNumber: s.seasonNumber,
      })),
    );

  return created;
});
```

**Bad:**
```typescript
// Raw SQL (unless necessary)
const result = await db.execute(sql`SELECT * FROM series`);

// N+1 query pattern
const series = await db.query.series.findMany();
for (const s of series) {
  const episodes = await db.query.episodes.findMany({  // N+1!
    where: eq(episodes.seriesId, s.id),
  });
}
```

### API Design (Backend - Hono)

**REST API:**
- Use nouns for resource names (not verbs)
- Use plural nouns for collections (/series, /episodes)
- Use HTTP methods correctly (GET, POST, PUT, DELETE, PATCH)
- Use appropriate status codes
- Return consistent response format
- Use pagination for large datasets
- Provide filtering and sorting via query params

**Response Format:**
```typescript
// Success response
interface SuccessResponse<T> {
  data: T;
}

// Error response
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

// Paginated response
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}
```

**Good:**
```typescript
// GET /api/v3/series
app.get('/api/v3/series', async (c) => {
  const { page = 1, pageSize = 20, sort = 'title', order = 'asc' } = c.req.query();
  
  const offset = (Number(page) - 1) * Number(pageSize);
  const [data, totalRecords] = await Promise.all([
    db.query.series.findMany({
      offset,
      limit: Number(pageSize),
      orderBy: order === 'asc' ? asc(series.title) : desc(series.title),
    }),
    db.select({ count: count() }).from(series),
  ]);

  return c.json({
    data,
    page: Number(page),
    pageSize: Number(pageSize),
    totalRecords: totalRecords[0].count,
    totalPages: Math.ceil(totalRecords[0].count / Number(pageSize)),
  });
});

// POST /api/v3/series
app.post('/api/v3/series', async (c) => {
  const body = await c.req.json();
  
  // Validate
  const result = createSeriesSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid request data', result.error);
  }

  const series = await seriesService.create(result.data);

  return c.json({ data: series }, 201);
});

// PUT /api/v3/series/:id
app.put('/api/v3/series/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();

  const series = await seriesService.update(id, body);
  return c.json({ data: series });
});

// DELETE /api/v3/series/:id
app.delete('/api/v3/series/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await seriesService.delete(id);
  return new Response(null, { status: 204 });
});
```

**Bad:**
```typescript
// Verbs in URL
app.get('/api/v3/getSeries', ...);
app.post('/api/v3/createSeries', ...);

// Inconsistent response format
app.get('/api/v3/series', () => {
  return { series: [...] };  // Should be { data: [...] }
});

// No validation
app.post('/api/v3/series', async (c) => {
  const body = await c.req.json();
  return db.insert(series).values(body).returning().get();  // No validation
});
```

### API Design (Frontend - TanStack Query)

**Query Patterns:**
- Use useQuery for data fetching
- Use useMutation for mutations
- Use useInfiniteQuery for pagination
- Use queryClient.invalidateQueries for cache invalidation
- Use optimistic updates for better UX

**Good:**
```typescript
// Query hook
export function useSeries(id: number) {
  return useQuery({
    queryKey: ['series', id],
    queryFn: () => getSeries(id),
    enabled: !!id,
    staleTime: 60 * 1000,  // 1 minute
  });
}

// Mutation hook
export function useUpdateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateSeriesParams) => updateSeries(id, data),
    onSuccess: (data, { id }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['series', id] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });
}

// Optimistic update
export function useToggleMonitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, monitored }: ToggleMonitorParams) => toggleMonitor(seriesId, monitored),
    onMutate: async ({ seriesId, monitored }) => {
      await queryClient.cancelQueries({ queryKey: ['series', seriesId] });

      const previousSeries = queryClient.getQueryData<Series>(['series', seriesId]);

      queryClient.setQueryData<Series>(['series', seriesId], (old) => ({
        ...old!,
        monitored,
      }));

      return { previousSeries };
    },
    onError: (error, { seriesId }, context) => {
      queryClient.setQueryData(['series', seriesId], context.previousSeries);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });
}
```

### Testing

**Unit Tests:**
- Test public API only
- Use descriptive test names
- Arrange-Act-Assert pattern
- Mock external dependencies
- Test happy path and error cases
- Keep tests simple and readable

**Integration Tests:**
- Test service layers with database
- Test API endpoints end-to-end
- Use test database
- Clean up after each test

**E2E Tests:**
- Test critical user flows
- Use Playwright for browser tests
- Test across multiple browsers
- Include accessibility tests

**Good:**
```typescript
// Unit test
describe('SeriesService', () => {
  describe('getById', () => {
    it('should return series when found', async () => {
      const mockSeries = { id: 1, title: 'Test' };
      vi.mocked(db.query.series.findFirst).mockResolvedValue(mockSeries);

      const result = await seriesService.getById(1);

      expect(result).toEqual(mockSeries);
    });

    it('should return null when not found', async () => {
      vi.mocked(db.query.series.findFirst).mockResolvedValue(null);

      const result = await seriesService.getById(999);

      expect(result).toBeNull();
    });
  });
});

// Integration test
describe('Series API', () => {
  it('should create and retrieve series', async () => {
    const createData = { tvdbId: 123, title: 'Test Series', status: 'continuing' };
    const response = await fetch('/api/v3/series', {
      method: 'POST',
      body: JSON.stringify(createData),
    });

    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created.data.title).toBe('Test Series');

    const getResponse = await fetch(`/api/v3/series/${created.data.id}`);
    expect(getResponse.status).toBe(200);
    const retrieved = await getResponse.json();
    expect(retrieved.data).toEqual(created.data);
  });
});

// E2E test
test('user can add a series', async ({ page }) => {
  await page.goto('/series');
  await page.click('button:has-text("Add Series")');
  await page.fill('input[name="search"]', 'Breaking Bad');
  await page.click('text=Breaking Bad');
  await page.click('button:has-text("Add")');

  await expect(page.locator('.series-card')).toContainText('Breaking Bad');
});
```

**Bad:**
```typescript
// Test doesn't describe behavior
it('should work', async () => { });

// Testing implementation details
it('should call database with correct query', async () => {
  const result = await service.getById(1);
  expect(db.query.series.findFirst).toHaveBeenCalledWith({ where: { id: 1 } });
});

// No cleanup
it('should create series', async () => {
  await api.post('/series', data);
  // No assertion or cleanup
});
```

---

## Additional Notes

### Code Reviews
- Ensure all guidelines are followed
- Check for unnecessary complexity
- Verify test coverage
- Look for potential bugs
- Suggest improvements
- Be constructive and specific

### Performance
- Use Server Components for initial data (Next.js 15)
- Use React Server Actions for mutations (Next.js 15)
- Optimize images (Next.js Image component)
- Implement pagination for large lists
- Use caching strategically (TanStack Query)
- Use virtualization for large lists (TanStack Virtual)
- Use code splitting (Next.js automatic)
- Monitor bundle size (webpack-bundle-analyzer)

### Security
- Validate all inputs (Zod)
- Sanitize user data (DOMPurify if needed)
- Use parameterized queries (Drizzle handles this)
- Implement rate limiting (Hono middleware)
- Secure sensitive data (never expose API keys in frontend)
- Use HTTPS in production
- Implement CORS correctly
- Use Content Security Policy (CSP)
- Keep dependencies updated

### Documentation
- Add JSDoc comments for public APIs
- Document complex algorithms
- Keep README files up to date
- Document environment variables
- Provide example configurations
- Include migration guides
- Use inline comments sparingly (code should be self-documenting)

---

*This AGENTS.md file should be updated as the project evolves. Following these guidelines will ensure consistent, maintainable, and high-quality code.*