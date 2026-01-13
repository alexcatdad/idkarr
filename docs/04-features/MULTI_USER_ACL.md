# Multi-User Access Control (ACL) System

---

## Problem Statement

### Current Limitations
- Sonarr v5 has very limited multi-user support
- Only basic API key authentication (no true user accounts)
- No role-based access control (RBAC)
- No instance-level or series-level permissions
- No audit logging for user actions
- Family/roommate sharing requires same admin privileges

### Why Multi-User ACL Matters

**Common Use Cases:**
1. **Family Setup**: Parents (admin) and children (restricted view-only access)
2. **Roommate Setup**: Multiple users managing their own series separately
3. **Organization Setup**: Different teams managing different content
4. **API-Only Users**: Automation scripts with limited permissions
5. **Read-Only Users**: View series and queue without ability to modify

**Security Benefits:**
- Prevent accidental deletions by less experienced users
- Audit trail of who made changes
- Least privilege principle enforcement
- Separation of concerns (users can only see their instances/series)

---

## Architecture Overview

### Multi-User ACL System

```
┌─────────────────────────────────────────────────────────────┐
│                      Authentication                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Lucia Auth │  │  API Keys    │  │  OAuth/JWT   │       │
│  │   (Sessions) │  │  (API Keys)  │  │  (External)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│   User Entity  │  │    Roles       │  │ Permissions    │
│                │  │                │  │                │
│ - id           │  │ - id           │  │ - id           │
│ - username     │  │ - name         │  │ - resource     │
│ - email        │  │ - description  │  │ - action       │
│ - passwordHash │  │ - permissions   │  │ - description  │
│ - roleIds      │  │ - isSystem     │  │ - isSystem     │
│ - permissions  │  └────────────────┘  └────────────────┘
│ - settings     │           │                   │
└────────────────┘           │                   │
        │                   └─────────┬─────────┘
        │                             │
        │                   ┌─────────▼─────────┐
        │                   │ Role Permissions  │
        │                   │                   │
        │                   │ - roleId          │
        │                   │ - permissionId    │
        │                   └───────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Resource Grants                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │ Instance Grants │  │ Series Grants   │  │ Settings ACL ││
│  │                 │  │                 │  │              ││
│  │ - userId        │  │ - userId        │  │ - userId     ││
│  │ - instanceId    │  │ - seriesId       │  │ - key        ││
│  │ - permissions   │  │ - permissions    │  │ - canRead    ││
│  │                 │  │                 │  │ - canWrite   ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼────────┐
│  Authorization  │  │   Audit Log    │  │   User API    │
│  Middleware     │  │                 │  │               │
│  - Check roles  │  │ - userId        │  │ - List users  │
│  - Check perms  │  │ - action        │  │ - Create user │
│  - Check grants │  │ - resource      │  │ - Update user │
│  - Enforce ACL  │  │ - timestamp     │  │ - Delete user │
└────────────────┘  │ - metadata      │  │ - Manage roles│
                    └─────────────────┘  └────────────────┘
```

### Key Design Decisions

#### 1. **Role-Based Access Control (RBAC)**
- Predefined roles with common permission sets
- Custom roles can be created
- Users can have multiple roles
- Roles inherit permissions

#### 2. **Resource-Level Grants**
- Fine-grained access to specific instances
- Fine-grained access to specific series
- Override role permissions with grants
- Grant-based permissions take precedence

#### 3. **Permission System**
- Hierarchical permissions (read, write, delete, admin)
- Resource-specific permissions (instances, series, settings, etc.)
- Action-specific permissions (download, import, rename, etc.)

#### 4. **Audit Logging**
- All user actions logged
- Includes user, action, resource, timestamp
- Admin-only access to audit logs

---

## Database Schema

### Users Table

```typescript
// backend/db/schema/user.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended', 'pending']);

export const user = pgTable('user', {
  id: serial('id').primaryKey(),
  
  // Authentication
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  
  // Profile
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatar: text('avatar'), // URL to avatar image
  
  // Status
  status: userStatusEnum('status').notNull().default('pending'),
  emailVerified: boolean('email_verified').notNull().default(false),
  lastLogin: timestamp('last_login'),
  lastActive: timestamp('last_active'),
  
  // Security
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: text('two_factor_secret'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  
  // API Access
  apiKey: text('api_key').unique(), // Each user can have their own API key
  
  // Preferences
  language: text('language').notNull().default('en'),
  timezone: text('timezone').notNull().default('UTC'),
  theme: text('theme').notNull().default('dark'),
  dateFormat: text('date_format').notNull().default('YYYY-MM-DD'),
  timeFormat: text('time_format').notNull().default('24h'),
  
  // Instance Settings
  defaultInstanceId: integer('default_instance_id').references(() => instance.id),
  instancePreferences: jsonb('instance_preferences').$type<Record<number, {
    pinned?: boolean;
    sortOrder?: number;
    hidden?: boolean;
    lastViewed?: timestamp;
  }>>(),
  
  // UI Settings
  uiSettings: jsonb('ui_settings').$type<{
    calendarWeekColumnHeader?: string;
    weekColumnHeader?: string;
    showRelativeDates?: boolean;
    shortDateFormat?: string;
    longDateFormat?: string;
    timeFormat?: string;
    firstDayOfWeek?: number;
    compactView?: boolean;
  }>(),
  
  // Notification Settings
  notificationSettings: jsonb('notification_settings').$type<{
    onGrab?: boolean;
    onDownload?: boolean;
    onUpgrade?: boolean;
    onRename?: boolean;
    onHealthIssue?: boolean;
    onImportComplete?: boolean;
    onManualInteractionRequired?: boolean;
  }>(),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => user.id),
  updatedBy: integer('updated_by').references(() => user.id),
});

export const userRelations = relations(user, ({ one, many }) => ({
  roles: many(userRole),
  permissions: many(userPermission),
  instanceGrants: many(userInstanceGrant),
  seriesGrants: many(userSeriesGrant),
  auditLogs: many(auditLog),
  createdUsers: many(user, {
    relationName: 'createdUsers',
  }),
  updatedUsers: many(user, {
    relationName: 'updatedUsers',
  }),
}));
```

### Roles Table

```typescript
// backend/db/schema/role.schema.ts

import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const role = pgTable('role', {
  id: serial('id').primaryKey(),
  
  // Role Info
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  
  // System Roles (cannot be deleted)
  isSystem: boolean('is_system').notNull().default(false),
  
  // Priority (higher = more permissions, used for role conflicts)
  priority: integer('priority').notNull().default(0),
  
  // Color for UI
  color: text('color').notNull().default('#6b7280'),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const roleRelations = relations(role, ({ many }) => ({
  users: many(userRole),
  permissions: many(rolePermission),
}));

// Default system roles
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  VIEWER: 'viewer',
  API_USER: 'api-user',
} as const;

export const DEFAULT_ROLES = [
  {
    name: SYSTEM_ROLES.ADMIN,
    displayName: 'Administrator',
    description: 'Full access to all resources and settings',
    isSystem: true,
    priority: 100,
    color: '#ef4444',
  },
  {
    name: SYSTEM_ROLES.MODERATOR,
    displayName: 'Moderator',
    description: 'Can manage series and queue, but not system settings',
    isSystem: true,
    priority: 75,
    color: '#f59e0b',
  },
  {
    name: SYSTEM_ROLES.USER,
    displayName: 'User',
    description: 'Can add/edit series and manage own downloads',
    isSystem: true,
    priority: 50,
    color: '#3b82f6',
  },
  {
    name: SYSTEM_ROLES.VIEWER,
    displayName: 'Viewer',
    description: 'Read-only access to series and queue',
    isSystem: true,
    priority: 25,
    color: '#10b981',
  },
  {
    name: SYSTEM_ROLES.API_USER,
    displayName: 'API User',
    description: 'Limited API access for automation',
    isSystem: true,
    priority: 0,
    color: '#8b5cf6',
  },
];
```

### User-Role Junction Table

```typescript
// backend/db/schema/userRole.schema.ts

import { integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';
import { role } from './role.schema';

export const userRole = pgTable('user_role', {
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roleId: integer('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  
  // Granted by (who assigned this role)
  grantedBy: integer('granted_by').references(() => user.id),
  
  // Metadata
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  
  // Composite primary key
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [userRole.roleId],
    references: [role.id],
  }),
  grantedByUser: one(user, {
    fields: [userRole.grantedBy],
    references: [user.id],
  }),
}));
```

