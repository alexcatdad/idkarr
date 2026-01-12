# Error Handling Specification

## Overview

This document defines the error handling strategy for idkarr, including error codes, response formats, exception hierarchy, retry strategies, and circuit breaker patterns. Consistent error handling improves debuggability, user experience, and system reliability.

---

## Table of Contents

1. [Error Philosophy](#error-philosophy)
2. [Error Code Catalog](#error-code-catalog)
3. [Error Response Format](#error-response-format)
4. [Exception Hierarchy](#exception-hierarchy)
5. [HTTP Status Code Usage](#http-status-code-usage)
6. [Validation Errors](#validation-errors)
7. [Retry Strategies](#retry-strategies)
8. [Circuit Breaker Pattern](#circuit-breaker-pattern)
9. [Error Logging](#error-logging)
10. [User-Facing Messages](#user-facing-messages)
11. [Error Monitoring](#error-monitoring)

---

## Error Philosophy

### Principles

1. **Fail Fast**: Detect and report errors as early as possible
2. **Fail Informatively**: Provide enough context to diagnose issues
3. **Fail Gracefully**: Degrade functionality rather than crash
4. **Fail Securely**: Don't expose sensitive information in errors
5. **Fail Consistently**: Use the same error format everywhere

### Error Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Client Errors** | User/client mistakes | Invalid input, unauthorized |
| **Business Errors** | Business rule violations | Series already exists |
| **System Errors** | Infrastructure failures | Database unavailable |
| **External Errors** | Third-party failures | TVDB API down |

---

## Error Code Catalog

### Standard Error Codes

```typescript
// Error code format: CATEGORY_SPECIFIC_DETAIL

enum ErrorCode {
  // ============================================
  // Authentication Errors (AUTH_*)
  // ============================================
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_EXPIRED_SESSION = 'AUTH_EXPIRED_SESSION',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_INVALID_API_KEY = 'AUTH_INVALID_API_KEY',
  AUTH_2FA_REQUIRED = 'AUTH_2FA_REQUIRED',
  AUTH_2FA_INVALID = 'AUTH_2FA_INVALID',
  AUTH_ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_DISABLED = 'AUTH_ACCOUNT_DISABLED',

  // ============================================
  // Authorization Errors (AUTHZ_*)
  // ============================================
  AUTHZ_FORBIDDEN = 'AUTHZ_FORBIDDEN',
  AUTHZ_INSUFFICIENT_PERMISSIONS = 'AUTHZ_INSUFFICIENT_PERMISSIONS',
  AUTHZ_RESOURCE_DENIED = 'AUTHZ_RESOURCE_DENIED',
  AUTHZ_INSTANCE_DENIED = 'AUTHZ_INSTANCE_DENIED',

  // ============================================
  // Validation Errors (VALIDATION_*)
  // ============================================
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE = 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_INVALID_ENUM = 'VALIDATION_INVALID_ENUM',
  VALIDATION_PATH_INVALID = 'VALIDATION_PATH_INVALID',
  VALIDATION_PATH_TRAVERSAL = 'VALIDATION_PATH_TRAVERSAL',

  // ============================================
  // Resource Errors (RESOURCE_*)
  // ============================================
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_DELETED = 'RESOURCE_DELETED',

  // ============================================
  // Series Errors (SERIES_*)
  // ============================================
  SERIES_NOT_FOUND = 'SERIES_NOT_FOUND',
  SERIES_ALREADY_EXISTS = 'SERIES_ALREADY_EXISTS',
  SERIES_TVDB_NOT_FOUND = 'SERIES_TVDB_NOT_FOUND',
  SERIES_PATH_IN_USE = 'SERIES_PATH_IN_USE',
  SERIES_ROOT_FOLDER_INVALID = 'SERIES_ROOT_FOLDER_INVALID',

  // ============================================
  // Episode Errors (EPISODE_*)
  // ============================================
  EPISODE_NOT_FOUND = 'EPISODE_NOT_FOUND',
  EPISODE_FILE_NOT_FOUND = 'EPISODE_FILE_NOT_FOUND',
  EPISODE_ALREADY_MONITORED = 'EPISODE_ALREADY_MONITORED',

  // ============================================
  // Movie Errors (MOVIE_*)
  // ============================================
  MOVIE_NOT_FOUND = 'MOVIE_NOT_FOUND',
  MOVIE_ALREADY_EXISTS = 'MOVIE_ALREADY_EXISTS',
  MOVIE_TMDB_NOT_FOUND = 'MOVIE_TMDB_NOT_FOUND',

  // ============================================
  // Download Errors (DOWNLOAD_*)
  // ============================================
  DOWNLOAD_CLIENT_UNAVAILABLE = 'DOWNLOAD_CLIENT_UNAVAILABLE',
  DOWNLOAD_CLIENT_AUTH_FAILED = 'DOWNLOAD_CLIENT_AUTH_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DOWNLOAD_NOT_FOUND = 'DOWNLOAD_NOT_FOUND',
  DOWNLOAD_ALREADY_IN_QUEUE = 'DOWNLOAD_ALREADY_IN_QUEUE',

  // ============================================
  // Indexer Errors (INDEXER_*)
  // ============================================
  INDEXER_UNAVAILABLE = 'INDEXER_UNAVAILABLE',
  INDEXER_AUTH_FAILED = 'INDEXER_AUTH_FAILED',
  INDEXER_RATE_LIMITED = 'INDEXER_RATE_LIMITED',
  INDEXER_SEARCH_FAILED = 'INDEXER_SEARCH_FAILED',
  INDEXER_NO_RESULTS = 'INDEXER_NO_RESULTS',

  // ============================================
  // Import Errors (IMPORT_*)
  // ============================================
  IMPORT_FAILED = 'IMPORT_FAILED',
  IMPORT_REJECTED = 'IMPORT_REJECTED',
  IMPORT_FILE_NOT_FOUND = 'IMPORT_FILE_NOT_FOUND',
  IMPORT_MANUAL_REQUIRED = 'IMPORT_MANUAL_REQUIRED',
  IMPORT_QUALITY_REJECTED = 'IMPORT_QUALITY_REJECTED',
  IMPORT_DUPLICATE = 'IMPORT_DUPLICATE',

  // ============================================
  // File System Errors (FS_*)
  // ============================================
  FS_ACCESS_DENIED = 'FS_ACCESS_DENIED',
  FS_PATH_NOT_FOUND = 'FS_PATH_NOT_FOUND',
  FS_INSUFFICIENT_SPACE = 'FS_INSUFFICIENT_SPACE',
  FS_FILE_IN_USE = 'FS_FILE_IN_USE',
  FS_RENAME_FAILED = 'FS_RENAME_FAILED',

  // ============================================
  // Queue Errors (QUEUE_*)
  // ============================================
  QUEUE_ITEM_NOT_FOUND = 'QUEUE_ITEM_NOT_FOUND',
  QUEUE_REMOVE_FAILED = 'QUEUE_REMOVE_FAILED',
  QUEUE_PAUSE_FAILED = 'QUEUE_PAUSE_FAILED',

  // ============================================
  // Configuration Errors (CONFIG_*)
  // ============================================
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_PROFILE_NOT_FOUND = 'CONFIG_PROFILE_NOT_FOUND',
  CONFIG_ROOT_FOLDER_NOT_FOUND = 'CONFIG_ROOT_FOLDER_NOT_FOUND',
  CONFIG_TAG_NOT_FOUND = 'CONFIG_TAG_NOT_FOUND',

  // ============================================
  // External API Errors (EXTERNAL_*)
  // ============================================
  EXTERNAL_TVDB_UNAVAILABLE = 'EXTERNAL_TVDB_UNAVAILABLE',
  EXTERNAL_TVDB_AUTH_FAILED = 'EXTERNAL_TVDB_AUTH_FAILED',
  EXTERNAL_TMDB_UNAVAILABLE = 'EXTERNAL_TMDB_UNAVAILABLE',
  EXTERNAL_PLEX_UNAVAILABLE = 'EXTERNAL_PLEX_UNAVAILABLE',

  // ============================================
  // Rate Limiting Errors (RATE_*)
  // ============================================
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_API = 'RATE_LIMIT_API',
  RATE_LIMIT_SEARCH = 'RATE_LIMIT_SEARCH',
  RATE_LIMIT_DOWNLOAD = 'RATE_LIMIT_DOWNLOAD',

  // ============================================
  // System Errors (SYSTEM_*)
  // ============================================
  SYSTEM_DATABASE_ERROR = 'SYSTEM_DATABASE_ERROR',
  SYSTEM_CACHE_ERROR = 'SYSTEM_CACHE_ERROR',
  SYSTEM_QUEUE_ERROR = 'SYSTEM_QUEUE_ERROR',
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  SYSTEM_SHUTTING_DOWN = 'SYSTEM_SHUTTING_DOWN',

  // ============================================
  // Request Errors (REQUEST_*)
  // ============================================
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  REQUEST_ALREADY_APPROVED = 'REQUEST_ALREADY_APPROVED',
  REQUEST_ALREADY_DENIED = 'REQUEST_ALREADY_DENIED',
  REQUEST_LIMIT_EXCEEDED = 'REQUEST_LIMIT_EXCEEDED',
}
```

---

## Error Response Format

### Standard Error Response

```typescript
interface ErrorResponse {
  // Error identifier
  error: ErrorCode;

  // Human-readable message
  message: string;

  // HTTP status code
  status: number;

  // Unique request ID for tracing
  requestId: string;

  // Timestamp
  timestamp: string;

  // Additional details (optional)
  details?: ErrorDetails;

  // Documentation link (optional)
  docsUrl?: string;
}

interface ErrorDetails {
  // Field-level validation errors
  fields?: Record<string, string[]>;

  // Resource information
  resource?: string;
  resourceId?: string;

  // Retry information
  retryAfter?: number;       // Seconds
  retryable?: boolean;

  // Context-specific data
  context?: Record<string, unknown>;
}
```

### Example Responses

```json
// Validation Error
{
  "error": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "status": 400,
  "requestId": "req_abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "details": {
    "fields": {
      "tvdbId": ["Required field"],
      "qualityProfileId": ["Must be a positive integer"],
      "path": ["Invalid path format"]
    }
  }
}

// Resource Not Found
{
  "error": "SERIES_NOT_FOUND",
  "message": "Series with ID 123 not found",
  "status": 404,
  "requestId": "req_def456",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "details": {
    "resource": "series",
    "resourceId": "123"
  }
}

// Rate Limit Exceeded
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please slow down",
  "status": 429,
  "requestId": "req_ghi789",
  "timestamp": "2024-01-15T10:32:00.000Z",
  "details": {
    "retryAfter": 30,
    "retryable": true
  }
}

// External Service Error
{
  "error": "EXTERNAL_TVDB_UNAVAILABLE",
  "message": "Unable to connect to TVDB API",
  "status": 503,
  "requestId": "req_jkl012",
  "timestamp": "2024-01-15T10:33:00.000Z",
  "details": {
    "retryable": true,
    "retryAfter": 60
  },
  "docsUrl": "https://docs.idkarr.io/troubleshooting/tvdb"
}
```

---

## Exception Hierarchy

### Exception Classes

```typescript
// Base application error
abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;
  readonly timestamp: Date = new Date();
  details?: ErrorDetails;

  constructor(message: string, details?: ErrorDetails) {
    super(message);
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toResponse(requestId: string): ErrorResponse {
    return {
      error: this.code,
      message: this.message,
      status: this.status,
      requestId,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}

// ============================================
// Client Errors (4xx)
// ============================================

class ValidationError extends AppError {
  readonly code = ErrorCode.VALIDATION_FAILED;
  readonly status = 400;

  constructor(fields: Record<string, string[]>) {
    super('Validation failed');
    this.details = { fields };
  }
}

class AuthenticationError extends AppError {
  readonly code: ErrorCode;
  readonly status = 401;

  constructor(code: ErrorCode = ErrorCode.AUTH_REQUIRED, message?: string) {
    super(message || 'Authentication required');
    this.code = code;
  }
}

class AuthorizationError extends AppError {
  readonly code = ErrorCode.AUTHZ_FORBIDDEN;
  readonly status = 403;

  constructor(message: string = 'Access denied', resource?: string) {
    super(message);
    if (resource) {
      this.details = { resource };
    }
  }
}

class NotFoundError extends AppError {
  readonly code: ErrorCode;
  readonly status = 404;

  constructor(resource: string, id?: string | number) {
    const code = `${resource.toUpperCase()}_NOT_FOUND` as ErrorCode;
    super(`${resource} not found`);
    this.code = code || ErrorCode.RESOURCE_NOT_FOUND;
    this.details = {
      resource,
      resourceId: id?.toString(),
    };
  }
}

class ConflictError extends AppError {
  readonly code: ErrorCode;
  readonly status = 409;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

class RateLimitError extends AppError {
  readonly code = ErrorCode.RATE_LIMIT_EXCEEDED;
  readonly status = 429;

  constructor(retryAfter: number) {
    super('Rate limit exceeded');
    this.details = {
      retryAfter,
      retryable: true,
    };
  }
}

// ============================================
// Server Errors (5xx)
// ============================================

class InternalError extends AppError {
  readonly code = ErrorCode.SYSTEM_INTERNAL_ERROR;
  readonly status = 500;

  constructor(message: string = 'Internal server error') {
    super(message);
  }
}

class DatabaseError extends AppError {
  readonly code = ErrorCode.SYSTEM_DATABASE_ERROR;
  readonly status = 500;

  constructor(message: string = 'Database error') {
    super(message);
  }
}

class ExternalServiceError extends AppError {
  readonly code: ErrorCode;
  readonly status = 503;

  constructor(service: string, originalError?: Error) {
    const code = `EXTERNAL_${service.toUpperCase()}_UNAVAILABLE` as ErrorCode;
    super(`${service} service unavailable`);
    this.code = code || ErrorCode.SYSTEM_INTERNAL_ERROR;
    this.details = {
      retryable: true,
      retryAfter: 60,
    };
  }
}
```

### Error Factory

```typescript
// Error factory for common patterns

class Errors {
  static validation(fields: Record<string, string[]>): ValidationError {
    return new ValidationError(fields);
  }

  static notFound(resource: string, id?: string | number): NotFoundError {
    return new NotFoundError(resource, id);
  }

  static unauthorized(code?: ErrorCode): AuthenticationError {
    return new AuthenticationError(code);
  }

  static forbidden(message?: string): AuthorizationError {
    return new AuthorizationError(message);
  }

  static conflict(code: ErrorCode, message: string): ConflictError {
    return new ConflictError(code, message);
  }

  static rateLimited(retryAfter: number): RateLimitError {
    return new RateLimitError(retryAfter);
  }

  static external(service: string, error?: Error): ExternalServiceError {
    return new ExternalServiceError(service, error);
  }

  static internal(message?: string): InternalError {
    return new InternalError(message);
  }
}

// Usage
throw Errors.notFound('series', 123);
throw Errors.validation({ tvdbId: ['Required'] });
throw Errors.external('TVDB');
```

---

## HTTP Status Code Usage

### Status Code Mapping

| Status | Name | Usage |
|--------|------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST creating resource |
| 202 | Accepted | Request accepted, processing async |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (duplicate, etc.) |
| 422 | Unprocessable | Semantic validation error |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily down |
| 504 | Gateway Timeout | Upstream timeout |

### Status Code Decision Tree

```
Is the request valid?
├─ No: Is it malformed?
│     ├─ Yes: 400 Bad Request
│     └─ No: Is it semantically invalid?
│           ├─ Yes: 422 Unprocessable
│           └─ No: 400 Bad Request
│
└─ Yes: Is the user authenticated?
       ├─ No: 401 Unauthorized
       │
       └─ Yes: Is the user authorized?
              ├─ No: 403 Forbidden
              │
              └─ Yes: Does the resource exist?
                     ├─ No: 404 Not Found
                     │
                     └─ Yes: Is there a conflict?
                            ├─ Yes: 409 Conflict
                            │
                            └─ No: Process request
                                   ├─ Success: 2xx
                                   └─ Failure: 5xx
```

---

## Validation Errors

### Zod Integration

```typescript
// Validation error formatting from Zod

import { z } from 'zod';

function formatZodError(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!fields[path]) {
      fields[path] = [];
    }

    fields[path].push(formatZodIssue(issue));
  }

  return fields;
}

function formatZodIssue(issue: z.ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') {
        return 'Required field';
      }
      return `Expected ${issue.expected}, received ${issue.received}`;

    case 'too_small':
      if (issue.type === 'string') {
        return `Must be at least ${issue.minimum} characters`;
      }
      if (issue.type === 'number') {
        return `Must be at least ${issue.minimum}`;
      }
      if (issue.type === 'array') {
        return `Must have at least ${issue.minimum} items`;
      }
      return issue.message;

    case 'too_big':
      if (issue.type === 'string') {
        return `Must be at most ${issue.maximum} characters`;
      }
      return issue.message;

    case 'invalid_enum_value':
      return `Must be one of: ${issue.options.join(', ')}`;

    case 'invalid_string':
      if (issue.validation === 'email') {
        return 'Invalid email address';
      }
      if (issue.validation === 'url') {
        return 'Invalid URL';
      }
      return issue.message;

    default:
      return issue.message;
  }
}
```

### Validation Middleware

```typescript
// Validation middleware for Hono

function validate<T extends z.ZodType>(schema: T): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.json().catch(() => ({}));
    const result = schema.safeParse(body);

    if (!result.success) {
      const fields = formatZodError(result.error);
      throw Errors.validation(fields);
    }

    c.set('body', result.data);
    await next();
  };
}

// Usage
app.post('/api/v3/series', validate(createSeriesSchema), async (c) => {
  const body = c.get('body');
  // body is now typed and validated
});
```

---

## Retry Strategies

### Retry Configuration

```typescript
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;          // milliseconds
  maxDelay: number;           // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: ErrorCode[];
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ErrorCode.EXTERNAL_TVDB_UNAVAILABLE,
    ErrorCode.EXTERNAL_TMDB_UNAVAILABLE,
    ErrorCode.INDEXER_UNAVAILABLE,
    ErrorCode.DOWNLOAD_CLIENT_UNAVAILABLE,
    ErrorCode.SYSTEM_DATABASE_ERROR,
    ErrorCode.RATE_LIMIT_EXCEEDED,
  ],
};
```

### Retry Function

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const options = { ...defaultRetryConfig, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof AppError) {
        if (!options.retryableErrors.includes(error.code)) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === options.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1),
        options.maxDelay
      );

      // Add jitter
      if (options.jitter) {
        delay = delay * (0.5 + Math.random());
      }

      logger.warn(`Retry attempt ${attempt}/${options.maxAttempts}`, {
        error: lastError.message,
        delay,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

// Usage
const metadata = await withRetry(
  () => tvdbClient.getSeries(tvdbId),
  { maxAttempts: 3 }
);
```

---

## Circuit Breaker Pattern

### Circuit Breaker Implementation

```typescript
enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing recovery
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening
  successThreshold: number;    // Successes to close from half-open
  timeout: number;             // Time before trying again (ms)
  monitorInterval: number;     // Health check interval (ms)
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private nextAttempt?: Date;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttempt()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new ExternalServiceError(
          this.name,
          new Error('Circuit breaker is open')
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private shouldAttempt(): boolean {
    return this.nextAttempt ? new Date() >= this.nextAttempt : true;
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.reset();
      }
    }
    this.failures = 0;
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailure = new Date();
    this.successes = 0;

    if (this.failures >= this.config.failureThreshold) {
      this.trip();
    }

    logger.warn(`Circuit breaker failure: ${this.name}`, {
      failures: this.failures,
      state: this.state,
      error: error.message,
    });
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.timeout);

    logger.error(`Circuit breaker tripped: ${this.name}`, {
      failures: this.failures,
      nextAttempt: this.nextAttempt,
    });
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = undefined;

    logger.info(`Circuit breaker reset: ${this.name}`);
  }

  getState(): { state: CircuitState; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }
}

// Usage
const tvdbBreaker = new CircuitBreaker('TVDB', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  monitorInterval: 30000,
});

const metadata = await tvdbBreaker.execute(() =>
  tvdbClient.getSeries(tvdbId)
);
```

---

## Error Logging

### Logging Strategy

```typescript
// Error logging with context

interface ErrorLogContext {
  requestId: string;
  userId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
}

function logError(error: Error, context: ErrorLogContext): void {
  const isAppError = error instanceof AppError;

  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: isAppError ? (error as AppError).code : undefined,
      status: isAppError ? (error as AppError).status : 500,
      stack: error.stack,
    },
    context,
  };

  // Log level based on error type
  if (isAppError) {
    const appError = error as AppError;
    if (appError.status >= 500) {
      logger.error('Server error', logData);
    } else if (appError.status >= 400) {
      logger.warn('Client error', logData);
    }
  } else {
    // Unexpected error
    logger.error('Unexpected error', logData);
  }
}
```

### Error Middleware

```typescript
// Global error handling middleware

const errorHandler: ErrorHandler = async (err, c) => {
  const requestId = c.get('requestId') || generateRequestId();

  // Log error
  logError(err, {
    requestId,
    userId: c.get('user')?.id,
    path: c.req.path,
    method: c.req.method,
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP'),
  });

  // Report to Sentry
  if (!(err instanceof AppError) || (err as AppError).status >= 500) {
    Sentry.captureException(err, {
      extra: {
        requestId,
        userId: c.get('user')?.id,
        path: c.req.path,
      },
    });
  }

  // Format response
  if (err instanceof AppError) {
    return c.json(err.toResponse(requestId), err.status);
  }

  // Unknown error - don't expose details
  return c.json({
    error: ErrorCode.SYSTEM_INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    status: 500,
    requestId,
    timestamp: new Date().toISOString(),
  }, 500);
};

app.onError(errorHandler);
```

---

## User-Facing Messages

### Message Templates

```typescript
// User-friendly error messages

const userMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.AUTH_REQUIRED]: 'Please log in to continue',
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.AUTH_EXPIRED_SESSION]: 'Your session has expired. Please log in again',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 'Your account has been locked. Please try again later',
  [ErrorCode.AUTH_2FA_REQUIRED]: 'Please enter your two-factor authentication code',
  [ErrorCode.AUTH_2FA_INVALID]: 'Invalid authentication code. Please try again',

  // Authorization
  [ErrorCode.AUTHZ_FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS]: 'You need additional permissions for this action',

  // Validation
  [ErrorCode.VALIDATION_FAILED]: 'Please check your input and try again',
  [ErrorCode.VALIDATION_PATH_INVALID]: 'The specified path is invalid',

  // Resources
  [ErrorCode.SERIES_NOT_FOUND]: 'The series could not be found',
  [ErrorCode.SERIES_ALREADY_EXISTS]: 'This series has already been added',
  [ErrorCode.SERIES_PATH_IN_USE]: 'This folder is already being used by another series',

  // Downloads
  [ErrorCode.DOWNLOAD_CLIENT_UNAVAILABLE]: 'Unable to connect to download client',
  [ErrorCode.DOWNLOAD_FAILED]: 'Download failed. Please try again',
  [ErrorCode.DOWNLOAD_ALREADY_IN_QUEUE]: 'This release is already in the download queue',

  // Indexers
  [ErrorCode.INDEXER_UNAVAILABLE]: 'Search service is temporarily unavailable',
  [ErrorCode.INDEXER_RATE_LIMITED]: 'Too many searches. Please wait a moment',
  [ErrorCode.INDEXER_NO_RESULTS]: 'No releases found matching your criteria',

  // External Services
  [ErrorCode.EXTERNAL_TVDB_UNAVAILABLE]: 'Unable to retrieve series information. Please try again',
  [ErrorCode.EXTERNAL_TMDB_UNAVAILABLE]: 'Unable to retrieve movie information. Please try again',

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down',

  // System
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: 'Something went wrong. Please try again later',
  [ErrorCode.SYSTEM_MAINTENANCE]: 'System is under maintenance. Please check back soon',
};

function getUserMessage(error: AppError): string {
  return userMessages[error.code] || error.message;
}
```

---

## Error Monitoring

### Sentry Integration

```typescript
// Sentry configuration

import * as Sentry from '@sentry/bun';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,

  // Sample rate for performance
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filter events
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Don't send client errors to Sentry
    if (error instanceof AppError && error.status < 500) {
      return null;
    }

    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-api-key'];
      }
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    'VALIDATION_FAILED',
    'AUTH_REQUIRED',
    'RESOURCE_NOT_FOUND',
  ],
});
```

### Health Check Errors

```typescript
// Track error rates for health checks

class ErrorTracker {
  private errors: Map<ErrorCode, number[]> = new Map();
  private readonly windowMs = 5 * 60 * 1000; // 5 minutes

  track(code: ErrorCode): void {
    const now = Date.now();
    const timestamps = this.errors.get(code) || [];

    // Remove old entries
    const filtered = timestamps.filter((t) => now - t < this.windowMs);
    filtered.push(now);

    this.errors.set(code, filtered);
  }

  getRate(code: ErrorCode): number {
    const timestamps = this.errors.get(code) || [];
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < this.windowMs);
    return recent.length;
  }

  getHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    // Check critical error rates
    const dbErrors = this.getRate(ErrorCode.SYSTEM_DATABASE_ERROR);
    const externalErrors =
      this.getRate(ErrorCode.EXTERNAL_TVDB_UNAVAILABLE) +
      this.getRate(ErrorCode.EXTERNAL_TMDB_UNAVAILABLE);

    if (dbErrors > 10) return 'unhealthy';
    if (dbErrors > 5 || externalErrors > 20) return 'degraded';
    return 'healthy';
  }
}
```

---

*This error handling specification ensures consistent, informative, and secure error management across the entire application.*
