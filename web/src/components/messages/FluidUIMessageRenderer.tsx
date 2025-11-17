/**
 * FluidUIMessageRenderer - Renders structured AI responses using Fluid UI system
 *
 * This component detects structured data in AI messages and renders them
 * using the Fluid UI dashboard system (LayoutController + registered components).
 *
 * Supports:
 * - Dashboard configs (grid layouts with components)
 * - Proposal responses (task, budget, vendor proposals)
 * - Task result summaries
 * - Track 4: New render types (component_grid, interactive_prompt, mixed, multi_block, text)
 *
 * Error handling: Hybrid fallback - shows subtle error indicator but still
 * renders the markdown text for graceful degradation.
 */

import type { Doc } from "@convex/_generated/dataModel";
import DOMPurify from "dompurify";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { marked } from "marked";
import { memo, useMemo, useState } from "react";
import { LayoutController } from "@/components/fluid-ui/layout-controller";
import type { StructuredData } from "@/hooks/useAgentInvoke";

// Track 4: New renderer imports
import { ComponentGridRenderer } from "./renderers/ComponentGridRenderer";
import { InteractivePromptRenderer } from "./renderers/InteractivePromptRenderer";
import { MixedRenderer } from "./renderers/MixedRenderer";
import { InlinePoll } from "@/components/fluid-ui/cards/InlinePoll";

interface FluidUIMessageRendererProps {
	message: Doc<"messages"> & {
		author?: Doc<"users"> | null;
	};
	structuredData: StructuredData;
	eventId?: string;
}

