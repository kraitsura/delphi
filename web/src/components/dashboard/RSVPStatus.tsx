import type { Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface RSVPStatusProps {
	eventId: Id<"events">;
	showChart?: boolean;
	showBreakdown?: boolean;
}

export function RSVPStatus(_props: RSVPStatusProps) {
	// Placeholder: This component requires a guests table in the schema

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} RSVP Status
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p className="mb-2">RSVP tracking coming soon</p>
				<p className="text-xs">Requires guests table schema implementation</p>
			</CardContent>
		</Card>
	);
}

export const RSVPStatusMetadata = {
	name: "RSVPStatus",
	description: "RSVP summary and statistics",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "300px",
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
		showChart: {
			type: "boolean",
			required: false,
			description: "Show RSVP chart",
		},
	},
};