### Permissions Table

```typescript
// backend/db/schema/permission.schema.ts

import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const permissionResourceEnum = pgEnum('permission_resource', [
  // System resources
  'system',
  'settings',
  'users',
  'roles',
  'audit-log',
  
  // Instance resources
  'instances',
  'series',
  'episodes',
  'queue',
  'history',
  'releases',
  'wanted',
  'calendar',
  'tags',
  'quality-profiles',
  'custom-formats',
  'root-folders',
  
  // Integration resources
  'indexers',
  'download-clients',
  'notifications',
  'import-lists',
  
  // Media resources
  'rename',
  'import',
  'delete',
  'search',
]);

export const permissionActionEnum = pgEnum('permission_action', [
  // Basic actions
  'read',
  'create',
  'update',
  'delete',
  
  // Advanced actions
  'manage',
  'admin',
  
  // Specific actions
  'download',
  'import',
  'rename',
  'search',
  'monitor',
  'unmonitor',
]);

export const permission = pgTable('permission', {
  id: serial('id').primaryKey(),
  
  // Permission Info
  resource: permissionResourceEnum('resource').notNull(),
  action: permissionActionEnum('action').notNull(),
  
  // Unique combination of resource + action
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  
  // System permissions (cannot be deleted)
  isSystem: boolean('is_system').notNull().default(true),
  
  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const permissionRelations = relations(permission, ({ many }) => ({
  roles: many(rolePermission),
  users: many(userPermission),
}));

// Default system permissions
export const SYSTEM_PERMISSIONS = [
  // System permissions
  { resource: 'system', action: 'read', name: 'system:read', description: 'View system information' },
  { resource: 'system', action: 'admin', name: 'system:admin', description: 'Full system administration' },
  
  // Settings permissions
  { resource: 'settings', action: 'read', name: 'settings:read', description: 'View settings' },
  { resource: 'settings', action: 'update', name: 'settings:update', description: 'Modify settings' },
  { resource: 'settings', action: 'admin', name: 'settings:admin', description: 'Full settings administration' },
  
  // User management permissions
  { resource: 'users', action: 'read', name: 'users:read', description: 'View users' },
  { resource: 'users', action: 'create', name: 'users:create', description: 'Create users' },
  { resource: 'users', action: 'update', name: 'users:update', description: 'Update users' },
  { resource: 'users', action: 'delete', name: 'users:delete', description: 'Delete users' },
  { resource: 'users', action: 'admin', name: 'users:admin', description: 'Full user administration' },
  
  // Role management permissions
  { resource: 'roles', action: 'read', name: 'roles:read', description: 'View roles' },
  { resource: 'roles', action: 'create', name: 'roles:create', description: 'Create roles' },
  { resource: 'roles', action: 'update', name: 'roles:update', description: 'Update roles' },
  { resource: 'roles', action: 'delete', name: 'roles:delete', description: 'Delete roles' },
  { resource: 'roles', action: 'admin', name: 'roles:admin', description: 'Full role administration' },
  
  // Audit log permissions
  { resource: 'audit-log', action: 'read', name: 'audit-log:read', description: 'View audit log' },
  { resource: 'audit-log', action: 'delete', name: 'audit-log:delete', description: 'Delete audit log entries' },
  
  // Instance permissions
  { resource: 'instances', action: 'read', name: 'instances:read', description: 'View instances' },
  { resource: 'instances', action: 'manage', name: 'instances:manage', description: 'Manage instances' },
  { resource: 'instances', action: 'admin', name: 'instances:admin', description: 'Full instance administration' },
  
  // Series permissions
  { resource: 'series', action: 'read', name: 'series:read', description: 'View series' },
  { resource: 'series', action: 'create', name: 'series:create', description: 'Add series' },
  { resource: 'series', action: 'update', name: 'series:update', description: 'Edit series' },
  { resource: 'series', action: 'delete', name: 'series:delete', description: 'Delete series' },
  { resource: 'series', action: 'manage', name: 'series:manage', description: 'Manage series' },
  { resource: 'series', action: 'admin', name: 'series:admin', description: 'Full series administration' },
  
  // Episode permissions
  { resource: 'episodes', action: 'read', name: 'episodes:read', description: 'View episodes' },
  { resource: 'episodes', action: 'monitor', name: 'episodes:monitor', description: 'Toggle episode monitoring' },
  { resource: 'episodes', action: 'unmonitor', name: 'episodes:unmonitor', description: 'Unmonitor episodes' },
  { resource: 'episodes', action: 'admin', name: 'episodes:admin', description: 'Full episode administration' },
  
  // Queue permissions
  { resource: 'queue', action: 'read', name: 'queue:read', description: 'View queue' },
  { resource: 'queue', action: 'manage', name: 'queue:manage', description: 'Manage queue (pause, remove, retry)' },
  { resource: 'queue', action: 'admin', name: 'queue:admin', description: 'Full queue administration' },
  
  // History permissions
  { resource: 'history', action: 'read', name: 'history:read', description: 'View history' },
  { resource: 'history', action: 'delete', name: 'history:delete', description: 'Delete history entries' },
  
  // Release permissions
  { resource: 'releases', action: 'read', name: 'releases:read', description: 'View releases' },
  { resource: 'releases', action: 'search', name: 'releases:search', description: 'Search releases' },
  { resource: 'releases', action: 'download', name: 'releases:download', description: 'Download releases' },
  
  // Wanted permissions
  { resource: 'wanted', action: 'read', name: 'wanted:read', description: 'View wanted episodes' },
  { resource: 'wanted', action: 'search', name: 'wanted:search', description: 'Search wanted episodes' },
  
  // Calendar permissions
  { resource: 'calendar', action: 'read', name: 'calendar:read', description: 'View calendar' },
  
  // Tag permissions
  { resource: 'tags', action: 'read', name: 'tags:read', description: 'View tags' },
  { resource: 'tags', action: 'create', name: 'tags:create', description: 'Create tags' },
  { resource: 'tags', action: 'update', name: 'tags:update', description: 'Update tags' },
  { resource: 'tags', action: 'delete', name: 'tags:delete', description: 'Delete tags' },
  
  // Quality profile permissions
  { resource: 'quality-profiles', action: 'read', name: 'quality-profiles:read', description: 'View quality profiles' },
  { resource: 'quality-profiles', action: 'create', name: 'quality-profiles:create', description: 'Create quality profiles' },
  { resource: 'quality-profiles', action: 'update', name: 'quality-profiles:update', description: 'Update quality profiles' },
  { resource: 'quality-profiles', action: 'delete', name: 'quality-profiles:delete', description: 'Delete quality profiles' },
  
  // Custom format permissions
  { resource: 'custom-formats', action: 'read', name: 'custom-formats:read', description: 'View custom formats' },
  { resource: 'custom-formats', action: 'create', name: 'custom-formats:create', description: 'Create custom formats' },
  { resource: 'custom-formats', action: 'update', name: 'custom-formats:update', description: 'Update custom formats' },
  { resource: 'custom-formats', action: 'delete', name: 'custom-formats:delete', description: 'Delete custom formats' },
  
  // Root folder permissions
  { resource: 'root-folders', action: 'read', name: 'root-folders:read', description: 'View root folders' },
  { resource: 'root-folders', action: 'create', name: 'root-folders:create', description: 'Create root folders' },
  { resource: 'root-folders', action: 'update', name: 'root-folders:update', description: 'Update root folders' },
  { resource: 'root-folders', action: 'delete', name: 'root-folders:delete', description: 'Delete root folders' },
  
  // Indexer permissions
  { resource: 'indexers', action: 'read', name: 'indexers:read', description: 'View indexers' },
  { resource: 'indexers', action: 'create', name: 'indexers:create', description: 'Create indexers' },
  { resource: 'indexers', action: 'update', name: 'indexers:update', description: 'Update indexers' },
  { resource: 'indexers', action: 'delete', name: 'indexers:delete', description: 'Delete indexers' },
  
  // Download client permissions
  { resource: 'download-clients', action: 'read', name: 'download-clients:read', description: 'View download clients' },
  { resource: 'download-clients', action: 'create', name: 'download-clients:create', description: 'Create download clients' },
  { resource: 'download-clients', action: 'update', name: 'download-clients:update', description: 'Update download clients' },
  { resource: 'download-clients', action: 'delete', name: 'download-clients:delete', description: 'Delete download clients' },
  
  // Notification permissions
  { resource: 'notifications', action: 'read', name: 'notifications:read', description: 'View notifications' },
  { resource: 'notifications', action: 'create', name: 'notifications:create', description: 'Create notifications' },
  { resource: 'notifications', action: 'update', name: 'notifications:update', description: 'Update notifications' },
  { resource: 'notifications', action: 'delete', name: 'notifications:delete', description: 'Delete notifications' },
  
  // Import list permissions
  { resource: 'import-lists', action: 'read', name: 'import-lists:read', description: 'View import lists' },
  { resource: 'import-lists', action: 'create', name: 'import-lists:create', description: 'Create import lists' },
  { resource: 'import-lists', action: 'update', name: 'import-lists:update', description: 'Update import lists' },
  { resource: 'import-lists', action: 'delete', name: 'import-lists:delete', description: 'Delete import lists' },
  
  // Rename permissions
  { resource: 'rename', action: 'read', name: 'rename:read', description: 'View rename settings' },
  { resource: 'rename', action: 'manage', name: 'rename:manage', description: 'Rename episodes' },
  
  // Import permissions
  { resource: 'import', action: 'read', name: 'import:read', description: 'View import settings' },
  { resource: 'import', action: 'manage', name: 'import:manage', description: 'Import episodes' },
  
  // Delete permissions
  { resource: 'delete', action: 'read', name: 'delete:read', description: 'View delete settings' },
  { resource: 'delete', action: 'manage', name: 'delete:manage', description: 'Delete episodes' },
  
  // Search permissions
  { resource: 'search', action: 'read', name: 'search:read', description: 'View search settings' },
  { resource: 'search', action: 'manage', name: 'search:manage', description: 'Search for episodes' },
];
```

