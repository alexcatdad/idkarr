<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";
	import { Button } from "$lib/components/ui/button";
	import { theme } from "$lib/stores/theme";

	const mediaQuery = useQuery(api.media.list, {});
</script>

<main class="min-h-screen p-8">
	<div class="container mx-auto max-w-4xl">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-4xl font-bold">idkarr</h1>
				<p class="text-muted-foreground">Unified Media Manager</p>
			</div>
			<Button variant="outline" size="icon" onclick={() => theme.toggle()}>
				{#if $theme === "dark"}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
				{:else}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
				{/if}
			</Button>
		</div>

		{#if $mediaQuery.isLoading}
			<div class="rounded-lg border bg-card p-6">
				<p class="text-muted-foreground">Loading...</p>
			</div>
		{:else if $mediaQuery.error}
			<div class="rounded-lg border border-destructive bg-destructive/10 p-6">
				<p class="text-destructive">Error: {$mediaQuery.error.message}</p>
			</div>
		{:else}
			<div class="rounded-lg border bg-card p-6 mb-6">
				<h2 class="text-lg font-semibold mb-1">Status</h2>
				<p class="text-sm text-muted-foreground mb-4">Backend connection status</p>
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<span class="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400"></span>
					Connected to Convex
				</div>
			</div>

			<div class="rounded-lg border bg-card p-6">
				<h2 class="text-lg font-semibold mb-1">Library</h2>
				<p class="text-sm text-muted-foreground mb-4">Your media collection</p>
				<p class="text-muted-foreground mb-4">
					{$mediaQuery.data?.length ?? 0} items in library
				</p>
				<Button>Add Media</Button>
			</div>
		{/if}
	</div>
</main>
