import { z } from "zod";
import { getComponentMetadata } from "./registry";
import type { ValidationError, ValidationResult } from "./types";

/**
 * Zod schemas for runtime validation
 */

// Text section schema
const textSectionSchema = z.object({
	type: z.literal("text"),
	content: z.string().min(1, "Content cannot be empty"),
	spacing: z.enum(["comfortable", "tight", "flush"]).default("comfortable"),
});

// Component instance schema (basic)
const componentInstanceSchema = z.object({
	type: z.string(),
	props: z.record(z.string(), z.any()),
	id: z.string().optional(),
});

// Row section schema (basic structure)
const rowSectionSchema = z.object({
	type: z.literal("row"),
	layout: z
		.union([
			z.literal("auto"),
			z.literal("1:1"),
			z.literal("2:1"),
			z.literal("3:1"),
			z.literal("sidebar"),
			z.array(z.string()),
		])
		.default("auto"),
	components: z.array(componentInstanceSchema).min(1).max(3),
});

// Dashboard config schema
export const dashboardConfigSchema = z.object({
	sections: z.array(z.union([textSectionSchema, rowSectionSchema])),
	metadata: z
		.object({
			name: z.string().optional(),
			description: z.string().optional(),
			createdAt: z.number().optional(),
			updatedAt: z.number().optional(),
		})
		.optional(),
});

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfig(config: any): ValidationResult {
	try {
		// Basic schema validation
		dashboardConfigSchema.parse(config);

		// Custom validations
		const errors: ValidationError[] = [];

		// Check component count constraint (max 2 rows)
		const rowSections = config.sections.filter((s: any) => s.type === "row");
		if (rowSections.length > 2) {
			errors.push({
				code: "MAX_ROWS_EXCEEDED",
				message: "Maximum 2 component rows allowed per dashboard",
				details: { found: rowSections.length, max: 2 },
			});
		}

		// Validate each component
		config.sections.forEach((section: any, sectionIdx: number) => {
			if (section.type === "row") {
				section.components.forEach((comp: any, compIdx: number) => {
					// Check component exists in registry
					const metadata = getComponentMetadata(comp.type);
					if (!metadata) {
						errors.push({
							code: "INVALID_COMPONENT",
							message: `Component "${comp.type}" not found in registry`,
							path: [
								"sections",
								String(sectionIdx),
								"components",
								String(compIdx),
							],
						});
						return;
					}

					// Check layout rules
					if (
						metadata.layoutRules.mustSpanFull &&
						section.components.length > 1
					) {
						errors.push({
							code: "LAYOUT_CONFLICT",
							message: `Component "${comp.type}" requires full row width but is placed with other components`,
							path: [
								"sections",
								String(sectionIdx),
								"components",
								String(compIdx),
							],
						});
					}

					// Validate props
					const propErrors = validateComponentProps(comp.type, comp.props);
					errors.push(...propErrors);
				});
			}
		});

		if (errors.length > 0) {
			return { valid: false, errors };
		}

		return { valid: true };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				valid: false,
				errors: error.issues.map((e: z.ZodIssue) => ({
					code: "SCHEMA_VALIDATION_ERROR",
					message: e.message,
					path: e.path.map(String),
				})),
			};
		}

		return {
			valid: false,
			errors: [
				{
					code: "UNKNOWN_ERROR",
					message: String(error),
				},
			],
		};
	}
}

/**
 * Validate component props against metadata
 */
function validateComponentProps(
	componentType: string,
	props: Record<string, any>,
): ValidationError[] {
	const metadata = getComponentMetadata(componentType);
	if (!metadata) return [];

	const errors: ValidationError[] = [];

	// Check required props
	Object.entries(metadata.props).forEach(([propName, propDef]) => {
		if (propDef.required && !(propName in props)) {
			errors.push({
				code: "MISSING_REQUIRED_PROP",
				message: `Component "${componentType}" requires prop "${propName}"`,
				details: { componentType, propName },
			});
		}
	});

	// Check prop types (basic validation)
	Object.entries(props).forEach(([propName, propValue]) => {
		const propDef = metadata.props[propName];
		if (!propDef) {
			errors.push({
				code: "UNKNOWN_PROP",
				message: `Component "${componentType}" does not accept prop "${propName}"`,
				details: { componentType, propName },
			});
			return;
		}

		// Type validation
		const actualType = Array.isArray(propValue) ? "array" : typeof propValue;
		if (
			propDef.type !== actualType &&
			propValue !== null &&
			propValue !== undefined
		) {
			errors.push({
				code: "INVALID_PROP_TYPE",
				message: `Prop "${propName}" on component "${componentType}" expected ${propDef.type} but got ${actualType}`,
				details: {
					componentType,
					propName,
					expected: propDef.type,
					actual: actualType,
				},
			});
		}
	});

	return errors;
}
