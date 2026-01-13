// ============================================================================
// User & Auth Schema
// ============================================================================

import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoleEnum } from './enums.js';

// ----------------------------------------------------------------------------
// User Table
// ----------------------------------------------------------------------------

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Text ID for Lucia compatibility

  username: text('username').notNull().unique(),
  email: text('email'), // Optional
  passwordHash: text('password_hash').notNull(),

  role: userRoleEnum('role').notNull().default('user'),

  // Profile
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),

  // 2FA
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: text('two_factor_secret'), // Encrypted

  // Status
  isActive: boolean('is_active').notNull().default(true),
  isLocked: boolean('is_locked').notNull().default(false),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockoutEnd: timestamp('lockout_end', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
}, (table) => ({
  usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
}));

// ----------------------------------------------------------------------------
// Session Table (for Lucia auth)
// ----------------------------------------------------------------------------

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // Lucia generates string IDs

  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  // Session metadata
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
  expiresIdx: index('sessions_expires_idx').on(table.expiresAt),
}));

// ----------------------------------------------------------------------------
// API Key Table
// ----------------------------------------------------------------------------

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),

  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  key: text('key').notNull().unique(), // Full API key (hashed in production)

  // Timestamps
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('api_keys_user_idx').on(table.userId),
  keyIdx: uniqueIndex('api_keys_key_idx').on(table.key),
}));

// ----------------------------------------------------------------------------
// Role Table (for custom roles beyond enum)
// ----------------------------------------------------------------------------

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(),
  description: text('description'),

  // Priority for permission resolution (higher = evaluated first)
  priority: integer('priority').notNull().default(0),

  // Is this a system role (cannot be deleted)
  isSystem: boolean('is_system').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Permission Table
// ----------------------------------------------------------------------------

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),

  name: text('name').notNull().unique(), // e.g., "media:read", "media:create"
  description: text('description'),

  // Category for grouping in UI
  category: text('category').notNull(), // e.g., "media", "queue", "settings"
});

// ----------------------------------------------------------------------------
// Role-Permission Junction Table
// ----------------------------------------------------------------------------

export const rolePermissions = pgTable('role_permissions', {
  id: serial('id').primaryKey(),

  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  rolePermissionIdx: uniqueIndex('role_permissions_role_permission_idx').on(table.roleId, table.permissionId),
}));

// ----------------------------------------------------------------------------
// User-Role Junction Table
// ----------------------------------------------------------------------------

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),

  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
}, (table) => ({
  userRoleIdx: uniqueIndex('user_roles_user_role_idx').on(table.userId, table.roleId),
}));

// ----------------------------------------------------------------------------
// User Permission Override Table (for user-specific grants/denials)
// ----------------------------------------------------------------------------

export const userPermissions = pgTable('user_permissions', {
  id: serial('id').primaryKey(),

  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),

  // true = explicitly granted, false = explicitly denied
  allowed: boolean('allowed').notNull(),

  // Optional: restrict to specific resource
  resourceType: text('resource_type'), // e.g., "media", "instance"
  resourceId: integer('resource_id'), // e.g., specific media ID
}, (table) => ({
  userPermissionIdx: uniqueIndex('user_permissions_user_permission_idx')
    .on(table.userId, table.permissionId, table.resourceType, table.resourceId),
}));

// ----------------------------------------------------------------------------
// User Instance Grant Table (for instance-level access)
// ----------------------------------------------------------------------------

export const userInstanceGrants = pgTable('user_instance_grants', {
  id: serial('id').primaryKey(),

  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  instanceId: integer('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),

  // What level of access
  canRead: boolean('can_read').notNull().default(true),
  canWrite: boolean('can_write').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
}, (table) => ({
  userInstanceIdx: uniqueIndex('user_instance_grants_user_instance_idx').on(table.userId, table.instanceId),
}));

// Forward declaration
import { instances } from './instance.js';

// ----------------------------------------------------------------------------
// Audit Log Table
// ----------------------------------------------------------------------------

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),

  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: text('username'), // Preserved even if user deleted

  action: text('action').notNull(), // e.g., "media:create", "user:login"
  resourceType: text('resource_type'), // e.g., "media", "user"
  resourceId: integer('resource_id'),

  // What changed
  oldValue: text('old_value'), // JSON string of old state
  newValue: text('new_value'), // JSON string of new state

  // Request context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Result
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// ----------------------------------------------------------------------------
// Relations
// ----------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  apiKeys: many(apiKeys),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  userInstanceGrants: many(userInstanceGrants),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userInstanceGrantsRelations = relations(userInstanceGrants, ({ one }) => ({
  user: one(users, {
    fields: [userInstanceGrants.userId],
    references: [users.id],
  }),
  instance: one(instances, {
    fields: [userInstanceGrants.instanceId],
    references: [instances.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
