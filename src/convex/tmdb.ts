import { v } from "convex/values";
import { action } from "./_generated/server";

// TMDB API configuration
const TMDB_API_BASE = "https://api.themoviedb.org/3";
// Default API key for idkarr - users can override via TMDB_API_KEY env var
// Attribution: https://www.themoviedb.org/about/logos-attribution
const TMDB_DEFAULT_KEY = "9329315a5f7b4bc259395953d46c96be";

// Search movies on TMDB
export const searchMovies = action({
	args: {
		query: v.string(),
		page: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const page = args.page ?? 1;
		const url = `${TMDB_API_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(args.query)}&page=${page}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const data = await response.json();

		// Transform to our format
		return {
			page: data.page,
			totalPages: data.total_pages,
			totalResults: data.total_results,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			results: data.results.map((movie: any) => ({
				tmdbId: movie.id,
				title: movie.title,
				originalTitle: movie.original_title,
				overview: movie.overview,
				releaseDate: movie.release_date,
				year: movie.release_date ? Number.parseInt(movie.release_date.split("-")[0], 10) : null,
				posterPath: movie.poster_path
					? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
					: null,
				backdropPath: movie.backdrop_path
					? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
					: null,
				voteAverage: movie.vote_average,
				popularity: movie.popularity,
			})),
		};
	},
});

// Get movie details from TMDB
export const getMovieDetails = action({
	args: {
		tmdbId: v.number(),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const url = `${TMDB_API_BASE}/movie/${args.tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids,release_dates`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const movie = await response.json();

		return {
			tmdbId: movie.id,
			imdbId: movie.imdb_id,
			title: movie.title,
			originalTitle: movie.original_title,
			sortTitle: movie.title.replace(/^(The|A|An)\s+/i, ""),
			overview: movie.overview,
			releaseDate: movie.release_date,
			year: movie.release_date ? Number.parseInt(movie.release_date.split("-")[0], 10) : null,
			runtime: movie.runtime,
			status: movie.status,
			posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
			backdropPath: movie.backdrop_path
				? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
				: null,
			voteAverage: movie.vote_average,
			budget: movie.budget,
			revenue: movie.revenue,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			genres: movie.genres?.map((g: any) => g.name) || [],
			studio: movie.production_companies?.[0]?.name,
			certification: getCertification(movie.release_dates?.results),
			collection: movie.belongs_to_collection
				? {
						tmdbId: movie.belongs_to_collection.id,
						name: movie.belongs_to_collection.name,
					}
				: null,
		};
	},
});

// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
function getCertification(releaseDates: any[]): string | null {
	if (!releaseDates) return null;
	// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
	const us = releaseDates.find((r: any) => r.iso_3166_1 === "US");
	if (!us) return null;
	// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
	const theatrical = us.release_dates.find((r: any) => r.type === 3);
	return theatrical?.certification || null;
}

// Search TV shows on TMDB
export const searchTV = action({
	args: {
		query: v.string(),
		page: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const page = args.page ?? 1;
		const url = `${TMDB_API_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(args.query)}&page=${page}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const data = await response.json();

		return {
			page: data.page,
			totalPages: data.total_pages,
			totalResults: data.total_results,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			results: data.results.map((show: any) => ({
				tmdbId: show.id,
				title: show.name,
				originalTitle: show.original_name,
				overview: show.overview,
				firstAirDate: show.first_air_date,
				year: show.first_air_date ? Number.parseInt(show.first_air_date.split("-")[0], 10) : null,
				posterPath: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
				backdropPath: show.backdrop_path
					? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
					: null,
				voteAverage: show.vote_average,
				popularity: show.popularity,
			})),
		};
	},
});

// Get TV show details from TMDB
export const getTVDetails = action({
	args: {
		tmdbId: v.number(),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const url = `${TMDB_API_BASE}/tv/${args.tmdbId}?api_key=${apiKey}&append_to_response=external_ids,content_ratings`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const show = await response.json();

		return {
			tmdbId: show.id,
			tvdbId: show.external_ids?.tvdb_id,
			imdbId: show.external_ids?.imdb_id,
			title: show.name,
			originalTitle: show.original_name,
			sortTitle: show.name.replace(/^(The|A|An)\s+/i, ""),
			overview: show.overview,
			firstAirDate: show.first_air_date,
			year: show.first_air_date ? Number.parseInt(show.first_air_date.split("-")[0], 10) : null,
			status: mapTVStatus(show.status),
			posterPath: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
			backdropPath: show.backdrop_path
				? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
				: null,
			voteAverage: show.vote_average,
			network: show.networks?.[0]?.name,
			runtime: show.episode_run_time?.[0],
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			genres: show.genres?.map((g: any) => g.name) || [],
			seasonCount: show.number_of_seasons,
			episodeCount: show.number_of_episodes,
			seasons:
				// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
				show.seasons?.map((s: any) => ({
					seasonNumber: s.season_number,
					name: s.name,
					overview: s.overview,
					episodeCount: s.episode_count,
					airDate: s.air_date,
					posterPath: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
				})) || [],
		};
	},
});

function mapTVStatus(status: string): "continuing" | "ended" | "upcoming" | "unknown" {
	switch (status) {
		case "Returning Series":
			return "continuing";
		case "Ended":
		case "Canceled":
			return "ended";
		case "In Production":
		case "Planned":
			return "upcoming";
		default:
			return "unknown";
	}
}

// Get trending movies from TMDB (weekly)
export const getTrendingMovies = action({
	args: {
		page: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const page = args.page ?? 1;
		const url = `${TMDB_API_BASE}/trending/movie/week?api_key=${apiKey}&page=${page}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const data = await response.json();

		return {
			page: data.page,
			totalPages: data.total_pages,
			totalResults: data.total_results,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			results: data.results.map((movie: any) => ({
				tmdbId: movie.id,
				title: movie.title,
				originalTitle: movie.original_title,
				overview: movie.overview,
				releaseDate: movie.release_date,
				year: movie.release_date ? Number.parseInt(movie.release_date.split("-")[0], 10) : null,
				posterPath: movie.poster_path
					? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
					: null,
				backdropPath: movie.backdrop_path
					? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
					: null,
				voteAverage: movie.vote_average,
				popularity: movie.popularity,
			})),
		};
	},
});

// Get trending TV shows from TMDB (weekly)
export const getTrendingTV = action({
	args: {
		page: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const page = args.page ?? 1;
		const url = `${TMDB_API_BASE}/trending/tv/week?api_key=${apiKey}&page=${page}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const data = await response.json();

		return {
			page: data.page,
			totalPages: data.total_pages,
			totalResults: data.total_results,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			results: data.results.map((show: any) => ({
				tmdbId: show.id,
				title: show.name,
				originalTitle: show.original_name,
				overview: show.overview,
				firstAirDate: show.first_air_date,
				year: show.first_air_date ? Number.parseInt(show.first_air_date.split("-")[0], 10) : null,
				posterPath: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
				backdropPath: show.backdrop_path
					? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
					: null,
				voteAverage: show.vote_average,
				popularity: show.popularity,
			})),
		};
	},
});

// Get popular movies from TMDB
export const getPopularMovies = action({
	args: {
		page: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const page = args.page ?? 1;
		const url = `${TMDB_API_BASE}/movie/popular?api_key=${apiKey}&page=${page}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const data = await response.json();

		return {
			page: data.page,
			totalPages: data.total_pages,
			totalResults: data.total_results,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			results: data.results.map((movie: any) => ({
				tmdbId: movie.id,
				title: movie.title,
				originalTitle: movie.original_title,
				overview: movie.overview,
				releaseDate: movie.release_date,
				year: movie.release_date ? Number.parseInt(movie.release_date.split("-")[0], 10) : null,
				posterPath: movie.poster_path
					? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
					: null,
				backdropPath: movie.backdrop_path
					? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
					: null,
				voteAverage: movie.vote_average,
				popularity: movie.popularity,
			})),
		};
	},
});

// Get popular TV shows from TMDB
export const getPopularTV = action({
	args: {
		page: v.optional(v.number()),
	},
	handler: async (_ctx, args) => {
		const apiKey = process.env.TMDB_API_KEY || TMDB_DEFAULT_KEY;

		const page = args.page ?? 1;
		const url = `${TMDB_API_BASE}/tv/popular?api_key=${apiKey}&page=${page}`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`TMDB API error: ${response.status}`);
		}

		const data = await response.json();

		return {
			page: data.page,
			totalPages: data.total_pages,
			totalResults: data.total_results,
			// biome-ignore lint/suspicious/noExplicitAny: TMDB API response type
			results: data.results.map((show: any) => ({
				tmdbId: show.id,
				title: show.name,
				originalTitle: show.original_name,
				overview: show.overview,
				firstAirDate: show.first_air_date,
				year: show.first_air_date ? Number.parseInt(show.first_air_date.split("-")[0], 10) : null,
				posterPath: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
				backdropPath: show.backdrop_path
					? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
					: null,
				voteAverage: show.vote_average,
				popularity: show.popularity,
			})),
		};
	},
});
