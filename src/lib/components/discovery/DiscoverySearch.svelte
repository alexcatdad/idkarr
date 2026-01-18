<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";

type MediaTab = "movies" | "tv";

// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
type TMDBResult = any;

interface Props {
	onAddSuccess?: () => void;
}

let { onAddSuccess }: Props = $props();

const client = useConvexClient();

let searchQuery = $state("");
let activeTab = $state<MediaTab>("movies");
let searchResults = $state<TMDBResult[]>([]);
let isSearching = $state(false);
let isAdding = $state<number | null>(null);
let error = $state<string | null>(null);
let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

// Debounced search effect
$effect(() => {
	const query = searchQuery.trim();

	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}

	if (!query) {
		searchResults = [];
		return;
	}

	debounceTimer = setTimeout(() => {
		performSearch(query);
	}, 300);

	return () => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	};
});

// Clear results when switching tabs
$effect(() => {
	const _ = activeTab;
	if (searchQuery.trim()) {
		performSearch(searchQuery.trim());
	}
});

async function performSearch(query: string) {
	isSearching = true;
	error = null;

	try {
		if (activeTab === "movies") {
			const results = await client.action(api.tmdb.searchMovies, { query });
			searchResults = results.results;
		} else {
			const results = await client.action(api.tmdb.searchTV, { query });
			searchResults = results.results;
		}
	} catch (e) {
		error = e instanceof Error ? e.message : "Search failed";
		searchResults = [];
	} finally {
		isSearching = false;
	}
}

async function handleAddMovie(movie: TMDBResult) {
	isAdding = movie.tmdbId;
	error = null;

	try {
		const details = await client.action(api.tmdb.getMovieDetails, {
			tmdbId: movie.tmdbId,
		});

		await client.mutation(api.movies.add, {
			title: details.title,
			year: details.year ?? undefined,
			overview: details.overview,
			tmdbId: details.tmdbId,
			imdbId: details.imdbId ?? undefined,
			monitored: true,
			status: mapMovieStatus(details.status),
			runtime: details.runtime ?? undefined,
			studio: details.studio ?? undefined,
			certification: details.certification ?? undefined,
		});

		// Remove from results
		searchResults = searchResults.filter((r) => r.tmdbId !== movie.tmdbId);
		onAddSuccess?.();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add movie";
	} finally {
		isAdding = null;
	}
}

async function handleAddSeries(show: TMDBResult) {
	isAdding = show.tmdbId;
	error = null;

	try {
		const details = await client.action(api.tmdb.getTVDetails, {
			tmdbId: show.tmdbId,
		});

		await client.mutation(api.series.add, {
			title: details.title,
			year: details.year ?? undefined,
			overview: details.overview,
			tmdbId: details.tmdbId,
			tvdbId: details.tvdbId ?? undefined,
			imdbId: details.imdbId ?? undefined,
			monitored: true,
			status: details.status,
		});

		// Remove from results
		searchResults = searchResults.filter((r) => r.tmdbId !== show.tmdbId);
		onAddSuccess?.();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add series";
	} finally {
		isAdding = null;
	}
}

function mapMovieStatus(
	status: string,
): "released" | "announced" | "inCinemas" | "upcoming" | "unknown" {
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

function handleAdd(item: TMDBResult) {
	if (activeTab === "movies") {
		handleAddMovie(item);
	} else {
		handleAddSeries(item);
	}
}
</script>

<div class="space-y-4">
	<!-- Search Input -->
	<div class="relative">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
		<input
			type="text"
			placeholder="Search for movies or TV shows..."
			bind:value={searchQuery}
			class="w-full rounded-lg border bg-background pl-12 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
		/>
		{#if isSearching}
			<div class="absolute right-4 top-1/2 -translate-y-1/2">
				<svg
					class="animate-spin h-5 w-5 text-muted-foreground"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="flex gap-2 border-b">
		<button
			onclick={() => (activeTab = "movies")}
			class="px-4 py-2 text-sm font-medium transition-colors relative
				{activeTab === 'movies'
				? 'text-primary'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			Movies
			{#if activeTab === "movies"}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
			{/if}
		</button>
		<button
			onclick={() => (activeTab = "tv")}
			class="px-4 py-2 text-sm font-medium transition-colors relative
				{activeTab === 'tv'
				? 'text-primary'
				: 'text-muted-foreground hover:text-foreground'}"
		>
			TV Shows
			{#if activeTab === "tv"}
				<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
			{/if}
		</button>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
			{error}
		</div>
	{/if}

	<!-- Results Grid -->
	{#if searchResults.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each searchResults as item}
				<div
					class="group rounded-lg border bg-card overflow-hidden hover:border-primary transition-colors"
				>
					<!-- Poster -->
					<div class="aspect-[2/3] bg-muted relative">
						{#if item.posterPath}
							<img
								src={item.posterPath}
								alt={item.title}
								class="w-full h-full object-cover"
							/>
						{:else}
							<div
								class="w-full h-full flex items-center justify-center text-muted-foreground"
							>
								{#if activeTab === "movies"}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1"
									>
										<rect width="18" height="18" x="3" y="3" rx="2" />
										<path d="M7 3v18" />
										<path d="M3 7.5h4" />
										<path d="M3 12h18" />
										<path d="M3 16.5h4" />
										<path d="M17 3v18" />
										<path d="M17 7.5h4" />
										<path d="M17 16.5h4" />
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1"
									>
										<rect width="20" height="15" x="2" y="7" rx="2" />
										<polyline points="17 2 12 7 7 2" />
									</svg>
								{/if}
							</div>
						{/if}
						<!-- Add button overlay -->
						<div
							class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
						>
							<Button onclick={() => handleAdd(item)} disabled={isAdding === item.tmdbId}>
								{#if isAdding === item.tmdbId}
									<svg
										class="animate-spin h-4 w-4 mr-2"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										></path>
									</svg>
									Adding...
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="mr-2"
									>
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
									Add to Library
								{/if}
							</Button>
						</div>
					</div>
					<!-- Info -->
					<div class="p-4">
						<h3 class="font-semibold truncate">{item.title}</h3>
						<p class="text-sm text-muted-foreground">{item.year ?? "Unknown year"}</p>
						{#if item.overview}
							<p class="text-sm text-muted-foreground mt-2 line-clamp-2">{item.overview}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else if searchQuery.trim() && !isSearching}
		<div class="text-center py-12 text-muted-foreground">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
				class="mx-auto mb-4 opacity-50"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<p>No results found for "{searchQuery}"</p>
		</div>
	{:else if !searchQuery.trim()}
		<div class="text-center py-12 text-muted-foreground">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
				class="mx-auto mb-4 opacity-50"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<p>Search for movies or TV shows to add to your library</p>
		</div>
	{/if}
</div>
