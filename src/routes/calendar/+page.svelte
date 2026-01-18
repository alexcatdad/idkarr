<script lang="ts">
import { useConvexClient, useQuery } from "convex-svelte";
import { Button } from "$lib/components/ui/button";
import { api } from "../../convex/_generated/api";

const client = useConvexClient();
let isExporting = $state(false);

// Current view date
let viewDate = $state(new Date());

// Calculate date range for current month view
function getDateRange() {
	const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
	const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59);
	return { start: start.getTime(), end: end.getTime() };
}

// Query upcoming events - use function for reactive args
const eventsQuery = useQuery(api.calendar.getUpcoming, () => {
	const range = getDateRange();
	return { startDate: range.start, endDate: range.end };
});

// Group events by date
function getEventsByDate() {
	if (!eventsQuery.data) return new Map<string, typeof eventsQuery.data>();

	const grouped = new Map<string, NonNullable<typeof eventsQuery.data>>();
	for (const event of eventsQuery.data) {
		const dateKey = new Date(event.date).toISOString().split("T")[0];
		if (!grouped.has(dateKey)) {
			grouped.set(dateKey, []);
		}
		grouped.get(dateKey)?.push(event);
	}
	return grouped;
}

// Generate calendar grid
function getCalendarDays() {
	const year = viewDate.getFullYear();
	const month = viewDate.getMonth();

	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);

	const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

	// Add days from previous month to fill first week
	const startPadding = firstDay.getDay();
	for (let i = startPadding - 1; i >= 0; i--) {
		const date = new Date(year, month, -i);
		days.push({ date, isCurrentMonth: false });
	}

	// Add days of current month
	for (let d = 1; d <= lastDay.getDate(); d++) {
		days.push({ date: new Date(year, month, d), isCurrentMonth: true });
	}

	// Add days from next month to fill last week
	const endPadding = 6 - lastDay.getDay();
	for (let i = 1; i <= endPadding; i++) {
		days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
	}

	return days;
}

function previousMonth() {
	viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
}

function nextMonth() {
	viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
}

function goToToday() {
	viewDate = new Date();
}

function isToday(date: Date): boolean {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

function formatMonth(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getMediaTypeColor(type: string): string {
	switch (type) {
		case "tv":
			return "bg-blue-500";
		case "movie":
			return "bg-purple-500";
		case "anime":
			return "bg-pink-500";
		case "music":
			return "bg-green-500";
		default:
			return "bg-gray-500";
	}
}

async function exportIcal() {
	isExporting = true;
	try {
		const icalContent = await client.action(api.calendar.generateIcal, {
			daysAhead: 90,
			daysBehind: 14,
			includeUnmonitored: false,
		});

		// Create and download the file
		const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "idkarr-calendar.ics";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error("Failed to export calendar:", error);
		alert("Failed to export calendar");
	} finally {
		isExporting = false;
	}
}
</script>

<svelte:head>
	<title>Calendar - idkarr</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Calendar</h1>
			<p class="text-muted-foreground">Upcoming releases and air dates</p>
		</div>
		<Button variant="outline" onclick={exportIcal} disabled={isExporting}>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" x2="12" y1="15" y2="3" />
			</svg>
			{isExporting ? "Exporting..." : "Export iCal"}
		</Button>
	</div>

	<!-- Calendar Navigation -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={previousMonth}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m15 18-6-6 6-6" />
				</svg>
			</Button>
			<h2 class="text-xl font-semibold min-w-48 text-center">{formatMonth(viewDate)}</h2>
			<Button variant="outline" size="sm" onclick={nextMonth}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="m9 18 6-6-6-6" />
				</svg>
			</Button>
		</div>
		<Button variant="outline" onclick={goToToday}>Today</Button>
	</div>

	<!-- Calendar Grid -->
	<div class="rounded-lg border bg-card overflow-hidden">
		<!-- Day headers -->
		<div class="grid grid-cols-7 border-b bg-muted/50">
			{#each ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as day}
				<div class="p-3 text-center text-sm font-medium text-muted-foreground">
					{day}
				</div>
			{/each}
		</div>

		<!-- Calendar days -->
		<div class="grid grid-cols-7">
			{#each getCalendarDays() as { date, isCurrentMonth }, i}
				{@const dateKey = date.toISOString().split("T")[0]}
				{@const dayEvents = getEventsByDate().get(dateKey) ?? []}
				<div
					class="min-h-28 p-2 border-b border-r {isCurrentMonth ? '' : 'bg-muted/30'} {isToday(date) ? 'bg-primary/5' : ''}"
					class:border-r-0={(i + 1) % 7 === 0}
				>
					<div class="flex items-center justify-between mb-1">
						<span class="text-sm {isCurrentMonth ? '' : 'text-muted-foreground'} {isToday(date) ? 'font-bold text-primary' : ''}">
							{date.getDate()}
						</span>
						{#if dayEvents.length > 0}
							<span class="text-xs text-muted-foreground">{dayEvents.length}</span>
						{/if}
					</div>

					<!-- Events -->
					<div class="space-y-1">
						{#each dayEvents.slice(0, 3) as event}
							<a
								href="/{event.mediaType === 'movie' ? 'movies' : 'series'}/{event.mediaId}"
								class="block p-1 rounded text-xs truncate hover:bg-muted transition-colors {event.hasFile ? 'opacity-50' : ''}"
							>
								<span class="inline-block w-1.5 h-1.5 rounded-full mr-1 {getMediaTypeColor(event.mediaType)}"></span>
								<span class="{event.monitored ? '' : 'text-muted-foreground'}">{event.title}</span>
								{#if event.subtitle}
									<span class="text-muted-foreground"> - {event.subtitle}</span>
								{/if}
							</a>
						{/each}
						{#if dayEvents.length > 3}
							<div class="text-xs text-muted-foreground px-1">+{dayEvents.length - 3} more</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Legend -->
	<div class="flex items-center gap-6 text-sm">
		<div class="flex items-center gap-2">
			<span class="w-3 h-3 rounded-full bg-blue-500"></span>
			<span>TV</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="w-3 h-3 rounded-full bg-purple-500"></span>
			<span>Movies</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="w-3 h-3 rounded-full bg-pink-500"></span>
			<span>Anime</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="w-3 h-3 rounded-full bg-green-500"></span>
			<span>Music</span>
		</div>
	</div>
</div>
