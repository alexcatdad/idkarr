# File Naming Rules Specification

> **idkarr** - Complete file and folder naming system specification

## Table of Contents

1. [Overview](#overview)
2. [Naming Token System](#naming-token-system)
3. [Episode File Naming](#episode-file-naming)
4. [Season Folder Naming](#season-folder-naming)
5. [Series Folder Naming](#series-folder-naming)
6. [Movie File Naming](#movie-file-naming)
7. [Movie Folder Naming](#movie-folder-naming)
8. [Special Episode Handling](#special-episode-handling)
9. [Multi-Episode Files](#multi-episode-files)
10. [Token Reference](#token-reference)
11. [Examples](#examples)

---

## Overview

### Design Principles

1. **Flexibility**: Support customizable naming schemes via token templates
2. **Compatibility**: Ensure named files work with all media servers (Plex, Jellyfin, Emby)
3. **Readability**: Generate human-readable file names
4. **Uniqueness**: Prevent naming collisions
5. **Reversibility**: Allow parsing file names back to metadata

### Naming Configuration

```typescript
interface NamingConfig {
  // Series naming
  renameEpisodes: boolean;
  replaceIllegalCharacters: boolean;
  colonReplacementFormat: ColonReplacement;

  standardEpisodeFormat: string;
  dailyEpisodeFormat: string;
  animeEpisodeFormat: string;

  seriesFolderFormat: string;
  seasonFolderFormat: string;
  specialsFolderFormat: string;

  multiEpisodeStyle: MultiEpisodeStyle;

  // Movie naming
  renameMovies: boolean;
  movieFolderFormat: string;
  movieFileFormat: string;

  // Common
  includeQuality: boolean;
  includeEdition: boolean;
  replaceSpaces: boolean;
  spacesReplacement: string;
}

type ColonReplacement =
  | 'delete'           // Remove colons entirely
  | 'dash'             // Replace with dash: ' - '
  | 'space_dash'       // Replace with ' - '
  | 'space_dash_space' // Replace with ' - '
  | 'smart';           // Context-aware replacement

type MultiEpisodeStyle =
  | 'extend'           // S01E01-02-03
  | 'duplicate'        // S01E01.S01E02.S01E03
  | 'repeat'           // S01E01E02E03
  | 'scene'            // S01E01-E02-E03
  | 'range'            // S01E01-03
  | 'prefixed_range';  // S01E01-E03
```

---

## Naming Token System

### Token Parser

```typescript
interface Token {
  name: string;
  value: string | null;
  raw: string;
  modifiers: TokenModifier[];
}

interface TokenModifier {
  type: 'case' | 'pad' | 'separator' | 'conditional';
  value: string;
}

class TokenParser {
  private static readonly TOKEN_PATTERN = /\{([^{}]+)\}/g;

  parse(template: string): Token[] {
    const tokens: Token[] = [];
    let match: RegExpExecArray | null;

    while ((match = TokenParser.TOKEN_PATTERN.exec(template)) !== null) {
      const tokenContent = match[1];
      const token = this.parseTokenContent(tokenContent);
      tokens.push({
        ...token,
        raw: match[0],
      });
    }

    return tokens;
  }

  private parseTokenContent(content: string): Omit<Token, 'raw'> {
    // Check for modifiers
    const modifiers: TokenModifier[] = [];
    let name = content;

    // Case modifier: {Series Title:upper}
    if (content.includes(':')) {
      const parts = content.split(':');
      name = parts[0];

      for (let i = 1; i < parts.length; i++) {
        modifiers.push(this.parseModifier(parts[i]));
      }
    }

    return { name, value: null, modifiers };
  }

  private parseModifier(modifier: string): TokenModifier {
    const lowerMod = modifier.toLowerCase();

    if (['upper', 'lower', 'title', 'sentence'].includes(lowerMod)) {
      return { type: 'case', value: lowerMod };
    }

    if (lowerMod.startsWith('pad')) {
      return { type: 'pad', value: modifier.replace('pad', '') };
    }

    if (lowerMod === 'separator') {
      return { type: 'separator', value: ' ' };
    }

    return { type: 'conditional', value: modifier };
  }
}
```

### Token Resolver

```typescript
class TokenResolver {
  resolve(
    template: string,
    context: NamingContext
  ): string {
    const parser = new TokenParser();
    let result = template;

    for (const token of parser.parse(template)) {
      const value = this.resolveToken(token, context);
      result = result.replace(token.raw, value ?? '');
    }

    // Clean up
    result = this.cleanResult(result);

    return result;
  }

  private resolveToken(token: Token, context: NamingContext): string | null {
    let value = this.getTokenValue(token.name, context);

    if (value === null || value === undefined) {
      return null;
    }

    // Apply modifiers
    for (const modifier of token.modifiers) {
      value = this.applyModifier(value, modifier);
    }

    return value;
  }

  private getTokenValue(name: string, ctx: NamingContext): string | null {
    const tokenMap: Record<string, () => string | null> = {
      // Series tokens
      'Series Title': () => ctx.series?.title ?? null,
      'Series CleanTitle': () => ctx.series?.cleanTitle ?? null,
      'Series TitleYear': () => ctx.series
        ? `${ctx.series.title} (${ctx.series.year})`
        : null,
      'Series TitleThe': () => ctx.series
        ? this.titleWithThe(ctx.series.title)
        : null,
      'Series TitleFirstCharacter': () => ctx.series?.title?.[0]?.toUpperCase() ?? null,

      // Season tokens
      'Season': () => ctx.episode?.seasonNumber?.toString() ?? null,
      'Season:00': () => ctx.episode?.seasonNumber?.toString().padStart(2, '0') ?? null,

      // Episode tokens
      'Episode': () => ctx.episode?.episodeNumber?.toString() ?? null,
      'Episode:00': () => ctx.episode?.episodeNumber?.toString().padStart(2, '0') ?? null,
      'Episode Title': () => ctx.episode?.title ?? null,
      'Episode CleanTitle': () => ctx.episode?.cleanTitle ?? null,

      // Absolute episode
      'Absolute Episode': () => ctx.episode?.absoluteEpisodeNumber?.toString() ?? null,
      'Absolute Episode:00': () => ctx.episode?.absoluteEpisodeNumber?.toString().padStart(2, '0') ?? null,
      'Absolute Episode:000': () => ctx.episode?.absoluteEpisodeNumber?.toString().padStart(3, '0') ?? null,

      // Air date tokens
      'Air Date': () => ctx.episode?.airDate ?? null,
      'Air-Date': () => ctx.episode?.airDate?.replace(/-/g, '-') ?? null,
      'Air.Date': () => ctx.episode?.airDate?.replace(/-/g, '.') ?? null,
      'Air_Date': () => ctx.episode?.airDate?.replace(/-/g, '_') ?? null,

      // Quality tokens
      'Quality Full': () => ctx.quality?.full ?? null,
      'Quality Title': () => ctx.quality?.title ?? null,
      'Quality Proper': () => ctx.quality?.revision > 1 ? 'Proper' : null,
      'Quality Real': () => ctx.quality?.real ? 'REAL' : null,

      // Media info tokens
      'MediaInfo Video': () => ctx.mediaInfo?.videoCodec ?? null,
      'MediaInfo VideoDynamicRange': () => ctx.mediaInfo?.videoDynamicRange ?? null,
      'MediaInfo VideoDynamicRangeType': () => ctx.mediaInfo?.videoDynamicRangeType ?? null,
      'MediaInfo Audio': () => ctx.mediaInfo?.audioCodec ?? null,
      'MediaInfo AudioChannels': () => ctx.mediaInfo?.audioChannels?.toString() ?? null,
      'MediaInfo AudioLanguages': () => ctx.mediaInfo?.audioLanguages?.join('+') ?? null,
      'MediaInfo SubtitleLanguages': () => ctx.mediaInfo?.subtitleLanguages?.join('+') ?? null,
      'MediaInfo 3D': () => ctx.mediaInfo?.is3D ? '3D' : null,

      // Release info tokens
      'Release Group': () => ctx.releaseInfo?.releaseGroup ?? null,
      'Release Hash': () => ctx.releaseInfo?.hash ?? null,

      // Original tokens
      'Original Title': () => ctx.originalFileName ?? null,
      'Original Filename': () => ctx.originalFileName ?? null,

      // Movie tokens
      'Movie Title': () => ctx.movie?.title ?? null,
      'Movie CleanTitle': () => ctx.movie?.cleanTitle ?? null,
      'Movie TitleThe': () => ctx.movie
        ? this.titleWithThe(ctx.movie.title)
        : null,
      'Movie Year': () => ctx.movie?.year?.toString() ?? null,
      'Movie TitleFirstCharacter': () => ctx.movie?.title?.[0]?.toUpperCase() ?? null,

      // Edition tokens
      'Edition': () => ctx.movie?.edition ?? null,
      'Edition Tags': () => ctx.editionTags?.join(' ') ?? null,

      // IMDB/TMDB tokens
      'ImdbId': () => ctx.imdbId ?? null,
      'TmdbId': () => ctx.tmdbId?.toString() ?? null,
      'TvdbId': () => ctx.tvdbId?.toString() ?? null,
    };

    const getter = tokenMap[name];
    return getter ? getter() : null;
  }

  private applyModifier(value: string, modifier: TokenModifier): string {
    switch (modifier.type) {
      case 'case':
        return this.applyCase(value, modifier.value);
      case 'pad':
        return value.padStart(parseInt(modifier.value), '0');
      default:
        return value;
    }
  }

  private applyCase(value: string, caseType: string): string {
    switch (caseType) {
      case 'upper':
        return value.toUpperCase();
      case 'lower':
        return value.toLowerCase();
      case 'title':
        return this.toTitleCase(value);
      case 'sentence':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      default:
        return value;
    }
  }

  private titleWithThe(title: string): string {
    const thePrefix = /^The\s+/i;
    if (thePrefix.test(title)) {
      return title.replace(thePrefix, '') + ', The';
    }
    return title;
  }

  private cleanResult(result: string): string {
    // Remove empty brackets/parentheses
    result = result.replace(/\(\s*\)/g, '');
    result = result.replace(/\[\s*\]/g, '');
    result = result.replace(/\{\s*\}/g, '');

    // Remove multiple spaces
    result = result.replace(/\s{2,}/g, ' ');

    // Remove leading/trailing separators
    result = result.replace(/^[\s\-_.]+|[\s\-_.]+$/g, '');

    // Remove double separators
    result = result.replace(/[\-_.]{2,}/g, '-');

    return result.trim();
  }
}
```

---

## Episode File Naming

### Standard Episode Format

Default: `{Series Title} - S{Season:00}E{Episode:00} - {Episode Title} [{Quality Full}]`

```typescript
interface EpisodeNamingContext extends NamingContext {
  series: {
    title: string;
    cleanTitle: string;
    sortTitle: string;
    year: number;
    tvdbId?: number;
    imdbId?: string;
  };
  episode: {
    seasonNumber: number;
    episodeNumber: number;
    absoluteEpisodeNumber?: number;
    title: string;
    cleanTitle: string;
    airDate?: string;
    airDateUtc?: string;
  };
  episodes?: Array<{
    seasonNumber: number;
    episodeNumber: number;
    title: string;
  }>;
  quality: QualityInfo;
  mediaInfo?: MediaInfoData;
  releaseInfo?: ReleaseInfo;
}

class EpisodeFileNamer {
  constructor(private config: NamingConfig) {}

  getName(context: EpisodeNamingContext): string {
    const template = this.getTemplate(context);
    const resolver = new TokenResolver();

    let fileName = resolver.resolve(template, context);

    // Handle multi-episode
    if (context.episodes && context.episodes.length > 1) {
      fileName = this.applyMultiEpisodeStyle(fileName, context);
    }

    // Apply character replacements
    fileName = this.applyReplacements(fileName);

    // Add extension
    const extension = context.originalFileName?.split('.').pop() ?? 'mkv';

    return `${fileName}.${extension}`;
  }

  private getTemplate(context: EpisodeNamingContext): string {
    const seriesType = context.series.seriesType ?? 'standard';

    switch (seriesType) {
      case 'daily':
        return this.config.dailyEpisodeFormat;
      case 'anime':
        return this.config.animeEpisodeFormat;
      default:
        return this.config.standardEpisodeFormat;
    }
  }

  private applyMultiEpisodeStyle(
    fileName: string,
    context: EpisodeNamingContext
  ): string {
    const episodes = context.episodes!;
    const firstEp = episodes[0];
    const lastEp = episodes[episodes.length - 1];

    switch (this.config.multiEpisodeStyle) {
      case 'extend':
        // S01E01-02-03
        return fileName.replace(
          /S(\d+)E(\d+)/,
          `S${firstEp.seasonNumber.toString().padStart(2, '0')}E${episodes.map(e =>
            e.episodeNumber.toString().padStart(2, '0')
          ).join('-')}`
        );

      case 'duplicate':
        // S01E01.S01E02.S01E03
        return fileName.replace(
          /S(\d+)E(\d+)/,
          episodes.map(e =>
            `S${e.seasonNumber.toString().padStart(2, '0')}E${e.episodeNumber.toString().padStart(2, '0')}`
          ).join('.')
        );

      case 'repeat':
        // S01E01E02E03
        return fileName.replace(
          /S(\d+)E(\d+)/,
          `S${firstEp.seasonNumber.toString().padStart(2, '0')}${episodes.map(e =>
            `E${e.episodeNumber.toString().padStart(2, '0')}`
          ).join('')}`
        );

      case 'scene':
        // S01E01-E02-E03
        return fileName.replace(
          /S(\d+)E(\d+)/,
          `S${firstEp.seasonNumber.toString().padStart(2, '0')}${episodes.map((e, i) =>
            i === 0
              ? `E${e.episodeNumber.toString().padStart(2, '0')}`
              : `-E${e.episodeNumber.toString().padStart(2, '0')}`
          ).join('')}`
        );

      case 'range':
        // S01E01-03
        return fileName.replace(
          /S(\d+)E(\d+)/,
          `S${firstEp.seasonNumber.toString().padStart(2, '0')}E${firstEp.episodeNumber.toString().padStart(2, '0')}-${lastEp.episodeNumber.toString().padStart(2, '0')}`
        );

      case 'prefixed_range':
        // S01E01-E03
        return fileName.replace(
          /S(\d+)E(\d+)/,
          `S${firstEp.seasonNumber.toString().padStart(2, '0')}E${firstEp.episodeNumber.toString().padStart(2, '0')}-E${lastEp.episodeNumber.toString().padStart(2, '0')}`
        );

      default:
        return fileName;
    }
  }

  private applyReplacements(fileName: string): string {
    // Replace illegal characters
    if (this.config.replaceIllegalCharacters) {
      fileName = this.replaceIllegalCharacters(fileName);
    }

    // Handle colons
    fileName = this.replaceColons(fileName);

    // Replace spaces
    if (this.config.replaceSpaces) {
      fileName = fileName.replace(/\s+/g, this.config.spacesReplacement);
    }

    return fileName;
  }

  private replaceIllegalCharacters(input: string): string {
    // Windows illegal: \ / : * ? " < > |
    // Linux illegal: / (and null bytes)
    // macOS illegal: / :
    const illegalChars = /[\\/:*?"<>|]/g;

    return input.replace(illegalChars, char => {
      const replacements: Record<string, string> = {
        '\\': '-',
        '/': '-',
        ':': this.getColonReplacement(),
        '*': '',
        '?': '',
        '"': "'",
        '<': '',
        '>': '',
        '|': '-',
      };
      return replacements[char] ?? '';
    });
  }

  private replaceColons(input: string): string {
    switch (this.config.colonReplacementFormat) {
      case 'delete':
        return input.replace(/:/g, '');
      case 'dash':
        return input.replace(/:/g, '-');
      case 'space_dash':
        return input.replace(/:/g, ' -');
      case 'space_dash_space':
        return input.replace(/:/g, ' - ');
      case 'smart':
        // Smart replacement: "Title: Subtitle" -> "Title - Subtitle"
        return input.replace(/\s*:\s*/g, ' - ');
      default:
        return input;
    }
  }

  private getColonReplacement(): string {
    switch (this.config.colonReplacementFormat) {
      case 'delete': return '';
      case 'dash': return '-';
      case 'space_dash': return ' -';
      case 'space_dash_space': return ' - ';
      default: return ' - ';
    }
  }
}
```

### Daily Episode Format

Default: `{Series Title} - {Air-Date} - {Episode Title} [{Quality Full}]`

Specific tokens for daily shows:

| Token | Example | Description |
|-------|---------|-------------|
| `{Air Date}` | 2024-01-15 | ISO format date |
| `{Air-Date}` | 2024-01-15 | Hyphen separator |
| `{Air.Date}` | 2024.01.15 | Dot separator |
| `{Air_Date}` | 2024_01_15 | Underscore separator |
| `{Air Date:short}` | 01-15 | Month-day only |

### Anime Episode Format

Default: `{Series Title} - S{Season:00}E{Episode:00} - {Absolute Episode:000} - {Episode Title} [{Quality Full}]`

Anime-specific tokens:

| Token | Example | Description |
|-------|---------|-------------|
| `{Absolute Episode}` | 145 | Raw absolute number |
| `{Absolute Episode:00}` | 145 | 2-digit padded |
| `{Absolute Episode:000}` | 145 | 3-digit padded |
| `{Absolute Episode:0000}` | 0145 | 4-digit padded |

---

## Season Folder Naming

### Season Folder Format

Default: `Season {Season}`

```typescript
class SeasonFolderNamer {
  constructor(private config: NamingConfig) {}

  getName(context: SeasonFolderContext): string {
    const { seasonNumber, seriesType } = context;

    // Special handling for Season 0 (Specials)
    if (seasonNumber === 0) {
      return this.config.specialsFolderFormat;
    }

    const resolver = new TokenResolver();
    return resolver.resolve(this.config.seasonFolderFormat, {
      episode: { seasonNumber },
    });
  }
}

// Common formats
const seasonFormats = {
  standard: 'Season {Season}',           // Season 1
  padded: 'Season {Season:00}',          // Season 01
  abbreviated: 'S{Season:00}',           // S01
  full: 'Season {Season} ({Year})',      // Season 1 (2024)
  specials: 'Specials',                  // For season 0
};
```

### Season Folder Token Reference

| Token | Example | Description |
|-------|---------|-------------|
| `{Season}` | 1 | Raw season number |
| `{Season:0}` | 1 | Single digit (no padding) |
| `{Season:00}` | 01 | 2-digit padded |
| `{Series Title}` | Breaking Bad | Full series title |

---

## Series Folder Naming

### Series Folder Format

Default: `{Series Title} ({Series Year})`

```typescript
class SeriesFolderNamer {
  constructor(private config: NamingConfig) {}

  getName(context: SeriesFolderContext): string {
    const resolver = new TokenResolver();
    let folderName = resolver.resolve(this.config.seriesFolderFormat, context);

    // Apply character replacements
    folderName = this.applyReplacements(folderName);

    return folderName;
  }

  private applyReplacements(folderName: string): string {
    // Replace illegal characters
    if (this.config.replaceIllegalCharacters) {
      folderName = this.replaceIllegalCharacters(folderName);
    }

    // Handle colons
    folderName = this.replaceColons(folderName);

    return folderName;
  }
}

// Common formats
const seriesFolderFormats = {
  standard: '{Series Title}',                           // Breaking Bad
  withYear: '{Series Title} ({Series Year})',           // Breaking Bad (2008)
  withYearImdb: '{Series Title} ({Series Year}) {imdbid}', // Breaking Bad (2008) {tt0903747}
  withNetwork: '{Series Title} ({Network})',            // Breaking Bad (AMC)
  sortable: '{Series TitleThe}',                        // Breaking Bad, The
  prefixed: '{Series TitleFirstCharacter}/{Series Title}', // B/Breaking Bad
};
```

### Series Folder Token Reference

| Token | Example | Description |
|-------|---------|-------------|
| `{Series Title}` | Breaking Bad | Full series title |
| `{Series CleanTitle}` | breakingbad | Cleaned for matching |
| `{Series TitleYear}` | Breaking Bad (2008) | Title with year |
| `{Series TitleThe}` | Breaking Bad, The | "The" moved to end |
| `{Series TitleFirstCharacter}` | B | First character |
| `{Series Year}` | 2008 | Year premiered |
| `{tvdbid}` | {tvdb-81189} | TVDB ID in braces |
| `{imdbid}` | {tt0903747} | IMDB ID in braces |
| `{tmdbid}` | {tmdb-1396} | TMDB ID in braces |

---

## Movie File Naming

### Movie File Format

Default: `{Movie Title} ({Movie Year}) [{Quality Full}]`

```typescript
interface MovieNamingContext extends NamingContext {
  movie: {
    title: string;
    cleanTitle: string;
    sortTitle: string;
    year: number;
    imdbId?: string;
    tmdbId?: number;
    edition?: string;
  };
  quality: QualityInfo;
  mediaInfo?: MediaInfoData;
  releaseInfo?: ReleaseInfo;
  editionTags?: string[];
}

class MovieFileNamer {
  constructor(private config: NamingConfig) {}

  getName(context: MovieNamingContext): string {
    const resolver = new TokenResolver();

    let fileName = resolver.resolve(this.config.movieFileFormat, context);

    // Apply character replacements
    fileName = this.applyReplacements(fileName);

    // Add extension
    const extension = context.originalFileName?.split('.').pop() ?? 'mkv';

    return `${fileName}.${extension}`;
  }

  private applyReplacements(fileName: string): string {
    if (this.config.replaceIllegalCharacters) {
      fileName = this.replaceIllegalCharacters(fileName);
    }

    fileName = this.replaceColons(fileName);

    if (this.config.replaceSpaces) {
      fileName = fileName.replace(/\s+/g, this.config.spacesReplacement);
    }

    return fileName;
  }
}

// Common formats
const movieFileFormats = {
  standard: '{Movie Title} ({Movie Year})',
  withQuality: '{Movie Title} ({Movie Year}) [{Quality Full}]',
  withEdition: '{Movie Title} ({Movie Year}) {Edition Tags} [{Quality Full}]',
  full: '{Movie Title} ({Movie Year}) {Edition Tags} [{Quality Full}] [{MediaInfo Video}] [{MediaInfo Audio}] - {Release Group}',
  plex: '{Movie Title} ({Movie Year}) - {Quality Full}',
};
```

### Movie File Token Reference

| Token | Example | Description |
|-------|---------|-------------|
| `{Movie Title}` | The Matrix | Full movie title |
| `{Movie CleanTitle}` | thematrix | Cleaned for matching |
| `{Movie TitleThe}` | Matrix, The | "The" moved to end |
| `{Movie TitleFirstCharacter}` | M | First character (ignoring articles) |
| `{Movie Year}` | 1999 | Release year |
| `{Edition}` | Director's Cut | Edition name |
| `{Edition Tags}` | Director's Cut IMAX | All edition tags |

---

## Movie Folder Naming

### Movie Folder Format

Default: `{Movie Title} ({Movie Year})`

```typescript
class MovieFolderNamer {
  constructor(private config: NamingConfig) {}

  getName(context: MovieFolderContext): string {
    const resolver = new TokenResolver();
    let folderName = resolver.resolve(this.config.movieFolderFormat, context);

    // Apply character replacements
    folderName = this.applyReplacements(folderName);

    return folderName;
  }
}

// Common formats
const movieFolderFormats = {
  standard: '{Movie Title} ({Movie Year})',
  withImdb: '{Movie Title} ({Movie Year}) {imdb-{ImdbId}}',
  withTmdb: '{Movie Title} ({Movie Year}) {tmdb-{TmdbId}}',
  prefixed: '{Movie TitleFirstCharacter}/{Movie Title} ({Movie Year})',
  collection: '{Movie Collection}/{Movie Title} ({Movie Year})',
};
```

---

## Special Episode Handling

### Specials Folder

Season 0 episodes (specials) are placed in a dedicated folder:

```typescript
interface SpecialsConfig {
  specialsFolderFormat: string; // Default: 'Specials'
  specialsEpisodeFormat: string;
}

class SpecialsNamer {
  getName(context: SpecialEpisodeContext): string {
    // Specials use season 0
    const episodeNumber = context.episode.episodeNumber;

    // Format: S00E01
    return this.config.specialsEpisodeFormat
      .replace('{Season:00}', '00')
      .replace('{Episode:00}', episodeNumber.toString().padStart(2, '0'));
  }
}
```

### Special Episode Types

| Type | Description | Example Path |
|------|-------------|--------------|
| Standard Special | Regular special episode | Specials/S00E01 - Pilot.mkv |
| Behind the Scenes | BTS content | Specials/S00E02 - Behind the Scenes.mkv |
| Interview | Cast interviews | Specials/S00E03 - Cast Interview.mkv |
| Deleted Scene | Deleted scenes | Specials/S00E04 - Deleted Scenes.mkv |
| Feature | Documentary/feature | Specials/S00E05 - Making Of.mkv |

---

## Multi-Episode Files

### Multi-Episode Detection

```typescript
interface MultiEpisodeInfo {
  firstEpisode: number;
  lastEpisode: number;
  episodeCount: number;
  episodes: number[];
  isContiguous: boolean;
}

class MultiEpisodeDetector {
  detect(releaseTitle: string): MultiEpisodeInfo | null {
    // Pattern: S01E01E02, S01E01-E02, S01E01-02
    const patterns = [
      // S01E01E02E03
      /S(\d+)((?:E\d+)+)/i,
      // S01E01-E03
      /S(\d+)E(\d+)-E(\d+)/i,
      // S01E01-03
      /S(\d+)E(\d+)-(\d+)/i,
      // Episodes 1-3
      /Episodes?\s*(\d+)\s*-\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = releaseTitle.match(pattern);
      if (match) {
        return this.parseMatch(match, pattern);
      }
    }

    return null;
  }

  private parseMatch(
    match: RegExpMatchArray,
    pattern: RegExp
  ): MultiEpisodeInfo {
    // Implementation based on pattern type
    // Returns normalized multi-episode info
  }
}
```

### Multi-Episode Title Handling

```typescript
class MultiEpisodeTitleNamer {
  /**
   * Generate title for multi-episode files
   */
  getTitle(episodes: EpisodeInfo[]): string {
    if (episodes.length === 1) {
      return episodes[0].title;
    }

    // Check if all episodes share similar titles
    const commonPrefix = this.findCommonPrefix(
      episodes.map(e => e.title)
    );

    if (commonPrefix && commonPrefix.length > 5) {
      // Use common prefix: "Title Part 1 + 2 + 3"
      return `${commonPrefix.trim()}`;
    }

    // Concatenate with separator
    if (episodes.length === 2) {
      return `${episodes[0].title} + ${episodes[1].title}`;
    }

    // More than 2: First + Last
    return `${episodes[0].title} + ${episodes[episodes.length - 1].title}`;
  }

  private findCommonPrefix(titles: string[]): string {
    if (titles.length < 2) return '';

    let prefix = titles[0];

    for (let i = 1; i < titles.length; i++) {
      while (!titles[i].startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }

    return prefix;
  }
}
```

---

## Token Reference

### Complete Token List

#### Series Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{Series Title}` | Series title | Breaking Bad |
| `{Series CleanTitle}` | Cleaned title | breakingbad |
| `{Series TitleYear}` | Title with year | Breaking Bad (2008) |
| `{Series TitleThe}` | "The" moved to end | Walking Dead, The |
| `{Series TitleFirstCharacter}` | First character | B |
| `{Series Year}` | Year premiered | 2008 |
| `{Series Certification}` | Content rating | TV-MA |
| `{Series Genre}` | Primary genre | Drama |

#### Season/Episode Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{Season}` | Season number | 1 |
| `{Season:00}` | 2-digit season | 01 |
| `{Episode}` | Episode number | 1 |
| `{Episode:00}` | 2-digit episode | 01 |
| `{Episode Title}` | Episode title | Pilot |
| `{Episode CleanTitle}` | Cleaned episode title | pilot |
| `{Absolute Episode}` | Absolute number | 145 |
| `{Absolute Episode:000}` | 3-digit absolute | 145 |

#### Air Date Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{Air Date}` | ISO date | 2024-01-15 |
| `{Air-Date}` | Hyphen separated | 2024-01-15 |
| `{Air.Date}` | Dot separated | 2024.01.15 |
| `{Air_Date}` | Underscore separated | 2024_01_15 |
| `{Release Year}` | Air year | 2024 |
| `{Release Month}` | Air month | 01 |
| `{Release Day}` | Air day | 15 |

#### Quality Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{Quality Full}` | Full quality string | Bluray-1080p |
| `{Quality Title}` | Quality title only | Bluray |
| `{Quality Proper}` | Proper tag | Proper |
| `{Quality Real}` | Real tag | REAL |
| `{Quality Source}` | Source type | BluRay |
| `{Quality Resolution}` | Resolution | 1080p |

#### Media Info Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{MediaInfo Video}` | Video codec | x264 |
| `{MediaInfo VideoCodec}` | Video codec | H.264 |
| `{MediaInfo VideoBitDepth}` | Bit depth | 10 |
| `{MediaInfo VideoDynamicRange}` | HDR type | HDR |
| `{MediaInfo VideoDynamicRangeType}` | Full HDR type | HDR10+ |
| `{MediaInfo Audio}` | Audio codec | DTS-HD MA |
| `{MediaInfo AudioCodec}` | Audio codec | DTS |
| `{MediaInfo AudioChannels}` | Channel count | 5.1 |
| `{MediaInfo AudioLanguages}` | Languages | English+French |
| `{MediaInfo SubtitleLanguages}` | Subtitle langs | English |
| `{MediaInfo 3D}` | 3D indicator | 3D |

#### Release Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{Release Group}` | Release group | DEMAND |
| `{Release Hash}` | Release hash | ABC123 |
| `{Original Title}` | Original filename | Show.S01E01.720p |
| `{Original Filename}` | Same as above | Show.S01E01.720p |

#### Movie Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{Movie Title}` | Movie title | The Matrix |
| `{Movie CleanTitle}` | Cleaned title | thematrix |
| `{Movie TitleThe}` | "The" at end | Matrix, The |
| `{Movie TitleFirstCharacter}` | First character | M |
| `{Movie Year}` | Release year | 1999 |
| `{Edition}` | Edition name | Director's Cut |
| `{Edition Tags}` | All edition tags | IMAX Director's Cut |

#### External ID Tokens

| Token | Description | Example |
|-------|-------------|---------|
| `{ImdbId}` | IMDB ID | tt0903747 |
| `{TmdbId}` | TMDB ID | 1396 |
| `{TvdbId}` | TVDB ID | 81189 |
| `{tvdb-Id}` | TVDB with prefix | tvdb-81189 |
| `{imdb-Id}` | IMDB with prefix | imdb-tt0903747 |
| `{tmdb-Id}` | TMDB with prefix | tmdb-1396 |

---

## Examples

### Episode Naming Examples

#### Standard Show

Template: `{Series Title} - S{Season:00}E{Episode:00} - {Episode Title} [{Quality Full}]`

| Input | Output |
|-------|--------|
| Breaking Bad S01E01 | Breaking Bad - S01E01 - Pilot [HDTV-720p].mkv |
| Breaking Bad S05E16 | Breaking Bad - S05E16 - Felina [Bluray-1080p].mkv |

#### Daily Show

Template: `{Series Title} - {Air-Date} - {Episode Title} [{Quality Full}]`

| Input | Output |
|-------|--------|
| The Daily Show 2024-01-15 | The Daily Show - 2024-01-15 - John Oliver [WEBDL-1080p].mkv |

#### Anime

Template: `{Series Title} - S{Season:00}E{Episode:00} - {Absolute Episode:000} - {Episode Title} [{Quality Full}]`

| Input | Output |
|-------|--------|
| One Piece S21E145 (Abs 1000) | One Piece - S21E145 - 1000 - Overwhelming Strength [HDTV-1080p].mkv |

### Multi-Episode Examples

Template: `{Series Title} - S{Season:00}E{Episode:00} - {Episode Title} [{Quality Full}]`
Style: `extend`

| Input | Output |
|-------|--------|
| S01E01-E02 | Show - S01E01-02 - Pilot + Episode 2 [HDTV-720p].mkv |
| S01E01-E03 | Show - S01E01-02-03 - Episode Title [HDTV-720p].mkv |

### Movie Naming Examples

#### Standard Movie

Template: `{Movie Title} ({Movie Year}) [{Quality Full}]`

| Input | Output |
|-------|--------|
| The Matrix 1999 | The Matrix (1999) [Bluray-1080p].mkv |

#### With Edition

Template: `{Movie Title} ({Movie Year}) {Edition Tags} [{Quality Full}]`

| Input | Output |
|-------|--------|
| Blade Runner 1982 Final Cut | Blade Runner (1982) Final Cut [UHD Bluray-2160p].mkv |

### Folder Structure Examples

#### Series

```
/TV Shows/
└── Breaking Bad (2008)/
    ├── Season 01/
    │   ├── Breaking Bad - S01E01 - Pilot [Bluray-1080p].mkv
    │   └── Breaking Bad - S01E02 - Cat's in the Bag [Bluray-1080p].mkv
    ├── Season 05/
    │   └── Breaking Bad - S05E16 - Felina [Bluray-1080p].mkv
    └── Specials/
        └── Breaking Bad - S00E01 - Making of Breaking Bad [WEBDL-720p].mkv
```

#### Movies

```
/Movies/
├── A/
│   └── Alien (1979)/
│       └── Alien (1979) [Bluray-1080p].mkv
└── T/
    └── The Matrix (1999)/
        ├── The Matrix (1999) [UHD Bluray-2160p].mkv
        └── The Matrix (1999) Director's Cut [Bluray-1080p].mkv
```

---

## Related Documents

- [PARSER_SPECIFICATION.md](./PARSER_SPECIFICATION.md) - Release parsing specification
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - File and episode database schema
- [REST_API.md](./REST_API.md) - API endpoints for renaming operations
