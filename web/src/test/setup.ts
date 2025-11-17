/**
 * Vitest Setup File
 *
 * Global test configuration and mocks
 */

import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock Convex generated API
vi.mock("@convex/_generated/api", () => ({
	api: new Proxy(
		{},
		{
			get: () =>
				new Proxy(
					{},
					{
						get: () => vi.fn(),
					},
				),
		},
	),
}));

// Mock Convex generated dataModel
vi.mock("@convex/_generated/dataModel", () => ({
	Id: vi.fn(),
}));

// Global test utilities can be added here
