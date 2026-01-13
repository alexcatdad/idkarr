# REST API Documentation

## Overview

Complete REST API v3 specification for Sonarr rebuild with TypeScript, Bun, and modern stack.

### Base URL
- **Development**: `http://localhost:3000/api/v3`
- **Production**: `https://api.sonarr.example.com/api/v3`

### Authentication
All API requests require authentication via API key in the `X-Api-Key` header.

```
X-Api-Key: your-api-key-here
```

### Response Format

**Success Response:**
```json
{
  "data": { ... },
  "links": { ... },
  "meta": { ... }
}
```

**Error Response:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { ... }
}
```

**Paginated Response:**
```json
{
  "data": [ ... ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 1000,
  "totalPages": 50,
  "links": {
    "first": "/api/v3/series?page=1",
    "prev": null,
    "next": "/api/v3/series?page=2",
    "last": "/api/v3/series?page=50"
  }
}
```

---

## Error Codes

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or missing API key |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate, etc.) |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## API Endpoints

### Series

#### GET /api/v3/series
Get all series.

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `pageSize` (integer, optional): Items per page (default: 20, max: 100)
- `sort` (string, optional): Sort field (default: 'sortTitle')
  - Options: `title`, `sortTitle`, `added`, `lastAired`, `status`, `year`
- `order` (string, optional): Sort order (default: 'asc')
  - Options: `asc`, `desc`
- `tvdbId` (integer, optional): Filter by TVDB ID
- `imdbId` (string, optional): Filter by IMDB ID
- `tmdbId` (integer, optional): Filter by TMDB ID
- `status` (string, optional): Filter by status
  - Options: `continuing`, `ended`, `upcoming`
- `monitored` (boolean, optional): Filter by monitored status
- `tags` (integer[], optional): Filter by tags (AND logic)
- `searchTerm` (string, optional): Search in title/sortTitle

**Request:**
```http
GET /api/v3/series?page=1&pageSize=20&sort=sortTitle&order=asc
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "tvdbId": 303470,
      "tmdbId": 1396,
      "imdbId": "tt0903747",
      "title": "Breaking Bad",
      "sortTitle": "breaking bad",
      "status": "ended",
      "overview": "A high school chemistry teacher...",
      "network": "AMC",
      "airTime": "21:00",
      "monitored": true,
      "monitorNewItems": "all",
      "qualityProfileId": 1,
      "seasonFolder": true,
      "useSceneNumbering": false,
      "path": "/media/tv/Breaking Bad",
      "year": 2008,
      "runtime": 49,
      "genres": ["Crime", "Drama", "Thriller"],
      "tags": [1, 2],
      "added": "2015-01-01T00:00:00.000Z",
      "firstAired": "2008-01-20T00:00:00.000Z",
      "lastAired": "2013-09-29T00:00:00.000Z",
      "ratings": {
        "votes": 5000,
        "value": 9.5
      },
      "images": [
        {
          "coverType": "poster",
          "url": "/api/v3/media/cover/series/1/poster.jpg?refresh=true"
        }
      ],
      "seasons": [
        {
          "seasonNumber": 1,
          "monitored": true,
          "statistics": {
            "episodeFileCount": 7,
            "episodeCount": 7,
            "totalEpisodeCount": 7,
            "sizeOnDisk": 5000000000,
            "percentOfEpisodes": 100
          }
        }
      ],
      "statistics": {
        "seasonCount": 5,
        "episodeFileCount": 62,
        "episodeCount": 62,
        "totalEpisodeCount": 62,
        "sizeOnDisk": 45000000000,
        "percentOfEpisodes": 100,
        "previousAiring": "2013-09-29T00:00:00.000Z",
        "nextAiring": null
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 100,
  "totalPages": 5,
  "links": {
    "first": "/api/v3/series?page=1&pageSize=20",
    "prev": null,
    "next": "/api/v3/series?page=2&pageSize=20",
    "last": "/api/v3/series?page=5&pageSize=20"
  }
}
```

#### GET /api/v3/series/:id
Get series by ID.

**Path Parameters:**
- `id` (integer, required): Series ID

**Request:**
```http
GET /api/v3/series/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "tvdbId": 303470,
    "tmdbId": 1396,
    "imdbId": "tt0903747",
    "title": "Breaking Bad",
    "sortTitle": "breaking bad",
    "status": "ended",
    "overview": "A high school chemistry teacher...",
    "network": "AMC",
    "airTime": "21:00",
    "monitored": true,
    "monitorNewItems": "all",
    "qualityProfileId": 1,
    "seasonFolder": true,
    "useSceneNumbering": false,
    "path": "/media/tv/Breaking Bad",
    "year": 2008,
    "runtime": 49,
    "genres": ["Crime", "Drama", "Thriller"],
    "tags": [1, 2],
    "added": "2015-01-01T00:00:00.000Z",
    "firstAired": "2008-01-20T00:00:00.000Z",
    "lastAired": "2013-09-29T00:00:00.000Z",
    "ratings": {
      "votes": 5000,
      "value": 9.5
    },
    "images": [
      {
        "coverType": "poster",
        "url": "/api/v3/media/cover/series/1/poster.jpg?refresh=true"
      },
      {
        "coverType": "fanart",
        "url": "/api/v3/media/cover/series/1/fanart.jpg?refresh=true"
      },
      {
        "coverType": "banner",
        "url": "/api/v3/media/cover/series/1/banner.jpg?refresh=true"
      }
    ],
    "seasons": [
      {
        "seasonNumber": 1,
        "monitored": true,
        "statistics": {
          "episodeFileCount": 7,
          "episodeCount": 7,
          "totalEpisodeCount": 7,
          "sizeOnDisk": 5000000000,
          "percentOfEpisodes": 100
        }
      },
      {
        "seasonNumber": 2,
        "monitored": true,
        "statistics": {
          "episodeFileCount": 13,
          "episodeCount": 13,
          "totalEpisodeCount": 13,
          "sizeOnDisk": 9000000000,
          "percentOfEpisodes": 100
        }
      }
    ],
    "statistics": {
      "seasonCount": 5,
      "episodeFileCount": 62,
      "episodeCount": 62,
      "totalEpisodeCount": 62,
      "sizeOnDisk": 45000000000,
      "percentOfEpisodes": 100,
      "previousAiring": "2013-09-29T00:00:00.000Z",
      "nextAiring": null
    },
    "qualityProfile": {
      "id": 1,
      "name": "HD - 720p/1080p"
    },
    "rootFolderPath": "/media/tv"
  }
}
```

#### POST /api/v3/series
Add a new series.

**Request Body:**
```json
{
  "tvdbId": 303470,
  "title": "Breaking Bad",
  "qualityProfileId": 1,
  "rootFolderPath": "/media/tv",
  "path": "/media/tv/Breaking Bad",
  "monitored": true,
  "monitorNewItems": "all",
  "seasonFolder": true,
  "tags": [1, 2],
  "addOptions": {
    "searchForMissingEpisodes": true,
    "ignoreEpisodesWithFiles": false,
    "monitorNewItems": "all"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "tvdbId": 303470,
    "title": "Breaking Bad",
    "sortTitle": "breaking bad",
    "status": "continuing",
    "monitored": true,
    "monitorNewItems": "all",
    "qualityProfileId": 1,
    "seasonFolder": true,
    "path": "/media/tv/Breaking Bad",
    "year": 2008,
    "runtime": 49,
    "genres": ["Crime", "Drama"],
    "tags": [1, 2],
    "added": "2024-01-12T00:00:00.000Z",
    "images": [],
    "seasons": []
  }
}
```

#### PUT /api/v3/series/:id
Update a series.

**Path Parameters:**
- `id` (integer, required): Series ID

**Query Parameters:**
- `moveFiles` (boolean, optional): Move files when path changes (default: false)

**Request Body:**
```json
{
  "monitored": false,
  "monitorNewItems": "future",
  "qualityProfileId": 2,
  "path": "/media/tv/New Location/Breaking Bad",
  "seasonFolder": false,
  "tags": [1],
  "seriesType": "anime",
  "useSceneNumbering": true
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "tvdbId": 303470,
    "title": "Breaking Bad",
    "sortTitle": "breaking bad",
    "status": "ended",
    "monitored": false,
    "monitorNewItems": "future",
    "qualityProfileId": 2,
    "seasonFolder": false,
    "useSceneNumbering": true,
    "path": "/media/tv/New Location/Breaking Bad",
    "year": 2008,
    "runtime": 49,
    "genres": ["Crime", "Drama"],
    "tags": [1],
    "images": [ ... ],
    "seasons": [ ... ]
  }
}
```

#### DELETE /api/v3/series/:id
Delete a series.

**Path Parameters:**
- `id` (integer, required): Series ID

**Query Parameters:**
- `deleteFiles` (boolean, optional): Delete files from disk (default: false)
- `addImportListExclusion` (boolean, optional): Add to import list exclusions (default: false)

**Request:**
```http
DELETE /api/v3/series/1?deleteFiles=true&addImportListExclusion=true
X-Api-Key: your-api-key-here
```

**Response:**
```
HTTP 204 No Content
```

#### PUT /api/v3/series/:id/season
Update season monitoring.

**Path Parameters:**
- `id` (integer, required): Series ID

**Request Body:**
```json
{
  "seasonNumber": 1,
  "monitored": false
}
```

**Response:**
```json
{
  "data": {
    "seasonNumber": 1,
    "monitored": false,
    "statistics": {
      "episodeFileCount": 7,
      "episodeCount": 7,
      "totalEpisodeCount": 7,
      "sizeOnDisk": 5000000000,
      "percentOfEpisodes": 100
    }
  }
}
```

#### POST /api/v3/series/import
Import series from import list.

**Request Body:**
```json
{
  "importListId": 1,
  "seriesIds": [303470, 303471],
  "qualityProfileId": 1,
  "rootFolderPath": "/media/tv",
  "monitorNewItems": "all",
  "searchForMissingEpisodes": true
}
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "tvdbId": 303470,
      "title": "Breaking Bad",
      "added": true
    },
    {
      "seriesId": 2,
      "tvdbId": 303471,
      "title": "Better Call Saul",
      "added": true
    }
  ]
}
```

#### POST /api/v3/series/lookup
Lookup series by TVDB ID (returns metadata without adding).

**Request Body:**
```json
{
  "term": "303470"
}
```

**Response:**
```json
{
  "data": [
    {
      "tvdbId": 303470,
      "tmdbId": 1396,
      "imdbId": "tt0903747",
      "title": "Breaking Bad",
      "year": 2008,
      "overview": "A high school chemistry teacher...",
      "network": "AMC",
      "status": "ended",
      "runtime": 49,
      "genres": ["Crime", "Drama", "Thriller"],
      "images": [
        {
          "coverType": "poster",
          "url": "https://thetvdb.com/banners/posters/303470-1.jpg"
        }
      ],
      "seasons": [
        {
          "seasonNumber": 1,
          "seasonName": "Season 1",
          "monitored": true,
          "overview": "High school chemistry teacher...",
          "episodeCount": 7
        }
      ]
    }
  ]
}
```

---

### Episodes

#### GET /api/v3/episode
Get all episodes (with filtering).

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `pageSize` (integer, optional): Items per page (default: 50)
- `seriesId` (integer, optional): Filter by series ID
- `seasonNumber` (integer, optional): Filter by season number
- `monitored` (boolean, optional): Filter by monitored status
- `hasFile` (boolean, optional): Filter by has file status
- `airDateStart` (date, optional): Air date range start
- `airDateEnd` (date, optional): Air date range end
- `sort` (string, optional): Sort field (default: 'airDate')
  - Options: `airDate`, `seasonNumber`, `episodeNumber`, `title`
- `order` (string, optional): Sort order (default: 'desc')

**Request:**
```http
GET /api/v3/episode?seriesId=1&seasonNumber=1&monitored=true&sort=episodeNumber&order=asc
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "episodeFileId": 1,
      "seasonNumber": 1,
      "episodeNumber": 1,
      "title": "Pilot",
      "airDate": "2008-01-20T00:00:00.000Z",
      "airDateUtc": "2008-01-20T02:00:00.000Z",
      "overview": "Walter White, a high school chemistry teacher...",
      "hasFile": true,
      "monitored": true,
      "absoluteEpisodeNumber": 1,
      "unverifiedSceneNumbering": false,
      "images": [],
      "file": {
        "id": 1,
        "seriesId": 1,
        "seasonNumber": 1,
        "episodeNumbers": [1],
        "relativePath": "Season 1/S01E01 - Pilot [1080p].mkv",
        "path": "/media/tv/Breaking Bad/Season 1/S01E01 - Pilot [1080p].mkv",
        "size": 500000000,
        "dateAdded": "2024-01-12T00:00:00.000Z",
        "quality": {
          "quality": {
            "id": 4,
            "name": "HDTV-1080p",
            "source": "television",
            "resolution": 1080
          },
          "revision": {
            "version": 1,
            "real": 0
          }
        },
        "language": {
          "id": 1,
          "name": "English"
        },
        "mediaInfo": {
          "audio": "AAC",
          "audioBitrate": 128,
          "audioChannels": 2,
          "audioLanguages": ["eng"],
          "subtitles": "eng",
          "videoBitrate": 5000,
          "videoBitDepth": 8,
          "videoCodec": "h264",
          "videoFps": 23.976,
          "height": 1080,
          "width": 1920,
          "scanType": "progressive"
        },
        "qualityCutoffNotMet": false,
        "languageCutoffNotMet": false
      },
      "series": {
        "id": 1,
        "tvdbId": 303470,
        "title": "Breaking Bad",
        "sortTitle": "breaking bad",
        "status": "ended",
        "monitored": true,
        "path": "/media/tv/Breaking Bad",
        "qualityProfileId": 1,
        "seasonFolder": true
      },
      "downloaded": true,
      "downloadedEpisode": true,
      "downloadedQuality": "HDTV-1080p",
      "downloadedQualityRevision": {
        "version": 1,
        "real": 0
      },
      "downloadedDate": "2024-01-12T00:00:00.000Z",
      "downloadedEpisodeId": 1,
      "customFormats": [],
      "customFormatScore": 0
    }
  ],
  "page": 1,
  "pageSize": 50,
  "totalRecords": 62,
  "totalPages": 2,
  "links": {
    "first": "/api/v3/episode?page=1&pageSize=50",
    "prev": null,
    "next": "/api/v3/episode?page=2&pageSize=50",
    "last": "/api/v3/episode?page=2&pageSize=50"
  }
}
```

#### GET /api/v3/episode/:id
Get episode by ID.

**Path Parameters:**
- `id` (integer, required): Episode ID

**Request:**
```http
GET /api/v3/episode/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "seriesId": 1,
    "episodeFileId": 1,
    "seasonNumber": 1,
    "episodeNumber": 1,
    "title": "Pilot",
    "airDate": "2008-01-20T00:00:00.000Z",
    "airDateUtc": "2008-01-20T02:00:00.000Z",
    "overview": "Walter White, a high school chemistry teacher...",
    "hasFile": true,
    "monitored": true,
    "absoluteEpisodeNumber": 1,
    "unverifiedSceneNumbering": false,
    "images": [],
    "file": {
      "id": 1,
      "seriesId": 1,
      "seasonNumber": 1,
      "episodeNumbers": [1],
      "relativePath": "Season 1/S01E01 - Pilot [1080p].mkv",
      "path": "/media/tv/Breaking Bad/Season 1/S01E01 - Pilot [1080p].mkv",
      "size": 500000000,
      "dateAdded": "2024-01-12T00:00:00.000Z",
      "quality": { ... },
      "language": { ... },
      "mediaInfo": { ... }
    },
    "series": {
      "id": 1,
      "tvdbId": 303470,
      "title": "Breaking Bad",
      "sortTitle": "breaking bad",
      "status": "ended",
      "monitored": true,
      "path": "/media/tv/Breaking Bad",
      "qualityProfileId": 1,
      "seasonFolder": true
    },
    "downloaded": true,
    "downloadedEpisode": true,
    "downloadedQuality": "HDTV-1080p",
    "downloadedQualityRevision": {
      "version": 1,
      "real": 0
    },
    "downloadedDate": "2024-01-12T00:00:00.000Z",
    "downloadedEpisodeId": 1,
    "customFormats": [],
    "customFormatScore": 0
  }
}
```

#### PUT /api/v3/episode/:id
Update an episode.

**Path Parameters:**
- `id` (integer, required): Episode ID

**Request Body:**
```json
{
  "monitored": false,
  "episodeFileId": 2
}
```

**Response:**
```json
{
  "data": {
    "seriesId": 1,
    "episodeFileId": 2,
    "seasonNumber": 1,
    "episodeNumber": 1,
    "title": "Pilot",
    "airDate": "2008-01-20T00:00:00.000Z",
    "airDateUtc": "2008-01-20T02:00:00.000Z",
    "overview": "Walter White, a high school chemistry teacher...",
    "hasFile": true,
    "monitored": false,
    "absoluteEpisodeNumber": 1,
    "unverifiedSceneNumbering": false,
    "file": { ... }
  }
}
```

#### PUT /api/v3/episode/:id/monitor
Toggle episode monitoring.

**Path Parameters:**
- `id` (integer, required): Episode ID

**Request Body:**
```json
{
  "monitored": false
}
```

**Response:**
```json
{
  "data": {
    "seriesId": 1,
    "episodeFileId": 1,
    "seasonNumber": 1,
    "episodeNumber": 1,
    "title": "Pilot",
    "monitored": false,
    "hasFile": true
  }
}
```

#### POST /api/v3/episode/delete
Delete episode files (can be monitored).

**Request Body:**
```json
{
  "episodeIds": [1, 2, 3],
  "deleteFiles": false
}
```

**Response:**
```json
{
  "data": [
    {
      "episodeId": 1,
      "deleted": true
    },
    {
      "episodeId": 2,
      "deleted": true
    }
  ]
}
```

#### POST /api/v3/episode/set-unmonitored
Set episodes as unmonitored (bulk).

**Request Body:**
```json
{
  "episodeIds": [1, 2, 3]
}
```

**Response:**
```
HTTP 202 Accepted
```

#### POST /api/v3/episode/set-monitored
Set episodes as monitored (bulk).

**Request Body:**
```json
{
  "episodeIds": [1, 2, 3]
}
```

**Response:**
```
HTTP 202 Accepted
```

---

### Wanted (Missing & Cutoff)

#### GET /api/v3/wanted/missing
Get missing episodes.

**Query Parameters:**
- `page` (integer, optional): Page number
- `pageSize` (integer, optional): Items per page (default: 20)
- `sort` (string, optional): Sort field
  - Options: `airDate`, `series`, `seasonNumber`, `episodeNumber`
- `order` (string, optional): Sort order
- `seriesId` (integer, optional): Filter by series
- `seasonNumber` (integer, optional): Filter by season
- `monitored` (boolean, optional): Filter by monitored
- `includeSeries` (boolean, optional): Include series information
- `includeEpisodeImages` (boolean, optional): Include episode images
- `includeEpisodeFile` (boolean, optional): Include episode file information

**Request:**
```http
GET /api/v3/wanted/missing?page=1&pageSize=20&sort=airDate&order=desc&includeSeries=true
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "tvdbId": 303470,
      "title": "Breaking Bad",
      "sortTitle": "breaking bad",
      "status": "continuing",
      "overview": "Walter White, a high school chemistry teacher...",
      "network": "AMC",
      "airTime": "21:00",
      "monitored": true,
      "seasonFolder": true,
      "path": "/media/tv/Breaking Bad",
      "qualityProfileId": 1,
      "seasons": [ ... ],
      "year": 2008,
      "runtime": 49,
      "genres": ["Crime", "Drama"],
      "tags": [1, 2],
      "added": "2015-01-01T00:00:00.000Z",
      "ratings": {
        "votes": 5000,
        "value": 9.5
      },
      "season": {
        "seasonNumber": 5,
        "monitored": true
      },
      "episode": {
        "seriesId": 1,
        "episodeFileId": null,
        "seasonNumber": 5,
        "episodeNumber": 12,
        "title": "Rabid Dog",
        "airDate": "2009-03-08T00:00:00.000Z",
        "airDateUtc": "2009-03-08T02:00:00.000Z",
        "overview": "Walter's secret is compromised...",
        "hasFile": false,
        "monitored": true,
        "absoluteEpisodeNumber": 60,
        "unverifiedSceneNumbering": false,
        "images": [],
        "file": null
      },
      "statistics": {
        "episodeCount": 62,
        "episodeFileCount": 61,
        "totalEpisodeCount": 62,
        "sizeOnDisk": 45000000000,
        "percentOfEpisodes": 98.39
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 1,
  "totalPages": 1
}
```

#### POST /api/v3/wanted/missing/search
Search for missing episodes.

**Request Body:**
```json
{
  "seriesId": 1,
  "seasonNumber": 5,
  "episodeId": 72
}
```

**Response:**
```
HTTP 202 Accepted
```

#### GET /api/v3/wanted/cutoff
Get cutoff unmet episodes.

**Query Parameters:**
- `page` (integer, optional): Page number
- `pageSize` (integer, optional): Items per page
- `sort` (string, optional): Sort field
- `order` (string, optional): Sort order
- `seriesId` (integer, optional): Filter by series
- `seasonNumber` (integer, optional): Filter by season
- `monitored` (boolean, optional): Filter by monitored
- `includeSeries` (boolean, optional): Include series information

**Request:**
```http
GET /api/v3/wanted/cutoff?page=1&pageSize=20&sort=airDate&order=asc&includeSeries=true
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "tvdbId": 303470,
      "title": "Breaking Bad",
      "sortTitle": "breaking bad",
      "status": "continuing",
      "monitored": true,
      "seasonFolder": true,
      "path": "/media/tv/Breaking Bad",
      "qualityProfileId": 1,
      "seasons": [ ... ],
      "year": 2008,
      "runtime": 49,
      "genres": ["Crime", "Drama"],
      "tags": [1, 2],
      "added": "2015-01-01T00:00:00.000Z",
      "ratings": {
        "votes": 5000,
        "value": 9.5
      },
      "season": {
        "seasonNumber": 1,
        "monitored": true
      },
      "episode": {
        "seriesId": 1,
        "episodeFileId": 1,
        "seasonNumber": 1,
        "episodeNumber": 1,
        "title": "Pilot",
        "airDate": "2008-01-20T00:00:00.000Z",
        "airDateUtc": "2008-01-20T02:00:00.000Z",
        "overview": "Walter White, a high school chemistry teacher...",
        "hasFile": true,
        "monitored": true,
        "file": {
          "id": 1,
          "quality": {
            "quality": {
              "id": 4,
              "name": "HDTV-720p",
              "source": "television",
              "resolution": 720
            },
            "revision": {
              "version": 1,
              "real": 0
            }
          },
          "size": 100000000
        }
      },
      "statistics": {
        "episodeCount": 62,
        "episodeFileCount": 62,
        "totalEpisodeCount": 62,
        "sizeOnDisk": 45000000000,
        "percentOfEpisodes": 100
      },
      "wantedCutoff": {
        "cutoff": 6,
        "cutoffFormat": {
          "id": 4,
          "name": "HDTV-720p",
          "source": "television",
          "resolution": 720
        },
        "cutoffFormatScore": 0,
        "cutoffFormatItems": [
          {
            "id": 4,
            "name": "HDTV-720p",
            "score": 0
          },
          {
            "id": 8,
            "name": "WEBDL-720p",
            "score": 5
          }
        ],
        "cutoffUnmet": false
      },
      "wantedMissing": false
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 1,
  "totalPages": 1
}
```

---

### Queue

#### GET /api/v3/queue
Get download queue.

**Query Parameters:**
- `page` (integer, optional): Page number
- `pageSize` (integer, optional): Items per page
- `sort` (string, optional): Sort field
  - Options: `timeleft`, `title`, `protocol`, `series`, `quality`
- `order` (string, optional): Sort order
- `includeSeries` (boolean, optional): Include series information
- `includeEpisode` (boolean, optional): Include episode information

**Request:**
```http
GET /api/v3/queue?sort=timeleft&order=asc&includeSeries=true
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "episodeId": 72,
      "series": {
        "id": 1,
        "tvdbId": 303470,
        "title": "Breaking Bad",
        "sortTitle": "breaking bad",
        "status": "continuing",
        "monitored": true,
        "path": "/media/tv/Breaking Bad",
        "qualityProfileId": 1,
        "seasonFolder": true
      },
      "episode": {
        "seriesId": 1,
        "episodeFileId": null,
        "seasonNumber": 5,
        "episodeNumber": 12,
        "title": "Rabid Dog",
        "airDate": "2009-03-08T00:00:00.000Z",
        "airDateUtc": "2009-03-08T02:00:00.000Z",
        "hasFile": false,
        "monitored": true,
        "file": null
      },
      "language": {
        "id": 1,
        "name": "English"
      },
      "quality": {
        "quality": {
          "id": 4,
          "name": "HDTV-720p",
          "source": "television",
          "resolution": 720
        },
        "revision": {
          "version": 1,
          "real": 0
        }
      },
      "customFormats": [],
      "customFormatScore": 0,
      "indexer": "NZBgeek",
      "size": 500000000,
      "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
      "sizeleft": 250000000,
      "timeleft": "00:10:30",
      "estimatedCompletionTime": "2024-01-12T10:30:00.000Z",
      "status": "downloading",
      "trackedDownloadStatus": "ok",
      "trackedDownloadState": "downloading",
      "errorMessage": null,
      "downloadId": "ABC123",
      "downloadClient": "Sabnzbd",
      "downloadClientHasPostImportCategory": false,
      "protocol": "usenet",
      "downloadForced": false,
      "isPossibleInteractiveImport": false,
      "remoteMovie": false,
      "episodeHasFile": false,
      "downloadClientHasCompleted": false,
      "episode": null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 1,
  "totalPages": 1,
  "totalSize": 500000000,
  "totalRemaining": 250000000,
  "totalSizeleft": 250000000,
  "averageCompletionTime": "00:20:15"
}
```

#### GET /api/v3/queue/details/:id
Get queue item details.

**Path Parameters:**
- `id` (integer, required): Queue item ID

**Request:**
```http
GET /api/v3/queue/details/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "seriesId": 1,
    "episodeId": 72,
    "series": { ... },
    "episode": { ... },
    "language": { ... },
    "quality": { ... },
    "customFormats": [],
    "customFormatScore": 0,
    "indexer": "NZBgeek",
    "size": 500000000,
    "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
    "sizeleft": 250000000,
    "timeleft": "00:10:30",
    "estimatedCompletionTime": "2024-01-12T10:30:00.000Z",
    "status": "downloading",
    "trackedDownloadStatus": "ok",
    "trackedDownloadState": "downloading",
    "errorMessage": null,
    "downloadId": "ABC123",
    "downloadClient": "Sabnzbd",
    "downloadClientHasPostImportCategory": false,
    "protocol": "usenet",
    "downloadForced": false,
    "isPossibleInteractiveImport": false,
    "remoteMovie": false,
    "episodeHasFile": false,
    "downloadClientHasCompleted": false
  }
}
```

#### DELETE /api/v3/queue/:id
Remove item from queue.

**Path Parameters:**
- `id` (integer, required): Queue item ID

**Blocklist:** (boolean, optional, default: false): Add to blocklist

**Request:**
```http
DELETE /api/v3/queue/1?blocklist=true
X-Api-Key: your-api-key-here
```

**Response:**
```
HTTP 204 No Content
```

#### DELETE /api/v3/queue/bulk
Remove multiple items from queue.

**Request Body:**
```json
{
  "ids": [1, 2, 3],
  "blocklist": true
}
```

**Response:**
```
HTTP 202 Accepted
```

#### POST /api/v3/queue/grab
Grab a release.

**Request Body:**
```json
{
  "indexerId": 1,
  "guid": "abc123",
  "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
  "downloadClient": "Sabnzbd"
}
```

**Response:**
```json
{
  "data": {
    "seriesId": 1,
    "episodeId": 72,
    "language": { ... },
    "quality": { ... },
    "customFormats": [],
    "customFormatScore": 0,
    "indexer": "NZBgeek",
    "size": 500000000,
    "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
    "sizeleft": 500000,
    "timeleft": "00:20:00",
    "estimatedCompletionTime": "2024-01-12T10:30:00.000Z",
    "status": "queued",
    "trackedDownloadStatus": "ok",
    "trackedDownloadState": "queued",
    "errorMessage": null,
    "downloadId": "ABC123",
    "downloadClient": "Sabnzbd"
  }
}
```

#### POST /api/v3/queue/grab/bulk
Grab multiple releases.

**Request Body:**
```json
{
  "guids": [
    {
      "indexerId": 1,
      "guid": "abc123",
      "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE"
    },
    {
      "indexerId": 2,
      "guid": "def456",
      "title": "Breaking.Bad.S05E13.720p.HDTV.x264-EVOLVE"
    }
  ],
  "downloadClient": "Sabnzbd"
}
```

**Response:**
```json
{
  "data": [
    {
      "downloadId": "ABC123",
      "guid": "abc123",
      "queued": true
    },
    {
      "downloadId": "DEF456",
      "guid": "def456",
      "queued": true
    }
  ]
}
```

---

### Release

#### POST /api/v3/release
Search for releases.

**Request Body:**
```json
{
  "seriesId": 1,
  "seasonNumber": 5,
  "episodeId": 72,
  "query": "Breaking Bad",
  "categories": ["tv"],
  "protocols": ["torrent"],
  "indexers": [1, 2],
  "languages": [1],
  "qualityIds": [4],
  "customFormats": [],
  "customFormatScore": 0,
  "pageSize": 50
}
```

**Response:**
```json
{
  "data": [
    {
      "guid": "abc123",
      "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
      "indexer": "NZBgeek",
      "indexerId": 1,
      "protocol": "usenet",
      "age": 5,
      "ageMinutes": 5,
      "ageHours": 0.08,
      "publishDate": "2024-01-12T10:00:00.000Z",
      "size": 500000000,
      "files": 2,
           "grabs": 0,
      "peers": 0,
      "seederCount": 0,
      "leechers": 0,
      "seeders": 100,
      "downloadUrl": "nzb://nzbgeek.info/getnzb/abc123.nzb",
      "infoUrl": "https://nzbgeek.info/details/abc123",
      "commentUrl": "https://nzbgeek.info/details/abc123#comments",
      "magnetUrl": null,
      "indexerFlags": ["freeleech", "internal"],
      "rejections": []
    },
    {
      "guid": "def456",
      "title": "Breaking.Bad.S05E13.720p.HDTV.x264-EVOLVE",
      "indexer": "NZB.su",
      "indexerId": 2,
      "protocol": "usenet",
      "age": 10,
      "ageMinutes": 10,
      "ageHours": 0.17,
      "publishDate": "2024-01-12T09:55:00.000Z",
      "size": 450000000,
      "files": 1,
      "grabs": 5,
      "peers": 0,
      "seederCount": 0,
      "leechers": 50,
      "seeders": 80,
      "downloadUrl": "nzb://nzb.su/getnzb/def456.nzb",
      "infoUrl": "https://nzb.su/details/def456",
      "commentUrl": "https://nzb.su/details/def456#comments",
      "magnetUrl": null,
      "indexerFlags": ["internal"],
      "rejections": []
    }
  ]
}
```

#### POST /api/v3/release/push
Push release to download client.

**Request Body:**
```json
{
  "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
  "downloadUrl": "magnet:?xt=urn:btih:...",
  "downloadClientId": 1,
  "indexerId": 1,
  "torrentInfoHash": "abc123",
  "infoUrl": "https://nzbgeek.info/details/abc123",
  "guid": "abc123",
  "protocol": "torrent",
  "publishDate": "2024-01-12T10:00:00.000Z",
  "size": 500000000
}
```

**Response:**
```
HTTP 201 Created
```

---

### History

#### GET /api/v3/history
Get history.

**Query Parameters:**
- `page` (integer, optional): Page number
- `pageSize` (integer, optional): Items per page
- `sort` (string, optional): Sort field
  - Options: `date`, `series`, `episode`, `quality`
- `order` (string, optional): Sort order
- `seriesId` (integer, optional): Filter by series
- `episodeId` (integer, optional): Filter by episode
- `eventType` (string, optional): Filter by event type
  - Options: `grabbed`, `downloadFolderImported`, `downloadFailed`, `downloadIgnored`, `fileDeleted`, `seriesDeleted`
- `dateStart` (date, optional): Date range start
- `dateEnd` (date, optional): Date range end

**Request:**
```http
GET /api/v3/history?page=1&pageSize=20&sort=date&order=desc
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "episodeId": 72,
      "sourceTitle": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
      "quality": {
        "quality": {
          "id": 4,
          "name": "HDTV-720p",
          "source": "television",
          "resolution": 720
        },
        "revision": {
          "version": 1,
          "real": 0
        }
      },
      "customFormats": [],
      "customFormatScore": 0,
      "date": "2024-01-12T10:00:00.000Z",
      "eventType": "grabbed",
      "data": {
        "downloadId": "ABC123",
        "downloadClient": "Sabnzbd",
        "downloadClientName": "Sabnzbd",
        "downloadClientState": "complete",
        "downloadClientCategory": "tv-sonarr",
        "indexer": "NZBgeek",
        "indexerId": 1,
        "release": {
          "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
          "indexer": "NZBgeek",
          "indexerId": 1
        },
        "torrentInfoHash": "abc123",
        "infoUrl": "https://nzbgeek.info/details/abc123",
        "guid": "abc123",
        "protocol": "usenet",
        "publishDate": "2024-01-12T10:00:00.000Z",
        "size": 500000000,
        "files": 2
      },
      "series": {
        "id": 1,
        "tvdbId": 303470,
        "title": "Breaking Bad",
        "sortTitle": "breaking bad",
        "status": "continuing",
        "monitored": true,
        "path": "/media/tv/Breaking Bad"
      },
      "episode": {
        "seriesId": 1,
        "episodeFileId": null,
        "seasonNumber": 5,
        "episodeNumber": 12,
        "title": "Rabid Dog",
        "airDate": "2009-03-08T00::00:00.000Z",
        "overview": "Walter's secret is compromised...",
        "hasFile": false,
        "monitored": true
      },
      "downloadId": "ABC123",
      "downloadClient": "Sabnzbd"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 100,
  "totalPages": 5
}
```

#### POST /api/v3/history/failed
Failed items from history can be redownloaded.

**Request Body:**
```json
{
  "id": 1,
  "seriesId": 1,
  "downloadId": "ABC123",
  "indexerId": 1,
  "guid": "abc123"
}
```

**Response:**
```
HTTP 202 Accepted
```

#### DELETE /api/v3/history
Delete history item.

**Request:**
```json
{
  "id": 1,
  "seriesId": 1,
  "downloadId": "ABC123",
  "indexerId": 1,
  "guid": "abc123"
}
```

**Response:**
```
HTTP 204 No Content
```

#### DELETE /api/v3/history/bulk
Bulk delete history items.

**Request:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response:**
```
HTTP 204 No Content
```

---

### Blocklist

#### GET /api/v3/blocklist
Get blocklist.

**Query Parameters:**
- `page` (integer, optional): Page number
- `pageSize` (integer, optional): Items per page
- `sort` (string, optional): Sort field
  - Options: `date`, `series`, `sourceTitle`
- `order` (string, optional): Sort order
- `seriesId` (integer, optional): Filter by series
- `source` (string, optional): Filter by source (indexer name)
- `protocol` (string, optional): Filter by protocol
- `dateStart` (date, optional): Date range start
- `dateEnd` (date, optional): Date range end

**Request:**
```http
GET /api/v3/blocklist?page=1&pageSize=20&sort=date&order=desc
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "seriesId": 1,
      "episodeId": 72,
      "sourceTitle": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
      "source": "NZBgeek",
      "language": {
        "id": 1,
        "name": "English"
      },
      "quality": {
        "quality": {
          "id": 4,
          "name": "HDTV-720p",
          "source": "television",
          "resolution": 720
        },
        "revision": {
          "version": 1,
          "real": 0
        }
      },
      "date": "2024-01-12T10:00:00.000Z",
      "protocol": "usenet",
      "indexer": "NZBgeek",
      "message": "Quality too low",
      "series": {
        "id": 1,
        "tvdbId": 303470,
        "title": "Breaking Bad",
        "sortTitle": "breaking bad",
        "status": "continuing"
      },
      "episode": {
        "seriesId": 1,
        "episodeFileId": null,
        "seasonNumber": 5,
        "episodeNumber": 12,
        "title": "Rabid Dog",
        "airDate": "2009-03-08T00:00:00.000Z",
        "hasFile": false,
        "monitored": true
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalRecords": 50,
  "totalPages": 3
}
```

#### DELETE /api/v3/blocklist/:id
Delete from blocklist.

**Path Parameters:**
- `id` (integer, required): Blocklist item ID

**Request:**
```http
DELETE /api/v3/blocklist/1
X-Api-Key: your-api-key-here
```

**Response:**
```
HTTP 204 No Content
```

#### DELETE /api/v3/blocklist/bulk
Bulk delete from blocklist.

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response:```
HTTP 204 No Content
```

#### DELETE /api/v3/blocklist/all
Delete all from blocklist.

**Request:**
```http
DELETE /api/v3/blocklist/all
X-Api-Key: your-api-key-here
```

**Response:**
```
HTTP 204 No Content
```

---

### Calendar

#### GET /api/v3/calendar
Get calendar.

**Query Parameters:**
- `start` (date, required): Start date (ISO 8601 format)
- `end` (date, required): End date (ISO 8601 format)
- `unmonitored` (boolean, optional): Include unmonitored series (default: false)
- `seriesId` (integer, optional): Filter by series ID
- `includeSeries` (boolean, optional): Include full series information
- `includeEpisodeFile` (boolean, optional): Include episode file information
- `includeEpisodeImages` (boolean, optional): Include episode images

**Request:**
```http
GET /api/v3/calendar?start=2024-01-01&end=2024-01-31&unmonitored=false&includeSeries=true
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "seriesId": 1,
      "episodeFileId": null,
      "seasonNumber": 5,
      "episodeNumber": 12,
      "title": "Rabid Dog",
      "airDate": "2009-03-08T00:00:00.000Z",
      "airDateUtc": "2009-03-08T02:00:00.000Z",
      "overview": "Walter's secret is compromised...",
      "hasFile": false,
      "monitored": true,
      "absoluteEpisodeNumber": 60,
      "unverifiedSceneNumbering": false,
      "images": [],
      "file": null,
      "series": {
        "id": 1,
        "tvdbId": 303470,
        "title": "Breaking Bad",
        "sortTitle": "breaking bad",
        "status": "continuing",
        "overview": "A high school chemistry teacher...",
        "network": "AMC",
        "airTime": "21:00",
        "monitored": true,
        "monitorNewItems": "all",
        "qualityProfileId": 1,
        "seasonFolder": true,
        "useSceneNumbering": false,
        "path": "/media/tv/Breaking Bad",
        "year": 2008,
        "runtime": 49,
        "genres": ["Crime", "Drama", "Thriller"],
        "tags": [1, 2],
        "added": "2015-01-01T00:00:00.000Z",
        "ratings": {
          "votes": 5000,
          "value": 9.5
        },
        "images": [ ... ],
        "seasons": [ ... ]
      },
      "downloaded": false,
      "downloadedEpisode": false,
      "downloadedQuality": null,
      "downloadedQualityRevision": null,
      "downloadedDate": null,
      "downloadedEpisodeId": null,
      "customFormats": [],
      "customFormatScore": 0,
      "releaseDate": null,
      "grabDate": null,
      "grabId": null
    }
  ]
}
```

---

### System

#### GET /api/v3/system/status
Get system status.

**Request:**
```http
GET /api/v3/system/status
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "version": "1.0.0",
    "versionName": "Sonarr",
    "branch": "main",
    "startTime": "2024-01-01T00:00:00.000Z",
    "migrationVersion": 100,
    "isConfigured": true,
      "appData": "/config",
      "osVersion": "Darwin 23.0.0",
      "isDocker": true,
      "isLinux": false,
      "isMacOs": true,
      "isWindows": false,
      "isMono": false,
      "isProduction": true,
      "isAdmin": true,
      "startupPath": "/config",
      "sqliteVersion": "3.44.2",
      "appData": "/config",
      "osVersion": "Docker",
      "isDocker": true,
      "isLinux": true,
      "isProduction": false,
      "runtimeVersion": "Bun 1.0.30",
      "packageName": "sonarr",
      "packageAuthor": "Sonarr Team",
      "packageVersion": "1.0.0",
      "packageUpdateMechanism": "Docker",
      "branch": "main",
      "version": "1.0.0",
      "buildTime": "2024-01-01T00:00:00.000Z",
      "isDebug": false,
      "isDevelopment": false,
      "isProduction": false,
      "isUserInteractive": false,
      "isWindows": false,
      "osName": "Linux",
      "isLinux": true,
      "isMacOs": false,
      "isOsX": false,
      "startupPath": "/config",
      "appData": "/config",
      "runtimeVersion": "Bun 1.0.30",
      "startTime": "0",
      "authentication": true,
      "startPath": "/config",
      "instanceName": "Sonarr"
    }
  }
}
```

#### GET /api/v3/system/health
Get system health.

**Request:**
```http
GET /api/v3/system/health
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "status": "ok",
    "timestamp": "2024-01-12T10:00:00.000Z",
    "uptime": 3600000,
    "version": "1.0.0",
    "checks": {
      "database": {
        "status": "ok",
        "latency": 5
      },
      "redis": {
        "status": "ok",
        "latency": 2
      },
      "downloadClients": {
        "status": "ok",
        "sabnzbd": {
          "status": "ok",
          "latency": 100
        },
        "qbittorrent": {
          "status": "degraded",
          "latency": 5000
        }
      },
      "indexers": {
        "status": "degraded",
        "indexers": {
          "NZBgeek": {
            "status": "ok",
            "lastSync": "2024-01-12T09:45:00.000Z",
            "nextSync": "2024-01-12T10:00:00.000Z",
            "successRate": 95.5,
            "failureCount": 2
          },
          "NZB.su": {
            "status": "error",
            "lastSync": "2024-01-12T09:30:00.000Z",
            "nextSync": "2024-01-12T:09:45:00.000Z",
            "successRate": 0,
            "failureCount": 5
          }
        }
      },
      "workers": {
        "status": "ok",
        "rss": {
          "status": "ok",
          "activeJobs": 2,
          "queuedJobs": 15
        },
        "import": {
          "status": "ok",
          "activeJobs": 1,
          "queuedJobs": 5
        },
        "decision": {
          "status": "ok",
          "activeJobs": 10,
          "queuedJobs": 25
        },
        "organize": {
          "status": "ok",
          "activeJobs": 1,
          "queuedJobs": 3
        }
      },
      "storage": {
        "status": "ok",
        "rootFolders": [
          {
            "path": "/media/tv",
            "freeSpace": 5000000000000,
            "totalSpace": 20000000000000,
            "freeSpacePercentage": 25
          }
        ]
      }
    }
  }
}
```

#### GET /api/v3/system/tasks
Get system tasks.

**Request:**
```http
GET /api/v3/system/tasks
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "RSS Sync",
      "taskName": "RssSyncCommand",
      "instanceName": "RSS Sync (NZBgeek)",
      "interval": 15,
      "lastExecution": "2024-01-12T10:00:00.000Z",
      "nextExecution": "2024-01-12T10:15:00.000Z",
      "lastStartTime": "2024-01-12T10:00:00.000Z",
      "duration": "00:00:30",
      "enabled": true,
      "success": true
    },
    {
      "id": 2,
      "name": "Refresh Series",
      "taskName": "RefreshSeriesCommand",
      "instanceName": "Refresh Series",
      "interval": 3600,
      "lastExecution": "2024-01-12T09:00:00.000Z",
      "nextExecution": "2024-01-12T10:00:00.000Z",
      "lastStartTime": "2024-01-12T09:00:00.000Z",
      "duration": "00:00:00",
      "enabled": true,
      "success": true
    }
  ]
}
```

#### POST /api/v3/command
Execute a command.

**Request Body:**
```json
{
  "name": "RefreshSeriesCommand",
  "seriesId": 1,
  "downloadMissingEpisodes": true,
  "refreshStarted": true
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "RefreshSeriesCommand",
    "startedOn": "2024-01-12T10:00:00.000Z",
    "state": "started",
    "trigger": "manual",
    "commandName": "Refresh Series",
    "seriesId": 1,
    "downloadMissingEpisodes": true,
    "refreshStarted": true
  }
}
```

#### GET /api/v3/command/:id
Get command status.

**Path Parameters:**
- `id` (integer, required): Command ID

**Request:**
```http
GET /api/v3/command/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "RssSyncCommand",
    "startedOn": "2024-01-12T10:00:00.000Z",
    "state": "completed",
    "trigger": "manual",
    "commandName": "RSS Sync",
    "message": "Completed",
    "result": {
      "seriesId": 1,
      "tvdbId": 303470,
      "title": "Breaking Bad",
      "refreshed": true
    },
    "stateChangeTime": "2024-01-12T10:00:30.000Z",
    "sendUpdatesToClient": true,
    "updateRequired": false,
    "lastStartTime": "2024-01-12T10:00:00.000Z",
    "duration": "00:00:30",
    "executionType": "local",
    "seriesId": null,
    "seasonNumber": null,
      "episodeFileId": null,
      "downloadClientId": null,
      "downloadClientType": null,
      "downloadClientName": null,
      "indexerId": null,
      "indexerName": null,
      "downloadId": null,
      "targetIndex": null,
      "lastExecution": "2024-01-12T09:30:00.000Z",
      "nextExecution": "2024-01-12T09:45:00.000Z",
      "lastStartTime": "2024-01-12T09:30:00.000Z",
      "duration": "00:00:30",
      "enabled": true,
      "success": true
    }
  }
}
```

---

### Config

#### GET /api/v3/config/host
Get host configuration.

**Request:**
```http
GET /api/v3/config/host
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "apiKey": "your-api-key-here",
    "urlBase": "/",
    "bindAddress": "*",
    "port": 8989,
    "sslPort": 9898,
    "enableSsl": true,
    "launchBrowser": false,
    "username": "admin",
    "password": "password123",
    "authenticationEnabled": false,
    "authenticationMethod": "forms",
    "authenticationRequired": "disabledForLocalAddresses",
    "analyticsEnabled": false,
    "branch": "main",
    "autoUpdate": "automatic",
    "updateMechanism": "docker",
    "updateScriptBranch": "main",
    "sqliteTimeout": 30,
    "logLevel": "info"
  }
}
```

#### PUT /api/v3/config/host
Update host configuration.

**Request Body:**
```json
{
  "urlBase": "/sonarr",
  "bindAddress": "0.0.0.0",
  "port": 8989,
  "sslPort": 9898,
  "enableSsl": true,
  "launchBrowser": false,
  "apiKey": "new-api-key-here",
  "username": "admin",
  "password": "newpassword",
  "authenticationEnabled": true,
  "authenticationMethod": "forms",
  "authenticationRequired": "enabled",
  "logLevel": "debug"
}
```

**Response:**
```json
{
  "data": {
    "apiKey": "new-api-key-here",
    "urlBase": "/sonarr",
    "bindAddress": "0.0.0.0",
    "port": 8989,
    "sslPort": 9898,
    "enableSsl": true,
    "launchBrowser": false,
    "username": "admin",
    "password": "newpassword",
    "authenticationEnabled": true,
    "authenticationMethod": "forms",
    "authenticationRequired": "enabled",
    "logLevel": "debug"
  }
}
```

---

### Root Folders

#### GET /api/v3/rootfolder
Get root folders.

**Request:**
```http
GET /api/v3/rootfolder
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "path": "/media/tv",
      "accessible": true,
      "freeSpace": 5000000000000,
      "totalSpace": 20000000000000,
      "unmappedFolders": [
        {
          "name": "Breaking Bad",
          "relativePath": "Breaking Bad",
          "existingFiles": 62,
          "totalSize": 45000000000
        }
      ],
      "defaultQualityProfileId": 1,
      "defaultMonitorNewItems": "all"
    },
    {
      "id": 2,
      "path": "/media/tv/anime",
      "accessible": true,
      "freeSpace": 800000000000,
      "totalSpace: 1000000000000,
      "unmappedFolders": [],
      "defaultQualityProfileId": 2,
      "defaultMonitorNewItems": "future"
    }
  ]
}
```

#### POST /api/v3/rootfolder
Add root folder.

**Request Body:**
```json
{
  "path": "/media/tv",
  "defaultMonitorNewItems": "all",
  "defaultQualityProfileId": 1,
  "isCloud": false
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "path": "/media/tv",
    "accessible": true,
    "freeSpace": 5000000000000,
    "totalSpace": 20000000000000,
    "unmappedFolders": [ ... ],
    "defaultQualityProfileId": 1,
    "defaultMonitorNewItems": "all"
  }
}
```

#### DELETE /api/v3/rootfolder/:id
Delete root folder.

**Path Parameters:**
- `id` (integer, required): Root folder ID

**Request:**
```http
DELETE /api/v3/rootfolder/1
X-Api-Key: your-api-key-here
```

```
HTTP 204 No Content
```

---

### Tags

#### GET /api/v3/tag
Get tags.

**Request:```
```http
GET /api/v3/tag
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "label": "Movies",
      "delayProfile": 1
    },
    {
      "id": 2,
      "label": "Anime",
      "delayProfile": 2
    },
    {
      "id": 3,
      "label": "New",
      "delayProfile": null
    }
  ]
}
```

