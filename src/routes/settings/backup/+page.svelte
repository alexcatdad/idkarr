<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";

const client = useConvexClient();

// Export states
let isExporting = $state(false);
let exportError = $state<string | null>(null);
let exportSuccess = $state<string | null>(null);

// Selective export states
let isExportingSelective = $state(false);
let selectiveExportError = $state<string | null>(null);
let selectiveExportSuccess = $state<string | null>(null);

// Section selection for selective export
let selectedSections = $state<Record<string, boolean>>({
	settings: true,
	qualityProfiles: true,
	customFormats: true,
	indexers: true,
	downloadClients: true,
	rootFolders: true,
	tags: true,
	webhooks: true,
	media: false,
});

// Import states
let isImporting = $state(false);
let importError = $state<string | null>(null);
let importSuccess = $state<string | null>(null);
let importResults = $state<Record<string, number> | null>(null);
let importMode = $state<"merge" | "replace">("merge");
let importFile = $state<File | null>(null);
let fileInputRef = $state<HTMLInputElement | null>(null);

// Section display names
const sectionLabels: Record<string, string> = {
	settings: "Settings",
	qualityProfiles: "Quality Profiles",
	customFormats: "Custom Formats",
	indexers: "Indexers",
	downloadClients: "Download Clients",
	rootFolders: "Root Folders",
	tags: "Tags",
	webhooks: "Webhooks",
	media: "Media Library",
};

// Helper to download JSON
function downloadJson(data: unknown, filename: string) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// Generate filename with current date
function getBackupFilename(): string {
	const now = new Date();
	const date = now.toISOString().split("T")[0];
	return `idkarr-backup-${date}.json`;
}

// Export full backup
async function exportFullBackup() {
	isExporting = true;
	exportError = null;
	exportSuccess = null;

	try {
		const backup = await client.action(api.backup.exportBackup, {});
		downloadJson(backup, getBackupFilename());
		exportSuccess = "Backup exported successfully!";
	} catch (e) {
		exportError = e instanceof Error ? e.message : "Failed to export backup";
	} finally {
		isExporting = false;
	}
}

// Export selective backup
async function exportSelectiveBackup() {
	const sections = Object.entries(selectedSections)
		.filter(([_, selected]) => selected)
		.map(([section]) => section);

	if (sections.length === 0) {
		selectiveExportError = "Please select at least one section to export.";
		return;
	}

	isExportingSelective = true;
	selectiveExportError = null;
	selectiveExportSuccess = null;

	try {
		const backup = await client.action(api.backup.exportSelective, { sections });
		const filename = getBackupFilename().replace(".json", "-selective.json");
		downloadJson(backup, filename);
		selectiveExportSuccess = `Exported ${sections.length} section(s) successfully!`;
	} catch (e) {
		selectiveExportError = e instanceof Error ? e.message : "Failed to export backup";
	} finally {
		isExportingSelective = false;
	}
}

// Handle file selection
function handleFileSelect(event: Event) {
	const input = event.target as HTMLInputElement;
	if (input.files && input.files.length > 0) {
		importFile = input.files[0];
		importError = null;
		importSuccess = null;
		importResults = null;
	}
}

// Import backup
async function importBackup() {
	if (!importFile) {
		importError = "Please select a backup file to import.";
		return;
	}

	isImporting = true;
	importError = null;
	importSuccess = null;
	importResults = null;

	try {
		const text = await importFile.text();
		const backup = JSON.parse(text);

		// Validate backup structure
		if (!backup.appName || backup.appName !== "idkarr") {
			throw new Error("Invalid backup file: not an idkarr backup");
		}

		const result = await client.action(api.backup.importBackup, {
			backup,
			mode: importMode,
		});

		if (result.success) {
			importSuccess = `Backup restored successfully using ${result.mode} mode!`;
			importResults = result.imported;
		} else {
			importError = `Import completed with errors: ${result.errors.join(", ")}`;
			importResults = result.imported;
		}

		// Clear file input
		importFile = null;
		if (fileInputRef) {
			fileInputRef.value = "";
		}
	} catch (e) {
		if (e instanceof SyntaxError) {
			importError = "Invalid JSON file. Please select a valid backup file.";
		} else {
			importError = e instanceof Error ? e.message : "Failed to import backup";
		}
	} finally {
		isImporting = false;
	}
}

