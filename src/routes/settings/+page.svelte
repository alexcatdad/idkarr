<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import AddDownloadClientModal from "$lib/components/settings/AddDownloadClientModal.svelte";
import AddRootFolderModal from "$lib/components/settings/AddRootFolderModal.svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

let showAddRootFolderModal = $state(false);
let showAddDownloadClientModal = $state(false);

const client = useConvexClient();

async function deleteRootFolder(id: Id<"rootFolders">) {
	if (!confirm("Delete this root folder?")) return;
	try {
		await client.mutation(api.rootFolders.remove, { id });
	} catch (e) {
		alert(e instanceof Error ? e.message : "Failed to delete");
	}
}

// Settings queries
const settingsQuery = useQuery(api.settings.get, {});
const rootFoldersQuery = useQuery(api.rootFolders.list, {});
const downloadClientsQuery = useQuery(api.downloadClients.list, {});
const indexersQuery = useQuery(api.indexers.list, {});
const qualityProfilesQuery = useQuery(api.qualityProfiles.list, {});
const customFormatsQuery = useQuery(api.customFormats.list, {});
const tagsQuery = useQuery(api.tags.list, {});
const webhooksQuery = useQuery(api.webhooks.list, {});

// Active section
let activeSection = $state<
	"general" | "media" | "clients" | "indexers" | "quality" | "formats" | "tags" | "notifications"
>("general");

const sections = [
	{
		id: "general",
		label: "General",
		icon: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
	},
	{
		id: "media",
		label: "Media Management",
		icon: "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z",
	},
	{
		id: "clients",
		label: "Download Clients",
		icon: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
	},
	{
		id: "indexers",
		label: "Indexers",
		icon: "M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9",
	},
	{
		id: "quality",
		label: "Quality Profiles",
		icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
	},
	{
		id: "formats",
		label: "Custom Formats",
		icon: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM14 2v6h6",
	},
	{
		id: "tags",
		label: "Tags",
		icon: "M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2zM7 7h.01",
	},
	{
		id: "notifications",
		label: "Notifications",
		icon: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
	},
] as const;
</script>

