import { convexTest } from "convex-test";
import { vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { authComponent } from "../../convex/auth";
import schema from "../../convex/schema";

/**
 * Create a Convex test environment with schema
 * This sets up an isolated in-memory database for testing
 */
export const setupConvexTest = () => {
	return convexTest(schema);
};

/**
 * Register Better Auth mock for tests
 * Call this to mock authComponent.getAuthUser
 */
export const registerBetterAuthMock = (
	_t: ReturnType<typeof convexTest>,
	authUser: { email: string; id: string; name?: string; image?: string } | null,
) => {
	vi.spyOn(authComponent, "getAuthUser").mockResolvedValue(
		authUser as unknown as Awaited<
			ReturnType<typeof authComponent.getAuthUser>
		>,
	);
};

/**
 * Create a test user with auth profile
 * Returns both the Better Auth user mock and the Convex user profile
 */
export const createTestUser = async (
	t: ReturnType<typeof convexTest>,
	overrides?: {
		email?: string;
		name?: string;
		role?: "coordinator" | "collaborator" | "guest" | "vendor";
		isActive?: boolean;
	},
) => {
	const email = overrides?.email || `test-${Date.now()}@example.com`;
	const name = overrides?.name || "Test User";

	// Create the user profile in the database
	const userId = await t.run(async (ctx) => {
		return await ctx.db.insert("users", {
			email,
			name,
			role: overrides?.role || "collaborator",
			isActive: overrides?.isActive !== undefined ? overrides.isActive : true,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
	});

	// Create mock Better Auth user
	const authUser = {
		id: `auth-${userId}`,
		email,
		name,
	};

	return { authUser, userId };
};

/**
 * Helper to generate test IDs
 */
export const generateTestId = <T extends keyof typeof schema.tables>(
	tableName: T,
	suffix: string = "",
): Id<T> => {
	// Generate a valid Convex ID format
	const randomPart = Math.random().toString(36).substring(2, 15);
	return `${tableName}_${randomPart}${suffix}` as Id<T>;
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
	new Promise((resolve) => setTimeout(resolve, 0));