#### POST /api/v3/tag
Create tag.

**Request Body:**
```json
{
  "label": "Movies",
  "delayProfile": 1
}
```

**Response:**
```json
{
  "data": {
    "id": 4,
    "label": "Movies",
    "delayProfile": 1
  }
}
```

#### PUT /api/v3/tag/:id
Update tag.

**Path Parameters:**
- `id` (integer, required): Tag ID

**Request Body:**
```json
{
  "label": "Movies - Updated",
  "delayProfile": 2
}
```

**Response:```
```json
{
  "data": {
    "id": 1,
    "label": "Movies - Updated",
    "delayProfile": 2
  }
}
```

#### DELETE /api/v3/tag/:id
Delete tag.

**Path Parameters:**
- `id` (integer, required): Tag ID

**Request:**
```http
DELETE /api/v3/tag/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "label": "Movies",
    "delayProfile": 1
  }
}
```

---

### Quality Profiles

#### GET /api/v3/qualityprofile
Get quality profiles.

**Request:**
```http
GET /api/v3/qualityprofile
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "HD - 720p/1080p",
      "cutoff": 6,
      "items": [
        {
          "id": 1,
          "quality": {
            "id": 1,
            "name": "Unknown",
            "source": "unknown",
            "resolution": 0
          },
          "allowed": true,
          "name": "Unknown",
          "score": 0
        },
        {
          "id": 4,
          "quality": {
            "id": 4,
            "name": "HDTV-720p",
            "source": "television",
            "resolution": 720
          },
          "allowed": true,
          "name": "HDTV-720p",
          "score": 0
        },
        {
          "id": 6,
          "quality": {
            "id": 6,
            "name": "HDTV-1080p",
            "source": "television",
            "resolution": 1080
          },
          "allowed": true,
          "name": "HDTV-1080p",
          "score": 100
        },
        {
          "id": 8,
          "quality": {
            "id": 8,
            "name": "WEBDL-720p",
            "source": "web",
            "resolution": 720
          },
          "allowed": true,
          "name": "WEBDL-720p",
          "score": 105
        },
        {
          "id": 10,
          "quality": {
            "id": 10,
            "name": "WEBDL-1080p",
            "source": "web",
            "resolution": 1080
          },
          "allowed": true,
          "name": "WEBDL-1080p",
          "score": 105
        }
      ],
      "minFormatScore": 0,
      "upgradeAllowed": true
    }
  ]
}
```

#### GET /api/v3/qualityprofile/:id
Get quality profile by ID.

**Path Parameters:**
- `id` (integer, required): Quality profile ID

**Request:**
```http
GET /api/v3/qualityprofile/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "HD - 720p/1080p",
    "cutoff": 6,
    "items": [ ... ],
    "minFormatScore": 0,
    "upgradeAllowed": true
  }
}
```

#### POST /api/v3/qualityprofile
Create quality profile.

**Request Body:**
```json
{
  "name": "SD - 480p/576p",
  "cutoff": 4,
  "items": [
    {
      "qualityId": 2,
      "allowed": true,
      "name": "SDTV",
      "score": 0
    },
    {
      "qualityId": 3,
      "allowed": true,
      "name": "SDTV",
      "score": 0
    }
  ],
  "minFormatScore": 0,
  "upgradeAllowed": true
}
```

**Response:**
```json
{
  "data": {
    "id": 2,
    "name": "SD - 480p/576p",
    "cutoff": 4,
    "items": [ ... ],
    "minFormatScore": 0,
    "upgradeAllowed": true
  }
}
```

#### PUT /api/v3/qualityprofile/:id
Update quality profile.

**Path Parameters:**
- `id` (integer, required): Quality profile ID

**Request Body:**
```json
{
  "name": "HD - 720p/1080p (Updated)",
  "cutoff": 8,
  "items": [ ... ],
  "minFormatScore": 0,
  "upgradeAllowed": false
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "HD - 720p/1080p (Updated)",
    "cutoff": 8,
    "items": [ ... ],
    "minFormatScore": 0,
    "升级Allowed": false
  }
}
```

#### DELETE /api/v3/qualityprofile/:id
Delete quality profile.

**Path Parameters:**
- `id` (integer, required): Quality profile ID

**Request:**
```http
DELETE /api/v3/qualityprofile/1
X-Api-Key: your-api-key-here
```

**Response:**
```
HTTP 204 No Content
```

#### PUT /api/v3/qualityprofile/schema
Update quality profile schema.

**Request Body:```
```json
{
  "name": "SD - 480p/576p",
  "items": [
    {
      "id": 2,
      "name": "SDTV",
      "allowed": true,
      "score": 0
    },
    {
      "id": 3,
      "name": "SDTV",
      "allowed": true,
      "score": 0
    }
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "id": 2,
      "name": "SDTV",
      "allowed": true,
      "score": 0
    },
    {
      "id": 3,
      "name": "SDTV",
      "allowed": true,
      "score": 0
    }
  ]
}
```

