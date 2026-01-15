# Release Parser Specification

## Overview

The release parser is responsible for extracting structured information from release titles. This is one of the most critical components of idkarr, handling the complex task of identifying quality, resolution, codec, language, and episode information from unstructured filenames.

**Complexity Note**: Sonarr's parser is approximately 71,000 lines of code. This specification provides the patterns and rules needed to implement a compatible parser.

---

## Table of Contents

1. [Parser Architecture](#parser-architecture)
2. [Quality Parsing](#quality-parsing)
3. [Resolution Parsing](#resolution-parsing)
4. [Source Parsing](#source-parsing)
5. [Codec Parsing](#codec-parsing)
6. [Audio Parsing](#audio-parsing)
7. [Language Parsing](#language-parsing)
8. [Episode Parsing](#episode-parsing)
9. [Series Parsing](#series-parsing)
10. [Release Group Parsing](#release-group-parsing)
11. [Special Cases](#special-cases)
12. [Music Parsing](#music-parsing)
13. [Movie Parsing](#movie-parsing)
14. [Extended Anime Parsing](#extended-anime-parsing)
15. [Test Cases](#test-cases)

---

## Parser Architecture

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Release Title                                 │
│  "The.Walking.Dead.S11E08.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb"       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Pre-Processing                                   │
│  - Normalize separators (. _ - → space)                             │
│  - Remove file extension                                             │
│  - Handle special characters                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Quality Detection                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │Resolution│ │  Source  │ │  Codec   │ │  Audio   │              │
│  │  1080p   │ │  WEB-DL  │ │  H.264   │ │ DDP5.1   │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Episode Detection                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │  Series  │ │  Season  │ │ Episode  │ │  Title   │              │
│  │  Title   │ │    11    │ │    08    │ │          │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Additional Info                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Language │ │  Proper  │ │  Group   │ │  Hash    │              │
│  │          │ │          │ │   NTb    │ │          │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Parsed Release Object                             │
│  {                                                                   │
│    seriesTitle: "The Walking Dead",                                 │
│    seasonNumber: 11,                                                │
│    episodeNumbers: [8],                                             │
│    quality: { resolution: 1080, source: "WEB-DL" },                │
│    releaseGroup: "NTb",                                             │
│    ...                                                              │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Parsed Release Interface

```typescript
interface ParsedRelease {
  // Series Info
  seriesTitle: string;
  seriesTitleInfo: {
    title: string;
    titleWithoutYear: string;
    year?: number;
  };
  cleanSeriesTitle: string;

  // Episode Info
  seasonNumber?: number;
  episodeNumbers: number[];
  absoluteEpisodeNumbers?: number[];
  specialAbsoluteEpisodeNumber?: number;
  airDate?: string;                    // For daily shows (YYYY-MM-DD)
  isDaily: boolean;
  isAbsoluteNumbering: boolean;
  isPartialSeason: boolean;
  isMultiSeason: boolean;
  isSeasonExtra: boolean;
  isSplitEpisode: boolean;

  // Quality
  quality: ParsedQuality;

  // Languages
  languages: Language[];

  // Release Info
  releaseGroup?: string;
  releaseHash?: string;
  releaseTitle: string;

  // Modifiers
  proper: boolean;
  repack: boolean;
  real: boolean;
  version: number;

  // Edition
  edition?: string;

  // Special flags
  special: boolean;
}

interface ParsedQuality {
  quality: QualityDefinition;
  revision: {
    version: number;
    real: number;
    isRepack: boolean;
  };
  customFormats: number[];
  customFormatScore: number;
  hardcodedSubs?: string;
}

interface QualityDefinition {
  id: number;
  name: string;
  source: QualitySource;
  resolution: number;
  modifier: QualityModifier;
}
```

---

## Quality Parsing

### Quality Definitions

| ID | Name | Source | Resolution | Weight |
|----|------|--------|------------|--------|
| 0 | Unknown | unknown | 0 | 1 |
| 1 | SDTV | television | 480 | 2 |
| 2 | DVD | dvd | 480 | 3 |
| 3 | WEBDL-480p | web | 480 | 4 |
| 4 | WEBRip-480p | webRip | 480 | 4 |
| 5 | Bluray-480p | bluray | 480 | 5 |
| 6 | HDTV-720p | television | 720 | 6 |
| 7 | WEBDL-720p | web | 720 | 7 |
| 8 | WEBRip-720p | webRip | 720 | 7 |
| 9 | Bluray-720p | bluray | 720 | 8 |
| 10 | HDTV-1080p | television | 1080 | 9 |
| 11 | WEBDL-1080p | web | 1080 | 10 |
| 12 | WEBRip-1080p | webRip | 1080 | 10 |
| 13 | Bluray-1080p | bluray | 1080 | 11 |
| 14 | Bluray-1080p Remux | bluray | 1080 | 12 |
| 15 | HDTV-2160p | television | 2160 | 13 |
| 16 | WEBDL-2160p | web | 2160 | 14 |
| 17 | WEBRip-2160p | webRip | 2160 | 14 |
| 18 | Bluray-2160p | bluray | 2160 | 15 |
| 19 | Bluray-2160p Remux | bluray | 2160 | 16 |
| 20 | Raw-HD | televisionRaw | 1080 | 5 |
| 21 | DVD-R | dvd | 480 | 4 |

---

## Resolution Parsing

### Resolution Patterns

```typescript
const resolutionPatterns = {
  // 4K/UHD
  '2160p': /\b(2160p|4k|uhd|ultra[\s.-]?hd)\b/i,

  // 1080p
  '1080p': /\b(1080[pi]|1920x1080|fullhd|fhd)\b/i,

  // 720p
  '720p': /\b(720[pi]|1280x720|hd)\b/i,

  // 576p (PAL)
  '576p': /\b(576[pi]|pal)\b/i,

  // 480p
  '480p': /\b(480[pi]|640x480|sd|ntsc)\b/i,

  // 360p
  '360p': /\b360p\b/i,
};
```

### Resolution Detection Rules

1. **Explicit Resolution**: `1080p`, `720p`, `2160p` in title
2. **Dimension-Based**: `1920x1080` → 1080p, `1280x720` → 720p
3. **Alias Detection**: `4K`/`UHD` → 2160p, `FHD` → 1080p, `HD` → 720p
4. **Default Based on Source**:
   - HDTV without resolution → 720p
   - Bluray without resolution → 1080p
   - WEB-DL/WEBRip without resolution → 720p (or 1080p if codec suggests)

---

## Source Parsing

### Source Patterns

```typescript
const sourcePatterns = {
  // Bluray
  bluray: /\b(blu[\s.-]?ray|bd[\s.-]?rip|bd[\s.-]?remux|bdrip|brip|brrip)\b/i,
  blurayRemux: /\b(bd[\s.-]?remux|blu[\s.-]?ray[\s.-]?remux|remux)\b/i,
  blurayRaw: /\b(complete[\s.-]?bluray|iso|bdiso|full[\s.-]?bluray)\b/i,

  // DVD
  dvd: /\b(dvd[\s.-]?rip|dvd[\s.-]?scr|dvd[\s.-]?r|dvdmux)\b/i,
  dvdRaw: /\b(dvd[\s.-]?iso|full[\s.-]?dvd|dvd[\s.-]?9|dvd[\s.-]?5)\b/i,

  // Web
  webDl: /\b(web[\s.-]?dl|webdl|web[\s.-]?rip[\s.-]?dl|amzn|nf|atvp|dsnp|hmax|pcok|pmtp|hulu|it|red)\b/i,
  webRip: /\b(web[\s.-]?rip|webrip|web[\s.-]?cap|webcap)\b/i,

  // Television
  hdtv: /\b(hdtv|pdtv|dsr|dsrip|dthrip|dvb[\s.-]?rip|tvrip|hdtvrip)\b/i,
  sdtv: /\b(sdtv|dtvrip|satrip)\b/i,
  tvRaw: /\b(tvrip[\s.-]?raw|tv[\s.-]?cap|ts|telesync|telecine|tc|cam|hdcam|hd[\s.-]?cam)\b/i,

  // Screeners
  screener: /\b(screener|scr|dvdscr|bdscr|webscr)\b/i,
};
```

### Streaming Service Detection

| Pattern | Service | Source |
|---------|---------|--------|
| `AMZN` | Amazon Prime | WEB-DL |
| `NF` | Netflix | WEB-DL |
| `DSNP` | Disney+ | WEB-DL |
| `ATVP` | Apple TV+ | WEB-DL |
| `HMAX` | HBO Max | WEB-DL |
| `PCOK` | Peacock | WEB-DL |
| `PMTP` | Paramount+ | WEB-DL |
| `HULU` | Hulu | WEB-DL |
| `IT` | iTunes | WEB-DL |
| `RED` | YouTube Red | WEB-DL |
| `CRAV` | Crave | WEB-DL |
| `STAN` | Stan | WEB-DL |
| `iP` | BBC iPlayer | WEB-DL |
| `CC` | Comedy Central | WEB-DL |

### Source Priority

When multiple sources are detected:
1. Bluray Remux > Bluray > DVD
2. WEB-DL > WEBRip > HDTV
3. Explicit source > Inferred source

---

## Codec Parsing

### Video Codec Patterns

```typescript
const videoCodecPatterns = {
  // H.265/HEVC
  h265: /\b(h[\s.-]?265|x[\s.-]?265|hevc)\b/i,

  // H.264/AVC
  h264: /\b(h[\s.-]?264|x[\s.-]?264|avc)\b/i,

  // AV1
  av1: /\b(av1|av01)\b/i,

  // VP9
  vp9: /\b(vp[\s.-]?9)\b/i,

  // MPEG
  mpeg2: /\b(mpeg[\s.-]?2|h[\s.-]?262)\b/i,

  // XviD/DivX
  xvid: /\b(xvid|divx)\b/i,

  // WMV
  wmv: /\b(wmv|vc[\s.-]?1)\b/i,
};
```

### Codec Detection Rules

1. **Explicit Codec**: `x265`, `H.264`, `HEVC` in title
2. **Container Hints**: `.mkv` often indicates modern codecs
3. **Quality Hints**: 4K releases often use HEVC

### Video Codec Quality Impact

| Codec | 10-bit | HDR Support | Efficiency |
|-------|--------|-------------|------------|
| H.265/HEVC | Yes | Yes | High |
| H.264/AVC | Rare | No | Medium |
| AV1 | Yes | Yes | Highest |
| VP9 | Yes | Yes | High |

---

## Audio Parsing

### Audio Codec Patterns

```typescript
const audioCodecPatterns = {
  // Dolby
  truehd: /\b(true[\s.-]?hd|truehd)\b/i,
  atmos: /\b(atmos)\b/i,
  ddp: /\b(ddp|dd[\s.-]?p|e[\s.-]?ac[\s.-]?3|eac3)\b/i,
  dd: /\b(dd|dolby[\s.-]?digital|ac[\s.-]?3|ac3)\b/i,

  // DTS
  dtsHdMa: /\b(dts[\s.-]?hd[\s.-]?ma|dts[\s.-]?hd[\s.-]?master)\b/i,
  dtsHd: /\b(dts[\s.-]?hd)\b/i,
  dtsX: /\b(dts[\s.-]?x)\b/i,
  dts: /\b(dts)\b/i,

  // Lossless
  flac: /\b(flac)\b/i,
  pcm: /\b(pcm|lpcm)\b/i,

  // Lossy
  aac: /\b(aac)\b/i,
  mp3: /\b(mp3)\b/i,
  opus: /\b(opus)\b/i,
  vorbis: /\b(vorbis|ogg)\b/i,
};
```

### Audio Channels Pattern

```typescript
const audioChannelPatterns = {
  // Atmos (Object-based, no fixed channels)
  atmos: /\b(atmos)\b/i,

  // 7.1
  channels71: /\b(7[\s.]1)\b/i,

  // 5.1
  channels51: /\b(5[\s.]1|6ch)\b/i,

  // 2.0/Stereo
  channels20: /\b(2[\s.]0|stereo|2ch)\b/i,

  // Mono
  channels10: /\b(1[\s.]0|mono|1ch)\b/i,
};
```

### Audio Quality Ranking

1. TrueHD Atmos > TrueHD > DTS-HD MA > DTS-HD > DTS
2. DD+ Atmos > DD+ (E-AC3) > DD (AC3)
3. FLAC > AAC > MP3

---

## Language Parsing

### Language Patterns

```typescript
const languagePatterns = {
  // Major Languages
  english: /\b(eng|english|en)\b/i,
  french: /\b(french|français|fra|fre|vff|vfi|vf2|truefrench)\b/i,
  german: /\b(german|deutsch|ger|deu)\b/i,
  spanish: /\b(spanish|español|spa|esp|castellano|latino|lat)\b/i,
  italian: /\b(italian|italiano|ita)\b/i,
  portuguese: /\b(portuguese|português|por|pt[\s.-]?br)\b/i,
  japanese: /\b(japanese|日本語|jpn|jap)\b/i,
  korean: /\b(korean|한국어|kor)\b/i,
  chinese: /\b(chinese|中文|chi|zho|mandarin|cantonese)\b/i,
  russian: /\b(russian|русский|rus)\b/i,
  arabic: /\b(arabic|العربية|ara)\b/i,
  hindi: /\b(hindi|हिन्दी|hin)\b/i,
  dutch: /\b(dutch|nederlands|dut|nld)\b/i,
  polish: /\b(polish|polski|pol)\b/i,
  swedish: /\b(swedish|svenska|swe)\b/i,
  norwegian: /\b(norwegian|norsk|nor|nob)\b/i,
  danish: /\b(danish|dansk|dan)\b/i,
  finnish: /\b(finnish|suomi|fin)\b/i,
  turkish: /\b(turkish|türkçe|tur)\b/i,
  greek: /\b(greek|ελληνικά|gre|ell)\b/i,
  hebrew: /\b(hebrew|עברית|heb)\b/i,
  thai: /\b(thai|ไทย|tha)\b/i,
  vietnamese: /\b(vietnamese|tiếng việt|vie)\b/i,
  indonesian: /\b(indonesian|bahasa indonesia|ind)\b/i,
  czech: /\b(czech|čeština|cze|ces)\b/i,
  hungarian: /\b(hungarian|magyar|hun)\b/i,
  romanian: /\b(romanian|română|rum|ron)\b/i,
  ukrainian: /\b(ukrainian|українська|ukr)\b/i,

  // Multi-language
  multi: /\b(multi|dual[\s.-]?audio|ml)\b/i,
};
```

### Language Detection Rules

1. **Explicit Language Tag**: `GERMAN`, `FRENCH`, `MULTi`
2. **Audio Track Indicators**: `German.DTS`, `French.AC3`
3. **Release Group Hints**: Some groups release specific languages
4. **Default**: English if no language detected (for English trackers)

### Subtitle Detection

```typescript
const subtitlePatterns = {
  hardcoded: /\b(hc|hardcoded|hardsub|hard[\s.-]?sub)\b/i,
  subbed: /\b(subbed|subs|subtitled)\b/i,
  subtitleLanguage: /\b(eng[\s.-]?sub|ger[\s.-]?sub|fre[\s.-]?sub)\b/i,
};
```

---

## Episode Parsing

### Standard Episode Patterns

```typescript
const episodePatterns = {
  // S01E01 format (most common)
  standard: /\bS(\d{1,2})[\s.-]*E(\d{1,3})(?:[\s.-]*E(\d{1,3}))*\b/i,

  // 1x01 format
  xFormat: /\b(\d{1,2})x(\d{1,3})(?:[\s.-]*(\d{1,3}))*\b/i,

  // Season 1 Episode 1
  fullWord: /\bSeason[\s.-]*(\d{1,2})[\s.-]*Episode[\s.-]*(\d{1,3})\b/i,

  // 101, 102 format (3-digit)
  threeDigit: /\b(\d)(\d{2})\b/,  // With context

  // Episode 01 (no season)
  episodeOnly: /\bE(?:pisode)?[\s.-]*(\d{1,3})\b/i,

  // Part formats
  part: /\b(?:Part|Pt)[\s.-]*(\d{1,2})\b/i,
};
```

### Multi-Episode Patterns

```typescript
const multiEpisodePatterns = {
  // S01E01-E03 or S01E01E02E03
  range: /\bS(\d{1,2})E(\d{1,3})(?:[\s.-]*E(\d{1,3}))+\b/i,

  // S01E01-03
  shortRange: /\bS(\d{1,2})E(\d{1,3})[\s.-]*(\d{1,3})\b/i,

  // Episodes 1-3
  wordRange: /\bEpisodes?[\s.-]*(\d{1,3})[\s.-]*(?:to|-)[\s.-]*(\d{1,3})\b/i,
};
```

### Daily Show Patterns

```typescript
const dailyPatterns = {
  // 2023-01-15 or 2023.01.15
  isoDate: /\b(\d{4})[\s.-](\d{2})[\s.-](\d{2})\b/,

  // 15.01.2023
  euDate: /\b(\d{2})[\s.-](\d{2})[\s.-](\d{4})\b/,

  // January 15, 2023
  wordDate: /\b(January|February|March|April|May|June|July|August|September|October|November|December)[\s.-]*(\d{1,2})[\s.,]*(\d{4})\b/i,
};
```

### Anime Episode Patterns

```typescript
const animePatterns = {
  // Absolute numbering: [Group] Series - 01
  absolute: /[\[\(]([^\]]+)[\]\)][\s.-]*(.+?)[\s.-]+(\d{2,4})(?:v\d)?[\s.-]*[\[\(]/i,

  // Episode 01 of series
  absoluteEpisode: /\b(?:EP?|Episode)[\s.-]*(\d{2,4})\b/i,

  // Batch: 01-12
  batch: /\b(\d{2,3})[\s.-]*(\d{2,3})\b/,

  // Version: v2, v3
  version: /v(\d)\b/i,
};
```

### Season Patterns

```typescript
const seasonPatterns = {
  // Season 1, S1, S01
  standard: /\bS(?:eason)?[\s.-]*(\d{1,2})\b/i,

  // Complete Season
  complete: /\b(?:Complete|Full)[\s.-]*(?:Series|Season)\b/i,

  // Season Pack
  pack: /\bSeason[\s.-]*(\d{1,2})[\s.-]*(?:Complete|Pack)\b/i,

  // Multi-season: S01-S03
  multiSeason: /\bS(\d{1,2})[\s.-]*S(\d{1,2})\b/i,
};
```

---

## Series Parsing

### Title Extraction

```typescript
function extractSeriesTitle(title: string): string {
  // Remove quality info
  let cleanTitle = title.replace(qualityPattern, '');

  // Remove episode info
  cleanTitle = cleanTitle.replace(episodePattern, '');

  // Remove release group
  cleanTitle = cleanTitle.replace(releaseGroupPattern, '');

  // Remove year (but save it)
  const yearMatch = cleanTitle.match(/\((\d{4})\)/);
  cleanTitle = cleanTitle.replace(/\(\d{4}\)/, '');

  // Normalize separators
  cleanTitle = cleanTitle.replace(/[._-]+/g, ' ').trim();

  return cleanTitle;
}
```

### Title Normalization

```typescript
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    // Remove articles
    .replace(/^(the|a|an)\s+/i, '')
    // Remove special characters
    .replace(/[^a-z0-9\s]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Year Detection

```typescript
const yearPatterns = {
  // (2023) or [2023]
  bracketed: /[\[\(](\d{4})[\]\)]/,

  // .2023. or -2023-
  separated: /[\s._-](\d{4})[\s._-]/,

  // End of title: 2023
  endOfTitle: /\s(\d{4})$/,
};
```

---

## Release Group Parsing

### Release Group Patterns

```typescript
const releaseGroupPatterns = {
  // End of filename: -GROUP
  endDash: /-([A-Za-z0-9]+)$/,

  // Before extension: -GROUP.mkv
  beforeExt: /-([A-Za-z0-9]+)\.[a-z]{3,4}$/i,

  // [GROUP] at start (anime)
  startBracket: /^\[([^\]]+)\]/,

  // (GROUP) at end
  endBracket: /\(([A-Za-z0-9]+)\)$/,
};
```

### Known Release Groups

```typescript
const knownGroups = {
  // Scene Groups (TV)
  tv: ['LOL', 'DIMENSION', 'KILLERS', 'AVS', 'SVA', 'FLEET', 'DEFLATE', 'MEMENTO', 'NTb', 'CAKES', 'BTN'],

  // P2P Groups
  p2p: ['QCF', 'NTG', 'SPARKS', 'GECKOS', 'DEMAND', 'W4F', 'AMIABLE', 'ROVERS'],

  // WEB Groups
  web: ['AMZN', 'DSNP', 'NF', 'HMAX', 'ATVP', 'PCOK', 'PMTP'],

  // Anime Groups
  anime: ['SubsPlease', 'Erai-raws', 'HorribleSubs', 'Judas', 'SSA', 'EMBER'],
};
```

---

## Special Cases

### Proper/Repack Detection

```typescript
const properPatterns = {
  proper: /\b(proper)\b/i,
  repack: /\b(repack|rerip)\b/i,
  real: /\b(real)\b/i,
  version: /\bv(\d)\b/i,
};
```

### Edition Detection

```typescript
const editionPatterns = {
  directors: /\b(director'?s?[\s.-]?cut|dc)\b/i,
  extended: /\b(extended|uncut|unrated)\b/i,
  theatrical: /\b(theatrical)\b/i,
  ultimate: /\b(ultimate[\s.-]?cut|uc)\b/i,
  imax: /\b(imax)\b/i,
  remaster: /\b(remaster(ed)?|restored)\b/i,
  anniversary: /\b(\d+(?:th|st|nd|rd)?[\s.-]?anniversary)\b/i,
  special: /\b(special[\s.-]?edition|se)\b/i,
  criterion: /\b(criterion)\b/i,
};
```

### HDR Detection

```typescript
const hdrPatterns = {
  dolbyVision: /\b(dv|dolby[\s.-]?vision|dovi)\b/i,
  hdr10Plus: /\b(hdr10[\s.-]?\+|hdr10plus)\b/i,
  hdr10: /\b(hdr10|hdr)\b/i,
  hlg: /\b(hlg)\b/i,
  sdr: /\b(sdr)\b/i,
};
```

### 3D Detection

```typescript
const threeDPatterns = {
  general: /\b(3d)\b/i,
  sbs: /\b(sbs|side[\s.-]?by[\s.-]?side|half[\s.-]?sbs|hsbs)\b/i,
  ou: /\b(ou|over[\s.-]?under|half[\s.-]?ou|hou)\b/i,
  mvc: /\b(mvc)\b/i,
};
```

### Hash Detection

```typescript
const hashPatterns = {
  // [ABCD1234] - 8 character hex
  crc32: /[\[\(]([0-9A-Fa-f]{8})[\]\)]/,

  // Longer hashes
  md5: /\b([0-9A-Fa-f]{32})\b/,
};
```

---

## Music Parsing

### Music Release Interface

```typescript
interface ParsedMusicRelease {
  // Artist Info
  artistName: string;
  cleanArtistName: string;
  artistInfo: {
    name: string;
    sortName?: string;
  };

  // Album Info
  albumTitle: string;
  cleanAlbumTitle: string;
  year?: number;
  releaseType: MusicReleaseType;

  // Quality
  audioFormat: AudioFormat;
  bitrate?: number;
  bitrateMode?: BitrateMode;
  sampleRate?: number;
  bitDepth?: number;

  // Source
  source: MusicSource;

  // Multi-disc
  discNumber?: number;
  discCount?: number;

  // Release Info
  releaseGroup?: string;
  catalogNumber?: string;
  label?: string;

  // Modifiers
  remastered: boolean;
  vinyl: boolean;
  deluxe: boolean;
  explicit: boolean;
}

type MusicReleaseType = 'Album' | 'EP' | 'Single' | 'Compilation' | 'Soundtrack' | 'Live' | 'Remix' | 'Bootleg' | 'Interview' | 'Mixtape' | 'Demo' | 'Unknown';

type AudioFormat = 'FLAC' | 'ALAC' | 'MP3' | 'AAC' | 'OGG' | 'OPUS' | 'WAV' | 'AIFF' | 'DSD' | 'APE' | 'WMA' | 'Unknown';

type BitrateMode = 'CBR' | 'VBR' | 'Lossless';

type MusicSource = 'CD' | 'WEB' | 'Vinyl' | 'DVD' | 'Blu-ray' | 'SACD' | 'DAT' | 'Cassette' | 'Soundboard' | 'Unknown';
```

### Music Title Patterns

```typescript
const musicTitlePatterns = {
  // Artist - Album (Year) [Format]
  standardWithYear: /^(.+?)\s*-\s*(.+?)\s*[\[\(](\d{4})[\]\)]\s*[\[\(](.+?)[\]\)]/,

  // Artist - Album [Format]
  standardNoYear: /^(.+?)\s*-\s*(.+?)\s*[\[\(](FLAC|MP3|AAC|OGG|ALAC|320|V0|V2|WEB|CD|Vinyl)[\]\)]/i,

  // Artist - Album (Year)
  yearOnly: /^(.+?)\s*-\s*(.+?)\s*[\[\(](\d{4})[\]\)]/,

  // Artist - Album
  basic: /^(.+?)\s*-\s*(.+?)$/,

  // Album by Artist
  byFormat: /^(.+?)\s+by\s+(.+?)$/i,

  // Various Artists - Compilation Name
  variousArtists: /^(Various\s*Artists?|VA|V\.A\.)\s*-\s*(.+?)$/i,

  // Split release: Artist1 & Artist2 - Album
  splitRelease: /^(.+?)\s*[&\/]\s*(.+?)\s*-\s*(.+?)$/,
};
```

### Audio Format Detection

```typescript
const audioFormatPatterns = {
  // Lossless formats
  flac: /\b(flac)\b/i,
  alac: /\b(alac|apple[\s.-]?lossless)\b/i,
  wav: /\b(wav|wave)\b/i,
  aiff: /\b(aiff?)\b/i,
  ape: /\b(ape|monkey'?s?[\s.-]?audio)\b/i,
  dsd: /\b(dsd|dsd64|dsd128|dsd256|dsd512|dsf|dff)\b/i,

  // Lossy formats
  mp3: /\b(mp3|mpeg[\s.-]?audio)\b/i,
  aac: /\b(aac|m4a)\b/i,
  ogg: /\b(ogg|vorbis)\b/i,
  opus: /\b(opus)\b/i,
  wma: /\b(wma|windows[\s.-]?media)\b/i,
};

const formatQualityOrder = [
  'DSD',      // Highest
  'FLAC',
  'ALAC',
  'WAV',
  'AIFF',
  'APE',
  'OPUS',
  'OGG',
  'AAC',
  'MP3',
  'WMA',      // Lowest
];
```

### Bitrate Detection

```typescript
const bitratePatterns = {
  // Explicit bitrate: 320kbps, 256 kbps
  explicit: /\b(\d{2,4})\s*(?:kbps|kbit|kb\/s)\b/i,

  // MP3 specific: 320, 256, 192, 128
  mp3Bitrate: /\b(320|256|224|192|160|128|112|96|80|64|48|32)\b/,

  // VBR modes: V0, V2, V4
  vbr: /\b(V\s*\d)\b/i,

  // APS (Average Preset Standard)
  aps: /\b(aps)\b/i,

  // APX (Average Preset Extreme)
  apx: /\b(apx)\b/i,

  // 24-bit indicator
  bitDepth24: /\b(24[\s.-]?bit|hi[\s.-]?res)\b/i,

  // 16-bit indicator
  bitDepth16: /\b(16[\s.-]?bit)\b/i,

  // Sample rate: 44.1kHz, 48kHz, 96kHz, 192kHz
  sampleRate: /\b(\d{2,3}(?:\.\d)?)\s*(?:khz|kHz)\b/i,
};

const vbrQualityMap = {
  'V0': { bitrateMode: 'VBR', targetBitrate: 245, quality: 'Highest VBR' },
  'V1': { bitrateMode: 'VBR', targetBitrate: 225, quality: 'High VBR' },
  'V2': { bitrateMode: 'VBR', targetBitrate: 190, quality: 'Standard VBR' },
  'V3': { bitrateMode: 'VBR', targetBitrate: 175, quality: 'Medium VBR' },
  'V4': { bitrateMode: 'VBR', targetBitrate: 165, quality: 'Low VBR' },
  'APS': { bitrateMode: 'VBR', targetBitrate: 180, quality: 'Average Standard' },
  'APX': { bitrateMode: 'VBR', targetBitrate: 210, quality: 'Average Extreme' },
};
```

### Music Source Detection

```typescript
const musicSourcePatterns = {
  // CD source
  cd: /\b(cd[\s.-]?rip|cd|cdda|from[\s.-]?cd)\b/i,

  // Web/Digital source
  web: /\b(web|itunes|amazon|spotify|tidal|deezer|qobuz|bandcamp|beatport|hdtracks|7digital|google[\s.-]?play)\b/i,

  // Vinyl source
  vinyl: /\b(vinyl|lp|12"|7"|33rpm|45rpm|record[\s.-]?rip)\b/i,

  // DVD-Audio
  dvdAudio: /\b(dvd[\s.-]?a(?:udio)?|dvd[\s.-]?rip)\b/i,

  // Blu-ray Audio
  blurayAudio: /\b(bd[\s.-]?a(?:udio)?|blu[\s.-]?ray[\s.-]?audio)\b/i,

  // SACD
  sacd: /\b(sacd|super[\s.-]?audio[\s.-]?cd)\b/i,

  // DAT
  dat: /\b(dat|digital[\s.-]?audio[\s.-]?tape)\b/i,

  // Cassette
  cassette: /\b(cassette|tape[\s.-]?rip|cass)\b/i,

  // Soundboard (live recordings)
  soundboard: /\b(sbd|soundboard)\b/i,

  // AUD (audience recording)
  audience: /\b(aud|audience)\b/i,
};

const sourceQualityOrder = [
  'Blu-ray',  // Highest
  'SACD',
  'DVD',
  'CD',
  'WEB',
  'Vinyl',
  'DAT',
  'Soundboard',
  'Cassette',
  'Unknown',  // Lowest
];
```

### Multi-Disc Detection

```typescript
const multiDiscPatterns = {
  // CD1, CD 1, CD-1
  cdNumber: /\b(?:cd|disc|disk)[\s.-]*(\d{1,2})\b/i,

  // Disc 1 of 3
  discOf: /\b(?:disc|disk|cd)[\s.-]*(\d{1,2})[\s.-]*(?:of|\/|-)\s*(\d{1,2})\b/i,

  // (1-3) or [1/3]
  discFraction: /[\[\(](\d{1,2})[\s.-]*(?:of|\/|-)\s*(\d{1,2})[\]\)]/,

  // D1, D2 (shorthand)
  discShort: /\b[dD](\d{1,2})\b/,

  // Box Set Disc indicator
  boxSet: /\b(?:box[\s.-]?set|complete|collection)\b/i,
};

function parseMultiDisc(title: string): { discNumber?: number; discCount?: number } {
  const discOfMatch = title.match(multiDiscPatterns.discOf);
  if (discOfMatch) {
    return {
      discNumber: parseInt(discOfMatch[1], 10),
      discCount: parseInt(discOfMatch[2], 10),
    };
  }

  const cdMatch = title.match(multiDiscPatterns.cdNumber);
  if (cdMatch) {
    return { discNumber: parseInt(cdMatch[1], 10) };
  }

  return {};
}
```

### Release Type Detection

```typescript
const releaseTypePatterns = {
  // Album types
  album: /\b(album|lp|full[\s.-]?length)\b/i,
  ep: /\b(ep|e\.p\.|extended[\s.-]?play|mini[\s.-]?album)\b/i,
  single: /\b(single|7")\b/i,
  compilation: /\b(compilation|comp|greatest[\s.-]?hits|best[\s.-]?of|collection|anthology)\b/i,
  soundtrack: /\b(ost|o\.s\.t\.|soundtrack|score|motion[\s.-]?picture)\b/i,
  live: /\b(live|concert|unplugged|mtv[\s.-]?unplugged|in[\s.-]?concert|at[\s.-]?the)\b/i,
  remix: /\b(remix(?:es|ed)?|remixed|re[\s.-]?mix)\b/i,
  bootleg: /\b(bootleg|boot|unofficial)\b/i,
  interview: /\b(interview|spoken[\s.-]?word)\b/i,
  mixtape: /\b(mixtape|mix[\s.-]?tape)\b/i,
  demo: /\b(demo|demos|demo[\s.-]?tape)\b/i,

  // Special editions
  deluxe: /\b(deluxe|deluxe[\s.-]?edition|special[\s.-]?edition)\b/i,
  remastered: /\b(remaster(?:ed)?|anniversary|redux|revisited)\b/i,
  expanded: /\b(expanded|bonus[\s.-]?tracks?|extra[\s.-]?tracks?)\b/i,
};

function detectReleaseType(title: string): MusicReleaseType {
  if (releaseTypePatterns.single.test(title)) return 'Single';
  if (releaseTypePatterns.ep.test(title)) return 'EP';
  if (releaseTypePatterns.soundtrack.test(title)) return 'Soundtrack';
  if (releaseTypePatterns.live.test(title)) return 'Live';
  if (releaseTypePatterns.compilation.test(title)) return 'Compilation';
  if (releaseTypePatterns.remix.test(title)) return 'Remix';
  if (releaseTypePatterns.bootleg.test(title)) return 'Bootleg';
  if (releaseTypePatterns.interview.test(title)) return 'Interview';
  if (releaseTypePatterns.mixtape.test(title)) return 'Mixtape';
  if (releaseTypePatterns.demo.test(title)) return 'Demo';
  if (releaseTypePatterns.album.test(title)) return 'Album';
  return 'Album';  // Default to album
}
```

### Music Release Groups

```typescript
const knownMusicGroups = {
  // Scene Groups
  scene: [
    'FNT', 'FATHEAD', 'CUSTODES', 'mwnd', 'PERFECT', 'YARD',
    'WRE', 'NBFLAC', 'ENSLAVE', 'DeVOiD', '2Eleven', 'VOiCE',
    'MAHOU', 'FLACME', 'cOLDe', 'JLM', 'FWYH', 'AMOK',
  ],

  // P2P Groups
  p2p: [
    'LAME', 'RNS', 'oNePiEcE', 'CMS', 'BCC', 'FRAY',
    'DGN', 'KzT', 'HEIST', 'GBMG', 'SCORN',
  ],

  // WEB Groups
  web: [
    'WEB', 'iTunes', 'Amazon', 'Tidal', 'Qobuz', 'SCENE',
  ],

  // Vinyl Rippers
  vinyl: [
    'DR', 'VinylRip', 'Nautilus', 'vinyl', 'LP',
  ],
};

const musicGroupPatterns = {
  // End of filename: -GROUP
  endDash: /-([A-Za-z0-9_]+)$/,

  // [GROUP] at end
  endBracket: /[\[\(]([A-Za-z0-9_]+)[\]\)]$/,

  // Group name in path/folder
  folderGroup: /\/([A-Za-z0-9_]+)\/[^\/]+$/,
};
```

---

## Movie Parsing

### Movie Release Interface

```typescript
interface ParsedMovieRelease {
  // Movie Info
  movieTitle: string;
  cleanMovieTitle: string;
  year?: number;
  imdbId?: string;
  tmdbId?: number;

  // Quality
  quality: ParsedQuality;

  // Edition
  edition?: MovieEdition;
  editionTags: string[];

  // Collection
  collection?: string;
  collectionPart?: number;

  // 3D
  is3D: boolean;
  threeDFormat?: ThreeDFormat;

  // Languages
  languages: Language[];

  // Release Info
  releaseGroup?: string;
  releaseHash?: string;
  releaseTitle: string;

  // Modifiers
  proper: boolean;
  repack: boolean;
  real: boolean;
  version: number;
}

type MovieEdition =
  | 'Theatrical'
  | 'Directors Cut'
  | 'Extended'
  | 'Unrated'
  | 'Uncut'
  | 'IMAX'
  | 'Remastered'
  | 'Restored'
  | 'Anniversary'
  | 'Special Edition'
  | 'Ultimate Cut'
  | 'Final Cut'
  | 'Redux'
  | 'Criterion'
  | 'Open Matte'
  | 'Fan Edit'
  | 'Hybrid';

type ThreeDFormat = 'SBS' | 'HSBS' | 'OU' | 'HOU' | 'MVC' | 'FS-SBS' | 'Unknown';
```

### Movie Title Patterns

```typescript
const movieTitlePatterns = {
  // Movie.Name.Year.Quality.Source.Codec-Group
  standard: /^(.+?)[\.\s](\d{4})[\.\s](.+?)-([A-Za-z0-9]+)$/,

  // Movie Name (Year) - with parentheses
  withParenYear: /^(.+?)\s*[\[\(](\d{4})[\]\)](?:\s*-\s*|\s+)(.+)$/,

  // Movie.Name.Year.Quality
  noGroup: /^(.+?)[\.\s](\d{4})[\.\s](.+?)$/,

  // Movie Name Year
  basic: /^(.+?)\s+(\d{4})$/,

  // Handle "Name, The" format
  articleAtEnd: /^(.+?),\s*(The|A|An)(?:\s|\.|$)/i,
};

function extractMovieTitle(title: string): { title: string; year?: number } {
  // Try standard format first
  const standardMatch = title.match(movieTitlePatterns.standard);
  if (standardMatch) {
    return {
      title: standardMatch[1].replace(/\./g, ' ').trim(),
      year: parseInt(standardMatch[2], 10),
    };
  }

  // Try parentheses year format
  const parenMatch = title.match(movieTitlePatterns.withParenYear);
  if (parenMatch) {
    return {
      title: parenMatch[1].trim(),
      year: parseInt(parenMatch[2], 10),
    };
  }

  // Basic extraction
  const basicMatch = title.match(movieTitlePatterns.basic);
  if (basicMatch) {
    return {
      title: basicMatch[1].replace(/\./g, ' ').trim(),
      year: parseInt(basicMatch[2], 10),
    };
  }

  return { title: title.replace(/\./g, ' ').trim() };
}
```

### Movie Edition Detection

```typescript
const movieEditionPatterns = {
  // Director's Cut variations
  directorsCut: /\b(director'?s?[\s.-]?cut|dc)\b/i,

  // Extended/Unrated
  extended: /\b(extended[\s.-]?(?:cut|edition|version)?)\b/i,
  unrated: /\b(unrated[\s.-]?(?:cut|edition|version)?)\b/i,
  uncut: /\b(uncut[\s.-]?(?:version)?)\b/i,

  // IMAX
  imax: /\b(imax[\s.-]?(?:edition)?)\b/i,

  // Theatrical
  theatrical: /\b(theatrical[\s.-]?(?:cut|version|release)?)\b/i,

  // Remaster/Restoration
  remastered: /\b((?:4k[\s.-]?)?remaster(?:ed)?[\s.-]?(?:edition)?)\b/i,
  restored: /\b((?:digitally[\s.-]?)?restored[\s.-]?(?:version)?)\b/i,

  // Anniversary editions
  anniversary: /\b((\d+)(?:th|st|nd|rd)?[\s.-]?anniversary[\s.-]?(?:edition)?)\b/i,

  // Special Edition
  specialEdition: /\b(special[\s.-]?edition|se)\b/i,

  // Ultimate/Final Cut
  ultimateCut: /\b(ultimate[\s.-]?(?:cut|edition))\b/i,
  finalCut: /\b(final[\s.-]?cut)\b/i,

  // Redux
  redux: /\b(redux)\b/i,

  // Criterion
  criterion: /\b(criterion[\s.-]?(?:collection)?)\b/i,

  // Open Matte (full frame version of widescreen films)
  openMatte: /\b(open[\s.-]?matte|full[\s.-]?frame|fullscreen)\b/i,

  // Fan Edit
  fanEdit: /\b(fan[\s.-]?edit|fanedit)\b/i,

  // Hybrid (combining multiple sources)
  hybrid: /\b(hybrid)\b/i,
};

function detectMovieEdition(title: string): { edition?: MovieEdition; tags: string[] } {
  const tags: string[] = [];
  let primaryEdition: MovieEdition | undefined;

  if (movieEditionPatterns.directorsCut.test(title)) {
    tags.push("Director's Cut");
    primaryEdition = primaryEdition || 'Directors Cut';
  }
  if (movieEditionPatterns.extended.test(title)) {
    tags.push('Extended');
    primaryEdition = primaryEdition || 'Extended';
  }
  if (movieEditionPatterns.unrated.test(title)) {
    tags.push('Unrated');
    primaryEdition = primaryEdition || 'Unrated';
  }
  if (movieEditionPatterns.uncut.test(title)) {
    tags.push('Uncut');
    primaryEdition = primaryEdition || 'Uncut';
  }
  if (movieEditionPatterns.imax.test(title)) {
    tags.push('IMAX');
    primaryEdition = primaryEdition || 'IMAX';
  }
  if (movieEditionPatterns.theatrical.test(title)) {
    tags.push('Theatrical');
    primaryEdition = primaryEdition || 'Theatrical';
  }
  if (movieEditionPatterns.remastered.test(title)) {
    tags.push('Remastered');
    primaryEdition = primaryEdition || 'Remastered';
  }
  if (movieEditionPatterns.restored.test(title)) {
    tags.push('Restored');
    primaryEdition = primaryEdition || 'Restored';
  }
  if (movieEditionPatterns.anniversary.test(title)) {
    const match = title.match(movieEditionPatterns.anniversary);
    tags.push(`${match?.[2]}th Anniversary`);
    primaryEdition = primaryEdition || 'Anniversary';
  }
  if (movieEditionPatterns.specialEdition.test(title)) {
    tags.push('Special Edition');
    primaryEdition = primaryEdition || 'Special Edition';
  }
  if (movieEditionPatterns.ultimateCut.test(title)) {
    tags.push('Ultimate Cut');
    primaryEdition = primaryEdition || 'Ultimate Cut';
  }
  if (movieEditionPatterns.finalCut.test(title)) {
    tags.push('Final Cut');
    primaryEdition = primaryEdition || 'Final Cut';
  }
  if (movieEditionPatterns.redux.test(title)) {
    tags.push('Redux');
    primaryEdition = primaryEdition || 'Redux';
  }
  if (movieEditionPatterns.criterion.test(title)) {
    tags.push('Criterion');
    primaryEdition = primaryEdition || 'Criterion';
  }
  if (movieEditionPatterns.openMatte.test(title)) {
    tags.push('Open Matte');
    primaryEdition = primaryEdition || 'Open Matte';
  }
  if (movieEditionPatterns.fanEdit.test(title)) {
    tags.push('Fan Edit');
    primaryEdition = primaryEdition || 'Fan Edit';
  }
  if (movieEditionPatterns.hybrid.test(title)) {
    tags.push('Hybrid');
    primaryEdition = primaryEdition || 'Hybrid';
  }

  return { edition: primaryEdition, tags };
}
```

### Movie Collection Detection

```typescript
const collectionPatterns = {
  // Movie Name (Year) [Collection Name]
  bracketCollection: /[\[\(](.*?(?:collection|trilogy|saga|series|franchise|boxset|box[\s.-]?set))[\]\)]/i,

  // Part of series indicators
  partNumber: /\b(?:part|vol(?:ume)?|chapter)[\s.-]*(\d+|[ivxlc]+)\b/i,

  // Numbered sequels: Movie 2, Movie II, Movie: Part Two
  sequelNumber: /[\s.-](\d+|[ivxlc]+|two|three|four|five|six|seven|eight|nine|ten)(?:[\s.-]|$)/i,

  // Common collection names
  knownCollections: /\b(marvel|mcu|dceu|star[\s.-]?wars|harry[\s.-]?potter|lord[\s.-]?of[\s.-]?the[\s.-]?rings|hobbit|matrix|john[\s.-]?wick|fast[\s.-]?(?:and[\s.-]?)?furious|mission[\s.-]?impossible|james[\s.-]?bond|007|jurassic|terminator|alien|predator|pirates|transformers|avengers|x[\s.-]?men)\b/i,
};

function detectCollection(title: string): { collection?: string; part?: number } {
  const bracketMatch = title.match(collectionPatterns.bracketCollection);
  if (bracketMatch) {
    return { collection: bracketMatch[1].trim() };
  }

  const knownMatch = title.match(collectionPatterns.knownCollections);
  if (knownMatch) {
    const partMatch = title.match(collectionPatterns.partNumber);
    return {
      collection: knownMatch[1],
      part: partMatch ? parseSequelNumber(partMatch[1]) : undefined,
    };
  }

  return {};
}

function parseSequelNumber(num: string): number {
  // Roman numerals
  const romanMap: Record<string, number> = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
  };
  const lower = num.toLowerCase();
  if (romanMap[lower]) return romanMap[lower];

  // Word numbers
  const wordMap: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  };
  if (wordMap[lower]) return wordMap[lower];

  // Numeric
  return parseInt(num, 10) || 1;
}
```

### Movie 3D Detection

```typescript
const movie3DPatterns = {
  // General 3D indicator
  general3D: /\b(3d)\b/i,

  // Side-by-Side formats
  sbs: /\b(sbs|side[\s.-]?by[\s.-]?side)\b/i,
  halfSbs: /\b(h[\s.-]?sbs|half[\s.-]?sbs|hsbs)\b/i,
  fullSbs: /\b(f[\s.-]?sbs|full[\s.-]?sbs|fs[\s.-]?sbs)\b/i,

  // Over-Under formats
  ou: /\b(ou|over[\s.-]?under|tab|top[\s.-]?(?:and[\s.-]?)?bottom)\b/i,
  halfOu: /\b(h[\s.-]?ou|half[\s.-]?ou|hou)\b/i,

  // MVC (Multiview Video Coding - Blu-ray 3D native)
  mvc: /\b(mvc|bd3d|bluray[\s.-]?3d)\b/i,

  // Anaglyph (red-cyan glasses)
  anaglyph: /\b(anaglyph|red[\s.-]?cyan)\b/i,

  // Frame-packed
  framePacked: /\b(frame[\s.-]?pack(?:ed)?|fp)\b/i,
};

function detect3DFormat(title: string): { is3D: boolean; format?: ThreeDFormat } {
  if (!movie3DPatterns.general3D.test(title)) {
    return { is3D: false };
  }

  if (movie3DPatterns.mvc.test(title)) {
    return { is3D: true, format: 'MVC' };
  }
  if (movie3DPatterns.fullSbs.test(title)) {
    return { is3D: true, format: 'FS-SBS' };
  }
  if (movie3DPatterns.halfSbs.test(title) || movie3DPatterns.sbs.test(title)) {
    return { is3D: true, format: 'HSBS' };
  }
  if (movie3DPatterns.halfOu.test(title) || movie3DPatterns.ou.test(title)) {
    return { is3D: true, format: 'HOU' };
  }

  return { is3D: true, format: 'Unknown' };
}
```

### Movie Release Groups

```typescript
const knownMovieGroups = {
  // Scene Groups (Movies)
  scene: [
    'SPARKS', 'GECKOS', 'AMIABLE', 'ROVERS', 'FGT', 'BLOW',
    'COCAIN', 'PSYCHD', 'DRONES', 'LOST', 'VETO', 'FLAME',
    'REGRET', 'WARHD', 'SWTYBLZ', 'YTS', 'EVO', 'RARBG',
  ],

  // P2P Groups (High Quality)
  p2p: [
    'FraMeSToR', 'EPSiLON', 'FGT', 'TERMINAL', 'FLUX', 'CMRG',
    'TEPES', 'EDITH', 'SMURF', 'RUSTED', 'BYNDR', 'MZABI',
    'NOGRP', 'playWEB', 'HONE', 'APEX', 'KOGi', 'SiGMA',
  ],

  // Remux Groups
  remux: [
    'FraMeSToR', 'EPSiLON', 'BAKED', 'NCmt', 'decibeL', 'playBD',
    'HiFi', 'W4NK3R', 'BMF', 'LEGi0N', 'SURFINBIRD',
  ],

  // Encode Groups
  encode: [
    'SPARKS', 'TayTO', 'GECKOS', 'DRONES', 'SiGMA', 'D-Z0N3',
    'FLAME', 'WARHD', 'DON', 'EA', 'VietHD', 'HiDt',
  ],

  // WEB Groups
  web: [
    'NTb', 'CMRG', 'EDITH', 'SiGMA', 'HONE', 'SMURF',
    'TEPES', 'PECULATE', 'T6D', 'LAZY', 'WELP', 'TOMMY',
  ],

  // 4K/UHD Groups
  uhd: [
    'FraMeSToR', 'EPSiLON', 'BeyondHD', 'HQMUX', 'SURFINBIRD',
    'BAKED', 'FLUX', 'W4NK3R', 'SPHD', 'AWSM', 'SRVB',
  ],
};
```

---

## Extended Anime Parsing

### Extended Anime Release Interface

```typescript
interface ParsedAnimeRelease extends ParsedRelease {
  // Anime-specific fields
  fansubGroup?: string;
  videoSource?: AnimeSource;
  audioTracks: AnimeAudioTrack[];
  subtitleTracks: AnimeSubtitleTrack[];

  // Batch release
  isBatchRelease: boolean;
  batchRange?: { start: number; end: number };

  // Season pack
  isSeasonPack: boolean;
  seasonPackInfo?: {
    season: number;
    cour?: number;  // 1st cour, 2nd cour
  };

  // Version
  version: number;

  // CRC32 hash
  crc32?: string;
}

interface AnimeAudioTrack {
  language: string;
  codec?: string;
  channels?: string;
  isDefault?: boolean;
}

interface AnimeSubtitleTrack {
  language: string;
  format?: 'ASS' | 'SRT' | 'PGS' | 'VOBSUB';
  isDefault?: boolean;
  isForced?: boolean;
  fansubGroup?: string;
}

type AnimeSource = 'TV' | 'BD' | 'DVD' | 'WEB' | 'Laserdisc' | 'VHS' | 'Unknown';
```

### Extended Fansub Group Patterns

```typescript
const fansubGroupPatterns = {
  // [Group] at start - most common
  startBracket: /^\[([^\]]+)\]/,

  // (Group) at start - less common
  startParen: /^\(([^)]+)\)/,

  // {Group} at start - rare
  startBrace: /^\{([^}]+)\}/,

  // Group at end before hash
  endBeforeHash: /[\s.-]([A-Za-z0-9-]+)[\s.-][\[\(][0-9A-Fa-f]{8}[\]\)]/,
};

const knownFansubGroups = {
  // Major active groups
  active: [
    'SubsPlease', 'Erai-raws', 'EMBER', 'Judas', 'ASW',
    'Anime Time', 'Golumpa', 'Nep_Blanc', 'Cleo', 'YuiSubs',
    'LostYears', 'Drag', 'Setsugen', 'Commie', 'GJM',
    'Kaleido-subs', 'Underwater', 'Vivid', 'FFF', 'Mezashite',
    'PAS', 'Asenshi', 'Doki', 'Chihiro', 'UTW', 'WhyNot',
    'Coalgirls', 'Cman', 'DDY', 'Moozzi2', 'VCB-Studio',
  ],

  // Historical/inactive groups (still have releases)
  historical: [
    'HorribleSubs', 'Leopard-Raws', 'Ohys-Raws', 'Kira-Fansub',
    'gg', 'Hadena', 'THORA', 'DOKI', 'Mazui', 'Nutbladder',
    'Tsundere', 'Frostii', 'Hiryuu', 'SHiN-gx', 'Zurako',
    'Anime-Koi', 'Anime-Rans', 'Anime-Tenshi', 'AniYoshi',
    'BSS', 'CMS', 'CTR', 'DB', 'Eclipse', 'Elysium',
    'Hatsuyuki', 'HQR', 'Interrobang', 'm.3.3.w', 'Nishi-Taku',
    'Ryuumaru', 'Saizen', 'SallySubs', 'Static-Subs', 'TakaJun',
  ],

  // Raw providers
  raw: [
    'SubsPlease', 'Erai-raws', 'Leopard-Raws', 'Ohys-Raws',
    'NC-Raws', 'ANK-Raws', 'CASO', 'Skymedia', 'U3-Project',
  ],

  // BD/DVD groups (specialize in disc releases)
  bdGroups: [
    'VCB-Studio', 'Moozzi2', 'Coalgirls', 'Beatrice-Raws',
    'UCCUSS', 'SCY', 'kawaiika-raws', 'ANE', 'JPBD',
    'yurasyk', 'reinforce', 'E-AC-3', 'YYDM-11FANS',
  ],
};
```

### Batch Release Detection

```typescript
const batchPatterns = {
  // Episode range: 01-12, 01-24, 01~12
  episodeRange: /\b(\d{2,4})[\s.-]*(?:-|~|to)[\s.-]*(\d{2,4})\b/,

  // Batch indicator words
  batchKeywords: /\b(batch|complete|full[\s.-]?series?|all[\s.-]?episodes?)\b/i,

  // Season Complete: S01 Complete, Season 1 Complete
  seasonComplete: /\bS(?:eason)?[\s.-]*(\d{1,2})[\s.-]*(?:complete|batch)\b/i,

  // Vol/Volume batch: Vol.1-6
  volumeBatch: /\bVol(?:ume)?\.?[\s.-]*(\d+)[\s.-]*(?:-|~|to)[\s.-]*(\d+)\b/i,

  // DVD/BD batch: DVD 1-4, BD 1-6
  discBatch: /\b(?:DVD|BD|Blu-?ray)[\s.-]*(\d+)[\s.-]*(?:-|~|to)[\s.-]*(\d+)\b/i,

  // Episode count: (12 eps), [24eps]
  episodeCount: /[\[\(](\d+)[\s.-]*(?:eps?|episodes?)[\]\)]/i,
};

function detectBatchRelease(title: string): {
  isBatch: boolean;
  range?: { start: number; end: number };
  episodeCount?: number;
} {
  // Check for batch keywords
  if (batchPatterns.batchKeywords.test(title)) {
    const rangeMatch = title.match(batchPatterns.episodeRange);
    if (rangeMatch) {
      return {
        isBatch: true,
        range: {
          start: parseInt(rangeMatch[1], 10),
          end: parseInt(rangeMatch[2], 10),
        },
      };
    }
    return { isBatch: true };
  }

  // Check for episode range
  const rangeMatch = title.match(batchPatterns.episodeRange);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    // Only consider it a batch if range is reasonable (not timestamps, etc.)
    if (end > start && end - start <= 100) {
      return {
        isBatch: true,
        range: { start, end },
        episodeCount: end - start + 1,
      };
    }
  }

  // Check for episode count
  const countMatch = title.match(batchPatterns.episodeCount);
  if (countMatch) {
    return {
      isBatch: true,
      episodeCount: parseInt(countMatch[1], 10),
    };
  }

  return { isBatch: false };
}
```

### Season Pack Detection

```typescript
const seasonPackPatterns = {
  // S01 Complete, Season 1 Complete
  seasonComplete: /\bS(?:eason)?[\s.-]*(\d{1,2})[\s.-]*(?:complete|pack|batch|full)\b/i,

  // Complete Season 1
  completeSeasonPrefix: /\b(?:complete|full)[\s.-]*(?:season|s)[\s.-]*(\d{1,2})\b/i,

  // Season 1-2, S01-S02
  multiSeason: /\bS(?:eason)?[\s.-]*(\d{1,2})[\s.-]*(?:-|to|~)[\s.-]*S?(\d{1,2})\b/i,

  // Cour indicators: 1st Cour, 2nd Cour, Part 1, Part 2
  cour: /\b(\d)(?:st|nd|rd|th)?[\s.-]*(?:cour|part|season)\b/i,

  // Split cour: Season 1 Part 2
  splitCour: /\bS(?:eason)?[\s.-]*(\d{1,2})[\s.-]*(?:Part|Cour)[\s.-]*(\d{1,2})\b/i,

  // Series Complete
  seriesComplete: /\b(?:complete|full)[\s.-]*series\b/i,

  // All Seasons
  allSeasons: /\b(?:all[\s.-]*seasons?|seasons?[\s.-]*\d+[\s.-]*-[\s.-]*\d+)\b/i,
};

function detectSeasonPack(title: string): {
  isSeasonPack: boolean;
  season?: number;
  cour?: number;
  isComplete?: boolean;
} {
  // Check for season complete patterns
  const completeMatch = title.match(seasonPackPatterns.seasonComplete) ||
                        title.match(seasonPackPatterns.completeSeasonPrefix);
  if (completeMatch) {
    const courMatch = title.match(seasonPackPatterns.cour);
    return {
      isSeasonPack: true,
      season: parseInt(completeMatch[1], 10),
      cour: courMatch ? parseInt(courMatch[1], 10) : undefined,
    };
  }

  // Check for split cour
  const splitMatch = title.match(seasonPackPatterns.splitCour);
  if (splitMatch) {
    return {
      isSeasonPack: true,
      season: parseInt(splitMatch[1], 10),
      cour: parseInt(splitMatch[2], 10),
    };
  }

  // Check for multi-season
  const multiMatch = title.match(seasonPackPatterns.multiSeason);
  if (multiMatch) {
    return {
      isSeasonPack: true,
      season: parseInt(multiMatch[1], 10),
      isComplete: false,
    };
  }

  // Check for series complete
  if (seasonPackPatterns.seriesComplete.test(title)) {
    return {
      isSeasonPack: true,
      isComplete: true,
    };
  }

  return { isSeasonPack: false };
}
```

### Anime Version Detection

```typescript
const animeVersionPatterns = {
  // v2, v3, etc. - common revision indicator
  versionNumber: /v(\d+)/i,

  // Version 2, Ver. 2
  versionWord: /\b(?:version|ver\.?)[\s.-]*(\d+)\b/i,

  // Revised, Fixed
  revisionKeywords: /\b(revised|fixed|corrected|v\d[\s.-]?fix)\b/i,

  // Batch v2 (batch release revision)
  batchVersion: /\bbatch[\s.-]*v(\d+)\b/i,
};

function detectAnimeVersion(title: string): number {
  // Check explicit version number
  const vMatch = title.match(animeVersionPatterns.versionNumber);
  if (vMatch) {
    return parseInt(vMatch[1], 10);
  }

  // Check version word
  const versionWordMatch = title.match(animeVersionPatterns.versionWord);
  if (versionWordMatch) {
    return parseInt(versionWordMatch[1], 10);
  }

  // Check batch version
  const batchMatch = title.match(animeVersionPatterns.batchVersion);
  if (batchMatch) {
    return parseInt(batchMatch[1], 10);
  }

  // Check revision keywords (implies v2)
  if (animeVersionPatterns.revisionKeywords.test(title)) {
    return 2;
  }

  return 1;  // Default version
}
```

### Anime Source Detection

```typescript
const animeSourcePatterns = {
  // Blu-ray source
  bluray: /\b(bd|blu[\s.-]?ray|bdremux|bdrip)\b/i,

  // DVD source
  dvd: /\b(dvd|dvdrip|dvd[\s.-]?remux)\b/i,

  // TV broadcast
  tv: /\b(tv[\s.-]?rip|hdtv|tv)\b/i,

  // Web source
  web: /\b(web[\s.-]?dl|webrip|cr|crunchyroll|funimation|hidive|wakanim|adn|netflix|amazon)\b/i,

  // Laserdisc
  laserdisc: /\b(ld|laserdisc|laser[\s.-]?disc)\b/i,

  // VHS
  vhs: /\b(vhs|video[\s.-]?tape)\b/i,

  // Re-encoded indicators
  reEncode: /\b(re[\s.-]?encode|dual[\s.-]?audio|multi[\s.-]?audio)\b/i,
};

const animeSourceQuality = {
  'BD': 100,
  'DVD': 70,
  'WEB': 80,
  'TV': 60,
  'Laserdisc': 50,
  'VHS': 30,
  'Unknown': 0,
};

function detectAnimeSource(title: string): AnimeSource {
  if (animeSourcePatterns.bluray.test(title)) return 'BD';
  if (animeSourcePatterns.web.test(title)) return 'WEB';
  if (animeSourcePatterns.dvd.test(title)) return 'DVD';
  if (animeSourcePatterns.tv.test(title)) return 'TV';
  if (animeSourcePatterns.laserdisc.test(title)) return 'Laserdisc';
  if (animeSourcePatterns.vhs.test(title)) return 'VHS';
  return 'Unknown';
}
```

### Anime Audio/Subtitle Track Detection

```typescript
const animeTrackPatterns = {
  // Dual Audio indicator
  dualAudio: /\b(dual[\s.-]?audio|ja[\s.-]?en|en[\s.-]?ja)\b/i,

  // Multi-audio
  multiAudio: /\b(multi[\s.-]?audio|multiple[\s.-]?audio)\b/i,

  // Japanese audio
  japaneseAudio: /\b(jpn?[\s.-]?audio|japanese[\s.-]?audio|ja)\b/i,

  // English audio
  englishAudio: /\b(eng?[\s.-]?audio|english[\s.-]?audio|dub(?:bed)?)\b/i,

  // Subtitle indicators
  softSub: /\b(softsub|soft[\s.-]?sub|external[\s.-]?sub)\b/i,
  hardSub: /\b(hardsub|hard[\s.-]?sub|hc)\b/i,

  // Subtitle languages
  engSub: /\b(eng[\s.-]?sub|english[\s.-]?sub|engsub)\b/i,
  multiSub: /\b(multi[\s.-]?sub|multiple[\s.-]?sub)\b/i,

  // Subtitle format
  assSub: /\b(ass|ssa|styled[\s.-]?sub)\b/i,
  srtSub: /\b(srt|subrip)\b/i,
  pgsSub: /\b(pgs|sup|bd[\s.-]?sub)\b/i,
};

function detectAnimeTracks(title: string): {
  audioTracks: AnimeAudioTrack[];
  subtitleTracks: AnimeSubtitleTrack[];
} {
  const audioTracks: AnimeAudioTrack[] = [];
  const subtitleTracks: AnimeSubtitleTrack[] = [];

  // Detect audio tracks
  if (animeTrackPatterns.dualAudio.test(title)) {
    audioTracks.push({ language: 'Japanese', isDefault: true });
    audioTracks.push({ language: 'English' });
  } else if (animeTrackPatterns.multiAudio.test(title)) {
    audioTracks.push({ language: 'Japanese', isDefault: true });
    audioTracks.push({ language: 'English' });
    audioTracks.push({ language: 'Other' });
  } else if (animeTrackPatterns.englishAudio.test(title)) {
    audioTracks.push({ language: 'English', isDefault: true });
  } else {
    // Default to Japanese
    audioTracks.push({ language: 'Japanese', isDefault: true });
  }

  // Detect subtitle tracks
  if (animeTrackPatterns.multiSub.test(title)) {
    subtitleTracks.push({ language: 'English', isDefault: true });
    subtitleTracks.push({ language: 'Multiple' });
  } else if (animeTrackPatterns.engSub.test(title)) {
    subtitleTracks.push({ language: 'English', isDefault: true });
  }

  // Detect subtitle format
  if (animeTrackPatterns.assSub.test(title) && subtitleTracks.length > 0) {
    subtitleTracks[0].format = 'ASS';
  } else if (animeTrackPatterns.pgsSub.test(title) && subtitleTracks.length > 0) {
    subtitleTracks[0].format = 'PGS';
  }

  // Detect hardcoded subs
  if (animeTrackPatterns.hardSub.test(title)) {
    subtitleTracks.push({ language: 'Hardcoded', isDefault: true });
  }

  return { audioTracks, subtitleTracks };
}
```

---

## Test Cases

### Standard Episodes

```typescript
const standardTests = [
  {
    input: 'The.Walking.Dead.S11E08.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb',
    expected: {
      seriesTitle: 'The Walking Dead',
      seasonNumber: 11,
      episodeNumbers: [8],
      quality: { resolution: 1080, source: 'WEB-DL' },
      releaseGroup: 'NTb',
    },
  },
  {
    input: 'Game of Thrones - S08E06 - The Iron Throne [1080p BluRay x264]',
    expected: {
      seriesTitle: 'Game of Thrones',
      seasonNumber: 8,
      episodeNumbers: [6],
      quality: { resolution: 1080, source: 'bluray' },
    },
  },
  {
    input: 'Breaking.Bad.S05E16.Felina.720p.BluRay.x264-DEMAND',
    expected: {
      seriesTitle: 'Breaking Bad',
      seasonNumber: 5,
      episodeNumbers: [16],
      quality: { resolution: 720, source: 'bluray' },
      releaseGroup: 'DEMAND',
    },
  },
];
```

### Multi-Episode

```typescript
const multiEpisodeTests = [
  {
    input: 'Stranger.Things.S04E01E02.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-TEPES',
    expected: {
      seriesTitle: 'Stranger Things',
      seasonNumber: 4,
      episodeNumbers: [1, 2],
      quality: { resolution: 1080, source: 'WEB-DL' },
    },
  },
  {
    input: 'The Office S02E01-E03 720p HDTV x264',
    expected: {
      seriesTitle: 'The Office',
      seasonNumber: 2,
      episodeNumbers: [1, 2, 3],
    },
  },
];
```

### Daily Shows

```typescript
const dailyTests = [
  {
    input: 'The.Daily.Show.2023.01.15.720p.WEB.h264-KOGi',
    expected: {
      seriesTitle: 'The Daily Show',
      airDate: '2023-01-15',
      isDaily: true,
    },
  },
  {
    input: 'Conan.2022.12.25.Guest.Name.480p.HDTV.x264',
    expected: {
      seriesTitle: 'Conan',
      airDate: '2022-12-25',
      isDaily: true,
    },
  },
];
```

### Anime

```typescript
const animeTests = [
  {
    input: '[SubsPlease] Demon Slayer - Kimetsu no Yaiba - 43 (1080p) [ABCD1234]',
    expected: {
      seriesTitle: 'Demon Slayer - Kimetsu no Yaiba',
      absoluteEpisodeNumbers: [43],
      releaseGroup: 'SubsPlease',
      releaseHash: 'ABCD1234',
    },
  },
  {
    input: '[Erai-raws] One Piece - 1047 [1080p][Multiple Subtitle]',
    expected: {
      seriesTitle: 'One Piece',
      absoluteEpisodeNumbers: [1047],
      releaseGroup: 'Erai-raws',
    },
  },
];
```

### Quality Edge Cases

```typescript
const qualityTests = [
  {
    input: 'Movie.Name.2023.2160p.UHD.BluRay.Remux.HDR.HEVC.TrueHD.7.1.Atmos',
    expected: {
      quality: {
        resolution: 2160,
        source: 'bluray',
        modifier: 'remux',
      },
      hdr: true,
      codec: 'HEVC',
      audio: 'TrueHD Atmos 7.1',
    },
  },
  {
    input: 'Series.S01E01.PROPER.720p.HDTV.x264-GROUP',
    expected: {
      proper: true,
      quality: { resolution: 720, source: 'television' },
    },
  },
  {
    input: 'Show.S02E05.REPACK.1080p.WEB-DL.DD5.1.H.264-GROUP',
    expected: {
      repack: true,
      quality: { resolution: 1080, source: 'WEB-DL' },
    },
  },
];
```

### Language Edge Cases

```typescript
const languageTests = [
  {
    input: 'Movie.2023.MULTi.1080p.BluRay.x264',
    expected: {
      languages: ['multi'],
    },
  },
  {
    input: 'Serie.S01.GERMAN.DL.1080p.WEB.x264',
    expected: {
      languages: ['german', 'english'],  // DL = Dual Language
    },
  },
  {
    input: 'Film.2023.FRENCH.1080p.BluRay.x264-GROUP',
    expected: {
      languages: ['french'],
    },
  },
];
```

### Music Release Tests

```typescript
const musicTests = [
  // Standard Album Format
  {
    input: 'Pink Floyd - The Dark Side of the Moon (1973) [FLAC]',
    expected: {
      artistName: 'Pink Floyd',
      albumTitle: 'The Dark Side of the Moon',
      year: 1973,
      audioFormat: 'FLAC',
      releaseType: 'Album',
    },
  },
  {
    input: 'Radiohead - OK Computer (1997) [MP3 320]',
    expected: {
      artistName: 'Radiohead',
      albumTitle: 'OK Computer',
      year: 1997,
      audioFormat: 'MP3',
      bitrate: 320,
      bitrateMode: 'CBR',
    },
  },
  {
    input: 'Daft Punk - Random Access Memories (2013) [FLAC 24bit 96kHz]',
    expected: {
      artistName: 'Daft Punk',
      albumTitle: 'Random Access Memories',
      year: 2013,
      audioFormat: 'FLAC',
      bitDepth: 24,
      sampleRate: 96,
    },
  },

  // VBR Quality Tests
  {
    input: 'The Beatles - Abbey Road (1969) [MP3 V0]',
    expected: {
      artistName: 'The Beatles',
      albumTitle: 'Abbey Road',
      year: 1969,
      audioFormat: 'MP3',
      bitrateMode: 'VBR',
      targetBitrate: 245,
    },
  },
  {
    input: 'Led Zeppelin - IV (1971) [MP3 V2]',
    expected: {
      artistName: 'Led Zeppelin',
      albumTitle: 'IV',
      year: 1971,
      audioFormat: 'MP3',
      bitrateMode: 'VBR',
      targetBitrate: 190,
    },
  },

  // Source Detection Tests
  {
    input: 'Nirvana - Nevermind (1991) [FLAC] [CD]',
    expected: {
      artistName: 'Nirvana',
      albumTitle: 'Nevermind',
      year: 1991,
      audioFormat: 'FLAC',
      source: 'CD',
    },
  },
  {
    input: 'Taylor Swift - 1989 (2014) [FLAC] [WEB]',
    expected: {
      artistName: 'Taylor Swift',
      albumTitle: '1989',
      year: 2014,
      audioFormat: 'FLAC',
      source: 'WEB',
    },
  },
  {
    input: 'Miles Davis - Kind of Blue (1959) [FLAC] [Vinyl]',
    expected: {
      artistName: 'Miles Davis',
      albumTitle: 'Kind of Blue',
      year: 1959,
      audioFormat: 'FLAC',
      source: 'Vinyl',
    },
  },

  // Multi-Disc Tests
  {
    input: 'The Who - Tommy (1969) [FLAC] CD1',
    expected: {
      artistName: 'The Who',
      albumTitle: 'Tommy',
      discNumber: 1,
    },
  },
  {
    input: 'Queen - Greatest Hits (1981) [MP3 320] Disc 2 of 3',
    expected: {
      artistName: 'Queen',
      albumTitle: 'Greatest Hits',
      discNumber: 2,
      discCount: 3,
    },
  },

  // Release Type Tests
  {
    input: 'Gorillaz - Feel Good Inc (2005) [MP3 320] [Single]',
    expected: {
      artistName: 'Gorillaz',
      albumTitle: 'Feel Good Inc',
      releaseType: 'Single',
    },
  },
  {
    input: 'Arcade Fire - Her OST (2013) [FLAC]',
    expected: {
      artistName: 'Arcade Fire',
      albumTitle: 'Her OST',
      releaseType: 'Soundtrack',
    },
  },
  {
    input: 'Fleetwood Mac - Live in Boston (2004) [FLAC]',
    expected: {
      artistName: 'Fleetwood Mac',
      albumTitle: 'Live in Boston',
      releaseType: 'Live',
    },
  },
  {
    input: 'Various Artists - Guardians of the Galaxy Soundtrack (2014) [FLAC]',
    expected: {
      artistName: 'Various Artists',
      albumTitle: 'Guardians of the Galaxy Soundtrack',
      releaseType: 'Soundtrack',
    },
  },

  // Special Formats
  {
    input: 'Tool - Fear Inoculum (2019) [DSD256]',
    expected: {
      artistName: 'Tool',
      albumTitle: 'Fear Inoculum',
      audioFormat: 'DSD',
    },
  },
  {
    input: 'Adele - 30 (2021) [ALAC]',
    expected: {
      artistName: 'Adele',
      albumTitle: '30',
      audioFormat: 'ALAC',
    },
  },

  // Release Group Tests
  {
    input: 'Arctic Monkeys - AM (2013) [MP3 320]-PERFECT',
    expected: {
      artistName: 'Arctic Monkeys',
      albumTitle: 'AM',
      releaseGroup: 'PERFECT',
    },
  },

  // Remastered/Special Edition Tests
  {
    input: 'David Bowie - Hunky Dory (1971) [FLAC] [2015 Remaster]',
    expected: {
      artistName: 'David Bowie',
      albumTitle: 'Hunky Dory',
      year: 1971,
      remastered: true,
    },
  },
  {
    input: 'Michael Jackson - Thriller (1982) [FLAC] [Deluxe Edition]',
    expected: {
      artistName: 'Michael Jackson',
      albumTitle: 'Thriller',
      deluxe: true,
    },
  },
];
```

### Movie Release Tests

```typescript
const movieTests = [
  // Standard Movie Format
  {
    input: 'The.Matrix.1999.1080p.BluRay.x264-GROUP',
    expected: {
      movieTitle: 'The Matrix',
      year: 1999,
      quality: { resolution: 1080, source: 'bluray' },
      releaseGroup: 'GROUP',
    },
  },
  {
    input: 'Inception.2010.2160p.UHD.BluRay.Remux.HDR.HEVC.TrueHD.7.1.Atmos-FraMeSToR',
    expected: {
      movieTitle: 'Inception',
      year: 2010,
      quality: { resolution: 2160, source: 'bluray', modifier: 'remux' },
      hdr: true,
      releaseGroup: 'FraMeSToR',
    },
  },

  // Edition Detection Tests
  {
    input: 'Blade.Runner.1982.Final.Cut.2160p.UHD.BluRay.x265-TERMINAL',
    expected: {
      movieTitle: 'Blade Runner',
      year: 1982,
      edition: 'Final Cut',
      editionTags: ['Final Cut'],
    },
  },
  {
    input: 'The.Lord.of.the.Rings.The.Return.of.the.King.2003.Extended.Edition.1080p.BluRay.x264',
    expected: {
      movieTitle: 'The Lord of the Rings The Return of the King',
      year: 2003,
      edition: 'Extended',
      editionTags: ['Extended'],
    },
  },
  {
    input: 'Apocalypse.Now.1979.Redux.1080p.BluRay.x264-SPARKS',
    expected: {
      movieTitle: 'Apocalypse Now',
      year: 1979,
      edition: 'Redux',
      editionTags: ['Redux'],
    },
  },
  {
    input: 'Batman.v.Superman.Dawn.of.Justice.2016.Ultimate.Edition.IMAX.1080p.BluRay.x264',
    expected: {
      movieTitle: 'Batman v Superman Dawn of Justice',
      year: 2016,
      edition: 'Ultimate Cut',
      editionTags: ['Ultimate Cut', 'IMAX'],
    },
  },
  {
    input: 'Alien.1979.Directors.Cut.1080p.BluRay.x264-GROUP',
    expected: {
      movieTitle: 'Alien',
      year: 1979,
      edition: 'Directors Cut',
      editionTags: ["Director's Cut"],
    },
  },
  {
    input: 'E.T.The.Extra.Terrestrial.1982.20th.Anniversary.Edition.1080p.BluRay.x264',
    expected: {
      movieTitle: 'E T The Extra Terrestrial',
      year: 1982,
      edition: 'Anniversary',
      editionTags: ['20th Anniversary'],
    },
  },
  {
    input: 'Seven.Samurai.1954.Criterion.Collection.1080p.BluRay.x264',
    expected: {
      movieTitle: 'Seven Samurai',
      year: 1954,
      edition: 'Criterion',
      editionTags: ['Criterion'],
    },
  },
  {
    input: 'Terminator.2.Judgment.Day.1991.Theatrical.Cut.1080p.BluRay.x264',
    expected: {
      movieTitle: 'Terminator 2 Judgment Day',
      year: 1991,
      edition: 'Theatrical',
      editionTags: ['Theatrical'],
    },
  },

  // Collection Detection Tests
  {
    input: 'John.Wick.2014.1080p.BluRay.x264-SPARKS [John Wick Collection]',
    expected: {
      movieTitle: 'John Wick',
      year: 2014,
      collection: 'John Wick Collection',
    },
  },
  {
    input: 'Star.Wars.Episode.IV.A.New.Hope.1977.1080p.BluRay.x264',
    expected: {
      movieTitle: 'Star Wars Episode IV A New Hope',
      year: 1977,
      collection: 'Star Wars',
    },
  },
  {
    input: 'The.Avengers.2012.1080p.BluRay.x264 [MCU]',
    expected: {
      movieTitle: 'The Avengers',
      year: 2012,
      collection: 'Marvel',
    },
  },
  {
    input: 'Harry.Potter.and.the.Philosophers.Stone.2001.1080p.BluRay.x264',
    expected: {
      movieTitle: 'Harry Potter and the Philosophers Stone',
      year: 2001,
      collection: 'Harry Potter',
    },
  },

  // 3D Detection Tests
  {
    input: 'Avatar.2009.3D.1080p.BluRay.HSBS.x264-GROUP',
    expected: {
      movieTitle: 'Avatar',
      year: 2009,
      is3D: true,
      threeDFormat: 'HSBS',
    },
  },
  {
    input: 'Gravity.2013.3D.1080p.BluRay.Half-SBS.x264',
    expected: {
      movieTitle: 'Gravity',
      year: 2013,
      is3D: true,
      threeDFormat: 'HSBS',
    },
  },
  {
    input: 'Pacific.Rim.2013.3D.MVC.1080p.BluRay',
    expected: {
      movieTitle: 'Pacific Rim',
      year: 2013,
      is3D: true,
      threeDFormat: 'MVC',
    },
  },
  {
    input: 'Life.of.Pi.2012.3D.1080p.BluRay.Full-SBS.x264',
    expected: {
      movieTitle: 'Life of Pi',
      year: 2012,
      is3D: true,
      threeDFormat: 'FS-SBS',
    },
  },
  {
    input: 'Tron.Legacy.2010.3D.1080p.BluRay.HOU.x264',
    expected: {
      movieTitle: 'Tron Legacy',
      year: 2010,
      is3D: true,
      threeDFormat: 'HOU',
    },
  },

  // Multiple Editions/Tags
  {
    input: 'Dune.2021.IMAX.Remastered.2160p.UHD.BluRay.x265-FLUX',
    expected: {
      movieTitle: 'Dune',
      year: 2021,
      editionTags: ['IMAX', 'Remastered'],
    },
  },

  // Hybrid Releases
  {
    input: 'The.Godfather.1972.Hybrid.Remastered.1080p.BluRay.x264',
    expected: {
      movieTitle: 'The Godfather',
      year: 1972,
      edition: 'Hybrid',
      editionTags: ['Hybrid', 'Remastered'],
    },
  },

  // Open Matte
  {
    input: 'Jurassic.Park.1993.Open.Matte.1080p.HDTV.x264',
    expected: {
      movieTitle: 'Jurassic Park',
      year: 1993,
      edition: 'Open Matte',
    },
  },
];
```

### Extended Anime Tests

```typescript
const extendedAnimeTests = [
  // Fansub Group Tests
  {
    input: '[VCB-Studio] Violet Evergarden [Ma10p_1080p] [BDRip]',
    expected: {
      seriesTitle: 'Violet Evergarden',
      fansubGroup: 'VCB-Studio',
      videoSource: 'BD',
      quality: { resolution: 1080 },
    },
  },
  {
    input: '[Commie] Psycho-Pass - 11 [BD 1080p AAC] [6B7B4A60]',
    expected: {
      seriesTitle: 'Psycho-Pass',
      absoluteEpisodeNumbers: [11],
      fansubGroup: 'Commie',
      videoSource: 'BD',
      crc32: '6B7B4A60',
    },
  },
  {
    input: '{Moozzi2} Attack on Titan S04 - BD 1080p',
    expected: {
      seriesTitle: 'Attack on Titan',
      seasonNumber: 4,
      fansubGroup: 'Moozzi2',
      videoSource: 'BD',
    },
  },

  // Batch Release Tests
  {
    input: '[SubsPlease] Jujutsu Kaisen - 01-24 (1080p) [Batch]',
    expected: {
      seriesTitle: 'Jujutsu Kaisen',
      isBatchRelease: true,
      batchRange: { start: 1, end: 24 },
      episodeCount: 24,
      fansubGroup: 'SubsPlease',
    },
  },
  {
    input: '[Erai-raws] Demon Slayer - 01~26 [1080p][Complete]',
    expected: {
      seriesTitle: 'Demon Slayer',
      isBatchRelease: true,
      batchRange: { start: 1, end: 26 },
      fansubGroup: 'Erai-raws',
    },
  },
  {
    input: '[EMBER] Chainsaw Man (2022) [BD 1080p HEVC] [Batch]',
    expected: {
      seriesTitle: 'Chainsaw Man',
      year: 2022,
      isBatchRelease: true,
      videoSource: 'BD',
      fansubGroup: 'EMBER',
    },
  },
  {
    input: '[Judas] Spy x Family (Season 1) [1080p][HEVC x265][Full Series]',
    expected: {
      seriesTitle: 'Spy x Family',
      seasonNumber: 1,
      isBatchRelease: true,
      fansubGroup: 'Judas',
    },
  },

  // Season Pack Tests
  {
    input: '[SubsPlease] My Hero Academia S05 Complete (1080p)',
    expected: {
      seriesTitle: 'My Hero Academia',
      seasonNumber: 5,
      isSeasonPack: true,
      fansubGroup: 'SubsPlease',
    },
  },
  {
    input: '[Erai-raws] One Punch Man Season 2 Pack [1080p]',
    expected: {
      seriesTitle: 'One Punch Man',
      seasonNumber: 2,
      isSeasonPack: true,
      fansubGroup: 'Erai-raws',
    },
  },
  {
    input: '[VCB-Studio] Steins;Gate 0 [1080p] [Season 2 Part 1]',
    expected: {
      seriesTitle: 'Steins;Gate 0',
      seasonNumber: 2,
      cour: 1,
      isSeasonPack: true,
      fansubGroup: 'VCB-Studio',
    },
  },
  {
    input: '[Coalgirls] Bakemonogatari [BD 1080p] [1st Cour]',
    expected: {
      seriesTitle: 'Bakemonogatari',
      cour: 1,
      isSeasonPack: true,
      videoSource: 'BD',
    },
  },

  // Version Detection Tests
  {
    input: '[SubsPlease] Bleach - Thousand Year Blood War - 13v2 (1080p)',
    expected: {
      seriesTitle: 'Bleach - Thousand Year Blood War',
      absoluteEpisodeNumbers: [13],
      version: 2,
    },
  },
  {
    input: '[Erai-raws] Blue Lock - 05 [1080p][Fixed][v3]',
    expected: {
      seriesTitle: 'Blue Lock',
      absoluteEpisodeNumbers: [5],
      version: 3,
    },
  },
  {
    input: '[GJM] Vinland Saga - 24 (BD 1080p) [Revised]',
    expected: {
      seriesTitle: 'Vinland Saga',
      absoluteEpisodeNumbers: [24],
      version: 2,
      videoSource: 'BD',
    },
  },

  // Source Detection Tests
  {
    input: '[SubsPlease] Frieren - 01 (1080p) [CR]',
    expected: {
      seriesTitle: 'Frieren',
      absoluteEpisodeNumbers: [1],
      videoSource: 'WEB',
    },
  },
  {
    input: '[Beatrice-Raws] Cowboy Bebop [BDRemux 1080p FLAC]',
    expected: {
      seriesTitle: 'Cowboy Bebop',
      videoSource: 'BD',
      quality: { modifier: 'remux' },
    },
  },
  {
    input: '[JPBD] Neon Genesis Evangelion [DVD 480p]',
    expected: {
      seriesTitle: 'Neon Genesis Evangelion',
      videoSource: 'DVD',
      quality: { resolution: 480 },
    },
  },

  // Audio Track Tests
  {
    input: '[Dual-Audio] Naruto Shippuden - 001-500 [1080p BD]',
    expected: {
      seriesTitle: 'Naruto Shippuden',
      isBatchRelease: true,
      audioTracks: [
        { language: 'Japanese', isDefault: true },
        { language: 'English' },
      ],
    },
  },
  {
    input: '[Multi-Audio] Dragon Ball Z [1080p] [Eng-Jap-Spa]',
    expected: {
      seriesTitle: 'Dragon Ball Z',
      audioTracks: [
        { language: 'Japanese', isDefault: true },
        { language: 'English' },
        { language: 'Other' },
      ],
    },
  },

  // Subtitle Tests
  {
    input: '[ASW] Solo Leveling - 01 [1080p][Multi-Sub]',
    expected: {
      seriesTitle: 'Solo Leveling',
      absoluteEpisodeNumbers: [1],
      subtitleTracks: [
        { language: 'English', isDefault: true },
        { language: 'Multiple' },
      ],
    },
  },
  {
    input: '[Underwater] Fate Zero - 01 [BD 1080p] [Eng-Sub]',
    expected: {
      seriesTitle: 'Fate Zero',
      absoluteEpisodeNumbers: [1],
      subtitleTracks: [
        { language: 'English', isDefault: true },
      ],
    },
  },

  // Historical Group Tests
  {
    input: '[HorribleSubs] One Piece - 900 [1080p]',
    expected: {
      seriesTitle: 'One Piece',
      absoluteEpisodeNumbers: [900],
      fansubGroup: 'HorribleSubs',
    },
  },
  {
    input: '[Coalgirls] Madoka Magica [BD 1080p FLAC]',
    expected: {
      seriesTitle: 'Madoka Magica',
      fansubGroup: 'Coalgirls',
      videoSource: 'BD',
    },
  },

  // Complex Combined Tests
  {
    input: '[VCB-Studio] Made in Abyss [S01+S02+Movies] [Ma10p 1080p HEVC BDRip FLAC] [Batch]',
    expected: {
      seriesTitle: 'Made in Abyss',
      fansubGroup: 'VCB-Studio',
      isBatchRelease: true,
      videoSource: 'BD',
    },
  },
  {
    input: '[Moozzi2] Mobile Suit Gundam Seed [BD 1080p x265 HEVC] [01-50+Specials] [Dual Audio]',
    expected: {
      seriesTitle: 'Mobile Suit Gundam Seed',
      fansubGroup: 'Moozzi2',
      isBatchRelease: true,
      batchRange: { start: 1, end: 50 },
      videoSource: 'BD',
      audioTracks: [
        { language: 'Japanese', isDefault: true },
        { language: 'English' },
      ],
    },
  },
];
```

---

## Implementation Notes

### Performance Considerations

1. **Regex Compilation**: Compile all patterns once at startup
2. **Short-Circuit Evaluation**: Check common patterns first
3. **Caching**: Cache parsed results for frequently queried releases
4. **Lazy Evaluation**: Don't parse fields that aren't needed

### Error Handling

1. **Unknown Quality**: Return `Unknown` quality, don't fail
2. **Ambiguous Episodes**: Try multiple patterns, use most specific match
3. **Missing Info**: Fill with defaults where possible
4. **Invalid Input**: Sanitize input, remove invalid characters

### Matching Strategy

1. **Exact Match**: Title matches exactly after normalization
2. **Fuzzy Match**: Levenshtein distance for minor variations
3. **Alias Match**: Use alternate titles from database
4. **Year Disambiguation**: Use year when multiple series share title

---

*This specification provides the foundation for implementing a compatible release parser. Regular updates are needed as new release patterns emerge from the scene.*
