import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, UserPlus } from "lucide-react";
import { InvitationsList } from "@/components/events/invitations-list";
import { InviteUserDialog } from "@/components/events/invite-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { convexQuery } from "@/lib/convex-query";

export const Route = createFileRoute("/_authed/events/$eventId/team")({
	ssr: false, // Disable SSR - uses parent loader with auth
	component: TeamPage,
});

function TeamPage() {
	const { eventId } = Route.useParams();

	// Get user's role in this event
	const { data: userRole } = useSuspenseQuery(
		convexQuery(api.events.getUserRole, {
			eventId: eventId as Id<"events">,
		}),
	);

	// Get event members
	const { data: eventMembers } = useSuspenseQuery(
		convexQuery(api.events.getEventMembers, {
			eventId: eventId as Id<"events">,
		}),
	);

	// Only coordinators can access team management
	if (userRole !== "coordinator") {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-sm text-gray-400">
					You don't have permission to manage this event's team.
				</p>
			</div>
		);
	}

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case "coordinator":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
			case "collaborator":
				return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
			case "guest":
				return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
			default:
				return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
		}
	};

	return (
		<div className="max-w-4xl mx-auto py-8 px-4">
			<div className="flex items-start justify-between mb-12">
				<div className="space-y-1">
					<h1 className="text-3xl font-light tracking-tight text-gray-900 dark:text-white">
						Team
					</h1>
					<p className="text-sm text-gray-400">
						Manage collaborators and invitations
					</p>
				</div>
				<InviteUserDialog
					eventId={eventId as Id<"events">}
					trigger={
						<Button
							variant="ghost"
							className="gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
						>
							<UserPlus className="h-4 w-4" />
							Invite
						</Button>
					}
				/>
			</div>

			{/* Event Members Section */}
			{eventMembers && eventMembers.length > 0 && (
				<div className="mb-12">
					<h2 className="text-lg font-bold uppercase tracking-tight mb-4 text-gray-900 dark:text-white">
						Team Members ({eventMembers.length})
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{eventMembers.map((member) => (
							<Card
								key={member.userId}
								className="border-2 border-black dark:border-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
							>
								<CardContent className="p-4">
									<div className="flex items-start gap-3">
										<Avatar className="h-12 w-12 border-2 border-black dark:border-white flex-shrink-0">
											<AvatarImage src={member.avatar} alt={member.name} />
											<AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-sm font-bold">
												{getInitials(member.name)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<h3 className="font-bold text-base uppercase tracking-tight line-clamp-1">
												{member.name}
											</h3>
											<Badge
												className={`mt-1 text-xs font-medium ${getRoleColor(member.role)}`}
												variant="secondary"
											>
												{member.role}
											</Badge>
											<div className="mt-3 space-y-1.5 text-xs font-mono">
												<div className="flex items-start gap-2">
													<Mail className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
													<span className="flex-1 truncate opacity-80">
														{member.email}
													</span>
												</div>
												{member.location && (
													<div className="flex items-start gap-2">
														<MapPin className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
														<span className="flex-1 truncate opacity-80">
															{member.location}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Invitations Section */}
			<div>
				<h2 className="text-lg font-bold uppercase tracking-tight mb-4 text-gray-900 dark:text-white">
					Invitations
				</h2>
				<InvitationsList eventId={eventId as Id<"events">} />
			</div>
		</div>
	);
}
