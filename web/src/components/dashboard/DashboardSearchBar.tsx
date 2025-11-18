import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface DashboardSearchBarProps {
	searchQuery: string;
	onSearchChange: (value: string) => void;
	visibleComponents: Set<string>;
	onClear: () => void;
}

export function DashboardSearchBar({
	searchQuery,
	onSearchChange,
	visibleComponents,
	onClear,
}: DashboardSearchBarProps) {
	return (
		<div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="max-w-3xl mx-auto">
				<div className="px-4 py-2">
					<div className="flex gap-2 items-center">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								value={searchQuery}
								onChange={(e) => onSearchChange(e.target.value)}
								placeholder="Search components... (e.g. 'task', 'budget', 'timeline', 'kanban')"
								className="pl-9 pr-9 h-9 rounded-2xl"
							/>
							{searchQuery && (
								<Button
									onClick={onClear}
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
								>
									<X className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>
					{searchQuery && (
						<div className="mt-2 text-xs text-muted-foreground text-center">
							{visibleComponents.size === 0 ? (
								<span className="text-destructive">
									No components match your search
								</span>
							) : (
								<span>
									Showing {visibleComponents.size} component
									{visibleComponents.size !== 1 ? "s" : ""}
								</span>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
