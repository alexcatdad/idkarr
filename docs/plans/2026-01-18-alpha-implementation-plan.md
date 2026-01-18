# idkarr Alpha Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a functional alpha where users can browse their library, add new media via TMDB search, view detail pages, and see upcoming releases on a calendar.

**Architecture:** SvelteKit 5 frontend with Convex backend. TMDB API integration via Convex HTTP actions. Real-time updates via Convex subscriptions. OAuth authentication via Convex Auth.

**Tech Stack:** SvelteKit 5, Svelte 5 runes, Convex, TMDB API, shadcn-svelte, Tailwind CSS v4

---

## Phase 1: TMDB Integration & Add Media Flow

### Task 1: Create TMDB HTTP Action for Movie Search

**Files:**
- Create: `src/convex/tmdb.ts`
- Modify: `src/convex/_generated/api.d.ts` (auto-generated)

**Step 1: Create the TMDB action file with movie search**

```typescript
// src/convex/tmdb.ts
import { httpAction } from "./_generated/server";
import { v } from "convex/values";
import { action } from "./_generated/server";

// TMDB API configuration
const TMDB_API_BASE = "https://api.themoviedb.org/3";

// Search movies on TMDB
export const searchMovies = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB_API_KEY environment variable not set");
    }

    const page = args.page ?? 1;
    const url = `${TMDB_API_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(args.query)}&page=${page}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our format
    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: data.results.map((movie: any) => ({
        tmdbId: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview,
        releaseDate: movie.release_date,
        year: movie.release_date ? parseInt(movie.release_date.split("-")[0]) : null,
        posterPath: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        backdropPath: movie.backdrop_path
          ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
          : null,
        voteAverage: movie.vote_average,
        popularity: movie.popularity,
      })),
    };
  },
});

// Get movie details from TMDB
export const getMovieDetails = action({
  args: {
    tmdbId: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB_API_KEY environment variable not set");
    }

    const url = `${TMDB_API_BASE}/movie/${args.tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids,release_dates`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const movie = await response.json();

    return {
      tmdbId: movie.id,
      imdbId: movie.imdb_id,
      title: movie.title,
      originalTitle: movie.original_title,
      sortTitle: movie.title.replace(/^(The|A|An)\s+/i, ""),
      overview: movie.overview,
      releaseDate: movie.release_date,
      year: movie.release_date ? parseInt(movie.release_date.split("-")[0]) : null,
      runtime: movie.runtime,
      status: movie.status,
      posterPath: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      backdropPath: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null,
      voteAverage: movie.vote_average,
      budget: movie.budget,
      revenue: movie.revenue,
      genres: movie.genres?.map((g: any) => g.name) || [],
      studio: movie.production_companies?.[0]?.name,
      certification: getCertification(movie.release_dates?.results),
      collection: movie.belongs_to_collection
        ? {
            tmdbId: movie.belongs_to_collection.id,
            name: movie.belongs_to_collection.name,
          }
        : null,
    };
  },
});

function getCertification(releaseDates: any[]): string | null {
  if (!releaseDates) return null;
  const us = releaseDates.find((r: any) => r.iso_3166_1 === "US");
  if (!us) return null;
  const theatrical = us.release_dates.find((r: any) => r.type === 3);
  return theatrical?.certification || null;
}
```

**Step 2: Set up TMDB API key in Convex**

Run: `npx convex env set TMDB_API_KEY <your-api-key>`

Note: Get a free API key from https://www.themoviedb.org/settings/api

**Step 3: Run Convex dev to generate types**

Run: `bun run convex:dev`
Expected: Terminal shows "✔ Synced" and new action available

**Step 4: Commit**

```bash
git add src/convex/tmdb.ts
git commit -m "feat: add TMDB API integration for movie search"
```

---

### Task 2: Create Add Movie Modal Component

**Files:**
- Create: `src/lib/components/AddMovieModal.svelte`

**Step 1: Create the modal component**

```svelte
<!-- src/lib/components/AddMovieModal.svelte -->
<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { api } from "../../convex/_generated/api";
import { Button } from "$lib/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open, onClose }: Props = $props();

const client = useConvexClient();

let searchQuery = $state("");
let searchResults = $state<any[]>([]);
let isSearching = $state(false);
let selectedMovie = $state<any | null>(null);
let isAdding = $state(false);
let error = $state<string | null>(null);

async function handleSearch() {
  if (!searchQuery.trim()) return;

  isSearching = true;
  error = null;

  try {
    const results = await client.action(api.tmdb.searchMovies, {
      query: searchQuery,
    });
    searchResults = results.results;
  } catch (e) {
    error = e instanceof Error ? e.message : "Search failed";
  } finally {
    isSearching = false;
  }
}

