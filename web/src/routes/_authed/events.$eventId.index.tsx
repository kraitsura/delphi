import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { DashboardSearchBar } from "@/components/dashboard/DashboardSearchBar";
import { LayoutController } from "@/components/fluid-ui/layout-controller";
import { getMatchingComponents } from "@/lib/fluid-ui/componentMetadata";
import { DashboardStoreProvider } from "@/lib/fluid-ui/DashboardStoreContext";
import { ModalRenderer } from "@/lib/fluid-ui/ModalRenderer";
import type { DashboardConfig } from "@/lib/fluid-ui/types";

/**
 * Event Dashboard - Comprehensive Overview
 *
 * Provides a complete event management dashboard using the Fluid UI system:
 * - Key Metrics: KPIDashboard & ProgressSummary
 * - Timeline & Tasks: MilestoneTimeline & TasksByPhase
 * - Budget: ExpensesSummary & ExpensesList
 * - Task Management: TasksKanban (full width)
 * - Vendor Management: VendorTaskBoard (full width)
 * - Collaboration: RoomActivity & PollsList
 */
export const Route = createFileRoute("/_authed/events/$eventId/")({
	ssr: false, // Disable SSR - uses parent loader with auth
	component: EventDashboardPage,
});

function EventDashboardPage() {
	const { eventId } = Route.useParams();
	const typedEventId = eventId as Id<"events">;

	// Component search/filter state
	const [searchQuery, setSearchQuery] = useState("");

	// Get visible components based on search query
	const visibleComponents = useMemo(() => {
		return getMatchingComponents(searchQuery);
	}, [searchQuery]);

	// Clear search
	const handleClear = useCallback(() => {
		setSearchQuery("");
	}, []);

	// Comprehensive dashboard configuration using LayoutController
	// 6 sections providing complete event visibility:
	// Row 1: Key metrics overview
	// Row 2: Kanban task board (full width)
	// Row 3: Timeline and phase-based tasks
	// Row 4: Budget tracking and expense details
	// Row 5: Vendor task management (full width)
	// Row 6: Collaboration and activity
	const baseDashboardConfig: DashboardConfig = {
		sections: [
			// Row 1: Key Metrics (1:1 split)
			{
				type: "row",
				layout: "1:1",
				components: [
					{
						type: "KPIDashboard",
						props: { eventId: typedEventId },
					},
					{
						type: "ProgressSummary",
						props: { eventId: typedEventId, showBreakdown: true },
					},
				],
			},
			// Row 2: Task Kanban (Full width)
			{
				type: "row",
				layout: "auto",
				components: [
					{
						type: "TasksKanban",
						props: { eventId: typedEventId, columnCount: 4, showCounts: true },
					},
				],
			},
			// Row 3: Timeline & Phase Tasks (1:1 split)
			{
				type: "row",
				layout: "1:1",
				components: [
					{
						type: "MilestoneTimeline",
						props: { eventId: typedEventId, view: "timeline", showDates: true },
					},
					{
						type: "TasksByPhase",
						props: { eventId: typedEventId, showProgress: true },
					},
				],
			},
			// Row 4: Budget Overview (1:1 split)
			{
				type: "row",
				layout: "1:1",
				components: [
					{
						type: "ExpensesSummary",
						props: { eventId: typedEventId, showChart: true },
					},
					{
						type: "ExpensesList",
						props: { eventId: typedEventId },
					},
				],
			},
			// Row 5: Vendor Management (Full width)
			{
				type: "row",
				layout: "auto",
				components: [
					{
						type: "VendorTaskBoard",
						props: { eventId: typedEventId },
					},
				],
			},
			// Row 6: Activity & Collaboration (1:1 split)
			{
				type: "row",
				layout: "1:1",
				components: [
					{
						type: "RoomActivity",
						props: { eventId: typedEventId, limit: 10, showRoomName: true },
					},
					{
						type: "PollsList",
						props: { eventId: typedEventId },
					},
				],
			},
		],
	};

	// Filter dashboard config based on visible components
	const filteredDashboardConfig: DashboardConfig = useMemo(() => {
		// Filter out rows that have no visible components
		const filteredSections = baseDashboardConfig.sections
			.map((section) => {
				if (section.type === "row") {
					// Filter components in this row
					const visibleRowComponents = section.components.filter((comp) =>
						visibleComponents.has(comp.type),
					);

					// Return the row only if it has visible components
					if (visibleRowComponents.length > 0) {
						return {
							...section,
							components: visibleRowComponents,
						};
					}
					return null;
				}
				return section;
			})
			.filter((section) => section !== null);

		return {
			sections: filteredSections,
		};
	}, [baseDashboardConfig, visibleComponents]);

	return (
		<div className="relative flex flex-col min-h-screen">
			{/* Dashboard Content */}
			<div className="flex-1 mb-[60px]">
				<DashboardStoreProvider>
					<LayoutController
						config={filteredDashboardConfig}
						eventId={typedEventId}
						validationOptions={{ disableRowLimit: true }}
					/>
					<ModalRenderer />
				</DashboardStoreProvider>
			</div>

			{/* Sticky Search Bar - Bottom (filters dashboard components) */}
			<DashboardSearchBar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				visibleComponents={visibleComponents}
				onClear={handleClear}
			/>
		</div>
	);
}
