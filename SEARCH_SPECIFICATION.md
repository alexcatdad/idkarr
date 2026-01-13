# Search Specification

> **idkarr** - Release search and selection system specification

## Table of Contents

1. [Overview](#overview)
2. [Search Types](#search-types)
3. [Search Process](#search-process)
4. [Release Selection](#release-selection)
5. [Quality Scoring](#quality-scoring)
6. [Custom Formats](#custom-formats)
7. [Preferred Words](#preferred-words)
8. [Search Scheduling](#search-scheduling)
9. [Manual Search](#manual-search)

---

## Overview

### Search Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Search Request                          │
│  (Series/Episode/Movie)                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Search Coordinator                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Query      │  │  Rate       │  │  Result             │  │
│  │  Builder    │  │  Limiter    │  │  Aggregator         │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Indexer Layer                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐  │
│  │ Newznab 1 │  │ Newznab 2 │  │ Torznab 1 │  │ Torznab 2│  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────┬─────┘  │
└────────┼──────────────┼──────────────┼─────────────┼────────┘
         │              │              │             │
         └──────────────┴──────┬───────┴─────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Release Processor                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Parser     │  │  Matcher    │  │  Scorer             │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Decision Engine                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Quality    │  │  Custom     │  │  Preferred          │  │
│  │  Profile    │  │  Formats    │  │  Words              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Final Selection                          │
│  Ranked releases sorted by score                            │
└─────────────────────────────────────────────────────────────┘
```

### Core Interfaces

```typescript
interface SearchRequest {
  type: 'series' | 'season' | 'episode' | 'movie';

  // Series search
  seriesId?: number;
  seasonNumber?: number;
  episodeIds?: number[];

  // Movie search
  movieId?: number;

  // Options
  indexerIds?: number[];
  isInteractive?: boolean;
  userInvokedSearch?: boolean;
  trigger?: SearchTrigger;
}

type SearchTrigger =
  | 'automatic'      // RSS sync, scheduled
  | 'manual'         // User initiated
  | 'import'         // Import from list
  | 'upgrade'        // Automatic upgrade search
  | 'missing';       // Missing episode search

interface SearchResult {
  guid: string;
  indexerId: number;
  indexerName: string;
  title: string;
  size: number;
  age: number;
  ageHours: number;
  ageMinutes: number;
  publishDate: Date;
  downloadUrl: string;
  infoUrl?: string;

  // Parsed info
  parsedInfo: ParsedReleaseInfo;

  // Quality
  quality: QualityModel;
  customFormats: CustomFormat[];
  customFormatScore: number;

  // Torrent-specific
  seeders?: number;
  leechers?: number;
  protocol: 'usenet' | 'torrent';

  // Indexer flags
  indexerFlags: IndexerFlag[];

  // Rejection
  rejections: Rejection[];
  isRejected: boolean;

  // Scoring
  releaseWeight: number;
}
```

---

## Search Types

### Episode Search

```typescript
interface EpisodeSearchSpec {
  seriesId: number;
  seasonNumber: number;
  episodeNumber: number;

  // Alternative episode numbering
  sceneSeasonNumber?: number;
  sceneEpisodeNumber?: number;
  absoluteEpisodeNumber?: number;
  sceneAbsoluteEpisodeNumber?: number;

  // Air date (for daily shows)
  airDate?: string; // YYYY-MM-DD

  // Anime info
  animeEpisodeInfo?: {
    releaseGroup?: string;
    releaseVersion?: number;
  };
}

class EpisodeSearchService {
  async search(spec: EpisodeSearchSpec): Promise<SearchResult[]> {
    const series = await this.seriesService.get(spec.seriesId);
    const queries = this.buildQueries(series, spec);

    // Search all enabled indexers
    const results = await this.searchIndexers(queries);

    // Parse and match
    const matched = results
      .map(r => this.parseAndMatch(r, series, spec))
      .filter(r => r !== null);

    // Score and rank
    return this.scoreAndRank(matched, series);
  }

  private buildQueries(series: Series, spec: EpisodeSearchSpec): SearchQuery[] {
    const queries: SearchQuery[] = [];

    // Standard search: S01E01
    queries.push({
      searchTerm: `${series.title} S${spec.seasonNumber.toString().padStart(2, '0')}E${spec.episodeNumber.toString().padStart(2, '0')}`,
      tvdbId: series.tvdbId,
      season: spec.seasonNumber,
      episode: spec.episodeNumber,
    });

    // Scene numbering search
    if (spec.sceneSeasonNumber && spec.sceneEpisodeNumber) {
      queries.push({
        searchTerm: `${series.title} S${spec.sceneSeasonNumber.toString().padStart(2, '0')}E${spec.sceneEpisodeNumber.toString().padStart(2, '0')}`,
        season: spec.sceneSeasonNumber,
        episode: spec.sceneEpisodeNumber,
      });
    }

    // Absolute numbering (anime)
    if (spec.absoluteEpisodeNumber && series.seriesType === 'anime') {
      queries.push({
        searchTerm: `${series.title} ${spec.absoluteEpisodeNumber}`,
      });
    }

    // Daily show search by air date
    if (spec.airDate && series.seriesType === 'daily') {
      queries.push({
        searchTerm: `${series.title} ${spec.airDate}`,
      });
    }

    return queries;
  }
}
```

### Season Search

```typescript
interface SeasonSearchSpec {
  seriesId: number;
  seasonNumber: number;

  // Pack preference
  preferSeasonPack: boolean;

  // Missing episodes only
  missingEpisodesOnly: boolean;
}

class SeasonSearchService {
  async search(spec: SeasonSearchSpec): Promise<SearchResult[]> {
    const series = await this.seriesService.get(spec.seriesId);
    const episodes = await this.episodeService.getBySeasonNumber(
      spec.seriesId,
      spec.seasonNumber
    );

    // Search for season pack
    const packResults = await this.searchSeasonPack(series, spec.seasonNumber);

    // If not preferring packs or no pack found, search individual episodes
    const individualResults = spec.missingEpisodesOnly
      ? await this.searchMissingEpisodes(series, episodes)
      : await this.searchAllEpisodes(series, episodes);

    // Combine and dedupe
    const allResults = [...packResults, ...individualResults];

    return this.scoreAndRank(allResults, series);
  }

  private async searchSeasonPack(
    series: Series,
    seasonNumber: number
  ): Promise<SearchResult[]> {
    const queries: SearchQuery[] = [
      // Full season pack
      {
        searchTerm: `${series.title} S${seasonNumber.toString().padStart(2, '0')}`,
        season: seasonNumber,
      },
      // "Complete Season" format
      {
        searchTerm: `${series.title} Season ${seasonNumber} Complete`,
      },
    ];

    const results = await this.searchIndexers(queries);

    // Filter to only season packs
    return results.filter(r => {
      const parsed = this.parser.parse(r.title);
      return parsed.fullSeason && !parsed.isPartialSeason;
    });
  }
}
```

### Movie Search

```typescript
interface MovieSearchSpec {
  movieId: number;

  // Edition preference
  preferredEdition?: string;

  // Year tolerance
  yearTolerance: number;
}

class MovieSearchService {
  async search(spec: MovieSearchSpec): Promise<SearchResult[]> {
    const movie = await this.movieService.get(spec.movieId);
    const queries = this.buildQueries(movie, spec);

    const results = await this.searchIndexers(queries);

    // Parse and match
    const matched = results
      .map(r => this.parseAndMatch(r, movie, spec))
      .filter(r => r !== null);

    return this.scoreAndRank(matched, movie);
  }

  private buildQueries(movie: Movie, spec: MovieSearchSpec): SearchQuery[] {
    const queries: SearchQuery[] = [];

    // Standard search with year
    queries.push({
      searchTerm: `${movie.title} ${movie.year}`,
      imdbId: movie.imdbId,
      tmdbId: movie.tmdbId,
    });

    // Without year (for better recall)
    queries.push({
      searchTerm: movie.title,
      imdbId: movie.imdbId,
    });

    // Alternative titles
    for (const altTitle of movie.alternateTitles) {
      queries.push({
        searchTerm: `${altTitle.title} ${movie.year}`,
      });
    }

    // Edition-specific search
    if (spec.preferredEdition) {
      queries.push({
        searchTerm: `${movie.title} ${movie.year} ${spec.preferredEdition}`,
      });
    }

    return queries;
  }
}
```

---

## Search Process

### Query Building

```typescript
class QueryBuilder {
  build(media: Series | Movie, searchSpec: SearchSpec): SearchQuery[] {
    const queries: SearchQuery[] = [];
    const cleanTitle = this.cleanTitle(media.title);

    // ID-based search (most accurate)
    if (media.tvdbId || media.imdbId || media.tmdbId) {
      queries.push({
        type: 'id',
        tvdbId: media.tvdbId,
        imdbId: media.imdbId,
        tmdbId: media.tmdbId,
        ...this.getEpisodeInfo(searchSpec),
      });
    }

    // Title-based search
    queries.push({
      type: 'text',
      searchTerm: this.buildSearchTerm(media, searchSpec),
    });

    // Alternative titles
    for (const altTitle of media.alternateTitles ?? []) {
      queries.push({
        type: 'text',
        searchTerm: this.buildSearchTerm(
          { ...media, title: altTitle.title },
          searchSpec
        ),
      });
    }

    return queries;
  }

  private cleanTitle(title: string): string {
    return title
      // Remove articles for better matching
      .replace(/^(The|A|An)\s+/i, '')
      // Remove special characters
      .replace(/[^\w\s]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildSearchTerm(media: Series | Movie, spec: SearchSpec): string {
    const parts: string[] = [media.title];

    if ('year' in media && media.year) {
      parts.push(media.year.toString());
    }

    if ('seasonNumber' in spec && spec.seasonNumber !== undefined) {
      parts.push(`S${spec.seasonNumber.toString().padStart(2, '0')}`);

      if ('episodeNumber' in spec && spec.episodeNumber !== undefined) {
        parts[parts.length - 1] += `E${spec.episodeNumber.toString().padStart(2, '0')}`;
      }
    }

    return parts.join(' ');
  }
}
```

### Result Aggregation

```typescript
class SearchAggregator {
  async aggregate(
    indexerResults: Map<number, SearchResult[]>
  ): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seen = new Set<string>();

    for (const [indexerId, results] of indexerResults) {
      for (const result of results) {
        // Dedupe by release hash
        const hash = this.calculateReleaseHash(result);

        if (!seen.has(hash)) {
          seen.add(hash);
          allResults.push({
            ...result,
            indexerId,
          });
        }
      }
    }

    return allResults;
  }

  private calculateReleaseHash(result: SearchResult): string {
    // Create unique identifier based on parsed info
    const parsed = result.parsedInfo;

    return [
      parsed.seriesTitle?.toLowerCase() ?? '',
      parsed.movieTitle?.toLowerCase() ?? '',
      parsed.seasonNumber?.toString() ?? '',
      parsed.episodeNumbers?.join(',') ?? '',
      parsed.quality?.quality.name ?? '',
      parsed.releaseGroup?.toLowerCase() ?? '',
    ].join('|');
  }
}
```

---

## Release Selection

### Release Matching

```typescript
class ReleaseMatcher {
  match(
    result: SearchResult,
    media: Series | Movie,
    spec: SearchSpec
  ): MatchResult {
    const parsed = result.parsedInfo;

    // Series matching
    if ('seriesId' in spec) {
      return this.matchSeries(parsed, media as Series, spec);
    }

    // Movie matching
    return this.matchMovie(parsed, media as Movie, spec);
  }

  private matchSeries(
    parsed: ParsedReleaseInfo,
    series: Series,
    spec: EpisodeSearchSpec
  ): MatchResult {
    // Title match
    if (!this.titlesMatch(parsed.seriesTitle, series)) {
      return { matched: false, reason: 'Title mismatch' };
    }

    // Season match
    if (parsed.seasonNumber !== spec.seasonNumber) {
      // Check scene numbering
      if (parsed.seasonNumber !== spec.sceneSeasonNumber) {
        return { matched: false, reason: 'Season mismatch' };
      }
    }

    // Episode match
    if (!this.episodesMatch(parsed, spec)) {
      return { matched: false, reason: 'Episode mismatch' };
    }

    // Quality match (must meet minimum)
    if (!this.qualityMeetsMinimum(parsed.quality, series.qualityProfile)) {
      return { matched: false, reason: 'Quality below minimum' };
    }

    return { matched: true };
  }

  private titlesMatch(parsedTitle: string | undefined, series: Series): boolean {
    if (!parsedTitle) return false;

    const cleanParsed = this.cleanForMatching(parsedTitle);
    const cleanTitle = this.cleanForMatching(series.title);

    // Direct match
    if (cleanParsed === cleanTitle) return true;

    // Check sort title
    if (cleanParsed === this.cleanForMatching(series.sortTitle)) return true;

    // Check clean title
    if (cleanParsed === series.cleanTitle) return true;

    // Check alternative titles
    for (const alt of series.alternateTitles) {
      if (cleanParsed === this.cleanForMatching(alt.title)) return true;
    }

    // Fuzzy match with threshold
    const similarity = this.calculateSimilarity(cleanParsed, cleanTitle);
    return similarity >= 0.85;
  }

  private episodesMatch(parsed: ParsedReleaseInfo, spec: EpisodeSearchSpec): boolean {
    const episodeNumbers = parsed.episodeNumbers ?? [];

    // Single episode
    if (spec.episodeNumber !== undefined) {
      if (episodeNumbers.includes(spec.episodeNumber)) return true;
      if (episodeNumbers.includes(spec.sceneEpisodeNumber!)) return true;
    }

    // Absolute episode (anime)
    if (spec.absoluteEpisodeNumber !== undefined) {
      if (parsed.absoluteEpisodeNumber === spec.absoluteEpisodeNumber) return true;
      if (parsed.absoluteEpisodeNumber === spec.sceneAbsoluteEpisodeNumber) return true;
    }

    // Daily show air date
    if (spec.airDate) {
      if (parsed.airDate === spec.airDate) return true;
    }

    return false;
  }
}
```

### Rejection Rules

```typescript
interface Rejection {
  reason: string;
  type: RejectionType;
}

type RejectionType =
  | 'permanent'    // Can never be accepted
  | 'temporary'    // Might be accepted later (e.g., waiting for better quality)
  | 'user';        // User preference rejection

class ReleaseRejector {
  check(result: SearchResult, context: RejectionContext): Rejection[] {
    const rejections: Rejection[] = [];

    // Check each rule
    for (const rule of this.rules) {
      const rejection = rule.check(result, context);
      if (rejection) {
        rejections.push(rejection);
      }
    }

    return rejections;
  }
}

const rejectionRules: RejectionRule[] = [
  // Already in library at same or better quality
  {
    name: 'AlreadyImported',
    check: (result, ctx) => {
      const existing = ctx.existingFiles.find(f =>
        f.quality.quality.id >= result.quality.quality.id
      );
      if (existing) {
        return {
          reason: `Already imported at ${existing.quality.quality.name}`,
          type: 'permanent',
        };
      }
      return null;
    },
  },

  // Quality not in profile
  {
    name: 'QualityNotAllowed',
    check: (result, ctx) => {
      if (!ctx.qualityProfile.items.some(i => i.quality?.id === result.quality.quality.id)) {
        return {
          reason: `Quality ${result.quality.quality.name} not in profile`,
          type: 'permanent',
        };
      }
      return null;
    },
  },

  // Size limits
  {
    name: 'SizeTooLarge',
    check: (result, ctx) => {
      const maxSize = ctx.qualityProfile.maxSize;
      if (maxSize && result.size > maxSize) {
        return {
          reason: `Size ${formatSize(result.size)} exceeds maximum ${formatSize(maxSize)}`,
          type: 'permanent',
        };
      }
      return null;
    },
  },

  // Minimum seeders (torrents)
  {
    name: 'NotEnoughSeeders',
    check: (result, ctx) => {
      if (result.protocol === 'torrent') {
        const minSeeders = ctx.indexer.minimumSeeders ?? 1;
        if ((result.seeders ?? 0) < minSeeders) {
          return {
            reason: `Only ${result.seeders} seeders (minimum: ${minSeeders})`,
            type: 'temporary',
          };
        }
      }
      return null;
    },
  },

  // Blocklist
  {
    name: 'Blocklisted',
    check: (result, ctx) => {
      if (ctx.blocklist.some(b => b.sourceTitle === result.title)) {
        return {
          reason: 'Release is blocklisted',
          type: 'permanent',
        };
      }
      return null;
    },
  },

  // Restrictions (release name patterns)
  {
    name: 'RestrictedRelease',
    check: (result, ctx) => {
      for (const restriction of ctx.restrictions) {
        if (restriction.mustContain?.length) {
          const hasRequired = restriction.mustContain.some(term =>
            result.title.toLowerCase().includes(term.toLowerCase())
          );
          if (!hasRequired) {
            return {
              reason: `Missing required term`,
              type: 'user',
            };
          }
        }

        if (restriction.mustNotContain?.length) {
          const hasForbidden = restriction.mustNotContain.find(term =>
            result.title.toLowerCase().includes(term.toLowerCase())
          );
          if (hasForbidden) {
            return {
              reason: `Contains forbidden term: ${hasForbidden}`,
              type: 'user',
            };
          }
        }
      }
      return null;
    },
  },

  // Age limit (usenet)
  {
    name: 'TooOld',
    check: (result, ctx) => {
      if (result.protocol === 'usenet' && ctx.retention) {
        if (result.age > ctx.retention) {
          return {
            reason: `Age ${result.age} days exceeds retention ${ctx.retention} days`,
            type: 'permanent',
          };
        }
      }
      return null;
    },
  },
];
```

---

## Quality Scoring

### Score Calculation

```typescript
interface ScoreBreakdown {
  qualityScore: number;
  customFormatScore: number;
  preferredWordScore: number;
  indexerScore: number;
  ageScore: number;
  sizeScore: number;
  seedersScore: number;
  totalScore: number;
}

class ReleaseScorer {
  score(
    result: SearchResult,
    profile: QualityProfile,
    media: Series | Movie
  ): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      qualityScore: 0,
      customFormatScore: 0,
      preferredWordScore: 0,
      indexerScore: 0,
      ageScore: 0,
      sizeScore: 0,
      seedersScore: 0,
      totalScore: 0,
    };

    // Quality score (0-1000 based on profile ranking)
    breakdown.qualityScore = this.calculateQualityScore(result.quality, profile);

    // Custom format score (-10000 to +10000)
    breakdown.customFormatScore = this.calculateCustomFormatScore(
      result.customFormats,
      profile
    );

    // Preferred words score
    breakdown.preferredWordScore = this.calculatePreferredWordScore(
      result.title,
      media
    );

    // Indexer priority score
    breakdown.indexerScore = this.calculateIndexerScore(result.indexerId);

    // Age score (prefer newer for recent content)
    breakdown.ageScore = this.calculateAgeScore(result.age, media);

    // Size score (prefer optimal size)
    breakdown.sizeScore = this.calculateSizeScore(result.size, result.quality);

    // Seeders score (torrents only)
    if (result.protocol === 'torrent') {
      breakdown.seedersScore = this.calculateSeedersScore(result.seeders ?? 0);
    }

    // Total
    breakdown.totalScore =
      breakdown.qualityScore +
      breakdown.customFormatScore +
      breakdown.preferredWordScore +
      breakdown.indexerScore +
      breakdown.ageScore +
      breakdown.sizeScore +
      breakdown.seedersScore;

    return breakdown;
  }

  private calculateQualityScore(quality: QualityModel, profile: QualityProfile): number {
    // Find quality rank in profile (higher rank = better)
    const items = profile.items.flatMap(item =>
      item.items ? item.items : [item]
    );

    const index = items.findIndex(i => i.quality?.id === quality.quality.id);

    if (index === -1) return 0;

    // Score based on position (0 is worst, max is best)
    const rank = items.length - index;
    return rank * 100;
  }

  private calculateCustomFormatScore(
    formats: CustomFormat[],
    profile: QualityProfile
  ): number {
    let score = 0;

    for (const format of formats) {
      const profileFormat = profile.formatItems?.find(f => f.format === format.id);
      if (profileFormat) {
        score += profileFormat.score;
      }
    }

    return score;
  }

  private calculatePreferredWordScore(title: string, media: Series | Movie): number {
    let score = 0;
    const titleLower = title.toLowerCase();

    // Check media-specific preferred words
    for (const pref of media.preferredWords ?? []) {
      if (titleLower.includes(pref.term.toLowerCase())) {
        score += pref.score;
      }
    }

    // Check global preferred words
    for (const pref of this.globalPreferredWords) {
      if (titleLower.includes(pref.term.toLowerCase())) {
        score += pref.score;
      }
    }

    return score;
  }

  private calculateAgeScore(ageDays: number, media: Series | Movie): number {
    // For recent content, prefer newer releases
    const mediaAge = this.getMediaAgeDays(media);

    if (mediaAge < 30) {
      // Recent content: strong preference for new releases
      if (ageDays <= 1) return 100;
      if (ageDays <= 7) return 50;
      if (ageDays <= 14) return 25;
      return 0;
    }

    if (mediaAge < 365) {
      // Content from this year: mild preference for newer
      if (ageDays <= 7) return 50;
      if (ageDays <= 30) return 25;
      return 0;
    }

    // Older content: age doesn't matter much
    return 0;
  }

  private calculateSeedersScore(seeders: number): number {
    // Logarithmic scoring for seeders
    if (seeders === 0) return -1000; // Heavy penalty for no seeders
    if (seeders < 5) return 0;
    if (seeders < 10) return 25;
    if (seeders < 50) return 50;
    if (seeders < 100) return 75;
    return 100;
  }
}
```

### Release Ranking

```typescript
class ReleaseRanker {
  rank(results: ScoredResult[]): ScoredResult[] {
    return results.sort((a, b) => {
      // Primary sort: total score (descending)
      if (a.score.totalScore !== b.score.totalScore) {
        return b.score.totalScore - a.score.totalScore;
      }

      // Secondary: quality score
      if (a.score.qualityScore !== b.score.qualityScore) {
        return b.score.qualityScore - a.score.qualityScore;
      }

      // Tertiary: custom format score
      if (a.score.customFormatScore !== b.score.customFormatScore) {
        return b.score.customFormatScore - a.score.customFormatScore;
      }

      // Quaternary: seeders (for torrents)
      const seedersA = a.result.seeders ?? 0;
      const seedersB = b.result.seeders ?? 0;
      if (seedersA !== seedersB) {
        return seedersB - seedersA;
      }

      // Final: age (prefer newer)
      return a.result.age - b.result.age;
    });
  }
}
```

---

## Custom Formats

### Custom Format Definition

```typescript
interface CustomFormat {
  id: number;
  name: string;
  includeCustomFormatWhenRenaming: boolean;
  specifications: CustomFormatSpecification[];
}

interface CustomFormatSpecification {
  name: string;
  implementation: string;
  negate: boolean;
  required: boolean;
  fields: CustomFormatField[];
}

type CustomFormatField =
  | { name: 'value'; value: string }      // Regex pattern
  | { name: 'min'; value: number }        // Minimum value
  | { name: 'max'; value: number };       // Maximum value

// Example custom formats
const customFormats: CustomFormat[] = [
  // x265/HEVC
  {
    id: 1,
    name: 'x265',
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: 'x265',
        implementation: 'ReleaseTitleSpecification',
        negate: false,
        required: true,
        fields: [{ name: 'value', value: '(x|h)\\.?265|hevc' }],
      },
    ],
  },

  // HDR
  {
    id: 2,
    name: 'HDR',
    includeCustomFormatWhenRenaming: true,
    specifications: [
      {
        name: 'HDR',
        implementation: 'ReleaseTitleSpecification',
        negate: false,
        required: true,
        fields: [{ name: 'value', value: 'hdr|hdr10|hdr10plus|dolby.?vision|dv' }],
      },
    ],
  },

  // Dolby Atmos
  {
    id: 3,
    name: 'Atmos',
    includeCustomFormatWhenRenaming: true,
    specifications: [
      {
        name: 'Atmos',
        implementation: 'ReleaseTitleSpecification',
        negate: false,
        required: true,
        fields: [{ name: 'value', value: 'atmos' }],
      },
    ],
  },

  // Scene releases
  {
    id: 4,
    name: 'Scene',
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: 'Scene Release',
        implementation: 'IndexerFlagSpecification',
        negate: false,
        required: true,
        fields: [{ name: 'value', value: 'scene' }],
      },
    ],
  },

  // Avoid low quality encodes
  {
    id: 5,
    name: 'LQ',
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: 'LQ Groups',
        implementation: 'ReleaseGroupSpecification',
        negate: false,
        required: true,
        fields: [{ name: 'value', value: 'YIFY|YTS|RARBG|EVO|STUTTERSHIT' }],
      },
    ],
  },
];
```

### Custom Format Matching

```typescript
class CustomFormatMatcher {
  match(result: SearchResult, formats: CustomFormat[]): CustomFormat[] {
    const matched: CustomFormat[] = [];

    for (const format of formats) {
      if (this.matchesFormat(result, format)) {
        matched.push(format);
      }
    }

    return matched;
  }

  private matchesFormat(result: SearchResult, format: CustomFormat): boolean {
    // All required specs must match
    // At least one non-required spec must match (if any exist)
    const required = format.specifications.filter(s => s.required);
    const optional = format.specifications.filter(s => !s.required);

    // Check all required match
    const allRequiredMatch = required.every(spec =>
      this.matchesSpec(result, spec)
    );

    if (!allRequiredMatch) return false;

    // If no optional specs, we're done
    if (optional.length === 0) return true;

    // At least one optional must match
    return optional.some(spec => this.matchesSpec(result, spec));
  }

  private matchesSpec(
    result: SearchResult,
    spec: CustomFormatSpecification
  ): boolean {
    let matches = false;

    switch (spec.implementation) {
      case 'ReleaseTitleSpecification':
        matches = this.matchesReleaseTitle(result, spec);
        break;

      case 'ReleaseGroupSpecification':
        matches = this.matchesReleaseGroup(result, spec);
        break;

      case 'QualityModifierSpecification':
        matches = this.matchesQualityModifier(result, spec);
        break;

      case 'SizeSpecification':
        matches = this.matchesSize(result, spec);
        break;

      case 'IndexerFlagSpecification':
        matches = this.matchesIndexerFlag(result, spec);
        break;

      case 'SourceSpecification':
        matches = this.matchesSource(result, spec);
        break;

      case 'ResolutionSpecification':
        matches = this.matchesResolution(result, spec);
        break;
    }

    // Handle negation
    return spec.negate ? !matches : matches;
  }

  private matchesReleaseTitle(
    result: SearchResult,
    spec: CustomFormatSpecification
  ): boolean {
    const pattern = spec.fields.find(f => f.name === 'value')?.value;
    if (!pattern) return false;

    const regex = new RegExp(pattern, 'i');
    return regex.test(result.title);
  }

  private matchesReleaseGroup(
    result: SearchResult,
    spec: CustomFormatSpecification
  ): boolean {
    const pattern = spec.fields.find(f => f.name === 'value')?.value;
    if (!pattern) return false;

    const group = result.parsedInfo.releaseGroup;
    if (!group) return false;

    const regex = new RegExp(pattern, 'i');
    return regex.test(group);
  }
}
```

---

## Preferred Words

### Preferred Word Configuration

```typescript
interface PreferredWord {
  term: string;
  score: number;
}

interface ReleaseProfile {
  id: number;
  name: string;
  enabled: boolean;

  // Conditions
  required: string[];     // Must contain any of these
  ignored: string[];      // Must not contain any of these
  preferred: PreferredWord[];

  // Scope
  includePreferredWhenRenaming: boolean;
  indexerId?: number;     // Apply to specific indexer only
  tags: number[];         // Apply to media with these tags
}

// Example release profiles
const releaseProfiles: ReleaseProfile[] = [
  // Prefer AMZN/NF web releases
  {
    id: 1,
    name: 'Streaming Services',
    enabled: true,
    required: [],
    ignored: [],
    preferred: [
      { term: 'AMZN', score: 100 },
      { term: 'Amazon', score: 100 },
      { term: 'NF', score: 90 },
      { term: 'Netflix', score: 90 },
      { term: 'DSNP', score: 80 },
      { term: 'Disney+', score: 80 },
      { term: 'HMAX', score: 80 },
      { term: 'HBO Max', score: 80 },
      { term: 'ATVP', score: 80 },
      { term: 'Apple TV+', score: 80 },
    ],
    includePreferredWhenRenaming: false,
    tags: [],
  },

  // Anime release groups
  {
    id: 2,
    name: 'Anime Groups',
    enabled: true,
    required: [],
    ignored: ['DUB', 'DUBBED'],
    preferred: [
      { term: 'SubsPlease', score: 200 },
      { term: 'Erai-raws', score: 150 },
      { term: 'Judas', score: 100 },
      { term: 'CBM', score: 50 },
    ],
    includePreferredWhenRenaming: true,
    tags: [1], // Anime tag
  },
];
```

### Preferred Word Scoring

```typescript
class PreferredWordScorer {
  score(title: string, profiles: ReleaseProfile[]): PreferredWordResult {
    const titleLower = title.toLowerCase();
    const matchedTerms: MatchedTerm[] = [];
    let totalScore = 0;

    for (const profile of profiles) {
      if (!profile.enabled) continue;

      // Check required terms
      if (profile.required.length > 0) {
        const hasRequired = profile.required.some(term =>
          titleLower.includes(term.toLowerCase())
        );
        if (!hasRequired) continue; // Skip this profile
      }

      // Check ignored terms
      const hasIgnored = profile.ignored.some(term =>
        titleLower.includes(term.toLowerCase())
      );
      if (hasIgnored) continue; // Skip this profile

      // Score preferred terms
      for (const pref of profile.preferred) {
        if (titleLower.includes(pref.term.toLowerCase())) {
          matchedTerms.push({
            term: pref.term,
            score: pref.score,
            profileId: profile.id,
          });
          totalScore += pref.score;
        }
      }
    }

    return {
      score: totalScore,
      matchedTerms,
    };
  }
}
```

---

## Search Scheduling

### Scheduled Search Jobs

```typescript
interface SearchScheduleConfig {
  // RSS sync
  rssSyncInterval: number; // minutes, default 15

  // Missing episode search
  searchForMissing: boolean;
  searchForMissingInterval: number; // hours, default 6

  // Cutoff unmet search
  searchForCutoffUnmet: boolean;
  searchForCutoffUnmetInterval: number; // hours, default 12

  // Limits
  maxConcurrentSearches: number;
  delayBetweenSearches: number; // seconds
}

class SearchScheduler {
  private readonly queues = {
    rss: new BullMQ.Queue('rss-sync'),
    missing: new BullMQ.Queue('missing-search'),
    cutoff: new BullMQ.Queue('cutoff-search'),
  };

  async initialize(config: SearchScheduleConfig): Promise<void> {
    // RSS Sync
    await this.queues.rss.add(
      'rss-sync',
      {},
      {
        repeat: {
          every: config.rssSyncInterval * 60 * 1000,
        },
      }
    );

    // Missing search
    if (config.searchForMissing) {
      await this.queues.missing.add(
        'missing-search',
        {},
        {
          repeat: {
            every: config.searchForMissingInterval * 60 * 60 * 1000,
          },
        }
      );
    }

    // Cutoff unmet search
    if (config.searchForCutoffUnmet) {
      await this.queues.cutoff.add(
        'cutoff-search',
        {},
        {
          repeat: {
            every: config.searchForCutoffUnmetInterval * 60 * 60 * 1000,
          },
        }
      );
    }
  }
}
```

### RSS Sync Process

```typescript
class RssSyncService {
  async sync(): Promise<RssSyncResult> {
    const result: RssSyncResult = {
      indexersSearched: 0,
      releasesFound: 0,
      releasesGrabbed: 0,
      errors: [],
    };

    // Get all enabled indexers
    const indexers = await this.indexerService.getEnabled();

    for (const indexer of indexers) {
      if (!indexer.enableRss) continue;

      try {
        // Fetch RSS feed
        const releases = await this.fetchRss(indexer);
        result.releasesFound += releases.length;

        // Process each release
        for (const release of releases) {
          const grabbed = await this.processRelease(release);
          if (grabbed) {
            result.releasesGrabbed++;
          }
        }

        result.indexersSearched++;
      } catch (error) {
        result.errors.push({
          indexerId: indexer.id,
          message: error.message,
        });
      }
    }

    return result;
  }

  private async processRelease(release: SearchResult): Promise<boolean> {
    // Parse release
    const parsed = this.parser.parse(release.title);
    if (!parsed.seriesTitle && !parsed.movieTitle) {
      return false;
    }

    // Find matching media
    const media = await this.findMedia(parsed);
    if (!media) {
      return false;
    }

    // Check if wanted
    if (!this.isWanted(release, media)) {
      return false;
    }

    // Score and decide
    const scored = this.scorer.score(release, media.qualityProfile, media);

    if (scored.score.totalScore < 0) {
      return false;
    }

    // Grab if passes all checks
    return this.grabService.grab(release, media);
  }
}
```

---

## Manual Search

### Interactive Search

```typescript
interface ManualSearchRequest {
  type: 'series' | 'season' | 'episode' | 'movie';
  seriesId?: number;
  seasonNumber?: number;
  episodeIds?: number[];
  movieId?: number;
}

interface ManualSearchResult extends SearchResult {
  // Additional display info
  scoreBreakdown: ScoreBreakdown;
  rejections: Rejection[];
  isGrabbed: boolean;
  isInLibrary: boolean;
  existingQuality?: string;
}

class ManualSearchService {
  async search(request: ManualSearchRequest): Promise<ManualSearchResult[]> {
    // Perform search
    const results = await this.searchService.search({
      ...request,
      isInteractive: true,
      userInvokedSearch: true,
    });

    // Enrich with additional info
    const enriched = await Promise.all(
      results.map(r => this.enrichResult(r, request))
    );

    // Sort by score
    return enriched.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);
  }

  private async enrichResult(
    result: SearchResult,
    request: ManualSearchRequest
  ): Promise<ManualSearchResult> {
    const media = await this.getMedia(request);
    const scoreBreakdown = this.scorer.score(result, media.qualityProfile, media);
    const rejections = this.rejector.check(result, {
      qualityProfile: media.qualityProfile,
      existingFiles: await this.getExistingFiles(request),
      blocklist: await this.blocklistService.get(),
      restrictions: await this.restrictionService.get(),
    });

    return {
      ...result,
      scoreBreakdown,
      rejections,
      isRejected: rejections.length > 0,
      isGrabbed: false, // Set after user action
      isInLibrary: await this.isInLibrary(result, request),
      existingQuality: await this.getExistingQuality(request),
    };
  }
}
```

### Grab Action

```typescript
interface GrabRequest {
  guid: string;
  indexerId: number;
  seriesId?: number;
  seasonNumber?: number;
  episodeIds?: number[];
  movieId?: number;
}

class GrabService {
  async grab(request: GrabRequest): Promise<GrabResult> {
    // Get release from indexer
    const release = await this.indexerService.fetchRelease(
      request.indexerId,
      request.guid
    );

    // Get media
    const media = await this.getMedia(request);

    // Final validation
    const validation = await this.validateGrab(release, media);
    if (!validation.valid) {
      throw new GrabError(validation.reason);
    }

    // Get download client
    const downloadClient = await this.getDownloadClient(release.protocol);

    // Add to download client
    const downloadInfo = await downloadClient.addDownload({
      url: release.downloadUrl,
      name: release.title,
      category: this.getCategory(media),
    });

    // Create history record
    await this.historyService.recordGrab({
      media,
      release,
      downloadClient: downloadClient.name,
      downloadId: downloadInfo.id,
    });

    // Emit event
    this.events.emit('release:grabbed', {
      release,
      media,
      downloadInfo,
    });

    return {
      success: true,
      downloadId: downloadInfo.id,
    };
  }
}
```

---

## Related Documents

- [PARSER_SPECIFICATION.md](./PARSER_SPECIFICATION.md) - Release parsing
- [INTEGRATION_SPECIFICATIONS.md](./INTEGRATION_SPECIFICATIONS.md) - Indexer integrations
- [QUALITY_DEFINITIONS.md](./DEEP_ARCHITECTURE.md) - Quality profiles
- [CACHING.md](./CACHING.md) - Search result caching
