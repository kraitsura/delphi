import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { UserPlus } from "lucide-react";
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
			<DialogContent className="max-w-md border-0 shadow-xl">
				<DialogHeader className="space-y-3">
					<DialogTitle className="text-2xl font-light tracking-tight">
						Invite Collaborator
					</DialogTitle>
					<DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
						Send an invitation link to collaborate on this event
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6 mt-6">
					{/* Email Input */}
					<div className="space-y-2">
						<Label
							htmlFor="email"
							className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Email
						</Label>
						<Input
							id="email"
							type="email"
							placeholder="colleague@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="border-0 border-b border-gray-200 dark:border-gray-800 rounded-none px-0 focus-visible:ring-0 focus-visible:border-gray-400 dark:focus-visible:border-gray-600 transition-colors"
							required
							disabled={isLoading}
						/>
					</div>

					{/* Role Selection */}
					<div className="space-y-2">
						<Label
							htmlFor="role"
							className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Role
						</Label>
						<Select
							value={role}
							onValueChange={(
								value: "coordinator" | "collaborator" | "guest",
							) => setRole(value)}
							disabled={isLoading}
						>
							<SelectTrigger
								id="role"
								className="border-0 border-b border-gray-200 dark:border-gray-800 rounded-none px-0 focus:ring-0 focus:border-gray-400 dark:focus:border-gray-600"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="coordinator">
									<div className="flex flex-col items-start py-1">
										<span className="font-medium">Coordinator</span>
										<span className="text-xs text-gray-500">
											Full permissions
										</span>
									</div>
								</SelectItem>
								<SelectItem value="collaborator">
									<div className="flex flex-col items-start py-1">
										<span className="font-medium">Collaborator</span>
										<span className="text-xs text-gray-500">
											Can contribute to planning
										</span>
									</div>
								</SelectItem>
								<SelectItem value="guest">
									<div className="flex flex-col items-start py-1">
										<span className="font-medium">Guest</span>
										<span className="text-xs text-gray-500">
											View only access
										</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Optional Message */}
					<div className="space-y-2">
						<Label
							htmlFor="message"
							className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Message{" "}
							<span className="normal-case text-gray-400">(optional)</span>
						</Label>
						<Textarea
							id="message"
							placeholder="Add a personal note..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							rows={3}
							maxLength={500}
							disabled={isLoading}
							className="border-gray-200 dark:border-gray-800 focus-visible:ring-0 focus-visible:border-gray-400 dark:focus-visible:border-gray-600 resize-none"
						/>
						{message.length > 0 && (
							<p className="text-xs text-gray-400">{message.length}/500</p>
						)}
					</div>

					{/* Info Box */}
					<div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
						<p className="text-xs text-gray-500 dark:text-gray-400">
							Invitation link is valid for 7 days
						</p>
					</div>

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setOpen(false)}
							disabled={isLoading}
							className="hover:bg-gray-100 dark:hover:bg-gray-900"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isLoading}
							className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
						>
							{isLoading ? "Sending..." : "Send Invite"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
