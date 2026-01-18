<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";

interface Props {
	open: boolean;
	onClose: () => void;
}

let { open = $bindable(), onClose }: Props = $props();

const client = useConvexClient();

let searchQuery = $state("");
// biome-ignore lint/suspicious/noExplicitAny: TMDB API response shape
let searchResults = $state<any[]>([]);
let isSearching = $state(false);
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

// biome-ignore lint/suspicious/noExplicitAny: TMDB search result
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
			year: details.year ?? undefined,
			overview: details.overview,
			tmdbId: details.tmdbId,
			imdbId: details.imdbId ?? undefined,
			monitored: true,
			status: mapTmdbStatus(details.status),
			runtime: details.runtime ?? undefined,
			studio: details.studio ?? undefined,
			certification: details.certification ?? undefined,
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

function mapTmdbStatus(
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