---

### Indexers

#### GET /api/v3/indexer
Get indexers.

**Request:**
```http
GET /api/v3/indexer
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "NZBgeek",
      "enable": true,
      "appProfileId": 1,
      "priority": 1,
      "addPaused": false,
      "downloadClientId": null,
      "implementation": "Torznab",
      "configContract": "TorznabSettings",
      "tags": [1, 2],
      "fields": [
        {
          "order": 1,
          "name": "base url",
          "value": "https://api.nzbgeek.info",
          "type": "textbox"
        },
        {
          "order": 2,
          "name": "api key",
          "value": "your-api-key",
          "type": "password"
        },
        {
          "order": 3,
          "name": "categories",
          "value": ["5000,5030,5040"],
          "type": "select"
        }
      ],
      "status": {
        "lastRssSync": "2024-01-12T10:00:00.000Z",
        "initialFailure": null,
        "mostRecentFailure": null,
        "initialFailureMessage": null,
        "mostRecentFailureMessage": null
      },
      "categories": [
        5000,
        5030,
        5040
      ]
    }
  ]
}
```

#### GET /api/v3/indexer/schema
Get indexer schema.

**Request:**
```http
GET /api/v3/indexer/schema
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Torznab",
      "fields": [
        {
          "order": 1,
          "name": "baseUrl",
          "label": "Base URL",
          "helpText": "The base URL of the indexer",
          "type": "textbox",
          "advanced": false
        },
        {
          "order": 2,
          "name": "apiKey",
          "label": "API Key",
          "helpText": "The API key for the indexer",
          "type": "password",
          "advanced": false
        },
        {
          "order": 3,
          "name": "categories",
          "label": "Categories",
          "helpText": "The categories to fetch from the indexer",
          "type": "select",
          "advanced": false
        }
      ]
    },
    {
      "id": 2,
      "name": "Newznab",
      "fields": [ ... ]
    }
  ]
}
```

