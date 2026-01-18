<script lang="ts">
import { onMount } from "svelte";
import { Button } from "$lib/components/ui/button";

let offlineReady = $state(false);
let needRefresh = $state(false);
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

onMount(async () => {
	if (typeof window === "undefined") return;

	// Dynamically import PWA utilities
	try {
		const { useRegisterSW } = await import("virtual:pwa-register");
		const { updateServiceWorker } = useRegisterSW({
			onRegistered(r) {
				console.log("SW Registered:", r);
			},
			onRegisterError(error) {
				console.error("SW registration error", error);
			},
			onNeedRefresh() {
				needRefresh = true;
			},
			onOfflineReady() {
				offlineReady = true;
			},
		});
		updateSW = updateServiceWorker;
	} catch (e) {
		// PWA not available in dev mode
		console.log("PWA not available:", e);
	}
});

function close() {
	offlineReady = false;
	needRefresh = false;
}

async function refresh() {
	if (updateSW) {
		await updateSW(true);
	}
}
</script>

{#if offlineReady || needRefresh}
	<div
		class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg"
		role="alert"
	>
		{#if offlineReady}
			<p class="text-sm">App ready to work offline</p>
		{:else}
			<p class="text-sm">New content available, click on reload button to update</p>
		{/if}

		{#if needRefresh}
			<Button size="sm" onclick={refresh}>Reload</Button>
		{/if}
		<Button size="sm" variant="outline" onclick={close}>Close</Button>
	</div>
{/if}
