// ============================================================================
// Media Routes
// ============================================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, ilike, or, desc, asc, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { media, seasons, episodes, mediaFiles } from '../db/schema/index.js';
import { auth, requireAuth, requireRole } from '../middleware/auth.js';

const mediaRoutes = new Hono();

// Apply auth middleware
mediaRoutes.use('*', auth);

// ----------------------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------------------

const mediaTypeEnum = z.enum(['series', 'movie', 'anime']);
const mediaStatusEnum = z.enum(['continuing', 'ended', 'upcoming', 'released', 'deleted']);

const createMediaSchema = z.object({
  title: z.string().min(1),
  sortTitle: z.string().optional(),
  mediaType: mediaTypeEnum,
  status: mediaStatusEnum.optional(),
  overview: z.string().optional(),
  year: z.number().int().positive().optional(),
  tvdbId: z.number().int().positive().optional(),
  tmdbId: z.number().int().positive().optional(),
  imdbId: z.string().optional(),
  path: z.string().min(1),
  rootFolderPath: z.string().min(1),
  qualityProfileId: z.number().int().positive(),
  instanceId: z.number().int().positive(),
  monitored: z.boolean().default(true),
  tags: z.array(z.number()).default([]),
});

const updateMediaSchema = createMediaSchema.partial();

const listMediaSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['title', 'year', 'added', 'updated']).default('title'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  mediaType: mediaTypeEnum.optional(),
  status: mediaStatusEnum.optional(),
  monitored: z.coerce.boolean().optional(),
  search: z.string().optional(),
  instanceId: z.coerce.number().int().positive().optional(),
  tags: z.string().optional(), // comma-separated tag IDs
});

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

/**
 * GET /media
 * List all media with filtering and pagination
 */
mediaRoutes.get('/', requireAuth, zValidator('query', listMediaSchema), async (c) => {
  const {
    page,
    pageSize,
    sortBy,
    sortOrder,
    mediaType,
    status,
    monitored,
    search,
    instanceId,
    tags,
  } = c.req.valid('query');

  // Build where conditions
  const conditions = [];

  if (mediaType) {
    conditions.push(eq(media.mediaType, mediaType));
  }

  if (status) {
    conditions.push(eq(media.status, status));
  }

  if (monitored !== undefined) {
    conditions.push(eq(media.monitored, monitored));
  }

  if (instanceId) {
    conditions.push(eq(media.instanceId, instanceId));
  }

  if (search) {
    conditions.push(
      or(
        ilike(media.title, `%${search}%`),
        ilike(media.sortTitle, `%${search}%`)
      )
    );
  }

  if (tags) {
    const tagIds = tags.split(',').map(Number).filter(Boolean);
    if (tagIds.length > 0) {
      conditions.push(sql`${media.tags} && ARRAY[${sql.join(tagIds, sql`, `)}]::integer[]`);
    }
  }

  // Build sort
  const sortColumn = {
    title: media.sortTitle,
    year: media.year,
    added: media.added,
    updated: media.lastInfoSync,
  }[sortBy];

  const orderBy = sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

  // Execute query with pagination
  const offset = (page - 1) * pageSize;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(media)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .where(whereClause),
  ]);

  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  return c.json({
    data: items,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
});

/**
 * GET /media/:id
 * Get a single media item with details
 */
mediaRoutes.get('/:id', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid media ID' } },
      400
    );
  }

  const result = await db.select().from(media).where(eq(media.id, id)).limit(1);

  if (result.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Media not found' } },
      404
    );
  }

  const item = result[0];
  if (!item) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Media not found' } },
      404
    );
  }

  // Get related data based on media type
  let relatedData = {};

  if (item.mediaType === 'series' || item.mediaType === 'anime') {
    // Get seasons and episodes
    const seasonsList = await db
      .select()
      .from(seasons)
      .where(eq(seasons.mediaId, id))
      .orderBy(asc(seasons.seasonNumber));

    const episodesList = await db
      .select()
      .from(episodes)
      .where(eq(episodes.mediaId, id))
      .orderBy(asc(episodes.seasonNumber), asc(episodes.episodeNumber));

    relatedData = {
      seasons: seasonsList,
      episodes: episodesList,
    };
  }

  // Get media files
  const files = await db
    .select()
    .from(mediaFiles)
    .where(eq(mediaFiles.mediaId, id));

  return c.json({
    ...item,
    ...relatedData,
    mediaFiles: files,
  });
});

