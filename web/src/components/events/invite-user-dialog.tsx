import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface InviteUserDialogProps {
	eventId: Id<"events">;
	trigger?: React.ReactNode;
	onSuccess?: () => void;
}

export function InviteUserDialog({
	eventId,
	trigger,
	onSuccess,
}: InviteUserDialogProps) {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"coordinator" | "collaborator" | "guest">(
		"collaborator",
	);
	const [message, setMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const sendInvitation = useMutation(api.eventInvitations.sendInvitation);

	const isValidEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}

		if (!isValidEmail(email)) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsLoading(true);

		try {
			const result = await sendInvitation({
				eventId,
				invitedEmail: email.toLowerCase().trim(),
				role,
				message: message.trim() || undefined,
			});

			// Show success message with invitation link
			toast.success("Invitation sent!", {
				description: `An invitation has been sent to ${email}`,
			});

			// Copy invitation link to clipboard
			const invitationUrl = `${window.location.origin}${result.invitationUrl}`;
			await navigator.clipboard.writeText(invitationUrl);
			toast.info("Invitation link copied to clipboard");

			// Reset form
			setEmail("");
			setRole("collaborator");
			setMessage("");
			setOpen(false);

			onSuccess?.();
		} catch (error) {
			console.error("Failed to send invitation:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to send invitation",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button>
						<UserPlus className="h-4 w-4 mr-2" />
						Invite Collaborator
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Invite User to Event</DialogTitle>
					<DialogDescription>
						Send an invitation to collaborate on this event. They'll receive an
						email with a link to join.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Email Input */}
					<div className="space-y-2">
						<Label htmlFor="email">
							Email Address <span className="text-red-500">*</span>
						</Label>
						<div className="relative">
							<Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
							<Input
								id="email"
								type="email"
								placeholder="colleague@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="pl-10"
								required
								disabled={isLoading}
							/>
						</div>
						<p className="text-xs text-gray-500">
							Enter the email address of the person you want to invite
						</p>
					</div>

					{/* Role Selection */}
					<div className="space-y-2">
						<Label htmlFor="role">
							Role <span className="text-red-500">*</span>
						</Label>
						<Select
							value={role}
							onValueChange={(
								value: "coordinator" | "collaborator" | "guest",
							) => setRole(value)}
							disabled={isLoading}
						>
							<SelectTrigger id="role">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="coordinator">
									<div className="flex flex-col items-start">
										<span className="font-medium">Coordinator</span>
										<span className="text-xs text-gray-500">
											Full permissions - can manage event and invite others
										</span>
									</div>
								</SelectItem>
								<SelectItem value="collaborator">
									<div className="flex flex-col items-start">
										<span className="font-medium">Collaborator</span>
										<span className="text-xs text-gray-500">
											Can participate and contribute to planning
										</span>
									</div>
								</SelectItem>
								<SelectItem value="guest">
									<div className="flex flex-col items-start">
										<span className="font-medium">Guest</span>
										<span className="text-xs text-gray-500">
											Limited access - can view but not edit
										</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Optional Message */}
					<div className="space-y-2">
						<Label htmlFor="message">Personal Message (optional)</Label>
						<Textarea
							id="message"
							placeholder="Add a personal message to the invitation..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
							maxLength={500}
							disabled={isLoading}
						/>
						<p className="text-xs text-gray-500">
							{message.length}/500 characters
						</p>
					</div>

					{/* Info Box */}
					<div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
						<p className="text-sm text-blue-800 dark:text-blue-300">
							💡 The invitation link will be valid for 7 days. You can resend or
							cancel it from the invitations list.
						</p>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Sending..." : "Send Invitation"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
