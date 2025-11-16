/**
 * Testbed Component Registration
 * Registers simple wrapped components for testbed
 * This file auto-executes on import
 */

import { registerComponent } from "@/lib/fluid-ui/registry";

// Import wrapped components (simple presentational versions)
import * as Wrapped from "./wrapped-components";

// Import only metadata from real components
import { EventDetailsMetadata } from "@/components/dashboard/EventDetails";
import { UpcomingEventsMetadata } from "@/components/dashboard/UpcomingEvents";
import { TasksListMetadata } from "@/components/dashboard/TasksList";
import { TasksKanbanMetadata } from "@/components/dashboard/TasksKanban";
import { ExpensesSummaryMetadata } from "@/components/dashboard/ExpensesSummary";
import { ExpensesListMetadata } from "@/components/dashboard/ExpensesList";
import { UpcomingPaymentsMetadata } from "@/components/dashboard/UpcomingPayments";
import { TimelineMetadata } from "@/components/dashboard/Timeline";
import { MilestoneTrackerMetadata } from "@/components/dashboard/MilestoneTracker";
import { RoomActivityMetadata } from "@/components/dashboard/RoomActivity";
import { PollsListMetadata } from "@/components/dashboard/PollsList";
import { PollResultsMetadata } from "@/components/dashboard/PollResults";
import { CalendarViewMetadata } from "@/components/dashboard/CalendarView";

// Event Planning Components
import { TasksByPhaseMetadata } from "@/components/dashboard/TasksByPhase";
import { PhaseProgressMetadata } from "@/components/dashboard/PhaseProgress";
import { MilestoneTimelineMetadata } from "@/components/dashboard/MilestoneTimeline";
import { TasksByVendorMetadata } from "@/components/dashboard/TasksByVendor";
import { VendorTaskBoardMetadata } from "@/components/dashboard/VendorTaskBoard";
import { TaskGanttChartMetadata } from "@/components/dashboard/TaskGanttChart";
import { DeadlineCalendarMetadata } from "@/components/dashboard/DeadlineCalendar";
import { DayOfChecklistMetadata } from "@/components/dashboard/DayOfChecklist";
import { LiveEventStatusMetadata } from "@/components/dashboard/LiveEventStatus";
import { RunOfShowTimelineMetadata } from "@/components/dashboard/RunOfShowTimeline";

// Register wrapped components with real metadata
registerComponent("EventDetails", Wrapped.EventDetails, EventDetailsMetadata);
registerComponent("UpcomingEvents", Wrapped.UpcomingEvents, UpcomingEventsMetadata);
registerComponent("TasksList", Wrapped.TasksList, TasksListMetadata);
registerComponent("TasksKanban", Wrapped.TasksKanban, TasksKanbanMetadata);
registerComponent("ExpensesSummary", Wrapped.ExpensesSummary, ExpensesSummaryMetadata);
registerComponent("ExpensesList", Wrapped.ExpensesList, ExpensesListMetadata);
registerComponent("UpcomingPayments", Wrapped.UpcomingPayments, UpcomingPaymentsMetadata);
registerComponent("Timeline", Wrapped.Timeline, TimelineMetadata);
registerComponent("MilestoneTracker", Wrapped.MilestoneTracker, MilestoneTrackerMetadata);
registerComponent("RoomActivity", Wrapped.RoomActivity, RoomActivityMetadata);
registerComponent("PollsList", Wrapped.PollsList, PollsListMetadata);
registerComponent("PollResults", Wrapped.PollResults, PollResultsMetadata);
registerComponent("CalendarView", Wrapped.CalendarView, CalendarViewMetadata);

// Register Event Planning components
registerComponent("TasksByPhase", Wrapped.TasksByPhase, TasksByPhaseMetadata);
registerComponent("PhaseProgress", Wrapped.PhaseProgress, PhaseProgressMetadata);
registerComponent("MilestoneTimeline", Wrapped.MilestoneTimeline, MilestoneTimelineMetadata);
registerComponent("TasksByVendor", Wrapped.TasksByVendor, TasksByVendorMetadata);
registerComponent("VendorTaskBoard", Wrapped.VendorTaskBoard, VendorTaskBoardMetadata);
registerComponent("TaskGanttChart", Wrapped.TaskGanttChart, TaskGanttChartMetadata);
registerComponent("DeadlineCalendar", Wrapped.DeadlineCalendar, DeadlineCalendarMetadata);
registerComponent("DayOfChecklist", Wrapped.DayOfChecklist, DayOfChecklistMetadata);
registerComponent("LiveEventStatus", Wrapped.LiveEventStatus, LiveEventStatusMetadata);
registerComponent("RunOfShowTimeline", Wrapped.RunOfShowTimeline, RunOfShowTimelineMetadata);

console.log("[Testbed] Registered 23 wrapped components (13 original + 10 event planning)");
