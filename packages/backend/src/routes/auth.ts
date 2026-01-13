// ============================================================================
// Authentication Routes
// ============================================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { setCookie } from 'hono/cookie';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

import { lucia } from '../lib/auth.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { db } from '../db/client.js';
import { users, apiKeys } from '../db/schema/index.js';
import { auth, requireAuth } from '../middleware/auth.js';

const authRoutes = new Hono();

// Apply auth middleware to all routes
authRoutes.use('*', auth);

// ----------------------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------------------

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().positive().optional(),
});

// ----------------------------------------------------------------------------
// Routes
// ----------------------------------------------------------------------------

/**
 * POST /auth/login
 */
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = result[0];
  if (!user) {
    return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } }, 401);
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return c.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } }, 401);
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  });
});

/**
 * POST /auth/register
 */
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, email, password, displayName } = c.req.valid('json');
  const currentUser = c.get('user');

  // Check if this is the first user
  const userCount = await db.select().from(users).limit(1);
  const isFirstUser = userCount.length === 0;

  if (!isFirstUser && (!currentUser || currentUser.role !== 'admin')) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Only administrators can create users' } }, 403);
  }

  const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existingUser.length > 0) {
    return c.json({ error: { code: 'CONFLICT', message: 'Username already exists' } }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = nanoid();

  const newUser = await db
    .insert(users)
    .values({
      id: userId,
      username,
      email: email ?? null,
      passwordHash,
      displayName: displayName ?? null,
      role: isFirstUser ? 'admin' : 'user',
    })
    .returning();

  const created = newUser[0];
  if (!created) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' } }, 500);
  }

  return c.json({
    user: {
      id: created.id,
      username: created.username,
      email: created.email,
      displayName: created.displayName,
      role: created.role,
    },
  }, 201);
});

/**
 * POST /auth/logout
 */
authRoutes.post('/logout', requireAuth, async (c) => {
  const session = c.get('session');
  if (session) {
    await lucia.invalidateSession(session.id);
  }

  const blankCookie = lucia.createBlankSessionCookie();
  setCookie(c, blankCookie.name, blankCookie.value, blankCookie.attributes);

  return c.json({ success: true });
});

/**
 * GET /auth/me
 */
authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

/**
 * POST /auth/api-keys
 */
authRoutes.post('/api-keys', requireAuth, zValidator('json', createApiKeySchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const { name, expiresInDays } = c.req.valid('json');
  const key = `idkarr_${nanoid(32)}`;
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  const result = await db
    .insert(apiKeys)
    .values({
      userId: user.id,
      name,
      key,
      expiresAt,
    })
    .returning();

  const created = result[0];
  if (!created) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } }, 500);
  }

  return c.json({
    apiKey: {
      id: created.id,
      name: created.name,
      key,
      expiresAt: created.expiresAt,
      createdAt: created.createdAt,
    },
  }, 201);
});

/**
 * GET /auth/api-keys
 */
authRoutes.get('/api-keys', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id));

  const maskedKeys = keys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPreview: `${k.key.substring(0, 12)}...`,
    expiresAt: k.expiresAt,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
  }));

  return c.json({ apiKeys: maskedKeys });
});

/**
 * DELETE /auth/api-keys/:id
 */
authRoutes.delete('/api-keys/:id', requireAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
  }

  const keyId = parseInt(c.req.param('id'), 10);
  if (isNaN(keyId)) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid API key ID' } }, 400);
  }

  const result = await db.delete(apiKeys).where(eq(apiKeys.id, keyId)).returning();

  if (result.length === 0) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }

  const deleted = result[0];
  if (deleted && deleted.userId !== user.id && user.role !== 'admin') {
    return c.json({ error: { code: 'FORBIDDEN', message: "Cannot delete another user's API key" } }, 403);
  }

  return c.json({ success: true });
});

export { authRoutes };
