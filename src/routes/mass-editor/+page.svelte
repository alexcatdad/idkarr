<script lang="ts">
import { useQuery } from "convex-svelte";
import BulkActionsBar from "$lib/components/mass-editor/BulkActionsBar.svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Queries for all media types
const moviesQuery = useQuery(api.movies.list, {});
const seriesQuery = useQuery(api.series.list, {});
const artistsQuery = useQuery(api.music.listArtists, {});
const qualityProfilesQuery = useQuery(api.qualityProfiles.list, {});
const rootFoldersQuery = useQuery(api.rootFolders.list, {});

// Filter state
let mediaTypeFilter = $state<"all" | "movie" | "tv" | "music">("all");
let searchTerm = $state("");
let monitoredFilter = $state<"all" | "monitored" | "unmonitored">("all");

// Selection state
let selectedIds = $state<Set<Id<"media">>>(new Set());
let selectedMediaTypes = $state<Map<Id<"media">, "movie" | "tv" | "music">>(new Map());

// Unified media item type
type UnifiedMediaItem = {
	_id: Id<"media">;
	mediaType: "movie" | "tv" | "music";
	title: string;
	year?: number;
	status?: string;
	monitored: boolean;
	qualityProfileId?: Id<"qualityProfiles">;
	rootFolderId?: Id<"rootFolders">;
	// Additional display info
	displayStatus?: string;
	episodeInfo?: string;
	albumInfo?: string;
};

// Build unified media list
const allMedia = $derived(() => {
	const items: UnifiedMediaItem[] = [];

	// Add movies
	if (moviesQuery.data) {
		for (const movie of moviesQuery.data) {
			items.push({
				_id: movie._id,
				mediaType: "movie",
				title: movie.title,
				year: movie.year,
				status: movie.status,
				monitored: movie.monitored,
				qualityProfileId: movie.qualityProfileId,
				rootFolderId: movie.rootFolderId,
				displayStatus: getMovieStatusLabel(movie.status),
			});
		}
	}

	// Add series
	if (seriesQuery.data) {
		for (const series of seriesQuery.data) {
			items.push({
				_id: series._id,
				mediaType: "tv",
				title: series.title,
				year: series.year,
				status: series.status,
				monitored: series.monitored,
				qualityProfileId: series.qualityProfileId,
				rootFolderId: series.rootFolderId,
				displayStatus: getSeriesStatusLabel(series.status),
				episodeInfo: `${series.episodeFileCount ?? 0}/${series.episodeCount ?? 0} episodes`,
			});
		}
	}

	// Add artists
	if (artistsQuery.data) {
		for (const artist of artistsQuery.data) {
			items.push({
				_id: artist._id,
				mediaType: "music",
				title: artist.title,
				year: undefined,
				status: artist.status,
				monitored: artist.monitored,
				qualityProfileId: artist.qualityProfileId,
				rootFolderId: artist.rootFolderId,
				displayStatus: getArtistStatusLabel(artist.status),
				albumInfo: `${artist.albumCount ?? 0} albums, ${artist.trackFileCount ?? 0}/${artist.trackCount ?? 0} tracks`,
			});
		}
	}

	// Sort by title
	return items.sort((a, b) => a.title.localeCompare(b.title));
});

// Filtered media based on filters
const filteredMedia = $derived(() => {
	let result = allMedia();

	// Media type filter
	if (mediaTypeFilter !== "all") {
		result = result.filter((item) => item.mediaType === mediaTypeFilter);
	}

	// Search filter
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		result = result.filter((item) => item.title.toLowerCase().includes(term));
	}

	// Monitored filter
	if (monitoredFilter === "monitored") {
		result = result.filter((item) => item.monitored);
	} else if (monitoredFilter === "unmonitored") {
		result = result.filter((item) => !item.monitored);
	}

	return result;
});

// Check if all visible items are selected
const allVisibleSelected = $derived(() => {
	const visible = filteredMedia();
	if (visible.length === 0) return false;
	return visible.every((item) => selectedIds.has(item._id));
});

// Is loading any data
const isLoading = $derived(
	moviesQuery.isLoading || seriesQuery.isLoading || artistsQuery.isLoading,
);

// Helper functions for status labels
function getMovieStatusLabel(status?: string): string {
	switch (status) {
		case "released":
			return "Released";
		case "inCinemas":
			return "In Cinemas";
		case "announced":
			return "Announced";
		default:
			return "Unknown";
	}
}

function getSeriesStatusLabel(status?: string): string {
	switch (status) {
		case "continuing":
			return "Continuing";
		case "ended":
			return "Ended";
		case "upcoming":
			return "Upcoming";
		default:
			return "Unknown";
	}
}

function getArtistStatusLabel(status?: string): string {
	switch (status) {
		case "continuing":
			return "Active";
		case "ended":
			return "Inactive";
		default:
			return "Unknown";
	}
}

function getMediaTypeLabel(type: string): string {
	switch (type) {
		case "movie":
			return "Movie";
		case "tv":
			return "Series";
		case "music":
			return "Artist";
		default:
			return type;
	}
}

