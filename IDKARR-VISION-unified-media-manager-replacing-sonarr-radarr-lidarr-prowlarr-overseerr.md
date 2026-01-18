# idkarr Unified Vision Design

> **Date**: 2026-01-15
> **Updated**: 2026-01-18
> **Status**: Approved
> **Scope**: Complete product specification for idkarr unified media management platform

---

## 1. Overview

**idkarr** is a unified media management platform that replaces Sonarr, Radarr, Lidarr, Overseerr, and Prowlarr with a single modern application.

### Core Philosophy

- **One app, all media** - TV, Movies, Music, and Anime managed from one interface
- **Works out of the box** - Smart defaults mean users can start immediately, complexity reveals itself as needed
- **Visual and delightful** - Media-rich interface that makes browsing feel like Netflix, not a database admin panel
- **Privacy-respecting AI** - Recommendations that range from fully local to cloud-powered, user's choice
- **Household-friendly** - Built for sharing with family, not enterprise teams or public communities

### What It Replaces

| Traditional Stack | idkarr |
|-------------------|--------|
| Sonarr | TV library management |
| Radarr | Movie library management |
| Lidarr | Music library management |
| Prowlarr | Indexer management |
| Overseerr | Discovery & requests |
| TRaSH Guides manual setup | Auto-synced quality profiles |

### Target Users

- Home media enthusiasts who want one app instead of five
- Families sharing a media server
- Users who find current *arr setup overwhelming
- Power users who want custom formats without the complexity

---

## 2. Media Types & Library Architecture

### Four Media Types

**TV Series**
- Episodic content organized by show → season → episode
- Supports continuing, ended, and upcoming status
- Monitoring at series, season, or episode level
- Daily shows supported (date-based episodes)

**Movies**
- Single-item media with release date tracking
- Collection awareness (trilogies, franchises)
- Theatrical vs streaming release tracking

**Anime**
- First-class media type, not a TV subcategory
- Absolute episode numbering alongside season/episode
- Scene numbering and release group tracking
- Seasonal awareness (Winter 2026, Spring 2026)
- Simulcast vs fansub distinction
- OVA, ONA, Special handling

**Music**
- Artist → Album → Track hierarchy
- Release groups (original, remaster, deluxe, vinyl)
- Multi-artist and compilation support
- Audio quality profiles (FLAC, MP3 320, etc.)

### One Library Per Type

Each media type has exactly one library. No separate "4K Movies" vs "HD Movies" instances. Quality profiles handle format preferences internally - if you want 4K when available but accept 1080p otherwise, that's a quality profile decision, not a library split.

### Root Folders

Each library has one or more root folders (storage locations). Media is organized within these roots using configurable naming patterns.

---

## 3. Tags System

### Tag-Based Routing

Tags are a powerful way to customize behavior for specific media items.

**What Tags Can Control**
- **Indexers** - Only search certain indexers for tagged media
- **Download clients** - Route downloads to specific clients based on tags
- **Quality profiles** - Override quality settings per tag
- **Delay profiles** - Different delay rules per tag

**Example Use Cases**
- Tag anime with "anime" → only use anime-specific indexers
- Tag 4K content with "4k" → route to high-capacity download client
- Tag foreign films with "foreign" → use indexers specializing in non-English content

**Tag Management**
- Create/edit/delete tags
- Bulk assign tags via mass editor
- Filter library by tags

---

## 4. Import & Migration

### Rename on Import

All imported media is renamed to match idkarr's naming format. No exceptions - this ensures consistency and enables reliable matching.

### File Naming Presets

Instead of complex template configuration, idkarr offers well-designed presets:

- **Plex-style** - Optimized for Plex media server
- **Kodi-style** - Optimized for Kodi
- **Minimal** - Clean, simple naming

Each preset covers series folders, season folders, episode files, movie files, and music organization.

### Migration from Existing *arr Apps

**Copy & Point**
- Copy your existing media files to idkarr's root folder (or point to existing location)
- idkarr scans the folder, parses filenames, matches to metadata
- On match confirmation, files are renamed to idkarr format
- Original folder structure is reorganized to match idkarr conventions