/**
 * POST /media
 * Create a new media item
 */
mediaRoutes.post(
  '/',
  requireAuth,
  requireRole('admin', 'user'),
  zValidator('json', createMediaSchema),
  async (c) => {
    const data = c.req.valid('json');

    // Generate sort title if not provided
    const sortTitle = data.sortTitle ?? generateSortTitle(data.title);
    const cleanTitle = generateCleanTitle(data.title);

    const result = await db
      .insert(media)
      .values({
        title: data.title,
        sortTitle,
        cleanTitle,
        mediaType: data.mediaType,
        status: data.status ?? 'continuing',
        overview: data.overview ?? null,
        year: data.year ?? null,
        tvdbId: data.tvdbId ?? null,
        tmdbId: data.tmdbId ?? null,
        imdbId: data.imdbId ?? null,
        path: data.path,
        rootFolderPath: data.rootFolderPath,
        qualityProfileId: data.qualityProfileId,
        instanceId: data.instanceId,
        monitored: data.monitored,
        tags: data.tags,
      })
      .returning();

    return c.json({ data: result[0] }, 201);
  }
);

/**
 * PUT /media/:id
 * Update a media item
 */
mediaRoutes.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'user'),
  zValidator('json', updateMediaSchema),
  async (c) => {
    const id = parseInt(c.req.param('id'), 10);

    if (isNaN(id)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid media ID' } },
        400
      );
    }

    const data = c.req.valid('json');

    // Update sort title if title changed
    const updates: Record<string, unknown> = { ...data, lastInfoSync: new Date() };
    if (data.title && !data.sortTitle) {
      updates.sortTitle = generateSortTitle(data.title);
    }

    const result = await db
      .update(media)
      .set(updates)
      .where(eq(media.id, id))
      .returning();

    if (result.length === 0) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Media not found' } },
        404
      );
    }

    return c.json({ data: result[0] });
  }
);

/**
 * DELETE /media/:id
 * Delete a media item
 */
mediaRoutes.delete('/:id', requireAuth, requireRole('admin', 'user'), async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid media ID' } },
      400
    );
  }

  const result = await db.delete(media).where(eq(media.id, id)).returning();

  if (result.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Media not found' } },
      404
    );
  }

  return c.json({ success: true });
});

/**
 * POST /media/:id/refresh
 * Trigger a refresh of media metadata
 */
mediaRoutes.post('/:id/refresh', requireAuth, requireRole('admin', 'user'), async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid media ID' } },
      400
    );
  }

  // Check if media exists
  const exists = await db.select().from(media).where(eq(media.id, id)).limit(1);

  if (exists.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Media not found' } },
      404
    );
  }

  // TODO: Queue a refresh command
  // For now, just return success
  return c.json({
    message: 'Refresh queued',
    mediaId: id,
  });
});

/**
 * POST /media/:id/search
 * Trigger a search for missing episodes/files
 */
mediaRoutes.post('/:id/search', requireAuth, requireRole('admin', 'user'), async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid media ID' } },
      400
    );
  }

  // Check if media exists
  const exists = await db.select().from(media).where(eq(media.id, id)).limit(1);

  if (exists.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Media not found' } },
      404
    );
  }

  // TODO: Queue a search command
  return c.json({
    message: 'Search queued',
    mediaId: id,
  });
});

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Generate a sort-friendly title by removing articles
 */
function generateSortTitle(title: string): string {
  const articles = ['the', 'a', 'an'];
  const words = title.toLowerCase().split(' ');
  const firstWord = words[0];

  if (words.length > 1 && firstWord && articles.includes(firstWord)) {
    return words.slice(1).join(' ');
  }

  return title.toLowerCase();
}

/**
 * Generate a clean title for matching (remove special chars, articles, normalize)
 */
function generateCleanTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .replace(/^(the|a|an)/, ''); // Remove leading articles
}

export { mediaRoutes };
