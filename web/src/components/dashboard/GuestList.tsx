import type { Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface GuestListProps {
	eventId: Id<"events">;
	rsvpStatus?: "pending" | "accepted" | "declined" | "all";
	searchQuery?: string;
	sortBy?: "name" | "rsvpStatus" | "groupName";
	showFilters?: boolean;
}

export function GuestList(_props: GuestListProps) {
	// Placeholder: This component requires a guests table in the schema
	// For now, we'll show a placeholder message

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Guest List
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p className="mb-2">Guest management coming soon</p>
				<p className="text-xs">Requires guests table schema implementation</p>
			</CardContent>
		</Card>
	);
}

export const GuestListMetadata = {
	name: "GuestList",
	description: "Guest management with RSVP tracking",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "2fr",
		minWidth: "400px",
	},
	connections: {
		canBeMaster: false,
		canBeDetail: false,
		emits: [],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		rsvpStatus: {
			type: "enum",
			required: false,
			values: ["pending", "accepted", "declined", "all"],
			description: "Filter by RSVP status",
		},
	},
};