**What Gets Detected**
- Sonarr/Radarr/Lidarr naming patterns (auto-recognized)
- Scene release names
- Arbitrary user naming (best-effort parsing)

**Bulk Import Flow**
1. Point to folder containing media
2. idkarr scans and presents matches (with confidence scores)
3. User confirms/corrects matches
4. Files renamed and moved to proper structure
5. Metadata fetched for all matched items

This means zero config export/import needed - just bring your files.

### Simple Manual Import

For ongoing imports from download clients or arbitrary folders:

- Point to folder, auto-match with minimal intervention
- **Releases that cannot be imported are automatically blacklisted** - prevents re-grabbing problematic packs
- Robust parsing is critical - idkarr's parser must be smarter than existing *arr apps

---

## 5. Metadata System

### Multi-Source with Merging

idkarr pulls from multiple metadata providers and merges the best data from each.

**Provider Matrix**

| Media Type | Primary | Secondary | Tertiary |
|------------|---------|-----------|----------|
| TV | TVDB | TMDB | IMDB |
| Movies | TMDB | IMDB | - |
| Anime | AniList | AniDB | MAL |
| Music | MusicBrainz | - | - |

**What Gets Merged**

- **Posters/Artwork**: Prefer TMDB (higher quality), fall back to others
- **Episode data**: TVDB for air dates, TMDB for descriptions
- **Ratings**: Aggregate from available sources
- **Cast/Crew**: Merge unique entries from all sources
- **Anime mappings**: AniList ↔ TVDB ↔ TMDB cross-references

**Conflict Resolution**

When sources disagree (different air dates, titles, episode counts):
- Configurable "preferred source" per field type
- Manual override always wins
- Conflicts flagged for user review

### Scene Mappings & Episode Numbering

Anime especially has numbering chaos - different databases use different episode numbers.

**AniList-First Approach**
- Trust AniList's absolute numbering as source of truth for anime
- AniList has solid cross-references to TVDB/TMDB/MAL already

**LLM Fallback**
- When a release doesn't match cleanly, use LLM to analyze
- Example: "Is 'Show S2E01' the same as 'Show Episode 25'?"
- Cache LLM decisions to avoid repeated calls

---

## 6. Indexer Management

### Built-in Prowlarr

Indexer configuration is a first-class feature - no external Prowlarr needed.

### Supported Protocols

**Torznab**
- Standard torrent indexer protocol
- Category mapping to media types
- Automatic search capability detection

**Newznab**
- Usenet indexer protocol
- NZB file handling
- Retention and completion tracking

**Note**: No FlareSolverr support - only indexers without Cloudflare protection are supported.

### Indexer Configuration

**Per-Indexer Settings**
- API endpoint and credentials
- Rate limiting (requests per minute)
- Priority (search order)
- Category mappings (how indexer categories map to TV/Movies/Anime/Music)
- Enabled media types (some indexers are better for certain content)
- **Tag assignments** - Only use this indexer for media with specific tags

**Health Monitoring**
- Response time tracking
- Failure rate and recent errors
- Automatic disable on repeated failures
- Health dashboard showing indexer status

### Search Behavior

**RSS Sync**
- Periodic polling of indexer RSS feeds
- Configurable interval per indexer
- New releases matched against wanted items

**Interactive Search**
- On-demand search across enabled indexers
- Results aggregated and deduplicated
- Scored by custom formats and quality profiles

**Search Testing**
- Test searches from settings page
- Verify indexer is returning expected results
- Debug category mapping issues

### Intelligent Search Throttling

**Per-Item Search Cooldown**
- Track last search time per media item
- Skip search if cooldown hasn't elapsed
- Cooldown varies by content type and status

**Cooldown Rules**

| Scenario | Cooldown |
|----------|----------|
| Aired episode, not found | 7 days |
| Upcoming episode (air date known) | Until air date + 1 day |
| Continuing series, missing recent | 3 days |
| Ended series, missing old episode | 14 days |
| Movie, post-release | 7 days |
| Movie, pre-release | Until release + 1 day |
| Music album, post-release | 7 days |
| Anime simulcast | 1 day (faster release cycle) |

