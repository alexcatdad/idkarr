<script lang="ts">
import { useQuery } from "convex-svelte";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Props {
	selectedPresetId?: Id<"namingPresets">;
}

let { selectedPresetId }: Props = $props();

// Query presets
const presetsQuery = useQuery(api.naming.listPresets, {});
const tokensQuery = useQuery(api.naming.getAvailableTokens, {});

// Selected preset for preview
const selectedPreset = $derived(
	presetsQuery.data?.find((p) => p._id === selectedPresetId) ?? presetsQuery.data?.[0],
);

// Sample data for previews
const sampleData = {
	series: {
		title: "Breaking Bad",
		year: 2008,
		season: 1,
		episode: 1,
		episodeTitle: "Pilot",
		quality: "1080p BluRay",
		releaseGroup: "NTb",
	},
	movie: {
		title: "The Matrix",
		year: 1999,
		quality: "2160p UHD BluRay",
		releaseGroup: "FraMeSToR",
		edition: "Remastered",
	},
	music: {
		artistName: "Pink Floyd",
		albumTitle: "Dark Side of the Moon",
		year: 1973,
		trackNumber: 1,
		trackTitle: "Speak to Me",
		quality: "FLAC",
	},
};

// Apply format with sample data
function applyFormat(
	format: string | undefined,
	data: Record<string, string | number | undefined>,
	replaceSpaces?: boolean,
	spaceReplacement?: string,
	colonReplacement?: string,
): string {
	if (!format) return "";

	let result = format;

	// Replace tokens
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined) continue;

		// Handle numeric padding
		const paddedRegex = new RegExp(`\\{${key}:(0+)\\}`, "g");
		result = result.replace(paddedRegex, (_, padding) => {
			const numValue = typeof value === "number" ? value : parseInt(String(value), 10);
			if (Number.isNaN(numValue)) return String(value);
			return String(numValue).padStart(padding.length, "0");
		});

		// Handle simple replacement
		const simpleRegex = new RegExp(`\\{${key}\\}`, "g");
		result = result.replace(simpleRegex, String(value));
	}

	// Replace colons
	const colonRepl = colonReplacement ?? "-";
	result = result.replace(/:/g, colonRepl);

	// Replace spaces if configured
	if (replaceSpaces === true && spaceReplacement) {
		result = result.replace(/ /g, spaceReplacement);
	}

	// Clean up unreplaced tokens
	result = result.replace(/\{[^}]+\}/g, "");

	return result;
}

