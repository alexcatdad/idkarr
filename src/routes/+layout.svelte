<script lang="ts">
import { setupConvex } from "convex-svelte";
import { PUBLIC_CONVEX_URL } from "$env/static/public";
import AppLayout from "$lib/components/AppLayout.svelte";
import ReloadPrompt from "$lib/components/ReloadPrompt.svelte";
import "../app.css";

const { children } = $props();

setupConvex(PUBLIC_CONVEX_URL);
</script>

<AppLayout>
	{@render children()}
</AppLayout>
<ReloadPrompt />
