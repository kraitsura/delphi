import { StatusBadge } from "@/components/events/StatusBadge";

type EventStatus = "planning" | "active" | "completed" | "cancelled";

interface EventHeaderProps {
	name: string;
	status: EventStatus;
}

export function EventHeader({ name, status }: EventHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-3 flex-1 min-w-0">
			<h1 className="text-2xl font-bold truncate">{name}</h1>
			<StatusBadge status={status} />
		</div>
	);
}
