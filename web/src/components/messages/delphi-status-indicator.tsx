import { Sparkles } from "lucide-react";

interface DelphiStatusIndicatorProps {
	mentionsDelphi: boolean;
	isAgentInvoking: boolean;
}

export function DelphiStatusIndicator({
	mentionsDelphi,
	isAgentInvoking,
}: DelphiStatusIndicatorProps) {
	if (!mentionsDelphi && !isAgentInvoking) {
		return null;
	}

	return (
		<div className="absolute bottom-full left-0 right-0 px-4 pb-1">
			{isAgentInvoking ? (
				<div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
					<Sparkles className="h-3 w-3" />
					<span>Delphi is thinking...</span>
				</div>
			) : (
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<Sparkles className="h-3 w-3" />
					<span>Press Enter to ask Delphi</span>
				</div>
			)}
		</div>
	);
}
