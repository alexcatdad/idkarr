<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const client = useConvexClient();

// Query requests
const requestsQuery = useQuery(api.requests.list, {});

// Filter state
let statusFilter = $state<"all" | "pending" | "approved" | "denied" | "available">("all");
let mediaTypeFilter = $state<"all" | "movie" | "tv">("all");

// Filtered requests
const filteredRequests = $derived(() => {
	if (!requestsQuery.data) return [];

	let result = requestsQuery.data;

	if (statusFilter !== "all") {
		result = result.filter((r) => r.status === statusFilter);
	}

	if (mediaTypeFilter !== "all") {
		result = result.filter((r) => r.mediaType === mediaTypeFilter);
	}

	return result;
});

// Action handlers - note: these need a proper user ID, using a placeholder for now
// In production, you'd get the current user's ID from auth context
async function approveRequest(id: Id<"requests">, processedBy: Id<"users">) {
	await client.mutation(api.requests.approve, { id, processedBy });
}

async function denyRequest(id: Id<"requests">, processedBy: Id<"users">) {
	await client.mutation(api.requests.deny, { id, processedBy });
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffDays === 0) {
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
		});
	}
	if (diffDays < 7) {
		return `${diffDays}d ago`;
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function getStatusColor(status: string): string {
	switch (status) {
		case "pending":
			return "text-yellow-500 bg-yellow-500/10";
		case "approved":
			return "text-blue-500 bg-blue-500/10";
		case "denied":
			return "text-red-500 bg-red-500/10";
		case "available":
			return "text-green-500 bg-green-500/10";
		default:
			return "text-gray-500 bg-gray-500/10";
	}
}

function getMediaTypeIcon(type: string): string {
	switch (type) {
		case "movie":
			return "M3 3h18v18H3V3zm4 0v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4";
		case "tv":
			return "M2 7h20v15H2V7zM17 2l-5 5-5-5";
		default:
			return "M9 18V5l12-2v13M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";
	}
}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Requests</h1>
			<p class="text-muted-foreground">Manage media requests</p>
		</div>
	</div>

	<!-- Stats -->
	{#if requestsQuery.data}
		{@const pending = requestsQuery.data.filter((r) => r.status === "pending").length}
		{@const approved = requestsQuery.data.filter((r) => r.status === "approved").length}
		{@const available = requestsQuery.data.filter((r) => r.status === "available").length}
		<div class="grid gap-4 sm:grid-cols-3">
			<button
				onclick={() => (statusFilter = statusFilter === "pending" ? "all" : "pending")}
				class="rounded-lg border bg-card p-4 text-left hover:border-primary transition-colors {statusFilter === 'pending' ? 'border-primary' : ''}"
			>
				<div class="text-2xl font-bold text-yellow-500">{pending}</div>
				<div class="text-sm text-muted-foreground">Pending Requests</div>
			</button>
			<button
				onclick={() => (statusFilter = statusFilter === "approved" ? "all" : "approved")}
				class="rounded-lg border bg-card p-4 text-left hover:border-primary transition-colors {statusFilter === 'approved' ? 'border-primary' : ''}"
			>
				<div class="text-2xl font-bold text-blue-500">{approved}</div>
				<div class="text-sm text-muted-foreground">Approved</div>
			</button>
			<button
				onclick={() => (statusFilter = statusFilter === "available" ? "all" : "available")}
				class="rounded-lg border bg-card p-4 text-left hover:border-primary transition-colors {statusFilter === 'available' ? 'border-primary' : ''}"
			>
				<div class="text-2xl font-bold text-green-500">{available}</div>
				<div class="text-sm text-muted-foreground">Available</div>
			</button>
		</div>
	{/if}

	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<select
			bind:value={statusFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All Status</option>
			<option value="pending">Pending</option>
			<option value="approved">Approved</option>
			<option value="denied">Denied</option>
			<option value="available">Available</option>
		</select>
		<select
			bind:value={mediaTypeFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All Media Types</option>
			<option value="movie">Movies</option>
			<option value="tv">TV Series</option>
		</select>
	</div>

	<!-- Requests List -->
	{#if requestsQuery.isLoading}
		<div class="space-y-3">
			{#each Array(5) as _}
				<div class="rounded-lg border bg-card p-4">
					<div class="flex gap-4">
						<div class="h-24 w-16 animate-pulse rounded bg-muted"></div>
						<div class="flex-1 space-y-2">
							<div class="h-5 w-3/4 animate-pulse rounded bg-muted"></div>
							<div class="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
							<div class="h-4 w-1/4 animate-pulse rounded bg-muted"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredRequests().length === 0}
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
				<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
				<path
					d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
				/>
			</svg>
			<h2 class="text-xl font-semibold">No requests found</h2>
			<p class="text-muted-foreground mt-1">
				{statusFilter !== "all" || mediaTypeFilter !== "all"
					? "Try adjusting your filters"
					: "Requests will appear here when users submit them"}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredRequests() as request}
				<div class="rounded-lg border bg-card p-4">
					<div class="flex gap-4">
						<!-- Poster -->
						<div class="h-24 w-16 rounded bg-muted flex-shrink-0 flex items-center justify-center">
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
								<path d={getMediaTypeIcon(request.mediaType)} />
							</svg>
						</div>

						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<h3 class="font-semibold">{request.title}</h3>
									<div class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
										<span
											class="px-2 py-0.5 rounded text-xs font-medium capitalize {getStatusColor(request.status)}"
										>
											{request.status}
										</span>
										<span class="capitalize">{request.mediaType}</span>
										{#if request.year}
											<span>({request.year})</span>
										{/if}
									</div>
									<p class="text-sm text-muted-foreground mt-2">
										Requested by <span class="font-medium">{request.requester?.name ?? "Unknown"}</span>
										<span class="mx-1">·</span>
										{formatTimestamp(request.createdAt)}
									</p>
									{#if request.requestNote}
										<p class="text-sm text-muted-foreground mt-1 italic">
											"{request.requestNote}"
										</p>
									{/if}
								</div>

								<!-- Actions -->
								<!-- Note: In production, you'd get the current user's ID from auth context -->
								<!-- For now, the approve/deny buttons won't work without a valid user ID -->
								{#if request.status === "pending"}
									<div class="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled
											title="Requires authentication to approve"
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
												><path d="M20 6 9 17l-5-5" /></svg
											>
											Approve
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled
											title="Requires authentication to deny"
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
												><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
											>
											Deny
										</Button>
									</div>
								{/if}
							</div>

							<!-- Approval/Denial info -->
							{#if request.status === "approved" && request.processor}
								<p class="text-xs text-muted-foreground mt-2">
									Approved by {request.processor.name}
									{#if request.processedAt}
										on {formatTimestamp(request.processedAt)}
									{/if}
								</p>
							{:else if request.status === "denied" && request.processor}
								<p class="text-xs text-muted-foreground mt-2">
									Denied by {request.processor.name}
									{#if request.processedAt}
										on {formatTimestamp(request.processedAt)}
									{/if}
									{#if request.responseNote}
										- {request.responseNote}
									{/if}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
