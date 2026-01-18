<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface Props {
	profileId?: Id<"qualityProfiles">;
	open: boolean;
	onClose: () => void;
}

let { profileId, open = $bindable(), onClose }: Props = $props();

const client = useConvexClient();

// Load all quality definitions (sorted by weight)
const qualitiesQuery = useQuery(api.qualityDefinitions.list, {});

// Load profile if editing
const profileQuery = useQuery(api.qualityProfiles.get, () =>
	profileId ? { id: profileId } : "skip",
);

// Load all custom formats for format scores
const formatsQuery = useQuery(api.customFormats.list, {});

// Form state
let name = $state("");
let upgradeAllowed = $state(true);
let cutoffQualityId = $state<Id<"qualityDefinitions"> | null>(null);
let items = $state<Array<{ qualityId: Id<"qualityDefinitions">; enabled: boolean }>>([]);
let formatScores = $state<Map<Id<"customFormats">, number>>(new Map());
let formatScoresExpanded = $state(false);

let isSubmitting = $state(false);
let error = $state<string | null>(null);
let initialized = $state(false);

// Helper to get quality details by ID
function getQualityById(
	qualityId: Id<"qualityDefinitions">,
): Doc<"qualityDefinitions"> | undefined {
	return qualitiesQuery.data?.find((q: Doc<"qualityDefinitions">) => q._id === qualityId);
}

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

// Initialize form when data loads
$effect(() => {
	if (initialized) return;

	if (profileId && profileQuery.data) {
		// Editing existing profile
		name = profileQuery.data.name;
		upgradeAllowed = profileQuery.data.upgradeAllowed;
		cutoffQualityId = profileQuery.data.cutoffQualityId ?? null;
		// Use the items from the profile (preserving order)
		items = profileQuery.data.items.map(
			(item: { qualityId: Id<"qualityDefinitions">; enabled: boolean }) => ({
				qualityId: item.qualityId,
				enabled: item.enabled,
			}),
		);
		// Load format scores from the enriched profile data
		const newFormatScores = new Map<Id<"customFormats">, number>();
		if (profileQuery.data.formatScores) {
			for (const scoreEntry of profileQuery.data.formatScores) {
				newFormatScores.set(scoreEntry.formatId, scoreEntry.score);
			}
		}
		formatScores = newFormatScores;
		initialized = true;
	} else if (!profileId && qualitiesQuery.data && qualitiesQuery.data.length > 0) {
		// New profile - initialize with all qualities enabled, ordered by weight (descending for priority)
		// Lower weight = lower quality, so we reverse to have higher qualities at the top
		const sortedQualities = [...qualitiesQuery.data].sort((a, b) => b.weight - a.weight);
		items = sortedQualities.map((q) => ({ qualityId: q._id, enabled: true }));
		// Initialize empty format scores for new profile
		formatScores = new Map();
		initialized = true;
	}
});

// Reset initialized when dialog closes or profileId changes
$effect(() => {
	if (!open) {
		initialized = false;
	}
});

