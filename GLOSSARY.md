# Glossary

> **idkarr** - Terms, definitions, and concepts reference

## Table of Contents

1. [Media Terminology](#media-terminology)
2. [Quality Terms](#quality-terms)
3. [Release Terms](#release-terms)
4. [Technical Terms](#technical-terms)
5. [Indexer Terms](#indexer-terms)
6. [Download Terms](#download-terms)
7. [System Terms](#system-terms)

---

## Media Terminology

### Series-Related Terms

| Term | Definition |
|------|------------|
| **Series** | A complete TV show including all seasons and episodes |
| **Season** | A collection of episodes typically released together in a year |
| **Episode** | A single installment of a TV series |
| **Special** | An episode outside the regular season, often Season 0 |
| **Mini-Series** | A limited series with a predetermined number of episodes |
| **Anthology** | A series where each season tells a different story |
| **Daily Show** | A show that airs daily, identified by air date rather than season/episode |
| **Anime** | Japanese animated series, often uses absolute episode numbering |

### Episode Numbering

| Term | Definition | Example |
|------|------------|---------|
| **Season Number** | The season an episode belongs to | S01, S02 |
| **Episode Number** | Position within the season | E01, E05 |
| **Absolute Episode Number** | Position across all episodes | Episode 145 |
| **Scene Numbering** | Alternative numbering used by release groups | May differ from official |
| **Air Date** | Original broadcast date | 2024-01-15 |

### Series Status

| Status | Definition |
|--------|------------|
| **Continuing** | Series is still in production and airing new episodes |
| **Ended** | Series has concluded and no new episodes will air |
| **Upcoming** | Series has been announced but hasn't aired yet |
| **Canceled** | Series was terminated before its planned conclusion |
| **Pilot** | Only a pilot episode exists |

### Movie-Related Terms

| Term | Definition |
|------|------------|
| **Movie** | A standalone film |
| **Collection** | A group of related movies (e.g., franchise) |
| **Edition** | A specific version of a movie (Director's Cut, Extended) |
| **Theatrical** | Original cinema release version |
| **Extended** | Version with additional scenes not in theatrical |
| **Director's Cut** | Version reflecting the director's original vision |
| **Remaster** | Updated version with improved audio/video quality |

---

## Quality Terms

### Resolution

| Term | Pixels | Common Names |
|------|--------|--------------|
| **SD** | 480p or below | Standard Definition |
| **720p** | 1280×720 | HD, HD Ready |
| **1080p** | 1920×1080 | Full HD, FHD |
| **1080i** | 1920×1080 interlaced | HD (broadcast) |
| **2160p** | 3840×2160 | 4K, UHD |
| **4320p** | 7680×4320 | 8K |

### Sources

| Term | Definition | Quality |
|------|------------|---------|
| **BluRay** | Ripped from Blu-ray disc | Highest |
| **UHD BluRay** | Ripped from 4K UHD Blu-ray | Highest (4K) |
| **WEB-DL** | Downloaded from streaming service | High |
| **WEBRip** | Screen captured from streaming | Medium-High |
| **HDTV** | Captured from HD broadcast | Medium |
| **SDTV** | Captured from SD broadcast | Low |
| **DVDRip** | Ripped from DVD | Low |
| **CAM** | Recorded in cinema | Very Low |
| **TS** | Telesync - better audio than CAM | Very Low |

### Video Codecs

| Term | Description |
|------|-------------|
| **x264/H.264/AVC** | Most common codec, good compatibility |
| **x265/H.265/HEVC** | Better compression, smaller files |
| **AV1** | Open, royalty-free codec with excellent compression |
| **VP9** | Google's codec, used by YouTube |
| **MPEG-2** | Legacy codec, used in DVDs |
| **XviD/DivX** | Legacy codecs from early 2000s |

### Audio Codecs

| Term | Description | Channels |
|------|-------------|----------|
| **AAC** | Advanced Audio Coding | Typically 2.0 or 5.1 |
| **AC3** | Dolby Digital | Up to 5.1 |
| **EAC3** | Dolby Digital Plus | Up to 7.1 |
| **DTS** | Digital Theater Systems | Up to 5.1 |
| **DTS-HD MA** | DTS High Definition Master Audio | Up to 7.1 |
| **TrueHD** | Dolby TrueHD | Up to 7.1 |
| **Atmos** | Dolby Atmos | Object-based |
| **FLAC** | Free Lossless Audio Codec | Varies |
| **MP3** | MPEG Audio Layer 3 | 2.0 |

### HDR Formats

| Term | Description |
|------|-------------|
| **HDR** | High Dynamic Range - general term |
| **HDR10** | Static metadata HDR standard |
| **HDR10+** | Dynamic metadata HDR (Samsung) |
| **Dolby Vision** | Dynamic metadata HDR (Dolby) |
| **HLG** | Hybrid Log-Gamma - broadcast HDR |
| **SDR** | Standard Dynamic Range |

---

## Release Terms

### Release Types

| Term | Definition |
|------|------------|
| **Scene Release** | From organized release groups following rules |
| **P2P Release** | From person-to-person sharing groups |
| **Internal** | Released only within a private tracker |
| **NUKED** | Release marked as bad/violating rules |
| **PROPER** | Corrects issues in a previous release |
| **REPACK** | Re-release fixing issues in group's own release |
| **REAL** | Corrects mislabeled source |
| **RERIP** | Re-encoded from same source |
| **DIRFIX** | Fixes directory naming |
| **NFOFIX** | Fixes NFO file |
| **SAMPLEFIX** | Fixes sample file |

### Release Naming

| Component | Description | Example |
|-----------|-------------|---------|
| **Title** | Series or movie name | Game.of.Thrones |
| **Season/Episode** | Episode identifier | S01E01 |
| **Year** | Release year (movies) | 2024 |
| **Quality** | Resolution and source | 1080p.BluRay |
| **Codec** | Video encoding | x264, x265 |
| **Audio** | Audio codec | DTS, AAC |
| **Group** | Release group name | -DEMAND |
| **Edition** | Special version | Directors.Cut |

### Scene Rules

| Term | Definition |
|------|------------|
| **PRE** | Initial release to the scene |
| **NFO** | Information file accompanying release |
| **SFV** | Simple File Verification checksum file |
| **Sample** | Short video clip to verify quality |
| **Proof** | Screenshot proving source quality |

---

## Technical Terms

### Parsing

| Term | Definition |
|------|------------|
| **Parser** | Component that extracts metadata from release names |
| **Clean Title** | Normalized title for matching (lowercase, no special chars) |
| **Slug** | URL-friendly version of title |
| **Scene Title** | Title as used by scene release groups |

### Matching

| Term | Definition |
|------|------------|
| **Title Matching** | Comparing parsed title to database entries |
| **Fuzzy Matching** | Approximate matching allowing for variations |
| **Episode Matching** | Linking releases to specific episodes |
| **Scene Mapping** | Converting scene numbering to official numbering |

### File Operations

| Term | Definition |
|------|------------|
| **Import** | Moving downloaded files to library |
| **Rename** | Changing file names to follow naming format |
| **Organize** | Sorting files into folder structure |
| **Hardlink** | Multiple directory entries pointing to same file |
| **Symlink** | Shortcut/pointer to another file |
| **Copy** | Duplicate file to new location |
| **Move** | Transfer file to new location (delete original) |

---

## Indexer Terms

### Indexer Types

| Term | Definition |
|------|------------|
| **Newznab** | API standard for Usenet indexers |
| **Torznab** | Newznab-compatible API for torrent indexers |
| **RSS** | Feed of recent releases |
| **API Search** | Direct search query to indexer |

### Indexer Features

| Term | Definition |
|------|------------|
| **Caps** | Indexer capabilities (supported search params) |
| **Category** | Classification of releases (TV, Movies, etc.) |
| **TVDB Search** | Search by TVDB ID |
| **IMDB Search** | Search by IMDB ID |
| **Season Search** | Search for entire season |

### Usenet Terms

| Term | Definition |
|------|------------|
| **NZB** | XML file containing Usenet article references |
| **Retention** | How long indexer keeps releases |
| **Completion** | Percentage of article availability |
| **Par2** | Parity files for error correction |
| **Obfuscated** | Hidden/scrambled release names |

### Torrent Terms

| Term | Definition |
|------|------------|
| **Magnet Link** | URI containing torrent hash |
| **Seeders** | Users sharing complete file |
| **Leechers** | Users downloading file |
| **Ratio** | Upload/download ratio |
| **Freeleech** | Downloads don't count against ratio |
| **Tracker** | Server coordinating torrent swarm |

---

## Download Terms

### Download Clients

| Term | Definition |
|------|------------|
| **SABnzbd** | Usenet download client |
| **NZBGet** | Usenet download client |
| **qBittorrent** | Torrent client |
| **Transmission** | Torrent client |
| **Deluge** | Torrent client |
| **rTorrent** | Torrent client |

### Download States

| State | Definition |
|-------|------------|
| **Queued** | Waiting to start |
| **Downloading** | Actively downloading |
| **Paused** | Download suspended |
| **Extracting** | Unpacking archive (Usenet) |
| **Processing** | Post-processing (renaming, moving) |
| **Completed** | Download finished |
| **Failed** | Download could not complete |
| **Importing** | Moving to library |

### Post-Processing

| Term | Definition |
|------|------------|
| **Extraction** | Unpacking RAR/ZIP archives |
| **Verification** | Checking file integrity |
| **Repair** | Reconstructing damaged files with par2 |
| **Cleanup** | Removing temporary files |

---

## System Terms

### Components

| Term | Definition |
|------|------------|
| **Backend** | Server-side API (Hono/Bun) |
| **Frontend** | User interface (Next.js) |
| **Database** | Data storage (PostgreSQL) |
| **Cache** | Fast data store (Redis) |
| **Queue** | Background job processor (BullMQ) |
| **Scheduler** | Cron-like job scheduler |

### Monitoring

| Term | Definition |
|------|------------|
| **Health Check** | Endpoint verifying system status |
| **Metrics** | Quantitative measurements |
| **Tracing** | Request flow tracking |
| **Logging** | Event recording |
| **Alerting** | Notification on issues |

### Configuration

| Term | Definition |
|------|------------|
| **Quality Profile** | Rules defining acceptable quality |
| **Custom Format** | User-defined release preferences |
| **Root Folder** | Base directory for media storage |
| **Naming Format** | Template for file/folder names |
| **Tag** | Label for organizing media |

### Actions

| Term | Definition |
|------|------------|
| **Monitored** | Actively searching for releases |
| **Unmonitored** | Not actively searching |
| **Cutoff** | Quality threshold to stop upgrading |
| **Upgrade** | Replace with better quality |
| **Search** | Look for releases on indexers |
| **Grab** | Download a specific release |
| **Blocklist** | Prevent re-downloading bad release |

---

## External IDs

### Media Databases

| ID | Database | Format |
|----|----------|--------|
| **TVDB ID** | TheTVDB | Numeric (e.g., 81189) |
| **IMDB ID** | IMDb | tt + 7 digits (e.g., tt0903747) |
| **TMDB ID** | TheMovieDB | Numeric (e.g., 1396) |
| **TVMaze ID** | TVMaze | Numeric |
| **TVRage ID** | TVRage (defunct) | Numeric |
| **AniDB ID** | AniDB | Numeric |
| **AniList ID** | AniList | Numeric |
| **MAL ID** | MyAnimeList | Numeric |

---

## Abbreviations

| Abbreviation | Full Term |
|--------------|-----------|
| **API** | Application Programming Interface |
| **CLI** | Command Line Interface |
| **GUI** | Graphical User Interface |
| **DB** | Database |
| **UI** | User Interface |
| **UX** | User Experience |
| **RSS** | Really Simple Syndication |
| **NZB** | Newzbin file format |
| **JSON** | JavaScript Object Notation |
| **XML** | Extensible Markup Language |
| **HTTP** | Hypertext Transfer Protocol |
| **WS** | WebSocket |
| **JWT** | JSON Web Token |
| **CRUD** | Create, Read, Update, Delete |
| **RBAC** | Role-Based Access Control |
| **SSO** | Single Sign-On |
| **2FA** | Two-Factor Authentication |
| **TOTP** | Time-based One-Time Password |

---

## Related Documents

- [PARSER_SPECIFICATION.md](./PARSER_SPECIFICATION.md) - Detailed parsing rules
- [FILE_NAMING_RULES.md](./FILE_NAMING_RULES.md) - Naming conventions
- [INTEGRATION_SPECIFICATIONS.md](./INTEGRATION_SPECIFICATIONS.md) - External integrations
- [DEEP_ARCHITECTURE.md](./DEEP_ARCHITECTURE.md) - System architecture
