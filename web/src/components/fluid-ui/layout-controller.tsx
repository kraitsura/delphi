import type { DashboardConfig } from "@/lib/fluid-ui/types";
import { validateDashboardConfig } from "@/lib/fluid-ui/validators";
import { DashboardError } from "./dashboard-error";
import { GridRow } from "./grid-row";
import { TextRow } from "./text-row";

interface LayoutControllerProps {
	config: DashboardConfig;
	eventId?: string;
}

export function LayoutController({ config, eventId }: LayoutControllerProps) {
	// Validate configuration
	const validation = validateDashboardConfig(config);

	if (!validation.valid) {
		return (
			<DashboardError
				title="Invalid Dashboard Configuration"
				errors={validation.errors || []}
			/>
		);
	}

	return (
		<div className="fluid-dashboard" data-event-id={eventId}>
			{config.sections.map((section, index) => {
				if (section.type === "text") {
					// biome-ignore lint/suspicious/noArrayIndexKey: Section order defines layout structure, no unique IDs available
					return <TextRow key={`text-${index}`} section={section} />;
				}

				if (section.type === "row") {
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: Section order defines layout structure, no unique IDs available
						<GridRow key={`row-${index}`} section={section} eventId={eventId} />
					);
				}

				return null;
			})}
		</div>
	);
}
