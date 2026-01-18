import { cronJobs } from "convex/server";

const crons = cronJobs();

// ============================================================================
// TRaSH Guides Sync
// Syncs custom formats from TRaSH Guides daily at 3 AM
// ============================================================================

// Note: This cron job is defined but disabled by default.
// Enable it by uncommenting and the sync will run automatically.
// Users can also trigger manual syncs from the settings UI.

// crons.daily(
// 	"trash-guides-sync",
// 	{ hourUTC: 3, minuteUTC: 0 },
// 	internal.scheduler.syncTrashGuides,
// );

export default crons;
