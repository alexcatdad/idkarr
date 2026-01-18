<script lang="ts">
import DiscoverySearch from "$lib/components/discovery/DiscoverySearch.svelte";
import TrendingSection from "$lib/components/discovery/TrendingSection.svelte";

let successMessage = $state<string | null>(null);

function showSuccess() {
	successMessage = "Added to library!";
	setTimeout(() => {
		successMessage = null;
	}, 3000);
}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="text-3xl font-bold">Discover</h1>
		<p class="text-muted-foreground">Search for new content and browse trending titles</p>
	</div>

	<!-- Success Toast -->
	{#if successMessage}
		<div class="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
			<div class="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 6 9 17l-5-5"/>
				</svg>
				{successMessage}
			</div>
		</div>
	{/if}

	<!-- Search Section -->
	<section class="rounded-lg border bg-card p-6">
		<h2 class="text-lg font-semibold mb-4">Search</h2>
		<DiscoverySearch onAddSuccess={showSuccess} />
	</section>

	<!-- Trending & Popular Section -->
	<section>
		<TrendingSection onAddSuccess={showSuccess} />
	</section>
</div>
