# WebSocket Events Specification

## Overview

This document specifies the real-time WebSocket communication system for idkarr. WebSockets enable instant updates to the UI without polling, providing a responsive user experience for queue updates, download progress, and system notifications.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Connection Management](#connection-management)
3. [Authentication](#authentication)
4. [Message Format](#message-format)
5. [Event Categories](#event-categories)
6. [Server Events](#server-events)
7. [Client Events](#client-events)
8. [Subscription System](#subscription-system)
9. [Error Handling](#error-handling)
10. [Implementation Examples](#implementation-examples)

---

## Architecture

### WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Clients                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Browser 1  │  │  Browser 2  │  │  Mobile App │                 │
│  │  (User A)   │  │  (User A)   │  │  (User B)   │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼────────────────┼────────────────┼─────────────────────────┘
          │                │                │
          │    WebSocket Connections        │
          │                │                │
┌─────────▼────────────────▼────────────────▼─────────────────────────┐
│                     WebSocket Server                                 │
│                     (Hono + ws)                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Connection Manager                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │ Connection 1 │  │ Connection 2 │  │ Connection 3 │      │   │
│  │  │ userId: A    │  │ userId: A    │  │ userId: B    │      │   │
│  │  │ subs: [*]    │  │ subs: [q,s1] │  │ subs: [q]    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │                    Event Router                              │   │
│  │  Routes events to subscribed connections                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼──────────┐ ┌───────▼────────┐ ┌────────▼───────┐
│   Application      │ │    Redis       │ │   BullMQ       │
│   Events           │ │    Pub/Sub     │ │   Workers      │
│   (Internal)       │ │   (Scaling)    │ │   (Jobs)       │
└────────────────────┘ └────────────────┘ └────────────────┘
```

### Scaling with Redis Pub/Sub

For multi-instance deployments, Redis Pub/Sub is used to broadcast events across all WebSocket server instances:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  WS Server 1 │    │  WS Server 2 │    │  WS Server 3 │
│  (10 clients)│    │  (15 clients)│    │  (12 clients)│
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                   ┌───────▼───────┐
                   │  Redis        │
                   │  Pub/Sub      │
                   │               │
                   │  Channel:     │
                   │  idkarr:ws    │
                   └───────────────┘
```

---

## Connection Management

### Connection Lifecycle

```typescript
// Connection state machine

type ConnectionState =
  | 'connecting'     // Initial connection
  | 'authenticating' // Awaiting auth
  | 'connected'      // Fully connected
  | 'disconnecting'  // Graceful close
  | 'disconnected';  // Connection closed

interface WebSocketConnection {
  id: string;                    // Unique connection ID
  userId: string | null;         // Authenticated user ID
  state: ConnectionState;
  subscriptions: Set<string>;    // Subscribed channels
  lastPing: Date;
  lastActivity: Date;
  metadata: {
    ipAddress: string;
    userAgent: string;
    instanceId?: number;         // Current instance context
  };
}
```

### Connection Endpoints

```typescript
// WebSocket endpoint: ws://host/api/v3/ws

// Query parameters for connection
interface ConnectionParams {
  // API key for authentication (alternative to session)
  apiKey?: string;

  // Instance ID for instance-scoped events
  instanceId?: number;
}

// Example connection URLs:
// ws://localhost:3000/api/v3/ws
// ws://localhost:3000/api/v3/ws?instanceId=1
// ws://localhost:3000/api/v3/ws?apiKey=idk_prod_xxxxx
```

### Heartbeat/Keep-Alive

```typescript
// Heartbeat configuration

const heartbeatConfig = {
  interval: 30000,        // Send ping every 30 seconds
  timeout: 10000,         // Wait 10 seconds for pong
  maxMissed: 3,           // Close after 3 missed pongs
};

// Server sends ping
{
  "type": "ping",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Client responds with pong
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Authentication

### Authentication Flow

```
Client                          Server
   │                               │
   │─── WebSocket Connect ────────▶│
   │                               │
   │◀── { type: "connected",  ────│
   │       connectionId: "...",    │
   │       requiresAuth: true }    │
   │                               │
   │─── { type: "authenticate", ──▶│
   │       token: "session_xxx" }  │
   │       OR                      │
   │       apiKey: "idk_xxx" }     │
   │                               │
   │                               │── Validate credentials
   │                               │
   │◀── { type: "authenticated", ─│
   │       userId: "...",          │
   │       permissions: [...] }    │
   │                               │
   │─── { type: "subscribe", ─────▶│
   │       channels: ["queue"] }   │
   │                               │
   │◀── { type: "subscribed", ────│
   │       channels: ["queue"] }   │
   │                               │
```

### Authentication Messages

```typescript
// Client → Server: Authenticate
interface AuthenticateMessage {
  type: 'authenticate';
  // One of these is required
  sessionId?: string;    // Session cookie value
  apiKey?: string;       // API key
  bearerToken?: string;  // OAuth token
}

// Server → Client: Authentication result
interface AuthenticatedMessage {
  type: 'authenticated';
  userId: string;
  username: string;
  permissions: string[];
  expiresAt?: string;    // Session expiration
}

// Server → Client: Authentication failed
interface AuthenticationFailedMessage {
  type: 'authentication_failed';
  error: string;
  code: 'invalid_credentials' | 'expired' | 'missing';
}
```

---

## Message Format

### Base Message Structure

```typescript
// All WebSocket messages follow this structure

interface WebSocketMessage {
  // Message type (required)
  type: string;

  // Unique message ID for correlation
  id?: string;

  // Timestamp (ISO 8601)
  timestamp?: string;

  // Response to a specific request ID
  replyTo?: string;

  // Event-specific payload
  [key: string]: unknown;
}
```

### Server → Client Messages

```typescript
// Event message (push from server)
interface EventMessage {
  type: 'event';
  name: string;                  // Event name (e.g., "queue:updated")
  data: unknown;                 // Event payload
  timestamp: string;
  channel?: string;              // Source channel
}

// Response message (reply to request)
interface ResponseMessage {
  type: 'response';
  replyTo: string;               // Original request ID
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}
```

### Client → Server Messages

```typescript
// Request message
interface RequestMessage {
  type: 'request';
  id: string;                    // Client-generated ID
  action: string;                // Action to perform
  payload?: unknown;
}

// Subscribe message
interface SubscribeMessage {
  type: 'subscribe';
  channels: string[];
}

// Unsubscribe message
interface UnsubscribeMessage {
  type: 'unsubscribe';
  channels: string[];
}
```

---

## Event Categories

### Channel Structure

```typescript
// Channel naming convention: category:scope

const channels = {
  // Global channels (all users)
  'system': true,                    // System-wide events
  'health': true,                    // Health check events

  // Instance-scoped channels
  'instance:{id}': true,             // All events for instance
  'instance:{id}:queue': true,       // Queue events for instance
  'instance:{id}:series': true,      // Series events for instance
  'instance:{id}:movies': true,      // Movie events for instance

  // Resource-specific channels
  'series:{id}': true,               // Events for specific series
  'movie:{id}': true,                // Events for specific movie
  'queue:{downloadId}': true,        // Events for specific download

  // User-specific channels
  'user:{id}': true,                 // User's personal events
  'user:{id}:notifications': true,   // User notifications
};
```

### Subscription Permissions

```typescript
// Channel permission mapping

const channelPermissions: Record<string, string[]> = {
  'system': ['system:read'],
  'health': [],                      // Public
  'instance:*': ['instances:read'],
  'instance:*:queue': ['queue:read'],
  'instance:*:series': ['series:read'],
  'instance:*:movies': ['movies:read'],
  'series:*': ['series:read'],
  'movie:*': ['movies:read'],
  'queue:*': ['queue:read'],
  'user:*': [],                      // Own user only
};

// Validate subscription
function canSubscribe(userId: string, channel: string): boolean {
  // Users can always subscribe to their own channel
  if (channel.startsWith(`user:${userId}`)) {
    return true;
  }

  // Check required permissions
  const pattern = findMatchingPattern(channel);
  const required = channelPermissions[pattern];

  if (!required || required.length === 0) {
    return true;
  }

  return hasPermissions(userId, required);
}
```

---

## Server Events

### Queue Events

```typescript
// Queue item added
interface QueueAddedEvent {
  type: 'event';
  name: 'queue:added';
  data: {
    id: number;
    downloadId: string;
    title: string;
    seriesId?: number;
    movieId?: number;
    seasonNumber?: number;
    episodeNumbers?: number[];
    quality: QualityInfo;
    size: number;
    status: QueueStatus;
    indexer: string;
    downloadClient: string;
    added: string;
  };
}

// Queue item updated (progress, status change)
interface QueueUpdatedEvent {
  type: 'event';
  name: 'queue:updated';
  data: {
    id: number;
    downloadId: string;
    status: QueueStatus;
    progress?: number;           // 0-100
    sizeleft?: number;
    estimatedCompletionTime?: string;
    statusMessages?: StatusMessage[];
    trackedDownloadState?: TrackedDownloadState;
    trackedDownloadStatus?: TrackedDownloadStatus;
  };
}

// Queue item removed
interface QueueRemovedEvent {
  type: 'event';
  name: 'queue:removed';
  data: {
    id: number;
    downloadId: string;
    reason: 'completed' | 'removed' | 'failed';
  };
}

// Bulk queue update (efficiency for many changes)
interface QueueBulkUpdateEvent {
  type: 'event';
  name: 'queue:bulk_update';
  data: {
    updates: Array<{
      id: number;
      downloadId: string;
      changes: Partial<QueueItem>;
    }>;
  };
}
```

### Series Events

```typescript
// Series added
interface SeriesAddedEvent {
  type: 'event';
  name: 'series:added';
  data: {
    id: number;
    tvdbId: number;
    title: string;
    year: number;
    path: string;
    monitored: boolean;
    instanceId: number;
  };
}

// Series updated
interface SeriesUpdatedEvent {
  type: 'event';
  name: 'series:updated';
  data: {
    id: number;
    changes: {
      [field: string]: {
        old: unknown;
        new: unknown;
      };
    };
  };
}

// Series deleted
interface SeriesDeletedEvent {
  type: 'event';
  name: 'series:deleted';
  data: {
    id: number;
    title: string;
    tvdbId: number;
    deletedFiles: boolean;
  };
}

// Series refresh started
interface SeriesRefreshStartedEvent {
  type: 'event';
  name: 'series:refresh_started';
  data: {
    seriesId: number;
    title: string;
  };
}

// Series refresh completed
interface SeriesRefreshCompletedEvent {
  type: 'event';
  name: 'series:refresh_completed';
  data: {
    seriesId: number;
    title: string;
    episodesAdded: number;
    episodesUpdated: number;
  };
}
```

### Episode Events

```typescript
// Episode file imported
interface EpisodeImportedEvent {
  type: 'event';
  name: 'episode:imported';
  data: {
    seriesId: number;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumbers: number[];
    episodeTitle: string;
    quality: QualityInfo;
    path: string;
    size: number;
    releaseGroup?: string;
    isUpgrade: boolean;
  };
}

// Episode file deleted
interface EpisodeDeletedEvent {
  type: 'event';
  name: 'episode:deleted';
  data: {
    seriesId: number;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumbers: number[];
    reason: 'manual' | 'upgrade' | 'series_deleted';
  };
}

// Episode renamed
interface EpisodeRenamedEvent {
  type: 'event';
  name: 'episode:renamed';
  data: {
    seriesId: number;
    episodeFileId: number;
    sourcePath: string;
    destinationPath: string;
  };
}

// Episode grabbed (download started)
interface EpisodeGrabbedEvent {
  type: 'event';
  name: 'episode:grabbed';
  data: {
    seriesId: number;
    seriesTitle: string;
    seasonNumber: number;
    episodeNumbers: number[];
    episodeTitle: string;
    quality: QualityInfo;
    releaseTitle: string;
    indexer: string;
    downloadClient: string;
    downloadId: string;
  };
}
```

### Movie Events

```typescript
// Movie added
interface MovieAddedEvent {
  type: 'event';
  name: 'movie:added';
  data: {
    id: number;
    tmdbId: number;
    title: string;
    year: number;
    path: string;
    monitored: boolean;
    instanceId: number;
  };
}

// Movie file imported
interface MovieImportedEvent {
  type: 'event';
  name: 'movie:imported';
  data: {
    movieId: number;
    movieTitle: string;
    year: number;
    quality: QualityInfo;
    path: string;
    size: number;
    releaseGroup?: string;
    isUpgrade: boolean;
  };
}

// Movie grabbed
interface MovieGrabbedEvent {
  type: 'event';
  name: 'movie:grabbed';
  data: {
    movieId: number;
    movieTitle: string;
    year: number;
    quality: QualityInfo;
    releaseTitle: string;
    indexer: string;
    downloadClient: string;
    downloadId: string;
  };
}
```

### Download Events

```typescript
// Download started
interface DownloadStartedEvent {
  type: 'event';
  name: 'download:started';
  data: {
    downloadId: string;
    title: string;
    seriesId?: number;
    movieId?: number;
    downloadClient: string;
    size: number;
  };
}

// Download progress
interface DownloadProgressEvent {
  type: 'event';
  name: 'download:progress';
  data: {
    downloadId: string;
    progress: number;            // 0-100
    speed?: number;              // bytes/second
    eta?: string;                // Estimated completion
    sizeleft: number;
  };
}

// Download completed
interface DownloadCompletedEvent {
  type: 'event';
  name: 'download:completed';
  data: {
    downloadId: string;
    title: string;
    outputPath: string;
  };
}

// Download failed
interface DownloadFailedEvent {
  type: 'event';
  name: 'download:failed';
  data: {
    downloadId: string;
    title: string;
    error: string;
    canRetry: boolean;
  };
}
```

### System Events

```typescript
// Application started
interface SystemStartedEvent {
  type: 'event';
  name: 'system:started';
  data: {
    version: string;
    startTime: string;
  };
}

// Application update available
interface SystemUpdateEvent {
  type: 'event';
  name: 'system:update_available';
  data: {
    currentVersion: string;
    newVersion: string;
    releaseNotes: string;
    downloadUrl: string;
  };
}

// Health check status changed
interface HealthStatusEvent {
  type: 'event';
  name: 'health:status_changed';
  data: {
    status: 'ok' | 'warning' | 'error';
    issues: Array<{
      type: string;
      message: string;
      wikiUrl?: string;
    }>;
  };
}

// Backup completed
interface BackupCompletedEvent {
  type: 'event';
  name: 'system:backup_completed';
  data: {
    filename: string;
    size: number;
    path: string;
  };
}
```

### Command/Task Events

```typescript
// Command started
interface CommandStartedEvent {
  type: 'event';
  name: 'command:started';
  data: {
    id: number;
    name: string;
    trigger: 'manual' | 'scheduled' | 'system';
    body?: Record<string, unknown>;
  };
}

// Command progress
interface CommandProgressEvent {
  type: 'event';
  name: 'command:progress';
  data: {
    id: number;
    name: string;
    progress: number;            // 0-100
    message?: string;
  };
}

// Command completed
interface CommandCompletedEvent {
  type: 'event';
  name: 'command:completed';
  data: {
    id: number;
    name: string;
    status: 'completed' | 'failed' | 'aborted';
    duration: number;            // milliseconds
    message?: string;
  };
}
```

### Notification Events

```typescript
// User notification
interface UserNotificationEvent {
  type: 'event';
  name: 'notification';
  data: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    level: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
    actions?: Array<{
      label: string;
      action: string;
      url?: string;
    }>;
    dismissable: boolean;
    persistent: boolean;
  };
}

type NotificationType =
  | 'grab'
  | 'download'
  | 'import'
  | 'rename'
  | 'health'
  | 'update'
  | 'request_approved'
  | 'request_denied'
  | 'request_available'
  | 'manual_interaction';
```

### Request Events (Discovery/Overseerr)

```typescript
// Request created
interface RequestCreatedEvent {
  type: 'event';
  name: 'request:created';
  data: {
    id: number;
    contentType: 'series' | 'movie';
    title: string;
    year?: number;
    requestedBy: {
      id: string;
      username: string;
    };
    status: 'pending';
  };
}

// Request status changed
interface RequestStatusChangedEvent {
  type: 'event';
  name: 'request:status_changed';
  data: {
    id: number;
    previousStatus: RequestStatus;
    newStatus: RequestStatus;
    approvedBy?: {
      id: string;
      username: string;
    };
    denialReason?: string;
  };
}

// Request available (content downloaded)
interface RequestAvailableEvent {
  type: 'event';
  name: 'request:available';
  data: {
    id: number;
    contentType: 'series' | 'movie';
    title: string;
    mediaId: number;
  };
}
```

---

## Client Events

### Subscription Management

```typescript
// Subscribe to channels
{
  "type": "subscribe",
  "channels": [
    "queue",
    "instance:1:series",
    "series:123"
  ]
}

// Response
{
  "type": "subscribed",
  "channels": ["queue", "instance:1:series", "series:123"],
  "errors": []
}

// Unsubscribe from channels
{
  "type": "unsubscribe",
  "channels": ["series:123"]
}

// Response
{
  "type": "unsubscribed",
  "channels": ["series:123"]
}
```

### Client Requests

```typescript
// Request current queue state
{
  "type": "request",
  "id": "req_123",
  "action": "queue:get"
}

// Response
{
  "type": "response",
  "replyTo": "req_123",
  "success": true,
  "data": {
    "items": [...],
    "totalCount": 5
  }
}

// Request to pause queue item
{
  "type": "request",
  "id": "req_124",
  "action": "queue:pause",
  "payload": {
    "downloadId": "abc123"
  }
}

// Request to retry failed download
{
  "type": "request",
  "id": "req_125",
  "action": "queue:retry",
  "payload": {
    "downloadId": "abc123"
  }
}
```

### Acknowledgements

```typescript
// Client acknowledges receipt of event
{
  "type": "ack",
  "messageId": "evt_456"
}
```

---

## Subscription System

### Default Subscriptions

```typescript
// Channels automatically subscribed on connection

const defaultSubscriptions = {
  authenticated: [
    'system',                    // System-wide events
    'health',                    // Health status
    `user:{userId}`,             // User's personal events
    `user:{userId}:notifications`, // User notifications
  ],
  withInstance: [
    `instance:{instanceId}:queue`, // Queue for current instance
  ],
};
```

### Subscription Wildcards

```typescript
// Wildcard support for subscriptions

// Subscribe to all series events
{
  "type": "subscribe",
  "channels": ["series:*"]
}

// Subscribe to all events for instance
{
  "type": "subscribe",
  "channels": ["instance:1:*"]
}
```

### Instance Context

```typescript
// Switch instance context
{
  "type": "set_instance",
  "instanceId": 2
}

// Response
{
  "type": "instance_changed",
  "instanceId": 2,
  "previousInstanceId": 1,
  "subscriptions": {
    "added": ["instance:2:queue", "instance:2:series"],
    "removed": ["instance:1:queue", "instance:1:series"]
  }
}
```

---

## Error Handling

### Error Messages

```typescript
// Error response format
interface ErrorMessage {
  type: 'error';
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  replyTo?: string;              // If in response to request
}

type ErrorCode =
  | 'authentication_required'
  | 'authentication_failed'
  | 'authorization_denied'
  | 'invalid_message'
  | 'invalid_channel'
  | 'subscription_failed'
  | 'request_failed'
  | 'rate_limited'
  | 'internal_error';
```

### Reconnection Strategy

```typescript
// Client-side reconnection

const reconnectionConfig = {
  initialDelay: 1000,            // 1 second
  maxDelay: 30000,               // 30 seconds
  multiplier: 2,                 // Double each time
  jitter: 0.5,                   // Add random jitter
  maxAttempts: 10,
};

class WebSocketClient {
  private reconnectAttempts = 0;

  private getReconnectDelay(): number {
    const delay = Math.min(
      reconnectionConfig.initialDelay *
        Math.pow(reconnectionConfig.multiplier, this.reconnectAttempts),
      reconnectionConfig.maxDelay
    );

    // Add jitter
    const jitter = delay * reconnectionConfig.jitter * Math.random();
    return delay + jitter;
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= reconnectionConfig.maxAttempts) {
      this.emit('reconnect_failed');
      return;
    }

    const delay = this.getReconnectDelay();
    await sleep(delay);

    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    try {
      await this.connect();
      this.reconnectAttempts = 0;
      this.emit('reconnected');
    } catch (error) {
      this.reconnect();
    }
  }
}
```

### Rate Limiting

```typescript
// WebSocket rate limiting

const wsRateLimits = {
  messages: {
    windowMs: 60000,             // 1 minute
    max: 100,                    // 100 messages per minute
  },
  subscriptions: {
    maxChannels: 50,             // Max 50 concurrent subscriptions
  },
  requests: {
    windowMs: 60000,
    max: 30,                     // 30 requests per minute
  },
};

// Rate limit error
{
  "type": "error",
  "code": "rate_limited",
  "message": "Too many messages",
  "details": {
    "retryAfter": 30
  }
}
```

---

## Implementation Examples

### Server Implementation (Hono)

```typescript
// backend/src/websocket/server.ts

import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import { WebSocketConnection, ConnectionManager } from './connection';
import { EventRouter } from './router';
import { authenticate } from './auth';

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();
const connections = new ConnectionManager();
const router = new EventRouter(connections);

// WebSocket upgrade endpoint
app.get(
  '/api/v3/ws',
  upgradeWebSocket((c) => {
    const connectionId = generateConnectionId();

    return {
      onOpen(event, ws) {
        const connection = connections.add({
          id: connectionId,
          ws,
          metadata: {
            ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP'),
            userAgent: c.req.header('User-Agent'),
          },
        });

        ws.send(JSON.stringify({
          type: 'connected',
          connectionId,
          requiresAuth: true,
        }));
      },

      async onMessage(event, ws) {
        const connection = connections.get(connectionId);
        if (!connection) return;

        try {
          const message = JSON.parse(event.data.toString());
          await handleMessage(connection, message);
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'invalid_message',
            message: 'Invalid JSON message',
          }));
        }
      },

      onClose(event, ws) {
        connections.remove(connectionId);
      },

      onError(event, ws) {
        logger.error('WebSocket error', { connectionId, error: event });
        connections.remove(connectionId);
      },
    };
  })
);

async function handleMessage(
  connection: WebSocketConnection,
  message: WebSocketMessage
): Promise<void> {
  switch (message.type) {
    case 'authenticate':
      await handleAuthenticate(connection, message);
      break;

    case 'subscribe':
      await handleSubscribe(connection, message);
      break;

    case 'unsubscribe':
      await handleUnsubscribe(connection, message);
      break;

    case 'request':
      await handleRequest(connection, message);
      break;

    case 'pong':
      connection.lastPing = new Date();
      break;

    case 'ack':
      // Message acknowledged
      break;

    default:
      connection.ws.send(JSON.stringify({
        type: 'error',
        code: 'invalid_message',
        message: `Unknown message type: ${message.type}`,
      }));
  }
}
```

### Event Broadcasting

```typescript
// backend/src/websocket/broadcaster.ts

import { redis } from '@/lib/redis';
import { ConnectionManager } from './connection';

class EventBroadcaster {
  constructor(
    private connections: ConnectionManager,
    private redis: Redis
  ) {
    // Subscribe to Redis pub/sub for multi-instance support
    this.redis.subscribe('idkarr:ws', (message) => {
      const event = JSON.parse(message);
      this.broadcastLocal(event);
    });
  }

  // Broadcast to all relevant connections
  async broadcast(event: WebSocketEvent): Promise<void> {
    // Publish to Redis for other instances
    await this.redis.publish('idkarr:ws', JSON.stringify(event));

    // Broadcast to local connections
    this.broadcastLocal(event);
  }

  private broadcastLocal(event: WebSocketEvent): void {
    const message = JSON.stringify({
      type: 'event',
      name: event.name,
      data: event.data,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    for (const connection of this.connections.getAll()) {
      // Check if connection is subscribed to this event's channel
      if (this.isSubscribed(connection, event.channel)) {
        // Check permissions
        if (this.canReceive(connection, event)) {
          connection.ws.send(message);
        }
      }
    }
  }

  private isSubscribed(
    connection: WebSocketConnection,
    channel: string
  ): boolean {
    // Check exact match
    if (connection.subscriptions.has(channel)) {
      return true;
    }

    // Check wildcard subscriptions
    for (const sub of connection.subscriptions) {
      if (sub.endsWith(':*')) {
        const prefix = sub.slice(0, -2);
        if (channel.startsWith(prefix)) {
          return true;
        }
      }
    }

    return false;
  }
}

// Usage in services
async function onEpisodeImported(episode: Episode, file: EpisodeFile): Promise<void> {
  await broadcaster.broadcast({
    name: 'episode:imported',
    channel: `instance:${episode.series.instanceId}:series`,
    data: {
      seriesId: episode.seriesId,
      seriesTitle: episode.series.title,
      seasonNumber: episode.seasonNumber,
      episodeNumbers: [episode.episodeNumber],
      episodeTitle: episode.title,
      quality: file.quality,
      path: file.path,
      size: file.size,
      isUpgrade: false,
    },
  });
}
```

### Client Implementation (React)

```typescript
// frontend/src/lib/websocket.ts

import { create } from 'zustand';

interface WebSocketState {
  connected: boolean;
  authenticated: boolean;
  subscriptions: string[];
  connect: () => void;
  disconnect: () => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
}

export const useWebSocket = create<WebSocketState>((set, get) => {
  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connect = () => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v3/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      set({ connected: true });

      // Authenticate with session
      ws?.send(JSON.stringify({
        type: 'authenticate',
        sessionId: getSessionId(),
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    ws.onclose = () => {
      set({ connected: false, authenticated: false });
      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'authenticated':
        set({ authenticated: true });
        // Subscribe to default channels
        get().subscribe(['queue', 'health']);
        break;

      case 'event':
        // Dispatch to event handlers
        eventEmitter.emit(message.name, message.data);
        break;

      case 'ping':
        ws?.send(JSON.stringify({ type: 'pong', timestamp: message.timestamp }));
        break;

      case 'error':
        console.error('WebSocket error:', message);
        break;
    }
  };

  const subscribe = (channels: string[]) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'subscribe',
      channels,
    }));

    set((state) => ({
      subscriptions: [...new Set([...state.subscriptions, ...channels])],
    }));
  };

  const unsubscribe = (channels: string[]) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: 'unsubscribe',
      channels,
    }));

    set((state) => ({
      subscriptions: state.subscriptions.filter((c) => !channels.includes(c)),
    }));
  };

  return {
    connected: false,
    authenticated: false,
    subscriptions: [],
    connect,
    disconnect: () => ws?.close(),
    subscribe,
    unsubscribe,
  };
});

