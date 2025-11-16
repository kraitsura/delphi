/**
 * Simple Wrapped Components for Testbed
 * Pure presentation components that take mock data as props
 */

import React, { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import type { MockDataSet } from "./mock-data";

// Simple context for mock data
const MockDataContext = React.createContext<MockDataSet | null>(null);

export function useMockData() {
  const data = React.useContext(MockDataContext);
  if (!data) throw new Error("Must be within MockDataProvider");
  return data;
}

export function MockDataProvider({ children, data }: { children: React.ReactNode; data: MockDataSet }) {
  return <MockDataContext.Provider value={data}>{children}</MockDataContext.Provider>;
}

// ============================================================================
// WRAPPED COMPONENTS - Simple presentational versions
// ============================================================================

export function EventDetails(_props: any) {
  const { event } = useMockData();

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle className="text-2xl font-light">{SYMBOLS.BLACK_SQUARE} {event.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{event.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">Location</p>
          <p className="text-sm text-muted-foreground">{event.location}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Date</p>
          <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Budget</p>
          <p className="text-sm text-muted-foreground">
            ${(event.spent || 0).toLocaleString()} / ${(event.budget || 0).toLocaleString()}
          </p>
        </div>
        <Badge className={`status-badge status-badge--${event.status}`}>
          {event.status.replace(/_/g, " ")}
        </Badge>
      </CardContent>
    </Card>
  );
}

export function TasksList(_props: any) {
  const { tasks } = useMockData();

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Tasks ({tasks.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasks.slice(0, 10).map(task => (
            <div key={task._id} className="flex items-center justify-between p-2 border-b last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{task.category}</p>
              </div>
              <Badge className={`status-badge status-badge--${task.status} text-xs`}>
                {task.status.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpensesList(_props: any) {
  const { expenses } = useMockData();
  const selectedCategory = useDashboardStore(state => state.selections.category);

  // Filter expenses by category if selected
  const filteredExpenses = selectedCategory
    ? expenses.filter(e => e.category === selectedCategory)
    : expenses;

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <div className="flex flex-col gap-2">
          <CardTitle>{SYMBOLS.BLACK_SQUARE} Expenses ({filteredExpenses.length})</CardTitle>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Total: ${total.toLocaleString()}</p>
            {selectedCategory && (
              <Badge variant="secondary" className="text-xs">
                {SYMBOLS.ARROW_RIGHT} {selectedCategory}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredExpenses.slice(0, 10).map(expense => (
            <div key={expense._id} className="flex items-center justify-between p-2 border-b last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground capitalize">{expense.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">${expense.amount.toLocaleString()}</p>
                <Badge className={`status-badge status-badge--${expense.status} text-xs`}>
                  {expense.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpensesSummary(_props: any) {
  const { expenses } = useMockData();
  const selectedCategory = useDashboardStore(state => state.selections.category);
  const select = useDashboardStore(state => state.select);
  const clearSelection = useDashboardStore(state => state.clearSelection);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleCategoryClick = (category: string) => {
    const newCategory = selectedCategory === category ? null : category;

    if (newCategory) {
      select('category', newCategory);
    } else {
      clearSelection('category');
    }
  };

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Budget Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-light mb-4">${total.toLocaleString()}</p>
        <div className="space-y-2">
          {Object.entries(byCategory).map(([cat, amount]) => {
            const isSelected = selectedCategory === cat;
            return (
              <div
                key={cat}
                className={`flex justify-between text-sm p-2 rounded cursor-pointer transition-all border ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/50"
                }`}
                onClick={() => handleCategoryClick(cat)}
              >
                <span className={`text-muted-foreground capitalize ${isSelected ? "font-semibold" : ""}`}>
                  {isSelected && "→ "}{cat}
                </span>
                <span className="font-medium">${amount.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function RoomActivity(_props: any) {
  const { rooms } = useMockData();

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Room Activity ({rooms.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rooms.slice(0, 5).map(room => (
            <div key={room._id} className="p-2 border-b last:border-0">
              <p className="text-sm font-medium">{room.name}</p>
              <p className="text-xs text-muted-foreground">{room.lastMessage}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PollsList(_props: any) {
  const { polls } = useMockData();
  const selectedPollId = useDashboardStore(state => state.selections.pollId);
  const select = useDashboardStore(state => state.select);
  const clearSelection = useDashboardStore(state => state.clearSelection);

  const handlePollClick = (pollId: Id<"polls">) => {
    const newSelection = selectedPollId === pollId ? null : pollId;

    if (newSelection) {
      select('pollId', newSelection);
    } else {
      clearSelection('pollId');
    }
  };

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Polls ({polls.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {polls.slice(0, 5).map(poll => {
            const isSelected = selectedPollId === poll._id;
            return (
              <div
                key={poll._id}
                className={`p-3 border rounded cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
                onClick={() => handlePollClick(poll._id)}
              >
                <p className="text-sm font-medium mb-2">
                  {isSelected && "→ "}{poll.question}
                </p>
                <div className="space-y-1">
                  {poll.options.map(opt => (
                    <div key={opt.id} className="flex justify-between text-xs">
                      <span>{opt.text}</span>
                      <span className="text-muted-foreground">{opt.votes} votes</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function UpcomingEvents(_props: any) {
  const { events } = useMockData();

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Upcoming Events ({events.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.slice(0, 5).map(event => (
            <div key={event._id} className="p-2 border-b last:border-0">
              <p className="text-sm font-medium">{event.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple placeholders for other components
export function TasksKanban(_props: any) {
  const { tasks } = useMockData();
  const byStatus = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Tasks Kanban</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="p-3 border rounded">
              <p className="text-xs text-muted-foreground uppercase">{status.replace(/_/g, " ")}</p>
              <p className="text-2xl font-light">{count}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UpcomingPayments(_props: any) {
  const { expenses } = useMockData();
  const pending = expenses.filter(e => e.status === "pending");

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Upcoming Payments ({pending.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pending.slice(0, 5).map(expense => (
            <div key={expense._id} className="flex justify-between p-2 border-b last:border-0">
              <span className="text-sm">{expense.description}</span>
              <span className="text-sm font-medium">${expense.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Timeline(_props: any) {
  const { tasks } = useMockData();

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.slice(0, 6).map(task => (
            <div key={task._id} className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MilestoneTracker(_props: any) {
  const { tasks } = useMockData();
  const completed = tasks.filter(t => t.status === "completed").length;
  const total = tasks.length;
  const percent = Math.round((completed / total) * 100);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Milestones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-4xl font-light">{percent}%</p>
            <p className="text-sm text-muted-foreground">{completed} of {total} tasks complete</p>
          </div>
          <div className="h-2 bg-muted rounded overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PollResults(_props: any) {
  const { polls } = useMockData();
  const selectedPollId = useDashboardStore(state => state.selections.pollId);

  const selectedPoll = selectedPollId ? polls.find(p => p._id === selectedPollId) : null;

  // Show placeholder if no poll selected
  if (!selectedPoll) {
    return (
      <Card className="testbed-card">
        <CardHeader className="testbed-card-header">
          <CardTitle>{SYMBOLS.BLACK_SQUARE} Poll Results</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Select a poll to view results</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total votes
  const totalVotes = selectedPoll.options.reduce((sum, opt) => sum + opt.votes, 0);
  const maxVotes = Math.max(...selectedPoll.options.map(opt => opt.votes));

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Poll Results</CardTitle>
      </CardHeader>
      <CardContent>
        <h3 className="text-lg font-normal mb-4">{selectedPoll.question}</h3>
        <div className="space-y-3">
          {selectedPoll.options.map(option => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            const isWinner = option.votes === maxVotes && option.votes > 0;

            return (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {option.text}
                    {isWinner && (
                      <span className="text-green-600">{SYMBOLS.CHECK_MARK}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {option.votes} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isWinner ? "bg-green-600" : "bg-primary"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Total votes: {totalVotes}
        </p>
      </CardContent>
    </Card>
  );
}

export function CalendarView(_props: any) {
  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Calendar view</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EVENT PLANNING COMPONENTS - Mock Data Implementations
// ============================================================================

export function TasksByPhase(_props: any) {
  const { tasks } = useMockData();
  const selectedPhase = useDashboardStore(state => state.selections.phase);
  const select = useDashboardStore(state => state.select);
  const clearSelection = useDashboardStore(state => state.clearSelection);

  const phases = [
    { id: "planning", label: "Planning", icon: "✏️" },
    { id: "vendor_selection", label: "Vendor Selection", icon: "🤝" },
    { id: "design", label: "Design", icon: "🎨" },
    { id: "logistics", label: "Logistics", icon: "🚚" },
    { id: "day_of", label: "Day Of", icon: "📅" },
    { id: "post_event", label: "Post Event", icon: "✓" },
  ];

  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    phases.forEach((p) => (groups[p.id] = []));
    tasks.forEach((task: any) => {
      const phase = task.phase || "planning";
      if (groups[phase]) groups[phase].push(task);
    });
    return groups;
  }, [tasks]);

  const handlePhaseClick = (phaseId: string, phaseName: string) => {
    const newPhase = selectedPhase === phaseId ? null : phaseId;
    if (newPhase) {
      select('phase', newPhase);
    } else {
      clearSelection('phase');
    }
  };

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Tasks by Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {phases.map((phase) => {
            const phaseTasks = groupedTasks[phase.id] || [];
            const completed = phaseTasks.filter((t: any) => t.status === "completed").length;
            const progress = phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0;

            return (
              <div
                key={phase.id}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedPhase === phase.id ? "bg-accent border-primary" : "hover:bg-accent/30"
                }`}
                onClick={() => handlePhaseClick(phase.id, phase.label)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{phase.icon}</span>
                    <span className="font-medium text-sm">{phase.label}</span>
                    <Badge variant="outline" className="text-xs">{phaseTasks.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function PhaseProgress(_props: any) {
  const { tasks } = useMockData();

  const phases = [
    { id: "planning", label: "Planning", icon: "✏️" },
    { id: "vendor_selection", label: "Vendor Selection", icon: "🤝" },
    { id: "design", label: "Design", icon: "🎨" },
    { id: "logistics", label: "Logistics", icon: "🚚" },
    { id: "day_of", label: "Day Of", icon: "📅" },
    { id: "post_event", label: "Post Event", icon: "✓" },
  ];

  const stats = React.useMemo(() => {
    return phases.map((phase) => {
      const phaseTasks = tasks.filter((t: any) => (t.phase || "planning") === phase.id);
      const completed = phaseTasks.filter((t: any) => t.status === "completed").length;
      const inProgress = phaseTasks.filter((t: any) => t.status === "in_progress").length;
      const blocked = phaseTasks.filter((t: any) => t.status === "blocked").length;
      const progress = phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0;
      return { ...phase, total: phaseTasks.length, completed, inProgress, blocked, progress };
    });
  }, [tasks]);

  const overall = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Phase Progress</CardTitle>
        <Badge variant="outline">{overall}% Overall</Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${overall}%` }} />
          </div>
        </div>
        <div className="space-y-3">
          {stats.map((phase) => (
            <div key={phase.id} className="p-2 border rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{phase.icon}</span>
                  <span className="text-sm font-medium">{phase.label}</span>
                  <Badge variant="outline" className="text-xs">{phase.completed}/{phase.total}</Badge>
                </div>
                <span className="text-sm font-semibold">{phase.progress}%</span>
              </div>
              {phase.total > 0 && (
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    <div className="bg-green-600" style={{ width: `${(phase.completed / phase.total) * 100}%` }} />
                    <div className="bg-blue-600" style={{ width: `${(phase.inProgress / phase.total) * 100}%` }} />
                    <div className="bg-red-600" style={{ width: `${(phase.blocked / phase.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MilestoneTimeline(_props: any) {
  const { tasks, event } = useMockData();

  const milestones = [
    { id: "planning", label: "Planning Complete", icon: "✏️", order: 1 },
    { id: "vendor_selection", label: "Vendors Secured", icon: "🤝", order: 2 },
    { id: "design", label: "Design Finalized", icon: "🎨", order: 3 },
    { id: "logistics", label: "Logistics Ready", icon: "🚚", order: 4 },
    { id: "day_of", label: "Event Day", icon: "📅", order: 5 },
    { id: "post_event", label: "Wrap Up", icon: "✓", order: 6 },
  ];

  const stats = React.useMemo(() => {
    return milestones.map((milestone) => {
      const phaseTasks = tasks.filter((t: any) => (t.phase || "planning") === milestone.id);
      const completed = phaseTasks.filter((t: any) => t.status === "completed").length;
      const isComplete = phaseTasks.length > 0 && completed === phaseTasks.length;
      return { ...milestone, total: phaseTasks.length, completed, isComplete };
    });
  }, [tasks]);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Milestone Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((milestone) => (
            <div key={milestone.id} className="flex items-center gap-3 p-2 border rounded">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                milestone.isComplete ? "bg-green-600 text-white" : "bg-secondary"
              }`}>
                <span>{milestone.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{milestone.label}</span>
                  {milestone.isComplete && <Badge className="bg-green-600 text-xs">Complete</Badge>}
                </div>
                {milestone.total > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${milestone.isComplete ? "bg-green-600" : "bg-primary"}`}
                        style={{ width: `${(milestone.completed / milestone.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{milestone.completed}/{milestone.total}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TasksByVendor(_props: any) {
  const { tasks } = useMockData();
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);
  const select = useDashboardStore(state => state.select);
  const clearSelection = useDashboardStore(state => state.clearSelection);

  const vendorGroups = React.useMemo(() => {
    const vendors: Record<string, any[]> = {};
    tasks.forEach((task: any) => {
      const vendor = task.vendor || "Unassigned";
      if (!vendors[vendor]) vendors[vendor] = [];
      vendors[vendor].push(task);
    });
    return Object.entries(vendors).map(([vendor, tasks]) => {
      const completed = tasks.filter((t) => t.status === "completed").length;
      const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
      return { vendor, tasks, total: tasks.length, completed, progress };
    }).sort((a, b) => b.total - a.total);
  }, [tasks]);

  const handleVendorClick = (vendor: string) => {
    const newVendor = selectedVendor === vendor ? null : vendor;
    if (newVendor && newVendor !== "Unassigned") {
      select('vendorId', newVendor);
    } else {
      clearSelection('vendorId');
    }
  };

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Tasks by Vendor</CardTitle>
        <Badge variant="outline">{vendorGroups.length} vendors</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {vendorGroups.map((group) => (
            <div
              key={group.vendor}
              className={`p-3 border rounded cursor-pointer transition-colors ${
                selectedVendor === group.vendor ? "bg-accent border-primary" : "hover:bg-accent/30"
              }`}
              onClick={() => handleVendorClick(group.vendor)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>🤝</span>
                  <span className="font-medium text-sm">{group.vendor}</span>
                  <Badge variant="outline" className="text-xs">{group.total}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{group.progress}%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${group.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function VendorTaskBoard(_props: any) {
  const { tasks } = useMockData();
  const selectedVendor = useDashboardStore(state => state.selections.vendorId);

  const vendorTasks = React.useMemo(() => {
    if (!selectedVendor) return [];
    return tasks.filter((t: any) => t.vendor === selectedVendor);
  }, [tasks, selectedVendor]);

  const columns = [
    { id: "not_started", label: "Not Started" },
    { id: "in_progress", label: "In Progress" },
    { id: "blocked", label: "Blocked" },
    { id: "completed", label: "Completed" },
  ];

  const grouped = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    columns.forEach((col) => (groups[col.id] = []));
    vendorTasks.forEach((task: any) => {
      const status = task.status || "not_started";
      if (groups[status]) groups[status].push(task);
    });
    return groups;
  }, [vendorTasks]);

  if (!selectedVendor) {
    return (
      <Card className="testbed-card">
        <CardHeader className="testbed-card-header">
          <CardTitle>{SYMBOLS.BLACK_SQUARE} Vendor Task Board</CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="text-sm">Select a vendor to view their tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} {selectedVendor}</CardTitle>
        <Badge variant="outline">{vendorTasks.length} tasks</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {columns.map((column) => {
            const columnTasks = grouped[column.id] || [];
            return (
              <div key={column.id} className="space-y-2">
                <div className="text-xs font-medium uppercase text-muted-foreground mb-2">
                  {column.label} ({columnTasks.length})
                </div>
                {columnTasks.map((task: any) => (
                  <div key={task._id} className="p-2 border rounded text-sm">
                    <div className="font-medium line-clamp-2">{task.title}</div>
                    {task.priority !== "medium" && (
                      <Badge variant="outline" className="text-xs mt-1">{task.priority}</Badge>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function TaskGanttChart(_props: any) {
  const { tasks } = useMockData();

  const tasksWithDates = React.useMemo(() => {
    return tasks.filter((t: any) => t.dueDate).slice(0, 10);
  }, [tasks]);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Task Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tasksWithDates.map((task: any) => (
            <div key={task._id} className="flex items-center gap-2">
              <div className="w-32 text-xs truncate">{task.title}</div>
              <div className="flex-1 bg-secondary h-6 rounded relative">
                <div className={`absolute h-full rounded ${
                  task.status === "completed" ? "bg-green-600" :
                  task.status === "in_progress" ? "bg-blue-600" :
                  task.status === "blocked" ? "bg-red-600" : "bg-gray-400"
                }`} style={{ left: "10%", width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DeadlineCalendar(_props: any) {
  const { tasks } = useMockData();

  const upcomingTasks = React.useMemo(() => {
    return tasks
      .filter((t: any) => t.dueDate && t.dueDate > Date.now())
      .sort((a: any, b: any) => a.dueDate - b.dueDate)
      .slice(0, 5);
  }, [tasks]);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Deadline Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {upcomingTasks.map((task: any) => (
            <div key={task._id} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm">{task.title}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DayOfChecklist(_props: any) {
  const { tasks } = useMockData();

  const dayOfTasks = React.useMemo(() => {
    return tasks
      .filter((t: any) => t.phase === "day_of" && t.dayOfSequence !== undefined)
      .sort((a: any, b: any) => (a.dayOfSequence || 0) - (b.dayOfSequence || 0));
  }, [tasks]);

  const completed = dayOfTasks.filter((t: any) => t.status === "completed").length;
  const progress = dayOfTasks.length > 0 ? Math.round((completed / dayOfTasks.length) * 100) : 0;

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Event Day Checklist</CardTitle>
        <Badge variant="outline">{completed}/{dayOfTasks.length}</Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="space-y-2">
          {dayOfTasks.map((task: any) => (
            <div key={task._id} className={`flex items-start gap-2 p-2 border rounded ${
              task.status === "completed" ? "opacity-60" : ""
            }`}>
              <input type="checkbox" checked={task.status === "completed"} readOnly className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">#{task.dayOfSequence}</Badge>
                  {task.estimatedDuration && (
                    <span className="text-xs text-muted-foreground">{task.estimatedDuration}min</span>
                  )}
                </div>
                <div className={`text-sm mt-1 ${task.status === "completed" ? "line-through" : ""}`}>
                  {task.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LiveEventStatus(_props: any) {
  const { tasks } = useMockData();

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    const inProgress = tasks.filter((t: any) => t.status === "in_progress").length;
    const blocked = tasks.filter((t: any) => t.status === "blocked").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, blocked, progress };
  }, [tasks]);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Live Event Status</CardTitle>
        <Badge className="bg-green-600">● LIVE</Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{stats.completed}/{stats.total}</span>
          </div>
          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${stats.progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RunOfShowTimeline(_props: any) {
  const { tasks, event } = useMockData();

  const runOfShow = React.useMemo(() => {
    return tasks
      .filter((t: any) => t.phase === "day_of" && t.dayOfSequence !== undefined)
      .sort((a: any, b: any) => (a.dayOfSequence || 0) - (b.dayOfSequence || 0))
      .slice(0, 8);
  }, [tasks]);

  return (
    <Card className="testbed-card">
      <CardHeader className="testbed-card-header">
        <CardTitle>{SYMBOLS.BLACK_SQUARE} Run of Show</CardTitle>
        <Badge variant="outline">{runOfShow.length} items</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {runOfShow.map((task: any, index) => (
            <div key={task._id} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                task.status === "completed" ? "bg-green-600 text-white" : "bg-secondary"
              }`}>
                {task.dayOfSequence}
              </div>
              <div className="flex-1 pt-1">
                <div className="font-medium text-sm">{task.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  {task.estimatedDuration && (
                    <Badge variant="outline" className="text-xs">{task.estimatedDuration}min</Badge>
                  )}
                  {task.status === "completed" && (
                    <Badge className="bg-green-600 text-xs">✓ Complete</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
