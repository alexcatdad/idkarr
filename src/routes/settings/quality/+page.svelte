<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import CustomFormatEditor from "$lib/components/settings/CustomFormatEditor.svelte";
import QualityProfileEditor from "$lib/components/settings/QualityProfileEditor.svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

const client = useConvexClient();

// Queries
const qualityDefinitionsQuery = useQuery(api.qualityDefinitions.list, {});
const qualityProfilesQuery = useQuery(api.qualityProfiles.list, {});
const customFormatsQuery = useQuery(api.customFormats.list, {});
const settingsQuery = useQuery(api.settings.get, {});
const syncStatusQuery = useQuery(api.trashGuides.getSyncStatus, {});

// Modal states
let showProfileEditor = $state(false);
let editingProfileId = $state<Id<"qualityProfiles"> | undefined>(undefined);
let showFormatEditor = $state(false);
let editingFormatId = $state<Id<"customFormats"> | undefined>(undefined);

// Inline editing state for quality definitions
let editingDefinitionId = $state<Id<"qualityDefinitions"> | null>(null);
let editingMinSize = $state<number>(0);
let editingMaxSize = $state<number>(0);
let editingPreferredSize = $state<number | undefined>(undefined);
let savingDefinition = $state(false);

// TRaSH sync state
let isSyncing = $state(false);
let syncError = $state<string | null>(null);
let syncSuccess = $state<string | null>(null);

// Helper to format resolution for display
function formatResolution(resolution: string): string {
	const map: Record<string, string> = {
		unknown: "Unknown",
		r480p: "480p",
		r576p: "576p",
		r720p: "720p",
		r1080p: "1080p",
		r2160p: "4K",
	};
	return map[resolution] || resolution;
}

// Helper to format source for display
function formatSource(source: string): string {
	const map: Record<string, string> = {
		unknown: "Unknown",
		cam: "CAM",
		telesync: "Telesync",
		telecine: "Telecine",
		workprint: "Workprint",
		dvd: "DVD",
		tv: "TV",
		webdl: "WEB-DL",
		webrip: "WEBRip",
		bluray: "BluRay",
		remux: "Remux",
	};
	return map[source] || source;
}

// Start editing a definition
function startEditingDefinition(def: Doc<"qualityDefinitions">) {
	editingDefinitionId = def._id;
	editingMinSize = def.minSize;
	editingMaxSize = def.maxSize;
	editingPreferredSize = def.preferredSize;
}

// Cancel editing a definition
function cancelEditingDefinition() {
	editingDefinitionId = null;
	editingMinSize = 0;
	editingMaxSize = 0;
	editingPreferredSize = undefined;
}

// Save definition changes
async function saveDefinition(id: Id<"qualityDefinitions">) {
	savingDefinition = true;
	try {
		await client.mutation(api.qualityDefinitions.update, {
			id,
			minSize: editingMinSize,
			maxSize: editingMaxSize,
			preferredSize: editingPreferredSize,
		});
		cancelEditingDefinition();
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to save quality definition");
	} finally {
		savingDefinition = false;
	}
}

// Open profile editor for new profile
function openNewProfileEditor() {
	editingProfileId = undefined;
	showProfileEditor = true;
}

// Open profile editor for existing profile
function openEditProfileEditor(id: Id<"qualityProfiles">) {
	editingProfileId = id;
	showProfileEditor = true;
}

// Close profile editor
function closeProfileEditor() {
	showProfileEditor = false;
	editingProfileId = undefined;
}

