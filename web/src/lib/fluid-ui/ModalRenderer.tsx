/**
 * Modal Renderer
 *
 * Renders all active modals from the Zustand store.
 * Subscribes to the modals Map and dynamically renders modal components
 * using the component registry.
 */

import { useDashboardStore } from "./DashboardStoreContext";
import { getComponent } from "./registry";

/**
 * ModalRenderer Component
 *
 * Subscribes to the modals state in the Zustand store and renders
 * all active modals. Each modal is dynamically loaded from the
 * component registry and rendered with its props.
 *
 * Usage:
 * <DashboardStoreProvider>
 *   <LayoutController />
 *   <ModalRenderer />
 * </DashboardStoreProvider>
 */
export function ModalRenderer() {
	// Subscribe to modals Map from store
	const modals = useDashboardStore((state) => state.modals);
	const closeModal = useDashboardStore((state) => state.closeModal);

	// Convert Map to array for iteration
	const modalEntries = Array.from(modals.entries());

	// If no modals, render nothing
	if (modalEntries.length === 0) {
		return null;
	}

	return (
		<>
			{modalEntries.map(([id, modal]) => {
				// Get the component from the registry
				const Component = getComponent(modal.component);

				if (!Component) {
					console.error(
						`Modal component "${modal.component}" not found in registry`,
					);
					return null;
				}

				// Render the modal with its props and onClose handler
				return (
					<Component
						key={id}
						{...modal.props}
						onClose={() => closeModal(id)}
						open={true}
					/>
				);
			})}
		</>
	);
}
