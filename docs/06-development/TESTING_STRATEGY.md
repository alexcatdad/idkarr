# Testing Strategy Specification

## Overview

This document defines the comprehensive testing strategy for idkarr, covering unit tests, integration tests, end-to-end tests, and specialized testing for the release parser. Testing is critical for maintaining quality and enabling confident refactoring.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Parser Testing](#parser-testing)
7. [API Testing](#api-testing)
8. [Performance Testing](#performance-testing)
9. [Security Testing](#security-testing)
10. [Test Data Management](#test-data-management)
11. [CI/CD Integration](#cicd-integration)
12. [Coverage Requirements](#coverage-requirements)

---

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation**: Focus on what code does, not how
2. **Fast Feedback**: Unit tests run in milliseconds, integration in seconds
3. **Isolation**: Tests don't depend on each other or external state
4. **Deterministic**: Same input always produces same result
5. **Readable**: Tests serve as documentation

### Testing Tools

| Tool | Purpose | Backend/Frontend |
|------|---------|------------------|
| Bun Test | Unit & integration tests | Backend |
| Vitest | Unit tests | Frontend |
| Playwright | E2E tests | Frontend |
| Supertest | API testing | Backend |
| MSW | API mocking | Frontend |
| Testcontainers | Database testing | Backend |

---

## Test Pyramid

```
                    ┌───────────────┐
                    │     E2E       │  ~10%
                    │   (Slow)      │  Critical user flows
                    └───────┬───────┘
                            │
               ┌────────────┴────────────┐
               │      Integration        │  ~20%
               │      (Medium)           │  API, Database
               └────────────┬────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │              Unit Tests               │  ~70%
        │              (Fast)                   │  Functions, Components
        └───────────────────────────────────────┘
```

### Distribution

| Test Type | Percentage | Execution Time | Purpose |
|-----------|------------|----------------|---------|
| Unit | 70% | < 10ms each | Business logic, utilities |
| Integration | 20% | < 1s each | API endpoints, database |
| E2E | 10% | < 30s each | Critical user journeys |

---

## Unit Testing

### Backend Unit Tests

```typescript
// Test structure: backend/src/**/*.test.ts

// Example: Parser unit test
// backend/src/parser/quality.test.ts

import { describe, expect, it } from 'bun:test';
import { parseQuality } from './quality';

describe('parseQuality', () => {
  describe('resolution detection', () => {
    it('should detect 1080p from explicit marker', () => {
      const result = parseQuality('Movie.2023.1080p.BluRay.x264');
      expect(result.resolution).toBe(1080);
    });

    it('should detect 4K from UHD marker', () => {
      const result = parseQuality('Movie.2023.UHD.BluRay.x265');
      expect(result.resolution).toBe(2160);
    });

    it('should detect 720p from HD marker when no resolution specified', () => {
      const result = parseQuality('Movie.2023.HD.BluRay.x264');
      expect(result.resolution).toBe(720);
    });

    it('should return unknown for no quality indicators', () => {
      const result = parseQuality('Movie.2023');
      expect(result.resolution).toBe(0);
      expect(result.source).toBe('unknown');
    });
  });

  describe('source detection', () => {
    it.each([
      ['BluRay', 'bluray'],
      ['BDRip', 'bluray'],
      ['WEB-DL', 'webdl'],
      ['WEBRip', 'webrip'],
      ['HDTV', 'hdtv'],
      ['DVDRip', 'dvd'],
    ])('should detect %s as %s', (input, expected) => {
      const result = parseQuality(`Movie.2023.${input}.x264`);
      expect(result.source).toBe(expected);
    });
  });
});
```

### Service Unit Tests

```typescript
// backend/src/services/series.service.test.ts

import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { SeriesService } from './series.service';
import { createMockRepository } from '@/test/mocks';

describe('SeriesService', () => {
  let service: SeriesService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new SeriesService(mockRepo);
  });

  describe('addSeries', () => {
    it('should add series with default monitoring settings', async () => {
      const tvdbId = 12345;
      mockRepo.findByTvdbId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 1, tvdbId, title: 'Test Series' });

      const result = await service.addSeries({
        tvdbId,
        qualityProfileId: 1,
        rootFolderPath: '/media/tv',
      });

      expect(result.id).toBe(1);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tvdbId,
          monitored: true,
        })
      );
    });

    it('should throw if series already exists', async () => {
      mockRepo.findByTvdbId.mockResolvedValue({ id: 1 });

      await expect(
        service.addSeries({
          tvdbId: 12345,
          qualityProfileId: 1,
          rootFolderPath: '/media/tv',
        })
      ).rejects.toThrow('Series already exists');
    });
  });

  describe('searchMissing', () => {
    it('should search for monitored episodes without files', async () => {
      const mockEpisodes = [
        { id: 1, seriesId: 1, hasFile: false, monitored: true },
        { id: 2, seriesId: 1, hasFile: false, monitored: true },
      ];
      mockRepo.findMissingEpisodes.mockResolvedValue(mockEpisodes);

      const searchFn = mock(() => Promise.resolve());
      await service.searchMissing(1, searchFn);

      expect(searchFn).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Frontend Unit Tests

```typescript
// frontend/src/components/SeriesCard.test.tsx

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeriesCard } from './SeriesCard';

describe('SeriesCard', () => {
  const mockSeries = {
    id: 1,
    title: 'Breaking Bad',
    year: 2008,
    status: 'ended',
    monitored: true,
    statistics: {
      episodeCount: 62,
      episodeFileCount: 62,
      percentOfEpisodes: 100,
    },
  };

  it('should display series title and year', () => {
    render(<SeriesCard series={mockSeries} />);

    expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
    expect(screen.getByText('2008')).toBeInTheDocument();
  });

  it('should show completion percentage', () => {
    render(<SeriesCard series={mockSeries} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', async () => {
    const onEdit = vi.fn();
    render(<SeriesCard series={mockSeries} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith(mockSeries);
  });

  it('should display monitored badge when monitored', () => {
    render(<SeriesCard series={mockSeries} />);

    expect(screen.getByText('Monitored')).toBeInTheDocument();
  });

  it('should display unmonitored badge when not monitored', () => {
    render(<SeriesCard series={{ ...mockSeries, monitored: false }} />);

    expect(screen.getByText('Unmonitored')).toBeInTheDocument();
  });
});
```

### Utility Unit Tests

```typescript
// backend/src/utils/path.test.ts

import { describe, expect, it } from 'bun:test';
import { normalizePath, validatePath, joinPath } from './path';

describe('path utilities', () => {
  describe('normalizePath', () => {
    it('should normalize Windows paths to Unix', () => {
      expect(normalizePath('C:\\Media\\TV')).toBe('/c/Media/TV');
    });

    it('should remove trailing slashes', () => {
      expect(normalizePath('/media/tv/')).toBe('/media/tv');
    });

    it('should collapse multiple slashes', () => {
      expect(normalizePath('/media//tv///shows')).toBe('/media/tv/shows');
    });
  });

  describe('validatePath', () => {
    it('should reject path traversal attempts', () => {
      expect(validatePath('../etc/passwd', '/media')).toBeNull();
      expect(validatePath('/media/../etc/passwd', '/media')).toBeNull();
    });

    it('should accept valid paths within base', () => {
      expect(validatePath('tv/Breaking Bad', '/media')).toBe('/media/tv/Breaking Bad');
    });

    it('should reject null bytes', () => {
      expect(validatePath('valid\x00.txt', '/media')).toBeNull();
    });
  });
});
```

---

## Integration Testing

### API Integration Tests

```typescript
// backend/src/routes/series.test.ts

import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import { app } from '@/app';
import { createTestDatabase, seedTestData, cleanupTestDatabase } from '@/test/database';
import { createAuthenticatedRequest } from '@/test/auth';

describe('Series API', () => {
  let testDb: TestDatabase;
  let authRequest: ReturnType<typeof createAuthenticatedRequest>;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    authRequest = createAuthenticatedRequest(testDb);
  });

  afterAll(async () => {
    await cleanupTestDatabase(testDb);
  });

  beforeEach(async () => {
    await testDb.reset();
    await seedTestData(testDb);
  });

  describe('GET /api/v3/series', () => {
    it('should return paginated series list', async () => {
      const response = await authRequest.get('/api/v3/series');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeArray();
      expect(response.body.page).toBe(1);
      expect(response.body.totalRecords).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await authRequest.get('/api/v3/series?status=ended');

      expect(response.status).toBe(200);
      expect(response.body.data.every((s: any) => s.status === 'ended')).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await app.request('/api/v3/series');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v3/series', () => {
    it('should add new series', async () => {
      const response = await authRequest.post('/api/v3/series', {
        tvdbId: 999999,
        title: 'New Series',
        qualityProfileId: 1,
        rootFolderPath: '/media/tv',
      });

      expect(response.status).toBe(201);
      expect(response.body.data.tvdbId).toBe(999999);
    });

    it('should reject duplicate series', async () => {
      // Series with tvdbId 12345 exists in seed data
      const response = await authRequest.post('/api/v3/series', {
        tvdbId: 12345,
        qualityProfileId: 1,
        rootFolderPath: '/media/tv',
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('CONFLICT');
    });

    it('should validate required fields', async () => {
      const response = await authRequest.post('/api/v3/series', {
        tvdbId: 999999,
        // Missing qualityProfileId and rootFolderPath
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v3/series/:id', () => {
    it('should delete series without files', async () => {
      const response = await authRequest.delete('/api/v3/series/1');

      expect(response.status).toBe(204);

      const checkResponse = await authRequest.get('/api/v3/series/1');
      expect(checkResponse.status).toBe(404);
    });

    it('should require series:delete permission', async () => {
      const viewerRequest = createAuthenticatedRequest(testDb, 'viewer');
      const response = await viewerRequest.delete('/api/v3/series/1');

      expect(response.status).toBe(403);
    });
  });
});
```

### Database Integration Tests

```typescript
// backend/src/repositories/series.repository.test.ts

import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import { SeriesRepository } from './series.repository';
import { createTestDatabase, TestDatabase } from '@/test/database';

describe('SeriesRepository', () => {
  let testDb: TestDatabase;
  let repo: SeriesRepository;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    repo = new SeriesRepository(testDb.db);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  describe('findById', () => {
    it('should return series with relations', async () => {
      await testDb.seed('series', { id: 1, tvdbId: 12345, title: 'Test Series' });
      await testDb.seed('season', { id: 1, seriesId: 1, seasonNumber: 1 });

      const series = await repo.findById(1, { includeSeason: true });

      expect(series).not.toBeNull();
      expect(series?.seasons).toHaveLength(1);
    });

    it('should return null for non-existent series', async () => {
      const series = await repo.findById(99999);
      expect(series).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await testDb.seed('series', [
        { id: 1, title: 'Breaking Bad', cleanTitle: 'breakingbad' },
        { id: 2, title: 'Better Call Saul', cleanTitle: 'bettercallsaul' },
        { id: 3, title: 'The Wire', cleanTitle: 'wire' },
      ]);
    });

    it('should search by title', async () => {
      const results = await repo.search('Breaking');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Breaking Bad');
    });

    it('should search by clean title', async () => {
      const results = await repo.search('better call');
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await repo.search('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('updateStatistics', () => {
    it('should calculate episode statistics correctly', async () => {
      await testDb.seed('series', { id: 1, tvdbId: 12345 });
      await testDb.seed('episode', [
        { seriesId: 1, seasonNumber: 1, episodeNumber: 1, hasFile: true },
        { seriesId: 1, seasonNumber: 1, episodeNumber: 2, hasFile: true },
        { seriesId: 1, seasonNumber: 1, episodeNumber: 3, hasFile: false },
      ]);

      await repo.updateStatistics(1);

      const series = await repo.findById(1);
      expect(series?.statistics?.episodeCount).toBe(3);
      expect(series?.statistics?.episodeFileCount).toBe(2);
      expect(series?.statistics?.percentOfEpisodes).toBeCloseTo(66.67, 1);
    });
  });
});
```

### Queue Integration Tests

```typescript
// backend/src/queue/download.queue.test.ts

import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import { Queue } from 'bullmq';
import { DownloadQueue } from './download.queue';
import { createTestRedis, TestRedis } from '@/test/redis';

describe('DownloadQueue', () => {
  let testRedis: TestRedis;
  let queue: DownloadQueue;

  beforeAll(async () => {
    testRedis = await createTestRedis();
    queue = new DownloadQueue(testRedis.connection);
  });

  afterAll(async () => {
    await queue.close();
    await testRedis.cleanup();
  });

  beforeEach(async () => {
    await queue.obliterate();
  });

  describe('addDownload', () => {
    it('should add download job to queue', async () => {
      const job = await queue.addDownload({
        releaseId: 'abc123',
        seriesId: 1,
        episodeIds: [1, 2],
        downloadClientId: 1,
      });

      expect(job.id).toBeDefined();
      expect(job.data.releaseId).toBe('abc123');
    });

    it('should deduplicate identical downloads', async () => {
      const data = {
        releaseId: 'abc123',
        seriesId: 1,
        episodeIds: [1],
        downloadClientId: 1,
      };

      await queue.addDownload(data);
      await queue.addDownload(data);

      const jobs = await queue.getJobs(['waiting', 'active']);
      expect(jobs).toHaveLength(1);
    });
  });

  describe('processing', () => {
    it('should process download job', async () => {
      const processed: any[] = [];

      queue.process(async (job) => {
        processed.push(job.data);
        return { success: true };
      });

      await queue.addDownload({
        releaseId: 'abc123',
        seriesId: 1,
        episodeIds: [1],
        downloadClientId: 1,
      });

      // Wait for processing
      await new Promise((r) => setTimeout(r, 100));

      expect(processed).toHaveLength(1);
      expect(processed[0].releaseId).toBe('abc123');
    });
  });
});
```

---

## End-to-End Testing

### Playwright Setup

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

```typescript
// e2e/series.spec.ts

import { test, expect } from '@playwright/test';
import { login, seedTestData, resetDatabase } from './helpers';

test.describe('Series Management', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await seedTestData();
    await login(page);
  });

  test('should display series library', async ({ page }) => {
    await page.goto('/series');

    await expect(page.getByRole('heading', { name: 'Series' })).toBeVisible();
    await expect(page.getByTestId('series-grid')).toBeVisible();

    const seriesCards = page.getByTestId('series-card');
    await expect(seriesCards).toHaveCount(3); // From seed data
  });

  test('should add new series', async ({ page }) => {
    await page.goto('/series');
    await page.getByRole('button', { name: 'Add Series' }).click();

    // Search for series
    await page.getByPlaceholder('Search for series...').fill('Breaking Bad');
    await page.keyboard.press('Enter');

    // Wait for search results
    await expect(page.getByTestId('search-results')).toBeVisible();

    // Click on first result
    await page.getByTestId('search-result').first().click();

    // Configure options
    await page.getByLabel('Quality Profile').selectOption('HD-1080p');
    await page.getByLabel('Root Folder').selectOption('/media/tv');

    // Add series
    await page.getByRole('button', { name: 'Add' }).click();

    // Verify added
    await expect(page.getByText('Series added successfully')).toBeVisible();
    await expect(page.getByText('Breaking Bad')).toBeVisible();
  });

  test('should edit series monitoring', async ({ page }) => {
    await page.goto('/series/1'); // Existing series from seed

    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Monitored').uncheck();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Series updated')).toBeVisible();
    await expect(page.getByText('Unmonitored')).toBeVisible();
  });

  test('should search for episodes', async ({ page }) => {
    await page.goto('/series/1');

    // Open season
    await page.getByText('Season 1').click();

    // Search for episode
    await page.getByRole('button', { name: 'Search' }).first().click();

    // Wait for search
    await expect(page.getByText('Searching...')).toBeVisible();
    await expect(page.getByText('Searching...')).not.toBeVisible({ timeout: 30000 });

    // Should show search results or no results message
    const hasResults = await page.getByTestId('release-result').count() > 0;
    const hasNoResults = await page.getByText('No releases found').isVisible();
    expect(hasResults || hasNoResults).toBe(true);
  });

  test('should delete series', async ({ page }) => {
    await page.goto('/series/1');

    await page.getByRole('button', { name: 'Delete' }).click();

    // Confirm deletion
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Delete files').check();
    await page.getByRole('button', { name: 'Delete' }).click();

    // Should redirect to series list
    await expect(page).toHaveURL('/series');
    await expect(page.getByText('Series deleted')).toBeVisible();
  });
});
```

### Queue E2E Tests

```typescript
// e2e/queue.spec.ts

import { test, expect } from '@playwright/test';
import { login, seedTestData, addToQueue } from './helpers';

test.describe('Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedTestData();
    await addToQueue([
      { title: 'Breaking Bad S01E01', status: 'downloading', progress: 45 },
      { title: 'Better Call Saul S01E01', status: 'queued', progress: 0 },
    ]);
    await login(page);
  });

  test('should display queue items', async ({ page }) => {
    await page.goto('/queue');

    await expect(page.getByText('Breaking Bad S01E01')).toBeVisible();
    await expect(page.getByText('45%')).toBeVisible();
    await expect(page.getByText('Better Call Saul S01E01')).toBeVisible();
  });

  test('should remove item from queue', async ({ page }) => {
    await page.goto('/queue');

    await page.getByTestId('queue-item').first().hover();
    await page.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Remove' }).click();

    await expect(page.getByText('Breaking Bad S01E01')).not.toBeVisible();
  });

  test('should update in real-time via WebSocket', async ({ page }) => {
    await page.goto('/queue');

    // Simulate progress update from server
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ws:queue:updated', {
          detail: { downloadId: 'test-1', progress: 75 },
        })
      );
    });

    await expect(page.getByText('75%')).toBeVisible();
  });
});
```

---

## Parser Testing

### Parser Test Suite

```typescript
// backend/src/parser/parser.test.ts

import { describe, expect, it } from 'bun:test';
import { parseRelease } from './parser';

describe('Release Parser', () => {
  // Standard episode tests
  describe('standard episodes', () => {
    const testCases = [
      {
        input: 'The.Walking.Dead.S11E08.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb',
        expected: {
          seriesTitle: 'The Walking Dead',
          seasonNumber: 11,
          episodeNumbers: [8],
          quality: { resolution: 1080, source: 'webdl' },
          releaseGroup: 'NTb',
        },
      },
      {
        input: 'Breaking.Bad.S05E16.Felina.720p.BluRay.x264-DEMAND',
        expected: {
          seriesTitle: 'Breaking Bad',
          seasonNumber: 5,
          episodeNumbers: [16],
          quality: { resolution: 720, source: 'bluray' },
          releaseGroup: 'DEMAND',
        },
      },
      // Add hundreds more test cases...
    ];

    it.each(testCases)('should parse: $input', ({ input, expected }) => {
      const result = parseRelease(input);

      expect(result.seriesTitle).toBe(expected.seriesTitle);
      expect(result.seasonNumber).toBe(expected.seasonNumber);
      expect(result.episodeNumbers).toEqual(expected.episodeNumbers);
      expect(result.quality.resolution).toBe(expected.quality.resolution);
      expect(result.quality.source).toBe(expected.quality.source);
      if (expected.releaseGroup) {
        expect(result.releaseGroup).toBe(expected.releaseGroup);
      }
    });
  });

  // Multi-episode tests
  describe('multi-episode', () => {
    const testCases = [
      {
        input: 'Stranger.Things.S04E01E02.1080p.NF.WEB-DL-GROUP',
        expected: { episodeNumbers: [1, 2] },
      },
      {
        input: 'The.Office.S02E01-E03.720p.HDTV.x264',
        expected: { episodeNumbers: [1, 2, 3] },
      },
      {
        input: 'House.S01E01-02-03.DVDRip.x264',
        expected: { episodeNumbers: [1, 2, 3] },
      },
    ];

    it.each(testCases)('should parse multi-episode: $input', ({ input, expected }) => {
      const result = parseRelease(input);
      expect(result.episodeNumbers).toEqual(expected.episodeNumbers);
    });
  });

  // Daily show tests
  describe('daily shows', () => {
    const testCases = [
      {
        input: 'The.Daily.Show.2023.01.15.720p.WEB.h264-KOGi',
        expected: {
          seriesTitle: 'The Daily Show',
          airDate: '2023-01-15',
          isDaily: true,
        },
      },
      {
        input: 'Conan.2022.12.25.Guest.Name.480p.HDTV.x264',
        expected: {
          airDate: '2022-12-25',
          isDaily: true,
        },
      },
    ];

    it.each(testCases)('should parse daily show: $input', ({ input, expected }) => {
      const result = parseRelease(input);
      expect(result.isDaily).toBe(expected.isDaily);
      expect(result.airDate).toBe(expected.airDate);
    });
  });

  // Anime tests
  describe('anime', () => {
    const testCases = [
      {
        input: '[SubsPlease] Demon Slayer - 43 (1080p) [ABCD1234]',
        expected: {
          seriesTitle: 'Demon Slayer',
          absoluteEpisodeNumbers: [43],
          releaseGroup: 'SubsPlease',
          releaseHash: 'ABCD1234',
        },
      },
      {
        input: '[Erai-raws] One Piece - 1047 [1080p][Multiple Subtitle]',
        expected: {
          seriesTitle: 'One Piece',
          absoluteEpisodeNumbers: [1047],
        },
      },
    ];

    it.each(testCases)('should parse anime: $input', ({ input, expected }) => {
      const result = parseRelease(input);
      expect(result.absoluteEpisodeNumbers).toEqual(expected.absoluteEpisodeNumbers);
      if (expected.releaseHash) {
        expect(result.releaseHash).toBe(expected.releaseHash);
      }
    });
  });

  // Quality edge cases
  describe('quality edge cases', () => {
    it('should detect PROPER', () => {
      const result = parseRelease('Show.S01E01.PROPER.720p.HDTV.x264-GROUP');
      expect(result.proper).toBe(true);
    });

    it('should detect REPACK', () => {
      const result = parseRelease('Show.S01E01.REPACK.1080p.WEB-DL-GROUP');
      expect(result.repack).toBe(true);
    });

    it('should detect version', () => {
      const result = parseRelease('[Group] Show - 01v2 (1080p)');
      expect(result.version).toBe(2);
    });

    it('should detect HDR', () => {
      const result = parseRelease('Movie.2023.2160p.UHD.BluRay.HDR.HEVC-GROUP');
      expect(result.quality.hdr).toBe(true);
    });

    it('should detect Dolby Vision', () => {
      const result = parseRelease('Movie.2023.2160p.BluRay.DoVi.HEVC-GROUP');
      expect(result.quality.dolbyVision).toBe(true);
    });
  });
});
```

### Imported Parser Tests

```typescript
// backend/src/parser/parser.imported.test.ts

// Import test cases from Sonarr for compatibility testing
import sonarrTestCases from './fixtures/sonarr-parser-tests.json';

describe('Sonarr Compatibility', () => {
  describe('series title parsing', () => {
    it.each(sonarrTestCases.seriesTitles)(
      'should match Sonarr: %s',
      (input, expectedTitle) => {
        const result = parseRelease(input);
        expect(result.seriesTitle).toBe(expectedTitle);
      }
    );
  });

  describe('quality parsing', () => {
    it.each(sonarrTestCases.qualities)(
      'should match Sonarr quality: %s',
      (input, expectedQuality) => {
        const result = parseRelease(input);
        expect(result.quality.name).toBe(expectedQuality);
      }
    );
  });
});
```

---

## API Testing

### OpenAPI Schema Validation

```typescript
// backend/src/test/api-schema.test.ts

import { describe, expect, it } from 'bun:test';
import { app } from '@/app';
import Ajv from 'ajv';
import openApiSchema from '@/api/openapi.json';

const ajv = new Ajv({ allErrors: true });

describe('API Schema Validation', () => {
  const endpoints = [
    { method: 'GET', path: '/api/v3/series', schema: 'SeriesListResponse' },
    { method: 'GET', path: '/api/v3/series/1', schema: 'SeriesResponse' },
    { method: 'GET', path: '/api/v3/queue', schema: 'QueueResponse' },
  ];

  it.each(endpoints)(
    'should validate $method $path against schema',
    async ({ method, path, schema }) => {
      const response = await app.request(path, {
        method,
        headers: { 'X-Api-Key': 'test-key' },
      });

      const body = await response.json();
      const schemaValidator = ajv.compile(openApiSchema.components.schemas[schema]);
      const isValid = schemaValidator(body);

      expect(isValid).toBe(true);
      if (!isValid) {
        console.error('Validation errors:', schemaValidator.errors);
      }
    }
  );
});
```

---

## Performance Testing

### Load Testing

```typescript
// backend/src/test/load.test.ts

import { describe, it } from 'bun:test';
import autocannon from 'autocannon';

describe('Load Testing', () => {
  it('should handle 100 concurrent users on /api/v3/series', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/api/v3/series',
      connections: 100,
      duration: 10,
      headers: {
        'X-Api-Key': process.env.TEST_API_KEY,
      },
    });

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.latency.p99).toBeLessThan(200); // 99th percentile < 200ms
    expect(result.requests.average).toBeGreaterThan(500); // > 500 req/s
  });

  it('should handle burst traffic', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/api/v3/queue',
      connections: 500,
      duration: 5,
      headers: {
        'X-Api-Key': process.env.TEST_API_KEY,
      },
    });

    expect(result.errors).toBe(0);
    expect(result.latency.p95).toBeLessThan(500);
  });
});
```

---

## Security Testing

### Security Test Suite

```typescript
// backend/src/test/security.test.ts

