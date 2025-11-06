import { Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoItem } from "../InfoItem";

interface EventInfoCardProps {
	date?: number;
	location?: {
		address: string;
		city: string;
		state: string;
		country: string;
	};
	guestCount: {
		confirmed: number;
		expected: number;
	};
}

export function EventInfoCard({
	date,
	location,
	guestCount,
}: EventInfoCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Event Information</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{date && (
					<InfoItem
						icon={Calendar}
						label="Event Date"
						value={new Date(date).toLocaleDateString("en-US", {
							weekday: "long",
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					/>
				)}

				{location && (
					<InfoItem
						icon={MapPin}
						label="Location"
						value={
							<>
								<div className="font-medium">{location.address}</div>
								<div className="text-sm text-muted-foreground">
									{location.city}, {location.state}
								</div>
								<div className="text-sm text-muted-foreground">
									{location.country}
								</div>
							</>
						}
					/>
				)}

				<InfoItem
					icon={Users}
					label="Guest Count"
					value={`${guestCount.confirmed} confirmed / ${guestCount.expected} expected`}
				/>
			</CardContent>
		</Card>
	);
}
