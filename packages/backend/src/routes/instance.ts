// ============================================================================
// Instance Routes
// ============================================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, asc, sql } from 'drizzle-orm';

import { db } from '../db/client.js';
import { instances, media } from '../db/schema/index.js';
import { auth, requireAuth, requireRole } from '../middleware/auth.js';

const instanceRoutes = new Hono();

// Apply auth middleware
instanceRoutes.use('*', auth);

// ----------------------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------------------

const contentTypeEnum = z.enum(['series', 'movie', 'anime', 'mixed']);

const createInstanceSchema = z.object({
  name: z.string().min(1).max(100),
  contentType: contentTypeEnum,
  enabled: z.boolean().default(true),
  defaultQualityProfileId: z.number().int().positive().optional(),
  defaultRootFolderId: z.number().int().positive().optional(),
  settings: z.object({
    rssSyncInterval: z.number().int().positive().default(60),
    searchOnAdd: z.boolean().default(true),
    seasonFolder: z.boolean().default(true),
  }).optional(),
});

const updateInstanceSchema = createInstanceSchema.partial();

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

/**
 * GET /instances
 * List all instances
 */
instanceRoutes.get('/', requireAuth, async (c) => {
  const result = await db
    .select({
      instance: instances,
      mediaCount: sql<number>`(
        SELECT COUNT(*) FROM media WHERE media.instance_id = ${instances.id}
      )`,
    })
    .from(instances)
    .orderBy(asc(instances.name));

  return c.json({
    data: result.map((r) => ({
      ...r.instance,
      mediaCount: Number(r.mediaCount),
    })),
  });
});

/**
 * GET /instances/:id
 * Get a single instance
 */
instanceRoutes.get('/:id', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid instance ID' } },
      400
    );
  }

  const result = await db
    .select()
    .from(instances)
    .where(eq(instances.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Instance not found' } },
      404
    );
  }

  // Get media count
  const mediaCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .where(eq(media.instanceId, id));

  return c.json({
    ...result[0],
    mediaCount: Number(mediaCount[0]?.count ?? 0),
  });
});

/**
 * POST /instances
 * Create a new instance
 */
instanceRoutes.post(
  '/',
  requireAuth,
  requireRole('admin'),
  zValidator('json', createInstanceSchema),
  async (c) => {
    const data = c.req.valid('json');

    const result = await db
      .insert(instances)
      .values({
        name: data.name,
        contentType: data.contentType,
        enabled: data.enabled,
        defaultQualityProfileId: data.defaultQualityProfileId ?? null,
        defaultRootFolderId: data.defaultRootFolderId ?? null,
        settings: data.settings ?? {
          rssSyncInterval: 60,
          searchOnAdd: true,
          seasonFolder: true,
        },
      })
      .returning();

    return c.json({ data: result[0] }, 201);
  }
);

/**
 * PUT /instances/:id
 * Update an instance
 */
instanceRoutes.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  zValidator('json', updateInstanceSchema),
  async (c) => {
    const id = parseInt(c.req.param('id'), 10);

    if (isNaN(id)) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid instance ID' } },
        400
      );
    }

    const data = c.req.valid('json');

    // Build update object, only including defined values
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.contentType !== undefined) updateData.contentType = data.contentType;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.defaultQualityProfileId !== undefined) updateData.defaultQualityProfileId = data.defaultQualityProfileId;
    if (data.defaultRootFolderId !== undefined) updateData.defaultRootFolderId = data.defaultRootFolderId;
    if (data.settings !== undefined) updateData.settings = data.settings;

    const result = await db
      .update(instances)
      .set(updateData)
      .where(eq(instances.id, id))
      .returning();

    if (result.length === 0) {
      return c.json(
        { error: { code: 'NOT_FOUND', message: 'Instance not found' } },
        404
      );
    }

    return c.json({ data: result[0] });
  }
);

/**
 * DELETE /instances/:id
 * Delete an instance
 */
instanceRoutes.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid instance ID' } },
      400
    );
  }

  // Check if instance has media
  const mediaCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .where(eq(media.instanceId, id));

  if (Number(mediaCount[0]?.count ?? 0) > 0) {
    return c.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Cannot delete instance with existing media. Delete all media first.',
        },
      },
      409
    );
  }

  const result = await db
    .delete(instances)
    .where(eq(instances.id, id))
    .returning();

  if (result.length === 0) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Instance not found' } },
      404
    );
  }

  return c.json({ success: true });
});

export { instanceRoutes };