### Role-Permission Junction Table

```typescript
// backend/db/schema/rolePermission.schema.ts

import { integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { role } from './role.schema';
import { permission } from './permission.schema';

export const rolePermission = pgTable('role_permission', {
  roleId: integer('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permission.id, { onDelete: 'cascade' }),
  
  // Metadata
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  
  // Composite primary key
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
}));

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
  role: one(role, {
    fields: [rolePermission.roleId],
    references: [role.id],
  }),
  permission: one(permission, {
    fields: [rolePermission.permissionId],
    references: [permission.id],
  }),
}));
```

### User-Permission Junction Table

```typescript
// backend/db/schema/userPermission.schema.ts

import { boolean, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';
import { permission } from './permission.schema';

export const userPermission = pgTable('user_permission', {
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id').notNull().references(() => permission.id, { onDelete: 'cascade' }),
  
  // Allow/Deny (override role permissions)
  allow: boolean('allow').notNull().default(true),
  
  // Granted by (who assigned this permission)
  grantedBy: integer('granted_by').references(() => user.id),
  
  // Metadata
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Temporary permission
  
  // Composite primary key
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.permissionId] }),
}));

export const userPermissionRelations = relations(userPermission, ({ one }) => ({
  user: one(user, {
    fields: [userPermission.userId],
    references: [user.id],
  }),
  permission: one(permission, {
    fields: [userPermission.permissionId],
    references: [permission.id],
  }),
  grantedByUser: one(user, {
    fields: [userPermission.grantedBy],
    references: [user.id],
  }),
}));
```

### User-Instance Grant Table

```typescript
// backend/db/schema/userInstanceGrant.schema.ts

import { boolean, integer, pgEnum, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';
import { instance } from './instance.schema';

export const userInstancePermissionEnum = pgEnum('user_instance_permission', [
  'read',
  'write',
  'manage',
  'admin',
]);

export const userInstanceGrant = pgTable('user_instance_grant', {
  id: serial('id').primaryKey(),
  
  // User and Instance
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  
  // Permissions (bitmap for multiple permissions)
  canRead: boolean('can_read').notNull().default(true),
  canWrite: boolean('can_write').notNull().default(false),
  canManage: boolean('can_manage').notNull().default(false),
  canAdmin: boolean('can_admin').notNull().default(false),
  
  // Granted by (who assigned this grant)
  grantedBy: integer('granted_by').references(() => user.id),
  
  // Metadata
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Temporary grant
  
  // Unique constraint
}, (table) => ({
  uniqueGrant: unique('unique_user_instance_grant').on(table.userId, table.instanceId),
}));

export const userInstanceGrantRelations = relations(userInstanceGrant, ({ one }) => ({
  user: one(user, {
    fields: [userInstanceGrant.userId],
    references: [user.id],
  }),
  instance: one(instance, {
    fields: [userInstanceGrant.instanceId],
    references: [instance.id],
  }),
  grantedByUser: one(user, {
    fields: [userInstanceGrant.grantedBy],
    references: [user.id],
  }),
}));
```

### User-Series Grant Table

```typescript
// backend/db/schema/userSeriesGrant.schema.ts

import { boolean, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';
import { series } from './series.schema';

export const userSeriesGrant = pgTable('user_series_grant', {
  id: serial('id').primaryKey(),
  
  // User and Series
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  instanceId: integer('instance_id').notNull().references(() => instance.id, { onDelete: 'cascade' }),
  seriesId: integer('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  
  // Permissions
  canRead: boolean('can_read').notNull().default(true),
  canWrite: boolean('can_write').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
  canManage: boolean('can_manage').notNull().default(false),
  
  // Granted by (who assigned this grant)
  grantedBy: integer('granted_by').references(() => user.id),
  
  // Metadata
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Temporary grant
  
  // Unique constraint
}, (table) => ({
  uniqueGrant: unique('unique_user_series_grant').on(table.userId, table.seriesId),
}));

export const userSeriesGrantRelations = relations(userSeriesGrant, ({ one }) => ({
  user: one(user, {
    fields: [userSeriesGrant.userId],
    references: [user.id],
  }),
  instance: one(instance, {
    fields: [userSeriesGrant.instanceId],
    references: [instance.id],
  }),
  series: one(series, {
    fields: [userSeriesGrant.seriesId],
    references: [series.id],
  }),
  grantedByUser: one(user, {
    fields: [userSeriesGrant.grantedBy],
    references: [user.id],
  }),
}));
```

### Audit Log Table

```typescript
// backend/db/schema/auditLog.schema.ts

import { integer, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './user.schema';

export const auditLogActionEnum = pgEnum('audit_log_action', [
  // User actions
  'user.login',
  'user.logout',
  'user.create',
  'user.update',
  'user.delete',
  'user.password-reset',
  
  // Role actions
  'role.create',
  'role.update',
  'role.delete',
  'role.assign',
  'role.revoke',
  
  // Permission actions
  'permission.grant',
  'permission.revoke',
  
  // Instance actions
  'instance.create',
  'instance.update',
  'instance.delete',
  'instance.start',
  'instance.stop',
  'instance.restart',
  
  // Series actions
  'series.create',
  'series.update',
  'series.delete',
  'series.monitor',
  'series.unmonitor',
  
  // Episode actions
  'episode.monitor',
  'episode.unmonitor',
  'episode.search',
  
  // Queue actions
  'queue.pause',
  'queue.resume',
  'queue.remove',
  'queue.retry',
  
  // Settings actions
  'settings.update',
  
  // Grant actions
  'grant.instance',
  'grant.series',
  'grant.revoke',
]);

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  
  // User info
  userId: integer('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').notNull(), // Denormalized for performance
  
  // Action info
  action: auditLogActionEnum('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: integer('resource_id'), // ID of the resource acted upon
  
  // Details
  details: jsonb('details').$type<Record<string, unknown>>(),
  
  // Context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  instanceId: integer('instance_id'),
  
  // Timing
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
}));
```

---

## ACL System Design

### Permission Resolution