async function handleAddMovie(movie: any) {
  isAdding = true;
  error = null;

  try {
    // Get full details from TMDB
    const details = await client.action(api.tmdb.getMovieDetails, {
      tmdbId: movie.tmdbId,
    });

    // Add to library
    await client.mutation(api.movies.add, {
      title: details.title,
      sortTitle: details.sortTitle,
      year: details.year,
      overview: details.overview,
      tmdbId: details.tmdbId,
      imdbId: details.imdbId,
      monitored: true,
      status: mapTmdbStatus(details.status),
      runtime: details.runtime,
      studio: details.studio,
      certification: details.certification,
    });

    onClose();
    searchQuery = "";
    searchResults = [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to add movie";
  } finally {
    isAdding = false;
  }
}

function mapTmdbStatus(status: string): "released" | "announced" | "inCinemas" | "upcoming" | "unknown" {
  switch (status) {
    case "Released":
      return "released";
    case "In Production":
    case "Post Production":
      return "announced";
    case "Planned":
      return "upcoming";
    default:
      return "unknown";
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    handleSearch();
  }
}
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <button
      class="absolute inset-0 bg-black/50"
      onclick={onClose}
      aria-label="Close modal"
    ></button>

    <!-- Modal -->
    <div class="relative z-10 w-full max-w-2xl max-h-[80vh] bg-card rounded-lg shadow-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">Add Movie</h2>
        <button
          onclick={onClose}
          class="p-1 rounded hover:bg-muted"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      <!-- Search -->
      <div class="p-4 border-b">
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Search for a movie..."
            bind:value={searchQuery}
            onkeydown={handleKeydown}
            class="flex-1 px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button onclick={handleSearch} disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
        {#if error}
          <p class="mt-2 text-sm text-red-500">{error}</p>
        {/if}
      </div>

      <!-- Results -->
      <div class="overflow-y-auto max-h-[50vh] p-4">
        {#if searchResults.length === 0}
          <p class="text-center text-muted-foreground py-8">
            {isSearching ? "Searching..." : "Search for a movie to add to your library"}
          </p>
        {:else}
          <div class="space-y-3">
            {#each searchResults as movie}
              <div class="flex gap-4 p-3 rounded-lg border hover:border-primary transition-colors">
                <!-- Poster -->
                <div class="w-16 h-24 rounded bg-muted flex-shrink-0 overflow-hidden">
                  {#if movie.posterPath}
                    <img
                      src={movie.posterPath}
                      alt={movie.title}
                      class="w-full h-full object-cover"
                    />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect width="18" height="18" x="3" y="3" rx="2"/>
                        <path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>
                      </svg>
                    </div>
                  {/if}
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium truncate">{movie.title}</h3>
                  <p class="text-sm text-muted-foreground">
                    {movie.year ?? "Unknown year"}
                  </p>
                  {#if movie.overview}
                    <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {movie.overview}
                    </p>
                  {/if}
                </div>

                <!-- Add button -->
                <div class="flex-shrink-0">
                  <Button
                    size="sm"
                    onclick={() => handleAddMovie(movie)}
                    disabled={isAdding}
                  >
                    {isAdding ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
```

**Step 2: Verify types compile**

Run: `bun run check`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/components/AddMovieModal.svelte
git commit -m "feat: add movie search modal component"
```

---

### Task 3: Add movies.add Mutation to Backend

**Files:**
- Modify: `src/convex/movies.ts`

**Step 1: Add the `add` mutation**

Add this after the existing mutations in `src/convex/movies.ts`:

```typescript
// Add a new movie to the library
export const add = mutation({
  args: {
    title: v.string(),
    sortTitle: v.string(),
    year: v.optional(v.number()),
    overview: v.optional(v.string()),
    tmdbId: v.optional(v.number()),
    imdbId: v.optional(v.string()),
    monitored: v.boolean(),
    status: mediaStatusValidator,
    // Movie-specific metadata
    runtime: v.optional(v.number()),
    studio: v.optional(v.string()),
    certification: v.optional(v.string()),
    qualityProfileId: v.optional(v.id("qualityProfiles")),
    rootFolderId: v.optional(v.id("rootFolders")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if movie already exists by tmdbId
    if (args.tmdbId) {
      const existing = await ctx.db
        .query("media")
        .withIndex("by_tmdb", (q) => q.eq("tmdbId", args.tmdbId))
        .first();
      if (existing) {
        throw new Error("Movie already exists in library");
      }
    }

    // Create media entry
    const mediaId = await ctx.db.insert("media", {
      mediaType: "movie",
      title: args.title,
      sortTitle: args.sortTitle,
      year: args.year,
      overview: args.overview,
      status: args.status,
      monitored: args.monitored,
      tmdbId: args.tmdbId,
      imdbId: args.imdbId,
      qualityProfileId: args.qualityProfileId,
      rootFolderId: args.rootFolderId,
      added: now,
    });

    // Create movie metadata
    await ctx.db.insert("movieMetadata", {
      mediaId,
      runtime: args.runtime,
      studio: args.studio,
      certification: args.certification,
      createdAt: now,
      updatedAt: now,
    });

    return mediaId;
  },
});
```

**Step 2: Run Convex dev to sync**

Run: `bun run convex:dev`
Expected: Shows "✔ Synced"

**Step 3: Commit**

```bash
git add src/convex/movies.ts
git commit -m "feat: add movie creation mutation"
```

---

### Task 4: Integrate Add Movie Button in Movies Page

**Files:**
- Modify: `src/routes/movies/+page.svelte`

**Step 1: Import and add the modal**

At the top of the script section, add:

```typescript
import AddMovieModal from "$lib/components/AddMovieModal.svelte";

let showAddModal = $state(false);
```

**Step 2: Update the Add Movie button**

Change the Button in the header from:

```svelte
<Button>
  <svg ...>...</svg>
  Add Movie
</Button>
```

To:

```svelte
<Button onclick={() => (showAddModal = true)}>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
  Add Movie
</Button>
```

**Step 3: Add the modal at the end of the file (before closing `</div>`)**

```svelte
<AddMovieModal bind:open={showAddModal} onClose={() => (showAddModal = false)} />
```

**Step 4: Run type check**

Run: `bun run check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/routes/movies/+page.svelte
git commit -m "feat: integrate add movie modal in movies page"
```

---

## Phase 2: Movie Detail Page

### Task 5: Create Movie Detail Page

**Files:**
- Create: `src/routes/movies/[id]/+page.svelte`

**Step 1: Create the directory and page**

```svelte
<!-- src/routes/movies/[id]/+page.svelte -->
<script lang="ts">
import { page } from "$app/stores";
import { useConvexClient, useQuery } from "convex-svelte";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "$lib/components/ui/button";

const client = useConvexClient();

// Get movie ID from URL
const movieId = $derived($page.params.id as Id<"media">);

// Query movie details
const movieQuery = useQuery(api.movies.get, { id: movieId });

// Edit state
let isEditing = $state(false);
let editedMonitored = $state(true);

$effect(() => {
  if (movieQuery.data) {
    editedMonitored = movieQuery.data.monitored;
  }
});

async function toggleMonitored() {
  if (!movieQuery.data) return;
  await client.mutation(api.movies.update, {
    id: movieId,
    monitored: !movieQuery.data.monitored,
  });
}

async function deleteMovie() {
  if (!confirm("Are you sure you want to delete this movie from your library?")) return;
  await client.mutation(api.movies.remove, { id: movieId });
  window.history.back();
}

function formatRuntime(minutes?: number): string {
  if (!minutes) return "Unknown";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "N/A";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}
</script>

<svelte:head>
  <title>{movieQuery.data?.title ?? "Movie"} - idkarr</title>
</svelte:head>

{#if movieQuery.isLoading}
  <div class="space-y-6">
    <div class="h-64 animate-pulse rounded-lg bg-muted"></div>
    <div class="h-8 w-1/3 animate-pulse rounded bg-muted"></div>
    <div class="h-4 w-2/3 animate-pulse rounded bg-muted"></div>
  </div>
{:else if !movieQuery.data}
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <h2 class="text-xl font-semibold">Movie not found</h2>
    <p class="text-muted-foreground mt-1">This movie doesn't exist in your library</p>
    <Button class="mt-4" onclick={() => window.history.back()}>Go Back</Button>
  </div>
{:else}
  {@const movie = movieQuery.data}
  <div class="space-y-6">
    <!-- Header with backdrop -->
    <div class="relative rounded-lg overflow-hidden bg-muted h-64">
      <div class="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
      <div class="absolute bottom-0 left-0 right-0 p-6 z-20">
        <div class="flex items-end gap-6">
          <!-- Poster -->
          <div class="w-32 h-48 rounded-lg bg-card shadow-lg overflow-hidden flex-shrink-0">
            <div class="w-full h-full flex items-center justify-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>
              </svg>
            </div>
          </div>
          <!-- Title & Info -->
          <div class="flex-1">
            <h1 class="text-3xl font-bold">{movie.title}</h1>
            <div class="flex items-center gap-3 mt-2 text-muted-foreground">
              {#if movie.year}
                <span>{movie.year}</span>
              {/if}
              {#if movie.metadata?.runtime}
                <span>•</span>
                <span>{formatRuntime(movie.metadata.runtime)}</span>
              {/if}
              {#if movie.metadata?.certification}
                <span>•</span>
                <span class="px-2 py-0.5 rounded border text-xs">{movie.metadata.certification}</span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <Button variant={movie.monitored ? "default" : "outline"} onclick={toggleMonitored}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
          {#if movie.monitored}
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          {:else}
            <path d="M17.5 8A3.5 3.5 0 0 1 21 11.5a3.5 3.5 0 0 1-.67 2.06L12 22l-8.33-8.44A3.5 3.5 0 0 1 3 11.5 3.5 3.5 0 0 1 6.5 8c1.08 0 2.08.46 2.78 1.22L12 12l2.72-2.78A3.5 3.5 0 0 1 17.5 8Z"/>
          {/if}
        </svg>
        {movie.monitored ? "Monitored" : "Unmonitored"}
      </Button>
      <Button variant="outline">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        Search
      </Button>
      <Button variant="outline" onclick={deleteMovie}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
        Delete
      </Button>
    </div>

    <!-- Content Grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Overview -->
        {#if movie.overview}
          <div class="rounded-lg border bg-card p-6">
            <h2 class="text-lg font-semibold mb-3">Overview</h2>
            <p class="text-muted-foreground leading-relaxed">{movie.overview}</p>
          </div>
        {/if}

        <!-- File Info -->
        <div class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold mb-3">Files</h2>
          {#if movie.hasFile && movie.file}
            <div class="space-y-2">
              <div class="flex items-center justify-between py-2 border-b">
                <span class="text-muted-foreground">Path</span>
                <span class="font-mono text-sm truncate max-w-md">{movie.file.relativePath}</span>
              </div>
              <div class="flex items-center justify-between py-2 border-b">
                <span class="text-muted-foreground">Size</span>
                <span>{formatFileSize(movie.file.size)}</span>
              </div>
              {#if movie.file.videoCodec}
                <div class="flex items-center justify-between py-2 border-b">
                  <span class="text-muted-foreground">Video</span>
                  <span>{movie.file.videoCodec}</span>
                </div>
              {/if}
              {#if movie.file.audioCodec}
                <div class="flex items-center justify-between py-2">
                  <span class="text-muted-foreground">Audio</span>
                  <span>{movie.file.audioCodec} {movie.file.audioChannels ?? ""}</span>
                </div>
              {/if}
            </div>
          {:else}
            <p class="text-muted-foreground">No file available</p>
          {/if}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Info Card -->
        <div class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold mb-3">Information</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Status</span>
              <span class="capitalize">{movie.status}</span>
            </div>
            {#if movie.metadata?.studio}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Studio</span>
                <span>{movie.metadata.studio}</span>
              </div>
            {/if}
            {#if movie.qualityProfile}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Quality Profile</span>
                <span>{movie.qualityProfile.name}</span>
              </div>
            {/if}
            {#if movie.rootFolder}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Root Folder</span>
                <span class="truncate max-w-32">{movie.rootFolder.path}</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- External Links -->
        <div class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold mb-3">Links</h2>
          <div class="flex flex-wrap gap-2">
            {#if movie.tmdbId}
              <a
                href="https://www.themoviedb.org/movie/{movie.tmdbId}"
                target="_blank"
                rel="noopener noreferrer"
                class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors"
              >
                TMDB
              </a>
            {/if}
            {#if movie.imdbId}
              <a
                href="https://www.imdb.com/title/{movie.imdbId}"
                target="_blank"
                rel="noopener noreferrer"
                class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors"
              >
                IMDB
              </a>
            {/if}
          </div>
        </div>

        <!-- Tags -->
        {#if movie.tags && movie.tags.length > 0}
          <div class="rounded-lg border bg-card p-6">
            <h2 class="text-lg font-semibold mb-3">Tags</h2>
            <div class="flex flex-wrap gap-2">
              {#each movie.tags as tag}
                <span class="px-3 py-1 rounded-full bg-muted text-sm">{tag.name}</span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
```

**Step 2: Create the directory structure**

Run: `mkdir -p /Users/alex/REPOS/alexcatdad/idkarr/src/routes/movies/\[id\]`

**Step 3: Run type check**

Run: `bun run check`
Expected: May have type errors for missing mutations

**Step 4: Commit**

```bash
git add src/routes/movies/\[id\]/+page.svelte
git commit -m "feat: add movie detail page"
```

---

### Task 6: Add Missing Movie Mutations

**Files:**
- Modify: `src/convex/movies.ts`

**Step 1: Add update and remove mutations**

Add these after the `add` mutation:

```typescript
// Update a movie
export const update = mutation({
  args: {
    id: v.id("media"),
    monitored: v.optional(v.boolean()),
    qualityProfileId: v.optional(v.id("qualityProfiles")),
    rootFolderId: v.optional(v.id("rootFolders")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.id);
    if (!movie || movie.mediaType !== "movie") {
      throw new Error("Movie not found");
    }

    const updates: Partial<typeof movie> = {};

    if (args.monitored !== undefined) updates.monitored = args.monitored;
    if (args.qualityProfileId !== undefined) updates.qualityProfileId = args.qualityProfileId;
    if (args.rootFolderId !== undefined) updates.rootFolderId = args.rootFolderId;
    if (args.tagIds !== undefined) updates.tagIds = args.tagIds;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Remove a movie from the library
export const remove = mutation({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    const movie = await ctx.db.get(args.id);
    if (!movie || movie.mediaType !== "movie") {
      throw new Error("Movie not found");
    }

    // Delete metadata
    const metadata = await ctx.db
      .query("movieMetadata")
      .withIndex("by_media", (q) => q.eq("mediaId", args.id))
      .first();
    if (metadata) {
      await ctx.db.delete(metadata._id);
    }

    // Delete associated files
    const files = await ctx.db
      .query("mediaFiles")
      .withIndex("by_media", (q) => q.eq("mediaId", args.id))
      .collect();
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Delete the media entry
    await ctx.db.delete(args.id);
    return args.id;
  },
});
```

**Step 2: Run Convex dev to sync**

Run: `bun run convex:dev`
Expected: Shows "✔ Synced"

**Step 3: Run type check**

Run: `bun run check`
Expected: No errors

**Step 4: Commit**

```bash
git add src/convex/movies.ts
git commit -m "feat: add movie update and remove mutations"
```

---

## Phase 3: Series Support (Mirroring Movies)

### Task 7: Create TMDB TV Search Action

**Files:**
- Modify: `src/convex/tmdb.ts`

**Step 1: Add TV search and details actions**

Add to `src/convex/tmdb.ts`:

```typescript
// Search TV shows on TMDB
export const searchTV = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB_API_KEY environment variable not set");
    }

    const page = args.page ?? 1;
    const url = `${TMDB_API_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(args.query)}&page=${page}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: data.results.map((show: any) => ({
        tmdbId: show.id,
        title: show.name,
        originalTitle: show.original_name,
        overview: show.overview,
        firstAirDate: show.first_air_date,
        year: show.first_air_date ? parseInt(show.first_air_date.split("-")[0]) : null,
        posterPath: show.poster_path
          ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
          : null,
        backdropPath: show.backdrop_path
          ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
          : null,
        voteAverage: show.vote_average,
        popularity: show.popularity,
      })),
    };
  },
});

// Get TV show details from TMDB
export const getTVDetails = action({
  args: {
    tmdbId: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      throw new Error("TMDB_API_KEY environment variable not set");
    }

    const url = `${TMDB_API_BASE}/tv/${args.tmdbId}?api_key=${apiKey}&append_to_response=external_ids,content_ratings`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const show = await response.json();

    return {
      tmdbId: show.id,
      tvdbId: show.external_ids?.tvdb_id,
      imdbId: show.external_ids?.imdb_id,
      title: show.name,
      originalTitle: show.original_name,
      sortTitle: show.name.replace(/^(The|A|An)\s+/i, ""),
      overview: show.overview,
      firstAirDate: show.first_air_date,
      year: show.first_air_date ? parseInt(show.first_air_date.split("-")[0]) : null,
      status: mapTVStatus(show.status),
      posterPath: show.poster_path
        ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
        : null,
      backdropPath: show.backdrop_path
        ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
        : null,
      voteAverage: show.vote_average,
      network: show.networks?.[0]?.name,
      runtime: show.episode_run_time?.[0],
      genres: show.genres?.map((g: any) => g.name) || [],
      seasonCount: show.number_of_seasons,
      episodeCount: show.number_of_episodes,
      seasons: show.seasons?.map((s: any) => ({
        seasonNumber: s.season_number,
        name: s.name,
        overview: s.overview,
        episodeCount: s.episode_count,
        airDate: s.air_date,
        posterPath: s.poster_path
          ? `https://image.tmdb.org/t/p/w500${s.poster_path}`
          : null,
      })) || [],
    };
  },
});

function mapTVStatus(status: string): "continuing" | "ended" | "upcoming" | "unknown" {
  switch (status) {
    case "Returning Series":
      return "continuing";
    case "Ended":
    case "Canceled":
      return "ended";
    case "In Production":
    case "Planned":
      return "upcoming";
    default:
      return "unknown";
  }
}
```

**Step 2: Run Convex dev**

Run: `bun run convex:dev`
Expected: Shows "✔ Synced"

**Step 3: Commit**

```bash
git add src/convex/tmdb.ts
git commit -m "feat: add TMDB TV search and details actions"
```

---

### Task 8: Add Series Mutations

**Files:**
- Modify: `src/convex/series.ts`

**Step 1: Add the `add` mutation to series.ts**

Add after existing queries:

```typescript
// Add a new series to the library
export const add = mutation({
  args: {
    title: v.string(),
    sortTitle: v.string(),
    year: v.optional(v.number()),
    overview: v.optional(v.string()),
    tmdbId: v.optional(v.number()),
    tvdbId: v.optional(v.number()),
    imdbId: v.optional(v.string()),
    monitored: v.boolean(),
    status: mediaStatusValidator,
    qualityProfileId: v.optional(v.id("qualityProfiles")),
    rootFolderId: v.optional(v.id("rootFolders")),
    // Season data from TMDB
    seasons: v.optional(
      v.array(
        v.object({
          seasonNumber: v.number(),
          name: v.optional(v.string()),
          overview: v.optional(v.string()),
          episodeCount: v.optional(v.number()),
          airDate: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if series already exists by tmdbId
    if (args.tmdbId) {
      const existing = await ctx.db
        .query("media")
        .withIndex("by_tmdb", (q) => q.eq("tmdbId", args.tmdbId))
        .first();
      if (existing) {
        throw new Error("Series already exists in library");
      }
    }

    // Create media entry
    const mediaId = await ctx.db.insert("media", {
      mediaType: "tv",
      title: args.title,
      sortTitle: args.sortTitle,
      year: args.year,
      overview: args.overview,
      status: args.status,
      monitored: args.monitored,
      tmdbId: args.tmdbId,
      tvdbId: args.tvdbId,
      imdbId: args.imdbId,
      qualityProfileId: args.qualityProfileId,
      rootFolderId: args.rootFolderId,
      added: now,
    });

    // Create seasons
    if (args.seasons) {
      for (const season of args.seasons) {
        // Skip specials (season 0) by default unless explicitly monitored
        const shouldMonitor = season.seasonNumber > 0;

        await ctx.db.insert("seasons", {
          mediaId,
          seasonNumber: season.seasonNumber,
          title: season.name,
          overview: season.overview,
          monitored: shouldMonitor,
          episodeCount: season.episodeCount,
          airDate: season.airDate ? new Date(season.airDate).getTime() : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return mediaId;
  },
});

// Update a series
export const update = mutation({
  args: {
    id: v.id("media"),
    monitored: v.optional(v.boolean()),
    qualityProfileId: v.optional(v.id("qualityProfiles")),
    rootFolderId: v.optional(v.id("rootFolders")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.id);
    if (!series || series.mediaType !== "tv") {
      throw new Error("Series not found");
    }

    const updates: Record<string, any> = {};

    if (args.monitored !== undefined) updates.monitored = args.monitored;
    if (args.qualityProfileId !== undefined) updates.qualityProfileId = args.qualityProfileId;
    if (args.rootFolderId !== undefined) updates.rootFolderId = args.rootFolderId;
    if (args.tagIds !== undefined) updates.tagIds = args.tagIds;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Remove a series from the library
export const remove = mutation({
  args: { id: v.id("media") },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.id);
    if (!series || series.mediaType !== "tv") {
      throw new Error("Series not found");
    }

    // Delete seasons
    const seasons = await ctx.db
      .query("seasons")
      .withIndex("by_media", (q) => q.eq("mediaId", args.id))
      .collect();
    for (const season of seasons) {
      await ctx.db.delete(season._id);
    }

    // Delete episodes
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_media", (q) => q.eq("mediaId", args.id))
      .collect();
    for (const episode of episodes) {
      await ctx.db.delete(episode._id);
    }

    // Delete associated files
    const files = await ctx.db
      .query("mediaFiles")
      .withIndex("by_media", (q) => q.eq("mediaId", args.id))
      .collect();
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Delete the media entry
    await ctx.db.delete(args.id);
    return args.id;
  },
});
```

**Step 2: Add the import for mediaStatusValidator at the top**

```typescript
import { mediaStatusValidator } from "./schema";
```

**Step 3: Run Convex dev**

Run: `bun run convex:dev`
Expected: Shows "✔ Synced"

**Step 4: Commit**

```bash
git add src/convex/series.ts
git commit -m "feat: add series CRUD mutations"
```

---

### Task 9: Create Add Series Modal

**Files:**
- Create: `src/lib/components/AddSeriesModal.svelte`

**Step 1: Create the modal (similar to AddMovieModal)**

```svelte
<!-- src/lib/components/AddSeriesModal.svelte -->
<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { api } from "../../convex/_generated/api";
import { Button } from "$lib/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

let { open, onClose }: Props = $props();

const client = useConvexClient();

let searchQuery = $state("");
let searchResults = $state<any[]>([]);
let isSearching = $state(false);
let isAdding = $state(false);
let error = $state<string | null>(null);

async function handleSearch() {
  if (!searchQuery.trim()) return;

  isSearching = true;
  error = null;

  try {
    const results = await client.action(api.tmdb.searchTV, {
      query: searchQuery,
    });
    searchResults = results.results;
  } catch (e) {
    error = e instanceof Error ? e.message : "Search failed";
  } finally {
    isSearching = false;
  }
}

async function handleAddSeries(show: any) {
  isAdding = true;
  error = null;

  try {
    const details = await client.action(api.tmdb.getTVDetails, {
      tmdbId: show.tmdbId,
    });

    await client.mutation(api.series.add, {
      title: details.title,
      sortTitle: details.sortTitle,
      year: details.year,
      overview: details.overview,
      tmdbId: details.tmdbId,
      tvdbId: details.tvdbId,
      imdbId: details.imdbId,
      monitored: true,
      status: details.status,
      seasons: details.seasons,
    });

    onClose();
    searchQuery = "";
    searchResults = [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to add series";
  } finally {
    isAdding = false;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") handleSearch();
}
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <button class="absolute inset-0 bg-black/50" onclick={onClose} aria-label="Close"></button>

    <div class="relative z-10 w-full max-w-2xl max-h-[80vh] bg-card rounded-lg shadow-xl overflow-hidden">
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-lg font-semibold">Add Series</h2>
        <button onclick={onClose} class="p-1 rounded hover:bg-muted" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      <div class="p-4 border-b">
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Search for a TV series..."
            bind:value={searchQuery}
            onkeydown={handleKeydown}
            class="flex-1 px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button onclick={handleSearch} disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
        {#if error}
          <p class="mt-2 text-sm text-red-500">{error}</p>
        {/if}
      </div>

      <div class="overflow-y-auto max-h-[50vh] p-4">
        {#if searchResults.length === 0}
          <p class="text-center text-muted-foreground py-8">
            {isSearching ? "Searching..." : "Search for a series to add"}
          </p>
        {:else}
          <div class="space-y-3">
            {#each searchResults as show}
              <div class="flex gap-4 p-3 rounded-lg border hover:border-primary transition-colors">
                <div class="w-16 h-24 rounded bg-muted flex-shrink-0 overflow-hidden">
                  {#if show.posterPath}
                    <img src={show.posterPath} alt={show.title} class="w-full h-full object-cover"/>
                  {:else}
                    <div class="w-full h-full flex items-center justify-center text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>
                      </svg>
                    </div>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium truncate">{show.title}</h3>
                  <p class="text-sm text-muted-foreground">{show.year ?? "Unknown year"}</p>
                  {#if show.overview}
                    <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{show.overview}</p>
                  {/if}
                </div>
                <div class="flex-shrink-0">
                  <Button size="sm" onclick={() => handleAddSeries(show)} disabled={isAdding}>
                    {isAdding ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/components/AddSeriesModal.svelte
git commit -m "feat: add series search modal component"
```

---

### Task 10: Integrate Add Series in Series Page

**Files:**
- Modify: `src/routes/series/+page.svelte`

**Step 1: Import the modal and add state**

At the top of the script:

```typescript
import AddSeriesModal from "$lib/components/AddSeriesModal.svelte";

let showAddModal = $state(false);
```

**Step 2: Update the button**

Change:
```svelte
<Button>
```

To:
```svelte
<Button onclick={() => (showAddModal = true)}>
```

**Step 3: Add modal at the end**

```svelte
<AddSeriesModal bind:open={showAddModal} onClose={() => (showAddModal = false)} />
```

**Step 4: Run type check**

Run: `bun run check`
Expected: No errors

**Step 5: Commit**

```bash
git add src/routes/series/+page.svelte
git commit -m "feat: integrate add series modal"
```

---

### Task 11: Create Series Detail Page

**Files:**
- Create: `src/routes/series/[id]/+page.svelte`

**Step 1: Create directory and page**

Run: `mkdir -p /Users/alex/REPOS/alexcatdad/idkarr/src/routes/series/\[id\]`

```svelte
<!-- src/routes/series/[id]/+page.svelte -->
<script lang="ts">
import { page } from "$app/stores";
import { useConvexClient, useQuery } from "convex-svelte";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "$lib/components/ui/button";

const client = useConvexClient();

const seriesId = $derived($page.params.id as Id<"media">);
const seriesQuery = useQuery(api.series.get, { id: seriesId });

async function toggleMonitored() {
  if (!seriesQuery.data) return;
  await client.mutation(api.series.update, {
    id: seriesId,
    monitored: !seriesQuery.data.monitored,
  });
}

async function deleteSeries() {
  if (!confirm("Delete this series and all its seasons/episodes?")) return;
  await client.mutation(api.series.remove, { id: seriesId });
  window.history.back();
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "continuing": return "bg-green-500";
    case "ended": return "bg-gray-500";
    case "upcoming": return "bg-blue-500";
    default: return "bg-gray-400";
  }
}
</script>

<svelte:head>
  <title>{seriesQuery.data?.title ?? "Series"} - idkarr</title>
</svelte:head>

{#if seriesQuery.isLoading}
  <div class="space-y-6">
    <div class="h-64 animate-pulse rounded-lg bg-muted"></div>
  </div>
{:else if !seriesQuery.data}
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <h2 class="text-xl font-semibold">Series not found</h2>
    <Button class="mt-4" onclick={() => window.history.back()}>Go Back</Button>
  </div>
{:else}
  {@const series = seriesQuery.data}
  <div class="space-y-6">
    <!-- Header -->
    <div class="relative rounded-lg overflow-hidden bg-muted h-64">
      <div class="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
      <div class="absolute bottom-0 left-0 right-0 p-6 z-20">
        <div class="flex items-end gap-6">
          <div class="w-32 h-48 rounded-lg bg-card shadow-lg overflow-hidden flex-shrink-0">
            <div class="w-full h-full flex items-center justify-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-bold">{series.title}</h1>
              <span class="px-2 py-1 rounded text-xs font-medium text-white {getStatusColor(series.status)} capitalize">
                {series.status}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-2 text-muted-foreground">
              {#if series.year}<span>{series.year}</span>{/if}
              <span>•</span>
              <span>{series.seasonCount ?? 0} Seasons</span>
              <span>•</span>
              <span>{series.episodeFileCount ?? 0}/{series.episodeCount ?? 0} Episodes</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <Button variant={series.monitored ? "default" : "outline"} onclick={toggleMonitored}>
        {series.monitored ? "Monitored" : "Unmonitored"}
      </Button>
      <Button variant="outline">Search</Button>
      <Button variant="outline" onclick={deleteSeries}>Delete</Button>
    </div>

    <!-- Content -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        {#if series.overview}
          <div class="rounded-lg border bg-card p-6">
            <h2 class="text-lg font-semibold mb-3">Overview</h2>
            <p class="text-muted-foreground leading-relaxed">{series.overview}</p>
          </div>
        {/if}

        <!-- Seasons -->
        <div class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold mb-4">Seasons</h2>
          {#if series.seasons && series.seasons.length > 0}
            <div class="space-y-3">
              {#each series.seasons as season}
                <div class="flex items-center justify-between p-3 rounded-lg border hover:border-primary transition-colors">
                  <div>
                    <h3 class="font-medium">
                      {season.title ?? `Season ${season.seasonNumber}`}
                    </h3>
                    <p class="text-sm text-muted-foreground">
                      {season.episodeFileCount ?? 0}/{season.episodeCount ?? 0} episodes
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-1 rounded text-xs {season.monitored ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}">
                      {season.monitored ? "Monitored" : "Unmonitored"}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-muted-foreground">No season data available</p>
          {/if}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <div class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold mb-3">Information</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Status</span>
              <span class="capitalize">{series.status}</span>
            </div>
            {#if series.qualityProfile}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Quality Profile</span>
                <span>{series.qualityProfile.name}</span>
              </div>
            {/if}
          </div>
        </div>

        <div class="rounded-lg border bg-card p-6">
          <h2 class="text-lg font-semibold mb-3">Links</h2>
          <div class="flex flex-wrap gap-2">
            {#if series.tmdbId}
              <a href="https://www.themoviedb.org/tv/{series.tmdbId}" target="_blank" class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted">TMDB</a>
            {/if}
            {#if series.tvdbId}
              <a href="https://thetvdb.com/series/{series.tvdbId}" target="_blank" class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted">TVDB</a>
            {/if}
            {#if series.imdbId}
              <a href="https://www.imdb.com/title/{series.imdbId}" target="_blank" class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted">IMDB</a>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors (may need to verify series.get returns seasons)

**Step 3: Commit**

```bash
git add src/routes/series/\[id\]/+page.svelte
git commit -m "feat: add series detail page"
```

---

## Phase 4: Calendar View

### Task 12: Create Calendar Backend Query

**Files:**
- Create: `src/convex/calendar.ts`

**Step 1: Create calendar query file**

```typescript
// src/convex/calendar.ts
import { v } from "convex/values";
import { query } from "./_generated/server";

// Get upcoming episodes and movie releases for calendar
export const getUpcoming = query({
  args: {
    startDate: v.number(), // timestamp
    endDate: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    const events: Array<{
      id: string;
      title: string;
      subtitle?: string;
      date: number;
      mediaType: "tv" | "movie" | "anime" | "music";
      mediaId: string;
      hasFile: boolean;
      monitored: boolean;
    }> = [];

    // Get episodes in date range
    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_airDate")
      .filter((q) =>
        q.and(
          q.gte(q.field("airDate"), args.startDate),
          q.lte(q.field("airDate"), args.endDate)
        )
      )
      .collect();

    for (const episode of episodes) {
      const media = await ctx.db.get(episode.mediaId);
      if (!media) continue;

      events.push({
        id: episode._id,
        title: media.title,
        subtitle: `S${String(episode.episodeNumber).padStart(2, "0")} - ${episode.title}`,
        date: episode.airDate!,
        mediaType: media.mediaType as "tv" | "anime",
        mediaId: media._id,
        hasFile: episode.hasFile,
        monitored: episode.monitored && media.monitored,
      });
    }

    // Get movies by release date (check movieMetadata)
    const movies = await ctx.db
      .query("media")
      .withIndex("by_type", (q) => q.eq("mediaType", "movie"))
      .collect();

    for (const movie of movies) {
      const metadata = await ctx.db
        .query("movieMetadata")
        .withIndex("by_media", (q) => q.eq("mediaId", movie._id))
        .first();

      // Check various release dates
      const releaseDate =
        metadata?.digitalRelease ?? metadata?.physicalRelease ?? metadata?.inCinemas;

      if (releaseDate && releaseDate >= args.startDate && releaseDate <= args.endDate) {
        const file = metadata?.movieFileId ? await ctx.db.get(metadata.movieFileId) : null;

        events.push({
          id: movie._id,
          title: movie.title,
          date: releaseDate,
          mediaType: "movie",
          mediaId: movie._id,
          hasFile: !!file,
          monitored: movie.monitored,
        });
      }
    }

    // Sort by date
    events.sort((a, b) => a.date - b.date);

    return events;
  },
});
```

**Step 2: Run Convex dev**

Run: `bun run convex:dev`
Expected: Shows "✔ Synced"

**Step 3: Commit**

```bash
git add src/convex/calendar.ts
git commit -m "feat: add calendar query for upcoming releases"
```

---

### Task 13: Create Calendar Page

**Files:**
- Create: `src/routes/calendar/+page.svelte`

**Step 1: Create directory and page**

Run: `mkdir -p /Users/alex/REPOS/alexcatdad/idkarr/src/routes/calendar`

```svelte
<!-- src/routes/calendar/+page.svelte -->
<script lang="ts">
import { useQuery } from "convex-svelte";
import { api } from "../../convex/_generated/api";
import { Button } from "$lib/components/ui/button";

// Current view date
let viewDate = $state(new Date());

// Calculate date range for current month view
const dateRange = $derived(() => {
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
  return { start: start.getTime(), end: end.getTime() };
});

// Query upcoming events
const eventsQuery = useQuery(api.calendar.getUpcoming, {
  startDate: dateRange().start,
  endDate: dateRange().end,
});

// Group events by date
const eventsByDate = $derived(() => {
  if (!eventsQuery.data) return new Map<string, typeof eventsQuery.data>();

  const grouped = new Map<string, typeof eventsQuery.data>();
  for (const event of eventsQuery.data) {
    const dateKey = new Date(event.date).toISOString().split("T")[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  }
  return grouped;
});

// Generate calendar grid
const calendarDays = $derived(() => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Add days from previous month to fill first week
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({ date, isCurrentMonth: false });
  }

  // Add days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }

  // Add days from next month to fill last week
  const endPadding = 6 - lastDay.getDay();
  for (let i = 1; i <= endPadding; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
});

function previousMonth() {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
}

function nextMonth() {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
}

function goToToday() {
  viewDate = new Date();
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getMediaTypeColor(type: string): string {
  switch (type) {
    case "tv": return "bg-blue-500";
    case "movie": return "bg-purple-500";
    case "anime": return "bg-pink-500";
    case "music": return "bg-green-500";
    default: return "bg-gray-500";
  }
}
</script>

<svelte:head>
  <title>Calendar - idkarr</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold">Calendar</h1>
      <p class="text-muted-foreground">Upcoming releases and air dates</p>
    </div>
  </div>

  <!-- Calendar Navigation -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Button variant="outline" size="sm" onclick={previousMonth}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </Button>
      <h2 class="text-xl font-semibold min-w-48 text-center">{formatMonth(viewDate)}</h2>
      <Button variant="outline" size="sm" onclick={nextMonth}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </Button>
    </div>
    <Button variant="outline" onclick={goToToday}>Today</Button>
  </div>

  <!-- Calendar Grid -->
  <div class="rounded-lg border bg-card overflow-hidden">
    <!-- Day headers -->
    <div class="grid grid-cols-7 border-b bg-muted/50">
      {#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
        <div class="p-3 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      {/each}
    </div>

    <!-- Calendar days -->
    <div class="grid grid-cols-7">
      {#each calendarDays() as { date, isCurrentMonth }, i}
        {@const dateKey = date.toISOString().split("T")[0]}
        {@const dayEvents = eventsByDate().get(dateKey) ?? []}
        <div
          class="min-h-28 p-2 border-b border-r {isCurrentMonth ? '' : 'bg-muted/30'} {isToday(date) ? 'bg-primary/5' : ''}"
          class:border-r-0={(i + 1) % 7 === 0}
        >
          <div class="flex items-center justify-between mb-1">
            <span
              class="text-sm {isCurrentMonth ? '' : 'text-muted-foreground'} {isToday(date) ? 'font-bold text-primary' : ''}"
            >
              {date.getDate()}
            </span>
            {#if dayEvents.length > 0}
              <span class="text-xs text-muted-foreground">{dayEvents.length}</span>
            {/if}
          </div>

          <!-- Events -->
          <div class="space-y-1">
            {#each dayEvents.slice(0, 3) as event}
              <a
                href="/{event.mediaType === 'movie' ? 'movies' : 'series'}/{event.mediaId}"
                class="block p-1 rounded text-xs truncate hover:bg-muted transition-colors {event.hasFile ? 'opacity-50' : ''}"
              >
                <span class="inline-block w-1.5 h-1.5 rounded-full mr-1 {getMediaTypeColor(event.mediaType)}"></span>
                <span class="{event.monitored ? '' : 'text-muted-foreground'}">{event.title}</span>
                {#if event.subtitle}
                  <span class="text-muted-foreground"> - {event.subtitle}</span>
                {/if}
              </a>
            {/each}
            {#if dayEvents.length > 3}
              <div class="text-xs text-muted-foreground px-1">
                +{dayEvents.length - 3} more
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Legend -->
  <div class="flex items-center gap-6 text-sm">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-blue-500"></span>
      <span>TV</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-purple-500"></span>
      <span>Movies</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-pink-500"></span>
      <span>Anime</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-green-500"></span>
      <span>Music</span>
    </div>
  </div>
</div>
```

**Step 2: Run type check**

Run: `bun run check`
Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/calendar/+page.svelte
git commit -m "feat: add calendar page with month view"
```

---

### Task 14: Add Calendar to Navigation

**Files:**
- Modify: `src/routes/+layout.svelte`

**Step 1: Add Calendar link to navigation**

Find the navigation section and add a Calendar link between Activity and Queue (or wherever appropriate):

```svelte
<a
  href="/calendar"
  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors {$page.url.pathname === '/calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>
  </svg>
  Calendar
</a>
```

**Step 2: Verify the page loads**

Run: `bun run dev`
Navigate to /calendar

**Step 3: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: add calendar to navigation"
```

---

## Phase 5: Polish & Integration Testing

### Task 15: Run Full Type Check and Fix Any Issues

**Step 1: Run full type check**

Run: `bun run check`

**Step 2: Fix any errors that appear**

Address each error individually.

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve type errors from alpha implementation"
```

---

### Task 16: Manual Integration Test

**Step 1: Start dev servers**

Run in two terminals:
- Terminal 1: `bun run dev`
- Terminal 2: `bun run convex:dev`

**Step 2: Test the following flows**

1. **Add Movie Flow**
   - Navigate to /movies
   - Click "Add Movie"
   - Search for "The Matrix"
   - Click Add on a result
   - Verify movie appears in library
   - Click movie to view detail page

2. **Add Series Flow**
   - Navigate to /series
   - Click "Add Series"
   - Search for "Breaking Bad"
   - Click Add
   - Verify series appears with seasons
   - Click series to view detail page

3. **Calendar**
   - Navigate to /calendar
   - Verify month view renders
   - Navigate between months

**Step 3: Document any issues found**

Create issues or fix immediately if simple.

---

### Task 17: Final Commit and Tag

**Step 1: Ensure all changes committed**

Run: `git status`

**Step 2: Create alpha tag**

```bash
git tag -a v0.1.0-alpha -m "Alpha release: TMDB integration, add media, detail pages, calendar"
```

---

## Summary

This plan delivers:

1. **TMDB Integration** - Search movies and TV shows
2. **Add Media Flow** - Modal to search and add to library
3. **Movie Detail Page** - View, monitor, delete movies
4. **Series Detail Page** - View, monitor, delete series with seasons
5. **Calendar View** - Month view of upcoming releases
6. **Navigation Update** - Calendar in sidebar

**Not included (future phases):**
- Authentication (Convex Auth)
- Indexer integration
- Download client integration
- Music/Anime specific flows
- Discovery page
- Mass editor
- Import flow

**Prerequisites:**
- TMDB API key (free from themoviedb.org)
- Convex project set up
- Node/Bun installed
