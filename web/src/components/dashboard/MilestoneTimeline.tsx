import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface MilestoneTimelineProps {
	eventId: Id<"events">;
	view?: "timeline" | "list";
	showDates?: boolean;
}

export function MilestoneTimeline(props: MilestoneTimelineProps) {
	const { view = "timeline", showDates = true } = props;

	const tasks = useQuery(api.tasks.listByEvent, { eventId: props.eventId });
	const event = useQuery(api.events.getById, { eventId: props.eventId });

	// Zustand state - read selected phase from store
	const selectedPhase = useDashboardStore((state) => state.selections.phase);
	const select = useDashboardStore((state) => state.select);

	const milestones = useMemo(() => {
		if (!tasks || !event) return [];

		const phases = [
			{
				id: "planning",
				label: "Planning Complete",
				icon: SYMBOLS.PENCIL,
				order: 1,
			},
			{
				id: "vendor_selection",
				label: "Vendors Secured",
				icon: SYMBOLS.HANDSHAKE,
				order: 2,
			},
			{
				id: "design",
				label: "Design Finalized",
				icon: SYMBOLS.PALETTE,
				order: 3,
			},
			{
				id: "logistics",
				label: "Logistics Ready",
				icon: SYMBOLS.TRUCK,
				order: 4,
			},
			{ id: "day_of", label: "Event Day", icon: SYMBOLS.CALENDAR, order: 5 },
			{
				id: "post_event",
				label: "Wrap Up",
				icon: SYMBOLS.CHECK_MARK,
				order: 6,
			},
		];

		return phases.map((phase) => {
			const phaseTasks = tasks.filter(
				(t: any) => (t.phase || "planning") === phase.id,
			);
			const total = phaseTasks.length;
			const completed = phaseTasks.filter(
				(t: any) => t.status === "completed",
			).length;
			const isComplete = total > 0 && completed === total;
			const latestDueDate = phaseTasks.reduce(
				(latest: number | null, t: any) => {
					if (!t.dueDate) return latest;
					return latest === null || t.dueDate > latest ? t.dueDate : latest;
				},
				null,
			);

			return {
				...phase,
				total,
				completed,
				isComplete,
				targetDate: latestDueDate || event.eventDate,
				isHighlighted: selectedPhase === phase.id,
			};
		});
	}, [tasks, event, selectedPhase]);

	const handleMilestoneClick = (phaseId: string, _phaseName: string) => {
		// Update Zustand store with selected phase
		select("phase", phaseId);
	};

	const formatDate = (timestamp: number | undefined) => {
		if (!timestamp) return "N/A";
		const date = new Date(timestamp);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	};

	if (tasks === undefined || event === undefined) {
		return <MilestoneTimelineSkeleton />;
	}

	if (!tasks || tasks.length === 0) {
		return <MilestoneTimelineEmpty />;
	}

	if (view === "list") {
		return (
			<Card className="fluid-component-card">
				<CardHeader className="fluid-component-header">
					<CardTitle className="fluid-component-title">
						{SYMBOLS.BLACK_SQUARE} Milestones
					</CardTitle>
				</CardHeader>

				<CardContent className="fluid-component-content">
					<div className="space-y-3">
						{milestones.map((milestone) => (
							<div
								key={milestone.id}
								className={`p-3 rounded-lg border cursor-pointer transition-colors ${
									milestone.isHighlighted
										? "border-primary bg-accent/50"
										: "border-border hover:bg-accent/30"
								}`}
								onClick={() =>
									handleMilestoneClick(milestone.id, milestone.label)
								}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span
											className={milestone.isComplete ? "text-green-600" : ""}
										>
											{milestone.icon}
										</span>
										<span className="font-medium text-sm">
											{milestone.label}
										</span>
										{milestone.isComplete && (
											<Badge
												variant="outline"
												className="text-xs bg-green-100 dark:bg-green-900"
											>
												Complete
											</Badge>
										)}
									</div>
									{showDates && (
										<span className="text-xs text-muted-foreground">
											{formatDate(milestone.targetDate)}
										</span>
									)}
								</div>
								{milestone.total > 0 && (
									<div className="mt-2 flex items-center gap-2">
										<div className="flex-1 bg-secondary h-1.5 rounded-full overflow-hidden">
											<div
												className={`h-full transition-all ${
													milestone.isComplete ? "bg-green-600" : "bg-primary"
												}`}
												style={{
													width: `${(milestone.completed / milestone.total) * 100}%`,
												}}
											/>
										</div>
										<span className="text-xs text-muted-foreground">
											{milestone.completed}/{milestone.total}
										</span>
									</div>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	// Timeline view
	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Milestone Timeline
				</CardTitle>
			</CardHeader>

			<CardContent className="fluid-component-content">
				<div className="relative">
					{/* Timeline line */}
					<div className="absolute left-[19px] top-8 bottom-14 w-0.5 bg-border" />

					{/* Milestones */}
					<div className="space-y-6">
						{milestones.map((milestone) => (
							<div key={milestone.id} className="relative pl-12">
								{/* Timeline dot */}
								<div
									className={`absolute left-0 top-1 w-10 h-10 rounded-full flex items-center justify-center ${
										milestone.isComplete
											? "bg-green-600 text-white"
											: milestone.total > 0 && milestone.completed > 0
												? "bg-blue-600 text-white"
												: "bg-secondary text-muted-foreground"
									} ${milestone.isHighlighted ? "ring-4 ring-primary/30" : ""}`}
								>
									<span className="text-lg">{milestone.icon}</span>
								</div>

								{/* Milestone content */}
								<div
									className={`p-3 rounded-lg border cursor-pointer transition-colors ${
										milestone.isHighlighted
											? "border-primary bg-accent/50"
											: "border-border hover:bg-accent/30"
									}`}
									onClick={() =>
										handleMilestoneClick(milestone.id, milestone.label)
									}
								>
									<div className="flex items-center justify-between mb-2">
										<h3 className="font-medium">{milestone.label}</h3>
										{milestone.isComplete && (
											<Badge
												variant="outline"
												className="text-xs bg-green-100 dark:bg-green-900"
											>
												{SYMBOLS.CHECK_MARK} Complete
											</Badge>
										)}
									</div>

									{showDates && (
										<p className="text-xs text-muted-foreground mb-2">
											Target: {formatDate(milestone.targetDate)}
										</p>
									)}

									{milestone.total > 0 && (
										<div className="flex items-center gap-2">
											<div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
												<div
													className={`h-full transition-all ${
														milestone.isComplete ? "bg-green-600" : "bg-primary"
													}`}
													style={{
														width: `${(milestone.completed / milestone.total) * 100}%`,
													}}
												/>
											</div>
											<span className="text-xs text-muted-foreground">
												{milestone.completed}/{milestone.total} tasks
											</span>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function MilestoneTimelineSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-1/3" />
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function MilestoneTimelineEmpty() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Milestone Timeline
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p>No milestones yet</p>
			</CardContent>
		</Card>
	);
}

export const MilestoneTimelineMetadata = {
	name: "MilestoneTimeline",
	description:
		"Timeline view of major project milestones and phases (Master + Detail using Zustand)",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "450px",
	},
	zustand: {
		role: "both",
		writes: ["selections.phase"],
		reads: ["selections.phase"],
		behavior:
			"Clicking a milestone updates selections.phase. Also highlights milestones based on selected phase from other components.",
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		view: {
			type: "enum",
			required: false,
			values: ["timeline", "list"],
			description: "Display mode for milestones",
		},
		showDates: {
			type: "boolean",
			required: false,
			description: "Show target dates for each milestone",
		},
	},
};
