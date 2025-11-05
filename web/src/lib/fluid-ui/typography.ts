/**
 * Typography utilities for Fluid UI
 */

export const FONT_WEIGHTS = {
	ultrathin: 300,
	regular: 400,
	emphasis: 600,
} as const;

export const FONT_SIZES = {
	h1: "2rem", // 32px
	h2: "1.5rem", // 24px
	h3: "1.25rem", // 20px
	body: "1rem", // 16px
	small: "0.875rem", // 14px
} as const;

export const LINE_HEIGHTS = {
	tight: 1.25,
	normal: 1.5,
	relaxed: 1.75,
} as const;

export const LETTER_SPACING = {
	tight: "-0.02em",
	normal: "0",
	wide: "0.05em",
} as const;
