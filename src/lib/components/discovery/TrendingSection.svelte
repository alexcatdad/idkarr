<script lang="ts">
import { useConvexClient } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../../convex/_generated/api";

// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
type TMDBResult = any;

interface Props {
	onAddSuccess?: () => void;
}

let { onAddSuccess }: Props = $props();

const client = useConvexClient();

// State
let trendingMovies = $state<TMDBResult[]>([]);
let trendingTV = $state<TMDBResult[]>([]);
let popularMovies = $state<TMDBResult[]>([]);
let popularTV = $state<TMDBResult[]>([]);
let isLoading = $state(true);
let isAdding = $state<number | null>(null);
let error = $state<string | null>(null);

// Load data on mount
$effect(() => {
	loadData();
});

async function loadData() {
	isLoading = true;
	error = null;

	try {
		const [trendingMoviesRes, trendingTVRes, popularMoviesRes, popularTVRes] = await Promise.all([
			client.action(api.tmdb.getTrendingMovies, {}),
			client.action(api.tmdb.getTrendingTV, {}),
			client.action(api.tmdb.getPopularMovies, {}),
			client.action(api.tmdb.getPopularTV, {}),
		]);

		trendingMovies = trendingMoviesRes.results.slice(0, 20);
		trendingTV = trendingTVRes.results.slice(0, 20);
		popularMovies = popularMoviesRes.results.slice(0, 20);
		popularTV = popularTVRes.results.slice(0, 20);
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to load content";
	} finally {
		isLoading = false;
	}
}

async function handleAddMovie(movie: TMDBResult) {
	isAdding = movie.tmdbId;
	error = null;

	try {
		const details = await client.action(api.tmdb.getMovieDetails, {
			tmdbId: movie.tmdbId,
		});

		await client.mutation(api.movies.add, {
			title: details.title,
			year: details.year ?? undefined,
			overview: details.overview,
			tmdbId: details.tmdbId,
			imdbId: details.imdbId ?? undefined,
			monitored: true,
			status: mapMovieStatus(details.status),
			runtime: details.runtime ?? undefined,
			studio: details.studio ?? undefined,
			certification: details.certification ?? undefined,
		});

		// Remove from lists
		trendingMovies = trendingMovies.filter((m) => m.tmdbId !== movie.tmdbId);
		popularMovies = popularMovies.filter((m) => m.tmdbId !== movie.tmdbId);
		onAddSuccess?.();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add movie";
	} finally {
		isAdding = null;
	}
}

async function handleAddSeries(show: TMDBResult) {
	isAdding = show.tmdbId;
	error = null;

	try {
		const details = await client.action(api.tmdb.getTVDetails, {
			tmdbId: show.tmdbId,
		});

		await client.mutation(api.series.add, {
			title: details.title,
			year: details.year ?? undefined,
			overview: details.overview,
			tmdbId: details.tmdbId,
			tvdbId: details.tvdbId ?? undefined,
			imdbId: details.imdbId ?? undefined,
			monitored: true,
			status: details.status,
		});

		// Remove from lists
		trendingTV = trendingTV.filter((s) => s.tmdbId !== show.tmdbId);
		popularTV = popularTV.filter((s) => s.tmdbId !== show.tmdbId);
		onAddSuccess?.();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to add series";
	} finally {
		isAdding = null;
	}
}

function mapMovieStatus(
	status: string,
): "released" | "announced" | "inCinemas" | "upcoming" | "unknown" {
	switch (status) {
		case "Released":
			return "released";
		case "In Production":
		case "Post Production":
			return "announced";
		case "Planned":
			return "upcoming";
		default:
			return "unknown";
	}
}

function scrollCarousel(container: HTMLElement, direction: "left" | "right") {
	const scrollAmount = container.clientWidth * 0.8;
	container.scrollBy({
		left: direction === "left" ? -scrollAmount : scrollAmount,
		behavior: "smooth",
	});
}
</script>

