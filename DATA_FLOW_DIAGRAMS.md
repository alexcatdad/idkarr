# Data Flow Diagrams

## Overview

This document provides detailed data flow and sequence diagrams for key operations in idkarr. These diagrams illustrate how data moves through the system and help developers understand the architecture.

---

## Table of Contents

1. [Add Series Flow](#add-series-flow)
2. [Download Flow](#download-flow)
3. [Import Flow](#import-flow)
4. [Search Flow](#search-flow)
5. [RSS Sync Flow](#rss-sync-flow)
6. [Request Approval Flow](#request-approval-flow)
7. [Real-Time Update Flow](#real-time-update-flow)
8. [Authentication Flow](#authentication-flow)
9. [File Rename Flow](#file-rename-flow)
10. [Metadata Refresh Flow](#metadata-refresh-flow)

---

## Add Series Flow

### Overview

```
User Request → API → TVDB Lookup → Database → Search (optional) → Response
```

### Sequence Diagram

```
┌─────┐     ┌─────────┐     ┌─────────┐     ┌──────┐     ┌────────────┐
│User │     │ Frontend│     │ Backend │     │ TVDB │     │ PostgreSQL │
└──┬──┘     └────┬────┘     └────┬────┘     └───┬──┘     └─────┬──────┘
   │             │               │              │               │
   │ Click "Add  │               │              │               │
   │ Series"     │               │              │               │
   │────────────▶│               │              │               │
   │             │               │              │               │
   │             │ GET /api/v3/  │              │               │
   │             │ series/lookup │              │               │
   │             │ ?term=...     │              │               │
   │             │──────────────▶│              │               │
   │             │               │              │               │
   │             │               │ GET /series/ │               │
   │             │               │ search       │               │
   │             │               │─────────────▶│               │
   │             │               │              │               │
   │             │               │◀─────────────│               │
   │             │               │ Series data  │               │
   │             │               │              │               │
   │             │◀──────────────│              │               │
   │             │ Search results│              │               │
   │             │               │              │               │
   │◀────────────│               │              │               │
   │ Display     │               │              │               │
   │ results     │               │              │               │
   │             │               │              │               │
   │ Select      │               │              │               │
   │ series &    │               │              │               │
   │ options     │               │              │               │
   │────────────▶│               │              │               │
   │             │               │              │               │
   │             │ POST /api/v3/ │              │               │
   │             │ series        │              │               │
   │             │──────────────▶│              │               │
   │             │               │              │               │
   │             │               │ Validate     │               │
   │             │               │ input        │               │
   │             │               │              │               │
   │             │               │ Check if     │               │
   │             │               │ exists       │               │
   │             │               │──────────────┼──────────────▶│
   │             │               │              │               │
   │             │               │◀─────────────┼───────────────│
   │             │               │ Not found    │               │
   │             │               │              │               │
   │             │               │ GET /series/ │               │
   │             │               │ {tvdbId}     │               │
   │             │               │─────────────▶│               │
   │             │               │              │               │
   │             │               │◀─────────────│               │
   │             │               │ Full metadata│               │
   │             │               │              │               │
   │             │               │ Create       │               │
   │             │               │ folder       │               │
   │             │               │              │               │
   │             │               │ Insert       │               │
   │             │               │ series       │               │
   │             │               │──────────────┼──────────────▶│
   │             │               │              │               │
   │             │               │ Insert       │               │
   │             │               │ seasons      │               │
   │             │               │──────────────┼──────────────▶│
   │             │               │              │               │
   │             │               │ Insert       │               │
   │             │               │ episodes     │               │
   │             │               │──────────────┼──────────────▶│
   │             │               │              │               │
   │             │               │◀─────────────┼───────────────│
   │             │               │ Success      │               │
   │             │               │              │               │
   │             │               │ Queue search │               │
   │             │               │ job          │               │
   │             │               │ (if option   │               │
   │             │               │  enabled)    │               │
   │             │               │              │               │
   │             │               │ Broadcast    │               │
   │             │               │ series:added │               │
   │             │               │ via WebSocket│               │
   │             │               │              │               │
   │             │◀──────────────│              │               │
   │             │ 201 Created   │              │               │
   │             │ {series data} │              │               │
   │             │               │              │               │
   │◀────────────│               │              │               │
   │ Show success│               │              │               │
   │             │               │              │               │
```

### Data Flow Details

```typescript
// 1. User initiates search
POST /api/v3/series/lookup
Body: { term: "Breaking Bad" }

// 2. Backend searches TVDB
GET https://api4.thetvdb.com/v4/search?query=Breaking+Bad&type=series

// 3. User selects and configures
POST /api/v3/series
Body: {
  tvdbId: 81189,
  qualityProfileId: 1,
  rootFolderPath: "/media/tv",
  monitored: true,
  seasonFolder: true,
  addOptions: {
    searchForMissingEpisodes: true,
    monitor: "all"
  }
}

// 4. Backend creates series
// - Validate input (Zod)
// - Check series doesn't exist
// - Fetch full metadata from TVDB
// - Create folder structure
// - Insert series record
// - Insert season records
// - Insert episode records
// - Queue search job (optional)
// - Broadcast WebSocket event
// - Return created series
```

---

## Download Flow

### Overview

```
Release Selected → Decision Engine → Download Client → Queue → Import
```

### Sequence Diagram

```
┌─────┐     ┌─────────┐     ┌─────────┐     ┌────────┐     ┌─────────┐
│User │     │ Backend │     │Decision │     │Download│     │ BullMQ  │
│     │     │   API   │     │ Engine  │     │ Client │     │  Queue  │
└──┬──┘     └────┬────┘     └────┬────┘     └───┬────┘     └────┬────┘
   │             │               │              │               │
   │ Click       │               │              │               │
   │ "Download"  │               │              │               │
   │────────────▶│               │              │               │
   │             │               │              │               │
   │             │ POST /release │              │               │
   │             │ {releaseId}   │              │               │
   │             │               │              │               │
   │             │ Parse release │              │               │
   │             │──────────────▶│              │               │
   │             │               │              │               │
   │             │               │ Check quality│               │
   │             │               │ Check customs│               │
   │             │               │ Check blocks │               │
   │             │               │              │               │
   │             │◀──────────────│              │               │
   │             │ Decision:     │              │               │
   │             │ ACCEPT        │              │               │
   │             │               │              │               │
   │             │               │              │               │
   │             │ Send to       │              │               │
   │             │ download      │              │               │
   │             │ client        │              │               │
   │             │──────────────────────────────▶              │
   │             │               │              │               │
   │             │               │              │ Add torrent/ │
   │             │               │              │ NZB          │
   │             │               │              │               │
   │             │◀──────────────────────────────              │
   │             │ Download ID   │              │               │
   │             │               │              │               │
   │             │               │              │               │
   │             │ Insert queue  │              │               │
   │             │ record        │              │               │
   │             │               │              │               │
   │             │ Create track  │              │               │
   │             │ job           │              │               │
   │             │──────────────────────────────────────────────▶
   │             │               │              │               │
   │             │               │              │               │
   │             │ Insert history│              │               │
   │             │ (grabbed)     │              │               │
   │             │               │              │               │
   │             │ Broadcast     │              │               │
   │             │ episode:grabbed│             │               │
   │             │               │              │               │
   │◀────────────│               │              │               │
   │ Success     │               │              │               │
   │             │               │              │               │
```

### Decision Engine Logic

```typescript
// Decision engine evaluation order

interface DecisionResult {
  decision: 'accept' | 'reject';
  reason?: RejectionReason;
  score: number;
}

async function evaluateRelease(
  release: ParsedRelease,
  series: Series,
  episodes: Episode[]
): Promise<DecisionResult> {
  // 1. Check blocklist
  if (await isBlocklisted(release)) {
    return { decision: 'reject', reason: 'blocklist' };
  }

  // 2. Check quality against profile
  const qualityResult = evaluateQuality(release, series.qualityProfile);
  if (!qualityResult.allowed) {
    return { decision: 'reject', reason: 'quality_not_wanted' };
  }

  // 3. Check if upgrade
  const existingFile = await getExistingFile(episodes);
  if (existingFile) {
    if (!series.qualityProfile.upgradeAllowed) {
      return { decision: 'reject', reason: 'upgrade_not_allowed' };
    }
    if (!isUpgrade(release.quality, existingFile.quality)) {
      return { decision: 'reject', reason: 'not_upgrade' };
    }
  }

  // 4. Calculate custom format score
  const formatScore = calculateCustomFormatScore(release, series.qualityProfile);
  if (formatScore < series.qualityProfile.minFormatScore) {
    return { decision: 'reject', reason: 'format_score_too_low' };
  }

  // 5. Check delay profile
  const delay = await calculateDelay(release, series);
  if (delay > 0) {
    return { decision: 'delay', delayMinutes: delay };
  }

  // 6. Check release profile restrictions
  const profileResult = evaluateReleaseProfile(release, series);
  if (!profileResult.allowed) {
    return { decision: 'reject', reason: 'release_profile' };
  }

  return {
    decision: 'accept',
    score: qualityResult.score + formatScore,
  };
}
```

---

## Import Flow

### Overview

```
Download Complete → Scan → Parse → Match → Quality Check → Move/Copy → Update DB
```

### Sequence Diagram

```
┌────────┐     ┌─────────┐     ┌────────┐     ┌──────────┐     ┌───────┐
│Download│     │ Import  │     │ Parser │     │PostgreSQL│     │  Disk │
│Complete│     │ Worker  │     │        │     │          │     │       │
└───┬────┘     └────┬────┘     └───┬────┘     └────┬─────┘     └───┬───┘
    │               │              │               │               │
    │ Download      │              │               │               │
    │ complete      │              │               │               │
    │ event         │              │               │               │
    │──────────────▶│              │               │               │
    │               │              │               │               │
    │               │ Scan         │               │               │
    │               │ download     │               │               │
    │               │ folder       │               │               │
    │               │──────────────┼───────────────┼──────────────▶│
    │               │              │               │               │
    │               │◀─────────────┼───────────────┼───────────────│
    │               │ File list    │               │               │
    │               │              │               │               │
    │               │ Parse        │               │               │
    │               │ filenames    │               │               │
    │               │─────────────▶│               │               │
    │               │              │               │               │
    │               │◀─────────────│               │               │
    │               │ ParsedRelease│               │               │
    │               │              │               │               │
    │               │ Match to     │               │               │
    │               │ series/      │               │               │
    │               │ episodes     │               │               │
    │               │──────────────┼──────────────▶│               │
    │               │              │               │               │
    │               │◀─────────────┼───────────────│               │
    │               │ Matched      │               │               │
    │               │ episodes     │               │               │
    │               │              │               │               │
    │               │ Check        │               │               │
    │               │ quality      │               │               │
    │               │ upgrade      │               │               │
    │               │              │               │               │
    │               │ Extract      │               │               │
    │               │ media info   │               │               │
    │               │──────────────┼───────────────┼──────────────▶│
    │               │              │               │               │
    │               │◀─────────────┼───────────────┼───────────────│
    │               │ MediaInfo    │               │               │
    │               │              │               │               │
    │               │ Generate     │               │               │
    │               │ filename     │               │               │
    │               │              │               │               │
    │               │ Move/Copy    │               │               │
    │               │ file         │               │               │
    │               │──────────────┼───────────────┼──────────────▶│
    │               │              │               │               │
    │               │◀─────────────┼───────────────┼───────────────│
    │               │ Success      │               │               │
    │               │              │               │               │
    │               │ Update DB    │               │               │
    │               │──────────────┼──────────────▶│               │
    │               │              │               │               │
    │               │ Create       │               │               │
    │               │ episode_file │               │               │
    │               │──────────────┼──────────────▶│               │
    │               │              │               │               │
    │               │ Update       │               │               │
    │               │ episode.     │               │               │
    │               │ hasFile      │               │               │
    │               │──────────────┼──────────────▶│               │
    │               │              │               │               │
    │               │ Create       │               │               │
    │               │ history      │               │               │
    │               │──────────────┼──────────────▶│               │
    │               │              │               │               │
    │               │ Remove       │               │               │
    │               │ queue item   │               │               │
    │               │──────────────┼──────────────▶│               │
    │               │              │               │               │
    │               │ Delete old   │               │               │
    │               │ file (if     │               │               │
    │               │ upgrade)     │               │               │
    │               │──────────────┼───────────────┼──────────────▶│
    │               │              │               │               │
    │               │ Broadcast    │               │               │
    │               │ episode:     │               │               │
    │               │ imported     │               │               │
    │               │              │               │               │
```

### Import Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                      Import Decision Tree                        │
└─────────────────────────────────────────────────────────────────┘

Start: File detected in download folder
                    │
                    ▼
            ┌───────────────┐
            │ Is video file?│
            │ (.mkv, .mp4,  │
            │  .avi, etc.)  │
            └───────┬───────┘
                    │
           ┌───────┴───────┐
           │               │
          Yes              No ──────▶ Skip file
           │
           ▼
    ┌───────────────┐
    │ Can parse     │
    │ filename?     │
    └───────┬───────┘
            │
   ┌────────┴────────┐
   │                 │
  Yes                No ──────▶ Manual import required
   │
   ▼
┌───────────────┐
│ Match to      │
│ series?       │
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
  Yes        No ──────▶ Manual import required
   │
   ▼
┌───────────────┐
│ Match to      │
│ episode(s)?   │
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
  Yes        No ──────▶ Manual import required
   │
   ▼
┌───────────────┐
│ Quality       │
│ acceptable?   │
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
  Yes        No ──────▶ Reject (quality)
   │
   ▼
┌───────────────┐
│ Is upgrade or │
│ new file?     │
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
  Yes        No ──────▶ Skip (file exists)
   │
   ▼
┌───────────────┐
│ Import file   │
│ - Move/copy   │
│ - Rename      │
│ - Update DB   │
└───────────────┘
```

---

## Search Flow

### Automatic Search

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│ Search  │     │ Indexer │     │Decision │     │ Download │     │  Queue  │
│ Worker  │     │ Manager │     │ Engine  │     │ Client   │     │         │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬─────┘     └────┬────┘
     │               │               │               │               │
     │ Search for    │               │               │               │
     │ episode       │               │               │               │
     │               │               │               │               │
     │ Build search  │               │               │               │
     │ query         │               │               │               │
     │               │               │               │               │
     │ Query all     │               │               │               │
     │ enabled       │               │               │               │
     │ indexers      │               │               │               │
     │──────────────▶│               │               │               │
     │               │               │               │               │
     │               │ Parallel      │               │               │
     │               │ requests      │               │               │
     │               │ to indexers   │               │               │
     │               │               │               │               │
     │◀──────────────│               │               │               │
     │ Combined      │               │               │               │
     │ results       │               │               │               │
     │               │               │               │               │
     │ Parse all     │               │               │               │
     │ releases      │               │               │               │
     │               │               │               │               │
     │ For each      │               │               │               │
     │ release:      │               │               │               │
     │ evaluate      │               │               │               │
     │──────────────────────────────▶│               │               │
     │               │               │               │               │
     │◀──────────────────────────────│               │               │
     │ Decision      │               │               │               │
     │               │               │               │               │
     │ Sort by       │               │               │               │
     │ score         │               │               │               │
     │               │               │               │               │
     │ Select best   │               │               │               │
     │ release       │               │               │               │
     │               │               │               │               │
     │ Send to       │               │               │               │
     │ download      │               │               │               │
     │ client        │               │               │               │
     │────────────────────────────────────────────────▶              │
     │               │               │               │               │
     │◀────────────────────────────────────────────────              │
     │ Download ID   │               │               │               │
     │               │               │               │               │
     │ Add to        │               │               │               │
     │ queue         │               │               │               │
     │────────────────────────────────────────────────────────────────▶
     │               │               │               │               │
```

### Release Scoring

```typescript
// Release scoring algorithm

interface ScoredRelease {
  release: ParsedRelease;
  score: number;
  breakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  qualityScore: number;
  customFormatScore: number;
  preferredWords: number;
  indexerPriority: number;
  ageScore: number;
  sizeScore: number;
  seedersScore: number;
}

function scoreRelease(
  release: ParsedRelease,
  profile: QualityProfile,
  preferences: SearchPreferences
): ScoredRelease {
  const breakdown: ScoreBreakdown = {
    // Quality weight (1-1000 based on profile position)
    qualityScore: getQualityWeight(release.quality, profile) * 100,

    // Custom format score
    customFormatScore: calculateCustomFormatScore(release, profile),

    // Preferred words (+10 each)
    preferredWords: countPreferredWords(release, preferences) * 10,

    // Indexer priority (higher priority = higher score)
    indexerPriority: (100 - release.indexer.priority),

    // Prefer newer releases (-1 per day old, max -30)
    ageScore: Math.max(-30, -release.ageInDays),

    // Size preference (closer to preferred = higher score)
    sizeScore: calculateSizeScore(release.size, preferences),

    // Seeders for torrents (log scale)
    seedersScore: release.protocol === 'torrent'
      ? Math.min(50, Math.log10(release.seeders + 1) * 20)
      : 0,
  };

  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return {
    release,
    score: totalScore,
    breakdown,
  };
}
```

---

## RSS Sync Flow

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Scheduled │     │ RSS     │     │ Indexers │     │ Decision │
│  Task    │     │ Worker  │     │          │     │ Engine   │
└────┬─────┘     └────┬────┘     └────┬─────┘     └────┬─────┘
     │                │               │               │
     │ Trigger RSS    │               │               │
     │ sync           │               │               │
     │───────────────▶│               │               │
     │                │               │               │
     │                │ For each      │               │
     │                │ indexer:      │               │
     │                │               │               │
     │                │ GET RSS feed  │               │
     │                │──────────────▶│               │
     │                │               │               │
     │                │◀──────────────│               │
     │                │ Recent        │               │
     │                │ releases      │               │
     │                │               │               │
     │                │ Parse each    │               │
     │                │ release       │               │
     │                │               │               │
     │                │ Check if new  │               │
     │                │ (not in       │               │
     │                │ history)      │               │
     │                │               │               │
     │                │ Match to      │               │
     │                │ monitored     │               │
     │                │ series        │               │
     │                │               │               │
     │                │ If match:     │               │
     │                │ evaluate      │               │
     │                │──────────────────────────────▶│
     │                │               │               │
     │                │◀──────────────────────────────│
     │                │ Decision      │               │
     │                │               │               │
     │                │ If accept:    │               │
     │                │ queue         │               │
     │                │ download      │               │
     │                │               │               │
     │◀───────────────│               │               │
     │ Sync complete  │               │               │
     │ {processed: n, │               │               │
     │  grabbed: m}   │               │               │
     │                │               │               │
```

---

## Request Approval Flow

```
┌──────┐     ┌─────────┐     ┌─────────┐     ┌───────┐     ┌──────────┐
│Viewer│     │ Frontend│     │ Backend │     │ Admin │     │PostgreSQL│
└──┬───┘     └────┬────┘     └────┬────┘     └───┬───┘     └────┬─────┘
   │              │               │              │               │
   │ Search for   │               │              │               │
   │ content      │               │              │               │
   │─────────────▶│               │              │               │
   │              │               │              │               │
   │              │ GET /discover │              │               │
   │              │──────────────▶│              │               │
   │              │               │              │               │
   │              │◀──────────────│              │               │
   │              │ Search results│              │               │
   │              │               │              │               │
   │◀─────────────│               │              │               │
   │ Display      │               │              │               │
   │              │               │              │               │
   │ Click        │               │              │               │
   │ "Request"    │               │              │               │
   │─────────────▶│               │              │               │
   │              │               │              │               │
   │              │ POST /request │              │               │
   │              │──────────────▶│              │               │
   │              │               │              │               │
   │              │               │ Check user   │               │
   │              │               │ permissions  │               │
   │              │               │              │               │
   │              │               │ Check        │               │
   │              │               │ request      │               │
   │              │               │ limit        │               │
   │              │               │              │               │
   │              │               │ Check if     │               │
   │              │               │ already      │               │
   │              │               │ exists       │               │
   │              │               │              │               │
   │              │               │ Create       │               │
   │              │               │ request      │               │
   │              │               │──────────────┼──────────────▶│
   │              │               │              │               │
   │              │               │ Notify       │               │
   │              │               │ admins       │               │
   │              │               │─────────────▶│               │
   │              │               │              │               │
   │              │◀──────────────│              │               │
   │              │ Request       │              │               │
   │              │ created       │              │               │
   │              │               │              │               │
   │◀─────────────│               │              │               │
   │ "Pending"    │               │              │               │
   │              │               │              │               │
   │              │               │              │               │
   │              │               │              │ View requests │
   │              │               │              │◀──────────────│
   │              │               │              │               │
   │              │               │◀─────────────│               │
   │              │               │ GET /requests│               │
   │              │               │              │               │
   │              │               │─────────────▶│               │
   │              │               │ Approve      │               │
   │              │               │ request      │               │
   │              │               │              │               │
   │              │               │ Update       │               │
   │              │               │ request      │               │
   │              │               │ status       │               │
   │              │               │──────────────┼──────────────▶│
   │              │               │              │               │
   │              │               │ Add to       │               │
   │              │               │ library      │               │
   │              │               │              │               │
   │              │               │ Notify       │               │
   │              │               │ requester    │               │
   │              │               │─────────────▶│               │
   │              │               │              │               │
   │◀─────────────┼───────────────│              │               │
   │ "Request     │               │              │               │
   │ approved"    │               │              │               │
   │              │               │              │               │
```

---

## Real-Time Update Flow

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│ Service  │     │ Event   │     │WebSocket │     │ Client  │
│          │     │ Emitter │     │ Server   │     │         │
└────┬─────┘     └────┬────┘     └────┬─────┘     └────┬────┘
     │                │               │               │
     │ State change   │               │               │
     │ (e.g., queue   │               │               │
     │ progress)      │               │               │
     │                │               │               │
     │ Emit event     │               │               │
     │───────────────▶│               │               │
     │                │               │               │
     │                │ Publish to    │               │
     │                │ Redis         │               │
     │                │ pub/sub       │               │
     │                │               │               │
     │                │ (Multi-node   │               │
     │                │ distribution) │               │
     │                │               │               │
     │                │───────────────▶               │
     │                │ Event         │               │
     │                │               │               │
     │                │               │ Filter by     │
     │                │               │ subscription  │
     │                │               │               │
     │                │               │ Check         │
     │                │               │ permissions   │
     │                │               │               │
     │                │               │ Send to       │
     │                │               │ subscribed    │
     │                │               │ clients       │
     │                │               │───────────────▶
     │                │               │ WS message    │
     │                │               │               │
     │                │               │               │ Update
     │                │               │               │ UI state
     │                │               │               │
     │                │               │               │ Re-render
     │                │               │               │ component
     │                │               │               │
```

---

## Authentication Flow

### Session Login

```
┌──────┐     ┌─────────┐     ┌─────────┐     ┌────────┐     ┌───────┐
│ User │     │ Frontend│     │ Backend │     │  Lucia │     │  DB   │
└──┬───┘     └────┬────┘     └────┬────┘     └───┬────┘     └───┬───┘
   │              │               │              │              │
   │ Enter        │               │              │              │
   │ credentials  │               │              │              │
   │─────────────▶│               │              │              │
   │              │               │              │              │
   │              │ POST /auth/   │              │              │
   │              │ login         │              │              │
   │              │──────────────▶│              │              │
   │              │               │              │              │
   │              │               │ Validate     │              │
   │              │               │ input        │              │
   │              │               │              │              │
   │              │               │ Find user    │              │
   │              │               │──────────────┼─────────────▶│
   │              │               │              │              │
   │              │               │◀─────────────┼──────────────│
   │              │               │ User record  │              │
   │              │               │              │              │
   │              │               │ Verify       │              │
   │              │               │ password     │              │
   │              │               │ (Argon2)     │              │
   │              │               │              │              │
   │              │               │ Check if     │              │
   │              │               │ 2FA required │              │
   │              │               │              │              │
   │              │               │ [If 2FA]     │              │
   │              │◀──────────────│              │              │
   │              │ 200 {         │              │              │
   │              │   requires2FA │              │              │
   │              │ }             │              │              │
   │              │               │              │              │
   │◀─────────────│               │              │              │
   │ Show 2FA     │               │              │              │
   │ prompt       │               │              │              │
   │              │               │              │              │
   │ Enter code   │               │              │              │
   │─────────────▶│               │              │              │
   │              │               │              │              │
   │              │ POST /auth/   │              │              │
   │              │ 2fa/verify    │              │              │
   │              │──────────────▶│              │              │
   │              │               │              │              │
   │              │               │ Verify TOTP  │              │
   │              │               │              │              │
   │              │               │ Create       │              │
   │              │               │ session      │              │
   │              │               │─────────────▶│              │
   │              │               │              │              │
   │              │               │              │ Insert       │
   │              │               │              │ session      │
   │              │               │              │─────────────▶│
   │              │               │              │              │
   │              │               │◀─────────────│              │
   │              │               │ Session ID   │              │
   │              │               │              │              │
   │              │◀──────────────│              │              │
   │              │ 200 + Cookie  │              │              │
   │              │               │              │              │
   │◀─────────────│               │              │              │
   │ Redirect     │               │              │              │
   │              │               │              │              │
```

---

## File Rename Flow

```
┌──────┐     ┌─────────┐     ┌─────────┐     ┌──────┐     ┌────────┐
│ User │     │ Backend │     │ Naming  │     │ Disk │     │   DB   │
│      │     │         │     │ Service │     │      │     │        │
└──┬───┘     └────┬────┘     └────┬────┘     └──┬───┘     └───┬────┘
   │              │               │             │              │
   │ Trigger      │               │             │              │
   │ rename       │               │             │              │
   │─────────────▶│               │             │              │
   │              │               │             │              │
   │              │ Get episode   │             │              │
   │              │ files         │             │              │
   │              │───────────────┼─────────────┼─────────────▶│
   │              │               │             │              │
   │              │◀──────────────┼─────────────┼──────────────│
   │              │ Files         │             │              │
   │              │               │             │              │
   │              │ For each      │             │              │
   │              │ file:         │             │              │
   │              │               │             │              │
   │              │ Generate new  │             │              │
   │              │ filename      │             │              │
   │              │──────────────▶│             │              │
   │              │               │             │              │
   │              │               │ Apply       │              │
   │              │               │ naming      │              │
   │              │               │ pattern     │              │
   │              │               │             │              │
   │              │               │ Replace     │              │
   │              │               │ tokens      │              │
   │              │               │             │              │
   │              │◀──────────────│             │              │
   │              │ New filename  │             │              │
   │              │               │             │              │
   │              │ Validate      │             │              │
   │              │ path          │             │              │
   │              │               │             │              │
   │              │ Rename file   │             │              │
   │              │───────────────┼────────────▶│              │
   │              │               │             │              │
   │              │◀──────────────┼─────────────│              │
   │              │ Success       │             │              │
   │              │               │             │              │
   │              │ Update DB     │             │              │
   │              │───────────────┼─────────────┼─────────────▶│
   │              │               │             │              │
   │              │ Add history   │             │              │
   │              │ (renamed)     │             │              │
   │              │───────────────┼─────────────┼─────────────▶│
   │              │               │             │              │
   │              │ Broadcast     │             │              │
   │              │ episode:      │             │              │
   │              │ renamed       │             │              │
   │              │               │             │              │
   │◀─────────────│               │             │              │
   │ Success      │               │             │              │
   │              │               │             │              │
```

---

## Metadata Refresh Flow

```
┌──────────┐     ┌─────────┐     ┌──────┐     ┌────────┐     ┌──────┐
│Scheduled │     │ Refresh │     │ TVDB │     │   DB   │     │Events│
│  Task    │     │ Worker  │     │      │     │        │     │      │
└────┬─────┘     └────┬────┘     └──┬───┘     └───┬────┘     └──┬───┘
     │                │             │             │              │
     │ Trigger        │             │             │              │
     │ refresh        │             │             │              │
     │───────────────▶│             │             │              │
     │                │             │             │              │
     │                │ Get series  │             │              │
     │                │ needing     │             │              │
     │                │ refresh     │             │              │
     │                │─────────────┼────────────▶│              │
     │                │             │             │              │
     │                │◀────────────┼─────────────│              │
     │                │ Series list │             │              │
     │                │             │             │              │
     │                │ For each    │             │              │
     │                │ series:     │             │              │
     │                │             │             │              │
     │                │ Fetch       │             │              │
     │                │ metadata    │             │              │
     │                │────────────▶│             │              │
     │                │             │             │              │
     │                │◀────────────│             │              │
     │                │ Updated     │             │              │
     │                │ metadata    │             │              │
     │                │             │             │              │
     │                │ Update      │             │              │
     │                │ series      │             │              │
     │                │─────────────┼────────────▶│              │
     │                │             │             │              │
     │                │ Find new    │             │              │
     │                │ episodes    │             │              │
     │                │             │             │              │
     │                │ Insert new  │             │              │
     │                │ episodes    │             │              │
     │                │─────────────┼────────────▶│              │
     │                │             │             │              │
     │                │ Update      │             │              │
     │                │ existing    │             │              │
     │                │ episodes    │             │              │
     │                │─────────────┼────────────▶│              │
     │                │             │             │              │
     │                │ Broadcast   │             │              │
     │                │ series:     │             │              │
     │                │ refreshed   │             │              │
     │                │─────────────┼─────────────┼─────────────▶│
     │                │             │             │              │
     │◀───────────────│             │             │              │
     │ Complete       │             │             │              │
     │                │             │             │              │
```

---

*These data flow diagrams illustrate the key operations in idkarr. They serve as documentation and guides for implementation.*