**Manual Override**
- User-triggered search always runs (ignores cooldown)
- "Search All" commands respect cooldowns unless forced

**Benefits**
- Reduces indexer API load
- Avoids rate limit hits
- Respects indexer fair use
- Smarter resource usage

---

## 7. Download Pipeline

### Supported Clients

**Torrent**
- qBittorrent (WebUI API)
- Transmission (RPC API)

**Usenet**
- SABnzbd (API)
- NZBGet (RPC)

### Download Client Configuration

**Per-Client Settings**
- Connection details (host, port, credentials)
- **Remote path mappings** - Map client paths to idkarr paths when running on different machines/containers
- **Tag assignments** - Route downloads based on media tags
- Priority for protocol (when multiple clients available)

**Automatic Categories**
- Downloads automatically tagged by media type:
  - `idkarr-tv`
  - `idkarr-movies`
  - `idkarr-anime`
  - `idkarr-music`
- idkarr monitors these categories for completed downloads

### Download Flow

```
Release Found → Quality Check → Delay Check → Grab → Send to Client → Monitor → Import
```

**1. Release Selection**
- Custom format scoring applied
- Quality profile cutoff checked
- Size limits validated
- Hard restrictions checked (must/must-not contain)
- Release rejected or approved

**2. Delay Profile Check**
- Check if delay applies for this media/tag
- If delay active, queue release and wait
- Bypass delay for propers/repacks if configured

**3. Grab**
- Torrent file or NZB sent to download client
- Tagged with category for routing
- Tracked in idkarr queue

**4. Monitoring**
- Poll client for progress
- Track download speed, ETA
- Detect stalled/failed downloads

**5. Import**
- Completed download detected
- Files parsed and matched
- Renamed to idkarr format
- Moved to library location
- Download client notified to remove

### Failed Download Handling

- Automatic retry with next best release
- **Auto-blacklist failed releases** - Prevents re-grabbing
- Configurable retry limits

### Blocklist Management

Full UI for managing blacklisted releases:
- View all blocklisted releases with reasons
- Filter by media, date, reason
- Remove individual items from blocklist
- Bulk clear blocklist

---

## 8. Delay Profiles

Control when to grab releases instead of grabbing immediately.

### How Delay Profiles Work

- Wait specified time before grabbing to allow better releases to appear
- Prefer certain protocols (e.g., wait for Usenet before falling back to Torrent)
- Bypass delay for specific conditions

**Delay Profile Settings**
- **Protocol preference** - Usenet first, Torrent fallback (or vice versa)
- **Usenet delay** - Hours to wait for Usenet releases
- **Torrent delay** - Hours to wait for Torrent releases
- **Bypass for propers** - Grab propers/repacks immediately
- **Tag assignments** - Apply delay profile to specific tagged media

**Example Configuration**
```
Protocol: Prefer Usenet
Usenet delay: 0 hours (grab immediately)
Torrent delay: 2 hours (wait for Usenet first)
Bypass: Propers, Repacks
Tags: all (default profile)
```

---

## 9. Quality & Custom Formats

### Quality Profiles

**How They Work**
- Ranked list of acceptable qualities
- Cutoff: stop upgrading once reached
- Upgrade allowed toggle

**Example Profile: "HD Optimized"**
```
1. Bluray-1080p Remux (cutoff)
2. Bluray-1080p
3. WEB-DL 1080p
4. HDTV-1080p
5. WEB-DL 720p
```

Grabs best available, upgrades until hitting 1080p Remux, then stops.

### Custom Formats

Regex-based rules that tag releases with scores.

**Format Structure**
- Name (e.g., "HDR", "HEVC", "Dolby Atmos")
- Conditions (regex patterns matching release name)
- Score (positive = preferred, negative = avoid)

