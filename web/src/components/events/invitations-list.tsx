import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	Calendar,
	Mail,
	MoreVertical,
	RefreshCw,
	Shield,
	Trash2,
	User,
	X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InvitationsListProps {
	eventId: Id<"events">;
}

export function InvitationsList({ eventId }: InvitationsListProps) {
	const invitations = useQuery(api.eventInvitations.listAllByEvent, {
		eventId,
	});
	const cancelInvitation = useMutation(api.eventInvitations.cancelInvitation);
	const resendInvitation = useMutation(api.eventInvitations.resendInvitation);

	const handleCancel = async (invitationId: Id<"eventInvitations">) => {
		if (
			!confirm(
				"Are you sure you want to cancel this invitation? The invitation link will no longer work.",
			)
		) {
			return;
		}

		try {
			await cancelInvitation({ invitationId });
			toast.success("Invitation cancelled");
		} catch (error) {
			console.error("Failed to cancel invitation:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to cancel invitation",
			);
		}
	};

	const handleResend = async (invitationId: Id<"eventInvitations">) => {
		try {
			const result = await resendInvitation({ invitationId });

			// Copy new invitation link to clipboard
			const invitationUrl = `${window.location.origin}${result.invitationUrl}`;
			await navigator.clipboard.writeText(invitationUrl);

			toast.success("Invitation resent!", {
				description: "New invitation link copied to clipboard",
			});
		} catch (error) {
			console.error("Failed to resend invitation:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to resend invitation",
			);
		}
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "coordinator":
				return <Shield className="h-4 w-4" />;
			case "collaborator":
				return <User className="h-4 w-4" />;
			case "guest":
				return <Mail className="h-4 w-4" />;
			default:
				return <User className="h-4 w-4" />;
		}
	};

	const getRoleBadgeVariant = (role: string) => {
		switch (role) {
			case "coordinator":
				return "default";
			case "collaborator":
				return "secondary";
			case "guest":
				return "outline";
			default:
				return "secondary";
		}
	};

	const getStatusBadge = (status: string, isExpired: boolean) => {
		if (isExpired && status === "pending") {
			return (
				<Badge variant="destructive" className="flex items-center gap-1">
					<X className="h-3 w-3" />
					Expired
				</Badge>
			);
		}

		switch (status) {
			case "pending":
				return (
					<Badge variant="default" className="flex items-center gap-1">
						<Calendar className="h-3 w-3" />
						Pending
					</Badge>
				);
			case "accepted":
				return (
					<Badge
						variant="outline"
						className="bg-green-50 text-green-700 border-green-200"
					>
						Accepted
					</Badge>
				);
			case "declined":
				return (
					<Badge
						variant="outline"
						className="bg-red-50 text-red-700 border-red-200"
					>
						Declined
					</Badge>
				);
			case "cancelled":
				return (
					<Badge variant="outline" className="text-gray-500">
						Cancelled
					</Badge>
				);
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	if (!invitations) {
		return (
			<div className="text-center py-8 text-gray-500 dark:text-gray-400">
				Loading invitations...
			</div>
		);
	}

	if (invitations.length === 0) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="text-center py-8">
						<Mail className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
						<p className="text-gray-500 dark:text-gray-400 font-medium">
							No invitations sent yet
						</p>
						<p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
							Invite collaborators to help plan this event
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Separate pending from historical invitations
	const pendingInvitations = invitations.filter(
		(inv) => inv.status === "pending" && !inv.isExpired,
	);
	const historicalInvitations = invitations.filter(
		(inv) => inv.status !== "pending" || inv.isExpired,
	);

	return (
		<div className="space-y-6">
			{/* Pending Invitations */}
			{pendingInvitations.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
						Pending Invitations ({pendingInvitations.length})
					</h3>
					{pendingInvitations.map((invitation) => (
						<Card key={invitation._id}>
							<CardContent className="pt-6">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
											<span className="font-medium dark:text-gray-100">
												{invitation.invitedEmail}
											</span>
										</div>
										<div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
											<div className="flex items-center gap-1">
												{getRoleIcon(invitation.role)}
												<Badge variant={getRoleBadgeVariant(invitation.role)}>
													{invitation.role}
												</Badge>
											</div>
											<span>•</span>
											<span>
												Sent{" "}
												{formatDistanceToNow(invitation.createdAt, {
													addSuffix: true,
												})}
											</span>
											<span>•</span>
											<span className="text-xs">
												by {invitation.inviterName}
											</span>
										</div>
										{invitation.message && (
											<p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
												"{invitation.message}"
											</p>
										)}
										<div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
											Expires{" "}
											{formatDistanceToNow(invitation.expiresAt, {
												addSuffix: true,
											})}
										</div>
									</div>
									<div className="flex items-center gap-2 ml-4">
										{getStatusBadge(invitation.status, invitation.isExpired)}
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => handleResend(invitation._id)}
												>
													<RefreshCw className="h-4 w-4 mr-2" />
													Resend Invitation
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleCancel(invitation._id)}
													className="text-red-600"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Cancel Invitation
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Historical Invitations */}
			{historicalInvitations.length > 0 && (
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
						Invitation History ({historicalInvitations.length})
					</h3>
					{historicalInvitations.map((invitation) => (
						<Card key={invitation._id} className="opacity-75 dark:opacity-60">
							<CardContent className="pt-6">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" />
											<span className="font-medium dark:text-gray-100">
												{invitation.invitedEmail}
											</span>
										</div>
										<div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
											<div className="flex items-center gap-1">
												{getRoleIcon(invitation.role)}
												<Badge variant={getRoleBadgeVariant(invitation.role)}>
													{invitation.role}
												</Badge>
											</div>
											<span>•</span>
											<span>
												Sent{" "}
												{formatDistanceToNow(invitation.createdAt, {
													addSuffix: true,
												})}
											</span>
											<span>•</span>
											<span className="text-xs">
												by {invitation.inviterName}
											</span>
										</div>
										{invitation.message && (
											<p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
												"{invitation.message}"
											</p>
										)}
									</div>
									<div className="ml-4">
										{getStatusBadge(invitation.status, invitation.isExpired)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
