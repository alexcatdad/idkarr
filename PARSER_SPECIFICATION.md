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
12. [Test Cases](#test-cases)

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
