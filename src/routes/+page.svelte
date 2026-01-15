<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";
	import { Button } from "$lib/components/ui/button";

	const mediaQuery = useQuery(api.media.list, {});
</script>

<main class="container mx-auto p-8">
	<h1 class="text-3xl font-bold mb-2">idkarr</h1>
	<p class="text-muted-foreground mb-8">Unified Media Manager</p>

	{#if $mediaQuery.isLoading}
		<p class="text-muted-foreground">Loading...</p>
	{:else if $mediaQuery.error}
		<div class="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-4">
			Error: {$mediaQuery.error.message}
		</div>
	{:else}
		<div class="rounded-lg border bg-card p-6 mb-6">
			<div class="flex items-center gap-2 mb-4">
				<div class="h-2 w-2 rounded-full bg-green-500"></div>
				<span class="text-sm font-medium">Connected to Convex</span>
			</div>
			<p class="text-muted-foreground mb-4">
				Media items in library: {$mediaQuery.data?.length ?? 0}
			</p>
			<Button variant="outline">Add Media</Button>
		</div>
	{/if}
</main>
