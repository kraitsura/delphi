import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import {
	Calendar,
	Eye,
	Mail,
	MapPin,
	MessageSquare,
	MoreVertical,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamContactCardProps {
	userId: Id<"users">;
	name: string;
	email: string;
	avatar?: string;
	bio?: string;
	location?: string;
	role: "coordinator" | "collaborator" | "guest" | "vendor";
	events: Array<{
		eventId: Id<"events">;
		eventName: string;
		role: string;
	}>;
	onClick?: () => void;
}

export function TeamContactCard({
	userId: _userId,
	name,
	email,
	avatar,
	bio,
	location,
	role,
	events,
	onClick,
}: TeamContactCardProps) {
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

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<Card className="border-2 border-black dark:border-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors h-full relative group">
			<CardContent className="p-0">
				{/* Header with avatar and actions */}
				<div className="border-b-2 border-black dark:border-white p-4 flex items-start justify-between gap-3">
					<div className="flex items-start gap-3 flex-1 min-w-0">
						<Avatar className="h-12 w-12 border-2 border-black dark:border-white flex-shrink-0">
							<AvatarImage src={avatar} alt={name} />
							<AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-sm font-bold">
								{getInitials(name)}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<h3 className="font-bold text-base uppercase tracking-tight line-clamp-1">
								{name}
							</h3>
							<Badge
								className={`mt-1 text-xs font-medium ${getRoleColor(role)}`}
								variant="secondary"
							>
								{role}
							</Badge>
						</div>
					</div>

					{/* Quick Actions Dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreVertical className="h-4 w-4" />
								<span className="sr-only">Open menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={onClick}>
								<Eye className="mr-2 h-4 w-4" />
								View Profile
							</DropdownMenuItem>
							<DropdownMenuItem disabled>
								<MessageSquare className="mr-2 h-4 w-4" />
								Send Message
							</DropdownMenuItem>
							<DropdownMenuItem disabled>
								<Calendar className="mr-2 h-4 w-4" />
								View Events Together
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Card body - clickable */}
				<div
					className="p-4 cursor-pointer"
					onClick={onClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							onClick?.();
						}
					}}
					role="button"
					tabIndex={0}
				>
					{/* Contact Details */}
					<div className="space-y-2 text-xs font-mono mb-4">
						<div className="flex items-start gap-2">
							<Mail className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
							<span className="flex-1 truncate opacity-80">{email}</span>
						</div>

						{location && (
							<div className="flex items-start gap-2">
								<MapPin className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
								<span className="flex-1 truncate opacity-80">{location}</span>
							</div>
						)}
					</div>

					{bio && (
						<p className="text-xs leading-relaxed mb-4 opacity-70 line-clamp-2">
							{bio}
						</p>
					)}

					{/* Associated Events */}
					{events.length > 0 && (
						<div className="space-y-2">
							<div className="text-xs font-mono opacity-50 uppercase tracking-wider">
								Events ({events.length})
							</div>
							<div className="flex flex-wrap gap-1.5">
								{events.slice(0, 3).map((event) => (
									<Link
										key={event.eventId}
										to="/events/$eventId"
										params={{ eventId: event.eventId }}
										onClick={(e) => e.stopPropagation()}
										className="group/event"
									>
										<Badge
											variant="outline"
											className="text-xs border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
										>
											{event.eventName}
										</Badge>
									</Link>
								))}
								{events.length > 3 && (
									<Badge
										variant="outline"
										className="text-xs border-black dark:border-white opacity-50"
									>
										+{events.length - 3} more
									</Badge>
								)}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
