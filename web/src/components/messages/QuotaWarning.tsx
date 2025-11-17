import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface QuotaWarningProps {
	used: number;
	limit: number | null;
	plan: string;
	className?: string;
}

export function QuotaWarning({
	used,
	limit,
	plan,
	className,
}: QuotaWarningProps) {
	// Don't show anything for unlimited plans
	if (plan === "unlimited" || limit === null) {
		return null;
	}

	const remaining = limit - used;
	const isExhausted = remaining <= 0;
	const isLow = remaining > 0 && remaining <= 3;

	// Only show warning if low or exhausted
	if (!isLow && !isExhausted) {
		return null;
	}

	return (
		<Alert
			variant={isExhausted ? "destructive" : "default"}
			className={cn("border-l-4", className)}
		>
			{isExhausted ? (
				<AlertCircle className="h-4 w-4" />
			) : (
				<Info className="h-4 w-4" />
			)}
			<AlertDescription>
				{isExhausted ? (
					<span>
						<strong>Weekly limit reached</strong> ({used}/{limit} agent calls
						used). Contact admin for unlimited access.
					</span>
				) : (
					<span>
						<strong>{remaining} agent calls remaining</strong> this week ({used}
						/{limit} used on free plan).
					</span>
				)}
			</AlertDescription>
		</Alert>
	);
}
