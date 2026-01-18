<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// Props
let {
	selectedIds,
	selectedMediaTypes,
	onClearSelection,
	onUpdateComplete,
}: {
	selectedIds: Set<Id<"media">>;
	selectedMediaTypes: Map<Id<"media">, "movie" | "tv" | "music">;
	onClearSelection: () => void;
	onUpdateComplete: () => void;
} = $props();

// Convex client for mutations
const client = useConvexClient();

// Queries for dropdowns
const qualityProfilesQuery = useQuery(api.qualityProfiles.list, {});
const rootFoldersQuery = useQuery(api.rootFolders.list, {});
const tagsQuery = useQuery(api.tags.list, {});

// Action state
let selectedAction = $state<
	"qualityProfile" | "rootFolder" | "monitored" | "addTags" | "remove" | null
>(null);
let selectedQualityProfileId = $state<Id<"qualityProfiles"> | "">("");
let selectedRootFolderId = $state<Id<"rootFolders"> | "">("");
let monitoredValue = $state<boolean | null>(null);
let selectedTagIds = $state<Set<Id<"tags">>>(new Set());
let showRemoveConfirm = $state(false);
let isExecuting = $state(false);
let executionProgress = $state(0);

// Derived values
const selectionCount = $derived(selectedIds.size);
const hasSelection = $derived(selectionCount > 0);

// Check if action can be executed
const canExecute = $derived(() => {
	switch (selectedAction) {
		case "qualityProfile":
			return selectedQualityProfileId !== "";
		case "rootFolder":
			return selectedRootFolderId !== "";
		case "monitored":
			return monitoredValue !== null;
		case "addTags":
			return selectedTagIds.size > 0;
		case "remove":
			return true;
		default:
			return false;
	}
});

// Reset action state
function resetActionState() {
	selectedAction = null;
	selectedQualityProfileId = "";
	selectedRootFolderId = "";
	monitoredValue = null;
	selectedTagIds = new Set();
	executionProgress = 0;
}

// Execute the bulk action
async function executeAction() {
	if (!canExecute()) return;

	if (selectedAction === "remove") {
		showRemoveConfirm = true;
		return;
	}

	await performBulkUpdate();
}

// Perform the actual bulk update
async function performBulkUpdate() {
	isExecuting = true;
	executionProgress = 0;

	const ids = Array.from(selectedIds);
	let completed = 0;

	try {
		for (const id of ids) {
			const mediaType = selectedMediaTypes.get(id);
			if (!mediaType) continue;

			// Build the update data based on the selected action
			switch (selectedAction) {
				case "qualityProfile":
					if (selectedQualityProfileId) {
						await updateMedia(mediaType, id, {
							qualityProfileId: selectedQualityProfileId as Id<"qualityProfiles">,
						});
					}
					break;
				case "rootFolder":
					if (selectedRootFolderId) {
						await updateMedia(mediaType, id, {
							rootFolderId: selectedRootFolderId as Id<"rootFolders">,
						});
					}
					break;
				case "monitored":
					if (monitoredValue !== null) {
						await updateMedia(mediaType, id, { monitored: monitoredValue });
					}
					break;
				case "addTags":
					if (selectedTagIds.size > 0) {
						await updateMedia(mediaType, id, {
							tagIds: Array.from(selectedTagIds),
						});
					}
					break;
			}

			completed++;
			executionProgress = Math.round((completed / ids.length) * 100);
		}

		// Success - reset and notify
		resetActionState();
		onClearSelection();
		onUpdateComplete();
	} catch (error) {
		console.error("Bulk update failed:", error);
		// Keep selection so user can retry
	} finally {
		isExecuting = false;
	}
}

// Helper to update media based on type
async function updateMedia(
	mediaType: "movie" | "tv" | "music",
	id: Id<"media">,
	updates: {
		qualityProfileId?: Id<"qualityProfiles">;
		rootFolderId?: Id<"rootFolders">;
		monitored?: boolean;
		tagIds?: Id<"tags">[];
	},
) {
	switch (mediaType) {
		case "movie":
			await client.mutation(api.movies.update, { id, ...updates });
			break;
		case "tv":
			await client.mutation(api.series.update, { id, ...updates });
			break;
		case "music":
			await client.mutation(api.music.updateArtist, { id, ...updates });
			break;
	}
}

// Helper to remove media based on type
async function removeMedia(mediaType: "movie" | "tv" | "music", id: Id<"media">) {
	switch (mediaType) {
		case "movie":
			await client.mutation(api.movies.remove, { id, deleteFiles: false });
			break;
		case "tv":
			await client.mutation(api.series.remove, { id, deleteFiles: false });
			break;
		case "music":
			await client.mutation(api.music.removeArtist, { id, deleteFiles: false });
			break;
	}
}

// Perform bulk removal
async function performBulkRemove() {
	isExecuting = true;
	executionProgress = 0;
	showRemoveConfirm = false;

	const ids = Array.from(selectedIds);
	let completed = 0;

	try {
		for (const id of ids) {
			const mediaType = selectedMediaTypes.get(id);
			if (!mediaType) continue;

			await removeMedia(mediaType, id);

			completed++;
			executionProgress = Math.round((completed / ids.length) * 100);
		}

		// Success - reset and notify
		resetActionState();
		onClearSelection();
		onUpdateComplete();
	} catch (error) {
		console.error("Bulk remove failed:", error);
	} finally {
		isExecuting = false;
	}
}

