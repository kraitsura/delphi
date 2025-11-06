import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { FunctionOnce } from "@/lib/function-once";

export type ThemeSet =
	| "default"
	| "patagonia"
	| "redwood"
	| "flare"
	| "ocean"
	| "twilight"
	| "moss";
export type AccentColor = "indigo" | "rose" | "forest" | "amber" | "teal";
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "delphi.theme";
const isBrowser = typeof window !== "undefined";

export interface StoredThemePreferences {
	themeSet: ThemeSet;
	accent: AccentColor;
	themeMode: ThemeMode;
}

type ThemeSetProviderProps = {
	children: React.ReactNode;
	defaultThemeSet?: ThemeSet;
	defaultAccent?: AccentColor;
	defaultMode?: ThemeMode;
};

type ThemeSetProviderState = {
	themeSet: ThemeSet;
	setThemeSet: (themeSet: ThemeSet) => void;
	accent: AccentColor;
	setAccent: (accent: AccentColor) => void;
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
	resolvedMode: ResolvedTheme;
	updateFromExternal: (prefs: Partial<StoredThemePreferences>) => void;
};

const initialState: ThemeSetProviderState = {
	themeSet: "default",
	setThemeSet: () => null,
	accent: "indigo",
	setAccent: () => null,
	mode: "system",
	setMode: () => null,
	resolvedMode: "light",
	updateFromExternal: () => null,
};

const ThemeSetProviderContext =
	createContext<ThemeSetProviderState>(initialState);

/**
 * Get theme preferences from localStorage
 */
export function getStoredTheme(): Partial<StoredThemePreferences> | null {
	if (!isBrowser) return null;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : null;
	} catch {
		return null;
	}
}

/**
 * Save theme preferences to localStorage
 */
