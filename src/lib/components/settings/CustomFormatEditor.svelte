<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface Props {
	formatId?: Id<"customFormats">;
	open: boolean;
	onClose: () => void;
}

let { formatId, open = $bindable(), onClose }: Props = $props();

const client = useConvexClient();

// Load format if editing
const formatQuery = useQuery(api.customFormats.get, () => (formatId ? { id: formatId } : "skip"));

// Load condition types
const conditionTypesQuery = useQuery(api.customFormats.getConditionTypes, {});

// Form state
let name = $state("");
let includeWhenRenaming = $state(false);

interface Condition {
	type: string;
	pattern: string;
	negate: boolean;
	required: boolean;
}

interface ConditionType {
	type: string;
	description: string;
	supportsRegex: boolean;
}
let conditions = $state<Condition[]>([]);

// Test state
let testReleaseName = $state("");
let testResults = $state<Array<{
	id: string;
	name: string;
	matchedConditions: Array<{ type: string; pattern: string; matched: boolean }>;
}> | null>(null);
let isTesting = $state(false);

let isSubmitting = $state(false);
let error = $state<string | null>(null);
let initialized = $state(false);

// Initialize form when data loads
$effect(() => {
	if (initialized) return;

	if (formatId && formatQuery.data) {
		// Editing existing format
		name = formatQuery.data.name;
		includeWhenRenaming = formatQuery.data.includeWhenRenaming;
		conditions = formatQuery.data.conditions.map((c: Condition) => ({
			type: c.type,
			pattern: c.pattern,
			negate: c.negate,
			required: c.required,
		}));
		initialized = true;
	} else if (!formatId && conditionTypesQuery.data) {
		// New format - start with empty conditions
		conditions = [];
		initialized = true;
	}
});

// Reset initialized when dialog closes
$effect(() => {
	if (!open) {
		initialized = false;
	}
});

function addCondition() {
	const defaultType = conditionTypesQuery.data?.[0]?.type ?? "releaseName";
	conditions = [
		...conditions,
		{
			type: defaultType,
			pattern: "",
			negate: false,
			required: false,
		},
	];
}

function removeCondition(index: number) {
	conditions = conditions.filter((_, i) => i !== index);
}

function updateCondition(index: number, field: keyof Condition, value: string | boolean) {
	const newConditions = [...conditions];
	newConditions[index] = { ...newConditions[index], [field]: value };
	conditions = newConditions;
}

async function handleTest() {
	if (!testReleaseName.trim()) {
		return;
	}

	isTesting = true;
	testResults = null;

	try {
		const results = await client.query(api.customFormats.testRelease, {
			releaseName: testReleaseName.trim(),
		});
		testResults = results;
	} catch (e) {
		console.error("Test failed:", e);
	} finally {
		isTesting = false;
	}
}

