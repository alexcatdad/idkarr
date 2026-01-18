<script lang="ts">
import { useQuery } from "convex-svelte";
import { api } from "../../convex/_generated/api";

// Fetch all required data
const movieStats = useQuery(api.movies.getStats, {});
const seriesStats = useQuery(api.series.getStats, {});
const musicStats = useQuery(api.music.getStats, {});
const queueStats = useQuery(api.downloadQueue.getQueueStats, {});
const qualityProfiles = useQuery(api.qualityProfiles.list, {});
const rootFolders = useQuery(api.rootFolders.list, {});
const recentActivity = useQuery(api.activityLog.list, { limit: 20 });
const movies = useQuery(api.movies.list, {});
const series = useQuery(api.series.list, {});
const musicArtists = useQuery(api.music.listArtists, {});

// Calculate stats from movies
const movieStatusBreakdown = $derived(() => {
	if (!movies.data) return { monitored: 0, unmonitored: 0, byStatus: {} as Record<string, number> };

	const monitored = movies.data.filter((m: { monitored: boolean }) => m.monitored).length;
	const unmonitored = movies.data.length - monitored;
	const byStatus: Record<string, number> = {};

	for (const movie of movies.data) {
		const status = movie.status ?? "unknown";
		byStatus[status] = (byStatus[status] ?? 0) + 1;
	}

	return { monitored, unmonitored, byStatus };
});

// Calculate stats from series
const seriesStatusBreakdown = $derived(() => {
	if (!series.data) return { monitored: 0, unmonitored: 0, byStatus: {} as Record<string, number> };

	const monitored = series.data.filter((s: { monitored: boolean }) => s.monitored).length;
	const unmonitored = series.data.length - monitored;
	const byStatus: Record<string, number> = {};

	for (const s of series.data) {
		const status = s.status ?? "unknown";
		byStatus[status] = (byStatus[status] ?? 0) + 1;
	}

	return { monitored, unmonitored, byStatus };
});

// Calculate stats from music
const musicStatusBreakdown = $derived(() => {
	if (!musicArtists.data)
		return { monitored: 0, unmonitored: 0, byStatus: {} as Record<string, number> };

	const monitored = musicArtists.data.filter((a: { monitored: boolean }) => a.monitored).length;
	const unmonitored = musicArtists.data.length - monitored;
	const byStatus: Record<string, number> = {};

	for (const artist of musicArtists.data) {
		const status = artist.status ?? "unknown";
		byStatus[status] = (byStatus[status] ?? 0) + 1;
	}

	return { monitored, unmonitored, byStatus };
});

// Calculate recently added (last 7 days)
const recentlyAddedCount = $derived(() => {
	const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
	let count = 0;

	if (movies.data) {
		count += movies.data.filter(
			(m: { added?: number }) => m.added && m.added >= sevenDaysAgo,
		).length;
	}
	if (series.data) {
		count += series.data.filter(
			(s: { added?: number }) => s.added && s.added >= sevenDaysAgo,
		).length;
	}
	if (musicArtists.data) {
		count += musicArtists.data.filter(
			(a: { added?: number }) => a.added && a.added >= sevenDaysAgo,
		).length;
	}

	return count;
});

// Calculate storage stats from root folders
const storageStats = $derived(() => {
	if (!rootFolders.data) return { totalSpace: 0, freeSpace: 0, usedSpace: 0 };

	let totalSpace = 0;
	let freeSpace = 0;

	for (const folder of rootFolders.data) {
		if (folder.totalSpace) totalSpace += folder.totalSpace;
		if (folder.freeSpace) freeSpace += folder.freeSpace;
	}

	return {
		totalSpace,
		freeSpace,
		usedSpace: totalSpace - freeSpace,
	};
});

// Utility functions
function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		released: "Released",
		inCinemas: "In Cinemas",
		announced: "Announced",
		continuing: "Continuing",
		ended: "Ended",
		upcoming: "Upcoming",
		unknown: "Unknown",
	};
	return labels[status] ?? status;
}

function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		released: "bg-green-500",
		inCinemas: "bg-blue-500",
		announced: "bg-yellow-500",
		continuing: "bg-green-500",
		ended: "bg-gray-500",
		upcoming: "bg-purple-500",
		unknown: "bg-gray-400",
	};
	return colors[status] ?? "bg-gray-400";
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