#### POST /api/v3/indexer
Create indexer.

**Request Body:**
```json
{
  "name": "NZBgeek",
  "enable": true,
  "appProfileId": 1,
  "priority": 1,
  "config": {
    "baseUrl": "https://api.nzbgeek.info",
    "apiKey": "your-api-key",
    "categories": ["5000", "5030", "5040"]
  },
  "tags": [1, 2]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "NZBgeek",
    "enable": true,
    "appProfileId": 1,
    "priority": 1,
    "addPaused": false,
    "downloadClientId": null,
    "implementation": "Torznab",
    "configContract": "TorznabSettings",
    "tags": [1, 2]
  }
}
```

#### PUT /api/v3/indexer/:id
Update indexer.

**Path Parameters:**
- `id` (integer, required): Indexer ID

**Request Body:**
```json
{
  "name": "NZBgeek",
  "enable": true,
  "appProfileId": 1,
  "priority": 2,
  "addPaused": true,
  "downloadClientId": 1,
  "config": {
    "baseUrl": "https://api.nzbgeek.info",
    "apiKey": "your-api-key-updated",
    "categories": ["5000", "5030", "5040"]
  },
  "tags": [1]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "NZBgeek",
    "enable": true,
    "appProfileId": 1,
    "priority": 2,
    "addPaused": true,
    "downloadClientId": 1,
    "implementation": "Torznab",
    "tags": [1]
  }
}
```

