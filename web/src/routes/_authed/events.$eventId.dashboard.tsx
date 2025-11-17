import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { ComponentFilterInput } from "@/components/dashboard/ComponentFilterInput";
import { LayoutController } from "@/components/fluid-ui/layout-controller";
import { COMPONENT_METADATA } from "@/lib/fluid-ui/componentMetadata";
import { DashboardStoreProvider } from "@/lib/fluid-ui/DashboardStoreContext";
import type { DashboardConfig } from "@/lib/fluid-ui/types";

/**
 * Event Dashboard Route - Comprehensive Overview
 *
 * Provides a complete event management dashboard using the Fluid UI system:
 * - Key Metrics: KPIDashboard & ProgressSummary
 * - Timeline & Tasks: MilestoneTimeline & TasksByPhase
 * - Budget: ExpensesSummary & ExpensesList
 * - Task Management: TasksKanban (full width)
 * - Vendor Management: VendorTaskBoard (full width)
 * - Collaboration: RoomActivity & PollsList
 * - Calendar: CalendarView (full width)
 *
 * Features:
 * - Real-time updates via Convex subscriptions
 * - Master-detail component interactions via Zustand
 * - Responsive grid layouts with intelligent sizing
 * - 7 dashboard sections for complete event visibility
 */
export const Route = createFileRoute("/_authed/events/$eventId/dashboard")({
	ssr: false, // Disable SSR - uses parent loader with auth
	component: EventDashboardPage,
});

function EventDashboardPage() {
	const { eventId } = Route.useParams();
	const typedEventId = eventId as Id<"events">;

	// Component visibility state - managed by ComponentFilterInput
	const [visibleComponents, setVisibleComponents] = useState<Set<string>>(
		new Set(Object.keys(COMPONENT_METADATA)),
	);

	// Callback to update visible components from search input
	const handleVisibilityChange = useCallback((components: Set<string>) => {
		setVisibleComponents(components);
	}, []);

	// Comprehensive dashboard configuration using LayoutController
	// 7 sections providing complete event visibility:
	// Row 1: Key metrics overview
	// Row 2: Timeline and phase-based tasks
	// Row 3: Budget tracking and expense details
	// Row 4: Kanban task board (full width)
	// Row 5: Vendor task management (full width)
	// Row 6: Collaboration and activity
	// Row 7: Calendar view (full width)
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
			// Row 2: Timeline & Phase Tasks (1:1 split)
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
			// Row 3: Budget Overview (1:1 split)
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
						props: { eventId: typedEventId, limit: 10, sortBy: "date" },
					},
				],
			},
			// Row 4: Task Kanban (Full width)
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
						props: { eventId: typedEventId, limit: 5 },
					},
				],
			},
			// Row 7: Calendar View (Full width)
			{
				type: "row",
				layout: "auto",
				components: [
					{
						type: "CalendarView",
						props: { eventId: typedEventId, view: "month" },
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
		<div className="space-y-6">
			{/* Page Header */}
			<div className="mb-6">
				<h1 className="text-3xl font-bold tracking-tight">Event Dashboard</h1>
				<p className="text-muted-foreground mt-1">
					Comprehensive overview of your event metrics, tasks, budget, timeline,
					vendors, and collaboration
				</p>
			</div>

			{/* Component Search/Filter */}
			<ComponentFilterInput onVisibilityChange={handleVisibilityChange} />

			{/* Comprehensive Dashboard Grid with Zustand Context */}
			<DashboardStoreProvider>
				<LayoutController
					config={filteredDashboardConfig}
					eventId={typedEventId}
				/>
			</DashboardStoreProvider>
		</div>
	);
}
