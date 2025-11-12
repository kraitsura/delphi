import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import {
	getStoredTheme,
	type StoredThemePreferences,
	type ThemeMode,
	useThemeSet,
} from "./theme-set-provider";

/**
 * ThemeConvexSync - Client-only component that syncs theme preferences with Convex
 *
 * This component:
 * 1. Loads user preferences from Convex (client-side only, waits for auth)
 * 2. Syncs Convex preferences to localStorage if they differ
 * 3. Listens for localStorage changes and syncs to Convex
 *
 * Must be rendered within ConvexProvider context (authenticated routes only).
 * Uses regular Convex useQuery which respects expectAuth:true setting.
 */
export function ThemeConvexSync() {
	const { themeSet, accent, mode, updateFromExternal } = useThemeSet();

	// Use Convex useQuery (client-only, waits for auth due to expectAuth: true)
	const userProfile = useQuery(api.users.getMyProfile);

	// Still use regular Convex mutation (mutations don't need SSR support)
	const updateThemePreferences = useMutation(api.users.updateThemePreferences);

	// Track if we've already synced from Convex
	const hasSyncedFromConvex = useRef(false);

	// Track the last known localStorage values to detect changes
	const lastKnownPrefs = useRef<StoredThemePreferences>({
		themeSet,
		accent,
		themeMode: mode,
	});

	// Sync from Convex to localStorage when profile loads (one-time on mount)
	useEffect(() => {
		if (!userProfile?.preferences || hasSyncedFromConvex.current) return;

		const stored = getStoredTheme();
		const convexPrefs = userProfile.preferences;

		// Check if Convex has different preferences than localStorage
		const needsUpdate =
			(convexPrefs.themeSet && convexPrefs.themeSet !== stored?.themeSet) ||
			(convexPrefs.accent && convexPrefs.accent !== stored?.accent) ||
			(convexPrefs.themeMode && convexPrefs.themeMode !== stored?.themeMode) ||
			// Handle legacy 'theme' field
			(!convexPrefs.themeMode &&
				convexPrefs.theme &&
				convexPrefs.theme !== stored?.themeMode);

		if (needsUpdate) {
			// Update localStorage with Convex values
			updateFromExternal({
				themeSet: convexPrefs.themeSet,
				accent: convexPrefs.accent,
				themeMode:
					convexPrefs.themeMode || (convexPrefs.theme as ThemeMode | undefined),
			});
		}

		hasSyncedFromConvex.current = true;
	}, [userProfile, updateFromExternal]);

	// Sync localStorage changes to Convex (when user changes theme)
	useEffect(() => {
		const current: StoredThemePreferences = {
			themeSet,
			accent,
			themeMode: mode,
		};
		const last = lastKnownPrefs.current;

		// Check what changed
		const themeSetChanged = current.themeSet !== last.themeSet;
		const accentChanged = current.accent !== last.accent;
		const modeChanged = current.themeMode !== last.themeMode;

		// Update our reference
		lastKnownPrefs.current = current;

		// Skip the first render (initial values)
		if (!hasSyncedFromConvex.current) return;

		// Sync changes to Convex
		if (themeSetChanged) {
			updateThemePreferences({ themeSet }).catch((error) => {
				console.error("Failed to sync theme set to Convex:", error);
			});
		}

		if (accentChanged) {
			updateThemePreferences({ accent }).catch((error) => {
				console.error("Failed to sync accent to Convex:", error);
			});
		}

		if (modeChanged) {
			updateThemePreferences({ themeMode: mode }).catch((error) => {
				console.error("Failed to sync theme mode to Convex:", error);
			});
		}
	}, [themeSet, accent, mode, updateThemePreferences]);

	// This component doesn't render anything
	return null;
}
