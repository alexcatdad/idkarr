<script lang="ts">
import { useQuery } from "convex-svelte";
import AddMovieModal from "$lib/components/AddMovieModal.svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";

let showAddModal = $state(false);

// Query all movies
const moviesQuery = useQuery(api.movies.list, {});

// Search and filter state
let searchTerm = $state("");
let statusFilter = $state<"all" | "released" | "announced" | "inCinemas">("all");
let monitoredFilter = $state<"all" | "monitored" | "unmonitored">("all");

// Filtered movies
const filteredMovies = $derived(() => {
	if (!moviesQuery.data) return [];

	let result = moviesQuery.data;

	// Search filter
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		result = result.filter(
			(m) => m.title.toLowerCase().includes(term) || m.sortTitle?.toLowerCase().includes(term),
		);
	}

	// Status filter (status is on the media object, not metadata)
	if (statusFilter !== "all") {
		result = result.filter((m) => m.status === statusFilter);
	}

	// Monitored filter
	if (monitoredFilter === "monitored") {
		result = result.filter((m) => m.monitored);
	} else if (monitoredFilter === "unmonitored") {
		result = result.filter((m) => !m.monitored);
	}

	return result;
});

function getStatusColor(status?: string): string {
	switch (status) {
		case "released":
			return "bg-green-500";
		case "inCinemas":
			return "bg-blue-500";
		case "announced":
			return "bg-yellow-500";
		default:
			return "bg-gray-400";
	}
}

function getStatusLabel(status?: string): string {
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
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Movies</h1>
			<p class="text-muted-foreground">Manage your movie library</p>
		</div>
		<Button onclick={() => (showAddModal = true)}>
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
			Add Movie
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<div class="flex-1 min-w-[200px]">
			<input
				type="text"
				placeholder="Search movies..."
				bind:value={searchTerm}
				class="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
			/>
		</div>
		<select
			bind:value={statusFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All Status</option>
			<option value="released">Released</option>
			<option value="inCinemas">In Cinemas</option>
			<option value="announced">Announced</option>
		</select>
		<select
			bind:value={monitoredFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All</option>
			<option value="monitored">Monitored</option>
			<option value="unmonitored">Unmonitored</option>
		</select>
	</div>

	<!-- Movies Grid -->
	{#if moviesQuery.isLoading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{#each Array(10) as _}
				<div class="rounded-lg border bg-card overflow-hidden">
					<div class="aspect-[2/3] animate-pulse bg-muted"></div>
					<div class="p-4 space-y-2">
						<div class="h-5 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredMovies().length === 0}
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
				<path d="M7 3v18" />
				<path d="M3 7.5h4" />
				<path d="M3 12h18" />
				<path d="M3 16.5h4" />
				<path d="M17 3v18" />
				<path d="M17 7.5h4" />
				<path d="M17 16.5h4" />
			</svg>
			<h2 class="text-xl font-semibold">No movies found</h2>
			<p class="text-muted-foreground mt-1">
				{searchTerm ? "Try adjusting your search" : "Add a movie to get started"}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
			{#each filteredMovies() as movie}
				<a
					href="/movies/{movie._id}"
					class="group rounded-lg border bg-card overflow-hidden hover:border-primary transition-colors"
				>
					<!-- Poster -->
					<div class="aspect-[2/3] bg-muted relative">
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
								<rect width="18" height="18" x="3" y="3" rx="2" />
								<path d="M7 3v18" />
								<path d="M3 7.5h4" />
								<path d="M3 12h18" />
								<path d="M3 16.5h4" />
								<path d="M17 3v18" />
								<path d="M17 7.5h4" />
								<path d="M17 16.5h4" />
							</svg>
						</div>
						<!-- Status badge (status is on the movie object, not metadata) -->
						<div class="absolute top-2 right-2">
							<span
								class="px-2 py-1 rounded text-xs font-medium text-white {getStatusColor(movie.status)}"
							>
								{getStatusLabel(movie.status)}
							</span>
						</div>
						<!-- Has file indicator -->
						{#if movie.hasFile}
							<div
								class="absolute bottom-2 right-2 bg-green-500/90 text-white p-1.5 rounded"
								title="File available"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M20 6 9 17l-5-5" />
								</svg>
							</div>
						{/if}
						<!-- Monitored indicator -->
						{#if !movie.monitored}
							<div
								class="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium"
							>
								Unmonitored
							</div>
						{/if}
					</div>
					<!-- Info -->
					<div class="p-4">
						<h3 class="font-semibold truncate group-hover:text-primary transition-colors">
							{movie.title}
						</h3>
						<div class="flex items-center justify-between mt-1 text-sm text-muted-foreground">
							<span>{movie.year ?? "N/A"}</span>
							{#if movie.metadata?.runtime}
								<span>{movie.metadata.runtime} min</span>
							{/if}
						</div>
						{#if movie.metadata?.studio}
							<p class="text-xs text-muted-foreground mt-1 truncate">
								{movie.metadata.studio}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<AddMovieModal bind:open={showAddModal} onClose={() => (showAddModal = false)} />
