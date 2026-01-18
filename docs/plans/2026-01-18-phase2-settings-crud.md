# Phase 2: Settings CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Settings page fully functional with Add/Edit/Delete modals for Root Folders, Download Clients, and Indexers.

**Architecture:** Each settings section gets a dedicated modal component for Add/Edit operations. All modals use shadcn-svelte Dialog component. Backend mutations already exist - this phase wires up the UI.

**Tech Stack:** SvelteKit 5, Svelte 5 runes, shadcn-svelte, Convex mutations

---

## Prerequisites

- Alpha phase complete (settings page with tab structure exists)
- Backend CRUD mutations exist in `src/convex/rootFolders.ts`, `src/convex/downloadClients.ts`, `src/convex/indexers.ts`

---

### Task 1: Add Root Folder Modal

**Files:**
- Create: `src/lib/components/settings/AddRootFolderModal.svelte`
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Create the modal component**

Create `src/lib/components/settings/AddRootFolderModal.svelte`:

```svelte
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
```

**Step 2: Wire up the modal in settings page**

In `src/routes/settings/+page.svelte`, add the import and state at the top of the script:

```svelte
import AddRootFolderModal from "$lib/components/settings/AddRootFolderModal.svelte";

let showAddRootFolderModal = $state(false);
```

Replace the "Add Root Folder" button (around line 167):

```svelte
<Button onclick={() => (showAddRootFolderModal = true)}>Add Root Folder</Button>
```

Add the modal at the end of the file (before the closing `</div>`):

```svelte
<AddRootFolderModal bind:open={showAddRootFolderModal} onClose={() => (showAddRootFolderModal = false)} />
```

**Step 3: Verify**

Run: `bun run dev`
Expected: Click "Add Root Folder" button, modal opens, fill form, submit, folder appears in list.

**Step 4: Commit**

```bash
git add src/lib/components/settings/AddRootFolderModal.svelte src/routes/settings/+page.svelte
git commit -m "feat: add root folder modal in settings"
```

---

### Task 2: Delete Root Folder Functionality

**Files:**
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Add delete handler**

In the script section of `src/routes/settings/+page.svelte`:

```typescript
import type { Id } from "../../convex/_generated/dataModel";

const client = useConvexClient();

async function deleteRootFolder(id: Id<"rootFolders">) {
	if (!confirm("Delete this root folder?")) return;
	try {
		await client.mutation(api.rootFolders.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete");
	}
}
```

**Step 2: Wire up the delete button**

In the Media Management section, update the delete button (around line 201-214):

```svelte
<Button variant="ghost" size="icon" onclick={() => deleteRootFolder(folder._id)}>
```

**Step 3: Verify**

Run: `bun run dev`
Expected: Click trash icon on a root folder, confirm dialog appears, folder is deleted.

**Step 4: Commit**

```bash
git add src/routes/settings/+page.svelte
git commit -m "feat: add delete root folder functionality"
```

---

### Task 3: Add Download Client Modal

**Files:**
- Create: `src/lib/components/settings/AddDownloadClientModal.svelte`
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Create the modal component**

Create `src/lib/components/settings/AddDownloadClientModal.svelte`:

