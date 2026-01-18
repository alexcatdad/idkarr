<script lang="ts">
import { useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";

// Query all artists
const artistsQuery = useQuery(api.music.listArtists, {});

// Search state
let searchTerm = $state("");
let monitoredFilter = $state<"all" | "monitored" | "unmonitored">("all");

// Filtered artists
const filteredArtists = $derived(() => {
	if (!artistsQuery.data) return [];

	let result = artistsQuery.data;

	// Search filter
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		result = result.filter(
			(a) => a.title.toLowerCase().includes(term) || a.sortTitle?.toLowerCase().includes(term),
		);
	}

	// Monitored filter
	if (monitoredFilter === "monitored") {
		result = result.filter((a) => a.monitored);
	} else if (monitoredFilter === "unmonitored") {
		result = result.filter((a) => !a.monitored);
	}

	return result;
});

// Track counts are at root level (added by listArtists query), not in metadata
function formatTrackProgress(artist: NonNullable<typeof artistsQuery.data>[number]) {
	return `${artist.trackFileCount ?? 0}/${artist.trackCount ?? 0}`;
}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Music</h1>
			<p class="text-muted-foreground">Manage your music library</p>
		</div>
		<Button>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mr-2"
				><path d="M5 12h14" /><path d="M12 5v14" /></svg
			>
			Add Artist
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<div class="flex-1 min-w-[200px]">
			<input
				type="text"
				placeholder="Search artists..."
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

	<!-- Artists Grid -->
	{#if artistsQuery.isLoading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{#each Array(10) as _}
				<div class="rounded-lg border bg-card overflow-hidden">
					<div class="aspect-square animate-pulse bg-muted"></div>
					<div class="p-4 space-y-2">
						<div class="h-5 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredArtists().length === 0}
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
				<path d="M9 18V5l12-2v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="18" cy="16" r="3" />
			</svg>
			<h2 class="text-xl font-semibold">No artists found</h2>
			<p class="text-muted-foreground mt-1">
				{searchTerm ? "Try adjusting your search" : "Add an artist to get started"}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{#each filteredArtists() as artist}
				<a
					href="/music/{artist._id}"
					class="group rounded-lg border bg-card overflow-hidden hover:border-primary transition-colors"
				>
					<!-- Artist Image -->
					<div class="aspect-square bg-muted relative">
						<div
							class="w-full h-full flex items-center justify-center text-muted-foreground"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="48"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M9 18V5l12-2v13" />
								<circle cx="6" cy="18" r="3" />
								<circle cx="18" cy="16" r="3" />
							</svg>
						</div>
						<!-- Monitored indicator -->
						{#if !artist.monitored}
							<div
								class="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium"
							>
								Unmonitored
							</div>
						{/if}
						<!-- Percent complete badge -->
						{#if artist.percentComplete !== undefined && artist.trackCount > 0}
							<div
								class="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium {artist.percentComplete === 100
									? 'bg-green-500 text-white'
									: 'bg-muted text-muted-foreground'}"
							>
								{artist.percentComplete}%
							</div>
						{/if}
					</div>
					<!-- Info -->
					<div class="p-4">
						<h3 class="font-semibold truncate group-hover:text-primary transition-colors">
							{artist.title}
						</h3>
						<div class="flex items-center justify-between mt-1 text-sm text-muted-foreground">
							<!-- albumCount is at root level from the query -->
							<span>{artist.albumCount ?? 0} albums</span>
							<span>{formatTrackProgress(artist)} tracks</span>
						</div>
						{#if artist.metadata?.artistType}
							<p class="text-xs text-muted-foreground mt-1 truncate">
								{artist.metadata.artistType}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
