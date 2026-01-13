// ============================================================================
// Database Client
// ============================================================================

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Environment variables for database connection
const connectionString = process.env.DATABASE_URL || 'postgres://idkarr:idkarr@localhost:5432/idkarr';

// Create postgres client
// For query operations (standard mode)
const queryClient = postgres(connectionString);

// For migrations (requires max: 1)
export const migrationClient = postgres(connectionString, { max: 1 });

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema });

// Export types for use in repositories
export type Database = typeof db;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await queryClient.end();
}
