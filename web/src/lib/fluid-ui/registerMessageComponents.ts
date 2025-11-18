/**
 * Message Components Registration
 *
 * Registers all Fluid UI card components for use in AI message responses.
 * This initialization should be called once at app startup.
 */

import { AddExpenseModal } from "@/components/dashboard/AddExpenseModal";
import { AddTaskModal } from "@/components/dashboard/AddTaskModal";
import { AddVendorModal } from "@/components/dashboard/AddVendorModal";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { DailyDeadlinesModal } from "@/components/dashboard/DailyDeadlinesModal";
import { ExpenseDetailsModal } from "@/components/dashboard/ExpenseDetailsModal";
import { ExpensesList } from "@/components/dashboard/ExpensesList";
import { ExpensesSummary } from "@/components/dashboard/ExpensesSummary";
import { KPIDashboard } from "@/components/dashboard/KPIDashboard";
import { MilestoneTimeline } from "@/components/dashboard/MilestoneTimeline";
import { PollDetailsModal } from "@/components/dashboard/PollDetailsModal";
import { PollsList } from "@/components/dashboard/PollsList";
import { ProgressSummary } from "@/components/dashboard/ProgressSummary";
import { RoomActivity } from "@/components/dashboard/RoomActivity";
import { TaskDetails } from "@/components/dashboard/TaskDetails";
import { TasksByPhase } from "@/components/dashboard/TasksByPhase";
import { TasksKanban } from "@/components/dashboard/TasksKanban";
import { VendorTaskBoard } from "@/components/dashboard/VendorTaskBoard";
import { BudgetProposalCard } from "@/components/fluid-ui/cards/BudgetProposalCard";
import { BudgetSummaryCard } from "@/components/fluid-ui/cards/BudgetSummaryCard";
import { InlinePoll } from "@/components/fluid-ui/cards/InlinePoll";
import { InventoryCard } from "@/components/fluid-ui/cards/InventoryCard";
import { TaskListCard } from "@/components/fluid-ui/cards/TaskListCard";
import { TaskProposalCard } from "@/components/fluid-ui/cards/TaskProposalCard";
import { VendorCard } from "@/components/fluid-ui/cards/VendorCard";
import { VendorProposalCard } from "@/components/fluid-ui/cards/VendorProposalCard";
import { VendorsList } from "@/components/fluid-ui/cards/VendorsList";
import { VenueProposalCard } from "@/components/fluid-ui/cards/VenueProposalCard";
import { ConfirmationPrompt } from "@/components/fluid-ui/interactive/ConfirmationPrompt";
import { QuickActions } from "@/components/fluid-ui/interactive/QuickActions";
import { registerComponent } from "./registry";

/**
 * Register all message-specific Fluid UI components
 * Call this function once at app startup (e.g., in App.tsx or main.tsx)
 */
