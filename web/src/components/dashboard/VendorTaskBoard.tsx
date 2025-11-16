import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface VendorTaskBoardProps {
	eventId: Id<"events">;
	vendor?: string;
	showCounts?: boolean;
}

export function VendorTaskBoard(props: VendorTaskBoardProps) {
	const { showCounts = true, vendor: initialVendor } = props;

	// Zustand state - read selected vendor from store
	const selectedVendorId = useDashboardStore((state) => state.selections.vendorId);
	const select = useDashboardStore((state) => state.select);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	// Use prop vendor if provided, otherwise use Zustand-based vendorId
	const selectedVendor = initialVendor || selectedVendorId;

	const columns = useMemo(() => {
		return [
			{
				id: "not_started",
				label: "Not Started",
				icon: SYMBOLS.CIRCLE,
			},
			{
				id: "in_progress",
				label: "In Progress",
				icon: SYMBOLS.PENCIL,
			},
			{
				id: "blocked",
				label: "Blocked",
				icon: SYMBOLS.THUNDERBOLT,
			},
			{
				id: "completed",
				label: "Completed",
				icon: SYMBOLS.CHECK_MARK,
			},
		];
	}, []);

	const { vendorTasks, groupedTasks } = useMemo(() => {
		if (!tasks) return { vendorTasks: [], groupedTasks: new Map() };

		// Filter tasks by selected vendor (using vendorId now)
		const filtered = selectedVendor
			? tasks.filter((t: any) => t.vendorId === selectedVendor)
			: tasks.filter((t: any) => t.vendorId); // Show all tasks with vendors if none selected

		// Group by status
		const groups = new Map<string, typeof tasks>();

		columns.forEach((col) => {
			groups.set(col.id, []);
		});

		filtered.forEach((task: any) => {
			const key = task.status || "not_started";
			const existing = groups.get(key) || [];
			groups.set(key, [...existing, task]);
		});

		return { vendorTasks: filtered, groupedTasks: groups };
	}, [tasks, selectedVendor, columns]);

	const handleTaskClick = (taskId: string, taskData: any) => {
		// Update Zustand store with selected task
		select("taskId", taskId);
	};

	if (tasks === undefined) {
		return <VendorTaskBoardSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <VendorTaskBoardEmpty />;
	}

	if (!selectedVendor) {
		return (
			<Card className="fluid-component-card">
				<CardHeader className="fluid-component-header">
					<CardTitle className="fluid-component-title">
						{SYMBOLS.BLACK_SQUARE} Vendor Task Board
					</CardTitle>
				</CardHeader>
				<CardContent className="py-12 text-center text-muted-foreground">
					<p className="text-sm">Select a vendor to view their tasks</p>
					<p className="text-xs mt-2">Click on a vendor from another component</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} {selectedVendor}
				</CardTitle>
				<Badge variant="outline">{vendorTasks.length} tasks</Badge>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="grid grid-cols-4 gap-4">
					{columns.map((column) => {
						const columnTasks = groupedTasks.get(column.id) || [];

						return (
							<div key={column.id} className="flex flex-col min-h-[300px]">
								{/* Column header */}
								<div className="mb-3 pb-2 border-b">
									<div className="flex items-center gap-1.5 mb-1">
										<span className="text-sm">{column.icon}</span>
										<h3 className="font-normal text-sm uppercase tracking-wide text-muted-foreground">
											{column.label}
										</h3>
									</div>
									{showCounts && (
										<span className="text-xs text-muted-foreground">
											{columnTasks.length} task{columnTasks.length !== 1 ? "s" : ""}
										</span>
									)}
								</div>

								{/* Column content */}
								<div className="flex-1 space-y-2 overflow-y-auto">
									{columnTasks.map((task: any) => (
										<div
											key={task._id}
											className={`p-3 rounded-md border transition-colors cursor-pointer ${
												column.id === "completed"
													? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900 hover:bg-green-100 dark:hover:bg-green-900"
													: column.id === "blocked"
														? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900"
														: column.id === "in_progress"
															? "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900"
															: "border-border bg-card hover:bg-accent/50"
											}`}
											onClick={() => handleTaskClick(task._id, task)}
										>
											<h4 className="font-normal text-sm line-clamp-2 mb-2">
												{task.title}
											</h4>

											<div className="flex flex-wrap items-center gap-1.5">
												{task.priority !== "medium" && (
													<Badge variant="outline" className="text-xs">
														{task.priority}
													</Badge>
												)}
												{task.phase && (
													<Badge variant="outline" className="text-xs">
														{task.phase.replace("_", " ")}
													</Badge>
												)}
												{task.criticalPath && (
													<span className="text-xs text-red-600 font-semibold">
														{SYMBOLS.STAR}
													</span>
												)}
											</div>

											{task.dueDate && (
												<div className="mt-2 text-xs text-muted-foreground">
													Due:{" "}
													{new Date(task.dueDate).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
													})}
												</div>
											)}

											{task.completionPercentage !== undefined && column.id === "in_progress" && (
												<div className="mt-2">
													<div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
														<div
															className="h-full bg-blue-600 transition-all"
															style={{ width: `${task.completionPercentage}%` }}
														/>
													</div>
												</div>
											)}
										</div>
									))}

									{columnTasks.length === 0 && (
										<div className="text-center py-8 text-muted-foreground text-sm">
											No tasks
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}

function VendorTaskBoardSkeleton() {
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

function VendorTaskBoardEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Vendor Task Board
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const VendorTaskBoardMetadata = {
	name: "VendorTaskBoard",
	description: "Kanban board for vendor-specific tasks (Detail component using Zustand)",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "400px",
		minWidth: "100%",
	},
	zustand: {
		role: "detail",
		reads: ["selections.vendorId"],
		writes: ["selections.taskId"],
		behavior: "Filters tasks by selected vendorId from Zustand. Clicking a task updates selections.taskId.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		vendor: {
			type: "string",
			required: false,
			description: "Specific vendor to display (optional)",
		},
		showCounts: {
			type: "boolean",
			required: false,
			description: "Show task counts per column",
		},
	},
};