#### DELETE /api/v3/indexer/:id
Delete indexer.

**Path Parameters:**
- `id` (integer, required): Indexer ID

**Request:**
```http
DELETE /api/v3/indexer/1
X-Api-Key: your-api-key-here
```

**Response:```
HTTP 204 No Content
```

#### POST /api/v3/indexer/test
Test indexer connection.

**Request Body:**
```json
{
  "id": 1,
  "name": "NZBgeek",
  "enable": true,
  "appProfileId": 1,
  "priority": 1,
  "config": {
    "baseUrl": "https://api.nzbgeek.info",
    "apiKey": "your-api-key",
    "categories": ["5000", "5030", "5040"]
  }
}
```

**Response:**
```json
{
  "data": {
    "validationPassed": true,
    "warnings": [],
    "errors": []
  }
}
```

#### GET /api/v3/indexer/:id/status
Get indexer status.

**Path Parameters:**
- `id` (integer, required): Indexer ID

**Request:**
```http
GET /api/v3/indexer/1/status
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "NZBgeek",
    "status": "ok",
    "lastRssSync": "2024-01-12T10:00:00.000Z",
    "initialFailure": null,
    "mostRecentFailure": "2024-01-12T09:30:00.000Z",
    "initialFailureMessage": null,
    "mostRecentFailureMessage": "Connection timeout",
    "successRate": 95.5,
    "failureCount": 2
  }
}
```

