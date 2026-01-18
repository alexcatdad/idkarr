<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const client = useConvexClient();

// Query download queue
const queueQuery = useQuery(api.downloadQueue.list, {});
const historyQuery = useQuery(api.downloadQueue.getHistory, { limit: 50 });

// Tab state
let activeTab = $state<"queue" | "history">("queue");

// Action handlers
async function pauseItem(id: Id<"downloadQueue">) {
	await client.mutation(api.downloadQueue.pause, { id });
}

async function resumeItem(id: Id<"downloadQueue">) {
	await client.mutation(api.downloadQueue.resume, { id });
}

async function retryItem(id: Id<"downloadQueue">) {
	await client.mutation(api.downloadQueue.retry, { id });
}

async function removeItem(id: Id<"downloadQueue">) {
	await client.mutation(api.downloadQueue.remove, { id });
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatTimeRemaining(seconds?: number): string {
	if (!seconds) return "Unknown";
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function getStatusColor(status: string): string {
	switch (status) {
		case "downloading":
			return "text-blue-500 bg-blue-500/10";
		case "paused":
			return "text-yellow-500 bg-yellow-500/10";
		case "queued":
			return "text-gray-500 bg-gray-500/10";
		case "importing":
			return "text-purple-500 bg-purple-500/10";
		case "completed":
			return "text-green-500 bg-green-500/10";
		case "failed":
			return "text-red-500 bg-red-500/10";
		default:
			return "text-gray-500 bg-gray-500/10";
	}
}

function getHistoryEventColor(eventType: string): string {
	switch (eventType) {
		case "grabbed":
			return "text-blue-500 bg-blue-500/10";
		case "downloadCompleted":
		case "importCompleted":
			return "text-green-500 bg-green-500/10";
		case "downloadFailed":
		case "importFailed":
			return "text-red-500 bg-red-500/10";
		case "deleted":
			return "text-yellow-500 bg-yellow-500/10";
		default:
			return "text-gray-500 bg-gray-500/10";
	}
}

function getHistoryEventLabel(eventType: string): string {
	switch (eventType) {
		case "grabbed":
			return "Grabbed";
		case "downloadCompleted":
			return "Downloaded";
		case "importCompleted":
			return "Imported";
		case "downloadFailed":
			return "Download Failed";
		case "importFailed":
			return "Import Failed";
		case "deleted":
			return "Deleted";
		default:
			return eventType;
	}
}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Queue</h1>
			<p class="text-muted-foreground">Manage your downloads</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline">
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
					class="mr-2"
					><rect x="14" y="4" width="4" height="16" rx="1" /><rect
						x="6"
						y="4"
						width="4"
						height="16"
						rx="1"
					/></svg
				>
				Pause All
			</Button>
		</div>
	</div>

	<!-- Tabs -->
	<div class="border-b">
		<div class="flex gap-4">
			<button
				onclick={() => (activeTab = "queue")}
				class="pb-3 px-1 text-sm font-medium border-b-2 transition-colors {activeTab === 'queue'
					? 'border-primary text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				Queue
				{#if queueQuery.data}
					<span
						class="ml-2 px-2 py-0.5 rounded-full text-xs bg-muted"
					>
						{queueQuery.data.length}
					</span>
				{/if}
			</button>
			<button
				onclick={() => (activeTab = "history")}
				class="pb-3 px-1 text-sm font-medium border-b-2 transition-colors {activeTab === 'history'
					? 'border-primary text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
			>
				History
			</button>
		</div>
	</div>

	<!-- Queue Tab -->
	{#if activeTab === "queue"}
		{#if queueQuery.isLoading}
			<div class="space-y-3">
				{#each Array(5) as _}
					<div class="rounded-lg border bg-card p-4">
						<div class="flex gap-4">
							<div class="h-16 w-12 animate-pulse rounded bg-muted"></div>
							<div class="flex-1 space-y-2">
								<div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
								<div class="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
								<div class="h-2 w-full animate-pulse rounded bg-muted"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if !queueQuery.data || queueQuery.data.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="64"
					height="64"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-muted-foreground mb-4"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" x2="12" y1="15" y2="3" />
				</svg>
				<h2 class="text-xl font-semibold">Queue is empty</h2>
				<p class="text-muted-foreground mt-1">
					Downloads will appear here when added
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each queueQuery.data as item}
					<div class="rounded-lg border bg-card p-4">
						<div class="flex gap-4">
							<!-- Media icon (mediaType is on item.media, not item) -->
							<div
								class="h-16 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="text-muted-foreground"
								>
									{#if item.media?.mediaType === "tv" || item.media?.mediaType === "anime"}
										<rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
										<polyline points="17 2 12 7 7 2" />
									{:else if item.media?.mediaType === "movie"}
										<rect width="18" height="18" x="3" y="3" rx="2" />
										<path d="M7 3v18" />
										<path d="M3 7.5h4" />
										<path d="M3 12h18" />
										<path d="M3 16.5h4" />
										<path d="M17 3v18" />
										<path d="M17 7.5h4" />
										<path d="M17 16.5h4" />
									{:else}
										<path d="M9 18V5l12-2v13" />
										<circle cx="6" cy="18" r="3" />
										<circle cx="18" cy="16" r="3" />
									{/if}
								</svg>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-start justify-between gap-4">
									<div>
										<h3 class="font-medium truncate">{item.title}</h3>
										<div class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
											<span
												class="px-2 py-0.5 rounded text-xs font-medium capitalize {getStatusColor(item.status)}"
											>
												{item.status}
											</span>
											<span class="capitalize">{item.media?.mediaType ?? "unknown"}</span>
											{#if item.downloadClient}
												<span>· {item.downloadClient.name}</span>
											{/if}
										</div>
									</div>

									<!-- Actions -->
									<div class="flex gap-1">
										{#if item.status === "downloading"}
											<Button
												variant="ghost"
												size="icon"
												onclick={() => pauseItem(item._id)}
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
													><rect x="14" y="4" width="4" height="16" rx="1" /><rect
														x="6"
														y="4"
														width="4"
														height="16"
														rx="1"
													/></svg
												>
											</Button>
										{:else if item.status === "paused"}
											<Button
												variant="ghost"
												size="icon"
												onclick={() => resumeItem(item._id)}
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
													><polygon points="6 3 20 12 6 21 6 3" /></svg
												>
											</Button>
										{:else if item.status === "failed"}
											<Button
												variant="ghost"
												size="icon"
												onclick={() => retryItem(item._id)}
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
													><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path
														d="M21 3v5h-5"
													/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path
														d="M8 16H3v5"
													/></svg
												>
											</Button>
										{/if}
										<Button
											variant="ghost"
											size="icon"
											onclick={() => removeItem(item._id)}
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
												><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
											>
										</Button>
									</div>
								</div>

								<!-- Progress -->
								{#if item.status === "downloading" || item.status === "paused"}
									<div class="mt-3">
										<div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
											<span>
												{formatBytes(item.downloadedSize ?? 0)} / {formatBytes(item.size ?? 0)}
											</span>
											<span>
												{#if item.status === "downloading" && item.eta}
													{formatTimeRemaining(item.eta)}
												{:else}
													{Math.round(item.progress ?? 0)}%
												{/if}
											</span>
										</div>
										<div class="h-2 bg-muted rounded-full overflow-hidden">
											<div
												class="h-full bg-primary transition-all duration-300"
												style="width: {item.progress ?? 0}%"
											></div>
										</div>
									</div>
								{/if}

								<!-- Error message -->
								{#if item.status === "failed" && item.errorMessage}
									<p class="mt-2 text-sm text-red-500">{item.errorMessage}</p>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- History Tab -->
	{#if activeTab === "history"}
		{#if historyQuery.isLoading}
			<div class="space-y-3">
				{#each Array(5) as _}
					<div class="rounded-lg border bg-card p-4">
						<div class="h-16 animate-pulse rounded bg-muted"></div>
					</div>
				{/each}
			</div>
		{:else if !historyQuery.data || historyQuery.data.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="64"
					height="64"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-muted-foreground mb-4"
				>
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
				<h2 class="text-xl font-semibold">No download history</h2>
				<p class="text-muted-foreground mt-1">
					Completed downloads will appear here
				</p>
			</div>
		{:else}
			<div class="rounded-lg border bg-card overflow-hidden">
				<table class="w-full">
					<thead class="border-b bg-muted/50">
						<tr>
							<th class="text-left p-4 font-medium text-sm">Title</th>
							<th class="text-left p-4 font-medium text-sm">Type</th>
							<th class="text-left p-4 font-medium text-sm">Size</th>
							<th class="text-left p-4 font-medium text-sm">Date</th>
							<th class="text-left p-4 font-medium text-sm">Event</th>
						</tr>
					</thead>
					<tbody>
						{#each historyQuery.data as item}
							<tr class="border-b last:border-0 hover:bg-muted/50">
								<td class="p-4">
									<div class="font-medium truncate max-w-xs">{item.title}</div>
								</td>
								<td class="p-4 text-sm capitalize text-muted-foreground">
									{item.media?.mediaType ?? "-"}
								</td>
								<td class="p-4 text-sm text-muted-foreground">{formatBytes(item.size ?? 0)}</td>
								<td class="p-4 text-sm text-muted-foreground">{formatTimestamp(item.date)}</td>
								<td class="p-4">
									<span
										class="px-2 py-1 rounded text-xs font-medium {getHistoryEventColor(item.eventType)}"
									>
										{getHistoryEventLabel(item.eventType)}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
