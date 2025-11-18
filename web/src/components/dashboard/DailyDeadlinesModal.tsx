import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface DailyDeadlinesModalProps {
  eventId: Id<"events">;
  date: number; // Unix timestamp of the selected day
  modalId: string;
}

// Helper function to check if two dates are the same day
function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function DailyDeadlinesModal(props: DailyDeadlinesModalProps) {
  const { eventId, date, modalId } = props;

  // Zustand actions
  const closeModal = useDashboardStore((state) => state.closeModal);
  const openModal = useDashboardStore((state) => state.openModal);
  const showToast = useDashboardStore((state) => state.showToast);
  const addError = useDashboardStore((state) => state.addError);

  // Convex queries and mutations
  const event = useQuery(api.events.getById, { eventId });
  const allTasks = useQuery(api.tasks.listByEvent, { eventId });
  const updateStatus = useMutation(api.tasks.updateStatus);

  // Local state for expandable tasks
  const [expandedTasks, setExpandedTasks] = useState<Set<Id<"tasks">>>(
    new Set(),
  );

  // Filter tasks for this specific day
  const tasksForDay = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(
      (task) => task.deadline && isSameDay(task.deadline, date),
    );
  }, [allTasks, date]);

  // Group tasks by priority for better organization
  const tasksByPriority = useMemo(() => {
    const groups: Record<string, typeof tasksForDay> = {
      urgent: [],
      high: [],
      medium: [],
      low: [],
    };

    tasksForDay.forEach((task) => {
      groups[task.priority].push(task);
    });

    return groups;
  }, [tasksForDay]);

  const handleClose = () => {
    closeModal(modalId);
  };

  const toggleExpand = (taskId: Id<"tasks">) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleViewDetails = (taskId: Id<"tasks">) => {
    openModal("task-details", "TaskDetails", {
      taskId,
      modalId: "task-details",
    });
  };

  const handleQuickStatusChange = async (
    taskId: Id<"tasks">,
    status: "todo" | "in_progress" | "blocked" | "completed",
  ) => {
    try {
      await updateStatus({ taskId, status });
      showToast(`Task marked as ${status.replace("_", " ")}`, "success");
    } catch (error) {
      console.error("Failed to update status:", error);
      addError("Failed to update task status");
    }
  };

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Check if this is the event date
  const isEventDate = event?.eventDate ? isSameDay(event.eventDate, date) : false;

  // Loading state
  if (allTasks === undefined || event === undefined) {
    return (
      <Dialog open onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const priorityConfig = {
    urgent: {
      color: "bg-red-500",
      label: "Urgent",
      symbol: SYMBOLS.THUNDERBOLT,
    },
    high: {
      color: "bg-orange-500",
      label: "High",
      symbol: SYMBOLS.TRIANGLE_UP,
    },
    medium: {
      color: "bg-yellow-400",
      label: "Medium",
      symbol: SYMBOLS.ARROW_RIGHT,
    },
    low: { color: "bg-slate-400", label: "Low", symbol: SYMBOLS.TRIANGLE_DOWN },
  };

  const statusConfig = {
    todo: { variant: "secondary" as const, label: "To Do" },
    in_progress: { variant: "default" as const, label: "In Progress" },
    blocked: { variant: "destructive" as const, label: "Blocked" },
    completed: { variant: "outline" as const, label: "Completed" },
    cancelled: { variant: "outline" as const, label: "Cancelled" },
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEventDate ? event.name : `Deadlines for ${formattedDate}`}
          </DialogTitle>
          <DialogDescription>
            {isEventDate && <span className="font-semibold">Event Date • </span>}
            {tasksForDay.length === 0
              ? "No tasks due on this day"
              : `${tasksForDay.length} task${tasksForDay.length === 1 ? "" : "s"} due`}
          </DialogDescription>
        </DialogHeader>

        {isEventDate && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{event.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This is your event day! {formattedDate}
            </p>
          </div>
        )}

        {tasksForDay.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No deadlines for this day</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {(["urgent", "high", "medium", "low"] as const).map((priority) => {
              const tasks = tasksByPriority[priority];
              if (tasks.length === 0) return null;

              const config = priorityConfig[priority];

              return (
                <div key={priority}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                    <h3 className="font-semibold text-sm">
                      {config.symbol} {config.label} Priority ({tasks.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const isExpanded = expandedTasks.has(task._id);

                      return (
                        <div
                          key={task._id}
                          className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(task._id)}
                                  className="text-left font-medium hover:underline flex-1"
                                >
                                  {task.title}
                                </button>
                                <Badge
                                  variant={statusConfig[task.status].variant}
                                  className="text-xs"
                                >
                                  {statusConfig[task.status].label}
                                </Badge>
                              </div>

                              {isExpanded && (
                                <div className="mt-3 space-y-3">
                                  {task.description && (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {task.category && (
                                      <div className="flex items-center gap-1">
                                        <span>{SYMBOLS.BLACK_CIRCLE}</span>
                                        <span className="capitalize">
                                          {task.category}
                                        </span>
                                      </div>
                                    )}
                                    {task.phase && (
                                      <div className="flex items-center gap-1">
                                        <span>{SYMBOLS.CALENDAR}</span>
                                        <span className="capitalize">
                                          {task.phase.replace("_", " ")}
                                        </span>
                                      </div>
                                    )}
                                    {task.estimatedDuration && (
                                      <div className="flex items-center gap-1">
                                        <span>⏳</span>
                                        <span>
                                          {task.estimatedDuration} min
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <Separator />

                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleViewDetails(task._id)
                                      }
                                    >
                                      {SYMBOLS.CIRCLE} Details
                                    </Button>

                                    {task.status !== "completed" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleQuickStatusChange(
                                            task._id,
                                            "completed",
                                          )
                                        }
                                      >
                                        {SYMBOLS.CHECK_MARK} Complete
                                      </Button>
                                    )}

                                    {task.status === "completed" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleQuickStatusChange(
                                            task._id,
                                            "todo",
                                          )
                                        }
                                      >
                                        × Reopen
                                      </Button>
                                    )}

                                    {task.status === "todo" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleQuickStatusChange(
                                            task._id,
                                            "in_progress",
                                          )
                                        }
                                      >
                                        {SYMBOLS.ARROW_RIGHT} Start
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleExpand(task._id)}
                              className="shrink-0"
                            >
                              {isExpanded
                                ? SYMBOLS.TRIANGLE_UP
                                : SYMBOLS.TRIANGLE_DOWN}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
