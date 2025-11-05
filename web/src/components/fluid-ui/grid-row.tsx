import type { RowSection } from "@/lib/fluid-ui/types";
import { calculateGridLayout } from "@/lib/fluid-ui/registry";
import { ComponentRenderer } from "./component-renderer";

interface GridRowProps {
	section: RowSection;
	eventId?: string;
}

export function GridRow({ section, eventId }: GridRowProps) {
	// Calculate grid template columns
	const gridTemplateColumns = calculateGridLayout(
		section.components,
		section.layout,
	);

	return (
		<div className="fluid-grid-row" style={{ gridTemplateColumns }}>
			{section.components.map((component, index) => (
				<ComponentRenderer
					key={component.id || `comp-${index}`}
					component={component}
					eventId={eventId}
					isLast={index === section.components.length - 1}
				/>
			))}
		</div>
	);
}