**Scoring Example**
```
Release: "Movie.2024.2160p.UHD.BluRay.HEVC.DTS-HD.MA.7.1-GROUP"

+150  4K (matched "2160p")
+100  HDR (matched "UHD")
+50   HEVC (matched "HEVC")
+30   Lossless Audio (matched "DTS-HD.MA")
────
330   Total Score
```

Highest scoring release wins (above quality cutoff).

### Language Handling

Languages are handled through custom format conditions, not separate profiles:

- Create custom formats for preferred languages
- Score desired languages positively
- Score unwanted languages negatively (or use restrictions)

**Example**
```
+100  English (matched "ENG|English")
+50   Dual Audio (matched "Dual|Multi")
-100  Korean Only (matched "KOR" without "ENG")
```

### Availability / Release Types

Movie availability (theatrical, digital, etc.) handled through custom formats:

- Score cam/telesync/screener heavily negative
- Score proper releases positively
- Let quality system naturally reject poor quality

**Example**
```
-9999  CAM (matched "CAM|HDCAM|HQCAM")
-9999  Telesync (matched "TS|TELESYNC|HDTS")
-9999  Screener (matched "SCR|SCREENER|DVDSCR")
```

### Restrictions (Hard Blocks)

In addition to custom format scoring, hard restrictions provide absolute blocks:

**Must Contain** - Release MUST include these terms to be considered
**Must Not Contain** - Release is REJECTED if it contains these terms

Restrictions are hard blocks (binary), custom formats are soft preferences (scored).

### TRaSH Guides Auto-Sync

**Setup**
- One-time: select which TRaSH profiles to follow
- idkarr subscribes to TRaSH Guides repository

**Sync Behavior**
- Check for updates daily (configurable)
- New/updated formats automatically imported
- User notified of changes
- Manual formats preserved (not overwritten)

**Profiles Available**
- Movie: Remux, HD Bluray, Web-Only, etc.
- TV: Same tiers
- Anime: Specific release group preferences

### Transcode Integration (Future)

**Concept**
- Releases matching certain criteria flagged as "to be transcoded"
- External tool (Tdarr, Unmanic, etc.) picks up flagged files
- After transcode, idkarr updates file metadata

**Flag Triggers (Configurable Rules)**
```
IF codec = h264 AND resolution >= 2160p THEN flag
IF file_size > 50GB THEN flag
IF bitrate > 40Mbps AND resolution = 1080p THEN flag
```

**Workflow**
```
Import → Flag Check → Add to Transcode Queue → External Tool Processes → idkarr Re-scans
```

**Integration Points**
- Webhook fires when file flagged for transcode
- API endpoint for transcode tools to query flagged files
- Callback to mark transcode complete
- File metadata updated (new codec, size, bitrate)

