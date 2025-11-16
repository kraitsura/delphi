/**
 * Pre-built Test Configurations for Fluid UI Testbed
 * Comprehensive test scenarios exploring different component combinations
 */

import type { DashboardConfig } from "@/lib/fluid-ui/types";
import type { Id } from "@/convex/_generated/dataModel";

const MOCK_EVENT_ID = "k17dv8z9q8r7s6t5u4v3w2x1" as Id<"events">;
const MOCK_POLL_ID = "poll_0" as Id<"polls">;

// ============================================================================
// SINGLE COMPONENT TESTS
// ============================================================================

export const SINGLE_COMPONENT_TESTS: Record<string, DashboardConfig> = {
  eventDetails: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "EventDetails",
            props: {
              eventId: MOCK_EVENT_ID,
              showStatus: true,
              showBudget: true,
              showLocation: true,
            },
          },
        ],
      },
    ],
  },

  tasksList: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
              showFilters: true,
            },
          },
        ],
      },
    ],
  },

  tasksKanban: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksKanban",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  expensesSummary: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              showChart: true,
            },
          },
        ],
      },
    ],
  },

  expensesList: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
              showFilters: true,
            },
          },
        ],
      },
    ],
  },

  upcomingPayments: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 30,
            },
          },
        ],
      },
    ],
  },

  timeline: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "Timeline",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  milestoneTracker: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  roomActivity: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
              limit: 10,
            },
          },
        ],
      },
    ],
  },

  pollsList: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  pollResults: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "PollResults",
            props: {
              pollId: MOCK_POLL_ID,
              showVoters: true,
              showPercentages: true,
            },
          },
        ],
      },
    ],
  },

  calendarView: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "CalendarView",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  upcomingEvents: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "UpcomingEvents",
            props: {
              limit: 5,
            },
          },
        ],
      },
    ],
  },

  // Event Planning Components
  tasksByPhase: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksByPhase",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
              compact: false,
            },
          },
        ],
      },
    ],
  },

  phaseProgress: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "PhaseProgress",
            props: {
              eventId: MOCK_EVENT_ID,
              showPercentages: true,
              showTaskCounts: true,
            },
          },
        ],
      },
    ],
  },

  milestoneTimeline: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "MilestoneTimeline",
            props: {
              eventId: MOCK_EVENT_ID,
              view: "timeline",
              showDates: true,
            },
          },
        ],
      },
    ],
  },

  tasksByVendor: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksByVendor",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
              showUnassigned: true,
            },
          },
        ],
      },
    ],
  },

  vendorTaskBoard: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "VendorTaskBoard",
            props: {
              eventId: MOCK_EVENT_ID,
              showCounts: true,
            },
          },
        ],
      },
    ],
  },

  taskGanttChart: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TaskGanttChart",
            props: {
              eventId: MOCK_EVENT_ID,
              showDependencies: true,
              viewRange: "month",
            },
          },
        ],
      },
    ],
  },

  deadlineCalendar: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "DeadlineCalendar",
            props: {
              eventId: MOCK_EVENT_ID,
              view: "month",
              highlightOverdue: true,
            },
          },
        ],
      },
    ],
  },

  dayOfChecklist: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "DayOfChecklist",
            props: {
              eventId: MOCK_EVENT_ID,
              showTimes: true,
              autoScroll: false,
            },
          },
        ],
      },
    ],
  },

  liveEventStatus: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "LiveEventStatus",
            props: {
              eventId: MOCK_EVENT_ID,
              showTeam: true,
              updateInterval: 30000,
            },
          },
        ],
      },
    ],
  },

  runOfShowTimeline: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "RunOfShowTimeline",
            props: {
              eventId: MOCK_EVENT_ID,
              autoScroll: false,
              showDurations: true,
            },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// LAYOUT RATIO TESTS
// ============================================================================