import { describe, expect, it } from 'bun:test';
import { app } from '@/app';

describe('Security', () => {
  describe('authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await app.request('/api/v3/series');
      expect(response.status).toBe(401);
    });

    it('should reject invalid API keys', async () => {
      const response = await app.request('/api/v3/series', {
        headers: { 'X-Api-Key': 'invalid' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('should enforce role-based access', async () => {
      const viewerKey = await createApiKey('viewer');
      const response = await app.request('/api/v3/series/1', {
        method: 'DELETE',
        headers: { 'X-Api-Key': viewerKey },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('input validation', () => {
    it('should reject SQL injection attempts', async () => {
      const response = await authenticatedRequest('/api/v3/series?title=\'; DROP TABLE series; --');
      expect(response.status).toBe(400);
    });

    it('should reject path traversal attempts', async () => {
      const response = await authenticatedRequest('/api/v3/series', {
        method: 'POST',
        body: JSON.stringify({
          tvdbId: 12345,
          path: '../../../etc/passwd',
          qualityProfileId: 1,
        }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('rate limiting', () => {
    it('should rate limit excessive requests', async () => {
      const requests = Array(101).fill(null).map(() =>
        app.request('/api/v3/series', {
          headers: { 'X-Api-Key': 'test-key' },
        })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('headers', () => {
    it('should include security headers', async () => {
      const response = await app.request('/api/v3/series', {
        headers: { 'X-Api-Key': 'test-key' },
      });

      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });
  });
});
```

---

## Test Data Management

### Test Fixtures

```typescript
// backend/src/test/fixtures/index.ts

export const fixtures = {
  series: {
    breakingBad: {
      id: 1,
      tvdbId: 81189,
      title: 'Breaking Bad',
      sortTitle: 'breaking bad',
      cleanTitle: 'breakingbad',
      status: 'ended',
      year: 2008,
      monitored: true,
      qualityProfileId: 1,
      path: '/media/tv/Breaking Bad',
    },
    betterCallSaul: {
      id: 2,
      tvdbId: 273181,
      title: 'Better Call Saul',
      sortTitle: 'better call saul',
      cleanTitle: 'bettercallsaul',
      status: 'ended',
      year: 2015,
      monitored: true,
      qualityProfileId: 1,
      path: '/media/tv/Better Call Saul',
    },
  },
  episodes: {
    breakingBadS01E01: {
      id: 1,
      seriesId: 1,
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Pilot',
      hasFile: true,
      monitored: true,
    },
  },
  qualityProfiles: {
    hd1080p: {
      id: 1,
      name: 'HD-1080p',
      cutoff: 7,
      items: [
        { quality: { id: 7, name: 'WEBDL-1080p' }, allowed: true },
        { quality: { id: 9, name: 'Bluray-1080p' }, allowed: true },
      ],
    },
  },
  users: {
    admin: {
      id: 'user-1',
      username: 'admin',
      email: 'admin@test.com',
      roles: ['admin'],
    },
    viewer: {
      id: 'user-2',
      username: 'viewer',
      email: 'viewer@test.com',
      roles: ['viewer'],
    },
  },
};
```

### Database Seeding

```typescript
// backend/src/test/database.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { fixtures } from './fixtures';

export async function createTestDatabase(): Promise<TestDatabase> {
  const connectionString = process.env.TEST_DATABASE_URL;
  const client = postgres(connectionString);
  const db = drizzle(client);

  return {
    db,
    client,
    async seed(table: string, data: unknown | unknown[]) {
      const records = Array.isArray(data) ? data : [data];
      await db.insert(tables[table]).values(records);
    },
    async reset() {
      // Truncate all tables
      await db.execute(sql`TRUNCATE TABLE series, episodes, queue CASCADE`);
    },
    async cleanup() {
      await client.end();
    },
  };
}

export async function seedTestData(db: TestDatabase): Promise<void> {
  await db.seed('quality_profile', fixtures.qualityProfiles.hd1080p);
  await db.seed('series', Object.values(fixtures.series));
  await db.seed('episode', Object.values(fixtures.episodes));
  await db.seed('user', Object.values(fixtures.users));
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run migrations
        run: bun run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run integration tests
        run: bun test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Install Playwright
        run: bunx playwright install --with-deps

      - name: Run E2E tests
        run: bunx playwright test

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Coverage Requirements

### Coverage Targets

| Area | Minimum | Target |
|------|---------|--------|
| Overall | 80% | 90% |
| Parser | 95% | 99% |
| Services | 85% | 95% |
| API Routes | 80% | 90% |
| Utilities | 90% | 95% |
| Components | 75% | 85% |

### Coverage Configuration

```typescript
// vitest.config.ts (Frontend)

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
```

---

*This testing strategy ensures comprehensive coverage of all system components while maintaining fast feedback loops for developers.*
