/**
 * Fluid UI Zustand Store
 *
 * Centralized state management for dashboard components.
 * Replaces EventBus with reactive state subscriptions.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DashboardConfig, ComponentInstance } from './types';
import type { Id } from '../../convex/_generated/dataModel';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Selection state - shared across components
 * Master components write, detail components read
 */
export interface SelectionState {
	taskId: string | null;
	vendorId: string | null;
	category: string | null;
	phase: string | null;
	milestoneId: string | null;
	expenseId: string | null;
	dateRange: [number, number] | null;
	assigneeId: string | null;
	pollId: string | null;
	eventId: string | null;
	timeSlot: number | null;
	teamMemberId: string | null;
	status: string | null;
	priority: string | null;
}

/**
 * Active AI prompt - interactive components asking questions
 */
export interface ActivePrompt {
	id: string;
	type: 'poll' | 'confirmation' | 'permission' | 'quickActions' | 'input' | 'multiChoice';
	component: string; // Component type to render
	props: Record<string, any>;
	createdAt: number;
	expiresAt?: number;
}

/**
 * Toast notification
 */
export interface Toast {
	id: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Error entry
 */
export interface ErrorEntry {
	id: string;
	message: string;
	timestamp: number;
}

/**
 * Modal state
 */
export interface Modal {
	component: string;
	props: Record<string, any>;
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

export interface DashboardStore {
	// ===== Dashboard Configuration =====
	config: DashboardConfig | null;
	setConfig: (config: DashboardConfig) => void;
	updateComponentProps: (componentId: string, props: Partial<any>) => void;
	removeComponent: (componentId: string) => void;
	addComponent: (component: ComponentInstance, rowIndex: number) => void;

	// ===== Selections (Cross-Component State) =====
	selections: SelectionState;
	select: <K extends keyof SelectionState>(
		key: K,
		value: SelectionState[K]
	) => void;
	clearSelection: (key: keyof SelectionState) => void;
	clearAllSelections: () => void;

	// ===== Visual States =====
	highlightedComponents: Set<string>;
	highlightComponent: (componentId: string, duration?: number) => void;
	clearHighlights: () => void;

	animatingComponents: Map<string, 'pulse' | 'shake' | 'glow'>;
	animateComponent: (
		componentId: string,
		type: 'pulse' | 'shake' | 'glow'
	) => void;
	stopAnimation: (componentId: string) => void;

	expandedPanels: Set<string>;
	togglePanel: (panelId: string) => void;
	expandPanel: (panelId: string) => void;
	collapsePanel: (panelId: string) => void;

	// ===== AI Interactions =====
	activePrompts: Map<string, ActivePrompt>;
	addPrompt: (prompt: ActivePrompt) => void;
	removePrompt: (promptId: string) => void;
	respondToPrompt: (promptId: string, response: any) => void;

	// ===== Transient UI State =====
	isLoading: boolean;
	setLoading: (loading: boolean) => void;

	errors: ErrorEntry[];
	addError: (message: string) => void;
	clearError: (id: string) => void;
	clearAllErrors: () => void;

	toasts: Toast[];
	showToast: (
		message: string,
		type?: 'info' | 'success' | 'warning' | 'error'
	) => void;
	hideToast: (id: string) => void;

	modals: Map<string, Modal>;
	openModal: (id: string, component: string, props: Record<string, any>) => void;
	closeModal: (id: string) => void;
	closeAllModals: () => void;