function toggleTagSelection(tagId: Id<"tags">) {
	const newSet = new Set(selectedTagIds);
	if (newSet.has(tagId)) {
		newSet.delete(tagId);
	} else {
		newSet.add(tagId);
	}
	selectedTagIds = newSet;
}
</script>

{#if hasSelection}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="container mx-auto px-4 py-4">
			<div class="flex flex-wrap items-center gap-4">
				<!-- Selection count -->
				<div class="flex items-center gap-2 text-sm font-medium">
					<span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
						{selectionCount}
					</span>
					<span>{selectionCount === 1 ? "item" : "items"} selected</span>
				</div>

				<div class="h-6 w-px bg-border"></div>

				<!-- Action selector -->
				<div class="flex flex-wrap items-center gap-3">
					<!-- Quality Profile -->
					<div class="flex items-center gap-2">
						<label for="quality-profile" class="text-sm text-muted-foreground whitespace-nowrap">
							Quality Profile:
						</label>
						<select
							id="quality-profile"
							class="rounded-md border bg-background px-3 py-1.5 text-sm"
							bind:value={selectedQualityProfileId}
							onfocus={() => (selectedAction = "qualityProfile")}
							disabled={isExecuting}
						>
							<option value="">Select...</option>
							{#if qualityProfilesQuery.data}
								{#each qualityProfilesQuery.data as profile}
									<option value={profile._id}>{profile.name}</option>
								{/each}
							{/if}
						</select>
					</div>

					<!-- Root Folder -->
					<div class="flex items-center gap-2">
						<label for="root-folder" class="text-sm text-muted-foreground whitespace-nowrap">
							Root Folder:
						</label>
						<select
							id="root-folder"
							class="rounded-md border bg-background px-3 py-1.5 text-sm"
							bind:value={selectedRootFolderId}
							onfocus={() => (selectedAction = "rootFolder")}
							disabled={isExecuting}
						>
							<option value="">Select...</option>
							{#if rootFoldersQuery.data}
								{#each rootFoldersQuery.data as folder}
									<option value={folder._id}>{folder.path}</option>
								{/each}
							{/if}
						</select>
					</div>

					<!-- Monitored -->
					<div class="flex items-center gap-2">
						<label for="monitored" class="text-sm text-muted-foreground whitespace-nowrap">
							Monitored:
						</label>
						<select
							id="monitored"
							class="rounded-md border bg-background px-3 py-1.5 text-sm"
							bind:value={monitoredValue}
							onfocus={() => (selectedAction = "monitored")}
							disabled={isExecuting}
						>
							<option value={null}>Select...</option>
							<option value={true}>Yes</option>
							<option value={false}>No</option>
						</select>
					</div>

					<!-- Add Tags -->
					<div class="relative flex items-center gap-2">
						<span class="text-sm text-muted-foreground whitespace-nowrap">Tags:</span>
						<div class="relative">
							<button
								type="button"
								class="flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-sm"
								onclick={() => (selectedAction = selectedAction === "addTags" ? null : "addTags")}
								disabled={isExecuting}
							>
								{#if selectedTagIds.size === 0}
									<span class="text-muted-foreground">Select tags...</span>
								{:else}
									<span>{selectedTagIds.size} selected</span>
								{/if}
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
									class="ml-1"
								>
									<path d="m6 9 6 6 6-6" />
								</svg>
							</button>
							{#if selectedAction === "addTags"}
								<div class="absolute bottom-full left-0 mb-2 w-48 rounded-md border bg-background p-2 shadow-lg">
									<div class="max-h-48 overflow-y-auto space-y-1">
										{#if tagsQuery.data && tagsQuery.data.length > 0}
											{#each tagsQuery.data as tag}
												<label class="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted cursor-pointer">
													<input
														type="checkbox"
														checked={selectedTagIds.has(tag._id)}
														onchange={() => toggleTagSelection(tag._id)}
														class="rounded"
													/>
													<span class="text-sm">{tag.name}</span>
												</label>
											{/each}
										{:else}
											<p class="text-sm text-muted-foreground px-2 py-1">No tags available</p>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Remove -->
					<Button
						variant="destructive"
						size="sm"
						onclick={() => {
							selectedAction = "remove";
							showRemoveConfirm = true;
						}}
						disabled={isExecuting}
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
							class="mr-1"
						>
							<path d="M3 6h18" />
							<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
							<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
						</svg>
						Remove
					</Button>
				</div>

				<div class="ml-auto flex items-center gap-2">
					{#if isExecuting}
						<div class="flex items-center gap-2">
							<div class="h-2 w-24 rounded-full bg-muted">
								<div
									class="h-2 rounded-full bg-primary transition-all"
									style="width: {executionProgress}%"
								></div>
							</div>
							<span class="text-sm text-muted-foreground">{executionProgress}%</span>
						</div>
					{:else}
						<!-- Execute button -->
						<Button
							size="sm"
							onclick={executeAction}
							disabled={!canExecute() || isExecuting}
						>
							Apply Changes
						</Button>

						<!-- Clear selection -->
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								resetActionState();
								onClearSelection();
							}}
						>
							Clear Selection
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Remove Confirmation Dialog -->
<Dialog.Root bind:open={showRemoveConfirm}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Remove from Library</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to remove {selectionCount} {selectionCount === 1 ? "item" : "items"} from your library?
				This will not delete files from disk.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showRemoveConfirm = false)}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={performBulkRemove} disabled={isExecuting}>
				{#if isExecuting}
					Removing...
				{:else}
					Remove {selectionCount} {selectionCount === 1 ? "item" : "items"}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
