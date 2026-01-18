<script lang="ts">
import { useQuery } from "convex-svelte";
import { api } from "../../convex/_generated/api";

// Query all collections
const collectionsQuery = useQuery(api.collections.list, {});

// Search state
let searchTerm = $state("");

// Filtered collections
const filteredCollections = $derived(() => {
	if (!collectionsQuery.data) return [];

	let result = collectionsQuery.data;

	// Search filter
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		result = result.filter((c: (typeof collectionsQuery.data)[number]) =>
			c.name.toLowerCase().includes(term),
		);
	}

	return result;
});

// Calculate completion percentage
function getCompletionPercent(owned: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((owned / total) * 100);
}

// Get progress bar color based on completion
function getProgressColor(percent: number): string {
	if (percent === 100) return "bg-green-500";
	if (percent >= 75) return "bg-blue-500";
	if (percent >= 50) return "bg-yellow-500";
	return "bg-gray-400";
}

// Build TMDB poster URL
function getPosterUrl(posterPath?: string): string | null {
	if (!posterPath) return null;
	return `https://image.tmdb.org/t/p/w300${posterPath}`;
}
</script>

<svelte:head>
	<title>Collections - idkarr</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Collections</h1>
			<p class="text-muted-foreground">Browse movie collections</p>
		</div>
	</div>

	<!-- Search -->
	<div class="flex flex-wrap gap-4">
		<div class="flex-1 min-w-[200px]">
			<input
				type="text"
				placeholder="Search collections..."
				bind:value={searchTerm}
				class="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
			/>
		</div>
	</div>

	<!-- Collections Grid -->
	{#if collectionsQuery.isLoading}
		<div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each Array(10) as _}
				<div class="rounded-lg border bg-card overflow-hidden">
					<div class="aspect-[2/3] animate-pulse bg-muted"></div>
					<div class="p-4 space-y-2">
						<div class="h-5 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
						<div class="h-2 animate-pulse rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredCollections().length === 0}
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
				<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
				<polyline points="17 21 17 13 7 13 7 21" />
				<polyline points="7 3 7 8 15 8" />
			</svg>
			<h2 class="text-xl font-semibold">No collections yet</h2>
			<p class="text-muted-foreground mt-1">
				{searchTerm
					? "Try adjusting your search"
					: "Collections appear when you add movies that belong to a collection"}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each filteredCollections() as collection}
				{@const percent = getCompletionPercent(collection.ownedCount, collection.movieCount)}
				<a
					href="/collections/{collection._id}"
					class="group rounded-lg border bg-card overflow-hidden hover:border-primary transition-colors"
				>
					<!-- Poster -->
					<div class="aspect-[2/3] bg-muted relative">
						{#if getPosterUrl(collection.posterPath)}
							<img
								src={getPosterUrl(collection.posterPath)}
								alt={collection.name}
								class="w-full h-full object-cover"
							/>
						{:else}
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
									<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
									<polyline points="17 21 17 13 7 13 7 21" />
									<polyline points="7 3 7 8 15 8" />
								</svg>
							</div>
						{/if}
						<!-- Completion badge -->
						{#if collection.movieCount > 0}
							<div
								class="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium {percent === 100
									? 'bg-green-500 text-white'
									: 'bg-background/80 text-foreground backdrop-blur-sm'}"
							>
								{percent}%
							</div>
						{/if}
					</div>
					<!-- Info -->
					<div class="p-4">
						<h3 class="font-semibold truncate group-hover:text-primary transition-colors">
							{collection.name}
						</h3>
						<div class="flex items-center justify-between mt-1 text-sm text-muted-foreground">
							<span>{collection.ownedCount}/{collection.movieCount} movies</span>
						</div>
						<!-- Progress bar -->
						{#if collection.movieCount > 0}
							<div class="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
								<div
									class="h-full transition-all {getProgressColor(percent)}"
									style="width: {percent}%"
								></div>
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
