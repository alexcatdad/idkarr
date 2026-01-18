<script lang="ts">
import { setupConvex } from "convex-svelte";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import favicon from "$lib/assets/favicon.svg";
import AppLayout from "$lib/components/AppLayout.svelte";
import "../app.css";

const { children } = $props();

setupConvex(PUBLIC_CONVEX_URL);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppLayout>
	{@render children()}
</AppLayout>
