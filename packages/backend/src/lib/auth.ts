// ============================================================================
// Authentication Configuration with Lucia
// ============================================================================

import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '../db/client.js';
import { users, sessions } from '../db/schema/index.js';

// Create the Lucia adapter for Drizzle
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

// Initialize Lucia
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production',
    },
  },
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      email: attributes.email,
      displayName: attributes.displayName,
      role: attributes.role,
    };
  },
});

// Type declarations for Lucia
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  username: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'user' | 'viewer';
}