// Delete a quality profile
async function deleteProfile(id: Id<"qualityProfiles">) {
	if (!confirm("Delete this quality profile? This cannot be undone.")) return;
	try {
		await client.mutation(api.qualityProfiles.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete profile");
	}
}

// Open format editor for new format
function openNewFormatEditor() {
	editingFormatId = undefined;
	showFormatEditor = true;
}

// Open format editor for existing format
function openEditFormatEditor(id: Id<"customFormats">) {
	editingFormatId = id;
	showFormatEditor = true;
}

// Close format editor
function closeFormatEditor() {
	showFormatEditor = false;
	editingFormatId = undefined;
}

// Delete a custom format
async function deleteFormat(id: Id<"customFormats">) {
	if (!confirm("Delete this custom format? This cannot be undone.")) return;
	try {
		await client.mutation(api.customFormats.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete format");
	}
}

// Toggle TRaSH sync enabled
async function toggleTrashSync() {
	const currentEnabled = settingsQuery.data?.trashSyncEnabled ?? false;
	try {
		await client.mutation(api.settings.update, { trashSyncEnabled: !currentEnabled });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to update settings");
	}
}

// Sync from TRaSH Guides
async function syncFromTrash() {
	isSyncing = true;
	syncError = null;
	syncSuccess = null;

	try {
		// Sync all media types
		const movieResult = await client.action(api.trashGuides.sync, { mediaType: "movie" });
		const tvResult = await client.action(api.trashGuides.sync, { mediaType: "tv" });

		if (movieResult.success && tvResult.success) {
			syncSuccess = `Synced ${movieResult.importedCount} movie formats and ${tvResult.importedCount} TV formats`;
		} else {
			const errors = [];
			if (!movieResult.success) errors.push(`Movies: ${movieResult.error}`);
			if (!tvResult.success) errors.push(`TV: ${tvResult.error}`);
			syncError = errors.join("; ");
		}
	} catch (e) {
		syncError = e instanceof Error ? e.message : "Failed to sync";
	} finally {
		isSyncing = false;
	}
}

// Format date helper
function formatDate(timestamp: number | undefined): string {
	if (!timestamp) return "Never";
	return new Date(timestamp).toLocaleString();
}
</script>

<div class="space-y-8">
	<!-- Header with back link -->
	<div>
		<a
			href="/settings"
			class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
			Back to Settings
		</a>
		<h1 class="text-3xl font-bold">Quality Settings</h1>
		<p class="text-muted-foreground mt-1">
			Configure quality definitions, profiles, and custom formats for optimal release selection.
		</p>
	</div>

	<!-- Quality Definitions Section -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">Quality Definitions</h2>
			<p class="text-sm text-muted-foreground">
				Size limits (MB per minute) for each quality level. These help filter releases by expected file size.
			</p>
		</div>

		{#if qualityDefinitionsQuery.isLoading}
			<div class="p-4 space-y-2">
				{#each Array(5) as _}
					<div class="h-12 animate-pulse rounded bg-muted"></div>
				{/each}
			</div>
		{:else if !qualityDefinitionsQuery.data || qualityDefinitionsQuery.data.length === 0}
			<div class="p-8 text-center text-muted-foreground">
				No quality definitions found
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b bg-muted/50">
						<tr>
							<th class="text-left p-3 font-medium text-sm">Name</th>
							<th class="text-left p-3 font-medium text-sm">Source</th>
							<th class="text-left p-3 font-medium text-sm">Resolution</th>
							<th class="text-right p-3 font-medium text-sm">Min Size</th>
							<th class="text-right p-3 font-medium text-sm">Max Size</th>
							<th class="text-right p-3 font-medium text-sm">Preferred</th>
							<th class="text-right p-3 font-medium text-sm">Weight</th>
							<th class="text-right p-3 font-medium text-sm">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each qualityDefinitionsQuery.data as def}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="p-3 font-medium">{def.name}</td>
								<td class="p-3 text-sm text-muted-foreground">{formatSource(def.source)}</td>
								<td class="p-3 text-sm text-muted-foreground">{formatResolution(def.resolution)}</td>
								{#if editingDefinitionId === def._id}
									<td class="p-3 text-right">
										<input
											type="number"
											bind:value={editingMinSize}
											class="w-20 rounded border bg-background px-2 py-1 text-sm text-right tabular-nums"
											min="0"
										/>
									</td>
									<td class="p-3 text-right">
										<input
											type="number"
											bind:value={editingMaxSize}
											class="w-20 rounded border bg-background px-2 py-1 text-sm text-right tabular-nums"
											min="0"
										/>
									</td>
									<td class="p-3 text-right">
										<input
											type="number"
											bind:value={editingPreferredSize}
											class="w-20 rounded border bg-background px-2 py-1 text-sm text-right tabular-nums"
											min="0"
											placeholder="-"
										/>
									</td>
								{:else}
									<td class="p-3 text-right tabular-nums text-sm">{def.minSize}</td>
									<td class="p-3 text-right tabular-nums text-sm">{def.maxSize}</td>
									<td class="p-3 text-right tabular-nums text-sm text-muted-foreground">
										{def.preferredSize ?? "-"}
									</td>
								{/if}
								<td class="p-3 text-right tabular-nums text-sm text-muted-foreground">{def.weight}</td>
								<td class="p-3 text-right">
									{#if editingDefinitionId === def._id}
										<div class="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="sm"
												onclick={() => saveDefinition(def._id)}
												disabled={savingDefinition}
											>
												{savingDefinition ? "..." : "Save"}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onclick={cancelEditingDefinition}
												disabled={savingDefinition}
											>
												Cancel
											</Button>
										</div>
									{:else}
										<Button
											variant="ghost"
											size="icon"
											onclick={() => startEditingDefinition(def)}
											title="Edit sizes"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M12 20h9" />
												<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
											</svg>
										</Button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Quality Profiles Section -->
	<section class="rounded-lg border bg-card">
		<div class="flex items-center justify-between border-b p-4">
			<div>
				<h2 class="text-lg font-semibold">Quality Profiles</h2>
				<p class="text-sm text-muted-foreground">
					Define which qualities are acceptable and their priority order.
				</p>
			</div>
			<Button onclick={openNewProfileEditor}>Add Profile</Button>
		</div>

		{#if qualityProfilesQuery.isLoading}
			<div class="p-4 grid gap-4 sm:grid-cols-2">
				{#each Array(4) as _}
					<div class="h-24 animate-pulse rounded-lg bg-muted"></div>
				{/each}
			</div>
		{:else if !qualityProfilesQuery.data || qualityProfilesQuery.data.length === 0}
			<div class="p-8 text-center text-muted-foreground">
				<p>No quality profiles configured</p>
				<Button class="mt-4" onclick={openNewProfileEditor}>Add Quality Profile</Button>
			</div>
		{:else}
			<div class="p-4 grid gap-4 sm:grid-cols-2">
				{#each qualityProfilesQuery.data as profile}
					<div class="rounded-lg border bg-background p-4 hover:border-primary/50 transition-colors">
						<div class="flex items-start justify-between">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold truncate">{profile.name}</h3>
									{#if profile.upgradeAllowed}
										<span class="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600 dark:text-green-400">
											Upgrades
										</span>
									{/if}
								</div>
								<p class="text-sm text-muted-foreground mt-1">
									{profile.items.filter((i: { enabled: boolean }) => i.enabled).length} of {profile.items.length} qualities enabled
								</p>
							</div>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onclick={() => openEditProfileEditor(profile._id)}
									title="Edit profile"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M12 20h9" />
										<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
									</svg>
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => deleteProfile(profile._id)}
									title="Delete profile"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M3 6h18" />
										<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
										<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
									</svg>
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Custom Formats Section -->
	<section class="rounded-lg border bg-card">
		<div class="flex items-center justify-between border-b p-4">
			<div>
				<h2 class="text-lg font-semibold">Custom Formats</h2>
				<p class="text-sm text-muted-foreground">
					Define custom scoring rules for releases based on patterns.
				</p>
			</div>
			<Button onclick={openNewFormatEditor}>Add Format</Button>
		</div>

		{#if customFormatsQuery.isLoading}
			<div class="p-4 space-y-3">
				{#each Array(5) as _}
					<div class="h-14 animate-pulse rounded bg-muted"></div>
				{/each}
			</div>
		{:else if !customFormatsQuery.data || customFormatsQuery.data.length === 0}
			<div class="p-8 text-center text-muted-foreground">
				<p>No custom formats configured</p>
				<Button class="mt-4" onclick={openNewFormatEditor}>Add Custom Format</Button>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b bg-muted/50">
						<tr>
							<th class="text-left p-3 font-medium text-sm">Name</th>
							<th class="text-left p-3 font-medium text-sm">Conditions</th>
							<th class="text-left p-3 font-medium text-sm">Include in Renaming</th>
							<th class="text-right p-3 font-medium text-sm">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each customFormatsQuery.data as format}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="p-3 font-medium">{format.name}</td>
								<td class="p-3 text-sm text-muted-foreground">
									{format.conditions.length} condition{format.conditions.length !== 1 ? "s" : ""}
								</td>
								<td class="p-3 text-sm">
									{#if format.includeWhenRenaming}
										<span class="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600 dark:text-green-400">
											Yes
										</span>
									{:else}
										<span class="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
											No
										</span>
									{/if}
								</td>
								<td class="p-3 text-right">
									<div class="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="icon"
											onclick={() => openEditFormatEditor(format._id)}
											title="Edit format"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M12 20h9" />
												<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
											</svg>
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onclick={() => deleteFormat(format._id)}
											title="Delete format"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M3 6h18" />
												<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
												<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
											</svg>
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- TRaSH Guides Section -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">TRaSH Guides Integration</h2>
			<p class="text-sm text-muted-foreground">
				Import community-curated custom formats from TRaSH Guides.
			</p>
		</div>

		<div class="p-4 space-y-4">
			<!-- Enable/Disable Toggle -->
			<div class="flex items-center justify-between py-3 border-b">
				<div>
					<div class="font-medium">Automatic Sync</div>
					<div class="text-sm text-muted-foreground">
						Automatically sync formats from TRaSH Guides daily
					</div>
				</div>
				<button
					class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {settingsQuery.data?.trashSyncEnabled
						? 'bg-primary'
						: 'bg-muted'}"
					onclick={toggleTrashSync}
					aria-pressed={settingsQuery.data?.trashSyncEnabled ?? false}
					aria-label="Toggle automatic sync"
				>
					<span
						class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {settingsQuery.data?.trashSyncEnabled
							? 'translate-x-6'
							: 'translate-x-1'}"
					></span>
				</button>
			</div>

			<!-- Sync Status -->
			{#if syncStatusQuery.data}
				<div class="grid grid-cols-2 gap-4">
					<div class="rounded-lg bg-muted/50 p-3">
						<div class="text-2xl font-bold tabular-nums">{syncStatusQuery.data.formatCount}</div>
						<div class="text-sm text-muted-foreground">Imported Formats</div>
					</div>
					<div class="rounded-lg bg-muted/50 p-3">
						<div class="text-sm font-medium">{formatDate(syncStatusQuery.data.lastSync)}</div>
						<div class="text-sm text-muted-foreground">Last Sync</div>
					</div>
				</div>
			{/if}

			<!-- Sync Button -->
			<div class="flex items-center gap-4">
				<Button onclick={syncFromTrash} disabled={isSyncing}>
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
				<a
					href="https://trash-guides.info/"
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm text-primary hover:underline"
				>
					Visit TRaSH Guides
				</a>
			</div>

			{#if syncError}
				<div class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
					{syncError}
				</div>
			{/if}

			{#if syncSuccess}
				<div class="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
					{syncSuccess}
				</div>
			{/if}
		</div>
	</section>
</div>

<!-- Quality Profile Editor Modal -->
<QualityProfileEditor
	profileId={editingProfileId}
	bind:open={showProfileEditor}
	onClose={closeProfileEditor}
/>

<!-- Custom Format Editor Modal -->
<CustomFormatEditor
	formatId={editingFormatId}
	bind:open={showFormatEditor}
	onClose={closeFormatEditor}
/>
