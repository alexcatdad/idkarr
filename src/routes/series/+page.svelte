<script lang="ts">
import { useQuery } from "convex-svelte";
import AddSeriesModal from "$lib/components/AddSeriesModal.svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";

let showAddModal = $state(false);

// Query all series
const seriesQuery = useQuery(api.series.list, {});

// Search state
let searchTerm = $state("");
let statusFilter = $state<"all" | "continuing" | "ended" | "upcoming">("all");
let monitoredFilter = $state<"all" | "monitored" | "unmonitored">("all");

// Filtered series
const filteredSeries = $derived(() => {
	if (!seriesQuery.data) return [];

	let result = seriesQuery.data;

	// Search filter
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		result = result.filter(
			(s) => s.title.toLowerCase().includes(term) || s.sortTitle?.toLowerCase().includes(term),
		);
	}

	// Status filter (status is directly on the media object, not metadata)
	if (statusFilter !== "all") {
		result = result.filter((s) => s.status === statusFilter);
	}

	// Monitored filter
	if (monitoredFilter === "monitored") {
		result = result.filter((s) => s.monitored);
	} else if (monitoredFilter === "unmonitored") {
		result = result.filter((s) => !s.monitored);
	}

	return result;
});

// Episode counts are at root level (added by list query), not in metadata
function formatEpisodeProgress(series: NonNullable<typeof seriesQuery.data>[number]) {
	return `${series.episodeFileCount ?? 0}/${series.episodeCount ?? 0}`;
}

function getStatusColor(status?: string): string {
	switch (status) {
		case "continuing":
			return "bg-green-500";
		case "ended":
			return "bg-gray-500";
		case "upcoming":
			return "bg-blue-500";
		default:
			return "bg-gray-400";
	}
}

function getStatusLabel(status?: string): string {
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
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Series</h1>
			<p class="text-muted-foreground">Manage your TV series library</p>
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
			Add Series
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<div class="flex-1 min-w-[200px]">
			<input
				type="text"
				placeholder="Search series..."
				bind:value={searchTerm}
				class="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
			/>
		</div>
		<select
			bind:value={statusFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All Status</option>
			<option value="continuing">Continuing</option>
			<option value="ended">Ended</option>
			<option value="upcoming">Upcoming</option>
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

	<!-- Series Grid -->
	{#if seriesQuery.isLoading}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(8) as _}
				<div class="rounded-lg border bg-card overflow-hidden">
					<div class="aspect-[2/3] animate-pulse bg-muted"></div>
					<div class="p-4 space-y-2">
						<div class="h-5 animate-pulse rounded bg-muted"></div>
						<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredSeries().length === 0}
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
				<rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
				<polyline points="17 2 12 7 7 2" />
			</svg>
			<h2 class="text-xl font-semibold">No series found</h2>
			<p class="text-muted-foreground mt-1">
				{searchTerm ? "Try adjusting your search" : "Add a series to get started"}
			</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filteredSeries() as series}
				<a
					href="/series/{series._id}"
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
								<rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
								<polyline points="17 2 12 7 7 2" />
							</svg>
						</div>
						<!-- Status badge (status is directly on series, not metadata) -->
						<div class="absolute top-2 right-2">
							<span
								class="px-2 py-1 rounded text-xs font-medium text-white {getStatusColor(series.status)}"
							>
								{getStatusLabel(series.status)}
							</span>
						</div>
						<!-- Monitored indicator -->
						{#if !series.monitored}
							<div
								class="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium"
							>
								Unmonitored
							</div>
						{/if}
						<!-- Percent complete badge -->
						{#if series.percentComplete !== undefined && series.episodeCount > 0}
							<div
								class="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-medium {series.percentComplete === 100
									? 'bg-green-500 text-white'
									: 'bg-muted text-muted-foreground'}"
							>
								{series.percentComplete}%
							</div>
						{/if}
					</div>
					<!-- Info -->
					<div class="p-4">
						<h3 class="font-semibold truncate group-hover:text-primary transition-colors">
							{series.title}
						</h3>
						<div class="flex items-center justify-between mt-1 text-sm text-muted-foreground">
							<span>{series.year ?? "N/A"}</span>
							<span>{formatEpisodeProgress(series)} episodes</span>
						</div>
						<div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
							<span>{series.seasonCount ?? 0} seasons</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<AddSeriesModal bind:open={showAddModal} onClose={() => (showAddModal = false)} />
