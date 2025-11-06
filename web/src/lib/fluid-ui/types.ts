/**
 * Core Types for Fluid UI System
 */

// Spacing options for text rows
export type Spacing = "comfortable" | "tight" | "flush";

// Layout ratios for component rows
export type LayoutRatio =
	| "auto" // Smart default based on component metadata
	| "1:1" // Equal split
	| "2:1" // Primary + secondary
	| "3:1" // Dominant primary
	| "sidebar" // Fixed sidebar (300px + flex)
	| string[]; // Custom like ["300px", "1fr", "2fr"]

// Text section
export interface TextSection {
	type: "text";
	content: string; // HTML/Markdown string
	spacing?: Spacing;
}

// Component instance
export interface ComponentInstance {
	type: string; // Component type from registry
	props: Record<string, any>;
	id?: string; // Optional ID for connections
}

// Component row
export interface RowSection {
	type: "row";
	layout?: LayoutRatio;
	components: ComponentInstance[];
}

// Dashboard section (union type)
export type DashboardSection = TextSection | RowSection;

// Complete dashboard configuration
export interface DashboardConfig {
	sections: DashboardSection[];
	metadata?: {
		name?: string;
		description?: string;
		createdAt?: number;
		updatedAt?: number;
	};
}

// Component metadata
export interface ComponentMetadata {
	name: string;
	description: string;

	layoutRules: {
		canShare: boolean;
		mustSpanFull: boolean;
		preferredRatio: string;
		minWidth?: string;
		minHeight?: string;
	};

	connections?: {
		canBeMaster: boolean;
		canBeDetail: boolean;
		emits?: string[];
		listensTo?: string[];
	};

	props: Record<string, PropDefinition>;
}

// Prop definition for validation
export interface PropDefinition {
	type: "string" | "number" | "boolean" | "object" | "array" | "enum";
	required: boolean;
	default?: any;
	description?: string;
	values?: string[]; // For enum type
}

// Validation result
export interface ValidationResult {
	valid: boolean;
	errors?: ValidationError[];
}

export interface ValidationError {
	code: string;
	message: string;
	path?: string[];
	details?: any;
}

// Registry entry
export interface RegistryEntry {
	component: React.ComponentType<any>;
	metadata: ComponentMetadata;
}

// ============================================================================
// Event System Types
// ============================================================================

/**
 * Selection events - emitted when user selects an item
 */
export type SelectionEvent =
	| { type: "taskSelected"; payload: { taskId: string; taskData: any } }
	| {
			type: "vendorSelected";
			payload: { vendorId: string; vendorName: string };
	  }
	| { type: "categorySelected"; payload: { category: string } }
	| { type: "dateSelected"; payload: { date: number } }
	| { type: "pollSelected"; payload: { pollId: string } }
	| { type: "eventSelected"; payload: { eventId: string } };

/**
 * Filter events - emitted when filters change
 */
export type FilterEvent =
	| { type: "statusChanged"; payload: { status: string } }
	| { type: "assigneeSelected"; payload: { userId: string; userName: string } }
	| { type: "dateRangeChanged"; payload: { start: number; end: number } }
	| { type: "priorityChanged"; payload: { priority: string } };

/**
 * Action events - emitted when items are modified or filters cleared
 */
export type ActionEvent =
	| { type: "itemAdded"; payload: { itemType: string; itemId: string } }
	| { type: "itemUpdated"; payload: { itemType: string; itemId: string } }
	| { type: "itemDeleted"; payload: { itemType: string; itemId: string } }
	| { type: "filterCleared"; payload: { filterType?: string } };

/**
 * Union of all component events
 */
export type ComponentEvent = SelectionEvent | FilterEvent | ActionEvent;

/**
 * Connection between two components (master-detail relationship)
 */
export interface Connection {
	masterId: string;
	detailId: string;
	masterType: string;
	detailType: string;
	eventTypes: string[];
}
