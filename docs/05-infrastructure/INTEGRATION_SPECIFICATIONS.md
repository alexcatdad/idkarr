# Integration Specifications

> **idkarr** - Complete external service integration specifications

## Table of Contents

1. [Overview](#overview)
2. [Download Clients](#download-clients)
3. [Indexers](#indexers)
4. [Media Servers](#media-servers)
5. [Notification Services](#notification-services)
6. [Metadata Providers](#metadata-providers)
7. [List Providers](#list-providers)
8. [Import Lists](#import-lists)
9. [Webhooks](#webhooks)
10. [Custom Scripts](#custom-scripts)

---

## Overview

### Integration Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                       idkarr Core                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Download   │  │  Indexer    │  │  Media      │            │
│  │  Client     │  │  Manager    │  │  Server     │            │
│  │  Manager    │  │             │  │  Manager    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                    │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐            │
│  │  Adapter    │  │  Adapter    │  │  Adapter    │            │
│  │  Layer      │  │  Layer      │  │  Layer      │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┴──────┘            │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
    ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐
    │ qBit/rTor │    │ Prowlarr  │    │  Plex/    │
    │ SABnzbd   │    │ Jackett   │    │  Jellyfin │
    │ NZBGet    │    │ Native    │    │  Emby     │
    └───────────┘    └───────────┘    └───────────┘
```

### Common Integration Interface

```typescript
interface Integration<TConfig, TTestResult> {
  // Metadata
  readonly id: string;
  readonly name: string;
  readonly type: IntegrationType;
  readonly version: string;

  // Configuration
  readonly configSchema: ZodSchema<TConfig>;
  readonly defaultConfig: Partial<TConfig>;

  // Lifecycle
  initialize(config: TConfig): Promise<void>;
  testConnection(): Promise<TTestResult>;
  destroy(): Promise<void>;

  // Health
  getHealth(): Promise<IntegrationHealth>;
}

type IntegrationType =
  | 'download_client'
  | 'indexer'
  | 'media_server'
  | 'notification'
  | 'metadata'
  | 'list_provider'
  | 'webhook';

interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: Date;
  details?: Record<string, unknown>;
}
```

---

## Download Clients

### Supported Clients

| Client | Protocol | Priority Support | Category Support | API Version |
|--------|----------|------------------|------------------|-------------|
| qBittorrent | BitTorrent | ✅ | ✅ | v2.8+ |
| rTorrent | BitTorrent | ✅ | ✅ (labels) | XML-RPC |
| Transmission | BitTorrent | ✅ | ✅ (location) | RPC 16+ |
| Deluge | BitTorrent | ✅ | ✅ (labels) | v2.0+ |
| SABnzbd | Usenet | ✅ | ✅ | v3.0+ |
| NZBGet | Usenet | ✅ | ✅ | v21+ |
| Aria2 | Multi | ⚠️ Limited | ❌ | JSON-RPC |
| Download Station | Multi | ✅ | ✅ | DSM 6+ |

### Download Client Interface

```typescript
interface DownloadClient extends Integration<DownloadClientConfig, DownloadClientTestResult> {
  readonly protocol: 'torrent' | 'usenet' | 'multi';
  readonly capabilities: DownloadClientCapabilities;

  // Core Operations
  addDownload(request: AddDownloadRequest): Promise<AddDownloadResponse>;
  removeDownload(id: string, deleteData?: boolean): Promise<void>;
  getDownloads(): Promise<Download[]>;
  getDownload(id: string): Promise<Download | null>;

  // Status Management
  pauseDownload(id: string): Promise<void>;
  resumeDownload(id: string): Promise<void>;

  // Category/Label Management
  setCategory(id: string, category: string): Promise<void>;

  // Priority Management
  setPriority(id: string, priority: DownloadPriority): Promise<void>;

  // Post-processing
  getCompletedPath(id: string): Promise<string>;
}

interface DownloadClientCapabilities {
  supportsCategories: boolean;
  supportsLabels: boolean;
  supportsPriorities: boolean;
  supportsRateLimits: boolean;
  supportsMagnetLinks: boolean;
  supportsTorrentFiles: boolean;
  supportsNzb: boolean;
  supportsRemoveAndDelete: boolean;
  supportsPathMapping: boolean;
}

interface DownloadClientConfig {
  host: string;
  port: number;
  useSsl: boolean;
  urlBase?: string;
  username?: string;
  password?: string;
  apiKey?: string;

  // Category configuration
  tvCategory: string;
  movieCategory: string;
  animeCategory: string;

  // Priority mapping
  priorityMapping: {
    high: number;
    normal: number;
    low: number;
  };

  // Path mapping (for Docker/remote setups)
  remotePathMappings: Array<{
    host: string;
    remotePath: string;
    localPath: string;
  }>;

  // Behavior
  removeCompletedDownloads: boolean;
  removeFailedDownloads: boolean;
}
```

### qBittorrent Integration

```typescript
interface QBittorrentConfig extends DownloadClientConfig {
  // qBittorrent specific
  firstAndLastPiecePriority: boolean;
  sequentialDownload: boolean;
  initialState: 'start' | 'pause' | 'force_start';
}

class QBittorrentClient implements DownloadClient {
  private sid?: string; // Session ID
  private baseUrl: string;

  async authenticate(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      body: new URLSearchParams({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    // Extract SID from cookies
    this.sid = response.headers.get('set-cookie')?.match(/SID=([^;]+)/)?.[1];
  }

  async addDownload(request: AddDownloadRequest): Promise<AddDownloadResponse> {
    const formData = new FormData();

    if (request.magnetLink) {
      formData.append('urls', request.magnetLink);
    } else if (request.torrentFile) {
      formData.append('torrents', new Blob([request.torrentFile]));
    }

    formData.append('category', this.getCategoryForType(request.mediaType));
    formData.append('savepath', request.downloadPath);

    if (this.config.firstAndLastPiecePriority) {
      formData.append('firstLastPiecePrio', 'true');
    }

    const response = await this.request('/api/v2/torrents/add', {
      method: 'POST',
      body: formData,
    });

    return {
      success: response.ok,
      downloadId: request.hash,
    };
  }

  async getDownloads(): Promise<Download[]> {
    const torrents = await this.request('/api/v2/torrents/info');

    return torrents.map(this.mapTorrentToDownload);
  }

  private mapTorrentToDownload(torrent: QBTorrent): Download {
    return {
      id: torrent.hash,
      title: torrent.name,
      status: this.mapStatus(torrent.state),
      progress: torrent.progress,
      size: torrent.total_size,
      sizeleft: torrent.amount_left,
      downloadSpeed: torrent.dlspeed,
      uploadSpeed: torrent.upspeed,
      eta: torrent.eta === 8640000 ? null : torrent.eta,
      category: torrent.category,
      savePath: torrent.save_path,
      contentPath: torrent.content_path,
      addedOn: new Date(torrent.added_on * 1000),
      completedOn: torrent.completion_on > 0
        ? new Date(torrent.completion_on * 1000)
        : null,
      ratio: torrent.ratio,
      seedingTime: torrent.seeding_time,
      trackerStatus: torrent.tracker,
      message: torrent.state,
    };
  }

  private mapStatus(state: string): DownloadStatus {
    const statusMap: Record<string, DownloadStatus> = {
      'downloading': 'downloading',
      'stalledDL': 'downloading',
      'metaDL': 'downloading',
      'forcedDL': 'downloading',
      'uploading': 'seeding',
      'stalledUP': 'seeding',
      'forcedUP': 'seeding',
      'pausedDL': 'paused',
      'pausedUP': 'paused',
      'queuedDL': 'queued',
      'queuedUP': 'queued',
      'checkingDL': 'checking',
      'checkingUP': 'checking',
      'checkingResumeData': 'checking',
      'error': 'error',
      'missingFiles': 'error',
      'unknown': 'unknown',
    };

    return statusMap[state] ?? 'unknown';
  }
}
```

### SABnzbd Integration

```typescript
interface SABnzbdConfig extends DownloadClientConfig {
  // SABnzbd specific
  recentTvPriority: SABPriority;
  olderTvPriority: SABPriority;
  recentMoviePriority: SABPriority;
  olderMoviePriority: SABPriority;
}

type SABPriority = -100 | -2 | -1 | 0 | 1 | 2;

class SABnzbdClient implements DownloadClient {
  async addDownload(request: AddDownloadRequest): Promise<AddDownloadResponse> {
    const params = new URLSearchParams({
      mode: 'addurl',
      name: request.nzbUrl || '',
      cat: this.getCategoryForType(request.mediaType),
      priority: this.getPriority(request).toString(),
      output: 'json',
      apikey: this.config.apiKey!,
    });

    if (request.nzbFile) {
      // Use multipart for file upload
      const formData = new FormData();
      formData.append('mode', 'addfile');
      formData.append('cat', this.getCategoryForType(request.mediaType));
      formData.append('nzbfile', new Blob([request.nzbFile]), 'download.nzb');
      formData.append('apikey', this.config.apiKey!);

      const response = await fetch(`${this.baseUrl}/api`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return {
        success: data.status,
        downloadId: data.nzo_ids?.[0],
      };
    }

    const response = await fetch(`${this.baseUrl}/api?${params}`);
    const data = await response.json();

    return {
      success: data.status,
      downloadId: data.nzo_ids?.[0],
    };
  }

  async getDownloads(): Promise<Download[]> {
    const [queue, history] = await Promise.all([
      this.getQueue(),
      this.getHistory(),
    ]);

    return [...queue, ...history];
  }

  private async getQueue(): Promise<Download[]> {
    const response = await this.request({
      mode: 'queue',
      output: 'json',
    });

    return response.queue.slots.map(this.mapQueueSlot);
  }

  private async getHistory(): Promise<Download[]> {
    const response = await this.request({
      mode: 'history',
      limit: 30,
      output: 'json',
    });

    return response.history.slots.map(this.mapHistorySlot);
  }
}
```

### rTorrent/ruTorrent Integration

```typescript
interface RTorrentConfig extends DownloadClientConfig {
  xmlRpcPath: string;
  addStopped: boolean;
  directory?: string;
}

class RTorrentClient implements DownloadClient {
  private client: XMLRPCClient;

  async addDownload(request: AddDownloadRequest): Promise<AddDownloadResponse> {
    const commands: string[] = [];

    // Set download directory
    if (request.downloadPath) {
      commands.push(`d.directory.set="${request.downloadPath}"`);
    }

    // Set label (category equivalent)
    const label = this.getCategoryForType(request.mediaType);
    commands.push(`d.custom1.set="${label}"`);

    // Add torrent
    if (request.magnetLink) {
      await this.client.call('load.start', ['', request.magnetLink, ...commands]);
    } else if (request.torrentFile) {
      const base64 = Buffer.from(request.torrentFile).toString('base64');
      await this.client.call('load.raw_start', ['', base64, ...commands]);
    }

    return {
      success: true,
      downloadId: request.hash,
    };
  }

  async getDownloads(): Promise<Download[]> {
    const torrents = await this.client.call('d.multicall2', [
      '',
      'main',
      'd.hash=',
      'd.name=',
      'd.size_bytes=',
      'd.bytes_done=',
      'd.down.rate=',
      'd.up.rate=',
      'd.ratio=',
      'd.state=',
      'd.complete=',
      'd.directory=',
      'd.custom1=', // Label
      'd.message=',
      'd.creation_date=',
      'd.timestamp.finished=',
    ]);

    return torrents.map(this.mapTorrentArray);
  }

  private mapTorrentArray(arr: unknown[]): Download {
    const [
      hash, name, size, bytesComplete, downloadRate, uploadRate,
      ratio, state, complete, directory, label, message,
      addedOn, completedOn
    ] = arr;

    return {
      id: hash as string,
      title: name as string,
      status: this.mapState(state as number, complete as number),
      progress: (bytesComplete as number) / (size as number),
      size: size as number,
      sizeleft: (size as number) - (bytesComplete as number),
      downloadSpeed: downloadRate as number,
      uploadSpeed: uploadRate as number,
      ratio: (ratio as number) / 1000, // rTorrent stores ratio * 1000
      category: label as string,
      savePath: directory as string,
      addedOn: new Date((addedOn as number) * 1000),
      completedOn: completedOn
        ? new Date((completedOn as number) * 1000)
        : null,
      message: message as string,
    };
  }
}
```

---

## Indexers

### Indexer Interface

```typescript
interface Indexer extends Integration<IndexerConfig, IndexerTestResult> {
  readonly protocol: 'torrent' | 'usenet';
  readonly capabilities: IndexerCapabilities;

  // Search operations
  search(query: SearchQuery): Promise<SearchResult[]>;

  // RSS operations
  getRss(categories?: number[]): Promise<SearchResult[]>;

  // Download
  download(release: SearchResult): Promise<DownloadResult>;
}

interface IndexerCapabilities {
  searchModes: SearchMode[];
  categories: IndexerCategory[];
  supportsRawSearch: boolean;
  supportsImdbSearch: boolean;
  supportsTvdbSearch: boolean;
  supportsTmdbSearch: boolean;
  supportsTvmazeSearch: boolean;
  supportsSeasonSearch: boolean;
  supportsEpisodeSearch: boolean;
  supportsDailySearch: boolean;
  supportsAnimeSearch: boolean;
}

type SearchMode = 'search' | 'tv-search' | 'movie-search' | 'music-search' | 'book-search';

interface SearchQuery {
  type: 'series' | 'movie' | 'season' | 'episode' | 'daily' | 'anime';
  searchTerm?: string;

  // IDs
  tvdbId?: number;
  imdbId?: string;
  tmdbId?: number;
  tvmazeId?: number;

  // Episode info
  season?: number;
  episode?: number | number[];
  airDate?: string; // YYYY-MM-DD
  absoluteEpisode?: number;

  // Categories
  categories: number[];

  // Limits
  limit?: number;
  offset?: number;
}

interface SearchResult {
  indexerId: number;
  indexerName: string;
  guid: string;
  title: string;
  size: number;
  publishDate: Date;
  downloadUrl: string;
  infoUrl?: string;

  // Quality info (parsed)
  quality?: QualityInfo;

  // Torrent specific
  seeders?: number;
  leechers?: number;
  protocol: 'torrent' | 'usenet';

  // Usenet specific
  age?: number; // days
  grabs?: number;

  // Categories
  categories: number[];

  // Additional info
  imdbId?: string;
  tvdbId?: number;
  tvmazeId?: number;

  // Flags
  freeleech?: boolean;
  internal?: boolean;
  scene?: boolean;
  proper?: boolean;
  repack?: boolean;
}
```

### Prowlarr Integration

```typescript
interface ProwlarrConfig extends IndexerConfig {
  baseUrl: string;
  apiKey: string;
  syncLevel: 'disabled' | 'add_remove' | 'full';
  syncCategories: number[];
  tagIds?: number[];
}

class ProwlarrIndexer implements Indexer {
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      type: this.mapQueryType(query.type),
    });

    if (query.searchTerm) {
      params.append('query', query.searchTerm);
    }

    // Add IDs
    if (query.tvdbId) params.append('tvdbId', query.tvdbId.toString());
    if (query.imdbId) params.append('imdbId', query.imdbId);
    if (query.tmdbId) params.append('tmdbId', query.tmdbId.toString());

    // Add episode info
    if (query.season) params.append('season', query.season.toString());
    if (query.episode) {
      if (Array.isArray(query.episode)) {
        params.append('episode', query.episode.join(','));
      } else {
        params.append('episode', query.episode.toString());
      }
    }

    // Categories
    params.append('categories', query.categories.join(','));

    const response = await fetch(
      `${this.config.baseUrl}/api/v1/search?${params}`,
      {
        headers: {
          'X-Api-Key': this.config.apiKey,
        },
      }
    );

    const results = await response.json();
    return results.map(this.mapSearchResult);
  }

  async syncIndexers(): Promise<SyncResult> {
    // Pull indexers from Prowlarr
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/indexer`,
      {
        headers: { 'X-Api-Key': this.config.apiKey },
      }
    );

    const indexers = await response.json();

    // Filter by tags if configured
    const filtered = this.config.tagIds?.length
      ? indexers.filter((i: any) =>
          i.tags.some((t: number) => this.config.tagIds!.includes(t))
        )
      : indexers;

    // Sync to local database
    return this.syncToDatabase(filtered);
  }
}
```

### Torznab/Newznab Generic Implementation

```typescript
interface TorznabConfig extends IndexerConfig {
  baseUrl: string;
  apiKey: string;
  apiPath: string;
  categories: number[];
  additionalParams?: Record<string, string>;
}

class TorznabIndexer implements Indexer {
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      apikey: this.config.apiKey,
      t: this.getSearchType(query),
      extended: '1',
    });

    // Add query term
    if (query.searchTerm) {
      params.append('q', query.searchTerm);
    }

    // Add IDs based on capability
    if (query.tvdbId && this.capabilities.supportsTvdbSearch) {
      params.append('tvdbid', query.tvdbId.toString());
    }
    if (query.imdbId && this.capabilities.supportsImdbSearch) {
      params.append('imdbid', query.imdbId);
    }

    // Add episode info
    if (query.season !== undefined) {
      params.append('season', query.season.toString());
    }
    if (query.episode !== undefined && !Array.isArray(query.episode)) {
      params.append('ep', query.episode.toString());
    }

    // Categories
    params.append('cat', query.categories.join(','));

    // Additional params
    if (this.config.additionalParams) {
      for (const [key, value] of Object.entries(this.config.additionalParams)) {
        params.append(key, value);
      }
    }

    const url = `${this.config.baseUrl}${this.config.apiPath}?${params}`;
    const response = await fetch(url);
    const xml = await response.text();

    return this.parseXmlResponse(xml);
  }

  private parseXmlResponse(xml: string): SearchResult[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(xml);
    const items = parsed.rss?.channel?.item ?? [];

    return (Array.isArray(items) ? items : [items]).map((item: any) => {
      const attrs = this.parseAttributes(item['torznab:attr'] ?? item['newznab:attr']);

      return {
        guid: item.guid?.['#text'] ?? item.guid,
        title: item.title,
        size: parseInt(item.size ?? attrs.size ?? '0'),
        publishDate: new Date(item.pubDate),
        downloadUrl: item.link,
        infoUrl: item.comments,
        seeders: parseInt(attrs.seeders ?? '0'),
        leechers: parseInt(attrs.leechers ?? '0'),
        protocol: 'torrent',
        categories: this.parseCategories(item.category),
        imdbId: attrs.imdb ? `tt${attrs.imdb}` : undefined,
        tvdbId: attrs.tvdbid ? parseInt(attrs.tvdbid) : undefined,
        freeleech: attrs.downloadvolumefactor === '0',
      };
    });
  }

  private parseAttributes(attrs: any[]): Record<string, string> {
    if (!attrs) return {};
    const arr = Array.isArray(attrs) ? attrs : [attrs];

    return arr.reduce((acc, attr) => {
      acc[attr['@_name']] = attr['@_value'];
      return acc;
    }, {} as Record<string, string>);
  }
}
```

### Indexer Category Mapping

```typescript
const NEWZNAB_CATEGORIES = {
  // TV
  TV: 5000,
  TV_FOREIGN: 5020,
  TV_SD: 5030,
  TV_HD: 5040,
  TV_UHD: 5045,
  TV_OTHER: 5050,
  TV_SPORT: 5060,
  TV_ANIME: 5070,
  TV_DOCUMENTARY: 5080,
  TV_WEBDL: 5010,

  // Movies
  MOVIES: 2000,
  MOVIES_FOREIGN: 2010,
  MOVIES_OTHER: 2020,
  MOVIES_SD: 2030,
  MOVIES_HD: 2040,
  MOVIES_UHD: 2045,
  MOVIES_BLURAY: 2050,
  MOVIES_3D: 2060,
  MOVIES_WEBDL: 2070,

  // Audio
  AUDIO: 3000,
  AUDIO_MP3: 3010,
  AUDIO_VIDEO: 3020,
  AUDIO_AUDIOBOOK: 3030,
  AUDIO_LOSSLESS: 3040,
  AUDIO_OTHER: 3050,
  AUDIO_FOREIGN: 3060,
} as const;

const MEDIA_TYPE_TO_CATEGORIES: Record<MediaType, number[]> = {
  tv: [
    NEWZNAB_CATEGORIES.TV,
    NEWZNAB_CATEGORIES.TV_HD,
    NEWZNAB_CATEGORIES.TV_SD,
    NEWZNAB_CATEGORIES.TV_UHD,
    NEWZNAB_CATEGORIES.TV_WEBDL,
  ],
  movie: [
    NEWZNAB_CATEGORIES.MOVIES,
    NEWZNAB_CATEGORIES.MOVIES_HD,
    NEWZNAB_CATEGORIES.MOVIES_SD,
    NEWZNAB_CATEGORIES.MOVIES_UHD,
    NEWZNAB_CATEGORIES.MOVIES_BLURAY,
    NEWZNAB_CATEGORIES.MOVIES_WEBDL,
  ],
  anime: [
    NEWZNAB_CATEGORIES.TV_ANIME,
  ],
};
```

---

## Media Servers

### Media Server Interface

```typescript
interface MediaServer extends Integration<MediaServerConfig, MediaServerTestResult> {
  // Library operations
  getLibraries(): Promise<Library[]>;
  refreshLibrary(libraryId: string): Promise<void>;
  refreshItem(itemId: string): Promise<void>;

  // Scan operations
  scanPath(path: string): Promise<void>;

  // Metadata
  getMetadata(itemId: string): Promise<MediaMetadata>;

  // Playback (for recently watched features)
  getRecentlyWatched(userId?: string, limit?: number): Promise<WatchedItem[]>;

  // Users
  getUsers(): Promise<MediaServerUser[]>;
}

interface Library {
  id: string;
  name: string;
  type: 'tv' | 'movie' | 'music' | 'other';
  paths: string[];
  itemCount: number;
}

interface MediaMetadata {
  id: string;
  title: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  genres: string[];

  // External IDs
  imdbId?: string;
  tmdbId?: number;
  tvdbId?: number;
}
```

### Plex Integration

```typescript
interface PlexConfig extends MediaServerConfig {
  host: string;
  port: number;
  useSsl: boolean;
  authToken: string;
  updateLibrary: boolean;
  useScanner: boolean;
}

class PlexMediaServer implements MediaServer {
  private baseUrl: string;

  async getLibraries(): Promise<Library[]> {
    const response = await this.request('/library/sections');

    return response.MediaContainer.Directory.map((section: any) => ({
      id: section.key,
      name: section.title,
      type: this.mapLibraryType(section.type),
      paths: section.Location.map((l: any) => l.path),
      itemCount: section.count ?? 0,
    }));
  }

  async refreshLibrary(libraryId: string): Promise<void> {
    await this.request(`/library/sections/${libraryId}/refresh`, {
      method: 'POST',
    });
  }

  async scanPath(path: string): Promise<void> {
    // Find library containing path
    const libraries = await this.getLibraries();
    const library = libraries.find(lib =>
      lib.paths.some(p => path.startsWith(p))
    );

    if (!library) {
      throw new Error(`No library found for path: ${path}`);
    }

    // Refresh specific path
    const encodedPath = encodeURIComponent(path);
    await this.request(
      `/library/sections/${library.id}/refresh?path=${encodedPath}`,
      { method: 'POST' }
    );
  }

  async getRecentlyWatched(userId?: string, limit = 20): Promise<WatchedItem[]> {
    const params = new URLSearchParams({
      'type': '4', // Episode
      'unwatched': '0',
      'X-Plex-Container-Start': '0',
      'X-Plex-Container-Size': limit.toString(),
    });

    if (userId) {
      // Switch user context
      const token = await this.getSwitchedUserToken(userId);
      params.append('X-Plex-Token', token);
    }

    const response = await this.request(`/library/recentlyAdded?${params}`);

    return response.MediaContainer.Metadata.map(this.mapToWatchedItem);
  }

  private async request(path: string, options?: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'X-Plex-Token': this.config.authToken,
      'Accept': 'application/json',
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new PlexError(`Plex API error: ${response.status}`, response.status);
    }

    return response.json();
  }
}
```

### Jellyfin Integration

```typescript
interface JellyfinConfig extends MediaServerConfig {
  host: string;
  port: number;
  useSsl: boolean;
  apiKey: string;
  userId?: string;
}

class JellyfinMediaServer implements MediaServer {
  async getLibraries(): Promise<Library[]> {
    const response = await this.request('/Library/VirtualFolders');

    return response.map((folder: any) => ({
      id: folder.ItemId,
      name: folder.Name,
      type: this.mapCollectionType(folder.CollectionType),
      paths: folder.Locations,
      itemCount: 0, // Jellyfin doesn't return count in this endpoint
    }));
  }

  async refreshLibrary(libraryId: string): Promise<void> {
    await this.request(`/Items/${libraryId}/Refresh`, {
      method: 'POST',
      body: JSON.stringify({
        Recursive: true,
        ImageRefreshMode: 'Default',
        MetadataRefreshMode: 'Default',
        ReplaceAllImages: false,
        ReplaceAllMetadata: false,
      }),
    });
  }

  async scanPath(path: string): Promise<void> {
    await this.request('/Library/Media/Updated', {
      method: 'POST',
      body: JSON.stringify({
        Updates: [{
          Path: path,
          UpdateType: 'Created',
        }],
      }),
    });
  }

  async getUsers(): Promise<MediaServerUser[]> {
    const response = await this.request('/Users');

    return response.map((user: any) => ({
      id: user.Id,
      name: user.Name,
      isAdmin: user.Policy?.IsAdministrator ?? false,
    }));
  }

  private async request(path: string, options?: RequestInit): Promise<any> {
    const url = `${this.config.host}:${this.config.port}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Emby-Token': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new JellyfinError(
        `Jellyfin API error: ${response.status}`,
        response.status
      );
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
}
```

### Emby Integration

```typescript
interface EmbyConfig extends MediaServerConfig {
  host: string;
  port: number;
  useSsl: boolean;
  apiKey: string;
}

class EmbyMediaServer implements MediaServer {
  // Emby API is very similar to Jellyfin (Jellyfin is a fork)
  // Implementation follows same patterns with minor differences

  async scanPath(path: string): Promise<void> {
    await this.request('/Library/Media/Updated', {
      method: 'POST',
      body: JSON.stringify({
        Updates: [{
          Path: path,
          UpdateType: 'Created',
        }],
      }),
    });
  }
}
```

---

## Notification Services

### Notification Interface

```typescript
interface NotificationService extends Integration<NotificationConfig, NotificationTestResult> {
  send(notification: Notification): Promise<void>;
}

interface Notification {
  type: NotificationType;
  title: string;
  message: string;

  // Optional rich content
  imageUrl?: string;
  link?: string;

  // Metadata
  mediaType?: 'series' | 'movie' | 'episode';
  mediaTitle?: string;
  mediaYear?: number;
  quality?: string;

  // Event-specific data
  eventData?: Record<string, unknown>;
}

type NotificationType =
  | 'grab'           // Download started
  | 'download'       // Download completed
  | 'upgrade'        // Quality upgrade
  | 'rename'         // File renamed
  | 'series_add'     // Series added
  | 'series_delete'  // Series deleted
  | 'episode_file_delete' // Episode file deleted
  | 'movie_add'      // Movie added
  | 'movie_delete'   // Movie deleted
  | 'movie_file_delete' // Movie file deleted
  | 'health_issue'   // Health check failed
  | 'health_restored' // Health check passed
  | 'app_update'     // Application update available
  | 'manual_test';   // Manual test notification
```

### Supported Notification Services

| Service | On Grab | On Download | On Upgrade | On Health | On Manual |
|---------|---------|-------------|------------|-----------|-----------|
| Discord | ✅ | ✅ | ✅ | ✅ | ✅ |
| Slack | ✅ | ✅ | ✅ | ✅ | ✅ |
| Telegram | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pushover | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gotify | ✅ | ✅ | ✅ | ✅ | ✅ |
| ntfy | ✅ | ✅ | ✅ | ✅ | ✅ |
| Join | ✅ | ✅ | ✅ | ✅ | ✅ |
| Apprise | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhook | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom Script | ✅ | ✅ | ✅ | ✅ | ✅ |

### Discord Integration

```typescript
interface DiscordConfig extends NotificationConfig {
  webhookUrl: string;
  username?: string;
  avatar?: string;

  // Message customization
  onGrabFields: DiscordField[];
  onDownloadFields: DiscordField[];
  includeImage: boolean;
  includeLinkButton: boolean;
}

interface DiscordField {
  name: string;
  value: string;
  inline: boolean;
}

class DiscordNotification implements NotificationService {
  async send(notification: Notification): Promise<void> {
    const embed = this.buildEmbed(notification);

    const payload = {
      username: this.config.username || 'idkarr',
      avatar_url: this.config.avatar,
      embeds: [embed],
    };

    await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private buildEmbed(notification: Notification): DiscordEmbed {
    const color = this.getColorForType(notification.type);

    const embed: DiscordEmbed = {
      title: notification.title,
      description: notification.message,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'idkarr',
        icon_url: 'https://idkarr.com/icon.png',
      },
    };

    // Add thumbnail if available
    if (notification.imageUrl && this.config.includeImage) {
      embed.thumbnail = { url: notification.imageUrl };
    }

    // Add fields based on notification type
    const fields = this.getFieldsForType(notification);
    if (fields.length > 0) {
      embed.fields = fields;
    }

    return embed;
  }

  private getColorForType(type: NotificationType): number {
    const colors: Record<NotificationType, number> = {
      grab: 0x0099ff,      // Blue
      download: 0x00ff00,  // Green
      upgrade: 0x00ff00,   // Green
      rename: 0x808080,    // Gray
      series_add: 0x00ff00,
      series_delete: 0xff0000,
      episode_file_delete: 0xff0000,
      movie_add: 0x00ff00,
      movie_delete: 0xff0000,
      movie_file_delete: 0xff0000,
      health_issue: 0xff0000, // Red
      health_restored: 0x00ff00,
      app_update: 0xffff00, // Yellow
      manual_test: 0x808080,
    };

    return colors[type] ?? 0x808080;
  }
}
```

### Telegram Integration

```typescript
interface TelegramConfig extends NotificationConfig {
  botToken: string;
  chatId: string;

  // Optional settings
  sendSilently: boolean;
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2';
  includeImage: boolean;
}

class TelegramNotification implements NotificationService {
  private readonly apiBase = 'https://api.telegram.org';

  async send(notification: Notification): Promise<void> {
    const text = this.formatMessage(notification);

    if (notification.imageUrl && this.config.includeImage) {
      await this.sendPhoto(notification.imageUrl, text);
    } else {
      await this.sendMessage(text);
    }
  }

  private async sendMessage(text: string): Promise<void> {
    await fetch(`${this.apiBase}/bot${this.config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.config.chatId,
        text,
        parse_mode: this.config.parseMode,
        disable_notification: this.config.sendSilently,
      }),
    });
  }

  private async sendPhoto(imageUrl: string, caption: string): Promise<void> {
    await fetch(`${this.apiBase}/bot${this.config.botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.config.chatId,
        photo: imageUrl,
        caption,
        parse_mode: this.config.parseMode,
        disable_notification: this.config.sendSilently,
      }),
    });
  }

  private formatMessage(notification: Notification): string {
    const emoji = this.getEmojiForType(notification.type);

    if (this.config.parseMode === 'HTML') {
      return `
${emoji} <b>${this.escapeHtml(notification.title)}</b>

${this.escapeHtml(notification.message)}

<i>via idkarr</i>
      `.trim();
    }

    return `${emoji} *${notification.title}*\n\n${notification.message}`;
  }

  private getEmojiForType(type: NotificationType): string {
    const emojis: Record<NotificationType, string> = {
      grab: '⬇️',
      download: '✅',
      upgrade: '⬆️',
      rename: '📝',
      series_add: '➕',
      series_delete: '🗑️',
      episode_file_delete: '🗑️',
      movie_add: '➕',
      movie_delete: '🗑️',
      movie_file_delete: '🗑️',
      health_issue: '⚠️',
      health_restored: '✅',
      app_update: '🔄',
      manual_test: '🔔',
    };

    return emojis[type] ?? '📢';
  }
}
```

### Email Integration

```typescript
interface EmailConfig extends NotificationConfig {
  server: string;
  port: number;
  useSsl: boolean;
  username?: string;
  password?: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
}

class EmailNotification implements NotificationService {
  private transporter: nodemailer.Transporter;

  async send(notification: Notification): Promise<void> {
    const html = this.buildHtmlEmail(notification);
    const text = this.buildTextEmail(notification);

    await this.transporter.sendMail({
      from: this.config.from,
      to: this.config.to.join(', '),
      cc: this.config.cc?.join(', '),
      bcc: this.config.bcc?.join(', '),
      subject: `[idkarr] ${notification.title}`,
      text,
      html,
    });
  }

  private buildHtmlEmail(notification: Notification): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #1a1a2e; color: white; padding: 20px; }
    .content { padding: 20px; background: #f5f5f5; }
    .footer { padding: 10px; text-align: center; font-size: 12px; }
    .poster { max-width: 200px; float: left; margin-right: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${notification.title}</h1>
    </div>
    <div class="content">
      ${notification.imageUrl ? `<img src="${notification.imageUrl}" class="poster" />` : ''}
      <p>${notification.message}</p>
      ${notification.link ? `<p><a href="${notification.link}">View Details</a></p>` : ''}
    </div>
    <div class="footer">
      Sent by idkarr
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
```

---

## Metadata Providers

### Metadata Provider Interface

```typescript
interface MetadataProvider extends Integration<MetadataProviderConfig, MetadataTestResult> {
  readonly providerId: string;
  readonly supportedTypes: MediaType[];

  // Series operations
  searchSeries(query: string): Promise<SeriesSearchResult[]>;
  getSeriesById(id: string): Promise<SeriesMetadata | null>;
  getSeriesByExternalId(externalId: ExternalId): Promise<SeriesMetadata | null>;

  // Movie operations
  searchMovies(query: string): Promise<MovieSearchResult[]>;
  getMovieById(id: string): Promise<MovieMetadata | null>;
  getMovieByExternalId(externalId: ExternalId): Promise<MovieMetadata | null>;

  // Episode operations
  getEpisodes(seriesId: string, seasonNumber?: number): Promise<EpisodeMetadata[]>;
  getEpisode(seriesId: string, season: number, episode: number): Promise<EpisodeMetadata | null>;

  // Images
  getImages(id: string, type: MediaType): Promise<MediaImages>;
}

interface SeriesMetadata {
  id: string;
  title: string;
  sortTitle: string;
  cleanTitle: string;
  originalTitle?: string;

  overview?: string;
  year?: number;
  firstAired?: Date;
  status: SeriesStatus;
  runtime?: number;

  network?: string;
  airTime?: string;
  airDays?: string[];

  genres: string[];
  certification?: string;
  ratings: Rating[];

  // External IDs
  tvdbId?: number;
  imdbId?: string;
  tmdbId?: number;
  tvmazeId?: number;
  tvRageId?: number;

  // Images
  images: MediaImages;

  // Season/episode counts
  seasonCount?: number;
  episodeCount?: number;
}

interface EpisodeMetadata {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  sceneSeasonNumber?: number;
  sceneEpisodeNumber?: number;
  sceneAbsoluteEpisodeNumber?: number;

  title: string;
  overview?: string;
  airDate?: Date;
  airDateUtc?: Date;
  runtime?: number;

  // Images
  images: MediaImages;

  // Ratings
  ratings?: Rating[];

  // Flags
  hasFile?: boolean;
  monitored?: boolean;
}

interface MediaImages {
  poster?: string;
  fanart?: string;
  banner?: string;
  screenshot?: string;
  clearlogo?: string;
  clearart?: string;
  thumb?: string;

  // Multiple images
  posters?: ImageInfo[];
  fanarts?: ImageInfo[];
  banners?: ImageInfo[];
}

interface ImageInfo {
  url: string;
  resolution?: string;
  language?: string;
  voteCount?: number;
  voteAverage?: number;
}
```

### TVDB Integration

```typescript
interface TvdbConfig extends MetadataProviderConfig {
  apiKey: string;
  pin?: string;
}

class TvdbProvider implements MetadataProvider {
  private token?: string;
  private tokenExpiry?: Date;

  async authenticate(): Promise<void> {
    const response = await fetch('https://api4.thetvdb.com/v4/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: this.config.apiKey,
        pin: this.config.pin,
      }),
    });

    const data = await response.json();
    this.token = data.data.token;
    // Token valid for 30 days
    this.tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  async searchSeries(query: string): Promise<SeriesSearchResult[]> {
    await this.ensureAuthenticated();

    const response = await this.request(`/search?query=${encodeURIComponent(query)}&type=series`);

    return response.data.map(this.mapSearchResult);
  }

  async getSeriesById(id: string): Promise<SeriesMetadata | null> {
    await this.ensureAuthenticated();

    const [series, extended] = await Promise.all([
      this.request(`/series/${id}`),
      this.request(`/series/${id}/extended`),
    ]);

    return this.mapSeriesMetadata(series.data, extended.data);
  }

  async getEpisodes(seriesId: string, seasonNumber?: number): Promise<EpisodeMetadata[]> {
    await this.ensureAuthenticated();

    let url = `/series/${seriesId}/episodes/default`;
    if (seasonNumber !== undefined) {
      url += `?season=${seasonNumber}`;
    }

    const response = await this.request(url);

    return response.data.episodes.map(this.mapEpisodeMetadata);
  }

  private async request(path: string): Promise<any> {
    const response = await fetch(`https://api4.thetvdb.com/v4${path}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Re-authenticate and retry
        await this.authenticate();
        return this.request(path);
      }
      throw new TvdbError(`TVDB API error: ${response.status}`, response.status);
    }

    return response.json();
  }
}
```

### TMDB Integration

```typescript
interface TmdbConfig extends MetadataProviderConfig {
  apiKey: string;
  language: string;
  includeAdult: boolean;
}

class TmdbProvider implements MetadataProvider {
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  async searchSeries(query: string): Promise<SeriesSearchResult[]> {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      query,
      language: this.config.language,
      include_adult: this.config.includeAdult.toString(),
    });

    const response = await fetch(`${this.baseUrl}/search/tv?${params}`);
    const data = await response.json();

    return data.results.map(this.mapTvSearchResult);
  }

  async searchMovies(query: string): Promise<MovieSearchResult[]> {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      query,
      language: this.config.language,
      include_adult: this.config.includeAdult.toString(),
    });

    const response = await fetch(`${this.baseUrl}/search/movie?${params}`);
    const data = await response.json();

    return data.results.map(this.mapMovieSearchResult);
  }

  async getMovieById(id: string): Promise<MovieMetadata | null> {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      language: this.config.language,
      append_to_response: 'external_ids,credits,images,release_dates',
    });

    const response = await fetch(`${this.baseUrl}/movie/${id}?${params}`);

    if (response.status === 404) {
      return null;
    }

    const data = await response.json();
    return this.mapMovieMetadata(data);
  }

  async getImages(id: string, type: MediaType): Promise<MediaImages> {
    const endpoint = type === 'movie' ? 'movie' : 'tv';

    const response = await fetch(
      `${this.baseUrl}/${endpoint}/${id}/images?api_key=${this.config.apiKey}`
    );

    const data = await response.json();

    return {
      posters: data.posters.map(this.mapImage),
      fanarts: data.backdrops.map(this.mapImage),
      clearlogos: data.logos?.map(this.mapImage),
    };
  }

  private mapImage(image: any): ImageInfo {
    return {
      url: `https://image.tmdb.org/t/p/original${image.file_path}`,
      resolution: `${image.width}x${image.height}`,
      language: image.iso_639_1,
      voteCount: image.vote_count,
      voteAverage: image.vote_average,
    };
  }
}
```

---

## List Providers

### List Provider Interface

```typescript
interface ListProvider extends Integration<ListProviderConfig, ListTestResult> {
  readonly providerId: string;
  readonly supportedTypes: ('series' | 'movie')[];

  // Fetch lists
  getLists(): Promise<ListInfo[]>;
  getListItems(listId: string): Promise<ListItem[]>;

  // User-specific (if authenticated)
  getWatchlist?(): Promise<ListItem[]>;
  getCollection?(): Promise<ListItem[]>;
  getRatings?(): Promise<ListItem[]>;
}

interface ListInfo {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
  type: 'series' | 'movie' | 'mixed';
  public: boolean;
  url?: string;
}

interface ListItem {
  title: string;
  year?: number;

  // External IDs (at least one required)
  tvdbId?: number;
  imdbId?: string;
  tmdbId?: number;

  // Optional metadata
  overview?: string;
  posterUrl?: string;

  // List-specific
  addedAt?: Date;
  rank?: number;
  notes?: string;
}
```

### Trakt Integration

```typescript
interface TraktConfig extends ListProviderConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;

  // Sync settings
  syncWatchlist: boolean;
  syncCollection: boolean;
  syncRatings: boolean;
  syncLists: string[]; // List slugs
}

class TraktListProvider implements ListProvider {
  private readonly baseUrl = 'https://api.trakt.tv';

  async getLists(): Promise<ListInfo[]> {
    // Get user's custom lists
    const response = await this.authenticatedRequest('/users/me/lists');

    return response.map((list: any) => ({
      id: list.ids.slug,
      name: list.name,
      description: list.description,
      itemCount: list.item_count,
      type: 'mixed',
      public: !list.privacy === 'private',
      url: `https://trakt.tv/users/${list.user.username}/lists/${list.ids.slug}`,
    }));
  }

  async getWatchlist(): Promise<ListItem[]> {
    const [shows, movies] = await Promise.all([
      this.authenticatedRequest('/users/me/watchlist/shows'),
      this.authenticatedRequest('/users/me/watchlist/movies'),
    ]);

    return [
      ...shows.map(this.mapShowItem),
      ...movies.map(this.mapMovieItem),
    ];
  }

  async getCollection(): Promise<ListItem[]> {
    const [shows, movies] = await Promise.all([
      this.authenticatedRequest('/users/me/collection/shows'),
      this.authenticatedRequest('/users/me/collection/movies'),
    ]);

    return [
      ...shows.map(this.mapShowItem),
      ...movies.map(this.mapMovieItem),
    ];
  }

  private async authenticatedRequest(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'trakt-api-version': '2',
        'trakt-api-key': this.config.clientId,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshAccessToken();
      return this.authenticatedRequest(path);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    this.config.accessToken = data.access_token;
    this.config.refreshToken = data.refresh_token;

    // Persist new tokens
    await this.saveTokens(data);
  }
}
```

### IMDb Lists Integration

```typescript
interface ImdbListConfig extends ListProviderConfig {
  listIds: string[]; // ls123456789 format
  userId?: string; // For watchlist: ur12345678
}

class ImdbListProvider implements ListProvider {
  async getListItems(listId: string): Promise<ListItem[]> {
    // IMDb export URL
    const url = `https://www.imdb.com/list/${listId}/export`;

    const response = await fetch(url);
    const csv = await response.text();

    return this.parseCsv(csv);
  }

  private parseCsv(csv: string): ListItem[] {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = this.parseCsvLine(line);
      const record = Object.fromEntries(
        headers.map((h, i) => [h, values[i]])
      );

      return {
        title: record['Title'],
        year: parseInt(record['Year']) || undefined,
        imdbId: record['Const'],
        addedAt: record['Created'] ? new Date(record['Created']) : undefined,
        rank: parseInt(record['Position']) || undefined,
      };
    });
  }
}
```

---

## Import Lists

### Import List Configuration

```typescript
interface ImportListConfig {
  name: string;
  enabled: boolean;

  // Provider
  providerId: string;
  providerConfig: Record<string, unknown>;

  // Sync settings
  enableAutomaticAdd: boolean;
  searchForMissingItems: boolean;

  // Quality profile
  qualityProfileId: number;

  // Root folder
  rootFolderId: number;

  // Monitoring
  monitorType: MonitorType;

  // Tags
  tags: number[];

  // Schedule
  syncInterval: number; // minutes
  lastSync?: Date;
}

type MonitorType =
  | 'all'           // Monitor all episodes/movie
  | 'future'        // Monitor future episodes only
  | 'missing'       // Monitor missing episodes only
  | 'existing'      // Monitor existing episodes only
  | 'pilot'         // Monitor pilot episode only
  | 'first_season'  // Monitor first season only
  | 'latest_season' // Monitor latest season only
  | 'none';         // Don't monitor

interface ImportListSyncJob {
  listId: number;

  async execute(): Promise<ImportListSyncResult>;
}

interface ImportListSyncResult {
  listId: number;
  itemsFound: number;
  itemsAdded: number;
  itemsAlreadyExist: number;
  itemsNotFound: number;
  errors: ImportListError[];
  duration: number;
}
```

### Import List Sync Process

```typescript
class ImportListSyncService {
  async syncList(config: ImportListConfig): Promise<ImportListSyncResult> {
    const startTime = Date.now();
    const result: ImportListSyncResult = {
      listId: config.id,
      itemsFound: 0,
      itemsAdded: 0,
      itemsAlreadyExist: 0,
      itemsNotFound: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Get provider
      const provider = this.getProvider(config.providerId);
      await provider.initialize(config.providerConfig);

      // Fetch items
      const items = await provider.getListItems(config.listId);
      result.itemsFound = items.length;

      // Process each item
      for (const item of items) {
        try {
          const processed = await this.processItem(item, config);

          switch (processed.status) {
            case 'added':
              result.itemsAdded++;
              break;
            case 'exists':
              result.itemsAlreadyExist++;
              break;
            case 'not_found':
              result.itemsNotFound++;
              break;
          }
        } catch (error) {
          result.errors.push({
            item: item.title,
            error: error.message,
          });
        }
      }

    } finally {
      result.duration = Date.now() - startTime;

      // Update last sync time
      await this.updateLastSync(config.id);
    }

    return result;
  }

  private async processItem(
    item: ListItem,
    config: ImportListConfig
  ): Promise<ProcessedItem> {
    // Check if already exists
    const existing = await this.findExisting(item);
    if (existing) {
      return { status: 'exists', id: existing.id };
    }

    // Search metadata provider
    const metadata = await this.searchMetadata(item);
    if (!metadata) {
      return { status: 'not_found' };
    }

    // Add to library
    if (config.enableAutomaticAdd) {
      const added = await this.addToLibrary(metadata, config);

      // Trigger search if enabled
      if (config.searchForMissingItems) {
        await this.queueSearch(added.id);
      }

      return { status: 'added', id: added.id };
    }

    return { status: 'not_added' };
  }
}
```

---

## Webhooks

### Webhook Configuration

```typescript
interface WebhookConfig {
  name: string;
  url: string;
  method: 'POST' | 'PUT';

  // Authentication
  authType?: 'none' | 'basic' | 'bearer' | 'header';
  username?: string;
  password?: string;
  bearerToken?: string;
  headerName?: string;
  headerValue?: string;

  // Event selection
  onGrab: boolean;
  onDownload: boolean;
  onUpgrade: boolean;
  onRename: boolean;
  onSeriesAdd: boolean;
  onSeriesDelete: boolean;
  onEpisodeFileDelete: boolean;
  onMovieAdd: boolean;
  onMovieDelete: boolean;
  onMovieFileDelete: boolean;
  onHealthIssue: boolean;
  onHealthRestored: boolean;
  onApplicationUpdate: boolean;
  onManualInteractionRequired: boolean;

  // Tags filter
  tags: number[];
}
```

### Webhook Payload Formats

```typescript
// Base payload
interface WebhookPayload {
  eventType: WebhookEventType;
  instanceName: string;
  applicationUrl: string;
}

// Grab event
interface GrabPayload extends WebhookPayload {
  eventType: 'Grab';
  series?: SeriesInfo;
  movie?: MovieInfo;
  episodes?: EpisodeInfo[];
  release: ReleaseInfo;
  downloadClient: string;
  downloadClientType: string;
  downloadId: string;
}

interface ReleaseInfo {
  quality: string;
  qualityVersion: number;
  releaseGroup?: string;
  releaseTitle: string;
  indexer: string;
  size: number;
}

// Download event
interface DownloadPayload extends WebhookPayload {
  eventType: 'Download';
  series?: SeriesInfo;
  movie?: MovieInfo;
  episodes?: EpisodeInfo[];
  episodeFile?: EpisodeFileInfo;
  movieFile?: MovieFileInfo;
  isUpgrade: boolean;
  downloadClient: string;
  downloadClientType: string;
  downloadId: string;
}

interface EpisodeFileInfo {
  id: number;
  relativePath: string;
  path: string;
  quality: string;
  qualityVersion: number;
  releaseGroup?: string;
  sceneName?: string;
  size: number;
  dateAdded: string;
  mediaInfo?: MediaInfo;
}

// Series info included in webhooks
interface SeriesInfo {
  id: number;
  title: string;
  titleSlug: string;
  path: string;
  tvdbId?: number;
  tvMazeId?: number;
  imdbId?: string;
  type: string;
  year: number;
}

// Episode info included in webhooks
interface EpisodeInfo {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  airDate?: string;
  airDateUtc?: string;
  overview?: string;
}
```

### Webhook Sender

```typescript
class WebhookSender {
  async send(webhook: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'idkarr/1.0',
    };

    // Add authentication
    switch (webhook.authType) {
      case 'basic':
        headers['Authorization'] = `Basic ${Buffer.from(
          `${webhook.username}:${webhook.password}`
        ).toString('base64')}`;
        break;

      case 'bearer':
        headers['Authorization'] = `Bearer ${webhook.bearerToken}`;
        break;

      case 'header':
        headers[webhook.headerName!] = webhook.headerValue!;
        break;
    }

    const response = await fetch(webhook.url, {
      method: webhook.method,
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      throw new WebhookError(
        `Webhook failed: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    this.logger.info({
      webhookName: webhook.name,
      eventType: payload.eventType,
      statusCode: response.status,
    }, 'Webhook sent successfully');
  }
}
```

---

## Custom Scripts

### Custom Script Interface

```typescript
interface CustomScriptConfig {
  name: string;
  path: string;

  // Event triggers
  onGrab: boolean;
  onDownload: boolean;
  onUpgrade: boolean;
  onRename: boolean;
  onSeriesAdd: boolean;
  onSeriesDelete: boolean;
  onEpisodeFileDelete: boolean;
  onMovieAdd: boolean;
  onMovieDelete: boolean;
  onMovieFileDelete: boolean;
  onHealthIssue: boolean;
  onHealthRestored: boolean;

  // Execution settings
  timeout: number; // seconds
  arguments?: string[];
}
```

### Environment Variables

Scripts receive event data through environment variables:

```bash
# Common variables
idkarr_eventtype="Download"
idkarr_instancename="idkarr"
idkarr_applicationurl="http://localhost:8989"

# Series variables (when applicable)
idkarr_series_id="1"
idkarr_series_title="Breaking Bad"
idkarr_series_titleslug="breaking-bad"
idkarr_series_path="/tv/Breaking Bad"
idkarr_series_tvdbid="81189"
idkarr_series_imdbid="tt0903747"
idkarr_series_type="standard"
idkarr_series_year="2008"

# Episode variables (when applicable)
idkarr_episodefile_id="1"
idkarr_episodefile_episodeids="1,2"
idkarr_episodefile_seasonumber="1"
idkarr_episodefile_episodenumbers="1,2"
idkarr_episodefile_path="/tv/Breaking Bad/Season 01/Breaking.Bad.S01E01-E02.BluRay.1080p.mkv"
idkarr_episodefile_relativepath="Season 01/Breaking.Bad.S01E01-E02.BluRay.1080p.mkv"
idkarr_episodefile_quality="Bluray-1080p"
idkarr_episodefile_qualityversion="1"
idkarr_episodefile_releasegroup="DEMAND"
idkarr_episodefile_scenename="Breaking.Bad.S01E01E02.1080p.BluRay.x264-DEMAND"
idkarr_episodefile_sourcepath="/downloads/Breaking.Bad.S01E01E02.1080p.BluRay.x264-DEMAND"
idkarr_episodefile_sourcefolder="/downloads/Breaking.Bad.S01E01E02.1080p.BluRay.x264-DEMAND"

# Download variables (on Grab)
idkarr_release_indexer="NZBgeek"
idkarr_release_quality="Bluray-1080p"
idkarr_release_qualityversion="1"
idkarr_release_title="Breaking.Bad.S01E01E02.1080p.BluRay.x264-DEMAND"
idkarr_release_size="4294967296"
idkarr_release_releasegroup="DEMAND"

# Download client variables
idkarr_download_client="SABnzbd"
idkarr_download_id="SABnzbd_nzo_abc123"

# Delete variables (on delete events)
idkarr_episodefile_deletereason="Manual"
```

### Script Executor

```typescript
class ScriptExecutor {
  async execute(
    script: CustomScriptConfig,
    event: ScriptEvent
  ): Promise<ScriptResult> {
    const env = this.buildEnvironment(event);
    const args = script.arguments ?? [];

    const startTime = Date.now();

    try {
      const result = await this.runScript(script.path, args, env, script.timeout);

      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      if (error.name === 'TimeoutError') {
        return {
          success: false,
          exitCode: -1,
          error: `Script timed out after ${script.timeout} seconds`,
          duration: Date.now() - startTime,
        };
      }

      throw error;
    }
  }

  private async runScript(
    path: string,
    args: string[],
    env: Record<string, string>,
    timeout: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const proc = Bun.spawn([path, ...args], {
      env: { ...process.env, ...env },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      proc.kill();
    }, timeout * 1000);

    try {
      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      return { exitCode, stdout, stderr };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildEnvironment(event: ScriptEvent): Record<string, string> {
    const env: Record<string, string> = {
      idkarr_eventtype: event.type,
      idkarr_instancename: this.instanceName,
      idkarr_applicationurl: this.applicationUrl,
    };

    // Add series info
    if (event.series) {
      env.idkarr_series_id = event.series.id.toString();
      env.idkarr_series_title = event.series.title;
      env.idkarr_series_titleslug = event.series.titleSlug;
      env.idkarr_series_path = event.series.path;
      // ... more series fields
    }

    // Add episode file info
    if (event.episodeFile) {
      env.idkarr_episodefile_id = event.episodeFile.id.toString();
      env.idkarr_episodefile_path = event.episodeFile.path;
      env.idkarr_episodefile_relativepath = event.episodeFile.relativePath;
      // ... more episode file fields
    }

    return env;
  }
}
```

---

## Integration Manager

### Unified Integration Management

```typescript
class IntegrationManager {
  private integrations = new Map<string, Integration<any, any>>();
  private healthChecks = new Map<string, NodeJS.Timer>();

  async registerIntegration<T extends Integration<any, any>>(
    integration: T
  ): Promise<void> {
    // Test connection
    const testResult = await integration.testConnection();

    if (!testResult.success) {
      throw new IntegrationError(
        `Integration ${integration.name} failed connection test: ${testResult.error}`
      );
    }

    // Initialize
    await integration.initialize(integration.config);

    // Store
    this.integrations.set(integration.id, integration);

    // Start health check
    this.startHealthCheck(integration);

    this.logger.info({
      integrationId: integration.id,
      name: integration.name,
      type: integration.type,
    }, 'Integration registered');
  }

  async unregisterIntegration(id: string): Promise<void> {
    const integration = this.integrations.get(id);

    if (integration) {
      // Stop health check
      this.stopHealthCheck(id);

      // Destroy
      await integration.destroy();

      // Remove
      this.integrations.delete(id);
    }
  }

  getIntegration<T extends Integration<any, any>>(id: string): T | undefined {
    return this.integrations.get(id) as T | undefined;
  }

  getIntegrationsByType<T extends Integration<any, any>>(
    type: IntegrationType
  ): T[] {
    return Array.from(this.integrations.values())
      .filter(i => i.type === type) as T[];
  }

  async getAllHealth(): Promise<Map<string, IntegrationHealth>> {
    const health = new Map<string, IntegrationHealth>();

    await Promise.all(
      Array.from(this.integrations.entries()).map(async ([id, integration]) => {
        try {
          const h = await integration.getHealth();
          health.set(id, h);
        } catch (error) {
          health.set(id, {
            status: 'unhealthy',
            latencyMs: -1,
            lastChecked: new Date(),
            details: { error: error.message },
          });
        }
      })
    );

    return health;
  }

  private startHealthCheck(integration: Integration<any, any>): void {
    const interval = setInterval(async () => {
      try {
        const health = await integration.getHealth();

        if (health.status === 'unhealthy') {
          this.emitHealthEvent(integration.id, health);
        }
      } catch (error) {
        this.emitHealthEvent(integration.id, {
          status: 'unhealthy',
          latencyMs: -1,
          lastChecked: new Date(),
          details: { error: error.message },
        });
      }
    }, 60000); // Check every minute

    this.healthChecks.set(integration.id, interval);
  }
}
```

---

## Related Documents

- [REST_API.md](./REST_API.md) - API endpoints for integration management
- [WEBSOCKET_EVENTS.md](./WEBSOCKET_EVENTS.md) - Real-time events from integrations
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Integration error handling
- [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md) - Integration metrics and monitoring