---

### Download Clients

#### GET /api/v3/downloadclient
Get download clients.

**Request:**
```http
GET /api/v3/downloadclient
X-Api-Key: your-api-key-here
```

**Response:```
```json
{
  "data": [
    {
      "id": 1,
      "name": "Sabnzbd",
      "enable": true,
      "removeCompletedDownloads": true,
      "removeFailedDownloads": true,
      "priority": 1,
      "implementation": "Sabnzbd",
      "configContract": "SabnzbdSettings",
      "tags": [1],
      "fields": [
        {
          "order": 1,
          "name": "host",
          "label": "Host",
          "helpText": "The hostname or IP address of Sabnzbd",
          "type": "textbox",
          "advanced": false
        },
        {
          "order": 2,
          "name": "port",
          "label": "Port",
          "helpText": "The port number of Sabnzdb",
          " "type": "number",
          "advanced": false
        },
        {
          "order": 3,
          "name": "apiKey",
          "label": "API Key",
          "helpText": "The API key for Sabnzdb",
          "type": "password",
          "advanced": false
        },
        {
          "order": 4,
          "name": "useSsl",
          "label": "Use SSL",
          "helpText": "Use SSL for connection",
          "type: "checkbox",
          "advanced": false
        }
      ],
      "status": {
        "initialFailure": null,
        "mostRecentFailure": null,
        "initialFailureMessage": null,
        "mostRecentFailureMessage": null
      }
    }
  ]
}
```

#### GET /api/v3/downloadclient/schema
Get download client schema.

**Request:**
```http
GET /api/v3/downloadclient/schema
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Sabnzbd",
      "fields": [ ... ]
    },
    {
      "id": 2,
      "name": "NZBGet",
      "fields": [ ... ]
    },
    {
      "id": 3,
      "name": "Transmission",
      "fields": [ ... ]
    },
    {
      "id": 4,
      "name": "qBittorrent",
      "fields": [ ... ]
    }
  ]
}
```

#### POST /api/v3/downloadclient
Create download client.

**Request Body:**
```json
{
  "name": "Sabnzbd",
  "enable": true,
  "removeCompletedDownloads": true,
  "removeFailedDownloads": true,
  "priority": 1,
  "config": {
    "host": "localhost",
    "port": 8080,
    "apiKey": "your-api-key",
    "useSsl": false,
    "category": "tv-sonarr",
    "tvCategory": "tv-sonarr",
    "recentTvPriority": 1,
    "olderTvPriority": 2
  },
  "tags": [1]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Sabnzbd",
    "enable": true,
    "removeCompletedDownloads": true,
    "removeFailedDownloads": true,
    "priority": 1,
    "implementation": "Sabnzbd",
    "configContract": "SabnzbdSettings",
    "tags": [1]
  }
}
```

#### PUT /api/v3/downloadclient/:id
Update download client.

**Path Parameters:**
- `id` (integer, required): Download client ID

**Request Body:**
```json
{
  "name": "Sabnzbd",
  "enable": true,
  "removeCompletedDownloads": false,
  "removeFailedDownloads": true,
  "priority": 2,
  "config": {
    "host": "localhost",
    "port": 8080,
    "apiKey": "your-api-key-updated",
    "useSsl": true,
    "category": "tv-sonarr",
    "tvCategory": "tv-sonarr",
    "recentTvPriority": 1,
    "olderTvPriority": 2
  },
  "tags": [1]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Sabnzbd",
    "enable": true,
    "removeCompletedDownloads": false,
    "removeFailedDownloads": true,
    "priority": 2,
    "implementation": "Sabnzbd",
    "tags": [1]
  }
}
```

#### DELETE /api/v3/downloadclient/:id
Delete download client.

**Path Parameters:**
- `id` (integer, required): Download client ID

**Request:```
```http
DELETE /api/v3/downloadclient/1
X-Api-Key: your-api-key-here
```

**Response:```
HTTP 204 No Content
```

#### POST /api/v3/downloadclient/test
Test download client connection.

**Request Body:**
```json
{
  "id": 1,
  "name": "Sabnzbd",
  "enable": true,
  "priority": 1,
  "config": {
    "host": "localhost",
    "port": 8080,
    "apiKey": "your-api-key",
    "useSsl": false,
    "category": "tv-sonarr"
  }
}
```