// Hook for listening to events
export function useWebSocketEvent<T>(
  eventName: string,
  handler: (data: T) => void
): void {
  useEffect(() => {
    eventEmitter.on(eventName, handler);
    return () => {
      eventEmitter.off(eventName, handler);
    };
  }, [eventName, handler]);
}

// Usage in components
function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useWebSocketEvent<QueueUpdatedEvent['data']>('queue:updated', (data) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.downloadId === data.downloadId
          ? { ...item, ...data }
          : item
      )
    );
  });

  useWebSocketEvent<QueueAddedEvent['data']>('queue:added', (data) => {
    setQueue((prev) => [data, ...prev]);
  });

  useWebSocketEvent<QueueRemovedEvent['data']>('queue:removed', (data) => {
    setQueue((prev) => prev.filter((item) => item.downloadId !== data.downloadId));
  });

  return <QueueList items={queue} />;
}
```

---

## Message Type Reference

### Server → Client

| Event | Channel | Description |
|-------|---------|-------------|
| `queue:added` | `instance:{id}:queue` | New item in queue |
| `queue:updated` | `instance:{id}:queue` | Queue item changed |
| `queue:removed` | `instance:{id}:queue` | Item removed from queue |
| `series:added` | `instance:{id}:series` | New series added |
| `series:updated` | `instance:{id}:series` | Series modified |
| `series:deleted` | `instance:{id}:series` | Series removed |
| `episode:imported` | `instance:{id}:series` | Episode file imported |
| `episode:grabbed` | `instance:{id}:series` | Episode download started |
| `movie:added` | `instance:{id}:movies` | New movie added |
| `movie:imported` | `instance:{id}:movies` | Movie file imported |
| `movie:grabbed` | `instance:{id}:movies` | Movie download started |
| `command:started` | `system` | Background task started |
| `command:progress` | `system` | Task progress update |
| `command:completed` | `system` | Task finished |
| `health:status_changed` | `health` | System health changed |
| `notification` | `user:{id}:notifications` | User notification |
| `request:created` | `user:{id}` | New media request |
| `request:status_changed` | `user:{id}` | Request approved/denied |

### Client → Server

| Message Type | Description |
|--------------|-------------|
| `authenticate` | Send authentication credentials |
| `subscribe` | Subscribe to channels |
| `unsubscribe` | Unsubscribe from channels |
| `request` | Request data or action |
| `pong` | Heartbeat response |
| `ack` | Acknowledge message receipt |
| `set_instance` | Change instance context |

---

*This specification covers the real-time communication layer. Updates should be made as new event types are added.*
