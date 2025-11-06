import { components } from "./_generated/api";
import { RateLimiter } from "@convex-dev/rate-limiter";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const rateLimiter = new RateLimiter(components.rateLimiter, {
	// Demo action: 10 per minute with burst capacity
	demoAction: {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 3, // Allow bursts up to 13 total
	},

	// Message sending: 10 per minute with burst capacity
	sendMessage: {
		kind: "token bucket",
		rate: 10,
		period: MINUTE,
		capacity: 3,
	},

	// AI requests: 20 per hour
	aiRequest: {
		kind: "token bucket",
		rate: 20,
		period: HOUR,
	},

	// File uploads: 5 per minute
	fileUpload: {
		kind: "token bucket",
		rate: 5,
		period: MINUTE,
	},

	// Failed logins: 5 attempts per 15 minutes
	failedLogin: {
		kind: "fixed window",
		rate: 5,
		period: 15 * MINUTE,
	},

	// Event creation (free tier): 3 per day
	freeEventCreation: {
		kind: "fixed window",
		rate: 3,
		period: 24 * HOUR,
	},
});