export function registerMessageComponents() {
	// TaskProposalCard - For AI-generated task proposals
	registerComponent("TaskProposalCard", TaskProposalCard, {
		name: "Task Proposal Card",
		description:
			"Displays AI-generated task proposals with accept/edit/reject actions",
		layoutRules: {
			canShare: true, // Can be placed with other components in a row
			mustSpanFull: false, // Does not require full width
			preferredRatio: "1fr", // Equal split with other components
			minWidth: "350px", // Minimum width for proper display
			minHeight: "200px", // Minimum height
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			proposalId: {
				type: "string",
				required: true,
				description: "Unique identifier for the proposal",
			},
			proposalType: {
				type: "enum",
				required: true,
				values: ["tasks", "budget_entries", "vendor_suggestions"],
				description:
					"Type of proposal (tasks, budget entries, or vendor suggestions)",
			},
			items: {
				type: "array",
				required: true,
				description: "Array of proposed items",
			},
			expiresAt: {
				type: "number",
				required: true,
				description: "Timestamp when the proposal expires (milliseconds)",
			},
			eventId: {
				type: "string",
				required: false,
				description: "Event ID for context",
			},
			roomId: {
				type: "string",
				required: true,
				description: "Room ID where the proposal was created",
			},
			status: {
				type: "enum",
				required: false,
				values: ["pending", "accepted", "rejected", "expired"],
				default: "pending",
				description: "Current status of the proposal",
			},
		},
	});

	// BudgetProposalCard - For AI-generated expense proposals
	registerComponent("BudgetProposalCard", BudgetProposalCard, {
		name: "Budget Proposal Card",
		description:
			"Displays AI-generated expense proposals with accept/edit/reject actions",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "200px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			proposalId: {
				type: "string",
				required: true,
				description: "Unique identifier for the proposal",
			},
			proposalType: {
				type: "enum",
				required: true,
				values: ["tasks", "budget_entries", "vendor_suggestions"],
				description:
					"Type of proposal (tasks, budget entries, or vendor suggestions)",
			},
			items: {
				type: "array",
				required: true,
				description: "Array of proposed expense items",
			},
			expiresAt: {
				type: "number",
				required: true,
				description: "Timestamp when the proposal expires (milliseconds)",
			},
			eventId: {
				type: "string",
				required: false,
				description: "Event ID for context",
			},
			roomId: {
				type: "string",
				required: true,
				description: "Room ID where the proposal was created",
			},
			status: {
				type: "enum",
				required: false,
				values: ["pending", "accepted", "rejected", "expired"],
				default: "pending",
				description: "Current status of the proposal",
			},
		},
	});

	// VendorProposalCard - For AI-suggested vendors
	registerComponent("VendorProposalCard", VendorProposalCard, {
		name: "Vendor Proposal Card",
		description: "Displays AI-suggested vendors with save/edit/dismiss actions",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "220px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			proposalId: {
				type: "string",
				required: true,
				description: "Unique identifier for the proposal",
			},
			proposalType: {
				type: "enum",
				required: true,
				values: ["tasks", "budget_entries", "vendor_suggestions"],
				description:
					"Type of proposal (tasks, budget entries, or vendor suggestions)",
			},
			items: {
				type: "array",
				required: true,
				description: "Array of proposed vendor items",
			},
			expiresAt: {
				type: "number",
				required: true,
				description: "Timestamp when the proposal expires (milliseconds)",
			},
			eventId: {
				type: "string",
				required: false,
				description: "Event ID for context",
			},
			roomId: {
				type: "string",
				required: true,
				description: "Room ID where the proposal was created",
			},
			status: {
				type: "enum",
				required: false,
				values: ["pending", "accepted", "rejected", "expired"],
				default: "pending",
				description: "Current status of the proposal",
			},
		},
	});

	// VenueProposalCard - For AI-suggested venues
	registerComponent("VenueProposalCard", VenueProposalCard, {
		name: "Venue Proposal Card",
		description: "Displays AI-suggested venues with save/edit/dismiss actions",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "250px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			proposalId: {
				type: "string",
				required: true,
				description: "Unique identifier for the proposal",
			},
			proposalType: {
				type: "enum",
				required: true,
				values: ["venue_suggestions"],
				description: "Type of proposal (venue suggestions)",
			},
			items: {
				type: "array",
				required: true,
				description: "Array of proposed venue items",
			},
			expiresAt: {
				type: "number",
				required: true,
				description: "Timestamp when the proposal expires (milliseconds)",
			},
			eventId: {
				type: "string",
				required: false,
				description: "Event ID for context",
			},
			roomId: {
				type: "string",
				required: true,
				description: "Room ID where the proposal was created",
			},
			status: {
				type: "enum",
				required: false,
				values: ["pending", "accepted", "rejected", "expired"],
				default: "pending",
				description: "Current status of the proposal",
			},
		},
	});

	// TaskListCard - For displaying existing tasks
	registerComponent("TaskListCard", TaskListCard, {
		name: "Task List Card",
		description:
			"Displays a compact list of tasks with status and quick actions",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "300px",
			minHeight: "250px",
		},
		connections: {
			canBeMaster: true, // Can emit task selection events
			canBeDetail: false,
			emits: ["taskSelected"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch tasks for",
			},
			roomId: {
				type: "string",
				required: false,
				description: "Optional room ID for scoping",
			},
			filter: {
				type: "enum",
				required: false,
				values: ["all", "pending", "completed"],
				default: "all",
				description: "Filter tasks by status",
			},
			limit: {
				type: "number",
				required: false,
				default: 10,
				description: "Maximum number of tasks to display",
			},
			title: {
				type: "string",
				required: false,
				default: "Tasks",
				description: "Card title",
			},
		},
	});

	// BudgetSummaryCard - For budget overview
	registerComponent("BudgetSummaryCard", BudgetSummaryCard, {
		name: "Budget Summary Card",
		description: "Quick overview of event budget with spending breakdown",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "320px",
			minHeight: "280px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["categorySelected"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch budget for",
			},
			title: {
				type: "string",
				required: false,
				default: "Budget Overview",
				description: "Card title",
			},
			showCategories: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show category breakdown",
			},
		},
	});

	// VendorCard - For vendor information
	registerComponent("VendorCard", VendorCard, {
		name: "Vendor Card",
		description: "Displays vendor information with contact details and actions",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "300px",
			minHeight: "220px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["vendorSelected"],
			listensTo: [],
		},
		props: {
			vendorId: {
				type: "string",
				required: false,
				description: "Database ID of existing vendor",
			},
			vendorData: {
				type: "object",
				required: false,
				description: "Vendor data object (for AI-suggested vendors)",
			},
			eventId: {
				type: "string",
				required: true,
				description: "Event ID for context",
			},
			roomId: {
				type: "string",
				required: false,
				description: "Room ID for context",
			},
			showActions: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show action buttons (save, contact)",
			},
		},
	});

	// VendorsList - For displaying vendor directory
	registerComponent("VendorsList", VendorsList, {
		name: "Vendors List",
		description:
			"Grid display of vendors with filtering. Master component that emits vendor selection.",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "2fr",
			minWidth: "400px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["vendorSelected"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch vendors for",
			},
			category: {
				type: "string",
				required: false,
				description: "Filter by vendor category",
			},
			status: {
				type: "string",
				required: false,
				description: "Filter by contract status",
			},
			limit: {
				type: "number",
				required: false,
				description: "Maximum number of vendors to display",
			},
			title: {
				type: "string",
				required: false,
				default: "Vendors",
				description: "Card title",
			},
		},
	});

	// InventoryCard - For inventory management
	registerComponent("InventoryCard", InventoryCard, {
		name: "Inventory Card",
		description:
			"Inventory management with CRUD operations and category filtering",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID for inventory items",
			},
			category: {
				type: "string",
				required: false,
				description: "Filter by category",
			},
			showForm: {
				type: "boolean",
				required: false,
				default: false,
				description: "Show create form by default",
			},
			limit: {
				type: "number",
				required: false,
				description: "Maximum number of items to display",
			},
		},
	});

	// InlinePoll - For AI-generated polls
	registerComponent("InlinePoll", InlinePoll, {
		name: "Inline Poll",
		description:
			"AI-generated interactive poll with voting, real-time results, and deadline countdown",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "300px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			pollId: {
				type: "string",
				required: true,
				description: "Poll ID from database",
			},
			question: {
				type: "string",
				required: true,
				description: "Poll question",
			},
			options: {
				type: "array",
				required: true,
				description:
					"Array of poll options with id, text, and optional description",
			},
			allowMultipleChoices: {
				type: "boolean",
				required: true,
				description: "Whether users can select multiple options",
			},
			deadline: {
				type: "number",
				required: false,
				description: "Optional deadline timestamp (milliseconds)",
			},
			eventId: {
				type: "string",
				required: true,
				description: "Event ID for context",
			},
			roomId: {
				type: "string",
				required: true,
				description: "Room ID where poll was created",
			},
		},
	});

	// QuickActions - For AI-suggested action buttons
	registerComponent("QuickActions", QuickActions, {
		name: "Quick Actions",
		description:
			"AI-suggested contextual action buttons with variants and icons",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "300px",
			minHeight: "120px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			actions: {
				type: "array",
				required: true,
				description:
					"Array of action objects with id, label, action, variant, icon, and description",
			},
			title: {
				type: "string",
				required: false,
				default: "Quick Actions",
				description: "Card title",
			},
		},
	});

	// ConfirmationPrompt - For AI-generated confirmations
	registerComponent("ConfirmationPrompt", ConfirmationPrompt, {
		name: "Confirmation Prompt",
		description:
			"AI-generated Yes/No confirmation with variants, auto-focus, and keyboard shortcuts",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "300px",
			minHeight: "150px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			question: {
				type: "string",
				required: true,
				description: "Confirmation question",
			},
			yesLabel: {
				type: "string",
				required: false,
				default: "Yes",
				description: "Label for confirm button",
			},
			noLabel: {
				type: "string",
				required: false,
				default: "No",
				description: "Label for cancel button",
			},
			variant: {
				type: "enum",
				required: false,
				values: ["default", "warning", "danger"],
				default: "default",
				description: "Visual variant (default, warning, danger)",
			},
			description: {
				type: "string",
				required: false,
				description: "Additional description text",
			},
		},
	});

	// KPIDashboard - For key performance indicators overview
	registerComponent("KPIDashboard", KPIDashboard, {
		name: "KPI Dashboard",
		description:
			"Key metrics overview: Budget (spent/total), Tasks (complete/total), Days until event, RSVP (confirmed/expected)",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "2fr",
			minWidth: "600px",
			minHeight: "200px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch metrics for",
			},
			showDetails: {
				type: "boolean",
				required: false,
				default: false,
				description: "Show detailed breakdown for each metric",
			},
		},
	});

	// ProgressSummary - For overall event progress
	registerComponent("ProgressSummary", ProgressSummary, {
		name: "Progress Summary",
		description:
			"Overall event completion percentage with task/milestone breakdown (weighted: 70% tasks, 30% milestones)",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "250px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to calculate progress for",
			},
			showBreakdown: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show task and milestone completion breakdown",
			},
		},
	});

	// MilestoneTimeline - For phase-based progress timeline
	registerComponent("MilestoneTimeline", MilestoneTimeline, {
		name: "Milestone Timeline",
		description:
			"Visual timeline showing progress across event phases (planning, vendor selection, design, logistics, day of, post event)",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "2fr",
			minWidth: "400px",
			minHeight: "300px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["phaseSelected"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch milestones for",
			},
			view: {
				type: "enum",
				required: false,
				values: ["timeline", "list"],
				default: "timeline",
				description: "Display mode: timeline or list view",
			},
			showDates: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show dates for each milestone",
			},
		},
	});

	// TasksByPhase - For tasks grouped by event phases
	registerComponent("TasksByPhase", TasksByPhase, {
		name: "Tasks By Phase",
		description:
			"Tasks organized by event phases with progress indicators. Emits phase selection events for master-detail filtering.",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["phase"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch tasks for",
			},
			showProgress: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show progress bars for each phase",
			},
			compact: {
				type: "boolean",
				required: false,
				default: false,
				description: "Use compact display mode",
			},
		},
	});

	// ExpensesSummary - For budget overview
	registerComponent("ExpensesSummary", ExpensesSummary, {
		name: "Expenses Summary",
		description:
			"Budget summary with spending breakdown by category. Master component that emits category selection.",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "300px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["category"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch expenses for",
			},
			showChart: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show category breakdown chart",
			},
			showCategories: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show category list",
			},
			compact: {
				type: "boolean",
				required: false,
				default: false,
				description: "Use compact display mode",
			},
		},
	});

	// ExpensesList - For detailed expense table
	registerComponent("ExpensesList", ExpensesList, {
		name: "Expenses List",
		description:
			"Detailed expense table with filtering and sorting. Detail component that listens to category/vendor selections.",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "2fr",
			minWidth: "400px",
			minHeight: "350px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: true,
			emits: [],
			listensTo: ["category", "vendor"],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch expenses for",
			},
			category: {
				type: "string",
				required: false,
				description: "Filter by expense category",
			},
			paymentStatus: {
				type: "enum",
				required: false,
				values: ["pending", "paid", "overdue", "all"],
				description: "Filter by payment status",
			},
		},
	});

	// TasksKanban - For kanban board view
	registerComponent("TasksKanban", TasksKanban, {
		name: "Tasks Kanban",
		description:
			"Kanban board for task management with drag-drop support (todo, in progress, blocked, completed columns)",
		layoutRules: {
			canShare: false,
			mustSpanFull: true,
			preferredRatio: "1fr",
			minWidth: "800px",
			minHeight: "500px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: true,
			emits: ["taskId"],
			listensTo: ["category", "vendor"],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch tasks for",
			},
			columnCount: {
				type: "number",
				required: false,
				default: 4,
				description: "Number of columns to display (1, 2, or 4)",
			},
			groupBy: {
				type: "enum",
				required: false,
				values: ["status", "priority", "assignee", "category"],
				default: "status",
				description: "How to group tasks into columns",
			},
			showCounts: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show task counts in column headers",
			},
		},
	});

	// VendorTaskBoard - For vendor-specific task management
	registerComponent("VendorTaskBoard", VendorTaskBoard, {
		name: "Vendor Task Board",
		description:
			"Task board organized by vendor with assignment and progress tracking",
		layoutRules: {
			canShare: false,
			mustSpanFull: true,
			preferredRatio: "1fr",
			minWidth: "700px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: true,
			emits: ["vendorId"],
			listensTo: ["vendorId"],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch vendor tasks for",
			},
			showCounts: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show task counts per vendor",
			},
		},
	});

	// RoomActivity - For recent collaboration activity
	registerComponent("RoomActivity", RoomActivity, {
		name: "Room Activity",
		description:
			"Recent messages and collaboration activity across event rooms",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "300px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["roomId"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch room activity for",
			},
			limit: {
				type: "number",
				required: false,
				default: 10,
				description: "Maximum number of messages to display",
			},
			showRoomName: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show room name with each message",
			},
		},
	});

	// PollsList - For active polls
	registerComponent("PollsList", PollsList, {
		name: "Polls List",
		description: "List of active polls requiring votes with deadline tracking",
		layoutRules: {
			canShare: true,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "350px",
			minHeight: "250px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["pollId"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch polls for",
			},
			status: {
				type: "enum",
				required: false,
				values: ["active", "closed", "all"],
				default: "active",
				description: "Filter polls by status",
			},
		},
	});

	// CalendarView - For event calendar
	registerComponent("CalendarView", CalendarView, {
		name: "Calendar View",
		description:
			"Calendar view showing tasks, milestones, and deadlines (month/week/agenda views)",
		layoutRules: {
			canShare: false,
			mustSpanFull: true,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "500px",
		},
		connections: {
			canBeMaster: true,
			canBeDetail: false,
			emits: ["date"],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch calendar data for",
			},
			view: {
				type: "enum",
				required: false,
				values: ["month", "week", "agenda"],
				default: "month",
				description: "Calendar view mode",
			},
			showTasks: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show tasks on calendar",
			},
			showMilestones: {
				type: "boolean",
				required: false,
				default: true,
				description: "Show milestones on calendar",
			},
		},
	});

	// TaskDetails - For viewing/editing task details in modal
	registerComponent("TaskDetails", TaskDetails, {
		name: "Task Details",
		description: "Modal for viewing and editing task details",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			taskId: {
				type: "string",
				required: true,
				description: "Task ID to display",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});

	// ExpenseDetailsModal - For viewing/editing expense details
	registerComponent("ExpenseDetailsModal", ExpenseDetailsModal, {
		name: "Expense Details Modal",
		description: "Modal for viewing and editing expense details",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			expenseId: {
				type: "string",
				required: true,
				description: "Expense ID to display",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});

	// PollDetailsModal - For viewing poll and voting
	registerComponent("PollDetailsModal", PollDetailsModal, {
		name: "Poll Details Modal",
		description: "Modal for viewing poll details, voting, and managing poll",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			pollId: {
				type: "string",
				required: true,
				description: "Poll ID to display",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});

	// AddTaskModal - For creating new tasks
	registerComponent("AddTaskModal", AddTaskModal, {
		name: "Add Task Modal",
		description: "Modal for creating a new task",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID for the new task",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});

	// AddExpenseModal - For creating new expenses
	registerComponent("AddExpenseModal", AddExpenseModal, {
		name: "Add Expense Modal",
		description: "Modal for creating a new expense",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID for the new expense",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});

	// AddVendorModal - For creating new vendors
	registerComponent("AddVendorModal", AddVendorModal, {
		name: "Add Vendor Modal",
		description: "Modal for creating a new vendor",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID for the new vendor",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});

	// DailyDeadlinesModal - For viewing task deadlines on a specific day
	registerComponent("DailyDeadlinesModal", DailyDeadlinesModal, {
		name: "Daily Deadlines Modal",
		description:
			"Modal showing all task deadlines for a specific day with expandable details",
		layoutRules: {
			canShare: false,
			mustSpanFull: false,
			preferredRatio: "1fr",
			minWidth: "600px",
			minHeight: "400px",
		},
		connections: {
			canBeMaster: false,
			canBeDetail: false,
			emits: [],
			listensTo: [],
		},
		props: {
			eventId: {
				type: "string",
				required: true,
				description: "Event ID to fetch tasks for",
			},
			date: {
				type: "number",
				required: true,
				description: "Unix timestamp of the selected day",
			},
			modalId: {
				type: "string",
				required: true,
				description: "Unique modal ID for managing modal state",
			},
		},
	});
}

/**
 * Check if message components are registered
 * Useful for ensuring initialization has occurred
 */
export function areMessageComponentsRegistered(): boolean {
	const requiredComponents = [
		"TaskProposalCard",
		"BudgetProposalCard",
		"VendorProposalCard",
		"VenueProposalCard",
		"TaskListCard",
		"BudgetSummaryCard",
		"VendorCard",
		"VendorsList",
		"InventoryCard",
		"InlinePoll",
		"QuickActions",
		"ConfirmationPrompt",
		"KPIDashboard",
		"ProgressSummary",
		"MilestoneTimeline",
		"TasksByPhase",
		"ExpensesSummary",
		"ExpensesList",
		"TasksKanban",
		"VendorTaskBoard",
		"RoomActivity",
		"PollsList",
		"CalendarView",
		"DailyDeadlinesModal",
	];

	// Import hasComponent from registry
	const { hasComponent } = require("./registry");

	return requiredComponents.every((type) => hasComponent(type));
}
