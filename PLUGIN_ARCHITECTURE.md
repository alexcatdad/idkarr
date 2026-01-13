# Plugin Architecture Specification

> **idkarr** - Extensibility and plugin system specification

## Table of Contents

1. [Overview](#overview)
2. [Plugin Types](#plugin-types)
3. [Plugin Lifecycle](#plugin-lifecycle)
4. [Plugin API](#plugin-api)
5. [Extension Points](#extension-points)
6. [Plugin Development](#plugin-development)
7. [Security Model](#security-model)
8. [Plugin Distribution](#plugin-distribution)

---

## Overview

### Design Goals

1. **Extensibility**: Allow third-party extensions without core modifications
2. **Isolation**: Plugins cannot crash the core application
3. **Security**: Sandboxed execution with explicit permissions
4. **Discoverability**: Easy to find and install community plugins
5. **Compatibility**: Clear versioning and compatibility guarantees

### Plugin Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      idkarr Core                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Plugin Manager                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │  Loader     │  │  Registry   │  │  Sandbox    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌───────────────────────────┼──────────────────────────┐   │
│  │               Extension Points                        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │Indexers│ │Download│ │Metadata│ │Notific │        │   │
│  │  │        │ │Clients │ │Provider│ │ations  │        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────┴────┐         ┌─────┴─────┐        ┌────┴────┐
    │ Plugin  │         │  Plugin   │        │ Plugin  │
    │   A     │         │    B      │        │   C     │
    └─────────┘         └───────────┘        └─────────┘
```

---

## Plugin Types

### Built-in Extension Types

```typescript
type PluginType =
  | 'indexer'           // Custom indexer implementations
  | 'download-client'   // Custom download client
  | 'metadata-provider' // Custom metadata source
  | 'notification'      // Custom notification service
  | 'import-list'       // Custom import list source
  | 'custom-format'     // Custom format detection
  | 'parser-extension'  // Extended release parsing
  | 'ui-component'      // Custom UI components
  | 'workflow'          // Custom automation workflows
  | 'integration';      // Generic integrations

interface PluginTypeDefinition {
  type: PluginType;
  interface: string;
  hooks: string[];
  permissions: Permission[];
}

const pluginTypes: Record<PluginType, PluginTypeDefinition> = {
  indexer: {
    type: 'indexer',
    interface: 'IndexerPlugin',
    hooks: ['search', 'rss', 'download'],
    permissions: ['network', 'cache'],
  },
  'download-client': {
    type: 'download-client',
    interface: 'DownloadClientPlugin',
    hooks: ['add', 'remove', 'status', 'history'],
    permissions: ['network', 'filesystem'],
  },
  notification: {
    type: 'notification',
    interface: 'NotificationPlugin',
    hooks: ['send', 'test'],
    permissions: ['network'],
  },
  // ... other types
};
```

### Plugin Manifest

```typescript
interface PluginManifest {
  // Identity
  id: string;                    // Unique identifier
  name: string;                  // Display name
  version: string;               // Semver version
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;

  // Technical
  type: PluginType;
  main: string;                  // Entry point
  minAppVersion: string;         // Minimum idkarr version
  maxAppVersion?: string;        // Maximum idkarr version

  // Capabilities
  permissions: Permission[];
  configSchema?: JSONSchema;
  routes?: RouteDefinition[];
  hooks?: HookDefinition[];

  // Dependencies
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// Example manifest
const exampleManifest: PluginManifest = {
  id: 'my-custom-indexer',
  name: 'My Custom Indexer',
  version: '1.0.0',
  description: 'Adds support for MyCustomSite indexer',
  author: 'Developer Name',
  license: 'MIT',
  homepage: 'https://github.com/dev/my-custom-indexer',

  type: 'indexer',
  main: 'dist/index.js',
  minAppVersion: '1.0.0',

  permissions: ['network', 'cache'],

  configSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', title: 'API Key' },
      baseUrl: { type: 'string', title: 'Base URL' },
    },
    required: ['apiKey'],
  },
};
```

---

## Plugin Lifecycle

### Lifecycle States

```typescript
enum PluginState {
  DISCOVERED = 'discovered',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  DISABLING = 'disabling',
  DISABLED = 'disabled',
  ERROR = 'error',
  UNINSTALLING = 'uninstalling',
}

interface PluginLifecycleHooks {
  // Called when plugin is first loaded
  onLoad?(): Promise<void>;

  // Called when plugin is being initialized with config
  onInitialize?(config: unknown): Promise<void>;

  // Called when plugin becomes active
  onActivate?(): Promise<void>;

  // Called when plugin is being disabled
  onDeactivate?(): Promise<void>;

  // Called when plugin is being uninstalled
  onUninstall?(): Promise<void>;

  // Called when config changes
  onConfigChange?(newConfig: unknown, oldConfig: unknown): Promise<void>;
}
```

### Plugin Manager

```typescript
class PluginManager {
  private plugins = new Map<string, LoadedPlugin>();
  private registry: PluginRegistry;

  async loadPlugin(manifestPath: string): Promise<LoadedPlugin> {
    // 1. Read and validate manifest
    const manifest = await this.readManifest(manifestPath);
    this.validateManifest(manifest);

    // 2. Check compatibility
    if (!this.isCompatible(manifest)) {
      throw new PluginIncompatibleError(manifest.id, manifest.minAppVersion);
    }

    // 3. Check permissions
    await this.checkPermissions(manifest);

    // 4. Create sandbox
    const sandbox = this.createSandbox(manifest);

    // 5. Load plugin code
    const pluginModule = await sandbox.import(manifest.main);

    // 6. Create plugin instance
    const plugin: LoadedPlugin = {
      manifest,
      instance: new pluginModule.default(),
      state: PluginState.LOADED,
      sandbox,
    };

    // 7. Register plugin
    this.plugins.set(manifest.id, plugin);
    this.registry.register(manifest);

    return plugin;
  }

  async initializePlugin(pluginId: string, config: unknown): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new PluginNotFoundError(pluginId);

    plugin.state = PluginState.INITIALIZING;

    try {
      // Validate config against schema
      if (plugin.manifest.configSchema) {
        this.validateConfig(config, plugin.manifest.configSchema);
      }

      // Call lifecycle hook
      await plugin.instance.onInitialize?.(config);

      plugin.state = PluginState.ACTIVE;
      plugin.config = config;

      this.logger.info(`Plugin ${pluginId} initialized`);
    } catch (error) {
      plugin.state = PluginState.ERROR;
      plugin.error = error;
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new PluginNotFoundError(pluginId);

    plugin.state = PluginState.DISABLING;

    try {
      await plugin.instance.onDeactivate?.();
      plugin.state = PluginState.DISABLED;
    } catch (error) {
      plugin.state = PluginState.ERROR;
      throw error;
    }
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new PluginNotFoundError(pluginId);

    plugin.state = PluginState.UNINSTALLING;

    // Call uninstall hook
    await plugin.instance.onUninstall?.();

    // Cleanup sandbox
    await plugin.sandbox.destroy();

    // Remove from registry
    this.registry.unregister(pluginId);
    this.plugins.delete(pluginId);

    // Delete plugin files
    await this.deletePluginFiles(pluginId);
  }
}
```

---

## Plugin API

### Base Plugin Interface

```typescript
interface Plugin {
  // Lifecycle
  onLoad?(): Promise<void>;
  onInitialize?(config: unknown): Promise<void>;
  onActivate?(): Promise<void>;
  onDeactivate?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onConfigChange?(newConfig: unknown, oldConfig: unknown): Promise<void>;

  // Health
  healthCheck?(): Promise<HealthCheckResult>;
}
```

### Indexer Plugin Interface

```typescript
interface IndexerPlugin extends Plugin {
  readonly capabilities: IndexerCapabilities;

  // Search
  search(query: SearchQuery): Promise<SearchResult[]>;

  // RSS feed
  getRss(categories?: number[]): Promise<SearchResult[]>;

  // Download handling
  getDownloadUrl(release: SearchResult): Promise<string>;

  // Capabilities discovery
  getCapabilities(): Promise<IndexerCapabilities>;

  // Test connection
  testConnection(): Promise<TestResult>;
}

interface IndexerCapabilities {
  searchModes: SearchMode[];
  supportedParams: string[];
  categories: IndexerCategory[];
  rateLimitPerMinute: number;
}

// Example implementation
class MyCustomIndexer implements IndexerPlugin {
  private config: MyIndexerConfig;

  async onInitialize(config: MyIndexerConfig): Promise<void> {
    this.config = config;
    await this.authenticate();
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const url = this.buildSearchUrl(query);
    const response = await this.api.fetch(url);
    return this.parseResults(response);
  }

  async getRss(): Promise<SearchResult[]> {
    const response = await this.api.fetch(`${this.config.baseUrl}/rss`);
    return this.parseResults(response);
  }

  // ... implementation
}
```

### Download Client Plugin Interface

```typescript
interface DownloadClientPlugin extends Plugin {
  readonly protocol: 'usenet' | 'torrent';
  readonly capabilities: DownloadClientCapabilities;

  // Download management
  addDownload(request: AddDownloadRequest): Promise<AddDownloadResult>;
  removeDownload(id: string, deleteFiles?: boolean): Promise<void>;
  pauseDownload(id: string): Promise<void>;
  resumeDownload(id: string): Promise<void>;

  // Status
  getDownloads(): Promise<Download[]>;
  getDownload(id: string): Promise<Download | null>;
  getClientStatus(): Promise<ClientStatus>;

  // History
  getHistory(limit?: number): Promise<HistoryItem[]>;
}
```

### Notification Plugin Interface

```typescript
interface NotificationPlugin extends Plugin {
  readonly supportsHtml: boolean;
  readonly supportsImages: boolean;
  readonly maxMessageLength?: number;

  send(notification: Notification): Promise<void>;
  testNotification(): Promise<TestResult>;
}

// Example: Custom Matrix notification plugin
class MatrixNotificationPlugin implements NotificationPlugin {
  supportsHtml = true;
  supportsImages = true;

  private client: MatrixClient;

  async onInitialize(config: MatrixConfig): Promise<void> {
    this.client = await MatrixClient.create({
      homeserverUrl: config.homeserver,
      accessToken: config.accessToken,
    });
  }

  async send(notification: Notification): Promise<void> {
    await this.client.sendMessage(this.config.roomId, {
      msgtype: 'm.text',
      body: notification.message,
      format: 'org.matrix.custom.html',
      formatted_body: this.formatHtml(notification),
    });
  }

  async testNotification(): Promise<TestResult> {
    try {
      await this.client.sendMessage(this.config.roomId, {
        msgtype: 'm.notice',
        body: 'Test notification from idkarr',
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
```

---

## Extension Points

### Hook System

```typescript
type HookName =
  // Media lifecycle
  | 'series:beforeAdd'
  | 'series:afterAdd'
  | 'series:beforeDelete'
  | 'series:afterDelete'
  | 'episode:beforeImport'
  | 'episode:afterImport'
  | 'movie:beforeAdd'
  | 'movie:afterAdd'

  // Download lifecycle
  | 'download:beforeGrab'
  | 'download:afterGrab'
  | 'download:beforeComplete'
  | 'download:afterComplete'

  // Search
  | 'search:beforeSearch'
  | 'search:afterSearch'
  | 'search:transformResults'

  // Custom
  | 'custom:*';

interface Hook<T = unknown> {
  name: HookName;
  priority: number;
  handler: (context: T) => Promise<T | void>;
}

class HookRegistry {
  private hooks = new Map<HookName, Hook[]>();

  register(hook: Hook): void {
    const existing = this.hooks.get(hook.name) ?? [];
    existing.push(hook);
    existing.sort((a, b) => b.priority - a.priority);
    this.hooks.set(hook.name, existing);
  }

  async execute<T>(name: HookName, context: T): Promise<T> {
    const hooks = this.hooks.get(name) ?? [];
    let result = context;

    for (const hook of hooks) {
      const hookResult = await hook.handler(result);
      if (hookResult !== undefined) {
        result = hookResult;
      }
    }

    return result;
  }
}

// Plugin using hooks
class MyWorkflowPlugin implements Plugin {
  async onActivate(): Promise<void> {
    // Register hooks
    this.api.hooks.register({
      name: 'episode:afterImport',
      priority: 100,
      handler: async (context) => {
        // Custom post-import logic
        await this.runPostImportWorkflow(context.episode);
      },
    });

    this.api.hooks.register({
      name: 'search:transformResults',
      priority: 50,
      handler: async (context) => {
        // Filter or modify search results
        return {
          ...context,
          results: context.results.filter(r => this.meetsCustomCriteria(r)),
        };
      },
    });
  }
}
```

### UI Extensions

```typescript
interface UIExtensionPoint {
  // Where the extension renders
  location: UILocation;

  // Component to render
  component: string;

  // Props passed to component
  props?: Record<string, unknown>;

  // Conditions for showing
  conditions?: UICondition[];
}

type UILocation =
  | 'series:detail:header'
  | 'series:detail:tabs'
  | 'series:list:toolbar'
  | 'movie:detail:header'
  | 'movie:detail:tabs'
  | 'settings:sidebar'
  | 'settings:page'
  | 'activity:queue:item'
  | 'global:header'
  | 'global:sidebar';

// Plugin defining UI extension
const manifest: PluginManifest = {
  // ...
  routes: [
    {
      path: '/plugins/my-plugin/settings',
      component: 'Settings',
    },
  ],
  uiExtensions: [
    {
      location: 'series:detail:tabs',
      component: 'SeriesAnalytics',
      props: { defaultView: 'chart' },
    },
    {
      location: 'settings:sidebar',
      component: 'SettingsLink',
      props: { label: 'My Plugin Settings', href: '/plugins/my-plugin/settings' },
    },
  ],
};
```

---

## Plugin Development

### Development SDK

```typescript
// @idkarr/plugin-sdk

export interface PluginContext {
  // Core services
  readonly api: PluginApi;
  readonly logger: PluginLogger;
  readonly storage: PluginStorage;
  readonly cache: PluginCache;

  // Hooks
  readonly hooks: HookRegistry;

  // Config
  readonly config: unknown;
}

export interface PluginApi {
  // Series
  series: {
    getAll(): Promise<Series[]>;
    getById(id: number): Promise<Series | null>;
    add(series: AddSeriesRequest): Promise<Series>;
    update(id: number, update: Partial<Series>): Promise<Series>;
  };

  // Movies
  movies: {
    getAll(): Promise<Movie[]>;
    getById(id: number): Promise<Movie | null>;
  };

  // Downloads
  downloads: {
    grab(release: GrabRequest): Promise<GrabResult>;
    getQueue(): Promise<QueueItem[]>;
  };

  // Search
  search: {
    searchSeries(seriesId: number): Promise<SearchResult[]>;
    searchMovie(movieId: number): Promise<SearchResult[]>;
  };

  // HTTP client (for external requests)
  http: {
    get(url: string, options?: RequestOptions): Promise<Response>;
    post(url: string, body: unknown, options?: RequestOptions): Promise<Response>;
  };
}

export interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface PluginCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Plugin Template

```typescript
// src/index.ts
import { Plugin, PluginContext, IndexerPlugin } from '@idkarr/plugin-sdk';

interface MyPluginConfig {
  apiKey: string;
  baseUrl: string;
}

export default class MyIndexerPlugin implements IndexerPlugin {
  private ctx: PluginContext;
  private config: MyPluginConfig;

  readonly capabilities = {
    searchModes: ['search', 'tv-search'],
    supportedParams: ['q', 'tvdbid', 'season', 'ep'],
    categories: [{ id: 5000, name: 'TV' }],
    rateLimitPerMinute: 30,
  };

  async onInitialize(config: MyPluginConfig): Promise<void> {
    this.config = config;
    this.ctx.logger.info('Initializing MyIndexerPlugin');
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    const response = await this.ctx.api.http.get(
      `${this.config.baseUrl}/api/search`,
      {
        params: {
          apikey: this.config.apiKey,
          q: query.searchTerm,
        },
      }
    );

    const data = await response.json();
    return this.parseResults(data);
  }

  async getRss(): Promise<SearchResult[]> {
    const response = await this.ctx.api.http.get(
      `${this.config.baseUrl}/api/rss`,
      {
        params: { apikey: this.config.apiKey },
      }
    );

    const data = await response.json();
    return this.parseResults(data);
  }

  async getDownloadUrl(release: SearchResult): Promise<string> {
    return `${this.config.baseUrl}/api/download/${release.guid}?apikey=${this.config.apiKey}`;
  }

  async testConnection(): Promise<TestResult> {
    try {
      const response = await this.ctx.api.http.get(
        `${this.config.baseUrl}/api/caps`,
        { params: { apikey: this.config.apiKey } }
      );

      if (response.ok) {
        return { success: true };
      }

      return {
        success: false,
        message: `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private parseResults(data: unknown): SearchResult[] {
    // Parse API response to SearchResult format
    // ...
  }
}
```

---

## Security Model

### Permission System

```typescript
type Permission =
  | 'network'           // Make HTTP requests
  | 'filesystem'        // Read/write files
  | 'database'          // Direct database access
  | 'cache'             // Use caching system
  | 'storage'           // Plugin-specific storage
  | 'hooks'             // Register hooks
  | 'ui'                // Add UI extensions
  | 'notifications'     // Send notifications
  | 'series:read'       // Read series data
  | 'series:write'      // Modify series
  | 'movies:read'       // Read movie data
  | 'movies:write'      // Modify movies
  | 'downloads:read'    // Read download queue
  | 'downloads:write'   // Add/remove downloads
  | 'settings:read'     // Read settings
  | 'settings:write';   // Modify settings

interface PermissionRequest {
  permission: Permission;
  reason: string;
  optional?: boolean;
}

class PermissionManager {
  private granted = new Map<string, Set<Permission>>();

  async requestPermissions(
    pluginId: string,
    requests: PermissionRequest[]
  ): Promise<void> {
    const required = requests.filter(r => !r.optional);
    const optional = requests.filter(r => r.optional);

    // Required permissions must be approved
    for (const request of required) {
      const approved = await this.promptUser(pluginId, request);
      if (!approved) {
        throw new PermissionDeniedError(pluginId, request.permission);
      }
      this.grant(pluginId, request.permission);
    }

    // Optional permissions can be denied
    for (const request of optional) {
      const approved = await this.promptUser(pluginId, request);
      if (approved) {
        this.grant(pluginId, request.permission);
      }
    }
  }

  hasPermission(pluginId: string, permission: Permission): boolean {
    return this.granted.get(pluginId)?.has(permission) ?? false;
  }

  private grant(pluginId: string, permission: Permission): void {
    const perms = this.granted.get(pluginId) ?? new Set();
    perms.add(permission);
    this.granted.set(pluginId, perms);
  }
}
```

### Sandboxing

```typescript
class PluginSandbox {
  private context: vm.Context;
  private permissions: Set<Permission>;

  constructor(manifest: PluginManifest) {
    this.permissions = new Set(manifest.permissions);
    this.context = this.createContext(manifest);
  }

  private createContext(manifest: PluginManifest): vm.Context {
    const sandbox: Record<string, unknown> = {
      // Safe globals
      console: this.createSafeConsole(manifest.id),
      setTimeout: this.createSafeTimeout(),
      setInterval: this.createSafeInterval(),
      clearTimeout,
      clearInterval,
      Buffer,
      TextEncoder,
      TextDecoder,
      URL,
      URLSearchParams,

      // Plugin API (permission-gated)
      idkarr: this.createPluginApi(manifest),
    };

    // Block dangerous globals
    const blocked = ['process', 'require', 'eval', 'Function', '__dirname', '__filename'];
    for (const name of blocked) {
      sandbox[name] = undefined;
    }

    return vm.createContext(sandbox);
  }

  private createPluginApi(manifest: PluginManifest): PluginApi {
    return {
      http: this.permissions.has('network')
        ? new SandboxedHttpClient(manifest.id)
        : this.blockedApi('network'),

      storage: this.permissions.has('storage')
        ? new SandboxedStorage(manifest.id)
        : this.blockedApi('storage'),

      series: {
        getAll: this.permissions.has('series:read')
          ? () => this.seriesService.getAll()
          : this.blockedApi('series:read'),
        // ... other methods
      },
      // ... other services
    };
  }

  private blockedApi(permission: Permission): () => never {
    return () => {
      throw new PermissionDeniedError(`Missing permission: ${permission}`);
    };
  }

  async import(modulePath: string): Promise<unknown> {
    const code = await Bun.file(modulePath).text();

    // Execute in sandbox
    const script = new vm.Script(code, { filename: modulePath });
    return script.runInContext(this.context);
  }
}
```

---

## Plugin Distribution

### Plugin Registry

```typescript
interface PluginRegistryEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  type: PluginType;
  downloads: number;
  rating: number;
  verified: boolean;
  downloadUrl: string;
  homepage?: string;
  repository?: string;
  minAppVersion: string;
  maxAppVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

class PluginRegistry {
  private readonly registryUrl = 'https://plugins.idkarr.app/api';

  async search(query: string, type?: PluginType): Promise<PluginRegistryEntry[]> {
    const params = new URLSearchParams({ q: query });
    if (type) params.set('type', type);

    const response = await fetch(`${this.registryUrl}/plugins?${params}`);
    return response.json();
  }

  async getPlugin(id: string): Promise<PluginRegistryEntry> {
    const response = await fetch(`${this.registryUrl}/plugins/${id}`);
    return response.json();
  }

  async install(id: string): Promise<void> {
    const entry = await this.getPlugin(id);

    // Download plugin package
    const packagePath = await this.downloadPackage(entry.downloadUrl);

    // Verify signature
    await this.verifySignature(packagePath, entry);

    // Extract to plugins directory
    await this.extractPlugin(packagePath, id);

    // Load plugin
    await this.pluginManager.loadPlugin(`plugins/${id}/manifest.json`);
  }

  private async verifySignature(
    packagePath: string,
    entry: PluginRegistryEntry
  ): Promise<void> {
    if (!entry.verified) return;

    const signature = await this.fetchSignature(entry.id, entry.version);
    const isValid = await this.crypto.verify(packagePath, signature);

    if (!isValid) {
      throw new PluginSignatureError(entry.id);
    }
  }
}
```

### Plugin Updates

```typescript
class PluginUpdater {
  async checkForUpdates(): Promise<PluginUpdate[]> {
    const installed = await this.pluginManager.getInstalledPlugins();
    const updates: PluginUpdate[] = [];

    for (const plugin of installed) {
      const latest = await this.registry.getPlugin(plugin.manifest.id);

      if (semver.gt(latest.version, plugin.manifest.version)) {
        // Check compatibility
        if (this.isCompatible(latest)) {
          updates.push({
            pluginId: plugin.manifest.id,
            currentVersion: plugin.manifest.version,
            latestVersion: latest.version,
            changelog: await this.fetchChangelog(plugin.manifest.id, latest.version),
          });
        }
      }
    }

    return updates;
  }

  async updatePlugin(pluginId: string): Promise<void> {
    const plugin = await this.pluginManager.getPlugin(pluginId);

    // Disable plugin
    await this.pluginManager.disablePlugin(pluginId);

    // Backup current version
    await this.backupPlugin(pluginId);

    try {
      // Install new version
      await this.registry.install(pluginId);

      // Re-initialize with existing config
      await this.pluginManager.initializePlugin(pluginId, plugin.config);
    } catch (error) {
      // Rollback on failure
      await this.restoreBackup(pluginId);
      throw error;
    }
  }
}
```

---

## Related Documents

- [DEEP_ARCHITECTURE.md](./DEEP_ARCHITECTURE.md) - System architecture
- [INTEGRATION_SPECIFICATIONS.md](./INTEGRATION_SPECIFICATIONS.md) - Built-in integrations
- [SECURITY.md](./SECURITY.md) - Security model
- [REST_API.md](./REST_API.md) - API reference
