import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MockConvexProvider } from "../mocks/convex";

/**
 * Custom render function that wraps components with all necessary providers
 * Use this instead of @testing-library/react's render
 */

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
	/**
	 * Optional QueryClient instance for React Query
	 * If not provided, a new one will be created with sensible test defaults
	 */
	queryClient?: QueryClient;

	/**
	 * Optional initial route for MemoryRouter
	 */
	initialRoute?: string;

	/**
	 * Optional initial entries for MemoryRouter
	 */
	initialEntries?: string[];
}

/**
 * Create a QueryClient with test-friendly defaults
 */
export const createTestQueryClient = () => {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false, // Don't retry failed queries in tests
				gcTime: Number.POSITIVE_INFINITY, // Don't garbage collect in tests
			},
			mutations: {
				retry: false, // Don't retry failed mutations in tests
			},
		},
	});
};

/**
 * Render a component with all necessary providers
 */
export const renderWithProviders = (
	ui: ReactElement,
	options: CustomRenderOptions = {},
) => {
	const { queryClient = createTestQueryClient(), ...renderOptions } = options;

	const Wrapper = ({ children }: { children: React.ReactNode }) => {
		return (
			<MockConvexProvider>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</MockConvexProvider>
		);
	};

	return {
		...render(ui, { wrapper: Wrapper, ...renderOptions }),
		queryClient,
	};
};

/**
 * Render a component with only QueryClient (no router)
 * Useful for testing components that don't use routing
 */
export const renderWithQuery = (
	ui: ReactElement,
	options: Omit<CustomRenderOptions, "initialRoute" | "initialEntries"> = {},
) => {
	const { queryClient = createTestQueryClient(), ...renderOptions } = options;

	const Wrapper = ({ children }: { children: React.ReactNode }) => {
		return (
			<MockConvexProvider>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</MockConvexProvider>
		);
	};

	return {
		...render(ui, { wrapper: Wrapper, ...renderOptions }),
		queryClient,
	};
};

/**
 * Wait for all pending promises to resolve
 * Useful after triggering async operations in tests
 */
export const waitForAsync = () =>
	new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Re-export everything from @testing-library/react
 */
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
