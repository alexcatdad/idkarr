// ============================================================================
// Authentication Middleware
// ============================================================================

import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { lucia } from '../lib/auth.js';
import { db } from '../db/client.js';
import { apiKeys } from '../db/schema/index.js';
import { eq, and, gt, isNull, or } from 'drizzle-orm';

// Extend Hono's context with user/session
declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: string;
      username: string;
      email: string | null;
      displayName: string | null;
      role: 'admin' | 'user' | 'viewer';
    } | null;
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
    } | null;
  }
}

/**
 * Session authentication middleware
 * Validates session cookie and sets user/session in context
 */
export async function sessionAuth(c: Context, next: Next) {
  const sessionId = getCookie(c, lucia.sessionCookieName);

  if (!sessionId) {
    c.set('user', null);
    c.set('session', null);
    return next();
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (session && session.fresh) {
    // Session was refreshed, update cookie
    const sessionCookie = lucia.createSessionCookie(session.id);
    setCookie(c, sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  }

  if (!session) {
    // Invalid session, clear cookie
    const blankCookie = lucia.createBlankSessionCookie();
    setCookie(c, blankCookie.name, blankCookie.value, blankCookie.attributes);
  }

  c.set('user', user);
  c.set('session', session);

  return next();
}

/**
 * API Key authentication middleware
 * Checks for X-Api-Key header
 */
export async function apiKeyAuth(c: Context, next: Next) {
  const apiKey = c.req.header('X-Api-Key');

  if (!apiKey) {
    return next();
  }

  // Look up API key in database
  const result = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.key, apiKey),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date()))
      )
    )
    .limit(1);

  if (result.length === 0) {
    return c.json(
      {
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or expired API key',
        },
      },
      401
    );
  }

  const keyRecord = result[0];
  if (!keyRecord) {
    return c.json({ error: { code: 'INVALID_API_KEY', message: 'Invalid API key' } }, 401);
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id));

  // Set user context (we'd need to join with users table for full user data)
  // For now, set a minimal user object
  c.set('user', {
    id: keyRecord.userId,
    username: 'api-key-user',
    email: null,
    displayName: keyRecord.name,
    role: 'user' as const,
  });
  c.set('session', null);

  return next();
}

/**
 * Combined auth middleware (session + API key)
 */
export async function auth(c: Context, next: Next) {
  // Try API key first
  const apiKey = c.req.header('X-Api-Key');
  if (apiKey) {
    return apiKeyAuth(c, next);
  }

  // Fall back to session auth
  return sessionAuth(c, next);
}

/**
 * Require authentication middleware
 * Returns 401 if not authenticated
 */
export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user');

  if (!user) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      401
    );
  }

  return next();
}

/**
 * Require specific role middleware
 */
export function requireRole(...roles: Array<'admin' | 'user' | 'viewer'>) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    if (!roles.includes(user.role)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        },
        403
      );
    }

    return next();
  };
}
