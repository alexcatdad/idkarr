<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import * as Dialog from "$lib/components/ui/dialog";
import { api } from "../../../convex/_generated/api";

interface Props {
	open: boolean;
	onClose: () => void;
}

let { open = $bindable(), onClose }: Props = $props();

const client = useConvexClient();

let name = $state("");
let protocol = $state<"torznab" | "newznab">("torznab");
let baseUrl = $state("");
let apiKey = $state("");
let supportsTvSearch = $state(true);
let supportsMovieSearch = $state(true);
let supportsMusicSearch = $state(false);
let isSubmitting = $state(false);
let error = $state<string | null>(null);

async function handleSubmit() {
	if (!name.trim()) {
		error = "Name is required";
		return;
	}
	if (!baseUrl.trim()) {
		error = "URL is required";
		return;
	}
	if (!apiKey.trim()) {
		error = "API Key is required";
		return;
	}

	isSubmitting = true;
	error = null;

	try {
		await client.mutation(api.indexers.add, {
			name: name.trim(),
			protocol,
			baseUrl: baseUrl.trim(),
			apiKey: apiKey.trim(),
			supportsTvSearch,
			supportsMovieSearch,
			supportsMusicSearch,
			tvCategories: supportsTvSearch ? [5000, 5030, 5040] : [],
			movieCategories: supportsMovieSearch ? [2000, 2010, 2020, 2030, 2040, 2045, 2050] : [],
			musicCategories: supportsMusicSearch ? [3000, 3010, 3020, 3030, 3040] : [],
		});
		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add indexer";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	name = "";
	protocol = "torznab";
	baseUrl = "";
	apiKey = "";
	supportsTvSearch = true;
	supportsMovieSearch = true;
	supportsMusicSearch = false;
	error = null;
}

function handleOpenChange(isOpen: boolean) {
	if (!isOpen) {
		resetForm();
		onClose();
	}
}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Indexer</Dialog.Title>
			<Dialog.Description>
				Configure a Torznab or Newznab indexer for release searching.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<div>
				<label for="name" class="text-sm font-medium">Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					placeholder="My Indexer"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<div>
				<label for="protocol" class="text-sm font-medium">Protocol</label>
				<select
					id="protocol"
					bind:value={protocol}
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				>
					<option value="torznab">Torznab (Torrents)</option>
					<option value="newznab">Newznab (Usenet)</option>
				</select>
			</div>

			<div>
				<label for="baseUrl" class="text-sm font-medium">URL</label>
				<input
					id="baseUrl"
					type="url"
					bind:value={baseUrl}
					placeholder="http://localhost:9696"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
				<p class="mt-1 text-xs text-muted-foreground">
					The base URL of your indexer (e.g., Prowlarr or Jackett)
				</p>
			</div>

			<div>
				<label for="apiKey" class="text-sm font-medium">API Key</label>
				<input
					id="apiKey"
					type="text"
					bind:value={apiKey}
					placeholder="Your API key"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium">Capabilities</p>
				<div class="flex flex-wrap gap-4">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={supportsTvSearch} class="h-4 w-4 rounded" />
						TV Shows
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={supportsMovieSearch} class="h-4 w-4 rounded" />
						Movies
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={supportsMusicSearch} class="h-4 w-4 rounded" />
						Music
					</label>
				</div>
			</div>

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Adding..." : "Add Indexer"}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
