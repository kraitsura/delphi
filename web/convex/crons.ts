import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Weekly reset of usage tracking for free plan users
 * Runs every Monday at 00:00 UTC
 */
crons.weekly(
  "Reset weekly usage tracking",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
  internal.usageTracking.resetWeeklyUsage
);

export default crons;