export function setStoredTheme(preferences: StoredThemePreferences) {
	if (!isBrowser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch (error) {
		console.error("Failed to save theme to localStorage:", error);
	}
}

export function ThemeSetProvider({
	children,
	defaultThemeSet = "default",
	defaultAccent = "indigo",
	defaultMode = "system",
	...props
}: ThemeSetProviderProps) {
	// Initialize from localStorage or defaults
	const [themeSet, setThemeSetState] = useState<ThemeSet>(() => {
		const stored = getStoredTheme();
		return stored?.themeSet || defaultThemeSet;
	});

	const [accent, setAccentState] = useState<AccentColor>(() => {
		const stored = getStoredTheme();
		return stored?.accent || defaultAccent;
	});

	const [mode, setModeState] = useState<ThemeMode>(() => {
		const stored = getStoredTheme();
		return stored?.themeMode || defaultMode;
	});

	const [resolvedMode, setResolvedMode] = useState<ResolvedTheme>("light");

	// Detect and update resolved theme based on system preference
	useEffect(() => {
		if (!isBrowser) return;

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		function updateResolvedTheme() {
			if (mode === "system") {
				setResolvedMode(mediaQuery.matches ? "dark" : "light");
			} else {
				setResolvedMode(mode as ResolvedTheme);
			}
		}

		mediaQuery.addEventListener("change", updateResolvedTheme);
		updateResolvedTheme();

		return () => mediaQuery.removeEventListener("change", updateResolvedTheme);
	}, [mode]);

	// Apply theme classes to DOM
	useEffect(() => {
		if (!isBrowser) return;

		const root = window.document.documentElement;

		// Remove all theme classes
		root.classList.remove("light", "dark");
		root.classList.remove(
			"theme-patagonia",
			"theme-redwood",
			"theme-flare",
			"theme-ocean",
			"theme-twilight",
			"theme-moss",
		);
		root.classList.remove(
			"accent-indigo",
			"accent-rose",
			"accent-forest",
			"accent-amber",
			"accent-teal",
		);

		// Apply current theme set
		if (themeSet !== "default") {
			root.classList.add(`theme-${themeSet}`);
		}

		// Apply accent color (only for default theme)
		if (themeSet === "default") {
			root.classList.add(`accent-${accent}`);
		}

		// Apply light/dark mode
		root.classList.add(resolvedMode);
	}, [themeSet, accent, resolvedMode]);

	// Update function for external sources (e.g., Convex sync)
	const updateFromExternal = useMemo(
		() => (prefs: Partial<StoredThemePreferences>) => {
			const stored = getStoredTheme();

			if (prefs.themeSet && prefs.themeSet !== stored?.themeSet) {
				setThemeSetState(prefs.themeSet);
			}
			if (prefs.accent && prefs.accent !== stored?.accent) {
				setAccentState(prefs.accent);
			}
			if (prefs.themeMode && prefs.themeMode !== stored?.themeMode) {
				setModeState(prefs.themeMode);
			}

			// Update localStorage
			setStoredTheme({
				themeSet: prefs.themeSet || stored?.themeSet || themeSet,
				accent: prefs.accent || stored?.accent || accent,
				themeMode: prefs.themeMode || stored?.themeMode || mode,
			});
		},
		[themeSet, accent, mode],
	);

	// Update functions that persist to localStorage
	const setThemeSet = useMemo(
		() => (newThemeSet: ThemeSet) => {
			setThemeSetState(newThemeSet);

			const currentPrefs = getStoredTheme();
			setStoredTheme({
				themeSet: newThemeSet,
				accent: currentPrefs?.accent || accent,
				themeMode: currentPrefs?.themeMode || mode,
			});
		},
		[accent, mode],
	);

	const setAccent = useMemo(
		() => (newAccent: AccentColor) => {
			setAccentState(newAccent);

			const currentPrefs = getStoredTheme();
			setStoredTheme({
				themeSet: currentPrefs?.themeSet || themeSet,
				accent: newAccent,
				themeMode: currentPrefs?.themeMode || mode,
			});
		},
		[themeSet, mode],
	);

	const setMode = useMemo(
		() => (newMode: ThemeMode) => {
			setModeState(newMode);

			const currentPrefs = getStoredTheme();
			setStoredTheme({
				themeSet: currentPrefs?.themeSet || themeSet,
				accent: currentPrefs?.accent || accent,
				themeMode: newMode,
			});
		},
		[themeSet, accent],
	);

	const value = useMemo(
		() => ({
			themeSet,
			setThemeSet,
			accent,
			setAccent,
			mode,
			setMode,
			resolvedMode,
			updateFromExternal,
		}),
		[
			themeSet,
			setThemeSet,
			accent,
			setAccent,
			mode,
			setMode,
			resolvedMode,
			updateFromExternal,
		],
	);

	return (
		<ThemeSetProviderContext.Provider {...props} value={value}>
			<FunctionOnce param={STORAGE_KEY}>
				{(storageKey) => {
					const stored = localStorage.getItem(storageKey);
					if (!stored) return;

					try {
						const prefs = JSON.parse(stored);
						const root = document.documentElement;

						// Remove all theme classes
						root.classList.remove("light", "dark");
						root.classList.remove(
							"theme-patagonia",
							"theme-redwood",
							"theme-flare",
							"theme-ocean",
							"theme-twilight",
							"theme-moss",
						);
						root.classList.remove(
							"accent-indigo",
							"accent-rose",
							"accent-forest",
							"accent-amber",
							"accent-teal",
						);

						// Apply theme set
						if (prefs.themeSet && prefs.themeSet !== "default") {
							root.classList.add(`theme-${prefs.themeSet}`);
						}

						// Apply accent color (only for default theme)
						if (
							(!prefs.themeSet || prefs.themeSet === "default") &&
							prefs.accent
						) {
							root.classList.add(`accent-${prefs.accent}`);
						}

						// Apply theme mode
						const themeMode = prefs.themeMode || "system";
						if (
							themeMode === "dark" ||
							(themeMode === "system" &&
								window.matchMedia("(prefers-color-scheme: dark)").matches)
						) {
							root.classList.add("dark");
						} else {
							root.classList.add("light");
						}
					} catch (error) {
						console.error("Failed to parse theme from localStorage:", error);
					}
				}}
			</FunctionOnce>
			{children}
		</ThemeSetProviderContext.Provider>
	);
}

export const useThemeSet = () => {
	const context = useContext(ThemeSetProviderContext);

	if (context === undefined)
		throw new Error("useThemeSet must be used within a ThemeSetProvider");

	return context;
};
