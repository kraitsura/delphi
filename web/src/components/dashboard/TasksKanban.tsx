import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { api } from "convex/_generated/api";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

// Droppable column wrapper
function DroppableColumn({
	id,
	children,
}: {
	id: string;
	children: React.ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id,
	});

	return (
		<div
			ref={setNodeRef}
			className={`flex-1 space-y-2 overflow-y-auto transition-colors ${
				isOver ? "bg-accent/20 rounded-md" : ""
			}`}
		>
			{children}
		</div>
	);
}

// Draggable task card
function DraggableTask({
	task,
	onSelect,
}: {
	task: Doc<"tasks">;
	onSelect: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: task._id,
			data: {
				task,
			},
		});

	const style = {
		transform: CSS.Translate.toString(transform),
		opacity: isDragging ? 0.5 : 1,
	};

	const formatDate = (timestamp: number | undefined) => {
		if (!timestamp) return null;

		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.ceil(
			(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (diffDays < 0) {
			return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
		} else if (diffDays === 0) {
			return { text: "Today", isOverdue: false };
		} else if (diffDays === 1) {
			return { text: "Tomorrow", isOverdue: false };
		} else if (diffDays < 7) {
			return { text: `${diffDays}d`, isOverdue: false };
		}
		return null;
	};

	const dueInfo = formatDate(task.deadline);

	return (
		<button
			type="button"
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className="w-full text-left p-3 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing"
			onClick={onSelect}
		>
			<h4 className="font-normal text-sm line-clamp-2">{task.title}</h4>

			<div className="flex flex-wrap items-center gap-1.5 mt-2">
				{task.priority !== "medium" && (
					<Badge variant="outline" className="text-xs">
						{task.priority}
					</Badge>
				)}

				{task.category && (
					<Badge variant="outline" className="text-xs">
						{task.category}
					</Badge>
				)}

				{dueInfo && (
					<span
						className={`text-xs ${
							dueInfo.isOverdue
								? "text-red-600 font-semibold"
								: "text-muted-foreground"
						}`}
					>
						{dueInfo.text}
					</span>
				)}
			</div>

			{/* Assignee */}
			{task.assignedTo && (
				<div className="mt-2 flex items-center gap-2">
					<Avatar className="h-6 w-6">
						<AvatarFallback className="text-xs">
							{task.assignedTo.substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</div>
			)}
		</button>
	);
}

export interface TasksKanbanProps {
	eventId: Id<"events">;
	columns?: string[];
	columnCount?: 1 | 2 | 4;
	groupBy?: "status" | "priority" | "assignee" | "category";
	showCounts?: boolean;
	onTaskSelect?: (taskId: Id<"tasks">) => void;
}

export function TasksKanban(props: TasksKanbanProps) {
	const {
		groupBy = "status",
		showCounts = true,
		onTaskSelect,
		columnCount = 4,
	} = props;

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const updateStatus = useMutation(api.tasks.updateStatus);

	// Zustand integration - read selections to filter
	const selectedCategory = useDashboardStore(
		(state) => state.selections.category,
	);
	const select = useDashboardStore((state) => state.select);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);
	const openModal = useDashboardStore((state) => state.openModal);

	// Drag-and-drop state
	const [activeTask, setActiveTask] = useState<Doc<"tasks"> | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Require 8px of movement before drag starts
			},
		}),
	);

	const columns = useMemo(() => {
		if (groupBy === "status") {
			return [
				{
					id: "todo",
					label: "Not Started",
					color: "bg-gray-100 dark:bg-gray-800",
				},
				{
					id: "in_progress",
					label: "In Progress",
					color: "bg-blue-100 dark:bg-blue-900",
				},
				{
					id: "blocked",
					label: "Blocked",
					color: "bg-red-100 dark:bg-red-900",
				},
				{
					id: "completed",
					label: "Completed",
					color: "bg-green-100 dark:bg-green-900",
				},
			];
		}
		return [];
	}, [groupBy]);

	const groupedTasks = useMemo(() => {
		if (!tasks) return new Map();

		// Filter tasks based on Zustand selections
		let filteredTasks = tasks;

		if (selectedCategory) {
			filteredTasks = filteredTasks.filter(
				(t) => t.category === selectedCategory,
			);
		}

		const groups = new Map<string, typeof tasks>();

		// Initialize all columns
		columns.forEach((col) => {
			groups.set(col.id, []);
		});

		// Group filtered tasks
		filteredTasks.forEach((task) => {
			const key =
				groupBy === "status"
					? task.status
					: groupBy === "priority"
						? task.priority
						: groupBy === "assignee"
							? task.assignedTo || "unassigned"
							: task.category || "uncategorized";

			const existing = groups.get(key) || [];
			groups.set(key, [...existing, task]);
		});

		return groups;
	}, [tasks, columns, groupBy, selectedCategory]);

	// Drag handlers
	const handleDragStart = (event: DragStartEvent) => {
		const task = event.active.data.current?.task as Doc<"tasks"> | undefined;
		if (task) {
			setActiveTask(task);
		}
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveTask(null);

		if (!over) return;

		const taskId = active.id as Id<"tasks">;
		const newStatus = over.id as Doc<"tasks">["status"];
		const task = active.data.current?.task as Doc<"tasks"> | undefined;

		if (!task) return;

		// Only update if status actually changed
		if (task.status === newStatus) return;

		// Don't allow updating to or from cancelled status
		if (newStatus === "cancelled" || task.status === "cancelled") return;

		try {
			await updateStatus({
				taskId,
				status: newStatus as "todo" | "in_progress" | "blocked" | "completed",
			});
			showToast(
				`Moved to ${columns.find((c) => c.id === newStatus)?.label}`,
				"success",
			);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to update task",
			);
		}
	};

	if (tasks === undefined) {
		return <TasksKanbanSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <TasksKanbanEmpty />;
	}

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<Card data-testid="tasks-kanban" className="fluid-component-card">
				<CardHeader className="fluid-component-header">
					<div className="flex items-center justify-between">
						<CardTitle className="fluid-component-title">
							{SYMBOLS.BLACK_SQUARE} Tasks Board
						</CardTitle>
						<Button
							size="sm"
							onClick={() =>
								openModal("add-task", "AddTaskModal", {
									eventId: props.eventId,
									modalId: "add-task",
								})
							}
						>
							{SYMBOLS.PLUS} Add Task
						</Button>
					</div>
				</CardHeader>

				<CardContent className="fluid-component-content">
					<div
						className={`grid gap-4 ${columnCount === 1 ? "grid-cols-1" : columnCount === 2 ? "grid-cols-2" : "grid-cols-4"}`}
					>
						{columns.slice(0, columnCount).map((column) => {
							const columnTasks = groupedTasks.get(column.id) || [];

							return (
								<div key={column.id} className="flex flex-col min-h-[400px]">
									{/* Column header */}
									<div className="mb-3 pb-2 border-b">
										<h3 className="font-normal text-sm uppercase tracking-wide text-muted-foreground">
											{column.label}
										</h3>
										{showCounts && (
											<span className="text-xs text-muted-foreground">
												{columnTasks.length} task
												{columnTasks.length !== 1 ? "s" : ""}
											</span>
										)}
									</div>

									{/* Column content - Droppable */}
									<DroppableColumn id={column.id}>
										{columnTasks.map((task: Doc<"tasks">) => (
											<DraggableTask
												key={task._id}
												task={task}
												onSelect={() => {
													select("taskId", task._id);
													onTaskSelect?.(task._id);
													openModal("task-details", "TaskDetails", {
														taskId: task._id,
														modalId: "task-details",
													});
												}}
											/>
										))}

										{columnTasks.length === 0 && (
											<div className="text-center py-8 text-muted-foreground text-sm">
												No tasks
											</div>
										)}
									</DroppableColumn>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{/* Drag overlay for visual feedback */}
			<DragOverlay>
				{activeTask ? (
					<div className="w-64 p-3 rounded-md border border-border bg-card shadow-lg opacity-80">
						<h4 className="font-normal text-sm line-clamp-2">
							{activeTask.title}
						</h4>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

function TasksKanbanSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-24 w-full" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksKanbanEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks Board
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const TasksKanbanMetadata = {
	name: "TasksKanban",
	description: "Kanban board view with status columns",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minWidth: "100%",
		minHeight: "400px",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		columnCount: {
			type: "number",
			required: false,
			description: "Number of columns to display (1, 2, or 4)",
		},
		groupBy: {
			type: "enum",
			required: false,
			values: ["status", "priority", "assignee", "category"],
			description: "Group tasks by field",
		},
		showCounts: {
			type: "boolean",
			required: false,
			description: "Show task counts per column",
		},
	},
	zustand: {
		role: "detail",
		reads: ["selections.category"],
		writes: ["selections.taskId"],
		behavior:
			"Filters kanban board by category selection. Clicking a task updates taskId.",
	},
};
