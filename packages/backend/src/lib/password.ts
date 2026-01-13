// ============================================================================
// Password Hashing Utilities
// ============================================================================

import { hash, verify } from '@node-rs/argon2';

// Argon2id options (OWASP recommended)
const HASH_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, HASH_OPTIONS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await verify(hashedPassword, password, HASH_OPTIONS);
  } catch {
    return false;
  }
}
