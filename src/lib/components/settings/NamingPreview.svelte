<script lang="ts">
import { useQuery } from "convex-svelte";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Props
interface Props {
	presetId?: Id<"namingPresets">;
	class?: string;
}

let { presetId, class: className = "" }: Props = $props();

// Sample data for previews
const sampleData = {
	tv: {
		title: "Breaking Bad",
		year: 2008,
		season: 1,
		episode: 1,
		episodeTitle: "Pilot",
		quality: "1080p BluRay",
		releaseGroup: "SPARKS",
	},
	anime: {
		title: "Attack on Titan",
		year: 2013,
		season: 1,
		episode: 1,
		episodeTitle: "To You, in 2000 Years",
		absoluteEpisode: 1,
		quality: "1080p WEB-DL",
		releaseGroup: "SubsPlease",
	},
	movie: {
		title: "The Matrix",
		year: 1999,
		quality: "2160p UHD BluRay",
		releaseGroup: "REMUX",
		edition: "Remastered",
	},
	music: {
		artistName: "Pink Floyd",
		albumTitle: "The Dark Side of the Moon",
		year: 1973,
		trackNumber: 3,
		trackTitle: "On the Run",
		quality: "FLAC",
	},
};

// Query for formatting - only runs when presetId is provided
const tvPreview = $derived(
	presetId
		? useQuery(api.naming.formatFilename, {
				presetId,
				mediaType: "tv",
				...sampleData.tv,
			})
		: null,
);

const animePreview = $derived(
	presetId
		? useQuery(api.naming.formatFilename, {
				presetId,
				mediaType: "anime",
				title: sampleData.anime.title,
				year: sampleData.anime.year,
				season: sampleData.anime.season,
				episode: sampleData.anime.episode,
				episodeTitle: sampleData.anime.episodeTitle,
				absoluteEpisode: sampleData.anime.absoluteEpisode,
				quality: sampleData.anime.quality,
				releaseGroup: sampleData.anime.releaseGroup,
			})
		: null,
);

const moviePreview = $derived(
	presetId
		? useQuery(api.naming.formatFilename, {
				presetId,
				mediaType: "movie",
				title: sampleData.movie.title,
				year: sampleData.movie.year,
				quality: sampleData.movie.quality,
				releaseGroup: sampleData.movie.releaseGroup,
				edition: sampleData.movie.edition,
			})
		: null,
);

const musicPreview = $derived(
	presetId
		? useQuery(api.naming.formatFilename, {
				presetId,
				mediaType: "music",
				title: sampleData.music.artistName,
				artistName: sampleData.music.artistName,
				albumTitle: sampleData.music.albumTitle,
				year: sampleData.music.year,
				trackNumber: sampleData.music.trackNumber,
				trackTitle: sampleData.music.trackTitle,
				quality: sampleData.music.quality,
			})
		: null,
);

// Query available tokens
const tokensQuery = useQuery(api.naming.getAvailableTokens, {});

// Active tab state
let activeTab: "preview" | "tokens" = $state("preview");

// Check if any preview has an error
const hasError = $derived(
	tvPreview?.error || animePreview?.error || moviePreview?.error || musicPreview?.error,
);
</script>

