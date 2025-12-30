/**
 * Feature Flags System
 *
 * Simple feature flag system for gradual rollout of new features.
 * Supports localStorage overrides for development and testing.
 *
 * Phase 3: WebSocket Streaming Architecture - Issue delphi-9ni
 */

// ============================================================================
// FEATURE FLAG DEFINITIONS
// ============================================================================

export interface FeatureFlag {
	key: string;
	defaultValue: boolean;
	description: string;
}

export const FEATURE_FLAGS = {
	enableWebSocket: {
		key: "agent-websocket",
		defaultValue: false, // Disabled by default, enable via localStorage or config
		description: "Enable WebSocket streaming for agent responses",
	},
	enableStreamingUI: {
		key: "streaming-ui",
		defaultValue: false,
		description: "Enable progressive rendering of streaming responses",
	},
	enableToolVisibility: {
		key: "tool-visibility",
		defaultValue: true,
		description: "Show tool execution status during agent processing",
	},
} as const;

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

const STORAGE_PREFIX = "delphi-feature-flag:";

/**
 * Get localStorage override for a feature flag
 */
function getLocalOverride(key: string): boolean | null {
	if (typeof window === "undefined") return null;

	try {
		const value = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
		if (value === null) return null;
		return value === "true";
	} catch {
		return null;
	}
}

/**
 * Set localStorage override for a feature flag
 */
export function setFeatureFlag(key: string, value: boolean): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
	} catch {
		console.warn(`Failed to set feature flag: ${key}`);
	}
}

/**
 * Clear localStorage override for a feature flag
 */
export function clearFeatureFlag(key: string): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
	} catch {
		console.warn(`Failed to clear feature flag: ${key}`);
	}
}

/**
 * Get all feature flag overrides from localStorage
 */
export function getLocalOverrides(): Record<string, boolean> {
	const overrides: Record<string, boolean> = {};

	for (const flag of Object.values(FEATURE_FLAGS)) {
		const override = getLocalOverride(flag.key);
		if (override !== null) {
			overrides[flag.key] = override;
		}
	}

	return overrides;
}

// ============================================================================
// FEATURE FLAGS HOOK
// ============================================================================

export interface FeatureFlagsResult {
	/** Enable WebSocket streaming for agent responses */
	enableWebSocket: boolean;
	/** Enable progressive rendering of streaming responses */
	enableStreamingUI: boolean;
	/** Show tool execution status during agent processing */
	enableToolVisibility: boolean;
	/** Set a feature flag value (for development/testing) */
	setFlag: (key: string, value: boolean) => void;
	/** Clear a feature flag override */
	clearFlag: (key: string) => void;
}

/**
 * Hook to access feature flags
 * Checks localStorage for development overrides
 */
export function useFeatureFlags(): FeatureFlagsResult {
	const overrides = getLocalOverrides();

	const getFlag = (flag: FeatureFlag): boolean => {
		// Check localStorage override first
		if (flag.key in overrides) {
			return overrides[flag.key];
		}
		// Fall back to default
		return flag.defaultValue;
	};

	return {
		enableWebSocket: getFlag(FEATURE_FLAGS.enableWebSocket),
		enableStreamingUI: getFlag(FEATURE_FLAGS.enableStreamingUI),
		enableToolVisibility: getFlag(FEATURE_FLAGS.enableToolVisibility),
		setFlag: setFeatureFlag,
		clearFlag: clearFeatureFlag,
	};
}

// ============================================================================
// DEV TOOLS
// ============================================================================

/**
 * Enable all WebSocket/streaming features for development
 * Call from browser console: window.__enableStreaming()
 */
if (typeof window !== "undefined") {
	(window as any).__enableStreaming = () => {
		setFeatureFlag(FEATURE_FLAGS.enableWebSocket.key, true);
		setFeatureFlag(FEATURE_FLAGS.enableStreamingUI.key, true);
		setFeatureFlag(FEATURE_FLAGS.enableToolVisibility.key, true);
		console.log("Streaming features enabled. Refresh the page.");
	};

	(window as any).__disableStreaming = () => {
		clearFeatureFlag(FEATURE_FLAGS.enableWebSocket.key);
		clearFeatureFlag(FEATURE_FLAGS.enableStreamingUI.key);
		clearFeatureFlag(FEATURE_FLAGS.enableToolVisibility.key);
		console.log("Streaming features disabled. Refresh the page.");
	};

	(window as any).__showFeatureFlags = () => {
		console.table({
			"WebSocket": {
				key: FEATURE_FLAGS.enableWebSocket.key,
				default: FEATURE_FLAGS.enableWebSocket.defaultValue,
				override: getLocalOverride(FEATURE_FLAGS.enableWebSocket.key),
			},
			"Streaming UI": {
				key: FEATURE_FLAGS.enableStreamingUI.key,
				default: FEATURE_FLAGS.enableStreamingUI.defaultValue,
				override: getLocalOverride(FEATURE_FLAGS.enableStreamingUI.key),
			},
			"Tool Visibility": {
				key: FEATURE_FLAGS.enableToolVisibility.key,
				default: FEATURE_FLAGS.enableToolVisibility.defaultValue,
				override: getLocalOverride(FEATURE_FLAGS.enableToolVisibility.key),
			},
		});
	};
}
