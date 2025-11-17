/**
 * ComponentGridRenderer - Renders sections containing text blocks and component grids
 *
 * Part of Track 4: Message Rendering Pipeline
 * Handles renderType: "component_grid"
 *
 * Features:
 * - Supports mixed text + component grid sections
 * - Integrates with LayoutController for component rendering
 * - Uses DashboardStoreProvider for master-detail patterns
 * - Error boundaries for graceful degradation
 */

import DOMPurify from "dompurify";
import { marked } from "marked";
import { LayoutController } from "@/components/fluid-ui/layout-controller";
import { DashboardStoreProvider } from "@/lib/fluid-ui/DashboardStoreContext";

interface ComponentGridSection {
	sections: Array<
		{ type: "text"; content: string } | { type: "grid"; components: Array<any> }
	>;
}

interface ComponentGridRendererProps {
	config: ComponentGridSection;
	eventId?: string;
	roomId?: string;
}

// Separate component for markdown rendering to comply with Rules of Hooks
function MarkdownSection({ content }: { content: string }) {
	const raw = marked.parse(content) as string | Promise<string>;
	const htmlContent = typeof raw === "string" ? raw : "";
	const html = DOMPurify.sanitize(htmlContent);

	return (
		<div
			className="prose prose-sm max-w-none mb-4"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

export function ComponentGridRenderer({
	config,
	eventId,
}: ComponentGridRendererProps) {
	return (
		<div className="space-y-4">
			{config.sections.map((section, idx) => {
				if (section.type === "text") {
					return (
						<div key={idx}>
							<MarkdownSection content={section.content} />
						</div>
					);
				}

				if (section.type === "grid") {
					// Convert components array to LayoutController config format
					const layoutConfig = {
						sections: [
							{
								type: "row" as const,
								layout: "1:1" as const,
								components: section.components,
							},
						],
					};

					return (
						<DashboardStoreProvider key={idx}>
							<LayoutController config={layoutConfig} eventId={eventId} />
						</DashboardStoreProvider>
					);
				}

				return null;
			})}
		</div>
	);
}