```typescript
// backend/core/acl/services/permission.service.ts

import { db } from '@/db/client';
import { user, userRole, userPermission, rolePermission, userInstanceGrant, userSeriesGrant } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

interface PermissionCheckContext {
  userId: number;
  resource: string;
  action: string;
  instanceId?: number;
  seriesId?: number;
}

export class PermissionService {
  /**
   * Check if user has permission for action on resource
   */
  async hasPermission(context: PermissionCheckContext): Promise<boolean> {
    const { userId, resource, action, instanceId, seriesId } = context;
    
    // 1. Check if user is suspended
    const userRecord = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { status: true },
    });
    
    if (userRecord?.status !== 'active') {
      return false;
    }
    
    // 2. Check series-specific grant (highest priority)
    if (seriesId && instanceId) {
      const seriesGrant = await db.query.userSeriesGrant.findFirst({
        where: and(
          eq(userSeriesGrant.userId, userId),
          eq(userSeriesGrant.seriesId, seriesId),
          eq(userSeriesGrant.instanceId, instanceId),
        ),
      });
      
      if (seriesGrant) {
        // Check grant-specific permission
        return this.checkGrantPermission(seriesGrant, action);
      }
    }
    
    // 3. Check instance-specific grant (medium priority)
    if (instanceId) {
      const instanceGrant = await db.query.userInstanceGrant.findFirst({
        where: and(
          eq(userInstanceGrant.userId, userId),
          eq(userInstanceGrant.instanceId, instanceId),
        ),
      });
      
      if (instanceGrant) {
        // Check grant-specific permission
        return this.checkInstanceGrantPermission(instanceGrant, action, resource);
      }
    }
    
    // 4. Check user-specific permission override
    const userPermissionOverride = await db.query.userPermission.findFirst({
      where: and(
        eq(userPermission.userId, userId),
        eq(userPermission.permission.name, `${resource}:${action}`),
      ),
    });
    
    if (userPermissionOverride) {
      // Check if permission has expired
      if (userPermissionOverride.expiresAt && userPermissionOverride.expiresAt < new Date()) {
        return false;
      }
      
      return userPermissionOverride.allow;
    }
    
    // 5. Check role-based permissions (lowest priority)
    const userRoles = await db.query.userRole.findMany({
      where: eq(userRole.userId, userId),
      with: {
        role: {
          with: {
            permissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    });
    
    // Get highest priority role
    const sortedRoles = userRoles
      .map((ur) => ur.role)
      .sort((a, b) => b.priority - a.priority);
    
    // Check if any role has the permission
    for (const role of sortedRoles) {
      const hasPermission = role.permissions.some(
        (rp) => rp.permission.name === `${resource}:${action}`,
      );
      
      if (hasPermission) {
        return true;
      }
    }
    
    // No permission found
    return false;
  }
  
  /**
   * Check series grant permission
   */
  private checkGrantPermission(
    grant: typeof userSeriesGrant.$inferSelect,
    action: string,
  ): boolean {
    // Check if grant has expired
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      return false;
    }
    
    switch (action) {
      case 'read':
        return grant.canRead;
      case 'update':
        return grant.canWrite || grant.canManage;
      case 'delete':
        return grant.canDelete || grant.canManage;
      case 'manage':
        return grant.canManage;
      default:
        return false;
    }
  }
  
  /**
   * Check instance grant permission
   */
  private checkInstanceGrantPermission(
    grant: typeof userInstanceGrant.$inferSelect,
    action: string,
    resource: string,
  ): boolean {
    // Check if grant has expired
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      return false;
    }
    
    switch (action) {
      case 'read':
        return grant.canRead;
      case 'update':
      case 'create':
        return grant.canWrite || grant.canManage || grant.canAdmin;
      case 'delete':
        return grant.canManage || grant.canAdmin;
      case 'manage':
        return grant.canManage || grant.canAdmin;
      case 'admin':
        return grant.canAdmin;
      default:
        return false;
    }
  }
  
  /**
   * Get all user permissions (merged from roles and grants)
   */
  async getUserPermissions(userId: number): Promise<{
    roles: Array<{ name: string; displayName: string; permissions: string[] }>;
    permissions: string[];
    instanceGrants: Record<number, { read: boolean; write: boolean; manage: boolean; admin: boolean }>;
    seriesGrants: Record<number, { read: boolean; write: boolean; delete: boolean; manage: boolean }>;
  }> {
    const [userRoles, userPerms, instanceGrants, seriesGrants] = await Promise.all([
      this.getUserRoles(userId),
      this.getUserPermissionsDirect(userId),
      this.getUserInstanceGrants(userId),
      this.getUserSeriesGrants(userId),
    ]);
    
    return {
      roles: userRoles,
      permissions: userPerms,
      instanceGrants: instanceGrants.reduce((acc, grant) => {
        acc[grant.instanceId] = {
          read: grant.canRead,
          write: grant.canWrite,
          manage: grant.canManage,
          admin: grant.canAdmin,
        };
        return acc;
      }, {} as Record<number, any>),
      seriesGrants: seriesGrants.reduce((acc, grant) => {
        acc[grant.seriesId] = {
          read: grant.canRead,
          write: grant.canWrite,
          delete: grant.canDelete,
          manage: grant.canManage,
        };
        return acc;
      }, {} as Record<number, any>),
    };
  }
  
  private async getUserRoles(userId: number) {
    return db.query.userRole.findMany({
      where: eq(userRole.userId, userId),
      with: {
        role: {
          with: {
            permissions: {
              with: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }
  
  private async getUserPermissionsDirect(userId: number) {
    const userPerms = await db.query.userPermission.findMany({
      where: eq(userPermission.userId, userId),
      with: {
        permission: true,
      },
    });
    
    return userPerms
      .filter((up) => up.allow && (!up.expiresAt || up.expiresAt >= new Date()))
      .map((up) => up.permission.name);
  }
  
  private async getUserInstanceGrants(userId: number) {
    return db.query.userInstanceGrant.findMany({
      where: eq(userInstanceGrant.userId, userId),
    });
  }
  
  private async getUserSeriesGrants(userId: number) {
    return db.query.userSeriesGrant.findMany({
      where: eq(userSeriesGrant.userId, userId),
    });
  }
}

export const permissionService = new PermissionService();
```

### Authorization Middleware

```typescript
// backend/middleware/authorization.middleware.ts

import { MiddlewareHandler } from 'hono';
import { permissionService } from '@/core/acl/services/permission.service';
import { ForbiddenError } from '@/errors/http.error';

export const requirePermission = (resource: string, action: string): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    const instanceId = c.get('instanceId');
    const seriesId = c.get('seriesId');
    
    if (!user) {
      throw new ForbiddenError('Authentication required');
    }
    
    const hasPermission = await permissionService.hasPermission({
      userId: user.id,
      resource,
      action,
      instanceId,
      seriesId,
    });
    
    if (!hasPermission) {
      throw new ForbiddenError(
        `Permission denied: ${resource}:${action}`,
        {
          resource,
          action,
          userId: user.id,
        },
      );
    }
    
    await next();
  };
};

export const requireAnyPermission = (
  permissions: Array<{ resource: string; action: string }>,
): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    const instanceId = c.get('instanceId');
    const seriesId = c.get('seriesId');
    
    if (!user) {
      throw new ForbiddenError('Authentication required');
    }
    
    const hasAnyPermission = await Promise.all(
      permissions.map(({ resource, action }) =>
        permissionService.hasPermission({
          userId: user.id,
          resource,
          action,
          instanceId,
          seriesId,
        }),
      ),
    ).then((results) => results.some((r) => r));
    
    if (!hasAnyPermission) {
      throw new ForbiddenError(
        `Permission denied: requires one of ${permissions.map((p) => `${p.resource}:${p.action}`).join(', ')}`,
      {
        required: permissions,
        userId: user.id,
      },
      );
    }
    
    await next();
  };
};

export const requireRole = (roleName: string): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new ForbiddenError('Authentication required');
    }
    
    const roles = await db.query.userRole.findMany({
      where: eq(userRole.userId, user.id),
      with: {
        role: true,
      },
    });
    
    const hasRole = roles.some((ur) => ur.role.name === roleName);
    
    if (!hasRole) {
      throw new ForbiddenError(`Role required: ${roleName}`, {
        requiredRole: roleName,
        userId: user.id,
      });
    }
    
    await next();
  };
};

export const requireAdmin: MiddlewareHandler = requireRole('admin');

export const requireInstanceAccess = (instanceId: number, requiredPermission: 'read' | 'write' | 'manage' | 'admin'): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      throw new ForbiddenError('Authentication required');
    }
    
    const hasAccess = await permissionService.hasPermission({
      userId: user.id,
      resource: 'instances',
      action: requiredPermission,
      instanceId,
    });
    
    if (!hasAccess) {
      throw new ForbiddenError(
        `Instance access denied: ${requiredPermission}`,
        {
          instanceId,
          requiredPermission,
          userId: user.id,
        },
      );
    }
    
    await next();
  };
};
```