**Benefits**
- Grab highest quality available (don't compromise on source)
- Reclaim space automatically
- Optimize for streaming (HEVC/AV1 more efficient)
- Separation of concerns (idkarr manages, Tdarr transcodes)

*Note: Future feature - spec only, not in initial release.*

---

## 10. List Sync

### External List Integration

Automatically add media from external lists to your library.

**Supported Lists**
- Trakt (watchlist, custom lists, popular, trending)
- IMDB (watchlist, custom lists)
- Letterboxd (watchlist, custom lists)
- Plex (watchlist)
- TMDb (lists, popular, trending)

**Per-List Configuration**
- Quality profile to use for added items
- Root folder destination
- Monitored status (monitor immediately or add unmonitored)
- Tags to apply
- Sync interval

**Sync Behavior**
- Periodic sync (configurable interval)
- New items from list auto-added to idkarr
- Optional: remove from idkarr when removed from list
- Duplicates detected and skipped

---

## 11. AI & Recommendations

### Three Tiers

Users choose their comfort level with AI features.

**Tier 1: Local Only**
- No external services
- Analyze library metadata locally
- "Because you watched X" recommendations
- Genre/actor/director similarity matching
- Trending in your library (recently added, popular)

**Tier 2: RAG-Powered Discovery**
- Vector embeddings of library + metadata
- Natural language search: "90s thriller with twist ending"
- Semantic similarity beyond keyword matching
- Can use local embedding model (Ollama) or API (OpenAI)

**Tier 3: Full AI Assistant**
- Everything in Tier 1 & 2
- Conversational interface
- "Find that Korean zombie show" → Kingdom
- Explains recommendations: "Because you liked X's cinematography..."
- Takes action: "Add it to my library" → searches, grabs, imports
- Local LLM (Ollama) or cloud (OpenAI, Anthropic)

### Privacy Model

- Tier 1: Zero data leaves your server
- Tier 2: Embeddings can be local (Ollama) or cloud
- Tier 3: Queries sent to LLM provider (if using cloud)
- Clear labeling of what goes where

---

## 12. User System & Requests

### Household Model

Designed for families and close friends sharing a media server, not public communities.

### Authentication

**OAuth/OIDC Only**
- No local username/password accounts
- Connect to external identity providers:
  - Google
  - GitHub
  - Authelia
  - Authentik
  - Other OIDC providers
- Delegate password management and security to identity provider

### User Roles

**Admin**
- Full system access
- Manage users, indexers, download clients
- Approve/deny requests
- Configure all settings

**User**
- Browse library and discovery
- Submit requests
- Manage own watchlist
- View own request history

**Limited User**
- Browse library only
- No requests (view-only)
- Good for kids or guests

### Request Workflow

```
User Discovers Content → Submits Request → Admin Notified →
Approve/Deny → If Approved: Auto-search & Download → User Notified
```

**Request Features**
- Optional approval (admin can enable auto-approve)
- Request quotas per user (optional)
- Request notes ("My friend recommended this")
- Batch requests (full season, artist discography)

### Per-User Features

- **Watchlist**: Personal list of items to track
- **Watch History**: Synced from media server (Plex/Jellyfin)
- **Recommendations**: Personalized based on their history
- **Notifications**: Their requests, their watched content

---

## 13. Media Server Integration

### Supported Servers

- Plex
- Jellyfin
- Emby

### Integration Scope

**Library Scan Triggers**
- Notify media server when content imported
- Targeted scan (specific folder) not full library
- Immediate availability for playback

**Watch Status Sync**
- Pull played/unplayed status from media server
- Sync watch progress (partially watched)
- Feed into recommendations engine
- Power "watched" filters in idkarr UI

*Future: Activity awareness, library browsing, user sync*

---

## 14. UI/UX & PWA

### Visual Design

**Media-Rich Experience**
- Large posters and backdrop images
- Trailer playback inline
- Smooth transitions and animations
- Dark mode default, light mode available

**Browsing Feels Like Netflix**
- Horizontal carousels by category
- Hero banner for featured/new content
- Quick preview on hover
- Infinite scroll where appropriate

### Key Views

| View | Purpose |
|------|---------|
| Dashboard | Activity feed, upcoming list, recently added, health status |
| Library | Browse all media with smart filters |
| Calendar | Full month/week view of upcoming releases |
| Discovery | Find new content, trending, recommendations |
| Requests | Submit and track requests |
| Queue | Active downloads, history |
| Settings | Progressive disclosure, simple → advanced |

### Smart Filters (Library)

Instead of separate pages for "Wanted" and "Cutoff Unmet", the Library uses saved filter presets:

**Built-in Presets**
- **Missing** - Monitored items without files
- **Upgradeable** - Items below quality cutoff
- **Recently Added** - Last 30 days
- **Continuing** - Active series
- **Ended** - Completed series

**Custom Filters**
- Save custom filter combinations
- Filter by: status, monitored, quality, tags, media type, year, genre, etc.
- Quick toggle between presets

### Calendar

**Dashboard Widget**
- Upcoming list showing next 7 days
- Quick glance at what's releasing

**Dedicated Calendar Page**
- Month and week views
- Filter by media type
- Color coding by status (monitored, unmonitored, downloaded)
- iCal export for external calendar apps

### Mass Editor

Bulk operations for managing large libraries:

- Multi-select items
- Change quality profile for all selected
- Change root folder
- Change monitored status
- Add/remove tags
- Delete multiple items

### PWA Features

**Installable**
- Add to home screen on mobile/desktop
- Standalone window, no browser chrome

**Offline Support**
- Library metadata cached locally
- Browse your collection offline
- Queue changes sync when back online

**Push Notifications**
- New content available
- Request approved/denied
- Download complete

---

## 15. Analytics Dashboard

### Library Statistics

- Total items by media type
- Total file size / storage used
- Completion percentage (files vs monitored)
- Quality breakdown (pie chart)

### Activity Graphs

- Downloads over time (daily/weekly/monthly)
- Library growth over time
- Imports by source (RSS vs manual search)

### Indexer Performance

- Success rate per indexer
- Average response time
- Failures and errors
- Queries per day

### Storage Trends

- Usage over time per root folder
- Growth rate projections
- Space warnings when approaching capacity

---

## 16. Health & Monitoring

### Health Check System

Continuous monitoring with actionable warnings.

**What Gets Checked**

| Check | Warning |
|-------|---------|
| Indexer connectivity | "Indexer X failed to respond" |
| Download client connectivity | "Cannot connect to qBittorrent" |
| Root folder access | "Root folder /media/tv is not accessible" |
| Root folder space | "Less than 50GB free on /media/movies" |
| Update available | "idkarr v2.1.0 is available" |
| Import issues | "5 items pending manual import" |
| Metadata sync | "Failed to refresh metadata for X" |

**Dashboard Integration**
- Health warnings displayed prominently
- Color-coded severity (warning, error)
- Actionable messages with guidance
- Links to relevant settings

### Logs

Full logging system for troubleshooting.

**Log Levels**
- Info - Normal operations
- Warning - Non-critical issues
- Error - Failures requiring attention
- Debug - Verbose logging for troubleshooting

**Log Features**
- View logs in UI with filtering
- Log file rotation (configurable retention)
- Download log files
- Clear logs

---

## 17. API & Webhooks

### Public REST API

**Versioned**
- `/api/v1/` prefix
- Breaking changes = new version
- Deprecation warnings before removal

**Authentication**
- API key header (`X-Api-Key`)
- Session cookies for web UI
- Scoped keys (read-only, full access)

**Core Endpoints**

| Resource | Operations |
|----------|------------|
| `/media` | CRUD, search, filter |
| `/requests` | Submit, approve, deny |
| `/queue` | View, cancel, retry |
| `/blocklist` | View, remove, clear |
| `/indexers` | CRUD, test, status |
| `/download-clients` | CRUD, test, status |
| `/quality-profiles` | CRUD |
| `/custom-formats` | CRUD, TRaSH sync |
| `/delay-profiles` | CRUD |
| `/tags` | CRUD |
| `/lists` | CRUD, sync |
| `/users` | CRUD (admin only) |
| `/system` | Health, stats, backup, logs |

**Documentation**
- OpenAPI spec auto-generated
- Interactive docs (Swagger UI)

### Outgoing Webhooks

**Events**
- `media.added` / `media.deleted`
- `episode.imported` / `movie.imported`
- `download.started` / `download.completed` / `download.failed`
- `request.created` / `request.approved` / `request.denied`
- `health.degraded` / `health.restored`

**Webhook Config**
- URL endpoint
- Events to subscribe
- Custom headers (for auth)
- Retry on failure

**Note**: No built-in notification integrations (Discord, Email, etc.). Use webhooks with external aggregators like Notifiarr or Apprise.

---

## 18. Storage & Backup

### Smart Storage Management

**Space Tracking**
- Monitor disk usage per root folder
- Track library growth over time
- Warn when approaching capacity (configurable threshold)

**Cleanup Suggestions**
- Identify watched content (via media server sync)
- Flag lower quality files that have been upgraded
- Suggest large files with available smaller releases
- Never auto-delete - suggestions only

**Dashboard Widget**
- Visual storage breakdown by media type
- Free space indicators
- Growth trend graph

### File Deletion

**Permanent Delete**
- Files are permanently deleted when removed
- No built-in recycling bin
- Rely on filesystem/NAS trash if recovery needed

### Backup Format

**Single File Export**
- One `.idkarr` file (JSON under the hood, gzipped)
- Human-readable if uncompressed
- Version field for compatibility

**File Structure**
```json
{
  "version": "1.0",
  "exported_at": "2026-01-15T20:30:00Z",
  "instance": {
    "name": "My idkarr",
    "settings": { ... }
  },
  "quality_profiles": [ ... ],
  "custom_formats": [ ... ],
  "delay_profiles": [ ... ],
  "tags": [ ... ],
  "indexers": [ ... ],
  "download_clients": [ ... ],
  "lists": [ ... ],
  "users": [ ... ],
  "media": [ ... ],
  "history": [ ... ]
}
```

**Use Cases**
- **Backup/Restore**: Full system recovery
- **Migration**: Move to new server
- **Sharing**: Export quality profiles to share with community
- **Partial Import**: Import just custom formats from someone else's export

**Selective Export/Import**
- Choose what to include (everything, config only, profiles only)
- On import, choose what to merge vs replace
- Conflict resolution UI for duplicates

**Scheduled Backups**
- Schedule: daily, weekly, custom cron
- Retention: keep last N backups
- Location: local path or network share
- One-click restore from backup list

---

## 19. System

### Updates

**Notification Only**
- idkarr checks for new versions
- Displays notification when update available
- User updates manually (Docker image pull)
- No self-update capability

### No Proxy Support

- Direct connections only
- Use external solutions (Gluetun, VPN at container level) if needed

---

## 20. Caching

### Two-Layer Architecture

**Redis (Ephemeral)**
- Session data
- API response cache
- Search result cache
- Rate limit counters
- Indexer response cache
- Temporary state

**Database (Persistent)**
- All metadata
- User data
- Configuration
- History and logs
- Source of truth

**Disk (Files)**
- Poster images
- Backdrop images
- Cached thumbnails
- Backup files

### Cache TTLs

| Data | Location | TTL |
|------|----------|-----|
| Sessions | Redis | Session duration |
| Search results | Redis | 1 hour |
| Indexer responses | Redis | 15 minutes |
| API responses | Redis | 5 minutes |
| Metadata | Database | Permanent (refresh on sync) |
| Images | Disk | 7 days |

### Cache Invalidation

- Media updated → clear relevant Redis keys
- Settings changed → clear affected caches
- Manual "clear cache" in settings
- Images re-fetched on metadata refresh

---

## Summary

idkarr unifies the *arr ecosystem into a single, modern application:

| Component | Approach |
|-----------|----------|
| **Media** | TV, Movies, Music, Anime (first-class) |
| **Libraries** | One per media type, quality profiles handle variants |
| **Tags** | Full routing (indexers, clients, profiles, delays) |
| **Indexers** | Built-in Prowlarr with smart debouncing |
| **Downloads** | qBittorrent, Transmission, SABnzbd, NZBGet |
| **Delay Profiles** | Protocol preference, wait times, bypass rules |
| **Metadata** | Multi-source merging (TMDB, TVDB, AniList, MusicBrainz) |
| **Scene Mappings** | AniList-first with LLM fallback |
| **Quality** | Custom formats with TRaSH Guides auto-sync |
| **Language** | Custom format conditions (not separate profiles) |
| **Restrictions** | Hard blocks + soft custom format scores |
| **List Sync** | Trakt, IMDB, Letterboxd, Plex, TMDb |
| **AI** | Tiered: local → RAG → full assistant |
| **Users** | OAuth/OIDC, household model with requests |
| **Media Servers** | Plex/Jellyfin/Emby scan triggers + watch sync |
| **UI** | Media-rich PWA with smart filters, calendar, mass editor |
| **Analytics** | Full dashboard with graphs and trends |
| **Health** | Comprehensive checks with actionable guidance |
| **Logs** | Full system with UI viewer |
| **API** | Public REST + webhooks (no built-in notifications) |
| **Backup** | Single-file `.idkarr` format |
| **Updates** | Notification only (manual update) |

---

*This design document captures the product vision for idkarr. Implementation details, database schemas, and API specifications will be developed in subsequent documents.*