function FluidUIMessageRendererComponent({
	message,
	structuredData,
	eventId,
}: FluidUIMessageRendererProps) {
	const [showError, setShowError] = useState(false);
	const [renderError, setRenderError] = useState<Error | null>(null);

	// Parse markdown as fallback (for hybrid error handling)
	const fallbackHtml = useMemo(() => {
		if (!message.text) return null;
		const raw = marked.parse(message.text) as string | Promise<string>;
		const htmlContent = typeof raw === "string" ? raw : "";
		return DOMPurify.sanitize(htmlContent);
	}, [message.text]);

	// Use aiMetadata directly - no memoization needed
	const aiMetadata = message.aiMetadata;

	// Render structured data based on type
	const renderStructuredContent = () => {
		try {
			// Track 4: Check for new renderType field first (takes precedence)
			if (aiMetadata?.renderType) {
				const {
					renderType,
					componentConfig,
					interactivePrompt,
					responseBlocks,
				} = aiMetadata;

				switch (renderType) {
					case "text":
						// Plain text rendering with markdown
						return (
							<div
								className="prose prose-sm max-w-none"
								dangerouslySetInnerHTML={{ __html: fallbackHtml || "" }}
							/>
						);

					case "component_grid":
						// Render component grid sections
						if (!componentConfig) {
							throw new Error(
								"componentConfig is required for component_grid renderType",
							);
						}
						return (
							<ComponentGridRenderer
								config={componentConfig}
								eventId={eventId}
								roomId={message.roomId}
							/>
						);

					case "interactive_prompt":
						// Render interactive prompts (polls, confirmations, quick actions)
						if (!interactivePrompt) {
							throw new Error(
								"interactivePrompt is required for interactive_prompt renderType",
							);
						}
						return <InteractivePromptRenderer prompt={interactivePrompt} />;

					case "mixed":
						// Render mixed content (text + components)
						if (!componentConfig) {
							throw new Error(
								"componentConfig is required for mixed renderType",
							);
						}
						return (
							<MixedRenderer
								config={componentConfig}
								text={message.text}
								eventId={eventId}
								roomId={message.roomId}
							/>
						);

					case "multi_block":
						// Render multiple response blocks (for multi-intent responses)
						if (!responseBlocks || !Array.isArray(responseBlocks)) {
							throw new Error(
								"responseBlocks array is required for multi_block renderType",
							);
						}
						return (
							<div className="space-y-4">
								{responseBlocks.map((block: any, index: number) => {
									const blockKey = `block-${index}`;

									// Render each block based on its type
									switch (block.type) {
										case "text": {
											const blockHtml = marked.parse(
												block.text || "",
											) as string;
											const sanitizedHtml = DOMPurify.sanitize(blockHtml);
											return (
												<div
													key={blockKey}
													className="prose prose-sm max-w-none"
													dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
												/>
											);
										}

										case "component_grid":
											return (
												<ComponentGridRenderer
													key={blockKey}
													config={block.componentConfig}
													eventId={eventId}
													roomId={message.roomId}
												/>
											);

										case "proposal": {
											// Render proposal card
											const proposalData = block.proposalData;
											const componentType =
												proposalData.proposalType === "tasks"
													? "TaskProposalCard"
													: proposalData.proposalType === "budget_entries"
														? "BudgetProposalCard"
														: proposalData.proposalType === "venue_suggestions"
															? "VenueProposalCard"
															: "VendorProposalCard";
											return (
												<LayoutController
													key={blockKey}
													config={{
														sections: [
															{
																type: "row",
																layout: "1:1",
																components: [
																	{
																		type: componentType,
																		props: {
																			...proposalData,
																			eventId,
																			roomId: message.roomId,
																		},
																	},
																],
															},
														],
													}}
													eventId={eventId}
												/>
											);
										}

										case "interactive_prompt":
											return (
												<InteractivePromptRenderer
													key={blockKey}
													prompt={block.interactivePrompt}
												/>
											);

										default:
											console.warn(`Unknown block type: ${block.type}`);
											return null;
									}
								})}
							</div>
						);

					default:
						// Unknown renderType - fall through to legacy handling
						console.warn(
							`Unknown renderType: ${renderType}, falling back to legacy handling`,
						);
				}
			}

			// Legacy: Fall back to existing structuredData handling for backward compatibility
			// Cast to any to handle agent responses that don't match our type definitions yet
			const dataType = (structuredData as any).type;
			switch (dataType) {
				case "dashboard":
					// Render full dashboard config using LayoutController
					return (
						<div className="fluid-ui-message-dashboard -mt-1">
							<LayoutController
								config={(structuredData as any).config}
								eventId={eventId}
							/>
						</div>
					);

				case "proposal": {
					// Render proposal using appropriate card based on proposal type
					// Dynamically select: TaskProposalCard | BudgetProposalCard | VendorProposalCard | VenueProposalCard
					const { proposal } = structuredData as any;
					const componentType =
						proposal.proposalType === "tasks"
							? "TaskProposalCard"
							: proposal.proposalType === "budget_entries"
								? "BudgetProposalCard"
								: proposal.proposalType === "vendor_suggestions"
									? "VendorProposalCard"
									: proposal.proposalType === "venue_suggestions"
										? "VenueProposalCard"
										: "VendorProposalCard";
					return (
						<div className="fluid-ui-message-dashboard -mt-1">
							<LayoutController
								config={{
									sections: [
										{
											type: "row",
											layout: "1:1",
											components: [
												{
													type: componentType,
													props: {
														proposalId: proposal.proposalId,
														proposalType: proposal.proposalType,
														items: proposal.items,
														expiresAt: proposal.expiresAt,
														eventId,
														roomId: message.roomId,
														status: proposal.status || "pending",
													},
												},
											],
										},
									],
								}}
								eventId={eventId}
							/>
						</div>
					);
				}

				case "task_result":
					// Simple result display - could be enhanced with a card component
					const taskResult = structuredData as any;
					return (
						<div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
							<div className="text-sm text-green-900">
								<strong>✓ Tasks Created:</strong>{" "}
								{taskResult.successfullyCreated} of{" "}
								{taskResult.totalRequested} requested
							</div>
						</div>
					);

				case "create_result":
					// Handle poll creation results
					const createData = structuredData as any;
					if (aiMetadata?.intent?.includes('poll') || aiMetadata?.intent?.includes('create_poll')) {
						// Render the poll component with the created poll ID
						if (createData.data && typeof createData.data === 'string') {
							return <InlinePoll pollId={createData.data} />;
						}
					}
					// For other create operations, show generic success message
					return (
						<div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
							<div className="text-sm text-green-900">
								<strong>✓ Created:</strong> {createData.operation || 'Item created successfully'}
							</div>
						</div>
					);

				default:
					// Unknown type - this should never happen with proper typing
					throw new Error(
						`Unknown structured data type: ${dataType}`,
					);
			}
		} catch (error) {
			// Capture render error for hybrid fallback
			const err =
				error instanceof Error ? error : new Error("Rendering failed");
			setRenderError(err);
			return null;
		}
	};

	const structuredContent = renderStructuredContent();

	// If rendering succeeded, show structured content
	if (structuredContent && !renderError) {
		return (
			<div className="fluid-ui-message-container max-w-2xl -mt-1">
				{structuredContent}
			</div>
		);
	}

	// Hybrid fallback: Show error indicator + markdown text
	return (
		<div className="fluid-ui-message-error-fallback max-w-2xl -mt-1">
			{/* Subtle error indicator */}
			<div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
				<AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-medium text-amber-900">
							Could not render interactive components
						</span>
						{renderError && (
							<button
								type="button"
								onClick={() => setShowError(!showError)}
								className="text-amber-700 hover:text-amber-900 transition-colors"
								aria-label={
									showError ? "Hide error details" : "Show error details"
								}
							>
								{showError ? (
									<ChevronUp className="h-3 w-3" />
								) : (
									<ChevronDown className="h-3 w-3" />
								)}
							</button>
						)}
					</div>

					{/* Collapsible error details */}
					{showError && renderError && (
						<div className="mt-2 pt-2 border-t border-amber-200">
							<code className="text-[10px] text-amber-800 break-all">
								{renderError.message}
							</code>
						</div>
					)}
				</div>
			</div>

			{/* Fallback to markdown rendering */}
			{fallbackHtml && (
				<div
					className="text-sm text-gray-900 markdown-content px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg"
					dangerouslySetInnerHTML={{ __html: fallbackHtml }}
				/>
			)}

			{/* If no markdown either, show generic message */}
			{!fallbackHtml && (
				<div className="text-sm text-gray-600 italic px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
					The AI response could not be displayed.
				</div>
			)}
		</div>
	);
}

// Wrap in React.memo to prevent unnecessary re-renders from parent
export const FluidUIMessageRenderer = memo(
	FluidUIMessageRendererComponent,
	(prevProps, nextProps) => {
		// Only re-render if message ID or creation time changed
		// Content updates are handled by Convex reactivity in child components
		return (
			prevProps.message._id === nextProps.message._id &&
			prevProps.message._creationTime === nextProps.message._creationTime &&
			prevProps.eventId === nextProps.eventId
		);
	},
);
