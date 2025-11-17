import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import { MessageSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventDeleteDialog } from "../event-delete-dialog";
import { EventEditDialog } from "../event-edit-dialog";
import { StatusBadge } from "../StatusBadge";

type EventStatus =
	| "planning"
	| "in_progress"
	| "completed"
	| "cancelled"
	| "archived";

interface EventHeaderProps {
	eventId: Id<"events">;
	name: string;
	description?: string;
	status: EventStatus;
	type: string;
	createdAt: number;
}

export function EventHeader({
	eventId,
	name,
	description,
	status,
	type,
	createdAt,
}: EventHeaderProps) {
	return (
		<div className="mb-8">
			<div className="flex items-start justify-between mb-4">
				<div className="flex-1">
					<h1 className="text-3xl font-bold mb-2">{name}</h1>
					{description && (
						<p className="text-muted-foreground text-lg">{description}</p>
					)}
				</div>
				<div className="flex items-center gap-3">
					<Link to="/events/$eventId/rooms" params={{ eventId }}>
						<Button variant="outline">
							<MessageSquare className="h-4 w-4 mr-2" />
							Rooms
						</Button>
					</Link>
					<StatusBadge status={status} />
					{/* Actions Dropdown Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">Actions</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<EventEditDialog
								eventId={eventId}
								trigger={
									<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
										<Pencil className="mr-2 h-4 w-4" />
										Edit Event
									</DropdownMenuItem>
								}
							/>
							<EventDeleteDialog
								eventId={eventId}
								redirectAfterDelete={true}
								trigger={
									<DropdownMenuItem
										onSelect={(e) => e.preventDefault()}
										className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete Event
									</DropdownMenuItem>
								}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<div className="text-sm text-muted-foreground">
				<span className="capitalize">{type}</span> • Created{" "}
				{new Date(createdAt).toLocaleDateString()}
			</div>
		</div>
	);
}