```svelte
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
let type = $state<"qbittorrent" | "transmission" | "deluge" | "rtorrent" | "sabnzbd" | "nzbget">("qbittorrent");
let host = $state("localhost");
let port = $state(8080);
let useSsl = $state(false);
let username = $state("");
let password = $state("");
let category = $state("");
let isSubmitting = $state(false);
let error = $state<string | null>(null);

const clientTypes = [
	{ value: "qbittorrent", label: "qBittorrent", defaultPort: 8080 },
	{ value: "transmission", label: "Transmission", defaultPort: 9091 },
	{ value: "deluge", label: "Deluge", defaultPort: 8112 },
	{ value: "rtorrent", label: "rTorrent", defaultPort: 8080 },
	{ value: "sabnzbd", label: "SABnzbd", defaultPort: 8080 },
	{ value: "nzbget", label: "NZBGet", defaultPort: 6789 },
] as const;

function handleTypeChange() {
	const selected = clientTypes.find(c => c.value === type);
	if (selected) {
		port = selected.defaultPort;
	}
}

async function handleSubmit() {
	if (!name.trim()) {
		error = "Name is required";
		return;
	}
	if (!host.trim()) {
		error = "Host is required";
		return;
	}

	isSubmitting = true;
	error = null;

	try {
		await client.mutation(api.downloadClients.add, {
			name: name.trim(),
			type,
			host: host.trim(),
			port,
			useSsl,
			username: username.trim() || undefined,
			password: password.trim() || undefined,
			category: category.trim() || undefined,
		});
		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add download client";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	name = "";
	type = "qbittorrent";
	host = "localhost";
	port = 8080;
	useSsl = false;
	username = "";
	password = "";
	category = "";
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
			<Dialog.Title>Add Download Client</Dialog.Title>
			<Dialog.Description>
				Configure a torrent or usenet client for downloading.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label for="name" class="text-sm font-medium">Name</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="My qBittorrent"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div class="sm:col-span-2">
					<label for="type" class="text-sm font-medium">Client Type</label>
					<select
						id="type"
						bind:value={type}
						onchange={handleTypeChange}
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					>
						{#each clientTypes as clientType}
							<option value={clientType.value}>{clientType.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="host" class="text-sm font-medium">Host</label>
					<input
						id="host"
						type="text"
						bind:value={host}
						placeholder="localhost"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div>
					<label for="port" class="text-sm font-medium">Port</label>
					<input
						id="port"
						type="number"
						bind:value={port}
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div class="sm:col-span-2 flex items-center gap-2">
					<input
						id="useSsl"
						type="checkbox"
						bind:checked={useSsl}
						class="h-4 w-4 rounded border-gray-300"
					/>
					<label for="useSsl" class="text-sm font-medium">Use SSL</label>
				</div>

				<div>
					<label for="username" class="text-sm font-medium">Username</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						placeholder="Optional"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div>
					<label for="password" class="text-sm font-medium">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						placeholder="Optional"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>

				<div class="sm:col-span-2">
					<label for="category" class="text-sm font-medium">Category / Label</label>
					<input
						id="category"
						type="text"
						bind:value={category}
						placeholder="idkarr"
						class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
					/>
					<p class="mt-1 text-xs text-muted-foreground">
						Downloads will be tagged with this category
					</p>
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
					{isSubmitting ? "Adding..." : "Add Client"}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
```

**Step 2: Wire up in settings page**

Add import and state:

```svelte
import AddDownloadClientModal from "$lib/components/settings/AddDownloadClientModal.svelte";

let showAddDownloadClientModal = $state(false);
```

Wire up both "Add Client" buttons (around lines 233 and 245):

```svelte
<Button onclick={() => (showAddDownloadClientModal = true)}>Add Client</Button>
```

Add modal at end of file:

```svelte
<AddDownloadClientModal bind:open={showAddDownloadClientModal} onClose={() => (showAddDownloadClientModal = false)} />
```

**Step 3: Verify**

Run: `bun run dev`
Expected: Click "Add Client", modal opens, fill form, submit, client appears in list.

**Step 4: Commit**

```bash
git add src/lib/components/settings/AddDownloadClientModal.svelte src/routes/settings/+page.svelte
git commit -m "feat: add download client modal in settings"
```

---

### Task 4: Delete Download Client Functionality

**Files:**
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Add delete handler**

```typescript
async function deleteDownloadClient(id: Id<"downloadClients">) {
	if (!confirm("Delete this download client?")) return;
	try {
		await client.mutation(api.downloadClients.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete");
	}
}
```

**Step 2: Add delete button to client cards**

In the download clients section, add a delete button next to the edit button (around line 290-305):

```svelte
<Button variant="ghost" size="icon" onclick={() => deleteDownloadClient(clientData._id)}>
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
	</svg>
</Button>
```

**Step 3: Verify**

Run: `bun run dev`
Expected: Delete button visible, click deletes the client.

**Step 4: Commit**

```bash
git add src/routes/settings/+page.svelte
git commit -m "feat: add delete download client functionality"
```

---

### Task 5: Add Indexer Modal

**Files:**
- Create: `src/lib/components/settings/AddIndexerModal.svelte`
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Create the modal component**

Create `src/lib/components/settings/AddIndexerModal.svelte`:

```svelte
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
```

**Step 2: Wire up in settings page**

Add import and state:

```svelte
import AddIndexerModal from "$lib/components/settings/AddIndexerModal.svelte";

let showAddIndexerModal = $state(false);
```

Wire up both "Add Indexer" buttons (around lines 323 and 335):

```svelte
<Button onclick={() => (showAddIndexerModal = true)}>Add Indexer</Button>
```

Add modal at end of file:

```svelte
<AddIndexerModal bind:open={showAddIndexerModal} onClose={() => (showAddIndexerModal = false)} />
```

