<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { page } from "$app/stores";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const client = useConvexClient();

// Get movie ID from URL - use a function to get reactive query args
const movieQuery = useQuery(api.movies.get, () => ({ id: $page.params.id as Id<"media"> }));

// Helper to get current ID
function getMovieId() {
	return $page.params.id as Id<"media">;
}

async function toggleMonitored() {
	if (!movieQuery.data) return;
	await client.mutation(api.movies.update, {
		id: getMovieId(),
		monitored: !movieQuery.data.monitored,
	});
}

async function deleteMovie() {
	if (!confirm("Are you sure you want to delete this movie from your library?")) return;
	await client.mutation(api.movies.remove, { id: getMovieId() });
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
