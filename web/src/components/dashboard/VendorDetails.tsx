import type { Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface VendorDetailsProps {
	eventId: Id<"events">;
	vendorId: Id<"users">;
}

export function VendorDetails(_props: VendorDetailsProps) {
	// Placeholder: This component requires vendor relationship schema

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Vendor Details
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p className="mb-2">Vendor details coming soon</p>
				<p className="text-xs">Requires vendor schema implementation</p>
			</CardContent>
		</Card>
	);
}

export const VendorDetailsMetadata = {
	name: "VendorDetails",
	description: "Deep-dive into single vendor with contracts and expenses",
	layoutRules: {
		canShare: false,
		mustSpanFull: true,
		preferredRatio: "1fr",
		minHeight: "400px",
	},
	connections: {
		canBeMaster: false,
		canBeDetail: true,
		emits: [],
		listensTo: ["vendorSelected"],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		vendorId: {
			type: "string",
			required: true,
			description: "Vendor user identifier",
		},
	},
};
