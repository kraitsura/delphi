/**
 * MixedRenderer - Combines markdown text with component grids
 *
 * Part of Track 4: Message Rendering Pipeline
 * Handles renderType: "mixed"
 *
 * Features:
 * - Renders markdown text content first
 * - Follows with component grid sections
 * - Proper spacing between elements
 * - Reuses ComponentGridRenderer for consistency
 *
 * Use cases:
 * - AI message with explanation + data visualization
 * - Contextual text + interactive components
 * - Summary + detailed dashboard components
 */

import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";
import { ComponentGridRenderer } from "./ComponentGridRenderer";

interface ComponentGridSection {
	sections: Array<
		{ type: "text"; content: string } | { type: "grid"; components: Array<any> }
	>;
}

interface MixedRendererProps {
	config: ComponentGridSection;
	text: string;
	eventId?: string;
	roomId?: string;
}

export function MixedRenderer({
	config,
	text,
	eventId,
	roomId,
}: MixedRendererProps) {
	// Render main markdown text
	const markdownHtml = useMemo(() => {
		const raw = marked.parse(text) as string | Promise<string>;
		const htmlContent = typeof raw === "string" ? raw : "";
		return DOMPurify.sanitize(htmlContent);
	}, [text]);

	return (
		<div className="space-y-4">
			{/* Main text content */}
			<div
				className="prose prose-sm max-w-none"
				dangerouslySetInnerHTML={{ __html: markdownHtml }}
			/>

			{/* Component grid sections */}
			<ComponentGridRenderer
				config={config}
				eventId={eventId}
				roomId={roomId}
			/>
		</div>
	);
}
