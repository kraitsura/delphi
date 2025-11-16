import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface TasksByVendorProps {
	eventId: Id<"events">;
	showProgress?: boolean;
	showUnassigned?: boolean;
}

export function TasksByVendor(props: TasksByVendorProps) {
	const { showProgress = true, showUnassigned = true } = props;

	// Zustand: Read and write vendor selection
	const selectedVendor = useDashboardStore((state) => state.selections.vendorId);
	const select = useDashboardStore((state) => state.select);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const vendorGroups = useMemo(() => {
		if (!tasks) return [];

		// Group tasks by vendor
		const vendorMap = new Map<string, any[]>();

		tasks.forEach((task: any) => {
			const vendor = task.vendor || (showUnassigned ? "Unassigned" : null);
			if (vendor) {
				const existing = vendorMap.get(vendor) || [];
				vendorMap.set(vendor, [...existing, task]);
			}
		});

		// Convert to array and calculate stats
		return Array.from(vendorMap.entries())
			.map(([vendor, tasks]) => {
				const total = tasks.length;
				const completed = tasks.filter((t) => t.status === "completed").length;
				const inProgress = tasks.filter((t) => t.status === "in_progress").length;
				const blocked = tasks.filter((t) => t.status === "blocked").length;
				const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

				return {
					vendor,
					tasks,
					total,
					completed,
					inProgress,
					blocked,
					progress,
				};
			})
			.sort((a, b) => {
				// Sort Unassigned last, then by number of tasks
				if (a.vendor === "Unassigned") return 1;
				if (b.vendor === "Unassigned") return -1;
				return b.total - a.total;
			});
	}, [tasks, showUnassigned]);

	const handleVendorClick = (vendor: string) => {
		// Toggle vendor selection (click same vendor to deselect)
		const newVendor = selectedVendor === vendor ? null : vendor;

		// Update Zustand store with new selection
		if (newVendor && newVendor !== "Unassigned") {
			select("vendorId", newVendor);
		} else {
			// Clear selection when clicking Unassigned or deselecting
			select("vendorId", null);
		}
	};

	const handleTaskClick = (taskId: string, taskData: any) => {
		// Update Zustand store with selected task
		select("taskId", taskId);
	};

	if (tasks === undefined) {
		return <TasksByVendorSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <TasksByVendorEmpty />;
	}

	if (vendorGroups.length === 0) {
		return <TasksByVendorEmpty />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks by Vendor
				</CardTitle>
				<Badge variant="outline">{vendorGroups.length} vendors</Badge>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="space-y-3">
					{vendorGroups.map((group) => (
						<div
							key={group.vendor}
							className="border border-border rounded-lg overflow-hidden"
						>
							{/* Vendor header */}
							<div
								className={`p-3 cursor-pointer transition-colors ${
									selectedVendor === group.vendor
										? "bg-accent/70 border-b-2 border-primary"
										: "bg-card hover:bg-accent/30"
								}`}
								onClick={() => handleVendorClick(group.vendor)}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="text-lg">{SYMBOLS.HANDSHAKE}</span>
										<h3 className="font-medium text-sm">
											{group.vendor}
											{group.vendor === "Unassigned" && (
												<span className="text-muted-foreground ml-1">(No vendor)</span>
											)}
										</h3>
										<Badge variant="outline" className="text-xs">
											{group.total}
										</Badge>
									</div>

									{showProgress && group.total > 0 && (
										<div className="flex items-center gap-2">
											{group.blocked > 0 && (
												<Badge variant="destructive" className="text-xs">
													{group.blocked} blocked
												</Badge>
											)}
											<div className="w-24 bg-secondary h-2 rounded-full overflow-hidden">
												<div
													className="h-full bg-primary transition-all"
													style={{ width: `${group.progress}%` }}
												/>
											</div>
											<span className="text-xs text-muted-foreground w-8 text-right">
												{group.progress}%
											</span>
										</div>
									)}
								</div>
							</div>

							{/* Vendor tasks */}
							{selectedVendor === group.vendor && (
								<div className="p-3 space-y-2 bg-accent/10">
									{group.tasks.map((task: any) => (
										<div
											key={task._id}
											className="p-2 rounded-md bg-card hover:bg-accent/50 transition-colors cursor-pointer border border-border/50"
											onClick={(e) => {
												e.stopPropagation();
												handleTaskClick(task._id, task);
											}}
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1 min-w-0">
													<h4 className="font-normal text-sm">{task.title}</h4>
													<div className="flex flex-wrap items-center gap-1 mt-1">
														<Badge
															variant="outline"
															className={`text-xs ${
																task.status === "completed"
																	? "bg-green-100 dark:bg-green-900"
																	: task.status === "blocked"
																		? "bg-red-100 dark:bg-red-900"
																		: task.status === "in_progress"
																			? "bg-blue-100 dark:bg-blue-900"
																			: ""
															}`}
														>
															{task.status.replace("_", " ")}
														</Badge>
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
																{SYMBOLS.STAR} Critical
															</span>
														)}
													</div>
												</div>
												{task.dueDate && (
													<span className="text-xs text-muted-foreground">
														{new Date(task.dueDate).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
														})}
													</span>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksByVendorSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function TasksByVendorEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Tasks by Vendor
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No vendor tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const TasksByVendorMetadata = {
	name: "TasksByVendor",
	description: "Groups tasks by vendor/supplier. Master component - updates vendorId and taskId in Zustand store.",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "400px",
	},
	// Zustand integration - this is a master component
	zustand: {
		writes: ["vendorId", "taskId"], // Selection keys this component updates
		reads: ["vendorId"], // Selection keys this component reads
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showProgress: {
			type: "boolean",
			required: false,
			description: "Show progress bars for each vendor",
		},
		showUnassigned: {
			type: "boolean",
			required: false,
			description: "Show tasks without assigned vendors",
		},
	},
};
