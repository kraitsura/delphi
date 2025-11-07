import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EventEditDialogProps {
	eventId: Id<"events">;
	trigger?: React.ReactNode;
	onSuccess?: () => void;
}

export function EventEditDialog({
	eventId,
	trigger,
	onSuccess,
}: EventEditDialogProps) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Fetch current event data
	const event = useQuery(api.events.getById, { eventId });
	const updateEvent = useMutation(api.events.update);

	// Form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [budget, setBudget] = useState("");
	const [expectedGuests, setExpectedGuests] = useState("");
	const [date, setDate] = useState("");
	const [address, setAddress] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [country, setCountry] = useState("");

	// Initialize form with event data
	useEffect(() => {
		if (event) {
			setName(event.name);
			setDescription(event.description || "");
			setBudget(event.budget.total.toString());
			setExpectedGuests(event.guestCount.expected.toString());
			setDate(
				event.date ? new Date(event.date).toISOString().split("T")[0] : "",
			);
			setAddress(event.location?.address || "");
			setCity(event.location?.city || "");
			setState(event.location?.state || "");
			setCountry(event.location?.country || "");
		}
	}, [event]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error("Please enter an event name");
			return;
		}

		setIsLoading(true);

		try {
			await updateEvent({
				eventId,
				name: name.trim(),
				description: description.trim() || undefined,
				budget: budget ? { total: parseFloat(budget) } : undefined,
				guestCount: expectedGuests
					? { expected: parseInt(expectedGuests, 10) }
					: undefined,
				date: date ? new Date(date).getTime() : undefined,
				location:
					address && city && state && country
						? {
								address: address.trim(),
								city: city.trim(),
								state: state.trim(),
								country: country.trim(),
							}
						: undefined,
			});

			toast.success("Event updated successfully!");
			setOpen(false);
			onSuccess?.();
		} catch (error) {
			console.error("Failed to update event:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to update event",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<Pencil className="h-4 w-4 mr-2" />
						Edit Event
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Event</DialogTitle>
					<DialogDescription>
						Update your event details. Changes will be saved immediately.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
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
							disabled={isLoading}
						/>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Tell us about your event..."
							rows={3}
							disabled={isLoading}
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
								disabled={isLoading}
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
								disabled={isLoading}
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
							disabled={isLoading}
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
								disabled={isLoading}
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
									disabled={isLoading}
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
									disabled={isLoading}
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
									disabled={isLoading}
								/>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
