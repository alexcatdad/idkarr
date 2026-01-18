<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { page } from "$app/stores";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const client = useConvexClient();

// Get artist ID from URL - use a function to get reactive query args
const artistQuery = useQuery(api.music.getArtist, () => ({
	id: $page.params.id as Id<"media">,
}));

// Helper to get current ID
function getArtistId() {
	return $page.params.id as Id<"media">;
}

async function toggleMonitored() {
	await client.mutation(api.music.toggleArtistMonitored, {
		id: getArtistId(),
	});
}

async function deleteArtist() {
	if (!confirm("Delete this artist and all albums/tracks from your library?")) return;
	await client.mutation(api.music.removeArtist, { id: getArtistId() });
	window.history.back();
}

// Album type for discography
type AlbumInfo = {
	albumType?: string;
	title: string;
	releaseDate?: number;
	trackCount: number;
	trackFileCount: number;
	monitored: boolean;
	coverUrl?: string;
	_id: Id<"albums">;
};

// Group albums by type (Album, EP, Single, etc.)
function groupAlbumsByType(albums: AlbumInfo[]): Map<string, AlbumInfo[]> {
	const groups = new Map<string, AlbumInfo[]>();

	for (const album of albums) {
		const type = album.albumType || "Album";
		const existing = groups.get(type);
		if (existing) {
			existing.push(album);
		} else {
			groups.set(type, [album]);
		}
	}

	// Sort groups by type priority: Album > EP > Single > Other
	const sortedGroups = new Map<string, AlbumInfo[]>();
	const order = ["Album", "EP", "Single"];

	for (const type of order) {
		const albumsOfType = groups.get(type);
		if (albumsOfType) {
			sortedGroups.set(type, albumsOfType);
			groups.delete(type);
		}
	}

	// Add remaining types
	for (const [type, typeAlbums] of groups) {
		sortedGroups.set(type, typeAlbums);
	}

	return sortedGroups;
}

