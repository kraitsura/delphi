import { vi } from "vitest";
import type { ReactNode } from "react";

/**
 * Mock Convex query hook
 * Returns mock data or undefined based on test needs
 */
export const createMockUseQuery = <T,>(mockData?: T) => {
	return vi.fn(() => mockData);
};

/**
 * Mock Convex mutation hook
 * Returns a mock async function that can be spied on
 */
export const createMockUseMutation = () => {
	return vi.fn(() => vi.fn().mockResolvedValue({}));
};

/**
 * Mock rate limit status for testing
 */
export const createMockRateLimitStatus = (
	overrides?: Partial<{
		ok: boolean;
		remaining: number;
		retryAfter: number;
	}>,
) => {
	return {
		ok: true,
		remaining: 13,
		retryAfter: 0,
		...overrides,
	};
};

/**
 * Mock Convex provider for testing
 */
export const MockConvexProvider = ({ children }: { children: ReactNode }) => {
	return <>{children}</>;
};

/**
 * Helper to create test scenarios
 */
export const rateLimitTestScenarios = {
	full: createMockRateLimitStatus({ ok: true, remaining: 13, retryAfter: 0 }),
	half: createMockRateLimitStatus({ ok: true, remaining: 6, retryAfter: 0 }),
	low: createMockRateLimitStatus({ ok: true, remaining: 2, retryAfter: 0 }),
	limited: createMockRateLimitStatus({
		ok: false,
		remaining: 0,
		retryAfter: 30000,
	}),
	empty: createMockRateLimitStatus({ ok: true, remaining: 0, retryAfter: 0 }),
};