	// ===== Utility =====
	reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialSelections: SelectionState = {
	taskId: null,
	vendorId: null,
	category: null,
	phase: null,
	milestoneId: null,
	expenseId: null,
	dateRange: null,
	assigneeId: null,
	pollId: null,
	eventId: null,
	timeSlot: null,
	teamMemberId: null,
	status: null,
	priority: null,
};

// ============================================================================
// STORE FACTORY
// ============================================================================

/**
 * Creates a new dashboard store instance
 * Used by DashboardStoreProvider to create scoped stores
 */
export const createDashboardStore = () => {
	return create<DashboardStore>()(
		devtools(
			(set, get) => ({
				// ===== Dashboard Configuration =====
				config: null,

				setConfig: (config) => {
					set({ config }, false, 'setConfig');
				},

				updateComponentProps: (componentId, newProps) => {
					const config = get().config;
					if (!config) return;

					const updatedConfig = { ...config };
					updatedConfig.sections = config.sections.map((section) => {
						if (section.type === 'row') {
							return {
								...section,
								components: section.components.map((comp) =>
									comp.id === componentId
										? { ...comp, props: { ...comp.props, ...newProps } }
										: comp
								),
							};
						}
						return section;
					});

					set({ config: updatedConfig }, false, 'updateComponentProps');
				},

				removeComponent: (componentId) => {
					const config = get().config;
					if (!config) return;

					const updatedConfig = { ...config };
					updatedConfig.sections = config.sections
						.map((section) => {
							if (section.type === 'row') {
								return {
									...section,
									components: section.components.filter(
										(comp) => comp.id !== componentId
									),
								};
							}
							return section;
						})
						.filter(
							(section) =>
								section.type !== 'row' || section.components.length > 0
						);

					set({ config: updatedConfig }, false, 'removeComponent');
				},

				addComponent: (component, rowIndex) => {
					const config = get().config;
					if (!config) return;

					const updatedConfig = { ...config };
					if (
						rowIndex >= 0 &&
						rowIndex < updatedConfig.sections.length &&
						updatedConfig.sections[rowIndex].type === 'row'
					) {
						const section = updatedConfig.sections[rowIndex] as any;
						section.components.push(component);
					}

					set({ config: updatedConfig }, false, 'addComponent');
				},

				// ===== Selections =====
				selections: { ...initialSelections },

				select: (key, value) => {
					set(
						(state) => ({
							selections: {
								...state.selections,
								[key]: value,
							},
						}),
						false,
						`select:${key}`
					);
				},

				clearSelection: (key) => {
					set(
						(state) => ({
							selections: {
								...state.selections,
								[key]: null,
							},
						}),
						false,
						`clearSelection:${key}`
					);
				},

				clearAllSelections: () => {
					set(
						{ selections: { ...initialSelections } },
						false,
						'clearAllSelections'
					);
				},

				// ===== Visual States =====
				highlightedComponents: new Set(),

				highlightComponent: (componentId, duration = 3000) => {
					set(
						(state) => ({
							highlightedComponents: new Set(state.highlightedComponents).add(
								componentId
							),
						}),
						false,
						'highlightComponent'
					);

					// Auto-clear after duration
					if (duration > 0) {
						setTimeout(() => {
							set(
								(state) => {
									const newSet = new Set(state.highlightedComponents);
									newSet.delete(componentId);
									return { highlightedComponents: newSet };
								},
								false,
								'clearHighlight'
							);
						}, duration);
					}
				},

				clearHighlights: () => {
					set({ highlightedComponents: new Set() }, false, 'clearHighlights');
				},

				animatingComponents: new Map(),

				animateComponent: (componentId, type) => {
					set(
						(state) => {
							const newMap = new Map(state.animatingComponents);
							newMap.set(componentId, type);
							return { animatingComponents: newMap };
						},
						false,
						'animateComponent'
					);
				},

				stopAnimation: (componentId) => {
					set(
						(state) => {
							const newMap = new Map(state.animatingComponents);
							newMap.delete(componentId);
							return { animatingComponents: newMap };
						},
						false,
						'stopAnimation'
					);
				},

				expandedPanels: new Set(),

				togglePanel: (panelId) => {
					set(
						(state) => {
							const newSet = new Set(state.expandedPanels);
							if (newSet.has(panelId)) {
								newSet.delete(panelId);
							} else {
								newSet.add(panelId);
							}
							return { expandedPanels: newSet };
						},
						false,
						'togglePanel'
					);
				},

				expandPanel: (panelId) => {
					set(
						(state) => ({
							expandedPanels: new Set(state.expandedPanels).add(panelId),
						}),
						false,
						'expandPanel'
					);
				},

				collapsePanel: (panelId) => {
					set(
						(state) => {
							const newSet = new Set(state.expandedPanels);
							newSet.delete(panelId);
							return { expandedPanels: newSet };
						},
						false,
						'collapsePanel'
					);
				},

				// ===== AI Interactions =====
				activePrompts: new Map(),

				addPrompt: (prompt) => {
					set(
						(state) => {
							const newMap = new Map(state.activePrompts);
							newMap.set(prompt.id, prompt);
							return { activePrompts: newMap };
						},
						false,
						'addPrompt'
					);
				},

				removePrompt: (promptId) => {
					set(
						(state) => {
							const newMap = new Map(state.activePrompts);
							newMap.delete(promptId);
							return { activePrompts: newMap };
						},
						false,
						'removePrompt'
					);
				},

				respondToPrompt: (promptId, response) => {
					// This could be extended to store responses
					// For now, just remove the prompt after response
					get().removePrompt(promptId);
				},

				// ===== Transient UI State =====
				isLoading: false,

				setLoading: (loading) => {
					set({ isLoading: loading }, false, 'setLoading');
				},

				errors: [],

				addError: (message) => {
					const error: ErrorEntry = {
						id: `error-${Date.now()}-${Math.random()}`,
						message,
						timestamp: Date.now(),
					};
					set(
						(state) => ({
							errors: [...state.errors, error],
						}),
						false,
						'addError'
					);
				},

				clearError: (id) => {
					set(
						(state) => ({
							errors: state.errors.filter((e) => e.id !== id),
						}),
						false,
						'clearError'
					);
				},

				clearAllErrors: () => {
					set({ errors: [] }, false, 'clearAllErrors');
				},

				toasts: [],

				showToast: (message, type = 'info') => {
					const toast: Toast = {
						id: `toast-${Date.now()}-${Math.random()}`,
						message,
						type,
					};
					set(
						(state) => ({
							toasts: [...state.toasts, toast],
						}),
						false,
						'showToast'
					);

					// Auto-hide after 5 seconds
					setTimeout(() => {
						get().hideToast(toast.id);
					}, 5000);
				},

				hideToast: (id) => {
					set(
						(state) => ({
							toasts: state.toasts.filter((t) => t.id !== id),
						}),
						false,
						'hideToast'
					);
				},

				modals: new Map(),

				openModal: (id, component, props) => {
					set(
						(state) => {
							const newMap = new Map(state.modals);
							newMap.set(id, { component, props });
							return { modals: newMap };
						},
						false,
						'openModal'
					);
				},

				closeModal: (id) => {
					set(
						(state) => {
							const newMap = new Map(state.modals);
							newMap.delete(id);
							return { modals: newMap };
						},
						false,
						'closeModal'
					);
				},

				closeAllModals: () => {
					set({ modals: new Map() }, false, 'closeAllModals');
				},

				// ===== Utility =====
				reset: () => {
					set(
						{
							config: null,
							selections: { ...initialSelections },
							highlightedComponents: new Set(),
							animatingComponents: new Map(),
							expandedPanels: new Set(),
							activePrompts: new Map(),
							isLoading: false,
							errors: [],
							toasts: [],
							modals: new Map(),
						},
						false,
						'reset'
					);
				},
			}),
			{
				name: 'DashboardStore',
				enabled: process.env.NODE_ENV === 'development',
			}
		)
	);
};

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook to get the config from store
 * Usage: const config = useConfig(store);
 */
export const useConfig = (store: ReturnType<typeof createDashboardStore>) =>
	store((state) => state.config);

/**
 * Hook to get all selections from store
 * Usage: const selections = useSelections(store);
 */
export const useSelections = (store: ReturnType<typeof createDashboardStore>) =>
	store((state) => state.selections);

/**
 * Hook to get highlighted components
 * Usage: const highlights = useHighlights(store);
 */
export const useHighlights = (store: ReturnType<typeof createDashboardStore>) =>
	store((state) => state.highlightedComponents);

/**
 * Hook to get active prompts
 * Usage: const prompts = useActivePrompts(store);
 */
export const useActivePrompts = (
	store: ReturnType<typeof createDashboardStore>
) => store((state) => state.activePrompts);

/**
 * Hook to check if a component is highlighted
 * Usage: const isHighlighted = useIsHighlighted(store, 'component-id');
 */
export const useIsHighlighted = (
	store: ReturnType<typeof createDashboardStore>,
	componentId: string
) => store((state) => state.highlightedComponents.has(componentId));