// Toggle all sections
function toggleAllSections(selected: boolean) {
	for (const key of Object.keys(selectedSections)) {
		selectedSections[key] = selected;
	}
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
		<h1 class="text-3xl font-bold">Backup & Restore</h1>
		<p class="text-muted-foreground mt-1">
			Export and import your idkarr configuration and data.
		</p>
	</div>

	<!-- Full Export Section -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">Create Full Backup</h2>
			<p class="text-sm text-muted-foreground">
				Export all settings, profiles, formats, and configuration to a JSON file.
			</p>
		</div>

		<div class="p-4 space-y-4">
			<div class="flex items-center gap-4">
				<Button onclick={exportFullBackup} disabled={isExporting}>
					{#if isExporting}
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
						Exporting...
					{:else}
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
							class="mr-2"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="7 10 12 15 17 10" />
							<line x1="12" x2="12" y1="15" y2="3" />
						</svg>
						Create Backup
					{/if}
				</Button>
			</div>

			{#if exportError}
				<div class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
					{exportError}
				</div>
			{/if}

			{#if exportSuccess}
				<div class="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
					{exportSuccess}
				</div>
			{/if}
		</div>
	</section>

	<!-- Selective Export Section -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">Selective Export</h2>
			<p class="text-sm text-muted-foreground">
				Choose specific sections to include in your backup.
			</p>
		</div>

		<div class="p-4 space-y-4">
			<div class="flex items-center gap-4 mb-4">
				<Button variant="outline" size="sm" onclick={() => toggleAllSections(true)}>
					Select All
				</Button>
				<Button variant="outline" size="sm" onclick={() => toggleAllSections(false)}>
					Deselect All
				</Button>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{#each Object.entries(sectionLabels) as [key, label]}
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={selectedSections[key]}
							class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
						/>
						<span class="text-sm">{label}</span>
					</label>
				{/each}
			</div>

			<div class="flex items-center gap-4 pt-4 border-t">
				<Button onclick={exportSelectiveBackup} disabled={isExportingSelective}>
					{#if isExportingSelective}
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
						Exporting...
					{:else}
						Export Selected
					{/if}
				</Button>
			</div>

			{#if selectiveExportError}
				<div class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
					{selectiveExportError}
				</div>
			{/if}

			{#if selectiveExportSuccess}
				<div class="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
					{selectiveExportSuccess}
				</div>
			{/if}
		</div>
	</section>

	<!-- Import Section -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">Restore Backup</h2>
			<p class="text-sm text-muted-foreground">
				Import a previously exported backup file to restore your configuration.
			</p>
		</div>

		<div class="p-4 space-y-4">
			<!-- File Input -->
			<div>
				<label for="backup-file-input" class="block text-sm font-medium mb-2">Backup File</label>
				<input
					id="backup-file-input"
					bind:this={fileInputRef}
					type="file"
					accept=".json"
					onchange={handleFileSelect}
					class="block w-full text-sm text-muted-foreground
						file:mr-4 file:py-2 file:px-4
						file:rounded-md file:border-0
						file:text-sm file:font-medium
						file:bg-primary file:text-primary-foreground
						hover:file:bg-primary/90
						file:cursor-pointer cursor-pointer"
				/>
				{#if importFile}
					<p class="text-sm text-muted-foreground mt-2">
						Selected: {importFile.name}
					</p>
				{/if}
			</div>

			<!-- Import Mode -->
			<fieldset>
				<legend class="block text-sm font-medium mb-2">Import Mode</legend>
				<div class="space-y-2">
					<label class="flex items-start gap-3 cursor-pointer">
						<input
							type="radio"
							bind:group={importMode}
							value="merge"
							class="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
						/>
						<div>
							<span class="text-sm font-medium">Merge</span>
							<p class="text-sm text-muted-foreground">
								Add imported data to existing data. Existing records will not be modified.
							</p>
						</div>
					</label>
					<label class="flex items-start gap-3 cursor-pointer">
						<input
							type="radio"
							bind:group={importMode}
							value="replace"
							class="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
						/>
						<div>
							<span class="text-sm font-medium">Replace</span>
							<p class="text-sm text-muted-foreground">
								Clear existing data before importing.
							</p>
						</div>
					</label>
				</div>
			</fieldset>

			<!-- Replace Mode Warning -->
			{#if importMode === "replace"}
				<div class="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm flex items-start gap-2">
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
						class="mt-0.5 flex-shrink-0"
					>
						<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
						<path d="M12 9v4" />
						<path d="M12 17h.01" />
					</svg>
					<span>
						<strong>Warning:</strong> This will delete all existing data before importing!
						Make sure you have a backup of your current configuration.
					</span>
				</div>
			{/if}

			<!-- Import Button -->
			<div class="flex items-center gap-4 pt-4 border-t">
				<Button onclick={importBackup} disabled={isImporting || !importFile}>
					{#if isImporting}
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
						Importing...
					{:else}
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
							class="mr-2"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" x2="12" y1="3" y2="15" />
						</svg>
						Restore Backup
					{/if}
				</Button>
			</div>

			{#if importError}
				<div class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
					{importError}
				</div>
			{/if}

			{#if importSuccess}
				<div class="p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
					{importSuccess}
				</div>
			{/if}

			{#if importResults && Object.keys(importResults).length > 0}
				<div class="rounded-lg border bg-muted/50 p-4">
					<h3 class="font-medium mb-3">Import Results</h3>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
						{#each Object.entries(importResults) as [section, count]}
							<div class="flex items-center justify-between px-3 py-2 rounded bg-background">
								<span class="text-muted-foreground">{sectionLabels[section] || section}</span>
								<span class="font-medium tabular-nums">{count}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Info Section -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">About Backups</h2>
		</div>

		<div class="p-4 space-y-4">
			<div class="space-y-3 text-sm">
				<div class="flex items-start gap-3">
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
						class="mt-0.5 text-primary flex-shrink-0"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 16v-4" />
						<path d="M12 8h.01" />
					</svg>
					<div>
						<p class="font-medium">What's included in a full backup?</p>
						<p class="text-muted-foreground">
							Settings, quality profiles, quality definitions, custom formats, indexers,
							download clients, root folders, tags, webhooks, naming presets, restrictions,
							and optionally your media library.
						</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
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
						class="mt-0.5 text-primary flex-shrink-0"
					>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
					</svg>
					<div>
						<p class="font-medium">Sensitive data handling</p>
						<p class="text-muted-foreground">
							API keys and passwords are included in backups. Store your backup files securely
							and avoid sharing them.
						</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
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
						class="mt-0.5 text-primary flex-shrink-0"
					>
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
						<path d="M3 3v5h5" />
					</svg>
					<div>
						<p class="font-medium">Best practices</p>
						<p class="text-muted-foreground">
							Create a backup before making major configuration changes, upgrading idkarr,
							or migrating to a new system.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
