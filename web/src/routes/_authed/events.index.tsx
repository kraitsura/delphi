import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, Mail, PlusCircle } from "lucide-react";
import { useState } from "react";
import { EventList } from "@/components/events/event-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageHeader } from "@/hooks/usePageHeader";
import { convexQuery } from "@/lib/convex-query";

export const Route = createFileRoute("/_authed/events/")({
	component: EventsPage,
});

function EventsPage() {
	usePageHeader({ title: "My Events" });

	const [statusFilter, setStatusFilter] = useState<
		"planning" | "active" | "completed" | "cancelled" | undefined
	>(undefined);

	// Get pending invitations
	const { data: invitations = [], isLoading: invitationsLoading } = useQuery(
		convexQuery(api.eventInvitations.listByEmail, {}),
	);
	const pendingInvitations = invitations.filter((inv) => !inv.isExpired);

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
			{/* Action Button */}
			<div className="flex items-center justify-end mb-6">
				<Link to="/events/new">
					<Button className="border-2 border-black dark:border-white font-bold uppercase text-xs tracking-wide">
						<PlusCircle className="h-4 w-4 mr-2" />
						New Event
					</Button>
				</Link>
			</div>

			{/* Pending Invitations Banner */}
			{!invitationsLoading && pendingInvitations.length > 0 && (
				<div className="mb-6">
					<Card className="border-2 border-black dark:border-white">
						<CardHeader className="border-b-2 border-black dark:border-white">
							<div className="flex items-center gap-3">
								<Mail className="h-5 w-5" />
								<div className="flex-1">
									<CardTitle className="text-base font-bold uppercase tracking-tight">
										{pendingInvitations.length} Pending Invitation
										{pendingInvitations.length > 1 ? "s" : ""}
									</CardTitle>
									<p className="text-xs opacity-60 mt-1">
										YOU'VE BEEN INVITED TO COLLABORATE
									</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-4 space-y-3">
							{pendingInvitations.map((invitation) => (
								<div
									key={invitation._id}
									className="border-2 border-black dark:border-white p-3"
								>
									<div className="flex items-start gap-3">
										{invitation.inviter && (
											<Avatar className="h-10 w-10 border-2 border-black dark:border-white">
												{invitation.inviter.avatar && (
													<AvatarImage src={invitation.inviter.avatar} />
												)}
												<AvatarFallback className="bg-gray-100 dark:bg-gray-800 font-bold">
													{getInitials(invitation.inviter.name)}
												</AvatarFallback>
											</Avatar>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between gap-2 mb-2">
												<div className="flex-1 min-w-0">
													<h4 className="font-bold text-sm uppercase truncate">
														{invitation.event?.name}
													</h4>
													<p className="text-xs opacity-60">
														FROM: {invitation.inviter?.name.toUpperCase()}
													</p>
												</div>
												<Badge
													variant="secondary"
													className="uppercase text-xs font-bold border border-black dark:border-white"
												>
													{invitation.role}
												</Badge>
											</div>

											{invitation.message && (
												<p className="text-xs opacity-80 mb-2 line-clamp-2">
													"{invitation.message}"
												</p>
											)}

											<div className="flex items-center gap-3 text-xs opacity-60 mb-3">
												<span className="uppercase">
													{invitation.event?.type}
												</span>
												<span>•</span>
												<span>
													EXP:{" "}
													{formatDistanceToNow(invitation.expiresAt, {
														addSuffix: true,
													})}
												</span>
											</div>

											<Link
												to="/invitations/$token"
												params={{ token: invitation.token }}
											>
												<Button
													size="sm"
													className="border-2 border-black dark:border-white font-bold uppercase text-xs"
												>
													<CheckCircle className="h-3 w-3 mr-2" />
													View
												</Button>
											</Link>
										</div>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			)}

			{/* Status Filter */}
			<div className="mb-6">
				<div className="flex flex-wrap gap-2">
					<button
						onClick={() => setStatusFilter(undefined)}
						className={`px-4 py-2 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wide transition-colors ${
							statusFilter === undefined
								? "bg-black dark:bg-white text-white dark:text-black"
								: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900"
						}`}
					>
						All
					</button>
					<button
						onClick={() => setStatusFilter("planning")}
						className={`px-4 py-2 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wide transition-colors ${
							statusFilter === "planning"
								? "bg-black dark:bg-white text-white dark:text-black"
								: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900"
						}`}
					>
						Planning
					</button>
					<button
						onClick={() => setStatusFilter("active")}
						className={`px-4 py-2 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wide transition-colors ${
							statusFilter === "active"
								? "bg-black dark:bg-white text-white dark:text-black"
								: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900"
						}`}
					>
						Active
					</button>
					<button
						onClick={() => setStatusFilter("completed")}
						className={`px-4 py-2 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-wide transition-colors ${
							statusFilter === "completed"
								? "bg-black dark:bg-white text-white dark:text-black"
								: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900"
						}`}
					>
						Completed
					</button>
				</div>
			</div>

			{/* Events List */}
			<div className="pb-6">
				<EventList status={statusFilter} />
			</div>
		</div>
	);
}
