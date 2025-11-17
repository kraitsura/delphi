import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	Clock,
	Mail,
	MoreHorizontal,
	RefreshCw,
	Trash2,
	UserCheck,
	UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

	const getRoleColor = (role: string) => {
		switch (role) {
			case "coordinator":
				return "text-blue-600 dark:text-blue-400";
			case "collaborator":
				return "text-purple-600 dark:text-purple-400";
			case "guest":
				return "text-gray-500 dark:text-gray-400";
			default:
				return "text-gray-500 dark:text-gray-400";
		}
	};

	const getStatusDisplay = (status: string, isExpired: boolean) => {
		if (isExpired && status === "pending") {
			return {
				icon: <Clock className="h-3.5 w-3.5" />,
				text: "Expired",
				className: "text-red-500 dark:text-red-400",
			};
		}

		switch (status) {
			case "pending":
				return {
					icon: <Clock className="h-3.5 w-3.5" />,
					text: "Pending",
					className: "text-amber-500 dark:text-amber-400",
				};
			case "accepted":
				return {
					icon: <UserCheck className="h-3.5 w-3.5" />,
					text: "Accepted",
					className: "text-green-600 dark:text-green-400",
				};
			case "declined":
				return {
					icon: <UserX className="h-3.5 w-3.5" />,
					text: "Declined",
					className: "text-red-500 dark:text-red-400",
				};
			case "cancelled":
				return {
					icon: <UserX className="h-3.5 w-3.5" />,
					text: "Cancelled",
					className: "text-gray-400 dark:text-gray-500",
				};
			default:
				return {
					icon: <Clock className="h-3.5 w-3.5" />,
					text: status,
					className: "text-gray-500 dark:text-gray-400",
				};
		}
	};

	if (!invitations) {
		return (
			<div className="flex items-center justify-center py-16">
				<p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
			</div>
		);
	}

	if (invitations.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-24">
				<Mail className="h-10 w-10 text-gray-300 dark:text-gray-700 mb-4" />
				<p className="text-sm text-gray-500 dark:text-gray-400">
					No invitations yet
				</p>
				<p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
					Invite collaborators to get started
				</p>
			</div>
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
		<div className="space-y-10">
			{/* Pending Invitations */}
			{pendingInvitations.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-baseline gap-2">
						<h2 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-600 font-medium">
							Pending
						</h2>
						<div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
					</div>
					<div className="space-y-1">
						{pendingInvitations.map((invitation) => {
							const statusDisplay = getStatusDisplay(
								invitation.status,
								invitation.isExpired,
							);
							return (
								<div
									key={invitation._id}
									className="group py-4 px-3 -mx-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0 space-y-2">
											<div className="flex items-center gap-3">
												<Mail className="h-4 w-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
												<span className="font-medium text-gray-900 dark:text-white truncate">
													{invitation.invitedEmail}
												</span>
												<span
													className={`text-xs font-medium capitalize ${getRoleColor(invitation.role)}`}
												>
													{invitation.role}
												</span>
											</div>
											<div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-600 pl-7">
												<span>
													{formatDistanceToNow(invitation.createdAt, {
														addSuffix: true,
													})}
												</span>
												<span>•</span>
												<span>by {invitation.inviterName}</span>
												<span>•</span>
												<span className="text-gray-500 dark:text-gray-500">
													expires{" "}
													{formatDistanceToNow(invitation.expiresAt, {
														addSuffix: true,
													})}
												</span>
											</div>
											{invitation.message && (
												<p className="text-sm text-gray-500 dark:text-gray-500 italic pl-7">
													"{invitation.message}"
												</p>
											)}
										</div>
										<div className="flex items-center gap-2 flex-shrink-0">
											<div
												className={`flex items-center gap-1.5 text-xs font-medium ${statusDisplay.className}`}
											>
												{statusDisplay.icon}
												{statusDisplay.text}
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
													>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => handleResend(invitation._id)}
													>
														<RefreshCw className="h-4 w-4 mr-2" />
														Resend
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleCancel(invitation._id)}
														className="text-red-600 dark:text-red-400"
													>
														<Trash2 className="h-4 w-4 mr-2" />
														Cancel
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Historical Invitations */}
			{historicalInvitations.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-baseline gap-2">
						<h2 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-600 font-medium">
							History
						</h2>
						<div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
					</div>
					<div className="space-y-1 opacity-60">
						{historicalInvitations.map((invitation) => {
							const statusDisplay = getStatusDisplay(
								invitation.status,
								invitation.isExpired,
							);
							return (
								<div
									key={invitation._id}
									className="py-4 px-3 -mx-3 rounded-lg"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 min-w-0 space-y-2">
											<div className="flex items-center gap-3">
												<Mail className="h-4 w-4 text-gray-300 dark:text-gray-700 flex-shrink-0" />
												<span className="font-medium text-gray-700 dark:text-gray-300 truncate">
													{invitation.invitedEmail}
												</span>
												<span
													className={`text-xs font-medium capitalize ${getRoleColor(invitation.role)}`}
												>
													{invitation.role}
												</span>
											</div>
											<div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-600 pl-7">
												<span>
													{formatDistanceToNow(invitation.createdAt, {
														addSuffix: true,
													})}
												</span>
												<span>•</span>
												<span>by {invitation.inviterName}</span>
											</div>
											{invitation.message && (
												<p className="text-sm text-gray-500 dark:text-gray-600 italic pl-7">
													"{invitation.message}"
												</p>
											)}
										</div>
										<div
											className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${statusDisplay.className}`}
										>
											{statusDisplay.icon}
											{statusDisplay.text}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