// Generate previews
const previews = $derived(() => {
	if (!selectedPreset) return null;

	const seriesTokens = {
		"Series Title": sampleData.series.title,
		Year: sampleData.series.year,
		Season: sampleData.series.season,
		Episode: sampleData.series.episode,
		"Episode Title": sampleData.series.episodeTitle,
		Quality: sampleData.series.quality,
		"Release Group": sampleData.series.releaseGroup,
	};

	const movieTokens = {
		"Movie Title": sampleData.movie.title,
		Year: sampleData.movie.year,
		Quality: sampleData.movie.quality,
		"Release Group": sampleData.movie.releaseGroup,
		Edition: sampleData.movie.edition,
	};

	const musicTokens = {
		"Artist Name": sampleData.music.artistName,
		"Album Title": sampleData.music.albumTitle,
		Year: sampleData.music.year,
		"Track Number": sampleData.music.trackNumber,
		"Track Title": sampleData.music.trackTitle,
		Quality: sampleData.music.quality,
	};

	return {
		series: {
			folder: applyFormat(
				selectedPreset.seriesFolderFormat,
				seriesTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
			season: applyFormat(
				selectedPreset.seasonFolderFormat,
				seriesTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
			episode: applyFormat(
				selectedPreset.episodeFormat,
				seriesTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
		},
		movie: {
			folder: applyFormat(
				selectedPreset.movieFolderFormat,
				movieTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
			file: applyFormat(
				selectedPreset.movieFormat,
				movieTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
		},
		music: {
			artist: applyFormat(
				selectedPreset.artistFolderFormat,
				musicTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
			album: applyFormat(
				selectedPreset.albumFolderFormat,
				musicTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
			track: applyFormat(
				selectedPreset.trackFormat,
				musicTokens,
				selectedPreset.replaceSpaces,
				selectedPreset.spaceReplacement,
				selectedPreset.colonReplacement,
			),
		},
	};
});

let showTokens = $state(false);
let activeTokenTab = $state<"series" | "movie" | "music">("series");
</script>

<div class="space-y-6">
	<!-- Preset Info -->
	{#if selectedPreset}
		<div class="rounded-lg border bg-card p-4">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="font-semibold">{selectedPreset.name}</h3>
					<p class="text-sm text-muted-foreground">
						{selectedPreset.type === "built-in" ? "Built-in preset" : "Custom preset"}
					</p>
				</div>
				{#if selectedPreset.replaceSpaces}
					<span class="text-xs px-2 py-1 rounded bg-muted">
						Spaces replaced with "{selectedPreset.spaceReplacement}"
					</span>
				{/if}
			</div>

			<!-- Preview Sections -->
			<div class="space-y-4">
				<!-- TV/Anime Preview -->
				<div class="border-t pt-4">
					<h4 class="text-sm font-medium mb-2">TV Series / Anime</h4>
					<div class="space-y-1 text-sm font-mono bg-muted/50 p-3 rounded">
						<div class="flex">
							<span class="text-muted-foreground w-20">Folder:</span>
							<span>{previews()?.series.folder}</span>
						</div>
						<div class="flex">
							<span class="text-muted-foreground w-20">Season:</span>
							<span>{previews()?.series.season}</span>
						</div>
						<div class="flex">
							<span class="text-muted-foreground w-20">Episode:</span>
							<span>{previews()?.series.episode}.mkv</span>
						</div>
					</div>
					<p class="text-xs text-muted-foreground mt-2">
						Full path: {previews()?.series.folder}/{previews()?.series.season}/{previews()?.series.episode}.mkv
					</p>
				</div>

				<!-- Movie Preview -->
				<div class="border-t pt-4">
					<h4 class="text-sm font-medium mb-2">Movies</h4>
					<div class="space-y-1 text-sm font-mono bg-muted/50 p-3 rounded">
						<div class="flex">
							<span class="text-muted-foreground w-20">Folder:</span>
							<span>{previews()?.movie.folder}</span>
						</div>
						<div class="flex">
							<span class="text-muted-foreground w-20">File:</span>
							<span>{previews()?.movie.file}.mkv</span>
						</div>
					</div>
					<p class="text-xs text-muted-foreground mt-2">
						Full path: {previews()?.movie.folder}/{previews()?.movie.file}.mkv
					</p>
				</div>

				<!-- Music Preview -->
				<div class="border-t pt-4">
					<h4 class="text-sm font-medium mb-2">Music</h4>
					<div class="space-y-1 text-sm font-mono bg-muted/50 p-3 rounded">
						<div class="flex">
							<span class="text-muted-foreground w-20">Artist:</span>
							<span>{previews()?.music.artist}</span>
						</div>
						<div class="flex">
							<span class="text-muted-foreground w-20">Album:</span>
							<span>{previews()?.music.album}</span>
						</div>
						<div class="flex">
							<span class="text-muted-foreground w-20">Track:</span>
							<span>{previews()?.music.track}.flac</span>
						</div>
					</div>
					<p class="text-xs text-muted-foreground mt-2">
						Full path: {previews()?.music.artist}/{previews()?.music.album}/{previews()?.music.track}.flac
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Available Tokens Reference -->
	<div class="rounded-lg border">
		<button
			type="button"
			class="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
			onclick={() => (showTokens = !showTokens)}
		>
			<span class="font-medium">Available Tokens</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="transition-transform {showTokens ? 'rotate-180' : ''}"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</button>

		{#if showTokens && tokensQuery.data}
			<div class="border-t p-4">
				<!-- Tabs -->
				<div class="flex gap-2 mb-4">
					<button
						type="button"
						class="px-3 py-1.5 rounded text-sm {activeTokenTab === 'series' ? 'bg-primary text-primary-foreground' : 'bg-muted'}"
						onclick={() => (activeTokenTab = "series")}
					>
						Series/Anime
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded text-sm {activeTokenTab === 'movie' ? 'bg-primary text-primary-foreground' : 'bg-muted'}"
						onclick={() => (activeTokenTab = "movie")}
					>
						Movies
					</button>
					<button
						type="button"
						class="px-3 py-1.5 rounded text-sm {activeTokenTab === 'music' ? 'bg-primary text-primary-foreground' : 'bg-muted'}"
						onclick={() => (activeTokenTab = "music")}
					>
						Music
					</button>
				</div>

				<!-- Token List -->
				<div class="space-y-2">
					{#each tokensQuery.data[activeTokenTab] as token}
						<div class="flex items-start gap-3">
							<code class="px-2 py-0.5 bg-muted rounded text-xs font-mono whitespace-nowrap">
								{token.token}
							</code>
							<span class="text-sm text-muted-foreground">{token.description}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
