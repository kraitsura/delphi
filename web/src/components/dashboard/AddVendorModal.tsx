import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

export interface AddVendorModalProps {
	eventId: Id<"events">;
	modalId: string;
}

export function AddVendorModal(props: AddVendorModalProps) {
	const { eventId, modalId } = props;
	const userProfile = useQuery(api.users.getMyProfile);
	const createVendor = useMutation(api.vendors.create);

	const closeModal = useDashboardStore((state) => state.closeModal);
	const showToast = useDashboardStore((state) => state.showToast);
	const addError = useDashboardStore((state) => state.addError);

	// Form state
	const [name, setName] = useState("");
	const [category, setCategory] = useState("");
	const [description, setDescription] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [website, setWebsite] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [country, setCountry] = useState("");
	const [status, setStatus] = useState<
		"researching" | "contacted" | "pending" | "confirmed" | "declined"
	>("researching");

	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			addError("Vendor name is required");
			return;
		}

		if (!category.trim()) {
			addError("Category is required");
			return;
		}

		if (!userProfile) {
			addError("You must be logged in to create a vendor");
			return;
		}

		try {
			setIsSaving(true);
			await createVendor({
				eventId,
				name,
				category,
				description: description || undefined,
				email: email || undefined,
				phone: phone || undefined,
				website: website || undefined,
				city: city || undefined,
				state: state || undefined,
				country: country || undefined,
				status,
				addedBy: userProfile._id,
			});
			showToast("The vendor has been added successfully.", "success");
			closeModal(modalId);
		} catch (error) {
			addError(
				error instanceof Error ? error.message : "Failed to create vendor",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={true} onOpenChange={() => closeModal(modalId)}>
			<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Add New Vendor</DialogTitle>
					<DialogDescription>
						Add a vendor to your event planning
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
					<div className="overflow-y-auto flex-1 space-y-4 px-1">
						{/* Name and Category */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="name">
									Vendor Name <span className="text-red-500">*</span>
								</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Enter vendor name"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="category">
									Category <span className="text-red-500">*</span>
								</Label>
								<Input
									id="category"
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									placeholder="e.g., Catering, Photography"
									required
								/>
							</div>
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Enter vendor description"
								rows={3}
							/>
						</div>

						{/* Contact Information */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="vendor@example.com"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="phone">Phone</Label>
								<Input
									id="phone"
									type="tel"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									placeholder="+1 (555) 000-0000"
								/>
							</div>
						</div>

						{/* Website */}
						<div className="space-y-2">
							<Label htmlFor="website">Website</Label>
							<Input
								id="website"
								type="url"
								value={website}
								onChange={(e) => setWebsite(e.target.value)}
								placeholder="https://..."
							/>
						</div>

						{/* Location */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="city">City</Label>
								<Input
									id="city"
									value={city}
									onChange={(e) => setCity(e.target.value)}
									placeholder="City"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="state">State</Label>
								<Input
									id="state"
									value={state}
									onChange={(e) => setState(e.target.value)}
									placeholder="State"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="country">Country</Label>
								<Input
									id="country"
									value={country}
									onChange={(e) => setCountry(e.target.value)}
									placeholder="Country"
								/>
							</div>
						</div>

						{/* Status */}
						<div className="space-y-2">
							<Label htmlFor="status">Status</Label>
							<Select
								value={status}
								onValueChange={(value) => setStatus(value as typeof status)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="researching">Researching</SelectItem>
									<SelectItem value="contacted">Contacted</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
									<SelectItem value="confirmed">Confirmed</SelectItem>
									<SelectItem value="declined">Declined</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter className="mt-4 flex-shrink-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => closeModal(modalId)}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving ? "Creating..." : "Create Vendor"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