### Audit Log Service

```typescript
// backend/core/acl/services/auditLog.service.ts

import { db } from '@/db/client';
import { auditLog } from '@/db/schema';
import { AuditLogAction } from '@/types/models/auditLog';

interface AuditLogEntry {
  userId: number;
  username: string;
  action: AuditLogAction;
  resource: string;
  resourceId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  instanceId?: number;
}

export class AuditLogService {
  async log(entry: AuditLogEntry): Promise<void> {
    await db.insert(auditLog).values({
      userId: entry.userId,
      username: entry.username,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details || {},
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      instanceId: entry.instanceId,
    });
  }
  
  async getLogs(filters: {
    userId?: number;
    action?: AuditLogAction;
    resource?: string;
    resourceId?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Array<typeof auditLog.$inferSelect>> {
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(auditLog.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLog.action, filters.action));
    }
    if (filters.resource) {
      conditions.push(eq(auditLog.resource, filters.resource));
    }
    if (filters.resourceId) {
      conditions.push(eq(auditLog.resourceId, filters.resourceId));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLog.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLog.timestamp, filters.endDate));
    }
    
    return db.query.auditLog.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(auditLog.timestamp),
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });
  }
}

export const auditLogService = new AuditLogService();
```

---

## API Design

### Authentication API

```typescript
// backend/api/routes/auth.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { authService } from '@/core/auth/services/auth.service';
import { auditLogService } from '@/core/acl/services/auditLog.service';
import { validationMiddleware } from '@/middleware/validation.middleware';

const authRoutes = new Hono();

// POST /api/v3/auth/login - Login
authRoutes.post(
  '/login',
  validationMiddleware(
    z.object({
      username: z.string().min(3),
      password: z.string().min(8),
      rememberMe: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const { username, password, rememberMe } = c.req.valid('json');
    const result = await authService.login({ username, password, rememberMe });
    
    // Log login
    await auditLogService.log({
      userId: result.user.id,
      username: result.user.username,
      action: 'user.login',
      resource: 'user',
      resourceId: result.user.id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: result });
  },
);

// POST /api/v3/auth/logout - Logout
authRoutes.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  await authService.logout(user.id);
  
  // Log logout
  await auditLogService.log({
    userId: user.id,
    username: user.username,
    action: 'user.logout',
    resource: 'user',
    resourceId: user.id,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  
  return c.json({ success: true });
});

// POST /api/v3/auth/register - Register new user
authRoutes.post(
  '/register',
  validationMiddleware(
    z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8).max(100),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const newUser = await authService.register(body);
    
    // Log registration
    await auditLogService.log({
      userId: newUser.id,
      username: newUser.username,
      action: 'user.create',
      resource: 'user',
      resourceId: newUser.id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: newUser }, 201);
  },
);

// POST /api/v3/auth/refresh - Refresh token
authRoutes.post('/refresh', async (c) => {
  const refreshToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const tokens = await authService.refreshToken(refreshToken);
  return c.json({ data: tokens });
});

// POST /api/v3/auth/forgot-password - Request password reset
authRoutes.post(
  '/forgot-password',
  validationMiddleware(z.object({ email: z.string().email() })),
  async (c) => {
    const { email } = c.req.valid('json');
    await authService.requestPasswordReset(email);
    return c.json({ success: true });
  },
);

// POST /api/v3/auth/reset-password - Reset password
authRoutes.post(
  '/reset-password',
  validationMiddleware(
    z.object({
      token: z.string(),
      password: z.string().min(8).max(100),
    }),
  ),
  async (c) => {
    const { token, password } = c.req.valid('json');
    await authService.resetPassword(token, password);
    return c.json({ success: true });
  },
);

// GET /api/v3/auth/me - Get current user
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ data: user });
});

export default authRoutes;
```

### User Management API

```typescript
// backend/api/routes/users.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { userService } from '@/core/users/services/user.service';
import { auditLogService } from '@/core/acl/services/auditLog.service';
import { authMiddleware, requirePermission } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const userRoutes = new Hono();

// GET /api/v3/users - List all users (admin only)
userRoutes.get(
  '/users',
  authMiddleware,
  requirePermission('users', 'read'),
  async (c) => {
    const users = await userService.getAll();
    return c.json({ data: users });
  },
);

// GET /api/v3/users/:id - Get user by ID
userRoutes.get(
  '/users/:id',
  authMiddleware,
  requirePermission('users', 'read'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const user = await userService.getById(id);
    return c.json({ data: user });
  },
);

// POST /api/v3/users - Create new user (admin only)
userRoutes.post(
  '/users',
  authMiddleware,
  requirePermission('users', 'create'),
  validationMiddleware(
    z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8).max(100),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      roleIds: z.array(z.number()).optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const newUser = await userService.create(body);
    
    // Log user creation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'user.create',
      resource: 'user',
      resourceId: newUser.id,
      details: { createdUser: newUser.username },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: newUser }, 201);
  },
);

// PUT /api/v3/users/:id - Update user
userRoutes.put(
  '/users/:id',
  authMiddleware,
  requirePermission('users', 'update'),
  validationMiddleware(
    z.object({
      username: z.string().min(3).max(50).optional(),
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
      roleIds: z.array(z.number()).optional(),
    }),
  ),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const updatedUser = await userService.update(id, body);
    
    // Log user update
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'user.update',
      resource: 'user',
      resourceId: id,
      details: { updates: body },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: updatedUser });
  },
);

// DELETE /api/v3/users/:id - Delete user (admin only)
userRoutes.delete(
  '/users/:id',
  authMiddleware,
  requirePermission('users', 'delete'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const currentUser = c.get('user');
    await userService.delete(id);
    
    // Log user deletion
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'user.delete',
      resource: 'user',
      resourceId: id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ success: true });
  },
);

// GET /api/v3/users/:id/permissions - Get user permissions
userRoutes.get(
  '/users/:id/permissions',
  authMiddleware,
  requirePermission('users', 'read'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const permissions = await permissionService.getUserPermissions(id);
    return c.json({ data: permissions });
  },
);

// POST /api/v3/users/:id/roles/:roleId - Assign role to user
userRoutes.post(
  '/users/:id/roles/:roleId',
  authMiddleware,
  requirePermission('users', 'update'),
  async (c) => {
    const userId = Number(c.req.param('id'));
    const roleId = Number(c.req.param('roleId'));
    const currentUser = c.get('user');
    await userService.assignRole(userId, roleId);
    
    // Log role assignment
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'role.assign',
      resource: 'user',
      resourceId: userId,
      details: { roleId },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ success: true });
  },
);

// DELETE /api/v3/users/:id/roles/:roleId - Revoke role from user
userRoutes.delete(
  '/users/:id/roles/:roleId',
  authMiddleware,
  requirePermission('users', 'update'),
  async (c) => {
    const userId = Number(c.req.param('id'));
    const roleId = Number(c.req.param('roleId'));
    const currentUser = c.get('user');
    await userService.revokeRole(userId, roleId);
    
    // Log role revocation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'role.revoke',
      resource: 'user',
      resourceId: userId,
      details: { roleId },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ success: true });
  },
);

export default userRoutes;
```

### Role Management API

