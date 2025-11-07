import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	Calendar,
	CheckCircle,
	Clock,
	Mail,
	PlusCircle,
	Shield,
	User,
} from "lucide-react";
import { useState } from "react";
import { EventList } from "@/components/events/event-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authed/events/")({
	component: EventsPage,
});

function EventsPage() {
	const [statusFilter, setStatusFilter] = useState<
		| "planning"
		| "in_progress"
		| "completed"
		| "cancelled"
		| "archived"
		| undefined
	>(undefined);

	// Get pending invitations
	const invitations = useQuery(api.eventInvitations.listByEmail);
	const pendingInvitations = invitations?.filter((inv) => !inv.isExpired) || [];

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "coordinator":
				return <Shield className="h-4 w-4 text-purple-600" />;
			case "collaborator":
				return <User className="h-4 w-4 text-blue-600" />;
			case "guest":
				return <Mail className="h-4 w-4 text-gray-600" />;
			default:
				return <User className="h-4 w-4" />;
		}
	};

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
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold mb-2">My Events</h1>
					<p className="text-gray-600">
						Manage and track all your events in one place
					</p>
				</div>
				<Link to="/events/new">
					<Button>
						<PlusCircle className="h-5 w-5 mr-2" />
						Create Event
					</Button>
				</Link>
			</div>

			{/* Pending Invitations Banner */}
			{pendingInvitations.length > 0 && (
				<div className="mb-8">
					<Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
									<Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
								</div>
								<div className="flex-1">
									<CardTitle className="text-lg">
										You have {pendingInvitations.length} pending invitation
										{pendingInvitations.length > 1 ? "s" : ""}
									</CardTitle>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										You've been invited to collaborate on events
									</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{pendingInvitations.map((invitation) => (
								<Card
									key={invitation._id}
									className="bg-white dark:bg-gray-800/50"
								>
									<CardContent className="pt-4">
										<div className="flex items-start gap-3">
											{invitation.inviter && (
												<Avatar className="h-10 w-10">
													{invitation.inviter.avatar && (
														<AvatarImage src={invitation.inviter.avatar} />
													)}
													<AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
														{getInitials(invitation.inviter.name)}
													</AvatarFallback>
												</Avatar>
											)}
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-2 mb-2">
													<div className="flex-1 min-w-0">
														<h4 className="font-semibold truncate dark:text-gray-100">
															{invitation.event?.name}
														</h4>
														<p className="text-sm text-gray-600 dark:text-gray-400">
															{invitation.inviter?.name} invited you
														</p>
													</div>
													<div className="flex items-center gap-2 flex-shrink-0">
														{getRoleIcon(invitation.role)}
														<Badge variant="secondary" className="capitalize">
															{invitation.role}
														</Badge>
													</div>
												</div>

												{invitation.message && (
													<p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2 line-clamp-2">
														"{invitation.message}"
													</p>
												)}

												<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
													<div className="flex items-center gap-1">
														<Calendar className="h-3 w-3" />
														<span className="capitalize">
															{invitation.event?.type}
														</span>
													</div>
													<span>•</span>
													<div className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														<span>
															Expires{" "}
															{formatDistanceToNow(invitation.expiresAt, {
																addSuffix: true,
															})}
														</span>
													</div>
												</div>

												<Link
													to="/invitations/$token"
													params={{ token: invitation.token }}
												>
													<Button size="sm" className="w-full sm:w-auto">
														<CheckCircle className="h-4 w-4 mr-2" />
														View Invitation
													</Button>
												</Link>
											</div>
										</div>
									</CardContent>
								</Card>
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
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							statusFilter === undefined
								? "bg-blue-600 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						All Events
					</button>
					<button
						onClick={() => setStatusFilter("planning")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							statusFilter === "planning"
								? "bg-blue-600 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						Planning
					</button>
					<button
						onClick={() => setStatusFilter("in_progress")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							statusFilter === "in_progress"
								? "bg-blue-600 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						In Progress
					</button>
					<button
						onClick={() => setStatusFilter("completed")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							statusFilter === "completed"
								? "bg-blue-600 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						Completed
					</button>
					<button
						onClick={() => setStatusFilter("archived")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							statusFilter === "archived"
								? "bg-blue-600 text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						Archived
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
