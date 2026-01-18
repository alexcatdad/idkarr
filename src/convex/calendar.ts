import { v } from "convex/values";
import { query } from "./_generated/server";

// Get upcoming episodes and movie releases for calendar
export const getUpcoming = query({
	args: {
		startDate: v.number(), // timestamp
		endDate: v.number(), // timestamp
	},
	handler: async (ctx, args) => {
		const events: Array<{
			id: string;
			title: string;
			subtitle?: string;
			date: number;
			mediaType: "tv" | "movie" | "anime" | "music";
			mediaId: string;
			hasFile: boolean;
			monitored: boolean;
		}> = [];

		// Get episodes in date range
		const episodes = await ctx.db
			.query("episodes")
			.withIndex("by_airDate")
			.filter((q) =>
				q.and(q.gte(q.field("airDate"), args.startDate), q.lte(q.field("airDate"), args.endDate)),
			)
			.collect();

		for (const episode of episodes) {
			const media = await ctx.db.get(episode.mediaId);
			if (!media || episode.airDate === undefined) continue;

			events.push({
				id: episode._id,
				title: media.title,
				subtitle: `S${String(episode.seasonId ? 1 : 0).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")} - ${episode.title}`,
				date: episode.airDate,
				mediaType: media.mediaType as "tv" | "anime",
				mediaId: media._id,
				hasFile: episode.hasFile,
				monitored: episode.monitored && media.monitored,
			});
		}

		// Get movies by release date (check movieMetadata)
		const movies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		for (const movie of movies) {
			const metadata = await ctx.db
				.query("movieMetadata")
				.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
				.first();

			// Check various release dates
			const releaseDate =
				metadata?.digitalRelease ?? metadata?.physicalRelease ?? metadata?.inCinemas;

			if (releaseDate && releaseDate >= args.startDate && releaseDate <= args.endDate) {
				const file = metadata?.movieFileId ? await ctx.db.get(metadata.movieFileId) : null;

				events.push({
					id: movie._id,
					title: movie.title,
					date: releaseDate,
					mediaType: "movie",
					mediaId: movie._id,
					hasFile: !!file,
					monitored: movie.monitored,
				});
			}
		}

		// Sort by date
		events.sort((a, b) => a.date - b.date);

		return events;
	},
});
