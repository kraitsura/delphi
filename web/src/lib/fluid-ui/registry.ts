import type { ComponentMetadata, RegistryEntry } from "./types";

/**
 * Component Registry
 * Central registry for all dashboard components
 */

const registry = new Map<string, RegistryEntry>();

/**
 * Register a component with metadata
 */
export function registerComponent(
	type: string,
	component: React.ComponentType<any>,
	metadata: ComponentMetadata,
) {
	if (registry.has(type)) {
		console.warn(`Component "${type}" is already registered. Overwriting.`);
	}

	registry.set(type, { component, metadata });
}

/**
 * Get component by type
 */
export function getComponent(type: string): React.ComponentType<any> | null {
	return registry.get(type)?.component || null;
}

/**
 * Get component metadata
 */
export function getComponentMetadata(type: string): ComponentMetadata | null {
	return registry.get(type)?.metadata || null;
}

/**
 * Get all registered component types
 */
export function getAllComponentTypes(): string[] {
	return Array.from(registry.keys());
}

/**
 * Check if component exists
 */
export function hasComponent(type: string): boolean {
	return registry.has(type);
}

/**
 * Calculate grid layout from components and layout preference
 */
export function calculateGridLayout(
	components: any[],
	layoutPreference: string | string[] = "auto",
): string {
	// If only one component, always full width
	if (components.length === 1) {
		return "1fr";
	}

	// Check if any component must span full
	const hasFullSpanRequired = components.some((comp) => {
		const metadata = getComponentMetadata(comp.type);
		return metadata?.layoutRules.mustSpanFull;
	});

	if (hasFullSpanRequired) {
		throw new Error("Cannot place full-span component with other components");
	}

	// Handle layout preference
	if (layoutPreference === "auto") {
		// Use preferred ratios from metadata
		const ratios = components.map((comp) => {
			const metadata = getComponentMetadata(comp.type);
			return metadata?.layoutRules.preferredRatio || "1fr";
		});
		return ratios.join(" ");
	}

	if (layoutPreference === "1:1") {
		return components.map(() => "1fr").join(" ");
	}

	if (layoutPreference === "2:1") {
		return components.length === 2 ? "2fr 1fr" : "2fr 1fr 1fr";
	}

	if (layoutPreference === "3:1") {
		return components.length === 2 ? "3fr 1fr" : "3fr 1fr 1fr";
	}

	if (layoutPreference === "sidebar") {
		return `300px ${components
			.slice(1)
			.map(() => "1fr")
			.join(" ")}`;
	}

	// Custom array
	if (Array.isArray(layoutPreference)) {
		return layoutPreference.join(" ");
	}

	// Default to equal split
	return components.map(() => "1fr").join(" ");
}
