<script lang="ts">
import { useQuery } from "convex-svelte";
import { api } from "../convex/_generated/api";

// Dashboard queries
const seriesStats = useQuery(api.series.getStats, {});
const movieStats = useQuery(api.movies.getStats, {});
const musicStats = useQuery(api.music.getStats, {});
const queueStats = useQuery(api.downloadQueue.getQueueStats, {});
const recentActivity = useQuery(api.activityLog.list, { limit: 10 });
const healthStatus = useQuery(api.systemHealth.getOverallStatus, {});

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatTimeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold">Dashboard</h1>
		<p class="text-muted-foreground">Overview of your media library</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Series Stats -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">TV Series</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
			</div>
			{#if seriesStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if seriesStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{seriesStats.data.seriesCount}</span>
					<span class="ml-2 text-sm text-muted-foreground">
						{seriesStats.data.episodeFileCount}/{seriesStats.data.episodeCount} episodes
					</span>
				</div>
				{#if seriesStats.data.missingEpisodeCount > 0}
					<p class="text-sm text-yellow-600 dark:text-yellow-400">
						{seriesStats.data.missingEpisodeCount} missing
					</p>
				{/if}
			{/if}
		</div>

		<!-- Movies Stats -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Movies</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
			</div>
			{#if movieStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if movieStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{movieStats.data.movieCount}</span>
					<span class="ml-2 text-sm text-muted-foreground">
						{movieStats.data.totalSizeGb} GB
					</span>
				</div>
				{#if movieStats.data.missingCount > 0}
					<p class="text-sm text-yellow-600 dark:text-yellow-400">
						{movieStats.data.missingCount} missing
					</p>
				{/if}
			{/if}
		</div>

		<!-- Music Stats -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Music</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
			</div>
			{#if musicStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if musicStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{musicStats.data.artistCount}</span>
					<span class="ml-2 text-sm text-muted-foreground">
						{musicStats.data.albumCount} albums
					</span>
				</div>
				<p class="text-sm text-muted-foreground">
					{musicStats.data.trackFileCount}/{musicStats.data.trackCount} tracks
				</p>
			{/if}
		</div>

		<!-- Download Queue -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Queue</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
			</div>
			{#if queueStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if queueStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{queueStats.data.totalCount}</span>
					<span class="ml-2 text-sm text-muted-foreground">items</span>
				</div>
				{#if queueStats.data.byStatus?.downloading}
					<p class="text-sm text-blue-600 dark:text-blue-400">
						{queueStats.data.byStatus.downloading} downloading
					</p>
				{/if}
			{/if}
		</div>
	</div>

	<!-- System Health -->
	{#if healthStatus.data && healthStatus.data.status !== "ok"}
		<div class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
			<div class="flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-600 dark:text-yellow-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
				<span class="font-medium text-yellow-600 dark:text-yellow-400">System Issues</span>
			</div>
			<ul class="mt-2 space-y-1">
				{#each healthStatus.data.issues as issue}
					<li class="text-sm text-yellow-800 dark:text-yellow-200">
						<span class="font-medium">{issue.name}:</span> {issue.message}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Recent Activity -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Recent Activity</h2>
			</div>
			<div class="p-4">
				{#if recentActivity.isLoading}
					<div class="space-y-3">
						{#each Array(5) as _}
							<div class="h-12 animate-pulse rounded bg-muted"></div>
						{/each}
					</div>
				{:else if recentActivity.data && recentActivity.data.length > 0}
					<ul class="space-y-3">
						{#each recentActivity.data as activity}
							<li class="flex items-start gap-3">
								<span
									class="mt-1 h-2 w-2 rounded-full {activity.level === 'error'
										? 'bg-red-500'
										: activity.level === 'warning'
											? 'bg-yellow-500'
											: activity.level === 'success'
												? 'bg-green-500'
												: 'bg-blue-500'}"
								></span>
								<div class="flex-1 min-w-0">
									<p class="text-sm truncate">{activity.message}</p>
									<p class="text-xs text-muted-foreground">
										{formatTimeAgo(activity.timestamp)}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">No recent activity</p>
				{/if}
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Quick Actions</h2>
			</div>
			<div class="p-4 grid gap-3 sm:grid-cols-2">
				<a
					href="/series"
					class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted transition-colors"
				>
					<div class="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
					</div>
					<div>
						<p class="font-medium">Add Series</p>
						<p class="text-xs text-muted-foreground">Search and add TV shows</p>
					</div>
				</a>

				<a
					href="/movies"
					class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted transition-colors"
				>
					<div class="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-500"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
					</div>
					<div>
						<p class="font-medium">Add Movie</p>
						<p class="text-xs text-muted-foreground">Search and add movies</p>
					</div>
				</a>

				<a
					href="/queue"
					class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted transition-colors"
				>
					<div class="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
					</div>
					<div>
						<p class="font-medium">View Queue</p>
						<p class="text-xs text-muted-foreground">Manage downloads</p>
					</div>
				</a>

				<a
					href="/settings"
					class="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted transition-colors"
				>
					<div class="h-10 w-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
					</div>
					<div>
						<p class="font-medium">Settings</p>
						<p class="text-xs text-muted-foreground">Configure idkarr</p>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>
