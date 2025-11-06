/**
 * Dashboard Components Registry
 * Phase 2: Component Library
 *
 * This file exports all dashboard components and provides a registration function
 * to add them to the Fluid UI registry.
 */

// Calendar Component
export { CalendarView, CalendarViewMetadata } from "./CalendarView";
// Event Components
export { EventDetails, EventDetailsMetadata } from "./EventDetails";
export { ExpensesList, ExpensesListMetadata } from "./ExpensesList";
// Budget Components
export { ExpensesSummary, ExpensesSummaryMetadata } from "./ExpensesSummary";
export { GuestList, GuestListMetadata } from "./GuestList";
export { MilestoneTracker, MilestoneTrackerMetadata } from "./MilestoneTracker";
export { PollResults, PollResultsMetadata } from "./PollResults";
export { PollsList, PollsListMetadata } from "./PollsList";
// Collaboration Components
export { RoomActivity, RoomActivityMetadata } from "./RoomActivity";
export { RSVPStatus, RSVPStatusMetadata } from "./RSVPStatus";
export { TasksKanban, TasksKanbanMetadata } from "./TasksKanban";
// Task Components
export { TasksList, TasksListMetadata } from "./TasksList";
// Timeline Components
export { Timeline, TimelineMetadata } from "./Timeline";
export { UpcomingEvents, UpcomingEventsMetadata } from "./UpcomingEvents";
export {
	UpcomingPayments,
	UpcomingPaymentsMetadata,
} from "./UpcomingPayments";
export { VendorDetails, VendorDetailsMetadata } from "./VendorDetails";
// People Components
export { VendorsList, VendorsListMetadata } from "./VendorsList";

/**
 * Register all dashboard components with the Fluid UI registry
 * Call this function on app initialization
 */
export function registerDashboardComponents() {
	// Note: Registration implementation depends on Phase 1 registry system
	// This is a placeholder that will be implemented when the registry is ready

	console.log("Dashboard components registered:", {
		event: ["EventDetails", "UpcomingEvents"],
		task: ["TasksList", "TasksKanban"],
		budget: ["ExpensesSummary", "ExpensesList", "UpcomingPayments"],
		timeline: ["Timeline", "MilestoneTracker"],
		people: ["VendorsList", "VendorDetails", "GuestList", "RSVPStatus"],
		collaboration: ["RoomActivity", "PollsList", "PollResults"],
		calendar: ["CalendarView"],
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
	};
}

export type { CalendarViewProps } from "./CalendarView";
// Re-export types
export type { EventDetailsProps } from "./EventDetails";
export type { ExpensesListProps } from "./ExpensesList";
export type { ExpensesSummaryProps } from "./ExpensesSummary";
export type { GuestListProps } from "./GuestList";
export type { MilestoneTrackerProps } from "./MilestoneTracker";
export type { PollResultsProps } from "./PollResults";
export type { PollsListProps } from "./PollsList";
export type { RoomActivityProps } from "./RoomActivity";
export type { RSVPStatusProps } from "./RSVPStatus";
export type { TasksKanbanProps } from "./TasksKanban";
export type { TasksListProps } from "./TasksList";
export type { TimelineProps } from "./Timeline";
export type { UpcomingEventsProps } from "./UpcomingEvents";
export type { UpcomingPaymentsProps } from "./UpcomingPayments";
export type { VendorDetailsProps } from "./VendorDetails";
export type { VendorsListProps } from "./VendorsList";
