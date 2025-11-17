/**
 * Custom hook for filtering dashboard components based on search query
 */

import { useMemo } from "react";
import { getMatchingComponents } from "@/lib/fluid-ui/componentMetadata";

export interface UseComponentFilterResult {
	visibleComponents: Set<string>;
	matchCount: number;
	isFiltering: boolean;
}

/**
 * Hook to filter dashboard components based on search query
 *
 * @param searchQuery - The search query string
 * @returns Object containing visible components set, match count, and filtering state
 *
 * @example
 * ```tsx
 * const { visibleComponents, matchCount, isFiltering } = useComponentFilter("task");
 * // visibleComponents contains all task-related component types
 * // matchCount is 9 (number of task components)
 * // isFiltering is true
 * ```
 */
export function useComponentFilter(
	searchQuery: string,
): UseComponentFilterResult {
	const result = useMemo(() => {
		const query = searchQuery.trim();
		const isFiltering = query.length > 0;

		// Get matching components based on query
		const visibleComponents = getMatchingComponents(query);

		return {
			visibleComponents,
			matchCount: visibleComponents.size,
			isFiltering,
		};
	}, [searchQuery]);

	return result;
}
