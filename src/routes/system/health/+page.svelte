<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { onDestroy, onMount } from "svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";

const client = useConvexClient();

// Queries for health data
const healthChecks = useQuery(api.systemHealth.list, {});
const overallStatus = useQuery(api.systemHealth.getOverallStatus, {});

// State for running checks
let isRunning = $state(false);
let lastRefresh = $state(Date.now());

// Auto-refresh interval
let refreshInterval: ReturnType<typeof setInterval> | undefined;

onMount(() => {
	// Auto-refresh every 30 seconds
	refreshInterval = setInterval(() => {
		lastRefresh = Date.now();
	}, 30000);
});

onDestroy(() => {
	if (refreshInterval) {
		clearInterval(refreshInterval);
	}
});

// Run all health checks
async function runAllChecks() {
	isRunning = true;
	try {
		await client.mutation(api.systemHealth.runAllChecks, {});
		lastRefresh = Date.now();
	} catch (e) {
		console.error("Failed to run health checks:", e);
		alert(e instanceof Error ? e.message : "Failed to run health checks");
	} finally {
		isRunning = false;
	}
}

// Format timestamp to readable time
function formatTimestamp(timestamp: number | undefined): string {
	if (!timestamp) return "Never";
	const date = new Date(timestamp);
	const now = Date.now();
	const diff = now - timestamp;

	// Less than a minute ago
	if (diff < 60000) {
		return "Just now";
	}
	// Less than an hour ago
	if (diff < 3600000) {
		const minutes = Math.floor(diff / 60000);
		return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
	}
	// Less than a day ago
	if (diff < 86400000) {
		const hours = Math.floor(diff / 3600000);
		return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
	}
	// Otherwise show date
	return date.toLocaleString();
}

// Get status badge classes
function getStatusBadgeClasses(status: "ok" | "warning" | "error"): string {
	switch (status) {
		case "ok":
			return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
		case "warning":
			return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
		case "error":
			return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
	}
}

// Get status dot classes
function getStatusDotClasses(status: "ok" | "warning" | "error"): string {
	switch (status) {
		case "ok":
			return "bg-green-500";
		case "warning":
			return "bg-yellow-500";
		case "error":
			return "bg-red-500";
	}
}

// Get overall status banner classes
function getOverallBannerClasses(status: "ok" | "warning" | "error"): string {
	switch (status) {
		case "ok":
			return "bg-green-500/10 border-green-500/30";
		case "warning":
			return "bg-yellow-500/10 border-yellow-500/30";
		case "error":
			return "bg-red-500/10 border-red-500/30";
	}
}

// Get overall status text classes
function getOverallTextClasses(status: "ok" | "warning" | "error"): string {
	switch (status) {
		case "ok":
			return "text-green-600 dark:text-green-400";
		case "warning":
			return "text-yellow-600 dark:text-yellow-400";
		case "error":
			return "text-red-600 dark:text-red-400";
	}
}

// Get status label
function getStatusLabel(status: "ok" | "warning" | "error"): string {
	switch (status) {
		case "ok":
			return "All Systems Operational";
		case "warning":
			return "Some Issues Detected";
		case "error":
			return "Critical Issues Detected";
	}
}
</script>