**Step 3: Verify**

Run: `bun run dev`
Expected: Click "Add Indexer", modal opens, fill form, submit, indexer appears in list.

**Step 4: Commit**

```bash
git add src/lib/components/settings/AddIndexerModal.svelte src/routes/settings/+page.svelte
git commit -m "feat: add indexer modal in settings"
```

---

### Task 6: Delete Indexer Functionality

**Files:**
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Add delete handler**

```typescript
async function deleteIndexer(id: Id<"indexers">) {
	if (!confirm("Delete this indexer?")) return;
	try {
		await client.mutation(api.indexers.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete");
	}
}
```

**Step 2: Add delete button to indexer cards**

In the indexers section, add a delete button next to the edit button (around line 395-409):

```svelte
<Button variant="ghost" size="icon" onclick={() => deleteIndexer(indexer._id)}>
	<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
	</svg>
</Button>
```

**Step 3: Verify**

Run: `bun run dev`
Expected: Delete button visible, click deletes the indexer.

**Step 4: Commit**

```bash
git add src/routes/settings/+page.svelte
git commit -m "feat: add delete indexer functionality"
```

---

### Task 7: Add Tag Modal

**Files:**
- Create: `src/lib/components/settings/AddTagModal.svelte`
- Modify: `src/routes/settings/+page.svelte`

**Step 1: Create the modal component**

Create `src/lib/components/settings/AddTagModal.svelte`:

```svelte
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
let isSubmitting = $state(false);
let error = $state<string | null>(null);

async function handleSubmit() {
	if (!name.trim()) {
		error = "Name is required";
		return;
	}

	isSubmitting = true;
	error = null;

	try {
		await client.mutation(api.tags.add, {
			name: name.trim(),
		});
		resetForm();
		onClose();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add tag";
	} finally {
		isSubmitting = false;
	}
}

function resetForm() {
	name = "";
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
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Add Tag</Dialog.Title>
			<Dialog.Description>
				Create a tag to organize and route media.
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<div>
				<label for="tagName" class="text-sm font-medium">Name</label>
				<input
					id="tagName"
					type="text"
					bind:value={name}
					placeholder="4k-only"
					class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
			</div>

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => handleOpenChange(false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Adding..." : "Add Tag"}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
```

**Step 2: Wire up in settings page**

Add import and state:

```svelte
import AddTagModal from "$lib/components/settings/AddTagModal.svelte";

let showAddTagModal = $state(false);
```

Wire up both "Add Tag" buttons (around lines 557 and 568):

```svelte
<Button onclick={() => (showAddTagModal = true)}>Add Tag</Button>
```

Add modal at end of file:

```svelte
<AddTagModal bind:open={showAddTagModal} onClose={() => (showAddTagModal = false)} />
```

**Step 3: Add delete tag handler**

```typescript
async function deleteTag(id: Id<"tags">) {
	if (!confirm("Delete this tag?")) return;
	try {
		await client.mutation(api.tags.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete");
	}
}
```

Update the tag buttons to call delete (around line 573-589):

```svelte
<button
	onclick={() => deleteTag(tag._id)}
	class="px-4 py-2 rounded-full border bg-card hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors flex items-center gap-2"
>
```

**Step 4: Verify**

Run: `bun run dev`
Expected: Add Tag creates new tags, clicking a tag deletes it.

**Step 5: Commit**

```bash
git add src/lib/components/settings/AddTagModal.svelte src/routes/settings/+page.svelte
git commit -m "feat: add tag CRUD in settings"
```

---

### Task 8: Type Check and Final Verification

**Files:**
- All modified files

**Step 1: Run type check**

Run: `bun run check`
Expected: No type errors

**Step 2: Fix any errors**

If there are type errors, fix them following the same patterns used in the codebase.

**Step 3: Test all functionality**

Manually verify:
- [ ] Add Root Folder works
- [ ] Delete Root Folder works
- [ ] Add Download Client works
- [ ] Delete Download Client works
- [ ] Add Indexer works
- [ ] Delete Indexer works
- [ ] Add Tag works
- [ ] Delete Tag works

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete settings CRUD phase 2"
git push origin main
```

---

## Summary

Phase 2 adds CRUD operations to the Settings page:
- Root Folders: Add/Delete
- Download Clients: Add/Delete
- Indexers: Add/Delete
- Tags: Add/Delete

The Edit functionality and connection testing will be added in Phase 3.

**Next Phase:** Phase 3 - Release Search & Download Pipeline
