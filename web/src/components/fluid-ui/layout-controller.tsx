import type { DashboardConfig } from "@/lib/fluid-ui/types";
import { validateDashboardConfig } from "@/lib/fluid-ui/validators";
import { TextRow } from "./text-row";
import { GridRow } from "./grid-row";
import { DashboardError } from "./dashboard-error";

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
					return <TextRow key={`text-${index}`} section={section} />;
				}

				if (section.type === "row") {
					return (
						<GridRow key={`row-${index}`} section={section} eventId={eventId} />
					);
				}

				return null;
			})}
		</div>
	);
}