<div class="space-y-10">
	<!-- Error Message -->
	{#if error}
		<div class="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500">
			{error}
		</div>
	{/if}

	<!-- Trending This Week -->
	<section>
		<h2 class="text-xl font-semibold mb-4">Trending This Week</h2>

		<!-- Trending Movies -->
		<div class="mb-6">
			<h3 class="text-sm font-medium text-muted-foreground mb-3">Movies</h3>
			{#if isLoading}
				<div class="flex gap-4 overflow-hidden">
					{#each Array(6) as _}
						<div class="flex-shrink-0 w-36">
							<div class="aspect-[2/3] rounded-lg bg-muted animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="relative group/carousel">
					<!-- Left Arrow -->
					<button
						onclick={(e) => scrollCarousel(e.currentTarget.nextElementSibling as HTMLElement, "left")}
						class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted -translate-x-1/2"
						aria-label="Scroll left"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m15 18-6-6 6-6"/>
						</svg>
					</button>

					<!-- Carousel -->
					<div class="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2">
						{#each trendingMovies as movie}
							<div class="flex-shrink-0 w-36 snap-start">
								<div class="group relative rounded-lg overflow-hidden bg-muted aspect-[2/3]">
									{#if movie.posterPath}
										<img
											src={movie.posterPath}
											alt={movie.title}
											class="w-full h-full object-cover"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-muted-foreground">
											<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
												<rect width="18" height="18" x="3" y="3" rx="2"/>
												<path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>
											</svg>
										</div>
									{/if}
									<!-- Hover Overlay -->
									<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
										<h4 class="text-white text-sm font-medium line-clamp-2">{movie.title}</h4>
										<p class="text-white/70 text-xs">{movie.year ?? ""}</p>
										<Button
											size="sm"
											class="mt-2 w-full"
											onclick={() => handleAddMovie(movie)}
											disabled={isAdding === movie.tmdbId}
										>
											{isAdding === movie.tmdbId ? "Adding..." : "Add"}
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Right Arrow -->
					<button
						onclick={(e) => scrollCarousel(e.currentTarget.previousElementSibling as HTMLElement, "right")}
						class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted translate-x-1/2"
						aria-label="Scroll right"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m9 18 6-6-6-6"/>
						</svg>
					</button>
				</div>
			{/if}
		</div>

		<!-- Trending TV -->
		<div>
			<h3 class="text-sm font-medium text-muted-foreground mb-3">TV Shows</h3>
			{#if isLoading}
				<div class="flex gap-4 overflow-hidden">
					{#each Array(6) as _}
						<div class="flex-shrink-0 w-36">
							<div class="aspect-[2/3] rounded-lg bg-muted animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="relative group/carousel">
					<button
						onclick={(e) => scrollCarousel(e.currentTarget.nextElementSibling as HTMLElement, "left")}
						class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted -translate-x-1/2"
						aria-label="Scroll left"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m15 18-6-6 6-6"/>
						</svg>
					</button>

					<div class="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2">
						{#each trendingTV as show}
							<div class="flex-shrink-0 w-36 snap-start">
								<div class="group relative rounded-lg overflow-hidden bg-muted aspect-[2/3]">
									{#if show.posterPath}
										<img
											src={show.posterPath}
											alt={show.title}
											class="w-full h-full object-cover"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-muted-foreground">
											<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
												<rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>
											</svg>
										</div>
									{/if}
									<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
										<h4 class="text-white text-sm font-medium line-clamp-2">{show.title}</h4>
										<p class="text-white/70 text-xs">{show.year ?? ""}</p>
										<Button
											size="sm"
											class="mt-2 w-full"
											onclick={() => handleAddSeries(show)}
											disabled={isAdding === show.tmdbId}
										>
											{isAdding === show.tmdbId ? "Adding..." : "Add"}
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<button
						onclick={(e) => scrollCarousel(e.currentTarget.previousElementSibling as HTMLElement, "right")}
						class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted translate-x-1/2"
						aria-label="Scroll right"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m9 18 6-6-6-6"/>
						</svg>
					</button>
				</div>
			{/if}
		</div>
	</section>

	<!-- Popular -->
	<section>
		<h2 class="text-xl font-semibold mb-4">Popular</h2>

		<!-- Popular Movies -->
		<div class="mb-6">
			<h3 class="text-sm font-medium text-muted-foreground mb-3">Movies</h3>
			{#if isLoading}
				<div class="flex gap-4 overflow-hidden">
					{#each Array(6) as _}
						<div class="flex-shrink-0 w-36">
							<div class="aspect-[2/3] rounded-lg bg-muted animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="relative group/carousel">
					<button
						onclick={(e) => scrollCarousel(e.currentTarget.nextElementSibling as HTMLElement, "left")}
						class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted -translate-x-1/2"
						aria-label="Scroll left"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m15 18-6-6 6-6"/>
						</svg>
					</button>

					<div class="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2">
						{#each popularMovies as movie}
							<div class="flex-shrink-0 w-36 snap-start">
								<div class="group relative rounded-lg overflow-hidden bg-muted aspect-[2/3]">
									{#if movie.posterPath}
										<img
											src={movie.posterPath}
											alt={movie.title}
											class="w-full h-full object-cover"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-muted-foreground">
											<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
												<rect width="18" height="18" x="3" y="3" rx="2"/>
												<path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>
											</svg>
										</div>
									{/if}
									<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
										<h4 class="text-white text-sm font-medium line-clamp-2">{movie.title}</h4>
										<p class="text-white/70 text-xs">{movie.year ?? ""}</p>
										<Button
											size="sm"
											class="mt-2 w-full"
											onclick={() => handleAddMovie(movie)}
											disabled={isAdding === movie.tmdbId}
										>
											{isAdding === movie.tmdbId ? "Adding..." : "Add"}
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<button
						onclick={(e) => scrollCarousel(e.currentTarget.previousElementSibling as HTMLElement, "right")}
						class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted translate-x-1/2"
						aria-label="Scroll right"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m9 18 6-6-6-6"/>
						</svg>
					</button>
				</div>
			{/if}
		</div>

		<!-- Popular TV -->
		<div>
			<h3 class="text-sm font-medium text-muted-foreground mb-3">TV Shows</h3>
			{#if isLoading}
				<div class="flex gap-4 overflow-hidden">
					{#each Array(6) as _}
						<div class="flex-shrink-0 w-36">
							<div class="aspect-[2/3] rounded-lg bg-muted animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="relative group/carousel">
					<button
						onclick={(e) => scrollCarousel(e.currentTarget.nextElementSibling as HTMLElement, "left")}
						class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted -translate-x-1/2"
						aria-label="Scroll left"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m15 18-6-6 6-6"/>
						</svg>
					</button>

					<div class="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2">
						{#each popularTV as show}
							<div class="flex-shrink-0 w-36 snap-start">
								<div class="group relative rounded-lg overflow-hidden bg-muted aspect-[2/3]">
									{#if show.posterPath}
										<img
											src={show.posterPath}
											alt={show.title}
											class="w-full h-full object-cover"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-muted-foreground">
											<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
												<rect width="20" height="15" x="2" y="7" rx="2"/><polyline points="17 2 12 7 7 2"/>
											</svg>
										</div>
									{/if}
									<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
										<h4 class="text-white text-sm font-medium line-clamp-2">{show.title}</h4>
										<p class="text-white/70 text-xs">{show.year ?? ""}</p>
										<Button
											size="sm"
											class="mt-2 w-full"
											onclick={() => handleAddSeries(show)}
											disabled={isAdding === show.tmdbId}
										>
											{isAdding === show.tmdbId ? "Adding..." : "Add"}
										</Button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<button
						onclick={(e) => scrollCarousel(e.currentTarget.previousElementSibling as HTMLElement, "right")}
						class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 border rounded-full p-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-muted translate-x-1/2"
						aria-label="Scroll right"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="m9 18 6-6-6-6"/>
						</svg>
					</button>
				</div>
			{/if}
		</div>
	</section>
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