<div class="space-y-6">
	<!-- Header with back link -->
	<div class="flex items-start justify-between">
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
			<h1 class="text-3xl font-bold">System Health</h1>
			<p class="text-muted-foreground mt-1">
				Monitor the health of your idkarr instance and connected services.
			</p>
		</div>
		<Button onclick={runAllChecks} disabled={isRunning}>
			{#if isRunning}
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
				Running Checks...
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
					<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
				</svg>
				Run Checks
			{/if}
		</Button>
	</div>

	<!-- Overall Status Banner -->
	{#if overallStatus.isLoading}
		<div class="h-24 animate-pulse rounded-lg bg-muted"></div>
	{:else if overallStatus.data}
		<div
			class="rounded-lg border p-6 {getOverallBannerClasses(overallStatus.data.status)}"
		>
			<div class="flex items-center gap-4">
				<!-- Status Icon -->
				<div class="flex-shrink-0">
					{#if overallStatus.data.status === "ok"}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-green-500"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
					{:else if overallStatus.data.status === "warning"}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-yellow-500"
						>
							<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
							<path d="M12 9v4" />
							<path d="M12 17h.01" />
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-red-500"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="m15 9-6 6" />
							<path d="m9 9 6 6" />
						</svg>
					{/if}
				</div>
				<!-- Status Text -->
				<div class="flex-1">
					<h2 class="text-xl font-semibold {getOverallTextClasses(overallStatus.data.status)}">
						{getStatusLabel(overallStatus.data.status)}
					</h2>
					<p class="text-sm text-muted-foreground mt-1">
						{overallStatus.data.checksCount} health checks monitored
					</p>
				</div>
			</div>

			<!-- Status Counts -->
			<div class="grid grid-cols-3 gap-4 mt-6">
				<div class="rounded-lg bg-background/50 p-4 text-center">
					<div class="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
						{overallStatus.data.okCount}
					</div>
					<div class="text-sm text-muted-foreground">OK</div>
				</div>
				<div class="rounded-lg bg-background/50 p-4 text-center">
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400 tabular-nums">
						{overallStatus.data.warningsCount}
					</div>
					<div class="text-sm text-muted-foreground">Warnings</div>
				</div>
				<div class="rounded-lg bg-background/50 p-4 text-center">
					<div class="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
						{overallStatus.data.errorsCount}
					</div>
					<div class="text-sm text-muted-foreground">Errors</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Health Checks List -->
	<section class="rounded-lg border bg-card">
		<div class="border-b p-4">
			<h2 class="text-lg font-semibold">Health Checks</h2>
			<p class="text-sm text-muted-foreground">
				Detailed status of all system components and services.
			</p>
		</div>

		{#if healthChecks.isLoading}
			<div class="p-4 space-y-3">
				{#each Array(5) as _}
					<div class="h-16 animate-pulse rounded-lg bg-muted"></div>
				{/each}
			</div>
		{:else if !healthChecks.data || healthChecks.data.length === 0}
			<div class="p-8 text-center">
				<div class="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="text-muted-foreground"
					>
						<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
					</svg>
				</div>
				<p class="text-muted-foreground mb-4">No health checks have been run yet.</p>
				<Button onclick={runAllChecks} disabled={isRunning}>
					{isRunning ? "Running..." : "Run Health Checks"}
				</Button>
			</div>
		{:else}
			<div class="divide-y">
				{#each healthChecks.data as check}
					<div class="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
						<!-- Status Dot -->
						<div class="flex-shrink-0">
							<span class="block h-3 w-3 rounded-full {getStatusDotClasses(check.status)}"></span>
						</div>

						<!-- Check Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="font-medium">{check.name}</h3>
								<span
									class="px-2 py-0.5 rounded text-xs border {getStatusBadgeClasses(check.status)}"
								>
									{check.status.toUpperCase()}
								</span>
							</div>
							{#if check.message}
								<p class="text-sm text-muted-foreground mt-1">{check.message}</p>
							{/if}
						</div>

						<!-- Last Check Time -->
						<div class="flex-shrink-0 text-right">
							<p class="text-xs text-muted-foreground">Last checked</p>
							<p class="text-sm font-medium">{formatTimestamp(check.lastCheck)}</p>
						</div>

						<!-- Wiki Link (if available) -->
						{#if check.wikiUrl}
							<a
								href={check.wikiUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
								title="View documentation"
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
									class="text-muted-foreground"
								>
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<polyline points="15 3 21 3 21 9" />
									<line x1="10" x2="21" y1="14" y2="3" />
								</svg>
							</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Auto-refresh indicator -->
	<p class="text-xs text-muted-foreground text-center">
		Auto-refreshing every 30 seconds. Last update: {formatTimestamp(lastRefresh)}
	</p>
</div>
