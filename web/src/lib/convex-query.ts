/**
 * Convex + TanStack Query Integration
 *
 * Provides helpers for using Convex queries with TanStack Query for SSR support.
 * Based on @convex-dev/react-query package.
 *
 * Setup:
 * 1. ConvexQueryClient is configured in integrations/convex/query-client.ts
 * 2. QueryClient is configured with ConvexQueryClient in integrations/tanstack-query/root-provider.tsx
 * 3. This enables useSuspenseQuery to work with Convex queries
 *
 * Features:
 * - Works with TanStack Query's SSR (useSuspenseQuery)
 * - Maintains Convex real-time updates on client
 * - Supports route loaders for pre-fetching data
 */

import { convexQuery } from "@convex-dev/react-query";

// Re-export convexQuery for convenience
export { convexQuery };

/**
 * Example usage:
 *
 * ```tsx
 * import { useSuspenseQuery } from "@tanstack/react-query";
 * import { convexQuery } from "@/lib/convex-query";
 * import { api } from "@/convex/_generated/api";
 *
 * // In component (works with SSR):
 * const { data } = useSuspenseQuery(convexQuery(api.users.getMyProfile));
 *
 * // With arguments:
 * const { data } = useSuspenseQuery(
 *   convexQuery(api.messages.list, { limit: 10 })
 * );
 *
 * // In route loader (pre-fetch for SSR):
 * loader: async (opts) => {
 *   await opts.context.queryClient.ensureQueryData(
 *     convexQuery(api.users.getMyProfile),
 *   );
 * },
 * ```
 */