**Response:**
```json
{
  "data": {
    "validationPassed": true,
    "warnings": [],
    "errors": []
  }
}
```

#### GET /api/v3/downloadclient/:id/status
Get download client status.

**Path Parameters:**
- `id` (integer, required): Download client ID

**Request:**
```http
GET /api/v3/downloadclient/1/status
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Sabnzbd",
    "status": "ok",
    "initialFailure": null,
    "mostRecentFailure": "2024-01-12T09:30:00.000Z",
    "initialFailureMessage": null,
    "mostRecentFailureMessage": "Connection timeout",
    "categories": [
      {
        "id": 5000,
        "name": "TV",
        "freeleech": false,
        "disabled": false
      }
    ]
  }
}
```

---

### Notifications

#### GET /api/v3/notification
Get notifications.

**Request:**
```http
GET /api/v3/notification
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Discord",
      "onGrab": true,
      "onDownload": true,
      "onUpgrade": true,
      "onRename": true,
      "onHealthIssue": true,
      "onApplicationUpdate": true,
      "includeHealthWarnings": false,
      "enable": true,
      "implementation": "Discord",
      "tags": [1, 2],
      "fields": [
        {
          "order": 1,
          "name": "webhookUrl",
          "label": "Webhook URL",
          " "helpText": "The Discord webhook URL",
          " "type": "textbox",
          "advanced": false
        },
        {
          "order": 2,
          "name": "username",
          "label": "Username Override",
          "helpText": "Override the bot username",
          "type": "textbox",
          "advanced": true
        },
        {
          "order": 3,
          "name": "avatar",
          "label": "Avatar URL",
          "helpText": "Override the bot avatar",
          "type": "textbox",
          "advanced": true
        },
        {
          "order": 4,
          "name": "includeSeriesPoster",
          "label": "Include Series Poster",
          "helpText": "Include series poster in notification",
          "type": "checkbox",
          "advanced": true
        },
        {
          "order": 5,
          "name": "includeBackdropImage",
          " "label": "Include Backdrop Image",
          "helpText": "Include backdrop image in notification",
          "type": "checkbox",
          "advanced": true
       ",
        {
          "order": 6,
          "name": "onGrab",
          "label": "On Grab",
          "helpText": "Send notification when a release is grabbed",
          "type": "checkbox",
          "advanced": false
        },
        {
          "order": 7,
          "name": "onDownload",
          "label": "On Download",
          "helpText": "Send notification when a download completes",
          "type": "checkbox",
          "advanced": false
        },
        {
          "order": 8,
          "name": "onUpgrade",
          "label": "On Upgrade",
          "helpText": "Send notification when an episode is upgraded",
          "type": "checkbox",
          "advanced": false
        },
        {
          "order": 9,
          "name": "onRename",
          "label": "On Rename",
          "helpText": "Send notification when files are renamed",
          "type": "checkbox",
          "advanced": false
        },
        {
          "order": 10,
          "name": "onHealthIssue",
          "label": "On Health Issue",
          "helpText": "Send notification when a health issue is detected",
          "type": "checkbox",
          "advanced": false
        },
        {
          "order": 11,
          "name": "onApplicationUpdate",
          "label": "On Application Update",
          "helpText": "Send notification when an update is available",
          "type": "checkbox",
          "advanced": false
        }
      ],
      "status": {
        "initialFailure": null,
        "mostRecentFailure": null,
        "initialFailureMessage": null,
        "mostRecentFailureMessage": null,
        "lastSync": "2024-01-12T10:00:00.000Z",
        "lastSyncInfo": "Test notification sent successfully"
      }
    }
  ]
}
```

#### GET /api/v3/notification/schema
Get notification schema.

**Request:**
```http
GET /api/v3/notification/schema
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Discord",
      "fields": [ ... ]
    },
    {
      "id": 2,
      "name": "Telegram",
      "fields": [ ... ]
    },
    {
      "id": 3,
      "name": "Email",
      "fields": [ ... ]
    },
    {
      "id": 4,
      "name": "Gotify",
      "fields": [ ... ]
    },
    {
      "id": 5,
      "name": "Join",
      "fields": [ ... ]
    },
    {
      "id": 6,
      "name": "Pushover",
      "fields": [ ... ]
    },
    {
      "id": 7,
      "name": "Slack",
      "fields": [ ... ]
    },
    {
      "id": 8,
      "name": "Apprise",
      "fields": [ ... ]
    }
  ]
}
```

#### POST /api/v3/notification
Create notification.

**Request Body:```
```json
{
  "name": "Discord",
  "onGrab": true,
  "onDownload": true,
  "onUpgrade": true,
  "onRename": true,
  "onHealthIssue": true,
  "onApplicationUpdate": true,
  "includeHealthWarnings": false,
  "enable": true,
  "tags": [1, 2],
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/...",
    "username": "SonarrBot",
    "avatar": "https://example.com/avatar.png",
    "includeSeriesPoster": true,
    "includeBackdropImage": true
  }
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Discord",
    "onGrab": true,
    "onDownload": true,
    "onUpgrade": true,
    "onRename": true,
    "onHealthIssue": true,
    "onApplicationUpdate": true,
    "includeHealthWarnings": false,
    "enable": true,
    "tags": [1, 2]
  }
}
```

#### PUT /api/v3/notification/:id
Update notification.

**Path Parameters:**
- `id` (integer, required): Notification ID

**Request Body:**
```json
{
  "name": "Discord",
  "onGrab": false,
  "onDownload": true,
  "onUpgrade": false,
  "onRename": false,
  "onHealthIssue": false,
  "onApplicationUpdate": true,
  "includeHealthWarnings": true,
  "enable": true,
  "tags": [1]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Discord",
    "onGrab": false,
    "onDownload": true,
    "onUpgrade": false,
    "onRename": false,
    "onHealthIssue": false,
    "onApplicationUpdate": true,
    "includeHealthWarnings": true,
    "enable": true,
    "tags": [1]
  }
}
```

#### DELETE /api/v3/notification/:id
Delete notification.

**Path Parameters:**
- `id` (integer, required): Notification ID

**Request:**
```http
DELETE /api/v3/notification/1
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Discord",
    "onGrab": true,
    "onDownload": true,
    "onUpgrade": true,
    "onRename": true,
    "onHealthIssue": true,
    "onApplicationUpdate": true,
    "includeHealthWarnings": false,
    "enable": true,
    "tags": [1, 2]
  }
}
```

#### POST /api/v3/notification/test
Test notification.

**Request Body:**
```json
{
  "id": 1,
  "name": "Discord",
  "onGrab": true,
  "onDownload": true,
  "onUpgrade": true,
  "onRename": true,
  "onHealthIssue": true,
  "onApplicationUpdate": true,
  "includeHealthWarnings": false,
  "enable": true,
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/...",
    "username": "SonarrBot",
    "avatar": "https://example.com/avatar.png",
    "includeSeriesPoster": true,
    "includeBackdropImage": true
  }
}
```

**Response:**
```json
{
  "data": {
    "validationPassed": true,
    "warnings": [],
    "errors": []
  }
}
```

---

### Import Lists

#### GET /api/v3/importlist
Get import lists.

**Request:**
```http
GET /api/v3/importlist
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "enabled": true,
      "enableAutoAdd": true,
      "qualityProfileId": 1,
      "rootFolderPath": "/media/tv",
      "monitorNewItems": "all",
      "listType": "trakt",
      "name": "Trakt List",
      "listOrder": 0,
      "implementation": "TraktImport",
      "tags": [1],
      "fields": [
        {
          "listType": "trakt",
          "order": 1,
          "name": "listId",
          "label": "List ID",
          "helpText": "The Trakt list ID",
          "type": "number",
          "advanced": false
        },
        {
          "listType": "trakt",
          "order": 2,
          "name": "listTitle",
          "label": "List Title",
          "helpText": "The title of the list",
          "type": "textbox",
          "advanced": false
        },
        {
          "listType": "trakt",
          "order": 3,
          "name": "listUrl",
          "label": "URL",
          "helpText": "The Trakt list URL",
          "type": "textbox",
          "advanced": false
        },
        {
          "listType": "trakt",
          "order": 4,
          "name": "listExclusionsInclude",
          "label": "List Exclusions Include",
          "helpText": "Include list exclusions when adding series",
          "type": "checkbox",
          "advanced": false
        },
        {
          "listType": "trakt",
          "order": 5,
          "name": "seasonFolder": true,
          "label": "Season Folder",
          "helpText": "Use season folders for this list",
          "type": "checkbox",
          "advanced": false
        },
        {
          "listType": "trakt",
          "order": 6,
          "name": "monitorNewItems",
          "label": "Monitor New Items",
          "helpText": "Monitor new items added by this list",
          "type": "select",
          "advanced": false
        }
      ],
      "status": {
        "initialFailure": null,
        "mostRecentFailure": null,
        "initialFailureMessage": null,
        "mostRecentFailureMessage": null,
        "lastSync": "2024-01-12T10:00:00.000Z",
        "lastSyncInfo": "Synced 0 series, 0 episodes"
      }
    }
  ]
}
```

#### GET /api/v3/importlist/schema
Get import list schema.

**Request:**
```http
GET /api/v3/importlist/schema
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Trakt",
      "fields": [ ... ]
    },
    {
      "id": 2,
      "name": "IMDB List",
      "fields": [ ... ]
    },
    {
      "id": 3,
      "name": "Plex Watchlist",
      "fields": [ ... ]
    },
    {
      "id": 4,
      "name": "TVMaze",
      "fields": [ ... ]
    },
    {
      "id": 5,
      "name": "Watchlist",
      "fields": [ ... ]
    }
  ]
}
```

#### POST /api/v3/importlist
Create import list.

**Request Body:**
```json
{
  "enabled": true,
  "enableAutoAdd": true,
  "qualityProfileId": 1,
  "rootFolderPath": "/media/tv",
  "monitorNewItems": "all",
  "listType": "trakt",
  "name": "My Trakt Watchlist",
  "listOrder": 0,
  "tags": [1],
  "config": {
    "listId": "123456",
    "listTitle": "My Watchlist",
    "listUrl": "https://trakt.tv/users/me/watchlist",
    "listExclusionsInclude": true,
    "seasonFolder": true,
    "monitorNewItems": "all"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "enabled": true,
    "enableAutoAdd": true,
    "qualityProfileId": 1,
    "rootFolderPath": "/media/tv",
    "monitorNewItems": "all",
    "listType": "trakt",
    "name": "My Trakt Watchlist",
    "listOrder": 0,
    "implementation": "TraktImport",
    "tags": [1]
  }
}
```

#### PUT /api/v3/importlist/:id
Update import list.

**Path Parameters:**
- `id` (integer, required): Import list ID

**Request Body:**
```json
{
  "enabled": true,
  "enableAutoAdd": false,
  "qualityProfileId": 2,
  "rootFolderPath": "/media/tv",
  "monitorNewItems": "future",
  "tags": [1, 2]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "enabled": true,
    "enableAutoAdd": false,
    "qualityProfileId": 2,
    "rootFolderPath": "/media/tv",
    "monitorNewItems": "future",
    "listType": "trakt",
    "name": "My Trakt Watchlist",
    "listOrder": 0,
    "implementation": "TraktImport",
    "tags": [1, 2]
  }
}
```

#### DELETE /api/v3/importlist/:id
Delete import list.

**Path Parameters:**
- `id` (integer, required): Import list ID

**Request:**
```http
DELETE /api/v3/importlist/1
X-Api-Key: your-api-key-here
```

**Response:**
```
HTTP 204 No Content
```

#### POST /api/v3/importlist/test
Test import list connection.

**Request Body:**
```json
{
  "id": 1,
  "name": "Trakt",
  "enabled": true,
  "qualityProfileId": 1,
  "config": {
    "listId": "123456",
    "listTitle": "My Watchlist",
    "listUrl": "https://trakt.tv/users/me/watchlist"
  }
}
```

**Response:**
```json
{
  "data": {
    "validationPassed": true,
    "warnings": [],
    "errors": []
  }
}
```

#### POST /api/v3/importlist/sync
Sync import list.

**Request Body:**
```json
{
  "ids": [1, 2]
}
```

**Response:**
```
HTTP 202 Accepted
```

---

### Media Management

#### GET /api/v3/mediamanagement
Get media management settings.

**Request:**
```http
GET /api/v3/mediamanagement
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": {
    "autoUnmonitorPreviouslyDownloadedEpisodes": true,
    "downloadPropersAndRepacks": "proper",
    "createEmptySeriesFolders": false,
    "deleteEmptyFolders": false,
    "skipFreeSpaceCheckWhenImporting": false,
    "minimumFreeSpaceWhenImporting": 50000000000,
    "minimumFreeSpaceWhenImportingInBytes": 50000000000,
    "folders": [
      {
        "id": 1,
        "path": "/media/tv",
        "accessible": true,
        "freeSpace": 5000000000000,
        "totalSpace": 20000000000000,
        "qualityProfileId": 1
      }
    ],
    "recycleBin": " {
      "id": 1,
      "name": "Recycle Bin",
      "enable": true,
      "path": "/media/tv/.trash",
      "emptyDays": 30,
      "limit": 10,
      "freeSpaceThreshold": 5
    },
    "importExtraFiles": false,
    "rescanAfterRefresh": true,
    "setPermissionsLinux": false,
    "skipMatchingSubfolders": false,
    "matchingSubfolders": "sickbeard|sample",
    "chmodFolder": "755",
    "chmodGroup": "755",
    "chmodFile": "644",
    "chmodFolderR": "755",
    "chmodGroupR": "755",
    "chmodFileR": "644",
    "chmodFileX": null,
    "chmodGroupX": null
  }
}
```

#### PUT /api/v3/mediamanagement
Update media management settings.

**Request Body:**
```json
{
  "autoUnmonitorPreviouslyDownloadedEpisodes": false,
  "downloadPropersAndRepacks: "always",
  "createEmptySeriesFolders": true,
  "deleteEmptyFolders": true,
  "skipFreeSpaceCheckWhenImporting": true,
  "minimumFreeSpaceWhenImporting: 100000000000,
  "recycleBin": {
    "enable": true,
    "path": "/media/tv/.trash",
    "emptyDays": 60,
    "limit": 20,
    "freeSpaceThreshold": 10
  }
}
```

**Response:**
```json
{
  "data": {
    "autoUnmonitorPreviouslyDownloadedEpisodes": false,
    "downloadPropersAndRepacks": "always",
    "createEmptySeriesFolders": true,
    "deleteEmptyFolders": true,
    "skipFreeSpaceCheckWhenImporting": true,
    "minimumFreeSpaceWhenImporting: 100000000000,
    "recycleBin": {
      "enable": true,
      "path": "/media/tv/.trash",
      "emptyDays": 60,
      "limit": 20,
      "freeSpaceThreshold": 10
    }
  }
}
```

---

### Naming

#### GET /api/v3/naming
Get naming settings.

**Request:```
```http
GET /api/v3/naming
X-Api-Key: your-api-key-here
```

