/**
 * Component Metadata for Dashboard Search/Filtering
 *
 * This file contains exhaustive mappings of dashboard components to categories,
 * descriptions, and search keywords for the component filter feature.
 */

export interface ComponentMetadata {
	name: string;
	description: string;
	categories: string[];
	keywords: string[];
}

/**
 * Metadata for all dashboard components
 */
export const COMPONENT_METADATA: Record<string, ComponentMetadata> = {
	// Summary/Overview Components
	KPIDashboard: {
		name: "KPI Dashboard",
		description:
			"High-level event metrics including budget, tasks, days remaining, and RSVP status",
		categories: ["summary", "overview", "kpi", "metrics"],
		keywords: [
			"kpi",
			"metrics",
			"overview",
			"summary",
			"stats",
			"statistics",
			"key performance",
		],
	},
	ProgressSummary: {
		name: "Progress Summary",
		description: "Overall progress breakdown and completion status",
		categories: ["progress", "summary", "overview"],
		keywords: ["progress", "summary", "completion", "status", "overview"],
	},

	// Task Management Components
	TasksList: {
		name: "Tasks List",
		description: "Filterable task list with inline actions and status updates",
		categories: ["task", "list"],
		keywords: ["tasks", "list", "todo", "items", "work items"],
	},
	TasksKanban: {
		name: "Tasks Kanban",
		description: "Kanban board with status columns for task management",
		categories: ["task", "kanban", "board"],
		keywords: ["kanban", "board", "tasks", "columns", "drag drop", "status"],
	},
	TasksByPhase: {
		name: "Tasks by Phase",
		description: "Tasks grouped by planning phase",
		categories: ["task", "phase", "grouping"],
		keywords: ["tasks", "phase", "grouped", "planning phase", "stages"],
	},
	TasksByVendor: {
		name: "Tasks by Vendor",
		description: "Tasks organized by assigned vendor",
		categories: ["task", "vendor", "grouping"],
		keywords: ["tasks", "vendor", "supplier", "contractor", "assigned"],
	},
	TaskCreator: {
		name: "Task Creator",
		description: "Form for creating new tasks",
		categories: ["task", "create", "form"],
		keywords: ["create", "new task", "add task", "task form"],
	},
	TaskEditor: {
		name: "Task Editor",
		description: "Form for editing existing tasks",
		categories: ["task", "edit", "form"],
		keywords: ["edit", "update task", "modify task", "task form"],
	},
	TaskDetails: {
		name: "Task Details",
		description: "Detailed view of a single task",
		categories: ["task", "detail", "view"],
		keywords: ["task details", "task view", "single task", "task info"],
	},
	TaskGroupDetails: {
		name: "Task Group Details",
		description: "Information about task groups",
		categories: ["task", "group", "detail"],
		keywords: ["task group", "group details", "task collection"],
	},
	TaskGanttChart: {
		name: "Task Gantt Chart",
		description: "Gantt chart visualization of tasks and timelines",
		categories: ["task", "gantt", "timeline", "chart"],
		keywords: [
			"gantt",
			"chart",
			"timeline",
			"tasks",
			"schedule",
			"project timeline",
		],
	},

	// Timeline Components
	Timeline: {
		name: "Timeline",
		description: "Visual timeline of events and deadlines",
		categories: ["timeline", "events"],
		keywords: ["timeline", "chronology", "events", "deadlines", "schedule"],
	},
	MilestoneTimeline: {
		name: "Milestone Timeline",
		description: "Timeline of major milestones and achievements",
		categories: ["milestone", "timeline", "phase"],
		keywords: [
			"milestone",
			"timeline",
			"achievements",
			"major events",
			"phases",
		],
	},
	MilestoneTracker: {
		name: "Milestone Tracker",
		description: "Progress tracker for project milestones",
		categories: ["milestone", "progress", "tracker"],
		keywords: ["milestone", "tracker", "progress", "achievements", "goals"],
	},
	RunOfShowTimeline: {
		name: "Run of Show Timeline",
		description: "Day-of-event timeline and schedule",
		categories: ["timeline", "event", "schedule"],
		keywords: [
			"run of show",
			"day of",
			"schedule",
			"event timeline",
			"rundown",
		],
	},

	// Budget/Financial Components
	ExpensesSummary: {
		name: "Expenses Summary",
		description:
			"Financial overview with budget tracking and spending analysis",
		categories: ["budget", "financial", "expenses", "summary"],
		keywords: [
			"expenses",
			"budget",
			"financial",
			"summary",
			"spending",
			"costs",
		],
	},
	ExpensesList: {
		name: "Expenses List",
		description: "Detailed expense table with line items",
		categories: ["budget", "financial", "expenses", "list"],
		keywords: [
			"expenses",
			"list",
			"costs",
			"spending",
			"budget items",
			"financial",
		],
	},
	UpcomingPayments: {
		name: "Upcoming Payments",
		description: "Payment timeline and due dates",
		categories: ["budget", "financial", "payments"],
		keywords: ["payments", "due dates", "upcoming", "financial", "payables"],
	},

	// Event Components
	EventDetails: {
		name: "Event Details",
		description: "Comprehensive event information and metadata",
		categories: ["event", "detail", "info"],
		keywords: ["event", "details", "information", "event info", "metadata"],
	},
	UpcomingEvents: {
		name: "Upcoming Events",
		description: "List of upcoming events",
		categories: ["event", "list", "upcoming"],
		keywords: ["upcoming", "events", "future events", "event list"],
	},
	LiveEventStatus: {
		name: "Live Event Status",
		description: "Real-time event status and updates",
		categories: ["event", "status", "live"],
		keywords: ["live", "status", "real-time", "event status", "current"],
	},
	DayOfChecklist: {
		name: "Day-of Checklist",
		description: "Day-of-event checklist and tasks",
		categories: ["event", "checklist", "calendar"],
		keywords: ["day of", "checklist", "event day", "tasks", "to-do"],
	},

	// Calendar Components
	CalendarView: {
		name: "Calendar View",
		description: "Month/week calendar view of events and deadlines",
		categories: ["calendar", "schedule"],
		keywords: ["calendar", "month view", "week view", "schedule", "dates"],
	},
	DeadlineCalendar: {
		name: "Deadline Calendar",
		description: "Calendar focused on deadlines and due dates",
		categories: ["calendar", "deadline", "timeline"],
		keywords: [
			"deadline",
			"calendar",
			"due dates",
			"deadlines",
			"important dates",
		],
	},

	// Collaboration Components
	RoomActivity: {
		name: "Room Activity",
		description: "Recent messages and activity across event rooms",
		categories: ["collaboration", "communication", "activity"],
		keywords: [
			"room",
			"activity",
			"messages",
			"chat",
			"collaboration",
			"communication",
		],
	},
	PollsList: {
		name: "Polls List",
		description: "Active polls requiring votes",
		categories: ["collaboration", "poll", "voting"],
		keywords: ["polls", "voting", "survey", "questions", "collaboration"],
	},
	PollResults: {
		name: "Poll Results",
		description: "Poll results and voting statistics",
		categories: ["collaboration", "poll", "results"],
		keywords: [
			"poll results",
			"voting results",
			"survey results",
			"statistics",
		],
	},

	// People/Vendor Components
	VendorsList: {
		name: "Vendors List",
		description: "Directory of vendors and suppliers",
		categories: ["vendor", "people", "list"],
		keywords: ["vendors", "suppliers", "contractors", "directory", "list"],
	},
	VendorDetails: {
		name: "Vendor Details",
		description: "Detailed view of a single vendor",
		categories: ["vendor", "people", "detail"],
		keywords: ["vendor", "details", "supplier info", "contractor"],
	},
	VendorTaskBoard: {
		name: "Vendor Task Board",
		description: "Vendor-specific task management board",
		categories: ["vendor", "task", "board"],
		keywords: [
			"vendor tasks",
			"supplier tasks",
			"contractor board",
			"vendor management",
		],
	},
	GuestList: {
		name: "Guest List",
		description: "Event guest management and directory",
		categories: ["people", "guest", "list"],
		keywords: ["guests", "attendees", "guest list", "invitees", "people"],
	},
	RSVPStatus: {
		name: "RSVP Status",
		description: "RSVP tracking and attendance summary",
		categories: ["people", "rsvp", "status"],
		keywords: ["rsvp", "attendance", "responses", "guest status"],
	},

	// Status Components
	PhaseProgress: {
		name: "Phase Progress",
		description: "Phase-based progress tracking and milestones",
		categories: ["progress", "phase", "status"],
		keywords: ["phase", "progress", "stages", "planning phases", "completion"],
	},
};

