# Security Specification

## Overview

This document defines the security architecture, authentication mechanisms, authorization patterns, and security best practices for idkarr. Security is a foundational concern that affects every component of the system.

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [API Security](#api-security)
5. [Data Protection](#data-protection)
6. [Input Validation](#input-validation)
7. [Rate Limiting](#rate-limiting)
8. [Security Headers](#security-headers)
9. [Secrets Management](#secrets-management)
10. [Audit Logging](#audit-logging)
11. [Threat Model](#threat-model)
12. [OWASP Considerations](#owasp-considerations)

---

## Security Principles

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Internet/External                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Reverse Proxy       │ ← TLS Termination
                    │   (Caddy/Nginx)       │ ← Rate Limiting
                    │                       │ ← WAF Rules
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   API Gateway         │ ← Authentication
                    │   (Hono Middleware)   │ ← Authorization
                    │                       │ ← Input Validation
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Application Layer   │ ← Business Logic
                    │   (Services)          │ ← Access Control
                    │                       │ ← Audit Logging
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Data Layer          │ ← Encrypted Storage
                    │   (PostgreSQL/Redis)  │ ← Query Parameterization
                    │                       │ ← Backup Encryption
                    └───────────────────────┘
```

### Core Principles

1. **Least Privilege**: Users and services get minimum required permissions
2. **Defense in Depth**: Multiple security layers
3. **Fail Secure**: Default to denying access
4. **Zero Trust**: Verify all requests, trust nothing
5. **Security by Design**: Security built into architecture, not bolted on

---

## Authentication

### Authentication Methods

#### 1. Session-Based Authentication (Lucia)

```typescript
// Primary authentication for web UI

interface SessionAuth {
  // Session stored server-side in PostgreSQL
  sessionId: string;           // Secure random token
  userId: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

// Session configuration
const sessionConfig = {
  sessionExpiresIn: 30 * 24 * 60 * 60 * 1000,  // 30 days
  sessionCookieName: 'idkarr_session',
  secureCookie: true,           // HTTPS only
  sameSite: 'lax' as const,     // CSRF protection
  httpOnly: true,               // No JS access
};
```

#### 2. API Key Authentication

```typescript
// For programmatic access and integrations

interface ApiKeyAuth {
  // Key format: idk_[environment]_[random]
  // Example: idk_prod_a1b2c3d4e5f6g7h8
  keyPrefix: string;            // First 8 chars (visible)
  keyHash: string;              // Argon2 hash of full key
  userId: string;
  name: string;
  permissions: string[];        // Specific permissions (optional)
  ipWhitelist?: string[];       // IP restrictions (optional)
  expiresAt?: Date;             // Expiration (optional)
  lastUsedAt?: Date;
  usageCount: number;
}

// API key validation
async function validateApiKey(key: string): Promise<ApiKeyValidation> {
  const prefix = key.slice(0, 8);
  const apiKey = await db.apiKey.findByPrefix(prefix);

  if (!apiKey) {
    return { valid: false, reason: 'key_not_found' };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, reason: 'key_expired' };
  }

  const isValid = await argon2.verify(apiKey.keyHash, key);
  if (!isValid) {
    return { valid: false, reason: 'key_invalid' };
  }

  // Update last used
  await db.apiKey.updateLastUsed(apiKey.id);

  return { valid: true, apiKey };
}
```

#### 3. Two-Factor Authentication (TOTP)

```typescript
// Optional 2FA using TOTP (RFC 6238)

interface TwoFactorAuth {
  userId: string;
  secret: string;               // Base32 encoded secret (encrypted)
  enabled: boolean;
  backupCodes: string[];        // Hashed backup codes
  verifiedAt: Date;
}

// TOTP configuration
const totpConfig = {
  issuer: 'idkarr',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,                   // 30 seconds
  window: 1,                    // Allow 1 period drift
};

// Generate setup
function generateTotpSetup(userId: string): TotpSetup {
  const secret = speakeasy.generateSecret({
    name: `idkarr:${userId}`,
    issuer: 'idkarr',
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url,
    backupCodes: generateBackupCodes(8),
  };
}

// Verify TOTP
function verifyTotp(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: totpConfig.window,
  });
}
```

### Password Security

```typescript
// Password hashing with Argon2id

const passwordConfig = {
  algorithm: 'argon2id',
  memoryCost: 65536,           // 64 MB
  timeCost: 3,                 // 3 iterations
  parallelism: 4,              // 4 threads
  hashLength: 32,              // 32 bytes
};

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: passwordConfig.memoryCost,
    timeCost: passwordConfig.timeCost,
    parallelism: passwordConfig.parallelism,
    hashLength: passwordConfig.hashLength,
  });
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

### Password Requirements

```typescript
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,        // Recommended but not required
  preventCommon: true,          // Check against common password list
  preventUserInfo: true,        // Can't contain username/email
};

function validatePassword(password: string, userInfo: UserInfo): ValidationResult {
  const errors: string[] = [];

  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters`);
  }

  if (password.length > passwordPolicy.maxLength) {
    errors.push(`Password cannot exceed ${passwordPolicy.maxLength} characters`);
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordPolicy.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (passwordPolicy.preventCommon && isCommonPassword(password)) {
    errors.push('Password is too common');
  }

  if (passwordPolicy.preventUserInfo) {
    const lower = password.toLowerCase();
    if (lower.includes(userInfo.username.toLowerCase()) ||
        lower.includes(userInfo.email.split('@')[0].toLowerCase())) {
      errors.push('Password cannot contain your username or email');
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Login Flow                                    │
└─────────────────────────────────────────────────────────────────────┘

User                    Frontend                Backend               Database
  │                        │                        │                     │
  │─── Enter credentials ──▶│                        │                     │
  │                        │                        │                     │
  │                        │─── POST /auth/login ───▶│                     │
  │                        │    {email, password}    │                     │
  │                        │                        │                     │
  │                        │                        │── Find user by ────▶│
  │                        │                        │   email              │
  │                        │                        │◀─── User record ────│
  │                        │                        │                     │
  │                        │                        │── Verify password   │
  │                        │                        │   (Argon2)          │
  │                        │                        │                     │
  │                        │                        │   [If 2FA enabled]  │
  │                        │◀── 200 {requires2fa} ──│                     │
  │                        │                        │                     │
  │◀── Show 2FA prompt ────│                        │                     │
  │                        │                        │                     │
  │─── Enter TOTP code ────▶│                        │                     │
  │                        │                        │                     │
  │                        │─ POST /auth/2fa/verify ▶│                     │
  │                        │   {token, totpCode}     │                     │
  │                        │                        │                     │
  │                        │                        │── Verify TOTP       │
  │                        │                        │                     │
  │                        │                        │── Create session ──▶│
  │                        │                        │                     │
  │                        │◀── 200 + Set-Cookie ───│                     │
  │                        │    idkarr_session      │                     │
  │                        │                        │                     │
  │◀── Redirect to app ────│                        │                     │
  │                        │                        │                     │
```

### Brute Force Protection

```typescript
// Rate limiting for authentication endpoints

const authRateLimits = {
  login: {
    windowMs: 15 * 60 * 1000,   // 15 minutes
    maxAttempts: 5,             // 5 attempts per window
    blockDuration: 15 * 60 * 1000, // Block for 15 minutes
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,   // 1 hour
    maxAttempts: 3,             // 3 requests per window
    blockDuration: 60 * 60 * 1000, // Block for 1 hour
  },
  apiKey: {
    windowMs: 5 * 60 * 1000,    // 5 minutes
    maxAttempts: 10,            // 10 invalid keys
    blockDuration: 30 * 60 * 1000, // Block for 30 minutes
  },
};

// Account lockout
const lockoutPolicy = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000,  // 15 minutes
  resetOnSuccess: true,              // Reset counter on successful login
};

async function handleFailedLogin(userId: string, ipAddress: string): Promise<void> {
  await db.user.incrementFailedAttempts(userId);
  const user = await db.user.findById(userId);

  if (user.failedLoginAttempts >= lockoutPolicy.maxFailedAttempts) {
    await db.user.lockAccount(userId, lockoutPolicy.lockoutDuration);

    // Notify user of lockout
    await notifications.send(userId, {
      type: 'account_locked',
      ipAddress,
    });

    // Log security event
    await auditLog.create({
      action: 'account:locked',
      userId,
      details: { ipAddress, attempts: user.failedLoginAttempts },
    });
  }
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

```typescript
// Role definitions

const roles = {
  admin: {
    name: 'Administrator',
    priority: 100,
    permissions: ['*'],          // All permissions
  },
  moderator: {
    name: 'Moderator',
    priority: 75,
    permissions: [
      'series:*',
      'movies:*',
      'queue:*',
      'history:read',
      'requests:*',
      'users:read',
    ],
  },
  user: {
    name: 'User',
    priority: 50,
    permissions: [
      'series:read',
      'series:create',
      'movies:read',
      'movies:create',
      'queue:read',
      'history:read',
      'requests:create',
      'requests:read:own',
    ],
  },
  viewer: {
    name: 'Viewer',
    priority: 25,
    permissions: [
      'series:read',
      'movies:read',
      'queue:read',
      'history:read',
      'calendar:read',
    ],
  },
  apiUser: {
    name: 'API User',
    priority: 10,
    permissions: [],             // Permissions defined per API key
  },
};
```

### Permission System

```typescript
// Permission format: resource:action or resource:action:scope

type Permission =
  | `${Resource}:${Action}`           // e.g., series:read
  | `${Resource}:${Action}:${Scope}`  // e.g., requests:read:own
  | `${Resource}:*`                   // e.g., series:* (all actions)
  | '*';                              // All permissions

type Resource =
  | 'system'
  | 'settings'
  | 'users'
  | 'roles'
  | 'audit'
  | 'instances'
  | 'series'
  | 'movies'
  | 'episodes'
  | 'queue'
  | 'history'
  | 'releases'
  | 'calendar'
  | 'requests'
  | 'indexers'
  | 'download-clients'
  | 'notifications'
  | 'import-lists'
  | 'quality-profiles'
  | 'custom-formats'
  | 'tags'
  | 'root-folders';

type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage'
  | 'admin'
  | 'search'
  | 'download'
  | 'approve';

type Scope =
  | 'own'        // Only own resources
  | 'instance';  // Only within assigned instance
```

### Authorization Middleware

```typescript
// Hono middleware for authorization

function requirePermission(...permissions: Permission[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'UNAUTHORIZED' }, 401);
    }

    const hasPermission = await checkPermissions(user, permissions);

    if (!hasPermission) {
      await auditLog.create({
        action: 'authorization:denied',
        userId: user.id,
        details: {
          requiredPermissions: permissions,
          path: c.req.path,
          method: c.req.method,
        },
      });

      return c.json({ error: 'FORBIDDEN' }, 403);
    }

    await next();
  };
}

async function checkPermissions(
  user: User,
  required: Permission[]
): Promise<boolean> {
  // Get all user permissions (from roles + direct grants)
  const userPermissions = await getUserPermissions(user.id);

  // Check if user has any of the required permissions
  return required.some((perm) => {
    // Check for wildcard
    if (userPermissions.includes('*')) return true;

    // Check exact match
    if (userPermissions.includes(perm)) return true;

    // Check resource wildcard (e.g., series:* includes series:read)
    const [resource, action] = perm.split(':');
    if (userPermissions.includes(`${resource}:*`)) return true;

    return false;
  });
}

// Usage in routes
app.get(
  '/api/v3/series',
  authMiddleware,
  requirePermission('series:read'),
  seriesController.list
);

app.delete(
  '/api/v3/series/:id',
  authMiddleware,
  requirePermission('series:delete'),
  seriesController.delete
);
```

### Resource-Level Authorization

```typescript
// Instance-level access control

async function canAccessInstance(
  userId: string,
  instanceId: number
): Promise<boolean> {
  // Check if user has grant for this instance
  const grant = await db.userInstanceGrant.find({
    userId,
    instanceId,
  });

  if (grant) return true;

  // Check if user is admin (can access all instances)
  const isAdmin = await hasRole(userId, 'admin');
  return isAdmin;
}

// Series-level access control

async function canAccessSeries(
  userId: string,
  seriesId: number
): Promise<boolean> {
  const series = await db.series.findById(seriesId);
  if (!series) return false;

  // Check instance access first
  if (!(await canAccessInstance(userId, series.instanceId))) {
    return false;
  }

  // Check series-specific grant
  const grant = await db.userSeriesGrant.find({
    userId,
    seriesId,
  });

  // If no specific grant, allow based on instance access
  return grant ? grant.canRead : true;
}
```

---

## API Security

### Request Authentication

```typescript
// API authentication middleware

const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Try session auth first (for web UI)
  const sessionId = getCookie(c, 'idkarr_session');
  if (sessionId) {
    const session = await lucia.validateSession(sessionId);
    if (session) {
      c.set('user', session.user);
      c.set('authMethod', 'session');
      return next();
    }
  }

  // Try API key auth
  const apiKey = c.req.header('X-Api-Key');
  if (apiKey) {
    const validation = await validateApiKey(apiKey);
    if (validation.valid) {
      c.set('user', validation.user);
      c.set('apiKey', validation.apiKey);
      c.set('authMethod', 'apiKey');
      return next();
    }
  }

  // Try Bearer token (for OAuth/external integrations)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const validation = await validateBearerToken(token);
    if (validation.valid) {
      c.set('user', validation.user);
      c.set('authMethod', 'bearer');
      return next();
    }
  }

  return c.json({ error: 'AUTHENTICATION_REQUIRED' }, 401);
};
```

### CORS Configuration

```typescript
// CORS configuration

const corsConfig = {
  // Allowed origins
  origin: (origin: string | undefined, c: Context) => {
    const allowedOrigins = env.CORS_ORIGINS?.split(',') || [];

    // Allow same-origin requests
    if (!origin) return '*';

    // Check against whitelist
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // Development mode: allow localhost
    if (env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:')) {
        return origin;
      }
    }

    return null;  // Deny
  },

  // Allowed methods
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed headers
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Api-Key',
    'X-Request-Id',
  ],

  // Exposed headers
  exposeHeaders: [
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  // Max age for preflight cache
  maxAge: 86400,  // 24 hours

  // Allow credentials (cookies, auth headers)
  credentials: true,
};
```

### Request ID Tracking

```typescript
// Request ID middleware for tracing

const requestIdMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();
};

function generateRequestId(): string {
  return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
}
```

---

## Data Protection

### Encryption at Rest

```typescript
// Sensitive field encryption using AES-256-GCM

const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,                // 256 bits
  ivLength: 16,                 // 128 bits
  tagLength: 16,                // 128 bits
};

class FieldEncryption {
  private key: Buffer;

  constructor(encryptionKey: string) {
    this.key = scrypt.sync(encryptionKey, 'salt', encryptionConfig.keyLength);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(encryptionConfig.ivLength);
    const cipher = crypto.createCipheriv(
      encryptionConfig.algorithm,
      this.key,
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:ciphertext
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, encrypted] = ciphertext.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      encryptionConfig.algorithm,
      this.key,
      iv
    );
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Fields that should be encrypted
const encryptedFields = [
  'user.twoFactorSecret',
  'user.plexToken',
  'apiKey.keyHash',
  'indexer.settings.apiKey',
  'downloadClient.settings.password',
  'notification.settings.apiKey',
  'notification.settings.webhookUrl',
];
```

### Data Masking

```typescript
// Mask sensitive data in logs and responses

function maskSensitiveData<T extends Record<string, unknown>>(
  data: T,
  fieldsToMask: string[]
): T {
  const masked = { ...data };

  for (const field of fieldsToMask) {
    if (masked[field]) {
      masked[field] = maskValue(masked[field] as string);
    }
  }

  return masked;
}

function maskValue(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return value.slice(0, 2) + '****' + value.slice(-2);
}

// Usage in API responses
const sensitiveResponseFields = ['apiKey', 'password', 'token', 'secret'];
```

### Backup Encryption

```typescript
// Encrypted backups using AES-256

const backupEncryption = {
  algorithm: 'aes-256-cbc',
  keyDerivation: 'pbkdf2',
  iterations: 100000,
  keyLength: 32,
  saltLength: 16,
};

async function createEncryptedBackup(
  data: Buffer,
  passphrase: string
): Promise<Buffer> {
  const salt = randomBytes(backupEncryption.saltLength);
  const key = await pbkdf2(
    passphrase,
    salt,
    backupEncryption.iterations,
    backupEncryption.keyLength,
    'sha256'
  );

  const iv = randomBytes(16);
  const cipher = crypto.createCipheriv(backupEncryption.algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final(),
  ]);

  // Format: salt (16) + iv (16) + encrypted data
  return Buffer.concat([salt, iv, encrypted]);
}
```

---

## Input Validation

### Zod Schemas

```typescript
// Input validation using Zod

import { z } from 'zod';

// Common validators
const validators = {
  id: z.number().int().positive(),
  uuid: z.string().uuid(),
  email: z.string().email().max(255),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  url: z.string().url().max(2048),
  path: z.string().max(4096).regex(/^[^<>:"|?*]+$/),  // No invalid path chars
};

// Series input validation
const createSeriesSchema = z.object({
  tvdbId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  qualityProfileId: validators.id,
  rootFolderPath: validators.path,
  monitored: z.boolean().default(true),
  seasonFolder: z.boolean().default(true),
  tags: z.array(validators.id).default([]),
  addOptions: z.object({
    searchForMissingEpisodes: z.boolean().default(false),
    monitor: z.enum(['all', 'future', 'missing', 'existing', 'pilot', 'none']),
  }).optional(),
});

// Request validation middleware
function validateBody<T extends z.ZodType>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return c.json({
        error: 'VALIDATION_ERROR',
        details: result.error.flatten(),
      }, 400);
    }

    c.set('validatedBody', result.data);
    await next();
  };
}
```

### SQL Injection Prevention

```typescript
// Always use parameterized queries with Drizzle

// GOOD: Parameterized query
const series = await db
  .select()
  .from(seriesTable)
  .where(eq(seriesTable.id, seriesId));

// BAD: String interpolation (NEVER DO THIS)
// const series = await db.execute(
//   sql`SELECT * FROM series WHERE id = ${seriesId}`  // Vulnerable!
// );

// For dynamic queries, use Drizzle's query builder
function searchSeries(filters: SeriesFilters) {
  let query = db.select().from(seriesTable);

  if (filters.title) {
    query = query.where(ilike(seriesTable.title, `%${filters.title}%`));
  }

  if (filters.status) {
    query = query.where(eq(seriesTable.status, filters.status));
  }

  return query;
}
```

### XSS Prevention

```typescript
// Sanitize user input for display

import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
  });
}

// Escape for plain text contexts
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// React automatically escapes by default
// Never use dangerouslySetInnerHTML with unsanitized content
```

### Path Traversal Prevention

```typescript
// Validate file paths to prevent traversal attacks

import path from 'path';

function validatePath(userPath: string, allowedBase: string): string | null {
  // Normalize and resolve the path
  const normalized = path.normalize(userPath);
  const resolved = path.resolve(allowedBase, normalized);

  // Ensure the resolved path is within the allowed base
  if (!resolved.startsWith(path.resolve(allowedBase))) {
    return null;  // Path traversal attempt
  }

  // Check for null bytes
  if (userPath.includes('\0')) {
    return null;
  }

  return resolved;
}

// Usage
const safePath = validatePath(userInput, '/media/tv');
if (!safePath) {
  throw new SecurityError('Invalid path');
}
```

---

## Rate Limiting

### Rate Limit Configuration

```typescript
// Rate limiting per endpoint category

const rateLimits = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 10,                    // 10 requests per window
    message: 'Too many authentication attempts',
  },

  // API read endpoints
  apiRead: {
    windowMs: 60 * 1000,        // 1 minute
    max: 100,                   // 100 requests per minute
    message: 'API rate limit exceeded',
  },

  // API write endpoints
  apiWrite: {
    windowMs: 60 * 1000,        // 1 minute
    max: 30,                    // 30 requests per minute
    message: 'API rate limit exceeded',
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000,        // 1 minute
    max: 20,                    // 20 searches per minute
    message: 'Search rate limit exceeded',
  },

  // Download/grab endpoints
  download: {
    windowMs: 60 * 1000,        // 1 minute
    max: 10,                    // 10 downloads per minute
    message: 'Download rate limit exceeded',
  },
};
```

### Rate Limiter Implementation

```typescript
// Redis-based rate limiter

import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit',
  points: 100,                  // Number of requests
  duration: 60,                 // Per 60 seconds
  blockDuration: 60 * 10,       // Block for 10 minutes if exceeded
});

const rateLimitMiddleware: MiddlewareHandler = async (c, next) => {
  const key = c.get('user')?.id || c.req.header('CF-Connecting-IP') || 'anonymous';

  try {
    const result = await rateLimiter.consume(key);

    c.header('X-RateLimit-Limit', String(rateLimiter.points));
    c.header('X-RateLimit-Remaining', String(result.remainingPoints));
    c.header('X-RateLimit-Reset', String(Math.ceil(result.msBeforeNext / 1000)));

    await next();
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      c.header('X-RateLimit-Limit', String(rateLimiter.points));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(Math.ceil(error.msBeforeNext / 1000)));
      c.header('Retry-After', String(Math.ceil(error.msBeforeNext / 1000)));

      return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429);
    }
    throw error;
  }
};
```

---

## Security Headers

### HTTP Security Headers

```typescript
// Security headers middleware

const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  // Prevent clickjacking
  c.header('X-Frame-Options', 'DENY');

  // XSS protection
  c.header('X-XSS-Protection', '1; mode=block');

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // Required for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  // HSTS (only in production with HTTPS)
  if (env.NODE_ENV === 'production') {
    c.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  await next();
};
```

---

## Secrets Management

### Environment Variables

```typescript
// Required secrets (must be set)

const requiredSecrets = [
  'DATABASE_URL',
  'REDIS_URL',
  'ENCRYPTION_KEY',         // For field encryption
  'SESSION_SECRET',         // For session signing
];

// Optional secrets
const optionalSecrets = [
  'TVDB_API_KEY',
  'TMDB_API_KEY',
  'SENTRY_DSN',
  'RESEND_API_KEY',
];

// Validate secrets on startup
function validateSecrets(): void {
  const missing = requiredSecrets.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }

  // Validate secret strength
  if (process.env.ENCRYPTION_KEY!.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
}
```

### Secret Rotation

```typescript
// Support for key rotation

interface SecretVersion {
  version: number;
  key: string;
  createdAt: Date;
  expiresAt?: Date;
}

class SecretManager {
  private currentVersion: number;
  private secrets: Map<number, SecretVersion>;

  async encrypt(data: string): Promise<string> {
    const secret = this.getCurrentSecret();
    const encrypted = await encryptWithKey(data, secret.key);
    return `v${secret.version}:${encrypted}`;
  }

  async decrypt(data: string): Promise<string> {
    const [versionStr, encrypted] = data.split(':');
    const version = parseInt(versionStr.slice(1));
    const secret = this.secrets.get(version);

    if (!secret) {
      throw new Error(`Unknown secret version: ${version}`);
    }

    return decryptWithKey(encrypted, secret.key);
  }

  async rotateKey(newKey: string): Promise<void> {
    const newVersion = this.currentVersion + 1;
    this.secrets.set(newVersion, {
      version: newVersion,
      key: newKey,
      createdAt: new Date(),
    });
    this.currentVersion = newVersion;

    // Schedule old version expiration
    const oldSecret = this.secrets.get(newVersion - 1);
    if (oldSecret) {
      oldSecret.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}
```

---

## Audit Logging

### Audit Events

```typescript
// Events that should be audited

const auditableEvents = {
  // Authentication
  'auth:login': 'User logged in',
  'auth:logout': 'User logged out',
  'auth:login_failed': 'Login attempt failed',
  'auth:password_changed': 'Password changed',
  'auth:2fa_enabled': 'Two-factor authentication enabled',
  'auth:2fa_disabled': 'Two-factor authentication disabled',

  // Users
  'user:created': 'User created',
  'user:updated': 'User updated',
  'user:deleted': 'User deleted',
  'user:role_changed': 'User role changed',

  // API Keys
  'apikey:created': 'API key created',
  'apikey:revoked': 'API key revoked',

  // Series/Movies
  'series:created': 'Series added',
  'series:updated': 'Series updated',
  'series:deleted': 'Series deleted',
  'movie:created': 'Movie added',
  'movie:updated': 'Movie updated',
  'movie:deleted': 'Movie deleted',

  // Downloads
  'release:grabbed': 'Release grabbed',
  'release:imported': 'Release imported',
  'release:failed': 'Release failed',

  // Settings
  'settings:updated': 'Settings updated',
  'indexer:created': 'Indexer added',
  'indexer:updated': 'Indexer updated',
  'indexer:deleted': 'Indexer deleted',

  // Authorization
  'authorization:denied': 'Authorization denied',
};
```

### Audit Log Implementation

```typescript
// Audit logging service

interface AuditEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  username?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

class AuditLogger {
  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditEntry = {
      id: generateId(),
      timestamp: new Date(),
      ...entry,
    };

    // Store in database
    await db.auditLog.create(auditEntry);

    // Also log to application logger for immediate visibility
    logger.info('Audit event', {
      audit: true,
      ...auditEntry,
    });

    // Send to external SIEM if configured
    if (env.SIEM_WEBHOOK_URL) {
      await this.sendToSiem(auditEntry);
    }
  }

  async query(filters: AuditQueryFilters): Promise<AuditEntry[]> {
    return db.auditLog.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
      limit: filters.limit || 100,
    });
  }
}

// Usage in services
async function deleteSeriesWithAudit(
  seriesId: number,
  userId: string,
  context: RequestContext
): Promise<void> {
  const series = await db.series.findById(seriesId);

  await db.series.delete(seriesId);

  await auditLogger.log({
    action: 'series:deleted',
    userId,
    resource: 'series',
    resourceId: String(seriesId),
    details: {
      title: series.title,
      tvdbId: series.tvdbId,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });
}
```

---

## Threat Model

### Attack Surface

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Threat Model                                  │
└─────────────────────────────────────────────────────────────────────┘

External Threats:
┌────────────────────┐
│  Internet          │
│  - Credential      │──▶ Mitigation: Rate limiting, 2FA, strong passwords
│    stuffing        │
│  - DDoS            │──▶ Mitigation: CDN, rate limiting, auto-scaling
│  - SQL injection   │──▶ Mitigation: Parameterized queries, input validation
│  - XSS             │──▶ Mitigation: CSP, output encoding, sanitization
│  - CSRF            │──▶ Mitigation: SameSite cookies, CSRF tokens
└────────────────────┘

Internal Threats:
┌────────────────────┐
│  Authenticated     │
│  - Privilege       │──▶ Mitigation: RBAC, least privilege
│    escalation      │
│  - Data theft      │──▶ Mitigation: Audit logging, access controls
│  - Insider abuse   │──▶ Mitigation: Audit trails, separation of duties
└────────────────────┘

Infrastructure Threats:
┌────────────────────┐
│  Server/Network    │
│  - Server breach   │──▶ Mitigation: Encryption at rest, minimal data
│  - Man-in-middle   │──▶ Mitigation: TLS everywhere, certificate pinning
│  - Data exfil      │──▶ Mitigation: Network segmentation, monitoring
└────────────────────┘
```

### Data Classification

| Classification | Examples | Protection Level |
|---------------|----------|------------------|
| **Critical** | Passwords, API keys, tokens | Encrypted + access logged |
| **Sensitive** | Email, user preferences | Encrypted + access controlled |
| **Internal** | Series data, queue info | Access controlled |
| **Public** | Series metadata | No restrictions |

---

## OWASP Considerations

### Top 10 Mitigations

| OWASP Risk | Mitigation |
|------------|------------|
| **A01:2021 Broken Access Control** | RBAC, resource-level authorization, deny by default |
| **A02:2021 Cryptographic Failures** | TLS, Argon2 passwords, AES-256 encryption |
| **A03:2021 Injection** | Parameterized queries, input validation, Zod schemas |
| **A04:2021 Insecure Design** | Threat modeling, security reviews, secure defaults |
| **A05:2021 Security Misconfiguration** | Security headers, minimal permissions, secure defaults |
| **A06:2021 Vulnerable Components** | Dependency scanning, regular updates, Snyk/Dependabot |
| **A07:2021 Auth Failures** | 2FA, rate limiting, session management |
| **A08:2021 Integrity Failures** | Code signing, integrity checks, update verification |
| **A09:2021 Logging Failures** | Comprehensive audit logging, log protection |
| **A10:2021 SSRF** | URL validation, allowlists, network segmentation |

### Security Checklist

```markdown
## Pre-Release Security Checklist

### Authentication
- [ ] Strong password policy enforced
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout implemented
- [ ] 2FA available and working
- [ ] Session timeout configured
- [ ] Secure cookie attributes set

### Authorization
- [ ] RBAC implemented
- [ ] Least privilege principle applied
- [ ] Resource-level access checks
- [ ] Authorization logged

### Input/Output
- [ ] All inputs validated (Zod)
- [ ] Parameterized queries only
- [ ] Output encoding applied
- [ ] File upload restrictions

### Cryptography
- [ ] TLS 1.2+ required
- [ ] Strong password hashing (Argon2)
- [ ] Sensitive data encrypted
- [ ] Secure random generation

### Headers
- [ ] CSP configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set

### Logging
- [ ] Security events logged
- [ ] No sensitive data in logs
- [ ] Log integrity protected
- [ ] Retention policy defined

### Dependencies
- [ ] Dependencies scanned
- [ ] No known vulnerabilities
- [ ] Lock files committed
```

---

*Security is an ongoing process. This specification should be reviewed and updated regularly as threats evolve.*
