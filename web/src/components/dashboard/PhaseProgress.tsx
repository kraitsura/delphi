import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface PhaseProgressProps {
	eventId: Id<"events">;
	showPercentages?: boolean;
	showTaskCounts?: boolean;
}

export function PhaseProgress(props: PhaseProgressProps) {
	const { showPercentages = true, showTaskCounts = true } = props;

	// Zustand state - read selected phase from store
	const selectedPhase = useDashboardStore((state) => state.selections.phase);
	const select = useDashboardStore((state) => state.select);
	const clearSelection = useDashboardStore((state) => state.clearSelection);

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });

	const phases = useMemo(() => {
		return [
			{ id: "planning", label: "Planning", icon: SYMBOLS.PENCIL },
			{ id: "vendor_selection", label: "Vendor Selection", icon: SYMBOLS.HANDSHAKE },
			{ id: "design", label: "Design", icon: SYMBOLS.PALETTE },
			{ id: "logistics", label: "Logistics", icon: SYMBOLS.TRUCK },
			{ id: "day_of", label: "Day Of", icon: SYMBOLS.CALENDAR },
			{ id: "post_event", label: "Post Event", icon: SYMBOLS.CHECK_MARK },
		];
	}, []);

	const phaseStats = useMemo(() => {
		if (!tasks) return [];

		return phases.map((phase) => {
			const phaseTasks = tasks.filter((t: any) => (t.phase || "planning") === phase.id);
			const completed = phaseTasks.filter((t: any) => t.status === "completed").length;
			const inProgress = phaseTasks.filter((t: any) => t.status === "in_progress").length;
			const blocked = phaseTasks.filter((t: any) => t.status === "blocked").length;
			const total = phaseTasks.length;
			const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

			return {
				...phase,
				total,
				completed,
				inProgress,
				blocked,
				progress,
				status:
					total === 0
						? "empty"
						: progress === 100
							? "complete"
							: blocked > 0
								? "blocked"
								: inProgress > 0
									? "in_progress"
									: "not_started",
			};
		});
	}, [tasks, phases]);

	const overallProgress = useMemo(() => {
		const totalTasks = phaseStats.reduce((sum, phase) => sum + phase.total, 0);
		const completedTasks = phaseStats.reduce((sum, phase) => sum + phase.completed, 0);
		return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
	}, [phaseStats]);

	const handlePhaseClick = (phaseId: string, phaseName: string) => {
		const newPhase = selectedPhase === phaseId ? null : phaseId;

		if (newPhase) {
			// Update Zustand store with selected phase
			select("phase", newPhase);
		} else {
			// Clear phase selection in Zustand
			clearSelection("phase");
		}
	};

	if (tasks === undefined) {
		return <PhaseProgressSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <PhaseProgressEmpty />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Phase Progress
				</CardTitle>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Overall Progress</span>
					<Badge variant="outline">{overallProgress}%</Badge>
				</div>
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Overall progress bar */}
				<div className="mb-6">
					<div className="w-full bg-secondary h-4 rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all duration-500"
							style={{ width: `${overallProgress}%` }}
						/>
					</div>
				</div>

				{/* Phase breakdown */}
				<div className="space-y-4">
					{phaseStats.map((phase) => (
						<div
							key={phase.id}
							className={`p-3 rounded-lg border cursor-pointer transition-all ${
								selectedPhase === phase.id
									? "border-primary bg-accent/50"
									: "border-border hover:bg-accent/30"
							}`}
							onClick={() => handlePhaseClick(phase.id, phase.label)}
						>
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-2">
									<span>{phase.icon}</span>
									<span className="font-medium text-sm">{phase.label}</span>
									{showTaskCounts && (
										<Badge variant="outline" className="text-xs">
											{phase.completed}/{phase.total}
										</Badge>
									)}
								</div>

								<div className="flex items-center gap-2">
									{phase.blocked > 0 && (
										<Badge variant="destructive" className="text-xs">
											{phase.blocked} blocked
										</Badge>
									)}
									{showPercentages && (
										<span className="text-sm font-semibold text-muted-foreground">
											{phase.progress}%
										</span>
									)}
									{phase.status === "complete" && (
										<span className="text-green-600">{SYMBOLS.CHECK_MARK}</span>
									)}
								</div>
							</div>

							{/* Progress bar */}
							{phase.total > 0 && (
								<div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
									<div className="flex h-full">
										<div
											className="bg-green-600 transition-all duration-300"
											style={{
												width: `${(phase.completed / phase.total) * 100}%`,
											}}
										/>
										<div
											className="bg-blue-600 transition-all duration-300"
											style={{
												width: `${(phase.inProgress / phase.total) * 100}%`,
											}}
										/>
										<div
											className="bg-red-600 transition-all duration-300"
											style={{
												width: `${(phase.blocked / phase.total) * 100}%`,
											}}
										/>
									</div>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Legend */}
				<div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-green-600 rounded" />
						<span>Completed</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-blue-600 rounded" />
						<span>In Progress</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-red-600 rounded" />
						<span>Blocked</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function PhaseProgressSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-4 w-full mb-6" />
				<div className="space-y-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-20 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function PhaseProgressEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Phase Progress
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No tasks yet</p>
			</CardContent>
		</Card>
	);
}

export const PhaseProgressMetadata = {
	name: "PhaseProgress",
	description: "Visual progress tracker across all planning phases (Master component using Zustand)",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "400px",
	},
	zustand: {
		role: "master",
		writes: ["selections.phase"],
		reads: ["selections.phase"],
		behavior: "Clicking a phase updates selections.phase. Clicking again clears it. Shows selected state.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		showPercentages: {
			type: "boolean",
			required: false,
			description: "Show percentage completion for each phase",
		},
		showTaskCounts: {
			type: "boolean",
			required: false,
			description: "Show completed/total task counts",
		},
	},
};
