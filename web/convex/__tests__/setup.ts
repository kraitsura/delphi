import { convexTest } from "convex-test";
import { vi } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Create a Convex test environment with schema
 * This sets up an isolated in-memory database for testing
 */
export const setupConvexTest = () => {
  return convexTest(schema);
};

/**
 * Mock authenticated user context
 * Use this to simulate authenticated requests
 */
export const mockAuthUser = (userId: Id<"users">) => {
  return {
    getUserIdentity: vi.fn().mockResolvedValue({
      subject: userId,
      tokenIdentifier: `mock-token-${userId}`,
    }),
  };
};

/**
 * Mock unauthenticated context
 */
export const mockUnauthenticatedUser = () => {
  return {
    getUserIdentity: vi.fn().mockResolvedValue(null),
  };
};

/**
 * Helper to generate test IDs
 */
export const generateTestId = <T extends keyof typeof schema.tables>(
  tableName: T,
  suffix: string = ""
): Id<T> => {
  // Generate a valid Convex ID format
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${tableName}_${randomPart}${suffix}` as Id<T>;
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));