<div class="flex gap-6 h-full">
	<!-- Sidebar -->
	<div class="w-64 flex-shrink-0">
		<nav class="space-y-1">
			{#each sections as section}
				<button
					onclick={() => (activeSection = section.id)}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
						{activeSection === section.id
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d={section.icon} />
					</svg>
					{section.label}
				</button>
			{/each}
		</nav>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		<!-- General Settings -->
		{#if activeSection === "general"}
			<div class="space-y-6">
				<div>
					<h2 class="text-2xl font-bold">General Settings</h2>
					<p class="text-muted-foreground">Configure basic application settings</p>
				</div>

				{#if settingsQuery.isLoading}
					<div class="space-y-4">
						{#each Array(3) as _}
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
						{/each}
					</div>
				{:else if settingsQuery.data}
					<div class="space-y-4">
						<div class="rounded-lg border bg-card p-6">
							<h3 class="font-semibold mb-4">Instance</h3>
							<div class="grid gap-4 sm:grid-cols-2">
								<div>
									<label class="text-sm font-medium">Instance Name</label>
									<input
										type="text"
										value={settingsQuery.data.instanceName}
										class="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
									/>
								</div>
							</div>
						</div>

						<div class="rounded-lg border bg-card p-6">
							<h3 class="font-semibold mb-4">TRaSH Guides Integration</h3>
							<div class="flex items-center justify-between">
								<div>
									<p class="font-medium">Auto Sync</p>
									<p class="text-sm text-muted-foreground">
										Automatically sync custom formats from TRaSH Guides
									</p>
								</div>
								<label class="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={settingsQuery.data.trashSyncEnabled}
										class="sr-only peer"
									/>
									<div
										class="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
									></div>
								</label>
							</div>
							{#if settingsQuery.data.trashLastSync}
								<p class="text-xs text-muted-foreground mt-2">
									Last synced: {new Date(settingsQuery.data.trashLastSync).toLocaleString()}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Media Management -->
		{#if activeSection === "media"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Media Management</h2>
						<p class="text-muted-foreground">Configure root folders and naming</p>
					</div>
					<Button onclick={() => (showAddRootFolderModal = true)}>Add Root Folder</Button>
				</div>

				<div class="rounded-lg border bg-card">
					<div class="border-b p-4">
						<h3 class="font-semibold">Root Folders</h3>
					</div>
					{#if rootFoldersQuery.isLoading}
						<div class="p-4 space-y-3">
							{#each Array(2) as _}
								<div class="h-16 animate-pulse rounded bg-muted"></div>
							{/each}
						</div>
					{:else if !rootFoldersQuery.data || rootFoldersQuery.data.length === 0}
						<div class="p-8 text-center text-muted-foreground">
							No root folders configured
						</div>
					{:else}
						<div class="divide-y">
							{#each rootFoldersQuery.data as folder}
								<div class="flex items-center justify-between p-4">
									<div>
										<p class="font-medium font-mono">{folder.path}</p>
										<div class="flex items-center gap-2 mt-1">
											<span class="text-sm text-muted-foreground capitalize">
												{folder.mediaType}
											</span>
											{#if folder.isDefault}
												<span class="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
													Default
												</span>
											{/if}
										</div>
									</div>
									<Button variant="ghost" size="icon" onclick={() => deleteRootFolder(folder._id)}>
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
											><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
												d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
											/></svg
										>
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Download Clients -->
		{#if activeSection === "clients"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Download Clients</h2>
						<p class="text-muted-foreground">Configure torrent and usenet clients</p>
					</div>
					<Button onclick={() => (showAddDownloadClientModal = true)}>Add Client</Button>
				</div>

				{#if downloadClientsQuery.isLoading}
					<div class="space-y-3">
						{#each Array(2) as _}
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
						{/each}
					</div>
				{:else if !downloadClientsQuery.data || downloadClientsQuery.data.length === 0}
					<div class="rounded-lg border bg-card p-8 text-center">
						<p class="text-muted-foreground">No download clients configured</p>
						<Button class="mt-4" onclick={() => (showAddDownloadClientModal = true)}>Add Download Client</Button>
					</div>
				{:else}
					<div class="space-y-3">
						{#each downloadClientsQuery.data as clientData}
							<div class="rounded-lg border bg-card p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-4">
										<div
											class="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="text-muted-foreground"
												><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline
													points="7 10 12 15 17 10"
												/><line x1="12" x2="12" y1="15" y2="3" /></svg
											>
										</div>
										<div>
											<div class="flex items-center gap-2">
												<p class="font-medium">{clientData.name}</p>
												{#if !clientData.enabled}
													<span
														class="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-500"
													>
														Disabled
													</span>
												{/if}
											</div>
											<p class="text-sm text-muted-foreground">
												{clientData.type} · {clientData.host}:{clientData.port}
											</p>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Button variant="outline" size="sm">Test</Button>
										<Button variant="ghost" size="icon">
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
												><path
													d="M12 20h9"
												/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg
											>
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Indexers -->
		{#if activeSection === "indexers"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Indexers</h2>
						<p class="text-muted-foreground">Configure Torznab and Newznab indexers</p>
					</div>
					<Button>Add Indexer</Button>
				</div>

				{#if indexersQuery.isLoading}
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
						{/each}
					</div>
				{:else if !indexersQuery.data || indexersQuery.data.length === 0}
					<div class="rounded-lg border bg-card p-8 text-center">
						<p class="text-muted-foreground">No indexers configured</p>
						<Button class="mt-4">Add Indexer</Button>
					</div>
				{:else}
					<div class="space-y-3">
						{#each indexersQuery.data as indexer}
							<div class="rounded-lg border bg-card p-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-4">
										<div
											class="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="text-muted-foreground"
												><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line
													x1="21.17"
													x2="12"
													y1="8"
													y2="8"
												/><line x1="3.95" x2="8.54" y1="6.06" y2="14" /><line
													x1="10.88"
													x2="15.46"
													y1="21.94"
													y2="14"
												/></svg
											>
										</div>
										<div>
											<div class="flex items-center gap-2">
												<p class="font-medium">{indexer.name}</p>
												{#if !indexer.enabled}
													<span
														class="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-500"
													>
														Disabled
													</span>
												{/if}
												{#if indexer.disabledUntil && indexer.disabledUntil > Date.now()}
													<span
														class="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-500"
													>
														Backoff
													</span>
												{/if}
											</div>
											<p class="text-sm text-muted-foreground">
												{indexer.protocol} · Priority: {indexer.priority}
											</p>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Button variant="outline" size="sm">Test</Button>
										<Button variant="ghost" size="icon">
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
												><path
													d="M12 20h9"
												/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg
											>
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Quality Profiles -->
		{#if activeSection === "quality"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Quality Profiles</h2>
						<p class="text-muted-foreground">Define quality preferences for downloads</p>
					</div>
					<Button>Add Profile</Button>
				</div>

				{#if qualityProfilesQuery.isLoading}
					<div class="grid gap-4 sm:grid-cols-2">
						{#each Array(4) as _}
							<div class="h-32 animate-pulse rounded-lg bg-muted"></div>
						{/each}
					</div>
				{:else if !qualityProfilesQuery.data || qualityProfilesQuery.data.length === 0}
					<div class="rounded-lg border bg-card p-8 text-center">
						<p class="text-muted-foreground">No quality profiles configured</p>
						<Button class="mt-4">Add Quality Profile</Button>
					</div>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2">
						{#each qualityProfilesQuery.data as profile}
							<div class="rounded-lg border bg-card p-4 hover:border-primary transition-colors cursor-pointer">
								<div class="flex items-center justify-between mb-2">
									<h3 class="font-semibold">{profile.name}</h3>
									{#if profile.upgradeAllowed}
										<span class="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-500">
											Upgrades
										</span>
									{/if}
								</div>
								<p class="text-sm text-muted-foreground">
									{profile.items.length} qualities configured
								</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Custom Formats -->
		{#if activeSection === "formats"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Custom Formats</h2>
						<p class="text-muted-foreground">Define custom scoring rules for releases</p>
					</div>
					<div class="flex gap-2">
						<Button variant="outline">Import TRaSH</Button>
						<Button>Add Format</Button>
					</div>
				</div>

				{#if customFormatsQuery.isLoading}
					<div class="space-y-3">
						{#each Array(5) as _}
							<div class="h-16 animate-pulse rounded-lg bg-muted"></div>
						{/each}
					</div>
				{:else if !customFormatsQuery.data || customFormatsQuery.data.length === 0}
					<div class="rounded-lg border bg-card p-8 text-center">
						<p class="text-muted-foreground">No custom formats configured</p>
						<div class="flex justify-center gap-2 mt-4">
							<Button variant="outline">Import from TRaSH Guides</Button>
							<Button>Add Custom Format</Button>
						</div>
					</div>
				{:else}
					<div class="rounded-lg border bg-card overflow-hidden">
						<table class="w-full">
							<thead class="border-b bg-muted/50">
								<tr>
									<th class="text-left p-4 font-medium text-sm">Name</th>
									<th class="text-left p-4 font-medium text-sm">Conditions</th>
									<th class="text-left p-4 font-medium text-sm">Include in Renaming</th>
									<th class="text-right p-4 font-medium text-sm">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each customFormatsQuery.data as format}
									<tr class="border-b last:border-0 hover:bg-muted/50">
										<td class="p-4 font-medium">{format.name}</td>
										<td class="p-4 text-sm text-muted-foreground">
											{format.conditions.length} condition(s)
										</td>
										<td class="p-4 text-sm">
											{#if format.includeWhenRenaming}
												<span class="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-500">
													Yes
												</span>
											{:else}
												<span class="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
													No
												</span>
											{/if}
										</td>
										<td class="p-4 text-right">
											<Button variant="ghost" size="icon">
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
													><path
														d="M12 20h9"
													/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg
												>
											</Button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Tags -->
		{#if activeSection === "tags"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Tags</h2>
						<p class="text-muted-foreground">Create tags to organize and route media</p>
					</div>
					<Button>Add Tag</Button>
				</div>

				{#if tagsQuery.isLoading}
					<div class="flex flex-wrap gap-2">
						{#each Array(8) as _}
							<div class="h-8 w-24 animate-pulse rounded-full bg-muted"></div>
						{/each}
					</div>
				{:else if !tagsQuery.data || tagsQuery.data.length === 0}
					<div class="rounded-lg border bg-card p-8 text-center">
						<p class="text-muted-foreground">No tags created</p>
						<Button class="mt-4">Create Tag</Button>
					</div>
				{:else}
					<div class="flex flex-wrap gap-2">
						{#each tagsQuery.data as tag}
							<button
								class="px-4 py-2 rounded-full border bg-card hover:bg-muted transition-colors flex items-center gap-2"
							>
								<span class="font-medium">{tag.name}</span>
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
									class="text-muted-foreground"
									><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
								>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Notifications (Webhooks) -->
		{#if activeSection === "notifications"}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Notifications</h2>
						<p class="text-muted-foreground">Configure webhooks for event notifications</p>
					</div>
					<Button>Add Webhook</Button>
				</div>

				{#if webhooksQuery.isLoading}
					<div class="space-y-3">
						{#each Array(2) as _}
							<div class="h-20 animate-pulse rounded-lg bg-muted"></div>
						{/each}
					</div>
				{:else if !webhooksQuery.data || webhooksQuery.data.length === 0}
					<div class="rounded-lg border bg-card p-8 text-center">
						<p class="text-muted-foreground">No webhooks configured</p>
						<Button class="mt-4">Add Webhook</Button>
					</div>
				{:else}
					<div class="space-y-3">
						{#each webhooksQuery.data as webhook}
							<div class="rounded-lg border bg-card p-4">
								<div class="flex items-center justify-between">
									<div>
										<div class="flex items-center gap-2">
											<p class="font-medium">{webhook.name}</p>
											{#if !webhook.enabled}
												<span
													class="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-500"
												>
													Disabled
												</span>
											{/if}
										</div>
										<p class="text-sm text-muted-foreground font-mono truncate max-w-md">
											{webhook.url}
										</p>
										<div class="flex flex-wrap gap-1 mt-2">
											{#each webhook.events as event}
												<span class="px-2 py-0.5 rounded text-xs bg-muted">
													{event}
												</span>
											{/each}
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Button variant="outline" size="sm">Test</Button>
										<Button variant="ghost" size="icon">
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
												><path
													d="M12 20h9"
												/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg
											>
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<AddRootFolderModal bind:open={showAddRootFolderModal} onClose={() => (showAddRootFolderModal = false)} />
	<AddDownloadClientModal bind:open={showAddDownloadClientModal} onClose={() => (showAddDownloadClientModal = false)} />
</div>
