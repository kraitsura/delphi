import { Suspense } from "react";
import { getComponent } from "@/lib/fluid-ui/registry";
import type { ComponentInstance } from "@/lib/fluid-ui/types";
import { ComponentSkeleton } from "./component-skeleton";

interface ComponentRendererProps {
	component: ComponentInstance;
	eventId?: string;
	isLast: boolean;
}

export function ComponentRenderer({
	component,
	eventId,
	isLast,
}: ComponentRendererProps) {
	const Component = getComponent(component.type);

	if (!Component) {
		return (
			<div className="fluid-component-error">
				<p>Component "{component.type}" not found</p>
			</div>
		);
	}

	// Merge eventId if not in props
	const props = {
		...component.props,
		...(eventId && !component.props.eventId ? { eventId } : {}),
	};

	return (
		<div className={`fluid-component ${isLast ? "fluid-component--last" : ""}`}>
			<Suspense fallback={<ComponentSkeleton type={component.type} />}>
				<Component {...props} />
			</Suspense>
		</div>
	);
}