```typescript
// backend/api/routes/roles.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { roleService } from '@/core/roles/services/role.service';
import { auditLogService } from '@/core/acl/services/auditLog.service';
import { authMiddleware, requirePermission } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const roleRoutes = new Hono();

// GET /api/v3/roles - List all roles
roleRoutes.get(
  '/roles',
  authMiddleware,
  requirePermission('roles', 'read'),
  async (c) => {
    const roles = await roleService.getAll();
    return c.json({ data: roles });
  },
);

// GET /api/v3/roles/:id - Get role by ID
roleRoutes.get(
  '/roles/:id',
  authMiddleware,
  requirePermission('roles', 'read'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const role = await roleService.getById(id);
    return c.json({ data: role });
  },
);

// POST /api/v3/roles - Create new role
roleRoutes.post(
  '/roles',
  authMiddleware,
  requirePermission('roles', 'create'),
  validationMiddleware(
    z.object({
      name: z.string().min(3).max(50),
      displayName: z.string().min(3).max(100),
      description: z.string().optional(),
      priority: z.number().int().min(0).max(100).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      permissionIds: z.array(z.number()).optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const newRole = await roleService.create(body);
    
    // Log role creation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'role.create',
      resource: 'role',
      resourceId: newRole.id,
      details: { roleName: newRole.name },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: newRole }, 201);
  },
);

// PUT /api/v3/roles/:id - Update role
roleRoutes.put(
  '/roles/:id',
  authMiddleware,
  requirePermission('roles', 'update'),
  validationMiddleware(
    z.object({
      displayName: z.string().min(3).max(100).optional(),
      description: z.string().optional(),
      priority: z.number().int().min(0).max(100).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      permissionIds: z.array(z.number()).optional(),
    }),
  ),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const updatedRole = await roleService.update(id, body);
    
    // Log role update
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'role.update',
      resource: 'role',
      resourceId: id,
      details: { updates: body },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: updatedRole });
  },
);

// DELETE /api/v3/roles/:id - Delete role (system roles cannot be deleted)
roleRoutes.delete(
  '/roles/:id',
  authMiddleware,
  requirePermission('roles', 'delete'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const currentUser = c.get('user');
    await roleService.delete(id);
    
    // Log role deletion
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'role.delete',
      resource: 'role',
      resourceId: id,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ success: true });
  },
);

export default roleRoutes;
```

### Instance Grant API

```typescript
// backend/api/routes/instanceGrants.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { grantService } from '@/core/grants/services/grant.service';
import { auditLogService } from '@/core/acl/services/auditLog.service';
import { authMiddleware, requirePermission } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const instanceGrantRoutes = new Hono();

// GET /api/v3/instance-grants - List all instance grants
instanceGrantRoutes.get(
  '/instance-grants',
  authMiddleware,
  requirePermission('instances', 'read'),
  async (c) => {
    const userId = c.req.query('userId') ? Number(c.req.query('userId')) : undefined;
    const instanceId = c.req.query('instanceId') ? Number(c.req.query('instanceId')) : undefined;
    const grants = await grantService.getInstanceGrants({ userId, instanceId });
    return c.json({ data: grants });
  },
);

// POST /api/v3/instance-grants - Create instance grant
instanceGrantRoutes.post(
  '/instance-grants',
  authMiddleware,
  requirePermission('instances', 'admin'),
  validationMiddleware(
    z.object({
      userId: z.number().int(),
      instanceId: z.number().int(),
      canRead: z.boolean().default(true),
      canWrite: z.boolean().default(false),
      canManage: z.boolean().default(false),
      canAdmin: z.boolean().default(false),
      expiresAt: z.string().datetime().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const grant = await grantService.createInstanceGrant(body);
    
    // Log grant creation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'grant.instance',
      resource: 'instance',
      resourceId: body.instanceId,
      details: { grantedUserId: body.userId, permissions: body },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: grant }, 201);
  },
);

// PUT /api/v3/instance-grants/:id - Update instance grant
instanceGrantRoutes.put(
  '/instance-grants/:id',
  authMiddleware,
  requirePermission('instances', 'admin'),
  validationMiddleware(
    z.object({
      canRead: z.boolean().optional(),
      canWrite: z.boolean().optional(),
      canManage: z.boolean().optional(),
      canAdmin: z.boolean().optional(),
      expiresAt: z.string().datetime().optional().nullable(),
    }),
  ),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const grant = await grantService.updateInstanceGrant(id, body);
    
    // Log grant update
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'grant.instance',
      resource: 'instance',
      resourceId: grant.instanceId,
      details: { grantId: id, updates: body },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: grant });
  },
);

// DELETE /api/v3/instance-grants/:id - Delete instance grant
instanceGrantRoutes.delete(
  '/instance-grants/:id',
  authMiddleware,
  requirePermission('instances', 'admin'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const currentUser = c.get('user');
    const grant = await grantService.deleteInstanceGrant(id);
    
    // Log grant revocation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'grant.revoke',
      resource: 'instance',
      resourceId: grant.instanceId,
      details: { grantId: id, revokedUserId: grant.userId },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ success: true });
  },
);

export default instanceGrantRoutes;
```

### Series Grant API

```typescript
// backend/api/routes/seriesGrants.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { grantService } from '@/core/grants/services/grant.service';
import { auditLogService } from '@/core/acl/services/auditLog.service';
import { authMiddleware, requirePermission } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const seriesGrantRoutes = new Hono();

// GET /api/v3/series-grants - List all series grants
seriesGrantRoutes.get(
  '/series-grants',
  authMiddleware,
  requirePermission('series', 'read'),
  async (c) => {
    const userId = c.req.query('userId') ? Number(c.req.query('userId')) : undefined;
    const seriesId = c.req.query('seriesId') ? Number(c.req.query('seriesId')) : undefined;
    const grants = await grantService.getSeriesGrants({ userId, seriesId });
    return c.json({ data: grants });
  },
);

// POST /api/v3/series-grants - Create series grant
seriesGrantRoutes.post(
  '/series-grants',
  authMiddleware,
  requirePermission('series', 'admin'),
  validationMiddleware(
    z.object({
      userId: z.number().int(),
      instanceId: z.number().int(),
      seriesId: z.number().int(),
      canRead: z.boolean().default(true),
      canWrite: z.boolean().default(false),
      canDelete: z.boolean().default(false),
      canManage: z.boolean().default(false),
      expiresAt: z.string().datetime().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const grant = await grantService.createSeriesGrant(body);
    
    // Log grant creation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'grant.series',
      resource: 'series',
      resourceId: body.seriesId,
      details: { grantedUserId: body.userId, instanceId: body.instanceId, permissions: body },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: grant }, 201);
  },
);

// PUT /api/v3/series-grants/:id - Update series grant
seriesGrantRoutes.put(
  '/series-grants/:id',
  authMiddleware,
  requirePermission('series', 'admin'),
  validationMiddleware(
    z.object({
      canRead: z.boolean().optional(),
      canWrite: z.boolean().optional(),
      canDelete: z.boolean().optional(),
      canManage: z.boolean().optional(),
      expiresAt: z.string().datetime().optional().nullable(),
    }),
  ),
  async (c) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const currentUser = c.get('user');
    const grant = await grantService.updateSeriesGrant(id, body);
    
    // Log grant update
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'grant.series',
      resource: 'series',
      resourceId: grant.seriesId,
      details: { grantId: id, updates: body },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ data: grant });
  },
);

// DELETE /api/v3/series-grants/:id - Delete series grant
seriesGrantRoutes.delete(
  '/series-grants/:id',
  authMiddleware,
  requirePermission('series', 'admin'),
  async (c) => {
    const id = Number(c.req.param('id'));
    const currentUser = c.get('user');
    const grant = await grantService.deleteSeriesGrant(id);
    
    // Log grant revocation
    await auditLogService.log({
      userId: currentUser.id,
      username: currentUser.username,
      action: 'grant.revoke',
      resource: 'series',
      resourceId: grant.seriesId,
      details: { grantId: id, revokedUserId: grant.userId },
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    
    return c.json({ success: true });
  },
);

export default seriesGrantRoutes;
```

### Audit Log API

