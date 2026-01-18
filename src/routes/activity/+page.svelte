<script lang="ts">
import { useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";

// Query activity log
const activityQuery = useQuery(api.activityLog.list, { limit: 100 });

// Filter state
let levelFilter = $state<"all" | "info" | "warning" | "error" | "success">("all");
let eventTypeFilter = $state<string>("all");

// Get unique event types
const eventTypes = $derived(() => {
	if (!activityQuery.data) return [];
	const types = new Set(activityQuery.data.map((a) => a.eventType));
	return Array.from(types).sort();
});

// Filtered activities
const filteredActivities = $derived(() => {
	if (!activityQuery.data) return [];

	let result = activityQuery.data;

	if (levelFilter !== "all") {
		result = result.filter((a) => a.level === levelFilter);
	}

	if (eventTypeFilter !== "all") {
		result = result.filter((a) => a.eventType === eventTypeFilter);
	}

	return result;
});

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function getLevelIcon(level: string) {
	switch (level) {
		case "error":
			return { color: "text-red-500", bg: "bg-red-500/10" };
		case "warning":
			return { color: "text-yellow-500", bg: "bg-yellow-500/10" };
		case "success":
			return { color: "text-green-500", bg: "bg-green-500/10" };
		default:
			return { color: "text-blue-500", bg: "bg-blue-500/10" };
	}
}

function getEventTypeIcon(eventType: string): string {
	if (eventType.includes("download")) {
		return "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3";
	}
	if (eventType.includes("media") || eventType.includes("episode") || eventType.includes("movie")) {
		return "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7l-5-5zM14 2v5h5";
	}
	if (eventType.includes("indexer")) {
		return "M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9";
	}
	if (eventType.includes("system") || eventType.includes("health")) {
		return "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z";
	}
	if (eventType.includes("request")) {
		return "M22 12h-4l-3 9L9 3l-3 9H2";
	}
	return "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6";
}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Activity</h1>
			<p class="text-muted-foreground">System activity and event history</p>
		</div>
		<Button variant="outline" onclick={() => { levelFilter = "all"; eventTypeFilter = "all"; }}>
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
				><path d="M3 6h18" /><path d="M7 12h10" /><path d="M10 18h4" /></svg
			>
			Clear Filters
		</Button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<select
			bind:value={levelFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All Levels</option>
			<option value="info">Info</option>
			<option value="success">Success</option>
			<option value="warning">Warning</option>
			<option value="error">Error</option>
		</select>
		<select
			bind:value={eventTypeFilter}
			class="rounded-lg border bg-background px-4 py-2 text-sm"
		>
			<option value="all">All Event Types</option>
			{#each eventTypes() as eventType}
				<option value={eventType}>{eventType}</option>
			{/each}
		</select>
	</div>

	<!-- Activity List -->
	{#if activityQuery.isLoading}
		<div class="space-y-3">
			{#each Array(10) as _}
				<div class="rounded-lg border bg-card p-4">
					<div class="flex gap-4">
						<div class="h-10 w-10 animate-pulse rounded-lg bg-muted"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
							<div class="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if filteredActivities().length === 0}
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
				<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
			</svg>
			<h2 class="text-xl font-semibold">No activity found</h2>
			<p class="text-muted-foreground mt-1">
				{levelFilter !== "all" || eventTypeFilter !== "all"
					? "Try adjusting your filters"
					: "Activity will appear here as events occur"}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredActivities() as activity}
				{@const levelStyle = getLevelIcon(activity.level)}
				<div class="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors">
					<div class="flex gap-4">
						<!-- Icon -->
						<div
							class="h-10 w-10 rounded-lg {levelStyle.bg} flex items-center justify-center flex-shrink-0"
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
								class={levelStyle.color}
							>
								<path d={getEventTypeIcon(activity.eventType)} />
							</svg>
						</div>

						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="font-medium">{activity.message}</p>
									<div class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
										<span
											class="px-2 py-0.5 rounded text-xs font-medium {levelStyle.bg} {levelStyle.color}"
										>
											{activity.level}
										</span>
										<span>{activity.eventType}</span>
										<span>·</span>
										<span>{formatTimestamp(activity.timestamp)}</span>
									</div>
								</div>
							</div>

							<!-- Data -->
							{#if activity.data}
								<div class="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
									<pre class="whitespace-pre-wrap font-mono text-xs">{activity.data}</pre>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