function formatYear(timestamp?: number): string {
	if (!timestamp) return "Unknown";
	return new Date(timestamp).getFullYear().toString();
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
	<title>{artistQuery.data?.title ?? "Artist"} - idkarr</title>
</svelte:head>

{#if artistQuery.isLoading}
	<div class="space-y-6">
		<div class="h-64 animate-pulse rounded-lg bg-muted"></div>
		<div class="h-8 w-1/3 animate-pulse rounded bg-muted"></div>
		<div class="h-4 w-2/3 animate-pulse rounded bg-muted"></div>
	</div>
{:else if !artistQuery.data}
	<div class="flex flex-col items-center justify-center py-16 text-center">
		<h2 class="text-xl font-semibold">Artist not found</h2>
		<p class="text-muted-foreground mt-1">This artist doesn't exist in your library</p>
		<Button class="mt-4" onclick={() => window.history.back()}>Go Back</Button>
	</div>
{:else}
	{@const artist = artistQuery.data}
	{@const albumGroups = groupAlbumsByType(artist.albums ?? [])}
	{@const totalAlbums = artist.albums?.length ?? 0}
	{@const ownedAlbums = artist.albums?.filter((a: AlbumInfo) => a.trackFileCount > 0).length ?? 0}
	{@const totalTracks = artist.albums?.reduce((acc: number, a: AlbumInfo) => acc + a.trackCount, 0) ?? 0}
	{@const ownedTracks = artist.albums?.reduce((acc: number, a: AlbumInfo) => acc + a.trackFileCount, 0) ?? 0}

	<div class="space-y-6">
		<!-- Header with backdrop -->
		<div class="relative rounded-lg overflow-hidden bg-muted h-64">
			<div class="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
			<div class="absolute bottom-0 left-0 right-0 p-6 z-20">
				<div class="flex items-end gap-6">
					<!-- Artist Image -->
					<div class="w-32 h-32 rounded-full bg-card shadow-lg overflow-hidden flex-shrink-0">
						<div class="w-full h-full flex items-center justify-center text-muted-foreground">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="48"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1"
							>
								<path d="M9 18V5l12-2v13" />
								<circle cx="6" cy="18" r="3" />
								<circle cx="18" cy="16" r="3" />
							</svg>
						</div>
					</div>
					<!-- Title & Info -->
					<div class="flex-1">
						<div class="flex items-center gap-3">
							<h1 class="text-3xl font-bold">{artist.title}</h1>
							<span
								class="px-2 py-1 rounded text-xs font-medium text-white {getStatusColor(artist.status)} capitalize"
							>
								{artist.status}
							</span>
						</div>
						<div class="flex items-center gap-3 mt-2 text-muted-foreground">
							{#if artist.metadata?.artistType}
								<span class="capitalize">{artist.metadata.artistType}</span>
								<span>-</span>
							{/if}
							<span>{totalAlbums} Albums</span>
							<span>-</span>
							<span>{ownedTracks}/{totalTracks} Tracks</span>
						</div>
						{#if artist.metadata?.disambiguation}
							<p class="text-sm text-muted-foreground mt-1">{artist.metadata.disambiguation}</p>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-3">
			<Button variant={artist.monitored ? "default" : "outline"} onclick={toggleMonitored}>
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
					{#if artist.monitored}
						<path
							d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
						/>
					{:else}
						<path
							d="M17.5 8A3.5 3.5 0 0 1 21 11.5a3.5 3.5 0 0 1-.67 2.06L12 22l-8.33-8.44A3.5 3.5 0 0 1 3 11.5 3.5 3.5 0 0 1 6.5 8c1.08 0 2.08.46 2.78 1.22L12 12l2.72-2.78A3.5 3.5 0 0 1 17.5 8Z"
						/>
					{/if}
				</svg>
				{artist.monitored ? "Monitored" : "Unmonitored"}
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
				Search
			</Button>
			<Button variant="outline" onclick={deleteArtist}>
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
					<path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
						d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
					/>
				</svg>
				Delete
			</Button>
		</div>

		<!-- Content Grid -->
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Overview -->
				{#if artist.overview}
					<div class="rounded-lg border bg-card p-6">
						<h2 class="text-lg font-semibold mb-3">Biography</h2>
						<p class="text-muted-foreground leading-relaxed">{artist.overview}</p>
					</div>
				{/if}

				<!-- Discography -->
				<div class="rounded-lg border bg-card p-6">
					<h2 class="text-lg font-semibold mb-4">Discography</h2>

					{#if totalAlbums > 0}
						<div class="space-y-6">
							{#each albumGroups as [albumType, albums]}
								<div>
									<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
										{albumType}s ({albums.length})
									</h3>
									<div class="grid gap-3 sm:grid-cols-2">
										{#each albums as album}
											<a
												href="/music/album/{album._id}"
												class="flex gap-3 p-3 rounded-lg border hover:border-primary transition-colors"
											>
												<!-- Album Cover -->
												<div
													class="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center"
												>
													{#if album.coverUrl}
														<img
															src={album.coverUrl}
															alt={album.title}
															class="w-full h-full object-cover"
														/>
													{:else}
														<svg
															xmlns="http://www.w3.org/2000/svg"
															width="24"
															height="24"
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
													<div class="flex items-start justify-between gap-2">
														<div class="min-w-0">
															<h4 class="font-medium truncate">{album.title}</h4>
															<p class="text-sm text-muted-foreground">
																{formatYear(album.releaseDate)} - {album.trackFileCount}/{album.trackCount}
																tracks
															</p>
														</div>
														<span
															class="px-2 py-0.5 rounded text-xs flex-shrink-0 {album.monitored
																? 'bg-green-500/10 text-green-500'
																: 'bg-muted text-muted-foreground'}"
														>
															{album.monitored ? "Monitored" : "Unmonitored"}
														</span>
													</div>
													<!-- Progress bar -->
													{#if album.trackCount > 0}
														<div class="mt-2 h-1 bg-muted rounded-full overflow-hidden">
															<div
																class="h-full bg-primary transition-all"
																style="width: {(album.trackFileCount / album.trackCount) * 100}%"
															></div>
														</div>
													{/if}
												</div>
											</a>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground">No albums found for this artist</p>
					{/if}
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<!-- Stats Card -->
				<div class="rounded-lg border bg-card p-6">
					<h2 class="text-lg font-semibold mb-3">Statistics</h2>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Total Albums</span>
							<span>{totalAlbums}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">With Files</span>
							<span>{ownedAlbums}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Total Tracks</span>
							<span>{totalTracks}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Track Files</span>
							<span>{ownedTracks}</span>
						</div>
						{#if totalTracks > 0}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Completion</span>
								<span>{Math.round((ownedTracks / totalTracks) * 100)}%</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Info Card -->
				<div class="rounded-lg border bg-card p-6">
					<h2 class="text-lg font-semibold mb-3">Information</h2>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Status</span>
							<span class="capitalize">{artist.status}</span>
						</div>
						{#if artist.metadata?.artistType}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Type</span>
								<span class="capitalize">{artist.metadata.artistType}</span>
							</div>
						{/if}
						{#if artist.qualityProfile}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Quality Profile</span>
								<span>{artist.qualityProfile.name}</span>
							</div>
						{/if}
						{#if artist.rootFolder}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Root Folder</span>
								<span class="truncate max-w-32">{artist.rootFolder.path}</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- External Links -->
				{#if artist.metadata?.musicBrainzId}
					<div class="rounded-lg border bg-card p-6">
						<h2 class="text-lg font-semibold mb-3">Links</h2>
						<div class="flex flex-wrap gap-2">
							<a
								href="https://musicbrainz.org/artist/{artist.metadata.musicBrainzId}"
								target="_blank"
								rel="noopener noreferrer"
								class="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors"
							>
								MusicBrainz
							</a>
						</div>
					</div>
				{/if}

				<!-- Tags -->
				{#if artist.tags && artist.tags.length > 0}
					<div class="rounded-lg border bg-card p-6">
						<h2 class="text-lg font-semibold mb-3">Tags</h2>
						<div class="flex flex-wrap gap-2">
							{#each artist.tags as tag}
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