```typescript
// backend/api/routes/auditLog.routes.ts

import { Hono } from 'hono';
import { z } from 'zod';
import { auditLogService } from '@/core/acl/services/auditLog.service';
import { authMiddleware, requirePermission, requireAdmin } from '@/middleware/authorization.middleware';
import { validationMiddleware } from '@/middleware/validation.middleware';

const auditLogRoutes = new Hono();

// GET /api/v3/audit-log - Get audit log entries (admin only)
auditLogRoutes.get(
  '/audit-log',
  authMiddleware,
  requirePermission('audit-log', 'read'),
  validationMiddleware(
    z.object({
      userId: z.coerce.number().optional(),
      action: z.string().optional(),
      resource: z.string().optional(),
      resourceId: z.coerce.number().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      limit: z.coerce.number().int().min(1).max(1000).default(100),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  ),
  async (c) => {
    const filters = c.req.valid('query');
    const logs = await auditLogService.getLogs({
      userId: filters.userId,
      action: filters.action as any,
      resource: filters.resource,
      resourceId: filters.resourceId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: filters.limit,
      offset: filters.offset,
    });
    return c.json({ data: logs });
  },
);

// DELETE /api/v3/audit-log - Delete audit log entries (admin only)
auditLogRoutes.delete(
  '/audit-log',
  authMiddleware,
  requirePermission('audit-log', 'delete'),
  validationMiddleware(
    z.object({
      olderThanDays: z.coerce.number().int().min(1).max(3650).default(90),
    }),
  ),
  async (c) => {
    const { olderThanDays } = c.req.valid('query');
    await auditLogService.deleteOldEntries(olderThanDays);
    return c.json({ success: true });
  },
);

export default auditLogRoutes;
```

---

## Frontend Design

### Login Page

```typescript
// frontend/app/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLogin } from '@/hooks/useAuth';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().default(false),
});

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });
  
  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    
    try {
      await loginMutation.mutateAsync(values);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Sonarr</h1>
          <p className="mt-2 text-gray-400">Sign in to your account</p>
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              {...form.register('username')}
              className="mt-1"
            />
            {form.formState.errors.username && (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.username.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              className="mt-1"
            />
            {form.formState.errors.password && (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="remember-me" {...form.register('rememberMe')} />
            <Label htmlFor="remember-me">Remember me</Label>
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### User Management Page

```typescript
// frontend/app/users/page.tsx

'use client';

import { useState } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateUserForm } from '@/components/users/CreateUserForm';
import { EditUserForm } from '@/components/users/EditUserForm';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { shield, plus, pencil, trash } from 'lucide-react';

export default function UsersPage() {
  const { data: users } = useUsers();
  const { data: roles } = useRoles();
  const { canCreate, canUpdate, canDelete } = usePermissions('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        
        {canCreate && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <plus className="mr-2 w-4 h-4" />
            Add User
          </Button>
        )}
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles?.map((role) => (
                    <Badge key={role.id} variant="secondary" style={{ backgroundColor: role.color }}>
                      {role.displayName}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    user.status === 'active'
                      ? 'default'
                      : user.status === 'suspended'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setEditDialogOpen(true);
                      }}
                    >
                      <pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <trash className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/users/${user.id}/permissions`)}
                  >
                    <shield className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <CreateUserForm onSuccess={() => setCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <EditUserForm user={selectedUser} onSuccess={() => setEditDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <DeleteUserDialog user={selectedUser} onSuccess={() => setDeleteDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

### Permission Hook

```typescript
// frontend/hooks/usePermissions.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface UserPermissions {
  roles: Array<{ name: string; displayName: string; permissions: string[] }>;
  permissions: string[];
  instanceGrants: Record<number, { read: boolean; write: boolean; manage: boolean; admin: boolean }>;
  seriesGrants: Record<number, { read: boolean; write: boolean; delete: boolean; manage: boolean }>;
}

