<script lang="ts">
	import { PUBLIC_CONVEX_URL } from "$env/static/public";
	import { setupConvex } from "convex-svelte";
	import favicon from "$lib/assets/favicon.svg";

	const { children } = $props();

	setupConvex(PUBLIC_CONVEX_URL);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
