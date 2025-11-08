import type { Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";

export interface VendorsListProps {
	eventId: Id<"events">;
	category?: string;
	status?: "contacted" | "contracted" | "paid" | "all";
	sortBy?: "name" | "category" | "totalCost";
	onVendorSelect?: (vendorId: Id<"users">) => void;
}

export function VendorsList(_props: VendorsListProps) {
	// Placeholder: This component requires vendor relationship schema
	// Vendors will be users with vendor role linked to events

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Vendors
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center text-muted-foreground">
				<p className="mb-2">Vendor management coming soon</p>
				<p className="text-xs">Requires vendor schema implementation</p>
			</CardContent>
		</Card>
	);
}

export const VendorsListMetadata = {
	name: "VendorsList",
	description: "Directory of vendors with contact info and status",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minWidth: "300px",
	},
	connections: {
		canBeMaster: true,
		canBeDetail: false,
		emits: ["vendorSelected"],
		listensTo: [],
	},
	props: {
		eventId: {
			type: "string",
			required: true,
			description: "Event identifier",
		},
		category: {
			type: "string",
			required: false,
			description: "Filter by vendor category",
		},
	},
};
