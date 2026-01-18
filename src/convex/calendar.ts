import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery, query } from "./_generated/server";

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

// Internal version for actions to call
export const getUpcomingInternal = internalQuery({
	args: {
		startDate: v.number(),
		endDate: v.number(),
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

		// Get movies by release date
		const movies = await ctx.db
			.query("media")
			.withIndex("by_type", (q) => q.eq("mediaType", "movie"))
			.collect();

		for (const movie of movies) {
			const metadata = await ctx.db
				.query("movieMetadata")
				.withIndex("by_media", (q) => q.eq("mediaId", movie._id))
				.first();

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

		events.sort((a, b) => a.date - b.date);
		return events;
	},
});

// Generate iCal feed for external calendar subscriptions
export const generateIcal = action({
	args: {
		daysAhead: v.optional(v.number()),
		daysBehind: v.optional(v.number()),
		includeUnmonitored: v.optional(v.boolean()),
	},
	handler: async (ctx, args): Promise<string> => {
		const now = Date.now();
		const daysAhead = args.daysAhead ?? 30;
		const daysBehind = args.daysBehind ?? 7;
		const includeUnmonitored = args.includeUnmonitored ?? false;

		const startDate = now - daysBehind * 24 * 60 * 60 * 1000;
		const endDate = now + daysAhead * 24 * 60 * 60 * 1000;

		// Use internal query to get events
		const events = await ctx.runQuery(internal.calendar.getUpcomingInternal, {
			startDate,
			endDate,
		});

		// Filter unmonitored if needed
		const filteredEvents = includeUnmonitored ? events : events.filter((e) => e.monitored);

		// Generate iCal content
		const lines: string[] = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//idkarr//Calendar//EN",
			"CALSCALE:GREGORIAN",
			"METHOD:PUBLISH",
			"X-WR-CALNAME:idkarr Calendar",
			"X-WR-CALDESC:Upcoming media releases from idkarr",
		];

		for (const event of filteredEvents) {
			const eventDate = new Date(event.date);
			const dateStr = formatIcalDate(eventDate);
			const uid = `${event.id}@idkarr`;

			let summary = event.title;
			if (event.subtitle) {
				summary += ` - ${event.subtitle}`;
			}

			// Determine status icon
			const statusIcon = event.hasFile ? "[Downloaded]" : event.monitored ? "[Monitored]" : "";
			if (statusIcon) {
				summary = `${statusIcon} ${summary}`;
			}

			lines.push("BEGIN:VEVENT");
			lines.push(`UID:${uid}`);
			lines.push(`DTSTAMP:${formatIcalDateTime(new Date())}`);
			lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
			lines.push(`SUMMARY:${escapeIcalText(summary)}`);
			lines.push(`CATEGORIES:${event.mediaType.toUpperCase()}`);
			if (event.hasFile) {
				lines.push("STATUS:CONFIRMED");
			} else {
				lines.push("STATUS:TENTATIVE");
			}
			lines.push("END:VEVENT");
		}

		lines.push("END:VCALENDAR");

		return lines.join("\r\n");
	},
});

// Helper to format date for iCal (YYYYMMDD)
function formatIcalDate(date: Date): string {
	return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// Helper to format datetime for iCal (YYYYMMDDTHHMMSSZ)
function formatIcalDateTime(date: Date): string {
	return date
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\.\d{3}/, "");
}

// Helper to escape special characters in iCal text
function escapeIcalText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
}