/**
 * Category to component type mappings for quick filtering
 */
export const CATEGORY_MAPPINGS: Record<string, string[]> = {
	// Primary categories
	task: [
		"TasksList",
		"TasksKanban",
		"TasksByPhase",
		"TasksByVendor",
		"TaskCreator",
		"TaskEditor",
		"TaskDetails",
		"TaskGroupDetails",
		"TaskGanttChart",
	],
	progress: [
		"ProgressSummary",
		"PhaseProgress",
		"MilestoneTracker",
		"KPIDashboard",
	],
	milestone: ["MilestoneTimeline", "MilestoneTracker"],
	budget: ["ExpensesSummary", "ExpensesList", "UpcomingPayments"],
	phase: ["TasksByPhase", "PhaseProgress", "MilestoneTimeline"],
	timeline: [
		"Timeline",
		"MilestoneTimeline",
		"RunOfShowTimeline",
		"DeadlineCalendar",
		"TaskGanttChart",
	],
	calendar: ["CalendarView", "DeadlineCalendar", "DayOfChecklist"],
	event: [
		"EventDetails",
		"UpcomingEvents",
		"LiveEventStatus",
		"DayOfChecklist",
	],
	vendor: ["VendorTaskBoard", "VendorsList", "VendorDetails", "TasksByVendor"],
	collaboration: ["RoomActivity", "PollsList", "PollResults"],
	people: ["GuestList", "RSVPStatus", "VendorsList", "VendorDetails"],

	// Aliases and common terms
	financial: ["ExpensesSummary", "ExpensesList", "UpcomingPayments"],
	expenses: ["ExpensesSummary", "ExpensesList"],
	poll: ["PollsList", "PollResults"],
	polls: ["PollsList", "PollResults"],
	gantt: ["TaskGanttChart"],
	kanban: ["TasksKanban"],
	board: ["TasksKanban", "VendorTaskBoard"],
	summary: ["KPIDashboard", "ProgressSummary", "ExpensesSummary"],
	overview: ["KPIDashboard", "ProgressSummary"],
	kpi: ["KPIDashboard"],
	metrics: ["KPIDashboard"],
	list: [
		"TasksList",
		"ExpensesList",
		"PollsList",
		"VendorsList",
		"GuestList",
		"UpcomingEvents",
	],
	detail: ["TaskDetails", "TaskGroupDetails", "VendorDetails", "EventDetails"],
	status: ["LiveEventStatus", "RSVPStatus", "PhaseProgress"],
	live: ["LiveEventStatus"],
	schedule: ["CalendarView", "RunOfShowTimeline", "Timeline"],
	payment: ["UpcomingPayments"],
	payments: ["UpcomingPayments"],
	rsvp: ["RSVPStatus"],
	guest: ["GuestList", "RSVPStatus"],
	guests: ["GuestList", "RSVPStatus"],
	chat: ["RoomActivity"],
	message: ["RoomActivity"],
	messages: ["RoomActivity"],
	activity: ["RoomActivity"],
	voting: ["PollsList", "PollResults"],
	survey: ["PollsList", "PollResults"],
};