**Response:```
```json
{
  "data": {
    "standardEpisodeFormat": "Season {Season:00}{Episode:00} - {Series.Title} - {Episode.Title} - {Quality.Full}",
    "seriesFolderFormat": "{Series.Title}",
    "seasonFolderFormat": "Season {Season:00}",
    "dailyEpisodeFormat": "",
    "animeEpisodeFormat": "",
    "dailySeriesFormat": "",
    "dailySeasonFolderFormat": "",
    "animeSeriesFolderFormat": "{Series.Title}",
    "animeSeasonFolderFormat": "Season {Season:00}",
    "replaceIllegalCharacters": false,
    "standardMovieFormat": "",
    "movieFolderFormat": "Movies",
      "colonReplacementFormat": "space",
    "includeQuality": false,
    "includeSeriesTitle": false,
    "includeSeasonNumber": false,
    "includeEpisodeTitle": false,
    "includeEpisodePartTitle": false,
    "multiEpisodeStyle": 0,
    replaceSpaces": true,
    "retainManualDownloadFormat": false,
    "id": 1
  }
}
```

#### PUT /api/v3/naming
Update naming settings.

**Request Body:**
```json
{
  "standardEpisodeFormat": "Season {Season:00}{Episode:00} - {Series.Title} - {Episode.Title} - {Quality.Full}",
  "seriesFolderFormat": "{Series.Title}",
  "seasonFolderFormat": "Season {Season:00}",
  "replaceIllegalCharacters": false,
  "multiEpisodeStyle": 0,
  "replaceSpaces": true,
  "retainManualDownloadFormat": false
}
```

**Response:**
```json
{
  "data": {
    "standardEpisodeFormat": "Season {Season:00}{Episode:00} - {Series.Title} - {Episode.Title} - {Quality.Full}",
    "seriesFolderFormat": "{Series.Title}",
    "seasonFolderFormat": "Season {Season:00}",
    "replaceIllegalCharacters": false,
    "multiEpisodeStyle": 0,
    "replaceSpaces": true,
    "retainManualDownloadFormat": false,
    "id": 1
  }
}
```

#### GET /api/v3/naming/sample
Get naming samples.

**Query Parameters:**
- `seriesId` (integer, optional): Series ID
- `seasonNumber` (integer, optional): Season number
- `episodeNumber` (integer, optional): Episode number
- `seriesTitle` (string, optional): Series title (for testing)
- `seasonNumber` (integer, optional): Season number (for testing)
- `episodeTitle` (string, optional): Episode title (for testing)
- `quality` (string, optional): Quality (for testing)
- `language` (string, optional): Language (for testing)

**Request:**
```http
GET /api/v3/naming/sample?seriesId=1&seasonNumber=5&episodeNumber=12
X-Api-Key: your-api-key-here
```

**Response:**
```json
{
  "data": [
    {
      "series": "Breaking Bad",
      "season": 5,
      "episode": 12,
      "quality": "HDTV-720p",
      "extension": ".mkv",
      "path": "media/tv/Breaking Bad/Season 5/Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE.mkv",
      "quality": {
        "quality": {
          "id": 4,
          "name": "HDTV-720p",
          "source": "television",
          "resolution": 720
        },
        "revision": {
          "version": 1,
          "real": 0
        }
      },
      "language": {
        "id": 1,
        "name": "English"
      },
      "customFormats": [],
      "customFormatScore": 0
    }
  ]
}
```

---

## WebSocket API

### Connection

**URL:** `ws://localhost:3000/ws`

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'handshake',
    apiKey: 'your-api-key-here'
  }));
};
```

### Message Types

#### Server → Client Events

**Series Events:**
```json
{
  "type": "series",
  "action": "updated",
  "data": {
    "id": 1,
    "tvdbId": 303470,
    "title": "Changed Title",
    "monitored": false,
    "added": true,
    "deleted": false
  }
}
```

**Episode Events:**
```json
{
  "type": "episode",
  "action": "updated",
  "data": {
    "id": 72,
    "seriesId": 1,
    "seasonNumber": 5,
    "episodeNumber": 12,
    "monitored": false,
    "hasFile": true,
    "fileUpdated": true
  }
}
```

**Queue Events:**
```json
{
  "type": "queue",
  "action": "updated",
  "data": {
    "downloadId": "ABC123",
    "seriesId": 1,
    "episodeId": 72,
    "title": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE",
    "size": 500000000,
    "sizeleft": 250000000,
    "timeleft": "00:10:30",
    "status": "downloading",
    "estimatedCompletionTime": "2024-01-12T10:30:00.000Z",
    "trackedDownloadStatus": "ok",
    "trackedDownloadState": "downloading"
  }
}
```

**Notification Events:**
```json
{
  "type": "notification",
  "action": "sent",
  "data": {
    "type": "grab",
    "message": "Breaking.Bad.S05E12.720p.HDTV.x264-EVOLVE grabbed",
    "series": "Breaking Bad",
    "episode": "S05E12 - Rabid Dog",
    "quality": "HDTV-720p"
  }
}
```

#### Client → Server Events

**Subscribe to Updates:**
```json
{
  "type": "subscribe",
  "room": "series"
}
```

**Subscribe to Series:**
```json
{
  "type": "subscribe",
  "room": "series",
  "seriesId": 1
}
```

**Subscribe to Episode:**
```json
{
  "type": "subscribe",
  "room": "episode",
  "episodeId": 72
}
```

**Subscribe to Queue:**
```json
{
  "type": "subscribe",
  "room": "queue"
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "room": "series"
}
```

## Rate Limiting

**Default Limits:**
- Anonymous: 100 requests per 15 minutes
- Authenticated: 1000 requests per 15 minutes
- WebSocket: 50 messages per second

**Rate Limit Response:**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded",
  "details": {
    "limit": 1000,
    "remaining": 0,
    reset": "17052304040
  }
}
```

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 17052304040
```

---

## OpenAPI/Swagger Specification

The complete OpenAPI specification is available at `/api/v3/openapi.json`.

**Get Specification:**
```http
GET /api/v3/openapi.json
```

This returns the complete OpenAPI 3.0.1 specification in JSON format, which can be imported into tools like:
- Swagger UI
- Postman
- Redocly
- Insomnia

---

*This REST API documentation provides complete coverage of all endpoints with detailed request/response examples, authentication, error handling, pagination, filtering, sorting, and WebSocket real-time updates.*