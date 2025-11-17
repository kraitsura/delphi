/**
 * Dashboard Components Registry
 * Phase 2: Component Library
 *
 * This file exports all dashboard components and provides a registration function
 * to add them to the Fluid UI registry.
 */

// Calendar Component
import { CalendarView, CalendarViewMetadata } from "./CalendarView";
// Filter Component
import { ComponentFilterInput } from "./ComponentFilterInput";
// Event Components
import { EventDetails, EventDetailsMetadata } from "./EventDetails";
import { ExpensesList, ExpensesListMetadata } from "./ExpensesList";
// Budget Components
import { ExpensesSummary, ExpensesSummaryMetadata } from "./ExpensesSummary";
import { GuestList, GuestListMetadata } from "./GuestList";
// Summary Components
import { KPIDashboard, KPIDashboardMetadata } from "./KPIDashboard";
import { MilestoneTracker, MilestoneTrackerMetadata } from "./MilestoneTracker";
import { PollResults, PollResultsMetadata } from "./PollResults";
import { PollsList, PollsListMetadata } from "./PollsList";
import { ProgressSummary, ProgressSummaryMetadata } from "./ProgressSummary";
// Collaboration Components
import { RoomActivity, RoomActivityMetadata } from "./RoomActivity";
import { RSVPStatus, RSVPStatusMetadata } from "./RSVPStatus";
import { TaskCreator, TaskCreatorMetadata } from "./TaskCreator";
import { TaskDetails, TaskDetailsMetadata } from "./TaskDetails";
import { TaskEditor, TaskEditorMetadata } from "./TaskEditor";
import { TaskGroupDetails, TaskGroupDetailsMetadata } from "./TaskGroupDetails";
import { TasksKanban, TasksKanbanMetadata } from "./TasksKanban";
// Task Components
import { TasksList, TasksListMetadata } from "./TasksList";
// Timeline Components
import { Timeline, TimelineMetadata } from "./Timeline";
import { UpcomingEvents, UpcomingEventsMetadata } from "./UpcomingEvents";
import { UpcomingPayments, UpcomingPaymentsMetadata } from "./UpcomingPayments";
import { VendorDetails, VendorDetailsMetadata } from "./VendorDetails";
// People Components
import { VendorsList, VendorsListMetadata } from "./VendorsList";

// Re-export all components and metadata
export { CalendarView, CalendarViewMetadata };
export { ComponentFilterInput };
export { EventDetails, EventDetailsMetadata };
export { ExpensesList, ExpensesListMetadata };
export { ExpensesSummary, ExpensesSummaryMetadata };
export { GuestList, GuestListMetadata };
export { MilestoneTracker, MilestoneTrackerMetadata };
export { PollResults, PollResultsMetadata };
export { PollsList, PollsListMetadata };
export { RoomActivity, RoomActivityMetadata };
export { RSVPStatus, RSVPStatusMetadata };
export { TasksKanban, TasksKanbanMetadata };
export { TasksList, TasksListMetadata };
export { TaskCreator, TaskCreatorMetadata };
export { TaskEditor, TaskEditorMetadata };
export { TaskDetails, TaskDetailsMetadata };
export { TaskGroupDetails, TaskGroupDetailsMetadata };
export { Timeline, TimelineMetadata };
export { UpcomingEvents, UpcomingEventsMetadata };
export { UpcomingPayments, UpcomingPaymentsMetadata };
export { VendorDetails, VendorDetailsMetadata };
export { VendorsList, VendorsListMetadata };
export { KPIDashboard, KPIDashboardMetadata };
export { ProgressSummary, ProgressSummaryMetadata };

/**
 * Register all dashboard components with the Fluid UI registry
 * Call this function on app initialization
 */
export function registerDashboardComponents() {
	// Note: Registration implementation depends on Phase 1 registry system
	// This is a placeholder that will be implemented when the registry is ready

	console.log("Dashboard components registered:", {
		event: ["EventDetails", "UpcomingEvents"],
		task: [
			"TasksList",
			"TasksKanban",
			"TaskCreator",
			"TaskEditor",
			"TaskDetails",
			"TaskGroupDetails",
		],
		budget: ["ExpensesSummary", "ExpensesList", "UpcomingPayments"],
		timeline: ["Timeline", "MilestoneTracker"],
		people: ["VendorsList", "VendorDetails", "GuestList", "RSVPStatus"],
		collaboration: ["RoomActivity", "PollsList", "PollResults"],
		calendar: ["CalendarView"],
		summary: ["KPIDashboard", "ProgressSummary"],
	});
}

/**
 * Get all component metadata for registry
 */
export function getDashboardComponentsMetadata() {
	return {
		EventDetails: EventDetailsMetadata,
		UpcomingEvents: UpcomingEventsMetadata,
		TasksList: TasksListMetadata,
		TasksKanban: TasksKanbanMetadata,
		TaskCreator: TaskCreatorMetadata,
		TaskEditor: TaskEditorMetadata,
		TaskDetails: TaskDetailsMetadata,
		TaskGroupDetails: TaskGroupDetailsMetadata,
		ExpensesSummary: ExpensesSummaryMetadata,
		ExpensesList: ExpensesListMetadata,
		UpcomingPayments: UpcomingPaymentsMetadata,
		Timeline: TimelineMetadata,
		MilestoneTracker: MilestoneTrackerMetadata,
		RoomActivity: RoomActivityMetadata,
		PollsList: PollsListMetadata,
		PollResults: PollResultsMetadata,
		VendorsList: VendorsListMetadata,
		VendorDetails: VendorDetailsMetadata,
		GuestList: GuestListMetadata,
		RSVPStatus: RSVPStatusMetadata,
		CalendarView: CalendarViewMetadata,
		KPIDashboard: KPIDashboardMetadata,
		ProgressSummary: ProgressSummaryMetadata,
	};
}

export type { CalendarViewProps } from "./CalendarView";
export type { ComponentFilterInputProps } from "./ComponentFilterInput";
// Re-export types
export type { EventDetailsProps } from "./EventDetails";
export type { ExpensesListProps } from "./ExpensesList";
export type { ExpensesSummaryProps } from "./ExpensesSummary";
export type { GuestListProps } from "./GuestList";
export type { KPIDashboardProps } from "./KPIDashboard";
export type { MilestoneTrackerProps } from "./MilestoneTracker";
export type { PollResultsProps } from "./PollResults";
export type { PollsListProps } from "./PollsList";
export type { ProgressSummaryProps } from "./ProgressSummary";
export type { RoomActivityProps } from "./RoomActivity";
export type { RSVPStatusProps } from "./RSVPStatus";
export type { TaskCreatorProps } from "./TaskCreator";
export type { TaskDetailsProps } from "./TaskDetails";
export type { TaskEditorProps } from "./TaskEditor";
export type { TaskGroupDetailsProps } from "./TaskGroupDetails";
export type { TasksKanbanProps } from "./TasksKanban";
export type { TasksListProps } from "./TasksList";
export type { TimelineProps } from "./Timeline";
export type { UpcomingEventsProps } from "./UpcomingEvents";
export type { UpcomingPaymentsProps } from "./UpcomingPayments";
export type { VendorDetailsProps } from "./VendorDetails";
export type { VendorsListProps } from "./VendorsList";
