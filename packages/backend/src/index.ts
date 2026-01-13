// ============================================================================
// idkarr Backend - Main Entry Point
// ============================================================================

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { checkDatabaseConnection } from './db/index.js';
import { authRoutes, mediaRoutes, instanceRoutes } from './routes/index.js';

const app = new Hono();

// ----------------------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------------------

app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// ----------------------------------------------------------------------------
// Health & Info Endpoints
// ----------------------------------------------------------------------------

app.get('/health', async (c) => {
  const dbOk = await checkDatabaseConnection();

  return c.json({
    status: dbOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'disconnected',
    },
  }, dbOk ? 200 : 503);
});

app.get('/api/v1', (c) => {
  return c.json({
    name: 'idkarr',
    version: '0.1.0',
    description: 'Unified media management API',
    endpoints: {
      auth: '/api/v1/auth',
      media: '/api/v1/media',
      instances: '/api/v1/instances',
    },
  });
});

// ----------------------------------------------------------------------------
// API Routes
// ----------------------------------------------------------------------------

const api = new Hono();

// Mount route modules
api.route('/auth', authRoutes);
api.route('/media', mediaRoutes);
api.route('/instances', instanceRoutes);

// Mount API under /api/v1
app.route('/api/v1', api);

// ----------------------------------------------------------------------------
// Error Handlers
// ----------------------------------------------------------------------------

app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  }, 404);
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err,
      },
    }, 400);
  }

  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  }, 500);
});

// ----------------------------------------------------------------------------
// Start Server
// ----------------------------------------------------------------------------

const port = parseInt(process.env.PORT || '3000', 10);

console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║   🎬 idkarr - Unified Media Management    ║
║                                           ║
╠═══════════════════════════════════════════╣
║   Server starting on port ${port}            ║
║   API: http://localhost:${port}/api/v1       ║
║   Health: http://localhost:${port}/health    ║
╚═══════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
