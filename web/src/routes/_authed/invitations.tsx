import { api } from "@convex/_generated/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Calendar, CheckCircle, Clock, Mail, Shield, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authed/invitations")({
	component: InvitationsPage,
});

function InvitationsPage() {
	const invitations = useQuery(api.eventInvitations.listByEmail);

	if (!invitations) {
		return (
			<div className="container max-w-4xl mx-auto p-6">
				<div className="text-center py-8">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-gray-500">Loading invitations...</p>
				</div>
			</div>
		);
	}

	const pendingInvitations = invitations.filter((inv) => !inv.isExpired);
	const expiredInvitations = invitations.filter((inv) => inv.isExpired);

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "coordinator":
				return <Shield className="h-5 w-5 text-purple-600" />;
			case "collaborator":
				return <User className="h-5 w-5 text-blue-600" />;
			case "guest":
				return <Mail className="h-5 w-5 text-gray-600" />;
			default:
				return <User className="h-5 w-5" />;
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
		<div className="container max-w-4xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">Your Invitations</h1>
				<p className="text-gray-600">
					View and manage invitations to collaborate on events
				</p>
			</div>

			{/* Pending Invitations */}
			{pendingInvitations.length > 0 && (
				<div className="mb-8">
					<div className="flex items-center gap-2 mb-4">
						<h2 className="text-xl font-semibold">Pending Invitations</h2>
						<Badge variant="default">{pendingInvitations.length}</Badge>
					</div>
					<div className="space-y-4">
						{pendingInvitations.map((invitation) => (
							<Card
								key={invitation._id}
								className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow"
							>
								<CardContent className="pt-6">
									<div className="flex items-start gap-4">
										{invitation.inviter && (
											<Avatar className="h-12 w-12">
												{invitation.inviter.avatar && (
													<AvatarImage src={invitation.inviter.avatar} />
												)}
												<AvatarFallback>
													{getInitials(invitation.inviter.name)}
												</AvatarFallback>
											</Avatar>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-start justify-between gap-4 mb-2">
												<div>
													<h3 className="font-semibold text-lg mb-1">
														{invitation.event?.name}
													</h3>
													<p className="text-sm text-gray-600">
														{invitation.inviter?.name} invited you to
														collaborate
													</p>
												</div>
												<div className="flex items-center gap-2 flex-shrink-0">
													{getRoleIcon(invitation.role)}
													<Badge variant="secondary" className="capitalize">
														{invitation.role}
													</Badge>
												</div>
											</div>

											{invitation.event?.description && (
												<p className="text-sm text-gray-600 mb-3 line-clamp-2">
													{invitation.event.description}
												</p>
											)}

											{invitation.message && (
												<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
													<p className="text-sm text-blue-900 italic">
														"{invitation.message}"
													</p>
												</div>
											)}

											<div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
												<div className="flex items-center gap-1">
													<Calendar className="h-4 w-4" />
													<span className="capitalize">
														{invitation.event?.type}
													</span>
												</div>
												<span>•</span>
												<div className="flex items-center gap-1">
													<Clock className="h-4 w-4" />
													<span>
														Sent{" "}
														{formatDistanceToNow(invitation.createdAt, {
															addSuffix: true,
														})}
													</span>
												</div>
												<span>•</span>
												<span className="text-xs">
													Expires{" "}
													{formatDistanceToNow(invitation.expiresAt, {
														addSuffix: true,
													})}
												</span>
											</div>

											<Link to={`/invitations/${invitation.token}`}>
												<Button>
													<CheckCircle className="h-4 w-4 mr-2" />
													View Invitation
												</Button>
											</Link>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Expired Invitations */}
			{expiredInvitations.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-4 text-gray-600">
						Expired Invitations
					</h2>
					<div className="space-y-4">
						{expiredInvitations.map((invitation) => (
							<Card key={invitation._id} className="opacity-60">
								<CardContent className="pt-6">
									<div className="flex items-start gap-4">
										{invitation.inviter && (
											<Avatar className="h-12 w-12">
												{invitation.inviter.avatar && (
													<AvatarImage src={invitation.inviter.avatar} />
												)}
												<AvatarFallback>
													{getInitials(invitation.inviter.name)}
												</AvatarFallback>
											</Avatar>
										)}
										<div className="flex-1">
											<div className="flex items-start justify-between gap-4 mb-2">
												<div>
													<h3 className="font-semibold text-lg mb-1">
														{invitation.event?.name}
													</h3>
													<p className="text-sm text-gray-600">
														{invitation.inviter?.name} invited you
													</p>
												</div>
												<Badge variant="destructive">Expired</Badge>
											</div>
											<p className="text-sm text-gray-500">
												This invitation has expired. Contact the event
												coordinator for a new invitation.
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* Empty State */}
			{pendingInvitations.length === 0 && expiredInvitations.length === 0 && (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<Mail className="h-16 w-16 mx-auto text-gray-300 mb-4" />
							<h3 className="text-lg font-semibold mb-2">No Invitations</h3>
							<p className="text-gray-500 mb-6">
								You don't have any pending event invitations at the moment.
							</p>
							<Link to="/events">
								<Button variant="outline">View Your Events</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
