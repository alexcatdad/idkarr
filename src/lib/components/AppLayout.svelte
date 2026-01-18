<script lang="ts">
import { useQuery } from "convex-svelte";
import { page } from "$app/stores";
import { Button } from "$lib/components/ui/button";
import { theme } from "$lib/stores/theme";
import { api } from "../../convex/_generated/api";

interface Props {
	children: import("svelte").Snippet;
}

let { children }: Props = $props();

// Get pending request count for badge
const pendingRequests = useQuery(api.requests.getPendingCount, {});

// Get queue stats for badge
const queueStats = useQuery(api.downloadQueue.getQueueStats, {});

// Get system health for status indicator
const healthStatus = useQuery(api.systemHealth.getOverallStatus, {});

// Navigation items
const navItems = [
	{ href: "/", label: "Dashboard", icon: "home" },
	{ href: "/discovery", label: "Discover", icon: "compass" },
	{ href: "/series", label: "Series", icon: "tv" },
	{ href: "/movies", label: "Movies", icon: "film" },
	{ href: "/music", label: "Music", icon: "music" },
	{ href: "/calendar", label: "Calendar", icon: "calendar" },
	{ href: "/activity", label: "Activity", icon: "activity" },
	{ href: "/analytics", label: "Analytics", icon: "chart" },
	{ href: "/queue", label: "Queue", icon: "download" },
	{ href: "/requests", label: "Requests", icon: "inbox" },
	{ href: "/settings", label: "Settings", icon: "settings" },
];

function isActive(href: string, currentPath: string): boolean {
	if (href === "/") return currentPath === "/";
	return currentPath.startsWith(href);
}

let sidebarCollapsed = $state(false);
</script>

<div class="flex h-screen bg-background">
	<!-- Sidebar -->
	<aside
		class="flex flex-col border-r bg-card transition-all duration-300 {sidebarCollapsed ? 'w-16' : 'w-64'}"
	>
		<!-- Logo -->
		<div class="flex h-16 items-center justify-between border-b px-4">
			{#if !sidebarCollapsed}
				<a href="/" class="flex items-center gap-2">
					<div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
						<span class="text-primary-foreground font-bold text-sm">id</span>
					</div>
					<span class="font-bold text-lg">idkarr</span>
				</a>
			{:else}
				<a href="/" class="mx-auto">
					<div class="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
						<span class="text-primary-foreground font-bold text-sm">id</span>
					</div>
				</a>
			{/if}
		</div>

		<!-- Navigation -->
		<nav class="flex-1 overflow-y-auto p-2">
			<ul class="space-y-1">
				{#each navItems as item}
					{@const active = isActive(item.href, $page.url.pathname)}
					<li>
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
								{active
									? 'bg-primary text-primary-foreground'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
						>
							<span class="flex h-5 w-5 items-center justify-center">
								{#if item.icon === "home"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
								{:else if item.icon === "compass"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
								{:else if item.icon === "tv"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
								{:else if item.icon === "film"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>
								{:else if item.icon === "music"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
								{:else if item.icon === "calendar"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
								{:else if item.icon === "activity"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
								{:else if item.icon === "chart"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
								{:else if item.icon === "download"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
								{:else if item.icon === "inbox"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
								{:else if item.icon === "settings"}
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
								{/if}
							</span>
							{#if !sidebarCollapsed}
								<span class="flex-1">{item.label}</span>
								<!-- Badges -->
								{#if item.href === "/requests" && pendingRequests.data && pendingRequests.data > 0}
									<span class="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
										{pendingRequests.data}
									</span>
								{/if}
								{#if item.href === "/queue" && queueStats.data && (queueStats.data.byStatus?.downloading ?? 0) > 0}
									<span class="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
										{queueStats.data.byStatus.downloading}
									</span>
								{/if}
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- Collapse toggle & Health Status -->
		<div class="border-t p-2">
			{#if !sidebarCollapsed}
				<!-- Health Status -->
				{#if healthStatus.data}
					<div class="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
						<span
							class="h-2 w-2 rounded-full {healthStatus.data.status === 'ok'
								? 'bg-green-500'
								: healthStatus.data.status === 'warning'
									? 'bg-yellow-500'
									: 'bg-red-500'}"
						></span>
						<span class="text-muted-foreground">
							{healthStatus.data.status === "ok"
								? "All systems operational"
								: `${healthStatus.data.errorsCount + healthStatus.data.warningsCount} issue(s)`}
						</span>
					</div>
				{/if}
			{/if}
			<button
				onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
				class="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				{#if sidebarCollapsed}
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
				{/if}
			</button>
		</div>
	</aside>

	<!-- Main Content -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Top Bar -->
		<header class="flex h-16 items-center justify-between border-b bg-card px-6">
			<div class="flex items-center gap-4">
				<!-- Breadcrumb or page title can go here -->
			</div>
			<div class="flex items-center gap-2">
				<!-- Theme Toggle -->
				<Button variant="ghost" size="icon" onclick={() => theme.toggle()}>
					{#if $theme === "dark"}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
					{/if}
				</Button>
			</div>
		</header>

		<!-- Page Content -->
		<main class="flex-1 overflow-y-auto p-6">
			{@render children()}
		</main>
	</div>
</div>
