import type { ReactNode } from "react";
import { vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";

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
export const createMockUseMutation = <TArgs = unknown, TReturn = unknown>() => {
	const mutationFn = vi.fn<[TArgs], Promise<TReturn>>().mockResolvedValue({} as TReturn);
	return vi.fn(() => mutationFn);
};

/**
 * Mock Convex action hook
 * Returns a mock async function that can be spied on
 */
export const createMockUseAction = <TArgs = unknown, TReturn = unknown>() => {
	const actionFn = vi.fn<[TArgs], Promise<TReturn>>().mockResolvedValue({} as TReturn);
	return vi.fn(() => actionFn);
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

/**
 * Mock authenticated session
 */
export const createMockAuthSession = (userId: Id<"users">) => {
	return {
		user: {
			id: userId,
			email: `test-${userId}@example.com`,
			name: "Test User",
		},
		session: {
			token: `mock-token-${userId}`,
			expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
		},
	};
};

/**
 * Mock unauthenticated session
 */
export const mockUnauthenticatedSession = {
	user: null,
	session: null,
};

/**
 * Create a complete mock Convex client
 */
export const createMockConvexClient = () => {
	return {
		query: vi.fn().mockResolvedValue(undefined),
		mutation: vi.fn().mockResolvedValue(undefined),
		action: vi.fn().mockResolvedValue(undefined),
	};
};
