<script lang="ts">
	import { useQuery } from "convex-svelte";
	import { api } from "../convex/_generated/api";

	const mediaQuery = useQuery(api.media.list, {});
</script>

<main class="p-8">
	<h1 class="text-3xl font-bold mb-4">idkarr</h1>
	<p class="text-gray-600 mb-8">Unified Media Manager</p>

	{#if $mediaQuery.isLoading}
		<p>Loading...</p>
	{:else if $mediaQuery.error}
		<p class="text-red-500">Error: {$mediaQuery.error.message}</p>
	{:else}
		<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
			Connected to Convex
		</div>
		<p class="text-gray-600">
			Media items in library: {$mediaQuery.data?.length ?? 0}
		</p>
	{/if}
</main>
