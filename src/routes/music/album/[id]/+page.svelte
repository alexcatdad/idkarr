<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { page } from "$app/stores";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const client = useConvexClient();

// Get album ID from URL - use a function to get reactive query args
const albumQuery = useQuery(api.music.getAlbum, () => ({
	id: $page.params.id as Id<"albums">,
}));

// Helper to get current ID
function getAlbumId() {
	return $page.params.id as Id<"albums">;
}

async function toggleMonitored() {
	await client.mutation(api.music.toggleAlbumMonitored, {
		id: getAlbumId(),
	});
}

function formatDuration(milliseconds?: number): string {
	if (!milliseconds) return "--:--";
	const totalSeconds = Math.floor(milliseconds / 1000);
	const mins = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTotalDuration(tracks: Array<{ duration?: number }>): string {
	const totalMs = tracks.reduce((acc, t) => acc + (t.duration ?? 0), 0);
	if (totalMs === 0) return "";
	const totalSeconds = Math.floor(totalMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	if (hours > 0) {
		return `${hours}h ${mins}m`;
	}
	return `${mins} min`;
}

function formatYear(timestamp?: number): string {
	if (!timestamp) return "Unknown";
	return new Date(timestamp).getFullYear().toString();
}

function formatReleaseDate(timestamp?: number): string {
	if (!timestamp) return "Unknown";
	return new Date(timestamp).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

// Group tracks by disc number
function groupTracksByDisc(
	tracks: Array<{
		discNumber?: number;
		trackNumber: number;
		title: string;
		duration?: number;
		hasFile: boolean;
	}>,
): Map<number, typeof tracks> {
	const discs = new Map<number, typeof tracks>();

	for (const track of tracks) {
		const discNum = track.discNumber ?? 1;
		const existing = discs.get(discNum);
		if (existing) {
			existing.push(track);
		} else {
			discs.set(discNum, [track]);
		}
	}

	return discs;
}
</script>

<svelte:head>
	<title>{albumQuery.data?.title ?? "Album"} - idkarr</title>
</svelte:head>

{#if albumQuery.isLoading}
	<div class="space-y-6">
		<div class="h-64 animate-pulse rounded-lg bg-muted"></div>
		<div class="h-8 w-1/3 animate-pulse rounded bg-muted"></div>
		<div class="h-4 w-2/3 animate-pulse rounded bg-muted"></div>
	</div>
{:else if !albumQuery.data}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<h2 class="text-xl font-semibold">Album not found</h2>
		<p class="text-muted-foreground mt-1">This album doesn't exist in your library</p>
		<Button class="mt-4" onclick={() => window.history.back()}>Go Back</Button>
	</div>
{:else}
	{@const album = albumQuery.data}
	{@const discGroups = groupTracksByDisc(album.tracks ?? [])}
	{@const hasMultipleDiscs = discGroups.size > 1}
	{@const totalDuration = formatTotalDuration(album.tracks ?? [])}

	<div class="space-y-6">
		<!-- Album Header -->
		<div class="rounded-lg border bg-card overflow-hidden">
			<div class="flex flex-col sm:flex-row gap-6 p-6">
				<!-- Album Cover -->
				<div class="w-48 h-48 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center shadow-lg">
					{#if album.coverUrl}
						<img
							src={album.coverUrl}
							alt={album.title}
							class="w-full h-full object-cover"
						/>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="64"
							height="64"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1"
							class="text-muted-foreground"
						>
							<circle cx="12" cy="12" r="10" />
							<circle cx="12" cy="12" r="3" />
						</svg>
					{/if}
				</div>

				<!-- Album Info -->
				<div class="flex-1 min-w-0">
					<div class="flex items-start gap-3">
						<span
							class="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground uppercase"
						>
							{album.albumType ?? "Album"}
						</span>
					</div>

					<h1 class="text-3xl font-bold mt-2">{album.title}</h1>

					{#if album.artist}
						<a
							href="/music/{album.artist._id}"
							class="text-lg text-muted-foreground hover:text-primary transition-colors mt-1 inline-block"
						>
							{album.artist.title}
						</a>
					{/if}

					<div class="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
						<span>{formatYear(album.releaseDate)}</span>
						<span class="w-1 h-1 rounded-full bg-muted-foreground"></span>
						<span>{album.trackCount ?? 0} tracks</span>
						{#if totalDuration}
							<span class="w-1 h-1 rounded-full bg-muted-foreground"></span>
							<span>{totalDuration}</span>
						{/if}
						<span class="w-1 h-1 rounded-full bg-muted-foreground"></span>
						<span
							class="px-2 py-0.5 rounded text-xs {album.monitored
								? 'bg-green-500/10 text-green-500'
								: 'bg-muted text-muted-foreground'}"
						>
							{album.monitored ? "Monitored" : "Unmonitored"}
						</span>
					</div>

					<!-- Progress -->
					{#if album.trackCount && album.trackCount > 0}
						<div class="mt-4">
							<div class="flex justify-between text-sm mb-1">
								<span class="text-muted-foreground">Collection Progress</span>
								<span>{album.trackFileCount ?? 0}/{album.trackCount} tracks</span>
							</div>
							<div class="h-2 bg-muted rounded-full overflow-hidden">
								<div
									class="h-full bg-primary transition-all"
									style="width: {((album.trackFileCount ?? 0) / album.trackCount) * 100}%"
								></div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3">
			<Button variant={album.monitored ? "default" : "outline"} onclick={toggleMonitored}>
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
					{#if album.monitored}
						<path
							d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
						/>
					{:else}
						<path
							d="M17.5 8A3.5 3.5 0 0 1 21 11.5a3.5 3.5 0 0 1-.67 2.06L12 22l-8.33-8.44A3.5 3.5 0 0 1 3 11.5 3.5 3.5 0 0 1 6.5 8c1.08 0 2.08.46 2.78 1.22L12 12l2.72-2.78A3.5 3.5 0 0 1 17.5 8Z"
						/>
					{/if}
				</svg>
				{album.monitored ? "Monitored" : "Unmonitored"}
			</Button>
			<Button variant="outline">
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
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
				Search for Downloads
			</Button>
			{#if album.artist}
				<Button variant="ghost" onclick={() => window.history.back()}>
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
						<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
					</svg>
					Back to Artist
				</Button>
			{/if}
		</div>

		<!-- Track Listing -->
		<div class="rounded-lg border bg-card overflow-hidden">
			<div class="p-4 border-b">
				<h2 class="text-lg font-semibold">Track Listing</h2>
				{#if album.releaseDate}
					<p class="text-sm text-muted-foreground mt-1">
						Released {formatReleaseDate(album.releaseDate)}
					</p>
				{/if}
			</div>

			{#if album.tracks && album.tracks.length > 0}
				<div class="divide-y">
					{#each discGroups as [discNumber, tracks]}
						{#if hasMultipleDiscs}
							<div class="px-4 py-2 bg-muted/50">
								<span class="text-sm font-medium text-muted-foreground">
									Disc {discNumber}
								</span>
							</div>
						{/if}
						{#each tracks as track}
							<div
								class="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
							>
								<!-- Track Number -->
								<div class="w-8 text-center text-sm text-muted-foreground">
									{track.trackNumber}
								</div>

								<!-- File Status Indicator -->
								<div class="w-5 flex items-center justify-center">
									{#if track.hasFile}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											class="text-green-500"
										>
											<path d="M20 6 9 17l-5-5" />
										</svg>
									{:else}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											class="text-muted-foreground/50"
										>
											<circle cx="12" cy="12" r="10" />
										</svg>
									{/if}
								</div>

								<!-- Track Title -->
								<div class="flex-1 min-w-0">
									<span
										class="truncate {track.hasFile
											? ''
											: 'text-muted-foreground'}"
									>
										{track.title}
									</span>
								</div>

								<!-- Duration -->
								<div class="text-sm text-muted-foreground tabular-nums">
									{formatDuration(track.duration)}
								</div>
							</div>
						{/each}
					{/each}
				</div>
			{:else}
				<div class="p-8 text-center text-muted-foreground">
					<p>No tracks found for this album</p>
				</div>
			{/if}
		</div>

		<!-- Album Overview -->
		{#if album.overview}
			<div class="rounded-lg border bg-card p-6">
				<h2 class="text-lg font-semibold mb-3">About this Album</h2>
				<p class="text-muted-foreground leading-relaxed">{album.overview}</p>
			</div>
		{/if}

		<!-- Album Info Sidebar -->
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Statistics -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="text-lg font-semibold mb-3">Statistics</h2>
				<div class="space-y-3 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Total Tracks</span>
						<span>{album.trackCount ?? 0}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Files Present</span>
						<span>{album.trackFileCount ?? 0}</span>
					</div>
					{#if album.trackCount && album.trackCount > 0}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Completion</span>
							<span>{Math.round(((album.trackFileCount ?? 0) / album.trackCount) * 100)}%</span>
						</div>
					{/if}
					{#if totalDuration}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Total Duration</span>
							<span>{totalDuration}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Information -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="text-lg font-semibold mb-3">Information</h2>
				<div class="space-y-3 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Type</span>
						<span class="capitalize">{album.albumType ?? "Album"}</span>
					</div>
					{#if album.releaseDate}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Release Year</span>
							<span>{formatYear(album.releaseDate)}</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Monitored</span>
						<span>{album.monitored ? "Yes" : "No"}</span>
					</div>
				</div>
			</div>

			<!-- External Links -->
			{#if album.musicBrainzId}
				<div class="rounded-lg border bg-card p-6">
					<h2 class="text-lg font-semibold mb-3">Links</h2>
					<div class="flex flex-wrap gap-2">
						<a
							href="https://musicbrainz.org/release/{album.musicBrainzId}"
							target="_blank"
							rel="noopener noreferrer"
							class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors"
						>
							MusicBrainz
						</a>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