export const LAYOUT_TESTS: Record<string, DashboardConfig> = {
  twoEqual: {
    sections: [
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
              showFilters: true,
            },
          },
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  twoThirdsOneThird: {
    sections: [
      {
        type: "row",
        layout: "2:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  threeQuartersOneQuarter: {
    sections: [
      {
        type: "row",
        layout: "3:1",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              showChart: true,
            },
          },
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 14,
            },
          },
        ],
      },
    ],
  },

  sidebar: {
    sections: [
      {
        type: "row",
        layout: "sidebar",
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  threeColumns: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
              limit: 5,
            },
          },
        ],
      },
    ],
  },

  customRatio: {
    sections: [
      {
        type: "row",
        layout: ["2fr", "1fr", "1fr"],
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 7,
            },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// MULTI-ROW TESTS
// ============================================================================

export const MULTI_ROW_TESTS: Record<string, DashboardConfig> = {
  twoRowsEqual: {
    sections: [
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  fullWidthPlusSplit: {
    sections: [
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "Timeline",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: ["1fr", "1fr", "1fr"],
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 14,
            },
          },
        ],
      },
    ],
  },

  mixedLayouts: {
    sections: [
      {
        type: "row",
        layout: "2:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "sidebar",
        components: [
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
              limit: 5,
            },
          },
          {
            type: "PollResults",
            props: {
              pollId: MOCK_POLL_ID,
              showVoters: true,
              showPercentages: true,
            },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// TEXT + COMPONENT TESTS
// ============================================================================

export const TEXT_COMPONENT_TESTS: Record<string, DashboardConfig> = {
  withHeader: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Q4 Product Launch Dashboard</h1><p>Comprehensive overview of event planning progress and budget status.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "EventDetails",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  withSectionHeaders: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Task Overview</h2>",
        spacing: "tight",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  multipleTextSections: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Event Dashboard</h1>",
        spacing: "tight",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "EventDetails",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  manyRowsTest: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Multi-Row Stress Test</h1><p>Testing unlimited rows with testbed.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "EventDetails",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: ["1fr", "1fr", "1fr"],
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
              limit: 5,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "2:1",
        components: [
          {
            type: "Timeline",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 30,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "CalendarView",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// REAL-WORLD DASHBOARD SCENARIOS
// ============================================================================

export const REAL_WORLD_SCENARIOS: Record<string, DashboardConfig> = {
  executiveOverview: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Executive Overview</h1><p>High-level event status and financial summary.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "EventDetails",
            props: {
              eventId: MOCK_EVENT_ID,
              showStatus: true,
              showBudget: true,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              showChart: false,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 30,
            },
          },
        ],
      },
    ],
  },

  projectManager: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Project Management View</h1>",
        spacing: "tight",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksKanban",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "Timeline",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  financialDashboard: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Financial Dashboard</h1><p>Budget tracking and expense management.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              showChart: true,
            },
          },
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "UpcomingPayments",
            props: {
              eventId: MOCK_EVENT_ID,
              daysAhead: 45,
            },
          },
        ],
      },
    ],
  },

  collaborationHub: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Collaboration Hub</h1>",
        spacing: "tight",
      },
      {
        type: "row",
        layout: "2:1",
        components: [
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
              limit: 15,
            },
          },
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "CalendarView",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
    ],
  },

  comprehensiveDashboard: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Complete Event Dashboard</h1><p>All-in-one view of event planning, budget, and collaboration.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "EventDetails",
            props: {
              eventId: MOCK_EVENT_ID,
              compact: true,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              compact: true,
            },
          },
          {
            type: "MilestoneTracker",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
        ],
      },
      {
        type: "row",
        layout: "2:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
          },
          {
            type: "RoomActivity",
            props: {
              eventId: MOCK_EVENT_ID,
              limit: 8,
            },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// ZUSTAND DEMOS - Component Communication via Zustand Store
// ============================================================================

export const ZUSTAND_DEMOS = {
  // Task Management: TasksByPhase → TasksList
  phaseTaskFilter: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Task Management with Phase Filtering</h2><p><strong>Zustand Master-Detail Demo:</strong> Click on a phase in the left panel to filter tasks in the right panel. This uses Zustand store for state management.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksByPhase",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
              compact: true,
            },
            id: "tasks-by-phase-master",
          },
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
              showFilters: false,
            },
            id: "tasks-list-detail",
          },
        ],
      },
    ],
  },

  // Vendor Management: TasksByVendor → ExpensesList
  vendorFilter: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Vendor Management Dashboard</h2><p><strong>Zustand Master-Detail Demo:</strong> Click on a vendor in the left panel to see filtered tasks and expenses.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "2:1",
        components: [
          {
            type: "TasksByVendor",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
              showUnassigned: true,
            },
            id: "tasks-by-vendor-master",
          },
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
            id: "expenses-list-detail",
          },
        ],
      },
    ],
  },

  // Poll Management: PollsList → PollResults
  pollSelection: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Poll Results Viewer</h2><p><strong>Zustand Master-Detail Demo:</strong> Click on a poll in the left panel to view its results in real-time.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "sidebar",
        components: [
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
              status: "all",
            },
            id: "polls-list-master",
          },
          {
            type: "PollResults",
            props: {
              showPercentages: true,
            },
            id: "poll-results-detail",
          },
        ],
      },
    ],
  },

  // Budget Category Filtering: ExpensesSummary → ExpensesList
  categoryExpenseFilter: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Budget Category Filtering</h2><p><strong>Zustand Master-Detail Demo:</strong> Click on a category in the budget summary to filter expenses by that category. This demonstrates single selection with visual feedback.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              showChart: true,
              showCategories: true,
            },
            id: "expenses-summary-master",
          },
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
            id: "expenses-list-filtered",
          },
        ],
      },
    ],
  },

  // Multi-Component Synchronization: TasksByPhase → Multiple Details
  multiComponentSync: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Multi-Component Synchronization</h2><p><strong>Zustand Cross-Panel Demo:</strong> Select a phase to see all three detail components update simultaneously. This showcases 3+ components responding to the same Zustand selection.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksByPhase",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
            },
            id: "phase-selector",
          },
        ],
      },
      {
        type: "row",
        layout: ["1fr", "1fr", "1fr"],
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
              showFilters: false,
            },
            id: "tasks-sync-1",
          },
          {
            type: "PhaseProgress",
            props: {
              eventId: MOCK_EVENT_ID,
              showTaskCounts: true,
            },
            id: "phase-sync-2",
          },
          {
            type: "MilestoneTimeline",
            props: {
              eventId: MOCK_EVENT_ID,
              view: "timeline",
            },
            id: "milestone-sync-3",
          },
        ],
      },
    ],
  },

  // Dual Filter Demo: Vendor + Phase → Tasks
  dualFilterDemo: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Multi-Level Filtering</h2><p><strong>Zustand Compound Filter Demo:</strong> Select both a vendor and a phase to see compound filtering in action. TasksList reads BOTH vendorId AND phase from Zustand.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksByVendor",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
            },
            id: "vendor-filter",
          },
          {
            type: "TasksByPhase",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
              compact: true,
            },
            id: "phase-filter",
          },
        ],
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
              showFilters: true,
            },
            id: "dual-filtered-tasks",
          },
        ],
      },
    ],
  },

  // Selection Clearing Demo
  selectionClearing: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Selection Clearing & Reset</h2><p><strong>Zustand Reset Demo:</strong> Select vendors and categories, then use the 'Clear All Filters' button to reset all selections. Demonstrates clearAllSelections() action.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksByVendor",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
            },
            id: "vendor-for-reset",
          },
          {
            type: "ExpensesSummary",
            props: {
              eventId: MOCK_EVENT_ID,
              showCategories: true,
            },
            id: "category-for-reset",
          },
        ],
      },
      {
        type: "text",
        content: "<p style='text-align: center; padding: 16px;'><button onclick='window.clearAllFilters && window.clearAllFilters()' style='padding: 12px 24px; background: #000; color: #fff; border: 1px solid #333; cursor: pointer; font-size: 14px;'>Clear All Filters</button></p><p style='text-align: center; color: #666; font-size: 12px;'>Note: Button demonstrates clearAllSelections() - check Zustand inspector to see state reset</p>",
        spacing: "tight",
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "TasksList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
            id: "tasks-with-reset",
          },
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
            id: "expenses-with-reset",
          },
        ],
      },
    ],
  },

  // Visual Feedback Demo
  highlightAnimation: {
    sections: [
      {
        type: "text",
        content: "<h2>■ Visual Feedback & Animations</h2><p><strong>Zustand Animation Demo:</strong> Watch components highlight and animate when selections change. Demonstrates highlightComponent() with pulse, shake, and glow animations.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "sidebar",
        components: [
          {
            type: "PollsList",
            props: {
              eventId: MOCK_EVENT_ID,
              status: "all",
            },
            id: "animated-polls-master",
          },
          {
            type: "PollResults",
            props: {
              showPercentages: true,
            },
            id: "animated-poll-results",
          },
        ],
      },
      {
        type: "text",
        content: "<p style='text-align: center; color: #666; font-size: 12px;'>Select different polls to see smooth transitions and highlight animations</p>",
        spacing: "flush",
      },
    ],
  },

  // Vendor Budget Coordination: Real-World Workflow
  vendorBudgetCoordination: {
    sections: [
      {
        type: "text",
        content: "<h1>■ Vendor Budget Coordination Dashboard</h1><p><strong>Real-World Zustand Workflow:</strong> Complete vendor management with synchronized tasks and expenses. Select a vendor to see all related information update across multiple components.</p>",
        spacing: "comfortable",
      },
      {
        type: "row",
        layout: "auto",
        components: [
          {
            type: "TasksByVendor",
            props: {
              eventId: MOCK_EVENT_ID,
              showProgress: true,
              showUnassigned: true,
            },
            id: "vendor-coordination-master",
          },
        ],
      },
      {
        type: "row",
        layout: "1:1",
        components: [
          {
            type: "ExpensesList",
            props: {
              eventId: MOCK_EVENT_ID,
            },
            id: "vendor-expenses-sync",
          },
          {
            type: "VendorTaskBoard",
            props: {
              eventId: MOCK_EVENT_ID,
              showCounts: true,
            },
            id: "vendor-task-board",
          },
        ],
      },
      {
        type: "text",
        content: "<p style='text-align: center; color: #666; font-size: 12px; margin-top: 16px;'>⚡ All components synchronized via Zustand • No prop drilling • Reactive updates</p>",
        spacing: "flush",
      },
    ],
  },
};

// ============================================================================
// ALL TEST CONFIGS
// ============================================================================

export const ALL_TEST_CONFIGS = {
  ...SINGLE_COMPONENT_TESTS,
  ...LAYOUT_TESTS,
  ...MULTI_ROW_TESTS,
  ...TEXT_COMPONENT_TESTS,
  ...REAL_WORLD_SCENARIOS,
  ...ZUSTAND_DEMOS,
};

// ============================================================================
// TEST CONFIG CATEGORIES
// ============================================================================

export const TEST_CATEGORIES = {
  "Single Components": Object.keys(SINGLE_COMPONENT_TESTS),
  "Layout Tests": Object.keys(LAYOUT_TESTS),
  "Multi-Row": Object.keys(MULTI_ROW_TESTS),
  "With Text": Object.keys(TEXT_COMPONENT_TESTS),
  "Real-World": Object.keys(REAL_WORLD_SCENARIOS),
  "Zustand Demos": Object.keys(ZUSTAND_DEMOS),
};

export type TestCategory = keyof typeof TEST_CATEGORIES;
