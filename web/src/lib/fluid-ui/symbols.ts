/**
 * Symbol Library for Fluid UI
 * Curated set of Unicode symbols for visual hierarchy
 */

export const SYMBOLS = {
	// Primary sections and categories
	BLACK_SQUARE: "■",

	// Bullets and status markers
	BLACK_CIRCLE: "●",

	// Trends and priorities
	TRIANGLE_UP: "▲",
	TRIANGLE_DOWN: "▼",

	// Actions and flow
	ARROW_RIGHT: "→",
	ARROW_LEFT: "←",

	// Urgency and importance
	THUNDERBOLT: "⚡",

	// Unique items
	HEXAGON: "⬢",

	// Visual separators
	HEAVY_LINE: "━",

	// Completion
	CHECK_MARK: "✓",
} as const;

/**
 * Helper to format section headers
 */
export function formatSectionHeader(
	symbol: keyof typeof SYMBOLS,
	text: string,
): string {
	return `${SYMBOLS[symbol]} ${text}`;
}

/**
 * Helper to create list items
 */
export function formatListItem(text: string): string {
	return `${SYMBOLS.BLACK_CIRCLE} ${text}`;
}

/**
 * Helper to indicate trends
 */
export function formatTrend(value: number, text: string): string {
	const symbol =
		value > 0
			? SYMBOLS.TRIANGLE_UP
			: value < 0
				? SYMBOLS.TRIANGLE_DOWN
				: SYMBOLS.BLACK_CIRCLE;
	return `${symbol} ${text}`;
}
