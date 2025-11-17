/**
 * InteractivePromptRenderer - Renders interactive prompts inline in message stream
 *
 * Part of Track 4: Message Rendering Pipeline
 * Handles renderType: "interactive_prompt"
 *
 * Supported prompt types:
 * - poll: InlinePoll component (voting with real-time results)
 * - confirmation: ConfirmationPrompt component (yes/no confirmations)
 * - quickActions: QuickActions component (suggested action buttons)
 * - multiChoice: Future component (placeholder for now)
 *
 * Features:
 * - Routes to appropriate Track 1 interactive component
 * - Passes data object as props to component
 * - Handles unknown prompt types gracefully
 * - Supports future extensibility
 */

import { AlertCircle } from "lucide-react";
import { memo } from "react";
import { InlinePoll } from "@/components/fluid-ui/cards/InlinePoll";
import { ConfirmationPrompt } from "@/components/fluid-ui/interactive/ConfirmationPrompt";
import { QuickActions } from "@/components/fluid-ui/interactive/QuickActions";

interface InteractivePrompt {
	promptType: "poll" | "confirmation" | "quickActions" | "multiChoice";
	data: any;
	responses?: any[];
}

interface InteractivePromptRendererProps {
	prompt: InteractivePrompt;
}

function InteractivePromptRendererComponent({
	prompt,
}: InteractivePromptRendererProps) {
	const { promptType, data } = prompt;

	switch (promptType) {
		case "poll":
			// Render InlinePoll with only pollId - component fetches everything else
			return <InlinePoll pollId={data.pollId} />;

		case "confirmation":
			// Render ConfirmationPrompt with confirmation data
			return <ConfirmationPrompt {...data} />;

		case "quickActions":
			// Render QuickActions with action buttons
			return <QuickActions {...data} />;

		case "multiChoice":
			// Placeholder for future MultiChoicePrompt component
			return (
				<div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
					<div className="flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-sm font-medium text-amber-900">
								Multi-choice prompts coming soon
							</p>
							<p className="text-sm text-amber-700 mt-1">
								This prompt type is not yet implemented.
							</p>
						</div>
					</div>
				</div>
			);

		default:
			// Unknown prompt type - graceful error handling
			return (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-sm font-medium text-red-900">
								Unknown prompt type
							</p>
							<p className="text-sm text-red-700 mt-1">
								The prompt type &quot;{promptType}&quot; is not recognized.
							</p>
						</div>
					</div>
				</div>
			);
	}
}

// Wrap in React.memo - parent FluidUIMessageRenderer is already memoized
// so we'll only get new prompt references when data actually changes
export const InteractivePromptRenderer = memo(
	InteractivePromptRendererComponent,
);
