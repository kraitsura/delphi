/**
 * React Hooks for Component Event Communication
 *
 * Provides hooks for master-detail component relationships.
 */

import { useCallback, useEffect, useRef } from "react";
import { useEventBus } from "../EventBusContext";
import type { ComponentEvent } from "../types";

/**
 * Hook for component event communication
 *
 * Use this hook in both master and detail components:
 * - Master components: Use the `emit` function to send events
 * - Detail components: Provide eventType and callback to listen
 *
 * @param eventType - Optional event type to listen for
 * @param callback - Optional callback when event is received
 * @param componentId - Optional component ID for debugging
 * @returns Object with emit function
 *
 * @example Master component:
 * ```tsx
 * const { emit } = useComponentEvents();
 * emit({ type: "vendorSelected", payload: { vendorId: "v1", vendorName: "Acme" } });
 * ```
 *
 * @example Detail component:
 * ```tsx
 * useComponentEvents("vendorSelected", (event) => {
 *   setFilters(prev => ({ ...prev, vendor: event.payload.vendorId }));
 * });
 * ```
 */
export function useComponentEvents(
	eventType?: string,
	callback?: (event: ComponentEvent) => void,
	componentId?: string,
) {
	const eventBus = useEventBus();
	const callbackRef = useRef(callback);

	// Update callback ref when it changes
	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	// Subscribe to event type
	useEffect(() => {
		if (!eventType || !callbackRef.current) return;

		const unsubscribe = eventBus.subscribe(
			eventType,
			(event) => {
				callbackRef.current?.(event);
			},
			componentId,
		);

		return unsubscribe;
	}, [eventBus, eventType, componentId]);

	// Emit function
	const emit = useCallback(
		(event: ComponentEvent) => {
			eventBus.emit(event);
		},
		[eventBus],
	);

	return { emit };
}

/**
 * Hook to listen to multiple event types
 *
 * Use this when a component needs to respond to multiple different events.
 *
 * @param eventTypes - Array of event types to listen for
 * @param callback - Callback that receives any of the event types
 * @param componentId - Optional component ID for debugging
 *
 * @example
 * ```tsx
 * useComponentEventListener(
 *   ["vendorSelected", "categorySelected"],
 *   (event) => {
 *     if (event.type === "vendorSelected") {
 *       setFilters(prev => ({ ...prev, vendor: event.payload.vendorId }));
 *     } else if (event.type === "categorySelected") {
 *       setFilters(prev => ({ ...prev, category: event.payload.category }));
 *     }
 *   }
 * );
 * ```
 */
export function useComponentEventListener(
	eventTypes: string[],
	callback: (event: ComponentEvent) => void,
	componentId?: string,
) {
	const eventBus = useEventBus();
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	useEffect(() => {
		const unsubscribes = eventTypes.map((eventType) =>
			eventBus.subscribe(
				eventType,
				(event) => callbackRef.current(event),
				componentId,
			),
		);

		return () => {
			unsubscribes.forEach((unsub) => unsub());
		};
	}, [eventBus, eventTypes, componentId]);
}
