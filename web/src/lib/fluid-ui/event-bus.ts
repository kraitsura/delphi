/**
 * Event Bus for Component Communication
 *
 * Provides pub/sub pattern for master-detail component relationships.
 * Scoped to a single dashboard instance to prevent cross-dashboard leaks.
 */

import type { ComponentEvent } from "./types";

/**
 * Event callback function type
 */
type EventCallback<T = any> = (event: ComponentEvent) => void;

/**
 * Subscription object
 */
interface Subscription {
	eventType: string;
	callback: EventCallback;
	componentId?: string;
}

/**
 * Event Bus for component communication
 * Scoped to a single dashboard instance
 */
export class EventBus {
	private subscriptions: Map<string, Set<Subscription>> = new Map();
	private eventHistory: ComponentEvent[] = [];
	private maxHistorySize = 100;

	/**
	 * Subscribe to an event type
	 *
	 * @param eventType - The event type to listen for
	 * @param callback - Function to call when event is emitted
	 * @param componentId - Optional ID of the component subscribing
	 * @returns Unsubscribe function
	 */
	subscribe(
		eventType: string,
		callback: EventCallback,
		componentId?: string,
	): () => void {
		if (!this.subscriptions.has(eventType)) {
			this.subscriptions.set(eventType, new Set());
		}

		const subscription: Subscription = { eventType, callback, componentId };
		this.subscriptions.get(eventType)!.add(subscription);

		// Return unsubscribe function
		return () => {
			const subs = this.subscriptions.get(eventType);
			if (subs) {
				subs.delete(subscription);
				if (subs.size === 0) {
					this.subscriptions.delete(eventType);
				}
			}
		};
	}

	/**
	 * Emit an event to all subscribers
	 *
	 * @param event - The event to emit
	 */
	emit(event: ComponentEvent): void {
		const { type, payload } = event;

		// Add to history
		this.eventHistory.push(event);
		if (this.eventHistory.length > this.maxHistorySize) {
			this.eventHistory.shift();
		}

		// Notify subscribers
		const subs = this.subscriptions.get(type);
		if (subs) {
			subs.forEach((sub) => {
				try {
					sub.callback(event);
				} catch (error) {
					console.error(`Error in event handler for ${type}:`, error);
				}
			});
		}

		// Development logging
		if (process.env.NODE_ENV === "development") {
			console.log(`[EventBus] ${type}`, payload);
		}
	}

	/**
	 * Get event history (for debugging)
	 *
	 * @returns Array of recent events
	 */
	getHistory(): ComponentEvent[] {
		return [...this.eventHistory];
	}

	/**
	 * Clear all subscriptions (cleanup)
	 */
	clear(): void {
		this.subscriptions.clear();
		this.eventHistory = [];
	}

	/**
	 * Get active subscriptions (for debugging)
	 *
	 * @returns Map of event types to subscriber counts
	 */
	getSubscriptions(): Map<string, number> {
		const counts = new Map<string, number>();
		this.subscriptions.forEach((subs, eventType) => {
			counts.set(eventType, subs.size);
		});
		return counts;
	}
}

/**
 * Create event bus instance for a dashboard
 *
 * @returns New EventBus instance
 */
export function createEventBus(): EventBus {
	return new EventBus();
}