export function usePermissions() {
  const { data } = useQuery<UserPermissions>({
    queryKey: ['permissions'],
    queryFn: () => apiClient.get('/users/me/permissions').then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const hasPermission = (resource: string, action: string): boolean => {
    return data?.permissions.includes(`${resource}:${action}`) ?? false;
  };
  
  const hasRole = (roleName: string): boolean => {
    return data?.roles.some((role) => role.name === roleName) ?? false;
  };
  
  const hasInstanceAccess = (
    instanceId: number,
    requiredPermission: 'read' | 'write' | 'manage' | 'admin',
  ): boolean => {
    const grant = data?.instanceGrants[instanceId];
    if (!grant) return false;
    
    switch (requiredPermission) {
      case 'read':
        return grant.read;
      case 'write':
        return grant.write || grant.manage || grant.admin;
      case 'manage':
        return grant.manage || grant.admin;
      case 'admin':
        return grant.admin;
      default:
        return false;
    }
  };
  
  const hasSeriesAccess = (
    seriesId: number,
    requiredPermission: 'read' | 'write' | 'delete' | 'manage',
  ): boolean => {
    const grant = data?.seriesGrants[seriesId];
    if (!grant) return false;
    
    switch (requiredPermission) {
      case 'read':
        return grant.read;
      case 'write':
        return grant.write || grant.manage;
      case 'delete':
        return grant.delete || grant.manage;
      case 'manage':
        return grant.manage;
      default:
        return false;
    }
  };
  
  return {
    data,
    hasPermission,
    hasRole,
    hasInstanceAccess,
    hasSeriesAccess,
    canCreate: (resource: string) => hasPermission(resource, 'create'),
    canRead: (resource: string) => hasPermission(resource, 'read'),
    canUpdate: (resource: string) => hasPermission(resource, 'update'),
    canDelete: (resource: string) => hasPermission(resource, 'delete'),
    canManage: (resource: string) => hasPermission(resource, 'manage'),
  };
}
```

### Permission-Based Component

```typescript
// frontend/components/auth/PermissionGuard.tsx

'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  resource: string;
  action: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ resource, action, fallback = null, children }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface RoleGuardProps {
  roleName: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ roleName, fallback = null, children }: RoleGuardProps) {
  const { hasRole } = usePermissions();
  
  if (!hasRole(roleName)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface InstanceAccessGuardProps {
  instanceId: number;
  requiredPermission: 'read' | 'write' | 'manage' | 'admin';
  fallback?: ReactNode;
  children: ReactNode;
}

export function InstanceAccessGuard({
  instanceId,
  requiredPermission,
  fallback = null,
  children,
}: InstanceAccessGuardProps) {
  const { hasInstanceAccess } = usePermissions();
  
  if (!hasInstanceAccess(instanceId, requiredPermission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
```

---

## Default Roles and Permissions

### Administrator Role

```typescript
{
  name: 'admin',
  displayName: 'Administrator',
  description: 'Full access to all resources and settings',
  isSystem: true,
  priority: 100,
  color: '#ef4444',
  permissions: [
    // System
    'system:read', 'system:admin',
    // Settings
    'settings:read', 'settings:update', 'settings:admin',
    // Users
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:admin',
    // Roles
    'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:admin',
    // Audit Log
    'audit-log:read', 'audit-log:delete',
    // Instances
    'instances:read', 'instances:manage', 'instances:admin',
    // Series
    'series:read', 'series:create', 'series:update', 'series:delete', 'series:manage', 'series:admin',
    // Episodes
    'episodes:read', 'episodes:monitor', 'episodes:unmonitor', 'episodes:admin',
    // Queue
    'queue:read', 'queue:manage', 'queue:admin',
    // History
    'history:read', 'history:delete',
    // Releases
    'releases:read', 'releases:search', 'releases:download',
    // Wanted
    'wanted:read', 'wanted:search',
    // Calendar
    'calendar:read',
    // Tags
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    // Quality Profiles
    'quality-profiles:read', 'quality-profiles:create', 'quality-profiles:update', 'quality-profiles:delete',
    // Custom Formats
    'custom-formats:read', 'custom-formats:create', 'custom-formats:update', 'custom-formats:delete',
    // Root Folders
    'root-folders:read', 'root-folders:create', 'root-folders:update', 'root-folders:delete',
    // Indexers
    'indexers:read', 'indexers:create', 'indexers:update', 'indexers:delete',
    // Download Clients
    'download-clients:read', 'download-clients:create', 'download-clients:update', 'download-clients:delete',
    // Notifications
    'notifications:read', 'notifications:create', 'notifications:update', 'notifications:delete',
    // Import Lists
    'import-lists:read', 'import-lists:create', 'import-lists:update', 'import-lists:delete',
    // Media
    'rename:read', 'rename:manage',
    'import:read', 'import:manage',
    'delete:read', 'delete:manage',
    'search:read', 'search:manage',
  ],
}
```

### Moderator Role

```typescript
{
  name: 'moderator',
  displayName: 'Moderator',
  description: 'Can manage series and queue, but not system settings',
  isSystem: true,
  priority: 75,
  color: '#f59e0b',
  permissions: [
    // System
    'system:read',
    // Instances
    'instances:read', 'instances:manage',
    // Series
    'series:read', 'series:create', 'series:update', 'series:delete', 'series:manage',
    // Episodes
    'episodes:read', 'episodes:monitor', 'episodes:unmonitor',
    // Queue
    'queue:read', 'queue:manage',
    // History
    'history:read',
    // Releases
    'releases:read', 'releases:search', 'releases:download',
    // Wanted
    'wanted:read', 'wanted:search',
    // Calendar
    'calendar:read',
    // Tags
    'tags:read',
    // Media
    'rename:read', 'rename:manage',
    'import:read', 'import:manage',
    'delete:read', 'delete:manage',
    'search:read', 'search:manage',
  ],
}
```

### User Role

```typescript
{
  name: 'user',
  displayName: 'User',
  description: 'Can add/edit series and manage own downloads',
  isSystem: true,
  priority: 50,
  color: '#3b82f6',
  permissions: [
    // System
    'system:read',
    // Instances
    'instances:read',
    // Series
    'series:read', 'series:create', 'series:update',
    // Episodes
    'episodes:read', 'episodes:monitor', 'episodes:unmonitor',
    // Queue
    'queue:read',
    // History
    'history:read',
    // Releases
    'releases:read', 'releases:search', 'releases:download',
    // Wanted
    'wanted:read', 'wanted:search',
    // Calendar
    'calendar:read',
    // Tags
    'tags:read',
    // Media
    'rename:read',
    'import:read',
    'search:read', 'search:manage',
  ],
}
```

### Viewer Role

```typescript
{
  name: 'viewer',
  displayName: 'Viewer',
  description: 'Read-only access to series and queue',
  isSystem: true,
  priority: 25,
  color: '#10b981',
  permissions: [
    // System
    'system:read',
    // Instances
    'instances:read',
    // Series
    'series:read',
    // Episodes
    'episodes:read',
    // Queue
    'queue:read',
    // History
    'history:read',
    // Releases
    'releases:read',
    // Wanted
    'wanted:read',
    // Calendar
    'calendar:read',
    // Tags
    'tags:read',
    // Media
    'rename:read',
    'import:read',
  ],
}
```

### API User Role

```typescript
{
  name: 'api-user',
  displayName: 'API User',
  description: 'Limited API access for automation',
  isSystem: true,
  priority: 0,
  color: '#8b5cf6',
  permissions: [
    // Series
    'series:read',
    // Episodes
    'episodes:read',
    // Queue
    'queue:read',
    // Releases
    'releases:read', 'releases:search', 'releases:download',
  ],
}
```

---

## Migration Path

### From Single-User to Multi-User

```sql
-- 1. Create user-related tables
CREATE TABLE user (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMP,
  last_active TIMESTAMP,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret TEXT,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP,
  api_key TEXT UNIQUE,
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  theme TEXT NOT NULL DEFAULT 'dark',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format TEXT NOT NULL DEFAULT '24h',
  default_instance_id INTEGER REFERENCES instance(id),
  instance_preferences JSONB,
  ui_settings JSONB,
  notification_settings JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES user(id),
  updated_by INTEGER REFERENCES user(id)
);

CREATE TABLE role (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  priority INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_role (
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  granted_by INTEGER REFERENCES user(id),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE permission (
  id SERIAL PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permission (
  role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_permission (
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  allow BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by INTEGER REFERENCES user(id),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  PRIMARY KEY (user_id, permission_id)
);

CREATE TABLE user_instance_grant (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  instance_id INTEGER NOT NULL REFERENCES instance(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT TRUE,
  can_write BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage BOOLEAN NOT NULL DEFAULT FALSE,
  can_admin BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by INTEGER REFERENCES user(id),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, instance_id)
);

CREATE TABLE user_series_grant (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  instance_id INTEGER NOT NULL REFERENCES instance(id) ON DELETE CASCADE,
  series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT TRUE,
  can_write BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage BOOLEAN NOT NULL DEFAULT FALSE,
  granted_by INTEGER REFERENCES user(id),
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, series_id)
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id INTEGER,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  instance_id INTEGER,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX idx_user_role_user ON user_role(user_id);
CREATE INDEX idx_user_role_role ON user_role(role_id);
CREATE INDEX idx_role_permission_role ON role_permission(role_id);
CREATE INDEX idx_user_permission_user ON user_permission(user_id);
CREATE INDEX idx_user_instance_grant_user ON user_instance_grant(user_id);
CREATE INDEX idx_user_instance_grant_instance ON user_instance_grant(instance_id);
CREATE INDEX idx_user_series_grant_user ON user_series_grant(user_id);
CREATE INDEX idx_user_series_grant_series ON user_series_grant(series_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- 3. Create default admin user (migrate existing admin user)
INSERT INTO user (username, email, password_hash, status, email_verified, theme)
VALUES (
  'admin',
  'admin@sonarr.local',
  '$2b$10$existing_hash_here', -- Migrate existing password hash
  'active',
  true,
  'dark'
);

-- 4. Create system roles
INSERT INTO role (name, display_name, description, is_system, priority, color) VALUES
('admin', 'Administrator', 'Full access to all resources and settings', true, 100, '#ef4444'),
('moderator', 'Moderator', 'Can manage series and queue, but not system settings', true, 75, '#f59e0b'),
('user', 'User', 'Can add/edit series and manage own downloads', true, 50, '#3b82f6'),
('viewer', 'Viewer', 'Read-only access to series and queue', true, 25, '#10b981'),
('api-user', 'API User', 'Limited API access for automation', true, 0, '#8b5cf6');

-- 5. Create system permissions (see SYSTEM_PERMISSIONS array above)
-- ... (insert all 60+ permissions)

-- 6. Assign all permissions to admin role
INSERT INTO role_permission (role_id, permission_id, granted_at)
SELECT 1, id, NOW() FROM permission;

-- 7. Assign admin role to admin user
INSERT INTO user_role (user_id, role_id, granted_at)
VALUES (1, 1, NOW());

-- 8. Grant admin user access to all instances
INSERT INTO user_instance_grant (user_id, instance_id, can_read, can_write, can_manage, can_admin, granted_at)
SELECT 1, id, true, true, true, true, NOW() FROM instance;
```

---

## Expected Outcomes

### User Experience Improvements

**Before (Single-User):**
- No user accounts or authentication
- Everyone has full admin access
- No audit trail
- No way to restrict access
- Family sharing requires full admin privileges

**After (Multi-User with ACL):**
- Multiple user accounts with authentication
- Role-based access control (admin, moderator, user, viewer)
- Fine-grained permissions per resource
- Audit trail of all user actions
- Family/roommate sharing with restricted access
- API-only users for automation

### Security Improvements

**Access Control:**
- Least privilege principle enforced
- Prevents accidental deletions
- Audit logging for compliance
- Temporary permissions with expiration
- Instance and series-level grants

**Authentication:**
- Secure password hashing (bcrypt)
- Two-factor authentication support
- Session management with Lucia
- API key authentication
- OAuth/JWT support

### Developer Benefits

**Simplified Architecture:**
- Centralized permission checking
- Middleware-based authorization
- Type-safe permission system
- Easy to add new permissions
- Flexible grant system

**Better Testing:**
- Permission-based test suites
- Mock user providers
- Authorization middleware tests

---

## Summary

This multi-user ACL system provides:

1. **Full Multi-User Support**: User accounts with authentication and authorization
2. **Role-Based Access Control (RBAC)**: Predefined and custom roles
3. **Fine-Grained Permissions**: 60+ granular permissions across all resources
4. **Resource-Level Grants**: Instance and series-specific access control
5. **Audit Logging**: Complete audit trail of all user actions
6. **Security**: Password hashing, 2FA, secure session management
7. **Flexibility**: Temporary permissions, permission overrides, custom roles
8. **Migration Path**: Clear path from single-user to multi-user

The ACL system enables family/roommate sharing with proper access control, provides security through least privilege enforcement, and maintains a complete audit trail for compliance.

*End of Multi-User ACL Documentation*
