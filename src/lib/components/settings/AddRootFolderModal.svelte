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

let path = $state("");
let mediaType = $state<"movie" | "tv" | "music" | "anime">("movie");
let isDefault = $state(false);
let isSubmitting = $state(false);
let error = $state<string | null>(null);

async function handleSubmit() {
	if (!path.trim()) {
		error = "Path is required";
		return;
	}

	isSubmitting = true;
	error = null;

	try {
		await client.mutation(api.rootFolders.add, {
			path: path.trim(),
			mediaType,
			isDefault,
		});
		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add root folder";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	path = "";
	mediaType = "movie";
	isDefault = false;
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
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Root Folder</Dialog.Title>
			<Dialog.Description>
				Configure where media files are stored on disk.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<div>
				<label for="path" class="text-sm font-medium">Path</label>
				<input
					id="path"
					type="text"
					bind:value={path}
					placeholder="/mnt/media/movies"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
				<p class="mt-1 text-xs text-muted-foreground">
					Must be an absolute path (starts with /)
				</p>
			</div>

			<div>
				<label for="mediaType" class="text-sm font-medium">Media Type</label>
				<select
					id="mediaType"
					bind:value={mediaType}
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				>
					<option value="movie">Movies</option>
					<option value="tv">TV Shows</option>
					<option value="anime">Anime</option>
					<option value="music">Music</option>
				</select>
			</div>

			<div class="flex items-center gap-2">
				<input
					id="isDefault"
					type="checkbox"
					bind:checked={isDefault}
					class="h-4 w-4 rounded border-gray-300"
				/>
				<label for="isDefault" class="text-sm font-medium">
					Set as default for this media type
				</label>
			</div>

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Adding..." : "Add Folder"}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
