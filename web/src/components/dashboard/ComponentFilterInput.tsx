/**
 * Component Filter Input
 *
 * Search input for filtering dashboard components in real-time.
 * Supports both category-based search (e.g., "task", "budget") and
 * individual component name search (e.g., "kanban", "expenses").
 */

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useComponentFilter } from "@/hooks/useComponentFilter";
import {
	getComponentDisplayName,
	getSuggestedSearchTerms,
} from "@/lib/fluid-ui/componentMetadata";

export interface ComponentFilterInputProps {
	onVisibilityChange: (visibleComponents: Set<string>) => void;
	placeholder?: string;
	showMatchedComponents?: boolean;
}

export function ComponentFilterInput({
	onVisibilityChange,
	placeholder = "Search components... (e.g. 'task', 'budget', 'timeline', 'kanban')",
	showMatchedComponents = true,
}: ComponentFilterInputProps) {
	const [query, setQuery] = useState("");
	const { visibleComponents, matchCount, isFiltering } =
		useComponentFilter(query);

	// Notify parent of visibility changes
	useEffect(() => {
		onVisibilityChange(visibleComponents);
	}, [visibleComponents, onVisibilityChange]);

	// Get suggested terms for display
	const suggestions = getSuggestedSearchTerms(query);

	// Clear search
	const handleClear = () => {
		setQuery("");
	};

	// Get a sample of matched components for display
	const displayedComponents = Array.from(visibleComponents).slice(0, 8);
	const hasMoreComponents = visibleComponents.size > displayedComponents.length;

	return (
		<div className="space-y-3 border rounded-lg p-4 bg-card">
			{/* Search Input */}
			<div className="flex items-center gap-3">
				<Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={placeholder}
					className="flex-1"
				/>
				{query && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClear}
						className="flex-shrink-0"
					>
						<X className="h-4 w-4 mr-1" />
						Clear
					</Button>
				)}
			</div>

			{/* Match Count */}
			{isFiltering && (
				<div className="text-sm text-muted-foreground">
					{matchCount === 0 ? (
						<span className="text-destructive">
							No components match your search
						</span>
					) : (
						<span>
							Showing {matchCount} component{matchCount !== 1 ? "s" : ""}
						</span>
					)}
				</div>
			)}

			{/* Matched Components Display */}
			{showMatchedComponents && isFiltering && matchCount > 0 && (
				<div className="flex flex-wrap gap-2">
					{displayedComponents.map((componentType) => (
						<Badge key={componentType} variant="secondary" className="text-xs">
							{getComponentDisplayName(componentType)}
						</Badge>
					))}
					{hasMoreComponents && (
						<Badge variant="outline" className="text-xs">
							+{visibleComponents.size - displayedComponents.length} more
						</Badge>
					)}
				</div>
			)}

			{/* Search Suggestions */}
			{query.length >= 2 && suggestions.length > 0 && !isFiltering && (
				<div className="text-xs text-muted-foreground">
					Suggestions: {suggestions.join(", ")}
				</div>
			)}

			{/* Help Text */}
			{!query && (
				<div className="text-xs text-muted-foreground">
					Try searching: <strong>task</strong>, <strong>budget</strong>,{" "}
					<strong>timeline</strong>, <strong>milestone</strong>,{" "}
					<strong>progress</strong>, <strong>vendor</strong>,{" "}
					<strong>calendar</strong>, <strong>collaboration</strong>
				</div>
			)}
		</div>
	);
}
