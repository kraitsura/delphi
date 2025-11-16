/**
 * Dashboard Store Context
 *
 * Provides scoped Zustand store instances for each dashboard.
 * Each component grid gets its own isolated state to prevent interference.
 */

import React, { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createDashboardStore, type DashboardStore } from './store';

// ============================================================================
// CONTEXT
// ============================================================================

type DashboardStoreApi = ReturnType<typeof createDashboardStore>;

const DashboardStoreContext = createContext<DashboardStoreApi | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface DashboardStoreProviderProps {
	children: ReactNode;
}

/**
 * Provides a scoped dashboard store instance
 *
 * Usage:
 * <DashboardStoreProvider>
 *   <LayoutController />
 * </DashboardStoreProvider>
 *
 * Each provider creates its own isolated store instance,
 * allowing multiple dashboards to coexist without state collision.
 */
export function DashboardStoreProvider({
	children,
}: DashboardStoreProviderProps) {
	const storeRef = useRef<DashboardStoreApi>();

	if (!storeRef.current) {
		storeRef.current = createDashboardStore();
	}

	return (
		<DashboardStoreContext.Provider value={storeRef.current}>
			{children}
		</DashboardStoreContext.Provider>
	);
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access the dashboard store
 *
 * Usage:
 * const config = useDashboardStore(state => state.config);
 * const select = useDashboardStore(state => state.select);
 * const selectedVendor = useDashboardStore(state => state.selections.vendorId);
 *
 * @throws Error if used outside DashboardStoreProvider
 */
export function useDashboardStore<T>(
	selector: (state: DashboardStore) => T
): T {
	const store = useContext(DashboardStoreContext);

	if (!store) {
		throw new Error(
			'useDashboardStore must be used within DashboardStoreProvider'
		);
	}

	return useStore(store, selector);
}

/**
 * Hook to get the raw store API (advanced usage)
 *
 * Most components should use useDashboardStore() instead.
 * This is useful for passing the store to utility functions.
 *
 * @throws Error if used outside DashboardStoreProvider
 */
export function useDashboardStoreApi(): DashboardStoreApi {
	const store = useContext(DashboardStoreContext);

	if (!store) {
		throw new Error(
			'useDashboardStoreApi must be used within DashboardStoreProvider'
		);
	}

	return store;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get a single selection value
 *
 * Usage:
 * const vendorId = useSelection('vendorId');
 * const taskId = useSelection('taskId');
 */
export function useSelection<K extends keyof DashboardStore['selections']>(
	key: K
): DashboardStore['selections'][K] {
	return useDashboardStore((state) => state.selections[key]);
}

/**
 * Hook to get all selections
 *
 * Usage:
 * const selections = useAllSelections();
 */
export function useAllSelections(): DashboardStore['selections'] {
	return useDashboardStore((state) => state.selections);
}

/**
 * Hook to get the select action
 *
 * Usage:
 * const select = useSelectAction();
 * select('vendorId', 'vendor-123');
 */
export function useSelectAction() {
	return useDashboardStore((state) => state.select);
}

/**
 * Hook to check if a component is highlighted
 *
 * Usage:
 * const isHighlighted = useIsComponentHighlighted('component-id');
 */
export function useIsComponentHighlighted(componentId: string): boolean {
	return useDashboardStore((state) =>
		state.highlightedComponents.has(componentId)
	);
}

/**
 * Hook to get highlight actions
 *
 * Usage:
 * const { highlight, clearHighlights } = useHighlightActions();
 * highlight('component-id', 3000);
 */
export function useHighlightActions() {
	const highlightComponent = useDashboardStore(
		(state) => state.highlightComponent
	);
	const clearHighlights = useDashboardStore((state) => state.clearHighlights);

	return {
		highlight: highlightComponent,
		clearHighlights,
	};
}

/**
 * Hook to get animation state for a component
 *
 * Usage:
 * const animationType = useComponentAnimation('component-id');
 */
export function useComponentAnimation(
	componentId: string
): 'pulse' | 'shake' | 'glow' | null {
	return useDashboardStore(
		(state) => state.animatingComponents.get(componentId) || null
	);
}

/**
 * Hook to get panel expansion state
 *
 * Usage:
 * const isExpanded = useIsPanelExpanded('panel-id');
 */
export function useIsPanelExpanded(panelId: string): boolean {
	return useDashboardStore((state) => state.expandedPanels.has(panelId));
}

/**
 * Hook to get panel toggle action
 *
 * Usage:
 * const togglePanel = usePanelToggle();
 * togglePanel('panel-id');
 */
export function usePanelToggle() {
	return useDashboardStore((state) => state.togglePanel);
}

/**
 * Hook to get toast actions
 *
 * Usage:
 * const { showToast, hideToast } = useToastActions();
 * showToast('Success!', 'success');
 */
export function useToastActions() {
	const showToast = useDashboardStore((state) => state.showToast);
	const hideToast = useDashboardStore((state) => state.hideToast);

	return { showToast, hideToast };
}

/**
 * Hook to get all toasts
 *
 * Usage:
 * const toasts = useToasts();
 */
export function useToasts() {
	return useDashboardStore((state) => state.toasts);
}

/**
 * Hook to get error actions
 *
 * Usage:
 * const { addError, clearError, clearAllErrors } = useErrorActions();
 */
export function useErrorActions() {
	const addError = useDashboardStore((state) => state.addError);
	const clearError = useDashboardStore((state) => state.clearError);
	const clearAllErrors = useDashboardStore((state) => state.clearAllErrors);

	return { addError, clearError, clearAllErrors };
}

/**
 * Hook to get all errors
 *
 * Usage:
 * const errors = useErrors();
 */
export function useErrors() {
	return useDashboardStore((state) => state.errors);
}

/**
 * Hook to get modal actions
 *
 * Usage:
 * const { openModal, closeModal, closeAllModals } = useModalActions();
 */
export function useModalActions() {
	const openModal = useDashboardStore((state) => state.openModal);
	const closeModal = useDashboardStore((state) => state.closeModal);
	const closeAllModals = useDashboardStore((state) => state.closeAllModals);

	return { openModal, closeModal, closeAllModals };
}

/**
 * Hook to get active prompts
 *
 * Usage:
 * const prompts = useActivePrompts();
 */
export function useActivePrompts() {
	return useDashboardStore((state) => state.activePrompts);
}

/**
 * Hook to get prompt actions
 *
 * Usage:
 * const { addPrompt, removePrompt } = usePromptActions();
 */
export function usePromptActions() {
	const addPrompt = useDashboardStore((state) => state.addPrompt);
	const removePrompt = useDashboardStore((state) => state.removePrompt);
	const respondToPrompt = useDashboardStore((state) => state.respondToPrompt);

	return { addPrompt, removePrompt, respondToPrompt };
}
