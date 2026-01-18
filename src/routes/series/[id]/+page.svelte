<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { page } from "$app/stores";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const client = useConvexClient();

// Get series ID from URL - use a function to get reactive query args
const seriesQuery = useQuery(api.series.get, () => ({ id: $page.params.id as Id<"media"> }));

// Helper to get current ID
function getSeriesId() {
	return $page.params.id as Id<"media">;
}

async function toggleMonitored() {
	if (!seriesQuery.data) return;
	await client.mutation(api.series.update, {
		id: getSeriesId(),
		monitored: !seriesQuery.data.monitored,
	});
}

async function deleteSeries() {
	if (!confirm("Delete this series and all its seasons/episodes?")) return;
	await client.mutation(api.series.remove, { id: getSeriesId() });
	window.history.back();
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
							<span>{series.seasons?.length ?? 0} Seasons</span>
							<span>•</span>
							<span>{series.seasons?.reduce((acc: number, s: { episodeFileCount?: number }) => acc + (s.episodeFileCount ?? 0), 0) ?? 0}/{series.seasons?.reduce((acc: number, s: { episodeCount?: number }) => acc + (s.episodeCount ?? 0), 0) ?? 0} Episodes</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3">
			<Button variant={series.monitored ? "default" : "outline"} onclick={toggleMonitored}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
					{#if series.monitored}
						<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
					{:else}
						<path d="M17.5 8A3.5 3.5 0 0 1 21 11.5a3.5 3.5 0 0 1-.67 2.06L12 22l-8.33-8.44A3.5 3.5 0 0 1 3 11.5 3.5 3.5 0 0 1 6.5 8c1.08 0 2.08.46 2.78 1.22L12 12l2.72-2.78A3.5 3.5 0 0 1 17.5 8Z"/>
					{/if}
				</svg>
				{series.monitored ? "Monitored" : "Unmonitored"}
			</Button>
			<Button variant="outline">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
					<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
				</svg>
				Search
			</Button>
			<Button variant="outline" onclick={deleteSeries}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
					<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
				</svg>
				Delete
			</Button>
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
						{#if series.rootFolder}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Root Folder</span>
								<span class="truncate max-w-32">{series.rootFolder.path}</span>
							</div>
						{/if}
					</div>
				</div>

				<div class="rounded-lg border bg-card p-6">
					<h2 class="text-lg font-semibold mb-3">Links</h2>
					<div class="flex flex-wrap gap-2">
						{#if series.tmdbId}
							<a href="https://www.themoviedb.org/tv/{series.tmdbId}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors">TMDB</a>
						{/if}
						{#if series.tvdbId}
							<a href="https://thetvdb.com/?id={series.tvdbId}&tab=series" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors">TVDB</a>
						{/if}
						{#if series.imdbId}
							<a href="https://www.imdb.com/title/{series.imdbId}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors">IMDB</a>
						{/if}
					</div>
				</div>

				<!-- Tags -->
				{#if series.tags && series.tags.length > 0}
					<div class="rounded-lg border bg-card p-6">
						<h2 class="text-lg font-semibold mb-3">Tags</h2>
						<div class="flex flex-wrap gap-2">
							{#each series.tags as tag}
								{#if tag}
									<span class="px-3 py-1 rounded-full bg-muted text-sm">{tag.name}</span>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
