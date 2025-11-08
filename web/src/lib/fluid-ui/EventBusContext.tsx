/**
 * React Context for Event Bus
 *
 * Provides event bus instance to all components in a dashboard.
 * Creates a scoped event bus per dashboard instance.
 */

import type React from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import { createEventBus, type EventBus } from "./event-bus";

/**
 * Event Bus Context
 */
const EventBusContext = createContext<EventBus | null>(null);

/**
 * Provider that creates event bus for dashboard
 *
 * Usage:
 * ```tsx
 * <EventBusProvider>
 *   <Dashboard />
 * </EventBusProvider>
 * ```
 */
export function EventBusProvider({ children }: { children: React.ReactNode }) {
	const eventBusRef = useRef<EventBus | undefined>(undefined);

	// Create event bus once
	if (!eventBusRef.current) {
		eventBusRef.current = createEventBus();
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			eventBusRef.current?.clear();
		};
	}, []);

	return (
		<EventBusContext.Provider value={eventBusRef.current}>
			{children}
		</EventBusContext.Provider>
	);
}

/**
 * Hook to access event bus
 *
 * @throws Error if used outside EventBusProvider
 * @returns EventBus instance
 *
 * Usage:
 * ```tsx
 * const eventBus = useEventBus();
 * eventBus.emit({ type: "vendorSelected", payload: { vendorId: "v1" } });
 * ```
 */
export function useEventBus(): EventBus {
	const eventBus = useContext(EventBusContext);
	if (!eventBus) {
		throw new Error("useEventBus must be used within EventBusProvider");
	}
	return eventBus;
}