function calculatePercentage(part: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((part / total) * 100);
}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold">Analytics</h1>
		<p class="text-muted-foreground">Library statistics and insights</p>
	</div>

	<!-- Library Statistics Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
		<!-- Total Movies -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Total Movies</span>
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
					><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18" /><path
						d="M3 7.5h4"
					/><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path
						d="M17 7.5h4"
					/><path d="M17 16.5h4" /></svg
				>
			</div>
			{#if movieStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if movieStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{movieStats.data.movieCount}</span>
				</div>
				<p class="text-sm text-muted-foreground">
					{movieStats.data.withFileCount} with files
				</p>
			{/if}
		</div>

		<!-- Total Series -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Total Series</span>
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
					><rect width="20" height="15" x="2" y="7" rx="2" ry="2" /><polyline
						points="17 2 12 7 7 2"
					/></svg
				>
			</div>
			{#if seriesStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if seriesStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{seriesStats.data.seriesCount}</span>
				</div>
				<p class="text-sm text-muted-foreground">
					{seriesStats.data.monitoredSeriesCount} monitored
				</p>
			{/if}
		</div>

		<!-- Total Music Artists -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Music Artists</span>
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
					><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle
						cx="18"
						cy="16"
						r="3"
					/></svg
				>
			</div>
			{#if musicStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if musicStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{musicStats.data.artistCount}</span>
				</div>
				<p class="text-sm text-muted-foreground">
					{musicStats.data.albumCount} albums
				</p>
			{/if}
		</div>

		<!-- Episodes Collected -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Episodes</span>
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
					><rect width="7" height="7" x="3" y="3" rx="1" /><rect
						width="7"
						height="7"
						x="14"
						y="3"
						rx="1"
					/><rect width="7" height="7" x="14" y="14" rx="1" /><rect
						width="7"
						height="7"
						x="3"
						y="14"
						rx="1"
					/></svg
				>
			</div>
			{#if seriesStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if seriesStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold"
						>{seriesStats.data.episodeFileCount}/{seriesStats.data.episodeCount}</span
					>
				</div>
				<p class="text-sm text-muted-foreground">
					{calculatePercentage(seriesStats.data.episodeFileCount, seriesStats.data.episodeCount)}%
					collected
				</p>
			{/if}
		</div>

		<!-- Queue Items -->
		<div class="rounded-lg border bg-card p-6">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-muted-foreground">Queue</span>
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
			{#if queueStats.isLoading}
				<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
			{:else if queueStats.data}
				<div class="mt-2">
					<span class="text-2xl font-bold">{queueStats.data.totalCount}</span>
				</div>
				<p class="text-sm text-muted-foreground">
					{queueStats.data.byStatus?.downloading ?? 0} downloading
				</p>
			{/if}
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Status Breakdown Section -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Monitored vs Unmonitored</h2>
			</div>
			<div class="p-4 space-y-4">
				{#if movies.isLoading || series.isLoading || musicArtists.isLoading}
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="h-12 animate-pulse rounded bg-muted"></div>
						{/each}
					</div>
				{:else}
					<!-- Movies -->
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span>Movies</span>
							<span class="text-muted-foreground"
								>{movieStatusBreakdown().monitored} / {movies.data?.length ?? 0}</span
							>
						</div>
						<div class="h-2 rounded-full bg-muted overflow-hidden">
							<div
								class="h-full bg-green-500 transition-all"
								style="width: {calculatePercentage(movieStatusBreakdown().monitored, movies.data?.length ?? 0)}%"
							></div>
						</div>
					</div>

					<!-- Series -->
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span>Series</span>
							<span class="text-muted-foreground"
								>{seriesStatusBreakdown().monitored} / {series.data?.length ?? 0}</span
							>
						</div>
						<div class="h-2 rounded-full bg-muted overflow-hidden">
							<div
								class="h-full bg-blue-500 transition-all"
								style="width: {calculatePercentage(seriesStatusBreakdown().monitored, series.data?.length ?? 0)}%"
							></div>
						</div>
					</div>

					<!-- Music -->
					<div>
						<div class="flex justify-between text-sm mb-1">
							<span>Music Artists</span>
							<span class="text-muted-foreground"
								>{musicStatusBreakdown().monitored} / {musicArtists.data?.length ?? 0}</span
							>
						</div>
						<div class="h-2 rounded-full bg-muted overflow-hidden">
							<div
								class="h-full bg-purple-500 transition-all"
								style="width: {calculatePercentage(musicStatusBreakdown().monitored, musicArtists.data?.length ?? 0)}%"
							></div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Media Status Distribution -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Status Distribution</h2>
			</div>
			<div class="p-4 space-y-4">
				{#if movies.isLoading || series.isLoading}
					<div class="space-y-3">
						{#each Array(4) as _}
							<div class="h-8 animate-pulse rounded bg-muted"></div>
						{/each}
					</div>
				{:else}
					<!-- Movie Status -->
					<div>
						<h3 class="text-sm font-medium mb-2">Movies</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(movieStatusBreakdown().byStatus) as [status, count]}
								<span
									class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
								>
									<span class="h-2 w-2 rounded-full {getStatusColor(status)}"></span>
									{getStatusLabel(status)}: {count}
								</span>
							{/each}
							{#if Object.keys(movieStatusBreakdown().byStatus).length === 0}
								<span class="text-sm text-muted-foreground">No movies</span>
							{/if}
						</div>
					</div>

					<!-- Series Status -->
					<div>
						<h3 class="text-sm font-medium mb-2">Series</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(seriesStatusBreakdown().byStatus) as [status, count]}
								<span
									class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
								>
									<span class="h-2 w-2 rounded-full {getStatusColor(status)}"></span>
									{getStatusLabel(status)}: {count}
								</span>
							{/each}
							{#if Object.keys(seriesStatusBreakdown().byStatus).length === 0}
								<span class="text-sm text-muted-foreground">No series</span>
							{/if}
						</div>
					</div>

					<!-- Music Status -->
					<div>
						<h3 class="text-sm font-medium mb-2">Music</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(musicStatusBreakdown().byStatus) as [status, count]}
								<span
									class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
								>
									<span class="h-2 w-2 rounded-full {getStatusColor(status)}"></span>
									{getStatusLabel(status)}: {count}
								</span>
							{/each}
							{#if Object.keys(musicStatusBreakdown().byStatus).length === 0}
								<span class="text-sm text-muted-foreground">No artists</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Quality Profiles Section -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Quality Profiles</h2>
			</div>
			<div class="p-4">
				{#if qualityProfiles.isLoading}
					<div class="space-y-3">
						{#each Array(4) as _}
							<div class="h-10 animate-pulse rounded bg-muted"></div>
						{/each}
					</div>
				{:else if qualityProfiles.data && qualityProfiles.data.length > 0}
					<div class="space-y-2">
						{#each qualityProfiles.data as profile}
							<div
								class="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
							>
								<div>
									<p class="font-medium">{profile.name}</p>
									<p class="text-sm text-muted-foreground">
										{profile.items.filter((i: { enabled: boolean }) => i.enabled).length} qualities enabled
									</p>
								</div>
								<span
									class="rounded-full px-2 py-1 text-xs {profile.upgradeAllowed ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'}"
								>
									{profile.upgradeAllowed ? "Upgrades On" : "Upgrades Off"}
								</span>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">
						No quality profiles configured
					</p>
				{/if}
			</div>
		</div>

		<!-- Storage Section -->
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Storage</h2>
			</div>
			<div class="p-4">
				{#if rootFolders.isLoading}
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="h-16 animate-pulse rounded bg-muted"></div>
						{/each}
					</div>
				{:else if rootFolders.data && rootFolders.data.length > 0}
					<div class="space-y-3">
						{#each rootFolders.data as folder}
							<div class="rounded-lg border p-3">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center gap-2">
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
											><path
												d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
											/></svg
										>
										<span class="text-sm font-medium truncate max-w-[200px]">{folder.path}</span>
									</div>
									<span
										class="rounded-full px-2 py-0.5 text-xs bg-muted capitalize {folder.isDefault ? 'bg-primary/20 text-primary' : ''}"
									>
										{folder.mediaType}
										{folder.isDefault ? " (default)" : ""}
									</span>
								</div>
								{#if folder.totalSpace && folder.freeSpace}
									{@const usedSpace = folder.totalSpace - folder.freeSpace}
									{@const usedPercent = calculatePercentage(usedSpace, folder.totalSpace)}
									<div class="h-2 rounded-full bg-muted overflow-hidden">
										<div
											class="h-full transition-all {usedPercent > 90 ? 'bg-red-500' : usedPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}"
											style="width: {usedPercent}%"
										></div>
									</div>
									<div class="flex justify-between text-xs text-muted-foreground mt-1">
										<span>{formatBytes(usedSpace)} used</span>
										<span>{formatBytes(folder.freeSpace)} free</span>
									</div>
								{:else}
									<p class="text-xs text-muted-foreground">Space info not available</p>
								{/if}
							</div>
						{/each}

						<!-- Total Storage Summary -->
						{#if storageStats().totalSpace > 0}
							<div class="mt-4 pt-4 border-t">
								<div class="flex justify-between text-sm">
									<span class="font-medium">Total Storage</span>
									<span class="text-muted-foreground"
										>{formatBytes(storageStats().usedSpace)} / {formatBytes(storageStats().totalSpace)}</span
									>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">No root folders configured</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Recent Activity Summary -->
	<div class="grid gap-6 lg:grid-cols-2">
		<div class="rounded-lg border bg-card">
			<div class="border-b p-4">
				<h2 class="font-semibold">Recent Activity</h2>
				<p class="text-sm text-muted-foreground">Last 20 events</p>
			</div>
			<div class="p-4">
				{#if recentActivity.isLoading}
					<div class="space-y-3">
						{#each Array(5) as _}
							<div class="h-12 animate-pulse rounded bg-muted"></div>
						{/each}
					</div>
				{:else if recentActivity.data && recentActivity.data.length > 0}
					<ul class="space-y-2 max-h-[400px] overflow-y-auto">
						{#each recentActivity.data as activity}
							<li class="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
								<span
									class="mt-1 h-2 w-2 rounded-full flex-shrink-0 {activity.level === 'error'
										? 'bg-red-500'
										: activity.level === 'warning'
											? 'bg-yellow-500'
											: activity.level === 'success'
												? 'bg-green-500'
												: 'bg-blue-500'}"
								></span>
								<div class="flex-1 min-w-0">
									<p class="text-sm truncate">{activity.message}</p>
									<div class="flex items-center gap-2 text-xs text-muted-foreground">
										<span>{formatTimeAgo(activity.timestamp)}</span>
										<span class="text-muted-foreground/50">|</span>
										<span class="capitalize">{activity.eventType}</span>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-8">No recent activity</p>
				{/if}
			</div>
		</div>

		<!-- Summary Cards -->
		<div class="space-y-4">
			<!-- Recently Added -->
			<div class="rounded-lg border bg-card p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Recently Added</p>
						<p class="text-xs text-muted-foreground">Last 7 days</p>
					</div>
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
						><path d="M5 12h14" /><path d="M12 5v14" /></svg
					>
				</div>
				{#if movies.isLoading || series.isLoading || musicArtists.isLoading}
					<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
				{:else}
					<p class="mt-2 text-3xl font-bold">{recentlyAddedCount()}</p>
					<p class="text-sm text-muted-foreground">items added</p>
				{/if}
			</div>

			<!-- Tracks Collected (Music) -->
			{#if musicStats.data}
				<div class="rounded-lg border bg-card p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Music Tracks</p>
							<p class="text-xs text-muted-foreground">Collection progress</p>
						</div>
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
							><circle cx="12" cy="12" r="10" /><polygon
								points="10 8 16 12 10 16 10 8"
							/></svg
						>
					</div>
					<p class="mt-2 text-3xl font-bold">
						{musicStats.data.trackFileCount}/{musicStats.data.trackCount}
					</p>
					<p class="text-sm text-muted-foreground">{musicStats.data.percentComplete}% complete</p>
				</div>
			{/if}

			<!-- Missing Items -->
			<div class="rounded-lg border bg-card p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Missing Items</p>
						<p class="text-xs text-muted-foreground">Monitored without files</p>
					</div>
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
						class="text-yellow-500"
						><path
							d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
						/><path d="M12 9v4" /><path d="M12 17h.01" /></svg
					>
				</div>
				{#if movieStats.isLoading || seriesStats.isLoading}
					<div class="mt-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
				{:else}
					{@const totalMissing =
						(movieStats.data?.missingCount ?? 0) + (seriesStats.data?.missingEpisodeCount ?? 0)}
					<p class="mt-2 text-3xl font-bold {totalMissing > 0 ? 'text-yellow-600 dark:text-yellow-400' : ''}">
						{totalMissing}
					</p>
					<p class="text-sm text-muted-foreground">
						{movieStats.data?.missingCount ?? 0} movies, {seriesStats.data?.missingEpisodeCount ??
							0} episodes
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
