// ============================================================================
// Database Seed Script
// ============================================================================

import { db } from './client.js';
import {
  tags,
  qualityDefinitions,
  qualityProfiles,
  scheduledTasks,
  systemConfig,
  roles,
  permissions,
  rolePermissions,
} from './schema/index.js';
import { QUALITY_DEFINITIONS, DEFAULT_QUALITY_PROFILES, PERMISSIONS } from '@idkarr/shared';

// ----------------------------------------------------------------------------
// Seed Functions
// ----------------------------------------------------------------------------

async function seedQualityDefinitions() {
  console.log('Seeding quality definitions...');

  const definitions = Object.values(QUALITY_DEFINITIONS).map((def) => ({
    name: def.name,
    title: def.title,
    source: def.source as 'unknown' | 'television' | 'web' | 'webdl' | 'webrip' | 'dvd' | 'bluray' | 'blurayraw',
    resolution: def.resolution,
    weight: def.weight,
    minSize: def.minSize?.toString() ?? null,
    maxSize: def.maxSize?.toString() ?? null,
    preferredSize: def.preferredSize?.toString() ?? null,
  }));

  await db.insert(qualityDefinitions).values(definitions).onConflictDoNothing();
}

async function seedDefaultQualityProfiles() {
  console.log('Seeding default quality profiles...');

  for (const profile of DEFAULT_QUALITY_PROFILES) {
    // Transform items to match the expected QualityProfileItem structure
    const items = profile.items.map((item) => ({
      id: null,
      name: null,
      quality: item.quality,
      items: [],
      allowed: item.allowed,
    }));

    await db.insert(qualityProfiles).values({
      name: profile.name,
      cutoff: profile.cutoff,
      items,
      upgradeAllowed: profile.upgradeAllowed,
    }).onConflictDoNothing();
  }
}

async function seedDefaultTags() {
  console.log('Seeding default tags...');

  const defaultTags = [
    { label: '4K', description: 'Ultra HD content', color: '#8B5CF6' },
    { label: 'Anime', description: 'Japanese animation', color: '#F472B6' },
    { label: 'Documentary', description: 'Documentary content', color: '#10B981' },
    { label: 'Kids', description: 'Family-friendly content', color: '#FBBF24' },
    { label: 'Foreign', description: 'Non-English content', color: '#3B82F6' },
  ];

  await db.insert(tags).values(defaultTags).onConflictDoNothing();
}

async function seedScheduledTasks() {
  console.log('Seeding scheduled tasks...');

  const tasks = [
    { name: 'RssSync', taskName: 'RSS Sync', interval: 15, enabled: true },
    { name: 'RefreshMonitoredDownloads', taskName: 'Refresh Monitored Downloads', interval: 1, enabled: true },
    { name: 'ImportListSync', taskName: 'Import List Sync', interval: 1440, enabled: true },
    { name: 'Housekeeping', taskName: 'Housekeeping', interval: 1440, enabled: true },
    { name: 'CleanupOrphaned', taskName: 'Cleanup Orphaned Files', interval: 1440, enabled: true },
    { name: 'RefreshMedia', taskName: 'Refresh All Media', interval: 720, enabled: true },
    { name: 'UpdateSceneMapping', taskName: 'Update Scene Mappings', interval: 180, enabled: true },
    { name: 'CheckHealth', taskName: 'Health Check', interval: 360, enabled: true },
    { name: 'Backup', taskName: 'Automatic Backup', interval: 10080, enabled: true }, // Weekly
  ];

  await db.insert(scheduledTasks).values(tasks).onConflictDoNothing();
}

async function seedSystemConfig() {
  console.log('Seeding system config...');

  const configs = [
    { key: 'app.version', value: '0.1.0', valueType: 'string', description: 'Application version' },
    { key: 'app.branch', value: 'main', valueType: 'string', description: 'Git branch' },
    { key: 'auth.method', value: 'forms', valueType: 'string', description: 'Authentication method' },
    { key: 'auth.required', value: 'true', valueType: 'boolean', description: 'Require authentication' },
    { key: 'proxy.enabled', value: 'false', valueType: 'boolean', description: 'Use proxy for requests' },
    { key: 'log.level', value: 'info', valueType: 'string', description: 'Log level' },
    { key: 'update.automatically', value: 'false', valueType: 'boolean', description: 'Automatic updates' },
    { key: 'analytics.enabled', value: 'false', valueType: 'boolean', description: 'Send anonymous analytics' },
  ];

  await db.insert(systemConfig).values(configs).onConflictDoNothing();
}

async function seedRolesAndPermissions() {
  console.log('Seeding roles and permissions...');

  // Seed default roles
  const defaultRoles = [
    { name: 'admin', description: 'Full system access', isSystem: true },
    { name: 'user', description: 'Standard user access', isSystem: true },
    { name: 'viewer', description: 'Read-only access', isSystem: true },
  ];

  await db.insert(roles).values(defaultRoles).onConflictDoNothing();

  // Seed all permissions
  const allPermissions = PERMISSIONS.map(p => ({
    name: p,
    description: `Permission: ${p}`,
    category: p.split(':')[0] ?? 'general',
  }));

  await db.insert(permissions).values(allPermissions).onConflictDoNothing();

  // Get inserted roles and permissions
  const insertedRoles = await db.select().from(roles);
  const insertedPermissions = await db.select().from(permissions);

  // Map role permissions
  const adminRole = insertedRoles.find(r => r.name === 'admin');
  const userRole = insertedRoles.find(r => r.name === 'user');
  const viewerRole = insertedRoles.find(r => r.name === 'viewer');

  if (!adminRole || !userRole || !viewerRole) {
    throw new Error('Failed to find seeded roles');
  }

  // Admin gets all permissions
  const adminPermissions = insertedPermissions.map(p => ({
    roleId: adminRole.id,
    permissionId: p.id,
  }));

  // User gets most permissions except system admin
  const userPermissions = insertedPermissions
    .filter(p => !p.name.startsWith('system:') && !p.name.startsWith('users:'))
    .map(p => ({
      roleId: userRole.id,
      permissionId: p.id,
    }));

  // Viewer gets read permissions only
  const viewerPermissions = insertedPermissions
    .filter(p => p.name.includes(':read') || p.name.includes(':view'))
    .map(p => ({
      roleId: viewerRole.id,
      permissionId: p.id,
    }));

  await db.insert(rolePermissions)
    .values([...adminPermissions, ...userPermissions, ...viewerPermissions])
    .onConflictDoNothing();
}

// ----------------------------------------------------------------------------
// Main Seed Function
// ----------------------------------------------------------------------------

export async function seed() {
  console.log('Starting database seed...\n');

  try {
    await seedQualityDefinitions();
    await seedDefaultQualityProfiles();
    await seedDefaultTags();
    await seedScheduledTasks();
    await seedSystemConfig();
    await seedRolesAndPermissions();

    console.log('\n✓ Database seeded successfully!');
  } catch (error) {
    console.error('\n✗ Seed failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
