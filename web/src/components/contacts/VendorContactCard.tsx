import type { Id } from "@convex/_generated/dataModel";
import { Link } from "@tanstack/react-router";
import {
	Eye,
	Globe,
	Mail,
	MapPin,
	MoreVertical,
	Pencil,
	Phone,
	Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VendorContactCardProps {
	vendorId: Id<"vendors">;
	name: string;
	category: string;
	description?: string;
	email?: string;
	phone?: string;
	website?: string;
	city?: string;
	state?: string;
	country?: string;
	rating?: number;
	status:
		| "researching"
		| "contacted"
		| "negotiating"
		| "contracted"
		| "active"
		| "completed"
		| "rejected";
	eventId: Id<"events">;
	eventName: string;
	onClick?: () => void;
}

export function VendorContactCard({
	vendorId: _vendorId,
	name,
	category,
	description,
	email,
	phone,
	website,
	city,
	state,
	country,
	rating,
	status,
	eventId,
	eventName,
	onClick,
}: VendorContactCardProps) {
	const getCategoryColor = (category: string) => {
		// Generate consistent colors based on category
		const colors = [
			"bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
			"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
			"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
			"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
			"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
			"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
		];

		const hash = category
			.split("")
			.reduce((acc, char) => acc + char.charCodeAt(0), 0);
		return colors[hash % colors.length];
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "researching":
				return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
			case "contacted":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
			case "negotiating":
				return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
			case "contracted":
			case "active":
				return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
			case "completed":
				return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
			case "rejected":
				return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
			default:
				return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
		}
	};

	const location = [city, state, country].filter(Boolean).join(", ");

	return (
		<Card className="border-2 border-black dark:border-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors h-full relative group">
			<CardContent className="p-0">
				{/* Header with vendor name and actions */}
				<div className="border-b-2 border-black dark:border-white p-4 flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<h3 className="font-bold text-base uppercase tracking-tight line-clamp-1">
							{name}
						</h3>
						<div className="flex flex-wrap items-center gap-2 mt-2">
							<Badge
								className={`text-xs font-medium ${getCategoryColor(category)}`}
								variant="secondary"
							>
								{category}
							</Badge>
							<Badge
								className={`text-xs font-medium ${getStatusColor(status)}`}
								variant="secondary"
							>
								{status}
							</Badge>
							{rating && rating > 0 && (
								<div className="flex items-center gap-1 text-xs">
									<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
									<span className="font-medium">{rating.toFixed(1)}</span>
								</div>
							)}
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
								View Details
							</DropdownMenuItem>
							<DropdownMenuItem disabled>
								<Pencil className="mr-2 h-4 w-4" />
								Edit Vendor
							</DropdownMenuItem>
							<DropdownMenuItem disabled>
								<Mail className="mr-2 h-4 w-4" />
								Contact Vendor
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
					{description && (
						<p className="text-xs leading-relaxed mb-4 opacity-70 line-clamp-2">
							{description}
						</p>
					)}

					{/* Contact Details */}
					<div className="space-y-2 text-xs font-mono">
						{email && (
							<div className="flex items-start gap-2">
								<Mail className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
								<a
									href={`mailto:${email}`}
									onClick={(e) => e.stopPropagation()}
									className="flex-1 truncate opacity-80 hover:underline"
								>
									{email}
								</a>
							</div>
						)}

						{phone && (
							<div className="flex items-start gap-2">
								<Phone className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
								<a
									href={`tel:${phone}`}
									onClick={(e) => e.stopPropagation()}
									className="flex-1 truncate opacity-80 hover:underline"
								>
									{phone}
								</a>
							</div>
						)}

						{website && (
							<div className="flex items-start gap-2">
								<Globe className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
								<a
									href={website}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => e.stopPropagation()}
									className="flex-1 truncate opacity-80 hover:underline"
								>
									{website}
								</a>
							</div>
						)}

						{location && (
							<div className="flex items-start gap-2">
								<MapPin className="h-3.5 w-3.5 opacity-50 mt-0.5 flex-shrink-0" />
								<span className="flex-1 truncate opacity-80">{location}</span>
							</div>
						)}
					</div>

					{/* Associated Event */}
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
						<div className="text-xs font-mono opacity-50 uppercase tracking-wider mb-2">
							Event
						</div>
						<Link
							to="/events/$eventId"
							params={{ eventId }}
							onClick={(e) => e.stopPropagation()}
							className="group/event"
						>
							<Badge
								variant="outline"
								className="text-xs border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
							>
								{eventName}
							</Badge>
						</Link>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