async function handleSubmit() {
	if (!name.trim()) {
		error = "Format name is required";
		return;
	}

	if (conditions.length === 0) {
		error = "At least one condition is required";
		return;
	}

	// Validate all conditions have patterns
	for (const condition of conditions) {
		if (!condition.pattern.trim()) {
			error = "All conditions must have a pattern";
			return;
		}
	}

	isSubmitting = true;
	error = null;

	try {
		const conditionsToSave = conditions.map((c) => ({
			type: c.type as
				| "releaseName"
				| "releaseGroup"
				| "source"
				| "resolution"
				| "codec"
				| "audioCodec"
				| "audioChannels"
				| "language"
				| "edition"
				| "size"
				| "indexerFlag",
			pattern: c.pattern.trim(),
			negate: c.negate,
			required: c.required,
		}));

		if (formatId) {
			// Update existing format
			await client.mutation(api.customFormats.update, {
				id: formatId,
				name: name.trim(),
				includeWhenRenaming,
				conditions: conditionsToSave,
			});
		} else {
			// Add new format
			await client.mutation(api.customFormats.add, {
				name: name.trim(),
				includeWhenRenaming,
				conditions: conditionsToSave,
			});
		}

		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to save custom format";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	name = "";
	includeWhenRenaming = false;
	conditions = [];
	testReleaseName = "";
	testResults = null;
	error = null;
	initialized = false;
}

function handleOpenChange(isOpen: boolean) {
	if (!isOpen) {
		resetForm();
		onClose();
	}
}

// Get description for a condition type
function getConditionTypeDescription(type: string): string {
	const conditionType = conditionTypesQuery.data?.find((ct: ConditionType) => ct.type === type);
	return conditionType?.description ?? "";
}

// Check if a condition type supports regex
function conditionTypeSupportsRegex(type: string): boolean {
	const conditionType = conditionTypesQuery.data?.find((ct: ConditionType) => ct.type === type);
	return conditionType?.supportsRegex ?? true;
}

const isEditing = $derived(!!formatId);
const isLoading = $derived(formatId ? formatQuery.isLoading : conditionTypesQuery.isLoading);
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
		<Dialog.Header>
			<Dialog.Title>{isEditing ? "Edit" : "Add"} Custom Format</Dialog.Title>
			<Dialog.Description>
				Define conditions to match against release names. All required conditions must match, plus at least one optional condition.
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
				<!-- Format Name -->
				<div>
					<label for="formatName" class="text-sm font-medium">Format Name</label>
					<input
						id="formatName"
						type="text"
						bind:value={name}
						placeholder="e.g., x265, REMUX, DTS-HD MA"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<!-- Include When Renaming -->
				<div class="flex items-center gap-2">
					<input
						id="includeWhenRenaming"
						type="checkbox"
						bind:checked={includeWhenRenaming}
						class="h-4 w-4 rounded border-gray-300"
					/>
					<label for="includeWhenRenaming" class="text-sm font-medium">
						Include in file renaming
					</label>
				</div>

				<!-- Conditions Section -->
				<div class="flex-1 overflow-hidden flex flex-col">
					<div class="flex items-center justify-between mb-2">
						<p class="text-sm font-medium">Conditions</p>
						<Button type="button" variant="outline" size="sm" onclick={addCondition}>
							Add Condition
						</Button>
					</div>

					<div class="flex-1 overflow-y-auto border rounded-lg">
						{#if conditions.length === 0}
							<div class="p-4 text-center text-muted-foreground">
								No conditions defined. Add at least one condition.
							</div>
						{:else}
							<div class="divide-y">
								{#each conditions as condition, index}
									<div class="p-3 space-y-2 hover:bg-muted/50 transition-colors">
										<div class="flex items-start gap-2">
											<!-- Type Dropdown -->
											<div class="flex-1 min-w-0">
												<label for="conditionType-{index}" class="text-xs text-muted-foreground">Type</label>
												<select
													id="conditionType-{index}"
													value={condition.type}
													onchange={(e) => {
														const target = e.target as HTMLSelectElement;
														updateCondition(index, "type", target.value);
													}}
													class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
												>
													{#if conditionTypesQuery.data}
														{#each conditionTypesQuery.data as conditionType}
															<option value={conditionType.type}>
																{conditionType.type}
															</option>
														{/each}
													{/if}
												</select>
											</div>

											<!-- Pattern Input -->
											<div class="flex-[2] min-w-0">
												<label for="conditionPattern-{index}" class="text-xs text-muted-foreground">
													{conditionTypeSupportsRegex(condition.type) ? "Pattern (regex)" : "Pattern"}
												</label>
												<input
													id="conditionPattern-{index}"
													type="text"
													value={condition.pattern}
													oninput={(e) => {
														const target = e.target as HTMLInputElement;
														updateCondition(index, "pattern", target.value);
													}}
													placeholder={condition.type === "size" ? "e.g., >500, <1000, 500-1000" : "e.g., x265|HEVC"}
													class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
												/>
											</div>

											<!-- Delete Button -->
											<button
												type="button"
												onclick={() => removeCondition(index)}
												class="mt-6 p-2 text-muted-foreground hover:text-destructive transition-colors"
												title="Remove condition"
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
													<path d="M3 6h18"></path>
													<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
													<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
												</svg>
											</button>
										</div>

										<!-- Checkboxes -->
										<div class="flex items-center gap-6 pl-1">
											<div class="flex items-center gap-2">
												<input
													id="conditionNegate-{index}"
													type="checkbox"
													checked={condition.negate}
													onchange={(e) => {
														const target = e.target as HTMLInputElement;
														updateCondition(index, "negate", target.checked);
													}}
													class="h-4 w-4 rounded border-gray-300"
												/>
												<label for="conditionNegate-{index}" class="text-sm">
													Negate
												</label>
											</div>

											<div class="flex items-center gap-2">
												<input
													id="conditionRequired-{index}"
													type="checkbox"
													checked={condition.required}
													onchange={(e) => {
														const target = e.target as HTMLInputElement;
														updateCondition(index, "required", target.checked);
													}}
													class="h-4 w-4 rounded border-gray-300"
												/>
												<label for="conditionRequired-{index}" class="text-sm">
													Required
												</label>
											</div>
										</div>

										<!-- Type description -->
										<p class="text-xs text-muted-foreground pl-1">
											{getConditionTypeDescription(condition.type)}
										</p>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Test Section -->
				<div class="border rounded-lg p-4 space-y-3">
					<p class="text-sm font-medium">Test Release Name</p>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={testReleaseName}
							placeholder="e.g., Movie.Title.2024.2160p.BluRay.REMUX.HEVC.DTS-HD.MA.7.1-GROUP"
							class="flex-1 rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
						/>
						<Button
							type="button"
							variant="outline"
							onclick={handleTest}
							disabled={isTesting || !testReleaseName.trim()}
						>
							{isTesting ? "Testing..." : "Test"}
						</Button>
					</div>

					{#if testResults !== null}
						<div class="mt-2 p-3 bg-muted/50 rounded-lg">
							{#if testResults.length === 0}
								<p class="text-sm text-muted-foreground">No formats matched</p>
							{:else}
								<p class="text-sm font-medium mb-2">Matched Formats:</p>
								<div class="space-y-2">
									{#each testResults as result}
										<div class="text-sm">
											<span class="font-medium text-green-600 dark:text-green-400">{result.name}</span>
											<ul class="ml-4 mt-1 text-xs text-muted-foreground">
												{#each result.matchedConditions as condition}
													<li class="flex items-center gap-1">
														{#if condition.matched}
															<span class="text-green-600 dark:text-green-400">&#10003;</span>
														{:else}
															<span class="text-red-600 dark:text-red-400">&#10007;</span>
														{/if}
														<span>{condition.type}: {condition.pattern}</span>
													</li>
												{/each}
											</ul>
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
						{isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Format"}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
