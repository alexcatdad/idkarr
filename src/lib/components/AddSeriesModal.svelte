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
// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
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

// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
async function handleAddSeries(show: any) {
	isAdding = true;
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
