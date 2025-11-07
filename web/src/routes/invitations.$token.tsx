import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDate } from "date-fns";
import {
	AlertCircle,
	Calendar,
	Check,
	Mail,
	Shield,
	User,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import ConvexProvider from "@/integrations/convex/provider";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/invitations/$token")({
	component: InvitationPageWrapper,
});

// Wrapper component to provide Convex context for unauthenticated users
function InvitationPageWrapper() {
	return (
		<ConvexProvider>
			<InvitationPage />
		</ConvexProvider>
	);
}

function InvitationPage() {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: authLoading } = useSession();
	const [isProcessing, setIsProcessing] = useState(false);

	const invitationData = useQuery(api.eventInvitations.getByToken, { token });
	const acceptInvitation = useMutation(api.eventInvitations.acceptInvitation);
	const declineInvitation = useMutation(api.eventInvitations.declineInvitation);

	// Handle loading state
	if (authLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-gray-500">Loading...</p>
				</div>
			</div>
		);
	}

	// If not authenticated, redirect to sign in with return URL
	if (!session?.user) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<CardTitle>Sign In Required</CardTitle>
						<CardDescription>
							You need to sign in to accept this invitation
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-gray-600">
							Please sign in with the email address this invitation was sent to.
						</p>
					</CardContent>
					<CardFooter className="flex gap-2">
						<Button
							onClick={() =>
								navigate({
									to: "/auth/sign-in",
									search: {
										verified: false,
										redirect: `/invitations/${token}`,
									},
								})
							}
							className="flex-1"
						>
							Sign In
						</Button>
						<Button
							variant="outline"
							onClick={() =>
								navigate({
									to: "/auth/sign-up",
									search: {
										verified: false,
										redirect: `/invitations/${token}`,
									},
								})
							}
							className="flex-1"
						>
							Sign Up
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	// Handle invitation not found or loading
	if (invitationData === undefined) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-gray-500">Loading invitation...</p>
				</div>
			</div>
		);
	}

	if (invitationData === null) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
							<AlertCircle className="h-6 w-6 text-red-600" />
						</div>
						<CardTitle className="text-center">Invitation Not Found</CardTitle>
						<CardDescription className="text-center">
							This invitation link is invalid or has been removed
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button onClick={() => navigate({ to: "/" })} className="w-full">
							Go to Home
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	const { invitation, event, inviter } = invitationData;

	// Handle already processed invitations
	if (invitation.status !== "pending") {
		const statusMessages = {
			accepted: {
				title: "Invitation Already Accepted",
				description: "You've already accepted this invitation",
				action: "Go to Event",
				actionPath: `/events/${event._id}`,
			},
			declined: {
				title: "Invitation Declined",
				description: "You previously declined this invitation",
				action: "Go to Home",
				actionPath: "/",
			},
			cancelled: {
				title: "Invitation Cancelled",
				description:
					"This invitation has been cancelled by the event coordinator",
				action: "Go to Home",
				actionPath: "/",
			},
			expired: {
				title: "Invitation Expired",
				description: "This invitation has expired",
				action: "Go to Home",
				actionPath: "/",
			},
		};

		const status = statusMessages[invitation.status] || statusMessages.expired;

		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
							<AlertCircle className="h-6 w-6 text-gray-600" />
						</div>
						<CardTitle className="text-center">{status.title}</CardTitle>
						<CardDescription className="text-center">
							{status.description}
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button
							onClick={() => navigate({ to: status.actionPath })}
							className="w-full"
						>
							{status.action}
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	// Handle expired invitations
	if (invitation.isExpired) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="max-w-md w-full">
					<CardHeader>
						<div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
							<AlertCircle className="h-6 w-6 text-red-600" />
						</div>
						<CardTitle className="text-center">Invitation Expired</CardTitle>
						<CardDescription className="text-center">
							This invitation link has expired. Please contact the event
							coordinator to request a new invitation.
						</CardDescription>
					</CardHeader>
					<CardFooter>
						<Button onClick={() => navigate({ to: "/" })} className="w-full">
							Go to Home
						</Button>
					</CardFooter>
				</Card>
			</div>
		);
	}

	const handleAccept = async () => {
		setIsProcessing(true);
		try {
			const result = await acceptInvitation({ token });
			toast.success("Invitation accepted!", {
				description: "Welcome to the event team!",
			});
			// Redirect to event page
			navigate({ to: `/events/${result.eventId}` });
		} catch (error) {
			console.error("Failed to accept invitation:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to accept invitation",
			);
			setIsProcessing(false);
		}
	};

	const handleDecline = async () => {
		if (
			!confirm(
				"Are you sure you want to decline this invitation? This action cannot be undone.",
			)
		) {
			return;
		}

		setIsProcessing(true);
		try {
			await declineInvitation({ token });
			toast.success("Invitation declined");
			navigate({ to: "/" });
		} catch (error) {
			console.error("Failed to decline invitation:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to decline invitation",
			);
			setIsProcessing(false);
		}
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "coordinator":
				return <Shield className="h-5 w-5" />;
			case "collaborator":
				return <User className="h-5 w-5" />;
			case "guest":
				return <Mail className="h-5 w-5" />;
			default:
				return <User className="h-5 w-5" />;
		}
	};

	const getRoleDescription = (role: string) => {
		switch (role) {
			case "coordinator":
				return "Full permissions - can manage event, invite others, and access all features";
			case "collaborator":
				return "Can participate and contribute to planning tasks and discussions";
			case "guest":
				return "Limited access - can view event details but not edit";
			default:
				return "";
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
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
			<Card className="max-w-2xl w-full">
				<CardHeader>
					<div className="flex items-center gap-4 mb-4">
						{inviter && (
							<Avatar className="h-16 w-16">
								{inviter.avatar && <AvatarImage src={inviter.avatar} />}
								<AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
									{getInitials(inviter.name)}
								</AvatarFallback>
							</Avatar>
						)}
						<div className="flex-1">
							<CardTitle className="text-2xl">
								You've been invited to collaborate!
							</CardTitle>
							<CardDescription>
								{inviter?.name} has invited you to join their event
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{/* Event Details */}
					<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
						<div>
							<h3 className="text-lg font-semibold mb-2 dark:text-gray-100">
								{event.name}
							</h3>
							{event.description && (
								<p className="text-gray-600 dark:text-gray-400 text-sm">
									{event.description}
								</p>
							)}
						</div>

						<div className="flex flex-wrap gap-4">
							<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
								<Calendar className="h-4 w-4" />
								<span className="capitalize">{event.type} Event</span>
							</div>
							{event.date && (
								<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
									<Calendar className="h-4 w-4" />
									<span>{formatDate(event.date, "PPP")}</span>
								</div>
							)}
						</div>
					</div>

					{/* Role Information */}
					<div className="border dark:border-gray-700 rounded-lg p-6">
						<div className="flex items-start gap-3 mb-3">
							<div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
								{getRoleIcon(invitation.role)}
							</div>
							<div className="flex-1">
								<h4 className="font-semibold mb-1 dark:text-gray-100">
									Your role:{" "}
									<span className="text-blue-600 dark:text-blue-400 capitalize">
										{invitation.role}
									</span>
								</h4>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{getRoleDescription(invitation.role)}
								</p>
							</div>
						</div>
					</div>

					{/* Personal Message */}
					{invitation.message && (
						<div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
							<p className="text-sm text-blue-900 dark:text-blue-300 italic">
								"{invitation.message}"
							</p>
						</div>
					)}

					{/* Invitation Details */}
					<div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
						<p>Invited to: {invitation.invitedEmail}</p>
						<p>Expires: {formatDate(invitation.expiresAt, "PPP 'at' p")}</p>
					</div>
				</CardContent>

				<CardFooter className="flex gap-3">
					<Button
						variant="outline"
						onClick={handleDecline}
						disabled={isProcessing}
						className="flex-1"
					>
						<X className="h-4 w-4 mr-2" />
						Decline
					</Button>
					<Button
						onClick={handleAccept}
						disabled={isProcessing}
						className="flex-1"
					>
						{isProcessing ? (
							"Processing..."
						) : (
							<>
								<Check className="h-4 w-4 mr-2" />
								Accept Invitation
							</>
						)}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
