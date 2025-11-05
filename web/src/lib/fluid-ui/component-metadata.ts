/**
 * Component Metadata Utilities
 * Helper functions for working with component metadata
 */

import type { ComponentMetadata, PropDefinition } from "./types";

// Re-export types for convenience
export type { ComponentMetadata, PropDefinition } from "./types";

/**
 * Create a basic component metadata object with sensible defaults
 */
export function createComponentMetadata(
	partial: Partial<ComponentMetadata> & {
		name: string;
		description: string;
	},
): ComponentMetadata {
	return {
		name: partial.name,
		description: partial.description,
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			...partial.layoutRules,
		},
		connections: partial.connections,
		props: partial.props || {},
	};
}

/**
 * Create a prop definition with defaults
 */
export function createPropDefinition(
	type: PropDefinition["type"],
	overrides?: Partial<PropDefinition>,
): PropDefinition {
	return {
		type,
		required: false,
		...overrides,
	};
}

/**
 * Helper to create required prop
 */
export function requiredProp(
	type: PropDefinition["type"],
	overrides?: Partial<PropDefinition>,
): PropDefinition {
	return createPropDefinition(type, { required: true, ...overrides });
}

/**
 * Helper to create optional prop with default
 */
export function optionalProp(
	type: PropDefinition["type"],
	defaultValue: any,
	overrides?: Partial<PropDefinition>,
): PropDefinition {
	return createPropDefinition(type, {
		required: false,
		default: defaultValue,
		...overrides,
	});
}

/**
 * Helper to create enum prop
 */
export function enumProp(
	values: string[],
	overrides?: Partial<PropDefinition>,
): PropDefinition {
	return createPropDefinition("enum", {
		values,
		...overrides,
	});
}
