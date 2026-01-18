<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";

interface Props {
	class?: string;
}

let { class: className = "" }: Props = $props();

// Get the Convex client for mutations/actions
const client = useConvexClient();

// Queries
const syncStatus = useQuery(api.trashGuides.getSyncStatus, {});
const categories = useQuery(api.trashGuides.getCategories, {});
const settingsQuery = useQuery(api.settings.get, {});

// State
let isSyncing = $state(false);
let syncError = $state<string | null>(null);
let syncSuccess = $state<string | null>(null);
let selectedMediaType = $state<"movie" | "tv" | "anime">("movie");

// Toggle sync enabled
async function toggleSyncEnabled() {
	const currentEnabled = settingsQuery.data?.trashSyncEnabled ?? false;
	await client.mutation(api.settings.update, { trashSyncEnabled: !currentEnabled });
}

// Manual sync
async function handleSync() {
	isSyncing = true;
	syncError = null;
	syncSuccess = null;

	try {
		const result = await client.action(api.trashGuides.sync, { mediaType: selectedMediaType });
		if (result.success) {
			syncSuccess = `Successfully synced ${result.importedCount} ${selectedMediaType} formats`;
		} else {
			syncError = result.error ?? "Unknown error occurred";
		}
	} catch (error) {
		syncError = error instanceof Error ? error.message : "Failed to sync";
	} finally {
		isSyncing = false;
	}
}

// Format date
function formatDate(timestamp: number | undefined): string {
	if (!timestamp) return "Never";
	return new Date(timestamp).toLocaleString();
}
</script>

<div class="space-y-6 {className}">
	<!-- Sync Status Card -->
	<div class="rounded-lg border bg-card p-6">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h3 class="text-lg font-semibold">TRaSH Guides Integration</h3>
				<p class="text-sm text-muted-foreground">
					Import custom formats from TRaSH Guides for optimal quality settings
				</p>
			</div>
			<a
				href="https://trash-guides.info/"
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-primary hover:underline"
			>
				Visit TRaSH Guides
			</a>
		</div>

		{#if syncStatus.isLoading}
			<div class="text-sm text-muted-foreground">Loading status...</div>
		{:else if syncStatus.data}
			<div class="space-y-4">
				<!-- Enable/Disable Toggle -->
				<div class="flex items-center justify-between py-3 border-b">
					<div>
						<div class="font-medium">Automatic Sync</div>
						<div class="text-sm text-muted-foreground">
							Automatically sync formats from TRaSH Guides daily
						</div>
					</div>
					<button
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {syncStatus.data.enabled
							? 'bg-primary'
							: 'bg-muted'}"
						onclick={toggleSyncEnabled}
						aria-pressed={syncStatus.data.enabled}
						aria-label="Toggle automatic sync"
					>
						<span
							class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {syncStatus.data.enabled
								? 'translate-x-6'
								: 'translate-x-1'}"
						></span>
					</button>
				</div>

				<!-- Stats -->
				<div class="grid grid-cols-2 gap-4">
					<div class="rounded-lg bg-muted/50 p-3">
						<div class="text-2xl font-bold">{syncStatus.data.formatCount}</div>
						<div class="text-sm text-muted-foreground">Imported Formats</div>
					</div>
					<div class="rounded-lg bg-muted/50 p-3">
						<div class="text-sm font-medium">{formatDate(syncStatus.data.lastSync)}</div>
						<div class="text-sm text-muted-foreground">Last Sync</div>
					</div>
				</div>

				<!-- Manual Sync -->
				<div class="pt-4 border-t">
					<div class="flex items-end gap-4">
						<div class="flex-1">
							<label for="mediaType" class="block text-sm font-medium mb-1">
								Media Type
							</label>
							<select
								id="mediaType"
								bind:value={selectedMediaType}
								class="w-full h-9 rounded-md border bg-background px-3 text-sm"
							>
								<option value="movie">Movies</option>
								<option value="tv">TV Shows</option>
								<option value="anime">Anime</option>
							</select>
						</div>
						<Button onclick={handleSync} disabled={isSyncing}>
							{#if isSyncing}
								<svg
									class="animate-spin -ml-1 mr-2 h-4 w-4"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Syncing...
							{:else}
								Sync Now
							{/if}
						</Button>
					</div>

					{#if syncError}
						<div class="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
							{syncError}
						</div>
					{/if}

					{#if syncSuccess}
						<div class="mt-3 p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
							{syncSuccess}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Categories Overview -->
	<div class="rounded-lg border bg-card p-6">
		<h3 class="text-lg font-semibold mb-4">Imported Categories</h3>

		{#if categories.isLoading}
			<div class="text-sm text-muted-foreground">Loading categories...</div>
		{:else if categories.data && categories.data.length > 0}
			<div class="grid gap-2">
				{#each categories.data as category}
					<div class="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
						<span class="font-medium">{category.category}</span>
						<span class="text-sm text-muted-foreground">
							{category.count} format{category.count !== 1 ? "s" : ""}
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-8 text-muted-foreground">
				<p class="mb-2">No formats imported yet</p>
				<p class="text-sm">Click "Sync Now" above to import formats from TRaSH Guides</p>
			</div>
		{/if}
	</div>

	<!-- Help Text -->
	<div class="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 p-4">
		<h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">About TRaSH Guides</h4>
		<p class="text-sm text-blue-800 dark:text-blue-200">
			TRaSH Guides provides community-curated custom formats that help you get the best quality
			releases. These formats can be imported and assigned scores in your quality profiles to
			automatically prefer or avoid certain release characteristics like HDR formats, audio
			codecs, streaming services, and more.
		</p>
	</div>
</div>