function getMediaTypeColor(type: string): string {
	switch (type) {
		case "movie":
			return "bg-blue-500";
		case "tv":
			return "bg-purple-500";
		case "music":
			return "bg-green-500";
		default:
			return "bg-gray-500";
	}
}

function getQualityProfileName(id?: Id<"qualityProfiles">): string {
	if (!id || !qualityProfilesQuery.data) return "-";
	const profile = qualityProfilesQuery.data.find(
		(p: { _id: Id<"qualityProfiles">; name: string }) => p._id === id,
	);
	return profile?.name ?? "-";
}

function getRootFolderPath(id?: Id<"rootFolders">): string {
	if (!id || !rootFoldersQuery.data) return "-";
	const folder = rootFoldersQuery.data.find(
		(f: { _id: Id<"rootFolders">; path: string }) => f._id === id,
	);
	if (!folder) return "-";
	// Show truncated path for long paths
	const path = folder.path;
	if (path.length > 30) {
		return `...${path.slice(-27)}`;
	}
	return path;
}

// Selection handlers
function toggleSelection(item: UnifiedMediaItem) {
	const newSet = new Set(selectedIds);
	const newMap = new Map(selectedMediaTypes);

	if (newSet.has(item._id)) {
		newSet.delete(item._id);
		newMap.delete(item._id);
	} else {
		newSet.add(item._id);
		newMap.set(item._id, item.mediaType);
	}

	selectedIds = newSet;
	selectedMediaTypes = newMap;
}

function toggleSelectAll() {
	const visible = filteredMedia();

	if (allVisibleSelected()) {
		// Deselect all visible
		const newSet = new Set(selectedIds);
		const newMap = new Map(selectedMediaTypes);
		for (const item of visible) {
			newSet.delete(item._id);
			newMap.delete(item._id);
		}
		selectedIds = newSet;
		selectedMediaTypes = newMap;
	} else {
		// Select all visible
		const newSet = new Set(selectedIds);
		const newMap = new Map(selectedMediaTypes);
		for (const item of visible) {
			newSet.add(item._id);
			newMap.set(item._id, item.mediaType);
		}
		selectedIds = newSet;
		selectedMediaTypes = newMap;
	}
}

function clearSelection() {
	selectedIds = new Set();
	selectedMediaTypes = new Map();
}

function handleUpdateComplete() {
	// Force refetch of data - queries will update automatically via Convex
}

// Media type counts
const mediaTypeCounts = $derived(() => {
	const all = allMedia();
	return {
		all: all.length,
		movie: all.filter((m) => m.mediaType === "movie").length,
		tv: all.filter((m) => m.mediaType === "tv").length,
		music: all.filter((m) => m.mediaType === "music").length,
	};
});
</script>

