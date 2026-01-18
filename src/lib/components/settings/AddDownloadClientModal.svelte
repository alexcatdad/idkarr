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
let type = $state<"qbittorrent" | "transmission" | "deluge" | "rtorrent" | "sabnzbd" | "nzbget">(
	"qbittorrent",
);
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
	const selected = clientTypes.find((c) => c.value === type);
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
