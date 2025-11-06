/**
 * Connection Detection and Management
 *
 * Automatically detects master-detail relationships between components
 * based on their metadata (canBeMaster, canBeDetail, emits, listensTo).
 */

import { getComponentMetadata } from "./registry";
import type { ComponentInstance, Connection } from "./types";

/**
 * Detect connections between components in a dashboard
 *
 * Analyzes component metadata to find master-detail relationships.
 * A connection exists when a master component emits events that
 * a detail component listens to.
 *
 * @param components - Array of component instances
 * @returns Array of detected connections
 *
 * @example
 * ```tsx
 * const connections = detectConnections(dashboard.components);
 * // Returns: [
 * //   {
 * //     masterId: "vendors-list",
 * //     detailId: "expenses-list",
 * //     masterType: "VendorsList",
 * //     detailType: "ExpensesList",
 * //     eventTypes: ["vendorSelected"]
 * //   }
 * // ]
 * ```
 */
export function detectConnections(
	components: ComponentInstance[],
): Connection[] {
	const connections: Connection[] = [];

	// Find all potential master components
	const masters = components.filter((comp) => {
		const metadata = getComponentMetadata(comp.type);
		return metadata?.connections?.canBeMaster;
	});

	// Find all potential detail components
	const details = components.filter((comp) => {
		const metadata = getComponentMetadata(comp.type);
		return metadata?.connections?.canBeDetail;
	});

	// Match masters with details
	for (const master of masters) {
		const masterMetadata = getComponentMetadata(master.type);
		if (!masterMetadata?.connections?.emits) continue;

		for (const detail of details) {
			const detailMetadata = getComponentMetadata(detail.type);
			if (!detailMetadata?.connections?.listensTo) continue;

			// Find shared event types
			const sharedEvents = masterMetadata.connections.emits.filter((event) =>
				detailMetadata.connections!.listensTo!.includes(event),
			);

			if (sharedEvents.length > 0) {
				connections.push({
					masterId: master.id || `${master.type}-${masters.indexOf(master)}`,
					detailId: detail.id || `${detail.type}-${details.indexOf(detail)}`,
					masterType: master.type,
					detailType: detail.type,
					eventTypes: sharedEvents,
				});
			}
		}
	}

	return connections;
}

/**
 * Get all connections for a specific component
 *
 * Returns connections where the component is either master or detail.
 *
 * @param componentId - ID of the component
 * @param connections - Array of all connections
 * @returns Array of connections involving this component
 */
export function getConnectionsForComponent(
	componentId: string,
	connections: Connection[],
): Connection[] {
	return connections.filter(
		(conn) => conn.masterId === componentId || conn.detailId === componentId,
	);
}

/**
 * Check if component is a master in any connection
 *
 * @param componentId - ID of the component
 * @param connections - Array of all connections
 * @returns True if component is a master
 */
export function isMasterComponent(
	componentId: string,
	connections: Connection[],
): boolean {
	return connections.some((conn) => conn.masterId === componentId);
}

/**
 * Check if component is a detail in any connection
 *
 * @param componentId - ID of the component
 * @param connections - Array of all connections
 * @returns True if component is a detail
 */
export function isDetailComponent(
	componentId: string,
	connections: Connection[],
): boolean {
	return connections.some((conn) => conn.detailId === componentId);
}

/**
 * Get all master components for a detail component
 *
 * @param detailId - ID of the detail component
 * @param connections - Array of all connections
 * @returns Array of master component IDs
 */
export function getMastersForDetail(
	detailId: string,
	connections: Connection[],
): string[] {
	return connections
		.filter((conn) => conn.detailId === detailId)
		.map((conn) => conn.masterId);
}

/**
 * Get all detail components for a master component
 *
 * @param masterId - ID of the master component
 * @param connections - Array of all connections
 * @returns Array of detail component IDs
 */
export function getDetailsForMaster(
	masterId: string,
	connections: Connection[],
): string[] {
	return connections
		.filter((conn) => conn.masterId === masterId)
		.map((conn) => conn.detailId);
}

/**
 * Get event types that connect two components
 *
 * @param masterId - ID of the master component
 * @param detailId - ID of the detail component
 * @param connections - Array of all connections
 * @returns Array of event types, or empty array if not connected
 */
export function getConnectionEventTypes(
	masterId: string,
	detailId: string,
	connections: Connection[],
): string[] {
	const connection = connections.find(
		(conn) => conn.masterId === masterId && conn.detailId === detailId,
	);
	return connection?.eventTypes || [];
}