<div class="space-y-6 pb-24">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Mass Editor</h1>
			<p class="text-muted-foreground">Bulk edit your media library</p>
		</div>
	</div>

	<!-- Filter tabs and search -->
	<div class="space-y-4">
		<!-- Media type tabs -->
		<div class="flex flex-wrap items-center gap-2 border-b">
			<button
				class="relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary {mediaTypeFilter === 'all' ? 'text-primary' : 'text-muted-foreground'}"
				onclick={() => (mediaTypeFilter = "all")}
			>
				All
				<span class="ml-1 text-xs text-muted-foreground">({mediaTypeCounts().all})</span>
				{#if mediaTypeFilter === "all"}
					<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
				{/if}
			</button>
			<button
				class="relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary {mediaTypeFilter === 'movie' ? 'text-primary' : 'text-muted-foreground'}"
				onclick={() => (mediaTypeFilter = "movie")}
			>
				Movies
				<span class="ml-1 text-xs text-muted-foreground">({mediaTypeCounts().movie})</span>
				{#if mediaTypeFilter === "movie"}
					<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
				{/if}
			</button>
			<button
				class="relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary {mediaTypeFilter === 'tv' ? 'text-primary' : 'text-muted-foreground'}"
				onclick={() => (mediaTypeFilter = "tv")}
			>
				Series
				<span class="ml-1 text-xs text-muted-foreground">({mediaTypeCounts().tv})</span>
				{#if mediaTypeFilter === "tv"}
					<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
				{/if}
			</button>
			<button
				class="relative px-4 py-2 text-sm font-medium transition-colors hover:text-primary {mediaTypeFilter === 'music' ? 'text-primary' : 'text-muted-foreground'}"
				onclick={() => (mediaTypeFilter = "music")}
			>
				Music
				<span class="ml-1 text-xs text-muted-foreground">({mediaTypeCounts().music})</span>
				{#if mediaTypeFilter === "music"}
					<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>
				{/if}
			</button>
		</div>

		<!-- Search and filters -->
		<div class="flex flex-wrap gap-4">
			<div class="flex-1 min-w-[200px]">
				<input
					type="text"
					placeholder="Search media..."
					bind:value={searchTerm}
					class="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>
			<select
				bind:value={monitoredFilter}
				class="rounded-lg border bg-background px-4 py-2 text-sm"
			>
				<option value="all">All</option>
				<option value="monitored">Monitored</option>
				<option value="unmonitored">Unmonitored</option>
			</select>
		</div>
	</div>

	<!-- Media Table -->
	{#if isLoading}
		<div class="rounded-lg border">
			<div class="divide-y">
				{#each Array(10) as _}
					<div class="flex items-center gap-4 px-4 py-3">
						<div class="h-5 w-5 animate-pulse rounded bg-muted"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-48 animate-pulse rounded bg-muted"></div>
							<div class="h-3 w-24 animate-pulse rounded bg-muted"></div>
						</div>
						<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-32 animate-pulse rounded bg-muted"></div>
					</div>
				{/each}
			</div>
		</div>
	{:else if filteredMedia().length === 0}
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="64"
				height="64"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="text-muted-foreground mb-4"
			>
				<rect width="18" height="18" x="3" y="3" rx="2" />
				<path d="m9 12 2 2 4-4" />
			</svg>
			<h2 class="text-xl font-semibold">No media found</h2>
			<p class="text-muted-foreground mt-1">
				{searchTerm ? "Try adjusting your search" : "Add some media to get started"}
			</p>
		</div>
	{:else}
		<div class="rounded-lg border">
			<!-- Table header -->
			<div class="flex items-center gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground">
				<div class="flex items-center">
					<input
						type="checkbox"
						checked={allVisibleSelected()}
						onchange={toggleSelectAll}
						class="h-4 w-4 rounded border-gray-300"
						aria-label="Select all"
					/>
				</div>
				<div class="flex-1 min-w-0">Title</div>
				<div class="w-16 text-center">Type</div>
				<div class="w-20 text-center hidden sm:block">Year</div>
				<div class="w-24 text-center hidden md:block">Status</div>
				<div class="w-28 hidden lg:block">Quality Profile</div>
				<div class="w-36 hidden xl:block">Root Folder</div>
				<div class="w-24 text-center">Monitored</div>
			</div>

			<!-- Table body -->
			<div class="divide-y">
				{#each filteredMedia() as item}
					<button
						type="button"
						class="flex w-full items-center gap-4 px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left {selectedIds.has(item._id) ? 'bg-primary/5' : ''}"
						onclick={() => toggleSelection(item)}
					>
						<!-- Checkbox - stop propagation to prevent row toggle when clicking checkbox -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events -->
						<label class="flex items-center" onclick={(e: MouseEvent) => e.stopPropagation()}>
							<input
								type="checkbox"
								checked={selectedIds.has(item._id)}
								onchange={() => toggleSelection(item)}
								class="h-4 w-4 rounded border-gray-300"
								aria-label="Select {item.title}"
							/>
						</label>

						<!-- Title -->
						<div class="flex-1 min-w-0">
							<div class="font-medium truncate">{item.title}</div>
							{#if item.episodeInfo}
								<div class="text-xs text-muted-foreground">{item.episodeInfo}</div>
							{:else if item.albumInfo}
								<div class="text-xs text-muted-foreground">{item.albumInfo}</div>
							{/if}
						</div>

						<!-- Type badge -->
						<div class="w-16 flex justify-center">
							<span class="px-2 py-0.5 rounded text-xs font-medium text-white {getMediaTypeColor(item.mediaType)}">
								{getMediaTypeLabel(item.mediaType)}
							</span>
						</div>

						<!-- Year -->
						<div class="w-20 text-center text-muted-foreground hidden sm:block">
							{item.year ?? "-"}
						</div>

						<!-- Status -->
						<div class="w-24 text-center text-muted-foreground hidden md:block">
							{item.displayStatus}
						</div>

						<!-- Quality Profile -->
						<div class="w-28 truncate text-muted-foreground hidden lg:block">
							{getQualityProfileName(item.qualityProfileId)}
						</div>

						<!-- Root Folder -->
						<div class="w-36 truncate text-muted-foreground hidden xl:block" title={getRootFolderPath(item.rootFolderId)}>
							{getRootFolderPath(item.rootFolderId)}
						</div>

						<!-- Monitored -->
						<div class="w-24 flex justify-center">
							{#if item.monitored}
								<span class="inline-flex items-center gap-1 text-green-600">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" />
										<path d="m9 12 2 2 4-4" />
									</svg>
									<span class="text-xs">Yes</span>
								</span>
							{:else}
								<span class="inline-flex items-center gap-1 text-muted-foreground">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<circle cx="12" cy="12" r="10" />
										<path d="m15 9-6 6" />
										<path d="m9 9 6 6" />
									</svg>
									<span class="text-xs">No</span>
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Selection info -->
		{#if selectedIds.size > 0}
			<div class="text-sm text-muted-foreground">
				{selectedIds.size} of {filteredMedia().length} items selected
			</div>
		{/if}
	{/if}
</div>

<!-- Bulk Actions Bar -->
<BulkActionsBar
	{selectedIds}
	{selectedMediaTypes}
	onClearSelection={clearSelection}
	onUpdateComplete={handleUpdateComplete}
/>
