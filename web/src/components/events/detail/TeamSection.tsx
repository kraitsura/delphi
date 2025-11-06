import type { Id } from "@convex/_generated/dataModel";
import { UserPlus } from "lucide-react";
import { InvitationsList } from "@/components/events/invitations-list";
import { InviteUserDialog } from "@/components/events/invite-user-dialog";
import { Button } from "@/components/ui/button";

interface TeamSectionProps {
	eventId: Id<"events">;
}

export function TeamSection({ eventId }: TeamSectionProps) {
	return (
		<div className="mt-8">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Team & Invitations</h2>
				<InviteUserDialog
					eventId={eventId}
					trigger={
						<Button>
							<UserPlus className="h-4 w-4 mr-2" />
							Invite Collaborator
						</Button>
					}
				/>
			</div>
			<InvitationsList eventId={eventId} />
		</div>
	);
}