/**
 * Get all component types that match a search query
 * Supports both category-based and component-level search
 */
export function getMatchingComponents(query: string): Set<string> {
	if (!query || query.trim() === "") {
		// Return all components when query is empty
		return new Set(Object.keys(COMPONENT_METADATA));
	}

	const lowerQuery = query.toLowerCase().trim();
	const matchedComponents = new Set<string>();

	// First, check if query matches a category
	if (CATEGORY_MAPPINGS[lowerQuery]) {
		CATEGORY_MAPPINGS[lowerQuery].forEach((comp) =>
			matchedComponents.add(comp),
		);
	}

	// Then, fuzzy search through component metadata
	Object.entries(COMPONENT_METADATA).forEach(([componentType, metadata]) => {
		const searchableText = [
			metadata.name,
			metadata.description,
			...metadata.categories,
			...metadata.keywords,
		]
			.join(" ")
			.toLowerCase();

		if (searchableText.includes(lowerQuery)) {
			matchedComponents.add(componentType);
		}
	});

	return matchedComponents;
}

/**
 * Get display name for a component type
 */
export function getComponentDisplayName(componentType: string): string {
	return COMPONENT_METADATA[componentType]?.name || componentType;
}

/**
 * Get all available categories
 */
export function getAllCategories(): string[] {
	return Object.keys(CATEGORY_MAPPINGS);
}

/**
 * Get suggested search terms based on partial input
 */
export function getSuggestedSearchTerms(partialQuery: string): string[] {
	if (!partialQuery || partialQuery.length < 2) {
		return [];
	}

	const lowerQuery = partialQuery.toLowerCase();
	const suggestions = new Set<string>();

	// Suggest matching categories
	Object.keys(CATEGORY_MAPPINGS).forEach((category) => {
		if (category.startsWith(lowerQuery)) {
			suggestions.add(category);
		}
	});

	// Suggest matching keywords
	Object.values(COMPONENT_METADATA).forEach((metadata) => {
		metadata.keywords.forEach((keyword) => {
			if (keyword.toLowerCase().startsWith(lowerQuery)) {
				suggestions.add(keyword);
			}
		});
	});

	return Array.from(suggestions).slice(0, 5);
}