async function handleSubmit() {
	if (!name.trim()) {
		error = "Profile name is required";
		return;
	}

	if (items.length === 0) {
		error = "At least one quality must be in the profile";
		return;
	}

	const enabledItems = items.filter((item) => item.enabled);
	if (enabledItems.length === 0) {
		error = "At least one quality must be enabled";
		return;
	}

	// Validate cutoff is one of the enabled qualities
	if (cutoffQualityId) {
		const cutoffItem = items.find((item) => item.qualityId === cutoffQualityId);
		if (!cutoffItem || !cutoffItem.enabled) {
			error = "Cutoff quality must be an enabled quality";
			return;
		}
	}

	isSubmitting = true;
	error = null;

	try {
		let savedProfileId: Id<"qualityProfiles">;

		if (profileId) {
			// Update existing profile
			await client.mutation(api.qualityProfiles.update, {
				id: profileId,
				name: name.trim(),
				upgradeAllowed,
				cutoffQualityId: cutoffQualityId ?? undefined,
				items,
			});
			savedProfileId = profileId;
		} else {
			// Add new profile
			savedProfileId = await client.mutation(api.qualityProfiles.add, {
				name: name.trim(),
				upgradeAllowed,
				cutoffQualityId: cutoffQualityId ?? undefined,
				items,
			});
		}

		// Save format scores (only non-zero scores)
		const scoresToSave = Array.from(formatScores.entries())
			.filter(([_, score]) => score !== 0)
			.map(([formatId, score]) => ({ formatId, score }));

		if (scoresToSave.length > 0) {
			await client.mutation(api.qualityProfiles.bulkSetFormatScores, {
				profileId: savedProfileId,
				scores: scoresToSave,
			});
		}

		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to save quality profile";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	name = "";
	upgradeAllowed = true;
	cutoffQualityId = null;
	items = [];
	formatScores = new Map();
	formatScoresExpanded = false;
	error = null;
	initialized = false;
}

function handleOpenChange(isOpen: boolean) {
	if (!isOpen) {
		resetForm();
		onClose();
	}
}

function moveUp(index: number) {
	if (index <= 0) return;
	const newItems = [...items];
	[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
	items = newItems;
}

function moveDown(index: number) {
	if (index >= items.length - 1) return;
	const newItems = [...items];
	[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
	items = newItems;
}

function toggleQualityEnabled(index: number) {
	const newItems = [...items];
	newItems[index] = { ...newItems[index], enabled: !newItems[index].enabled };

	// If disabling the cutoff quality, clear the cutoff
	if (!newItems[index].enabled && newItems[index].qualityId === cutoffQualityId) {
		cutoffQualityId = null;
	}

	items = newItems;
}

function setCutoff(qualityId: Id<"qualityDefinitions">) {
	cutoffQualityId = cutoffQualityId === qualityId ? null : qualityId;
}

// Get enabled qualities for cutoff dropdown
const enabledQualities = $derived(items.filter((item) => item.enabled));

// Count non-zero format scores for the collapsible header
const nonZeroScoresCount = $derived(
	Array.from(formatScores.values()).filter((score) => score !== 0).length,
);

// Helper to update a format score
function updateFormatScore(formatId: Id<"customFormats">, score: number) {
	const newScores = new Map(formatScores);
	newScores.set(formatId, score);
	formatScores = newScores;
}

// Get the score for a format (default 0)
function getFormatScore(formatId: Id<"customFormats">): number {
	return formatScores.get(formatId) ?? 0;
}

const isEditing = $derived(!!profileId);
const isLoading = $derived(
	qualitiesQuery.isLoading || (profileId ? profileQuery.isLoading : false),
);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
		<Dialog.Header>
			<Dialog.Title>{isEditing ? "Edit" : "Add"} Quality Profile</Dialog.Title>
			<Dialog.Description>
				Configure which qualities are acceptable and their priority order. Higher in the list = higher priority.
			</Dialog.Description>
		</Dialog.Header>

		{#if isLoading}
			<div class="flex items-center justify-center py-8">
				<p class="text-muted-foreground">Loading...</p>
			</div>
		{:else}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4 flex-1 overflow-hidden flex flex-col"
			>
				<!-- Profile Name -->
				<div>
					<label for="profileName" class="text-sm font-medium">Profile Name</label>
					<input
						id="profileName"
						type="text"
						bind:value={name}
						placeholder="e.g., HD-1080p, Ultra-HD, Any"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<!-- Upgrade Settings -->
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-2">
						<input
							id="upgradeAllowed"
							type="checkbox"
							bind:checked={upgradeAllowed}
							class="h-4 w-4 rounded border-gray-300"
						/>
						<label for="upgradeAllowed" class="text-sm font-medium">
							Allow upgrades
						</label>
					</div>

					{#if upgradeAllowed && enabledQualities.length > 0}
						<div class="flex-1">
							<label for="cutoffQuality" class="text-sm font-medium">Upgrade until</label>
							<select
								id="cutoffQuality"
								bind:value={cutoffQualityId}
								class="ml-2 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value={null}>No cutoff (always upgrade)</option>
								{#each enabledQualities as item}
									{@const quality = getQualityById(item.qualityId)}
									{#if quality}
										<option value={quality._id}>
											{quality.name}
										</option>
									{/if}
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<!-- Quality List -->
				<div class="flex-1 overflow-hidden flex flex-col">
					<div class="flex items-center justify-between mb-2">
						<p class="text-sm font-medium">Qualities</p>
						<p class="text-xs text-muted-foreground">
							Drag or use arrows to reorder. Top = highest priority.
						</p>
					</div>

					<div class="flex-1 overflow-y-auto border rounded-lg">
						{#if items.length === 0}
							<div class="p-4 text-center text-muted-foreground">
								No quality definitions available
							</div>
						{:else}
							<div class="divide-y">
								{#each items as item, index}
									{@const quality = getQualityById(item.qualityId)}
									{#if quality}
										<div
											class="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
											class:opacity-50={!item.enabled}
										>
											<!-- Move buttons -->
											<div class="flex flex-col gap-0.5">
												<button
													type="button"
													onclick={() => moveUp(index)}
													disabled={index === 0}
													class="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
													title="Move up"
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
														<polyline points="18 15 12 9 6 15"></polyline>
													</svg>
												</button>
												<button
													type="button"
													onclick={() => moveDown(index)}
													disabled={index === items.length - 1}
													class="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
													title="Move down"
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
														<polyline points="6 9 12 15 18 9"></polyline>
													</svg>
												</button>
											</div>

											<!-- Enable checkbox -->
											<input
												type="checkbox"
												checked={item.enabled}
												onchange={() => toggleQualityEnabled(index)}
												class="h-4 w-4 rounded border-gray-300"
											/>

											<!-- Quality info -->
											<div class="flex-1 min-w-0">
												<p class="text-sm font-medium truncate">{quality.name}</p>
												<p class="text-xs text-muted-foreground">
													{formatResolution(quality.resolution)} - {quality.source}
												</p>
											</div>

											<!-- Weight indicator -->
											<span class="text-xs text-muted-foreground tabular-nums">
												w:{quality.weight}
											</span>

											<!-- Cutoff indicator/button -->
											{#if item.enabled}
												<button
													type="button"
													onclick={() => setCutoff(item.qualityId)}
													class="px-2 py-1 text-xs rounded transition-colors {cutoffQualityId ===
													item.qualityId
														? 'bg-primary text-primary-foreground'
														: 'bg-muted hover:bg-muted/80'}"
													title={cutoffQualityId === item.qualityId
														? "Click to remove cutoff"
														: "Set as cutoff"}
												>
													{cutoffQualityId === item.qualityId ? "Cutoff" : "Set Cutoff"}
												</button>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Custom Format Scores (Collapsible) -->
				<div class="border rounded-lg">
					<button
						type="button"
						onclick={() => (formatScoresExpanded = !formatScoresExpanded)}
						class="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
					>
						<div class="flex items-center gap-2">
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
								class="transition-transform duration-200"
								class:rotate-90={formatScoresExpanded}
							>
								<polyline points="9 18 15 12 9 6"></polyline>
							</svg>
							<span class="text-sm font-medium">Custom Format Scores</span>
						</div>
						{#if nonZeroScoresCount > 0}
							<span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
								{nonZeroScoresCount} configured
							</span>
						{/if}
					</button>

					{#if formatScoresExpanded}
						<div class="border-t px-4 py-3 space-y-3">
							{#if formatsQuery.isLoading}
								<p class="text-sm text-muted-foreground">Loading custom formats...</p>
							{:else if !formatsQuery.data || formatsQuery.data.length === 0}
								<p class="text-sm text-muted-foreground">
									No custom formats defined. Create custom formats in Settings to score them here.
								</p>
							{:else}
								<p class="text-xs text-muted-foreground mb-2">
									Assign scores to custom formats. Positive scores prefer releases matching the format, negative scores avoid them.
								</p>
								<div class="grid gap-2 max-h-48 overflow-y-auto">
									{#each formatsQuery.data as format}
										<div class="flex items-center justify-between gap-4 py-1">
											<label for="format-{format._id}" class="text-sm truncate flex-1" title={format.name}>
												{format.name}
											</label>
											<input
												id="format-{format._id}"
												type="number"
												value={getFormatScore(format._id)}
												onchange={(e) => {
													const target = e.target as HTMLInputElement;
													updateFormatScore(format._id, parseInt(target.value, 10) || 0);
												}}
												class="w-20 rounded-lg border bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
											/>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				{#if error}
					<p class="text-sm text-red-500">{error}</p>
				{/if}

				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Profile"}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
