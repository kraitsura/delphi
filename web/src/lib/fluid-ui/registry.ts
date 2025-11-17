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
 * Get the entire component registry
 * Used for inspecting all available components
 */
export function getComponentRegistry(): Map<string, RegistryEntry> {
	return registry;
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

/**
 * Export component metadata in LLM-friendly format for AI agent
 * Used to inform the agent about available components and their usage
 */
export function getComponentMetadataForAgent(): string {
	const components = Array.from(registry.entries());

	const metadata = components.map(([type, entry]) => {
		const meta = entry.metadata;
		return {
			type,
			name: meta.name,
			description: meta.description,
			props: Object.entries(meta.props).map(([name, schema]) => ({
				name,
				type: schema.type,
				required: schema.required,
				description: schema.description,
				default: schema.default,
				values: (schema as any).values,
			})),
			layoutRules: {
				preferredRatio: meta.layoutRules.preferredRatio,
				minWidth: meta.layoutRules.minWidth,
				minHeight: meta.layoutRules.minHeight,
			},
			connections: meta.connections,
		};
	});

	return `
Available Components for Dynamic UI:

${metadata
	.map(
		(c) => `
### ${c.name} (${c.type})
Description: ${c.description}

Required Props:
${
	c.props
		.filter((p) => p.required)
		.map((p) => `  - ${p.name}: ${p.type} - ${p.description}`)
		.join("\n") || "  (none)"
}

Optional Props:
${
	c.props
		.filter((p) => !p.required)
		.map(
			(p) =>
				`  - ${p.name}: ${p.type}${p.default !== undefined ? ` (default: ${JSON.stringify(p.default)})` : ""}${p.values ? ` [${p.values.join(", ")}]` : ""} - ${p.description}`,
		)
		.join("\n") || "  (none)"
}

Layout: ${c.layoutRules.preferredRatio} ratio, min ${c.layoutRules.minWidth}

${c.connections?.canBeMaster ? `🔵 Master Component - Emits: ${c.connections.emits?.join(", ") || "none"}` : ""}
${c.connections?.canBeDetail ? `🟢 Detail Component - Listens: ${c.connections.listensTo?.join(", ") || "none"}` : ""}
`,
	)
	.join("\n---\n")}

## How to Use Components

### Single Component Response:
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [{
      "type": "grid",
      "components": [
        { "type": "TaskListCard", "props": { "eventId": "evt_123", "limit": 10 } }
      ]
    }]
  }
}

### Dashboard Layout (Multiple Components):
{
  "renderType": "component_grid",
  "componentConfig": {
    "sections": [
      {
        "type": "text",
        "content": "# Event Overview\\nHere are your key metrics:"
      },
      {
        "type": "grid",
        "components": [
          { "type": "KPIDashboard", "props": { "eventId": "evt_123" } },
          { "type": "ProgressSummary", "props": { "eventId": "evt_123" } }
        ]
      },
      {
        "type": "grid",
        "components": [
          { "type": "TaskListCard", "props": { "eventId": "evt_123", "limit": 5 } },
          { "type": "BudgetSummaryCard", "props": { "eventId": "evt_123" } }
        ]
      }
    ]
  }
}

### Master-Detail Pattern:
Place master component (e.g., VendorsList) in first grid, detail component (e.g., VendorCard) in second grid.
When user clicks in master, detail component filters automatically via Zustand.

### Interactive Prompts:
{
  "renderType": "interactive_prompt",
  "interactivePrompt": {
    "promptType": "poll",
    "data": {
      "pollId": "poll_123",
      "question": "Which caterer should we choose?",
      "options": [...],
      "allowMultipleChoices": false,
      "eventId": "evt_123",
      "roomId": "room_456"
    }
  }
}
`;
}