<div class="rounded-lg border bg-card {className}">
	<!-- Tab Navigation -->
	<div class="flex border-b">
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'preview'
				? 'border-b-2 border-primary text-primary'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = "preview")}
		>
			Preview
		</button>
		<button
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'tokens'
				? 'border-b-2 border-primary text-primary'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = "tokens")}
		>
			Available Tokens
		</button>
	</div>

	<div class="p-4">
		{#if activeTab === "preview"}
			{#if !presetId}
				<p class="text-muted-foreground text-sm">Select a naming preset to see preview.</p>
			{:else if hasError}
				<div class="rounded-md bg-destructive/10 p-4 text-sm">
					<div class="flex items-center gap-2 text-destructive">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
						</svg>
						<span class="font-medium">Failed to generate preview</span>
					</div>
					<p class="mt-2 text-destructive/80">
						The selected naming preset may be invalid or unavailable. Please try selecting a different preset.
					</p>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- TV Series Preview -->
					<div>
						<h4 class="text-sm font-medium mb-2 flex items-center gap-2">
							<span class="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">
								TV
							</span>
							TV Series
						</h4>
						{#if tvPreview?.isLoading}
							<!-- Skeleton loading state -->
							<div class="bg-muted/50 rounded p-3 space-y-2 animate-pulse">
								<div class="flex items-center gap-2">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-48 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-4">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-24 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-8">
									<div class="h-3 w-8 bg-muted rounded"></div>
									<div class="h-4 w-64 bg-muted rounded"></div>
								</div>
							</div>
						{:else if tvPreview?.data}
							<div class="bg-muted/50 rounded p-3 font-mono text-sm space-y-1">
								<div class="text-muted-foreground">
									<span class="text-xs uppercase tracking-wide">Folder:</span>
									<span class="text-foreground ml-2">{tvPreview.data.folderPath}/</span>
								</div>
								{#if tvPreview.data.seasonFolder}
									<div class="text-muted-foreground pl-4">
										<span class="text-xs uppercase tracking-wide">Season:</span>
										<span class="text-foreground ml-2">{tvPreview.data.seasonFolder}/</span>
									</div>
								{/if}
								<div class="text-muted-foreground pl-8">
									<span class="text-xs uppercase tracking-wide">File:</span>
									<span class="text-foreground ml-2">{tvPreview.data.filename}.mkv</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Anime Preview -->
					<div>
						<h4 class="text-sm font-medium mb-2 flex items-center gap-2">
							<span class="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs">
								A
							</span>
							Anime
						</h4>
						{#if animePreview?.isLoading}
							<!-- Skeleton loading state -->
							<div class="bg-muted/50 rounded p-3 space-y-2 animate-pulse">
								<div class="flex items-center gap-2">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-44 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-4">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-24 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-8">
									<div class="h-3 w-8 bg-muted rounded"></div>
									<div class="h-4 w-72 bg-muted rounded"></div>
								</div>
							</div>
						{:else if animePreview?.data}
							<div class="bg-muted/50 rounded p-3 font-mono text-sm space-y-1">
								<div class="text-muted-foreground">
									<span class="text-xs uppercase tracking-wide">Folder:</span>
									<span class="text-foreground ml-2">{animePreview.data.folderPath}/</span>
								</div>
								{#if animePreview.data.seasonFolder}
									<div class="text-muted-foreground pl-4">
										<span class="text-xs uppercase tracking-wide">Season:</span>
										<span class="text-foreground ml-2">{animePreview.data.seasonFolder}/</span>
									</div>
								{/if}
								<div class="text-muted-foreground pl-8">
									<span class="text-xs uppercase tracking-wide">File:</span>
									<span class="text-foreground ml-2">{animePreview.data.filename}.mkv</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Movie Preview -->
					<div>
						<h4 class="text-sm font-medium mb-2 flex items-center gap-2">
							<span class="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
								M
							</span>
							Movie
						</h4>
						{#if moviePreview?.isLoading}
							<!-- Skeleton loading state -->
							<div class="bg-muted/50 rounded p-3 space-y-2 animate-pulse">
								<div class="flex items-center gap-2">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-36 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-4">
									<div class="h-3 w-8 bg-muted rounded"></div>
									<div class="h-4 w-40 bg-muted rounded"></div>
								</div>
							</div>
						{:else if moviePreview?.data}
							<div class="bg-muted/50 rounded p-3 font-mono text-sm space-y-1">
								<div class="text-muted-foreground">
									<span class="text-xs uppercase tracking-wide">Folder:</span>
									<span class="text-foreground ml-2">{moviePreview.data.folderPath}/</span>
								</div>
								<div class="text-muted-foreground pl-4">
									<span class="text-xs uppercase tracking-wide">File:</span>
									<span class="text-foreground ml-2">{moviePreview.data.filename}.mkv</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Music Preview -->
					<div>
						<h4 class="text-sm font-medium mb-2 flex items-center gap-2">
							<span class="inline-flex items-center justify-center w-5 h-5 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-xs">
								M
							</span>
							Music
						</h4>
						{#if musicPreview?.isLoading}
							<!-- Skeleton loading state -->
							<div class="bg-muted/50 rounded p-3 space-y-2 animate-pulse">
								<div class="flex items-center gap-2">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-28 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-4">
									<div class="h-3 w-12 bg-muted rounded"></div>
									<div class="h-4 w-52 bg-muted rounded"></div>
								</div>
								<div class="flex items-center gap-2 pl-8">
									<div class="h-3 w-8 bg-muted rounded"></div>
									<div class="h-4 w-32 bg-muted rounded"></div>
								</div>
							</div>
						{:else if musicPreview?.data}
							<div class="bg-muted/50 rounded p-3 font-mono text-sm space-y-1">
								<div class="text-muted-foreground">
									<span class="text-xs uppercase tracking-wide">Artist:</span>
									<span class="text-foreground ml-2">{musicPreview.data.artistFolder}/</span>
								</div>
								<div class="text-muted-foreground pl-4">
									<span class="text-xs uppercase tracking-wide">Album:</span>
									<span class="text-foreground ml-2">{musicPreview.data.albumFolder}/</span>
								</div>
								<div class="text-muted-foreground pl-8">
									<span class="text-xs uppercase tracking-wide">File:</span>
									<span class="text-foreground ml-2">{musicPreview.data.filename}.flac</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{:else if activeTab === "tokens"}
			<!-- Token Reference -->
			{#if tokensQuery.isLoading}
				<!-- Skeleton loading state for tokens -->
				<div class="space-y-6 animate-pulse">
					{#each [1, 2, 3] as _}
						<div>
							<div class="h-4 w-32 bg-muted rounded mb-3"></div>
							<div class="space-y-2">
								{#each [1, 2, 3, 4] as __}
									<div class="flex items-center gap-3">
										<div class="h-5 w-28 bg-muted rounded"></div>
										<div class="h-4 w-48 bg-muted rounded"></div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{:else if tokensQuery.error}
				<div class="rounded-md bg-destructive/10 p-4 text-sm">
					<div class="flex items-center gap-2 text-destructive">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
						</svg>
						<span class="font-medium">Failed to load available tokens</span>
					</div>
				</div>
			{:else if tokensQuery.data}
				<div class="space-y-6">
					<!-- Series Tokens -->
					<div>
						<h4 class="text-sm font-medium mb-2">TV Series / Anime</h4>
						<div class="space-y-1">
							{#each tokensQuery.data.series as token}
								<div class="flex items-start gap-3 text-sm">
									<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono shrink-0">
										{token.token}
									</code>
									<span class="text-muted-foreground">{token.description}</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Movie Tokens -->
					<div>
						<h4 class="text-sm font-medium mb-2">Movies</h4>
						<div class="space-y-1">
							{#each tokensQuery.data.movie as token}
								<div class="flex items-start gap-3 text-sm">
									<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono shrink-0">
										{token.token}
									</code>
									<span class="text-muted-foreground">{token.description}</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Music Tokens -->
					<div>
						<h4 class="text-sm font-medium mb-2">Music</h4>
						<div class="space-y-1">
							{#each tokensQuery.data.music as token}
								<div class="flex items-start gap-3 text-sm">
									<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono shrink-0">
										{token.token}
									</code>
									<span class="text-muted-foreground">{token.description}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
