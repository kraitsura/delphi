import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EventCreateForm() {
	const navigate = useNavigate();
	const createEvent = useMutation(api.events.create);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [type, setType] = useState<
		"wedding" | "corporate" | "party" | "destination" | "other"
	>("wedding");
	const [budget, setBudget] = useState("");
	const [expectedGuests, setExpectedGuests] = useState("");
	const [date, setDate] = useState("");
	const [address, setAddress] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [country, setCountry] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const result = await createEvent({
				name,
				description: description || undefined,
				type,
				budget: parseFloat(budget) || 0,
				expectedGuests: parseInt(expectedGuests, 10) || 0,
				date: date ? new Date(date).getTime() : undefined,
				location:
					address && city && state && country
						? { address, city, state, country }
						: undefined,
			});

			toast.success("Event created successfully!");
			navigate({ to: `/events/${result.eventId}` });
		} catch (error) {
			toast.error(`Failed to create event: ${error}`);
			console.error("Event creation error:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="w-full max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle>Create New Event</CardTitle>
				<CardDescription>
					Start planning your event by filling out the details below
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Event Name */}
					<div className="space-y-2">
						<Label htmlFor="name">
							Event Name <span className="text-red-500">*</span>
						</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Sarah & John's Wedding"
							required
						/>
					</div>

					{/* Event Type */}
					<div className="space-y-2">
						<Label htmlFor="type">
							Event Type <span className="text-red-500">*</span>
						</Label>
						<select
							id="type"
							value={type}
							onChange={(e) =>
								setType(
									e.target.value as
										| "wedding"
										| "corporate"
										| "party"
										| "destination"
										| "other",
								)
							}
							className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							required
						>
							<option value="wedding">Wedding</option>
							<option value="corporate">Corporate Event</option>
							<option value="party">Party</option>
							<option value="destination">Destination Event</option>
							<option value="other">Other</option>
						</select>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Tell us about your event..."
							rows={4}
						/>
					</div>

					{/* Date and Budget Row */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="date">Event Date</Label>
							<Input
								id="date"
								type="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="budget">Total Budget ($)</Label>
							<Input
								id="budget"
								type="number"
								value={budget}
								onChange={(e) => setBudget(e.target.value)}
								placeholder="50000"
								min="0"
								step="100"
							/>
						</div>
					</div>

					{/* Expected Guests */}
					<div className="space-y-2">
						<Label htmlFor="guests">Expected Guests</Label>
						<Input
							id="guests"
							type="number"
							value={expectedGuests}
							onChange={(e) => setExpectedGuests(e.target.value)}
							placeholder="150"
							min="0"
						/>
					</div>

					{/* Location */}
					<div className="space-y-4">
						<Label className="text-base font-semibold">
							Location (Optional)
						</Label>

						<div className="space-y-2">
							<Label htmlFor="address" className="text-sm font-normal">
								Address
							</Label>
							<Input
								id="address"
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								placeholder="123 Main Street"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="city" className="text-sm font-normal">
									City
								</Label>
								<Input
									id="city"
									value={city}
									onChange={(e) => setCity(e.target.value)}
									placeholder="San Francisco"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="state" className="text-sm font-normal">
									State
								</Label>
								<Input
									id="state"
									value={state}
									onChange={(e) => setState(e.target.value)}
									placeholder="CA"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="country" className="text-sm font-normal">
									Country
								</Label>
								<Input
									id="country"
									value={country}
									onChange={(e) => setCountry(e.target.value)}
									placeholder="USA"
								/>
							</div>
						</div>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end gap-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => navigate({ to: "/events" })}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Creating..." : "Create Event"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
