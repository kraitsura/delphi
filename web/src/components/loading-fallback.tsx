import { Loader2 } from "lucide-react";

/**
 * LoadingFallback Component
 * Generic loading indicator for Suspense fallbacks
 * Works for any page/route while content is loading
 */
export function LoadingFallback() {
	return (
		<div className="flex items-center justify-center h-full min-h-[400px]">
			<div className="flex flex-col items-center gap-3">
				<Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		</div>
	);
}
