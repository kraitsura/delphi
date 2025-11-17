/**
 * VendorCard - Displays vendor information and status
 *
 * Features:
 * - Vendor details (name, category, contact)
 * - Contract status and cost
 * - Quick actions (save, contact, view details)
 * - Scoped to vendor room context
 * - Compact layout for messages
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	AlertCircle,
	Bookmark,
	BookmarkCheck,
	CheckCircle2,
	Clock,
	DollarSign,
	ExternalLink,
	Mail,
	MapPin,
	Phone,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VendorCardProps {
	vendorId?: Id<"vendors">;
	vendorData?: {
		name: string;
		category?: string;
		email?: string;
		phone?: string;
		website?: string;
		address?: string;
		contractStatus?: "pending" | "confirmed" | "cancelled";
		proposedCost?: number;
		notes?: string;
	};
	eventId: Id<"events">;
	roomId?: Id<"rooms">;
	showActions?: boolean;
}

export function VendorCard({
	vendorId,
	vendorData,
	eventId,
	showActions = true,
}: VendorCardProps) {
	const [isSaved, setIsSaved] = useState(false);

	// Query vendor from database if ID is provided
	const dbVendor = useQuery(api.vendors.get, vendorId ? { vendorId } : "skip");

	// Get current user profile for addedBy field
	const userProfile = useQuery(api.users.getMyProfile);

	// Use provided data or database data
	const vendor = vendorData || dbVendor;

	// Mutation to save vendor
	const createVendor = useMutation(api.vendors.create);

	const handleSaveVendor = async () => {
		if (!vendorData) {
			toast.error("No vendor data to save");
			return;
		}

		if (!userProfile) {
			toast.error("User profile not loaded");
			return;
		}

		try {
			await createVendor({
				eventId,
				name: vendorData.name,
				category: vendorData.category || "Other",
				email: vendorData.email,
				phone: vendorData.phone,
				website: vendorData.website,
				status:
					vendorData.contractStatus === "confirmed"
						? "contracted"
						: vendorData.contractStatus === "cancelled"
							? "rejected"
							: "researching",
				addedBy: userProfile._id,
			});
			setIsSaved(true);
			toast.success(`${vendorData.name} saved to vendors`);
		} catch (error) {
			toast.error("Failed to save vendor");
			console.error("Vendor save error:", error);
		}
	};

	const handleContact = (type: "email" | "phone" | "website") => {
		if (type === "email" && vendor?.email) {
			window.location.href = `mailto:${vendor.email}`;
		} else if (type === "phone" && vendor?.phone) {
			window.location.href = `tel:${vendor.phone}`;
		} else if (type === "website" && vendor?.website) {
			window.open(vendor.website, "_blank");
		}
	};

	const getContractStatusBadge = (status?: string) => {
		switch (status) {
			case "confirmed":
				return {
					icon: CheckCircle2,
					text: "Confirmed",
					className: "bg-green-100 text-green-700 border-green-200",
				};
			case "pending":
				return {
					icon: Clock,
					text: "Pending",
					className: "bg-yellow-100 text-yellow-700 border-yellow-200",
				};
			case "cancelled":
				return {
					icon: AlertCircle,
					text: "Cancelled",
					className: "bg-red-100 text-red-700 border-red-200",
				};
			default:
				return {
					icon: Clock,
					text: "Unknown",
					className: "bg-gray-100 text-gray-700 border-gray-200",
				};
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	if (!vendor) {
		return (
			<Card className="border-purple-200 bg-purple-50">
				<CardContent className="py-8">
					<div className="text-center text-sm text-gray-500">
						Loading vendor information...
					</div>
				</CardContent>
			</Card>
		);
	}

	const statusBadge = getContractStatusBadge(vendorData?.contractStatus);
	const StatusIcon = statusBadge.icon;

	return (
		<Card className="border-purple-200 bg-purple-50">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-base font-semibold text-purple-900 truncate">
							{vendor.name}
						</CardTitle>
						{vendor.category && (
							<div className="text-xs text-purple-600 mt-0.5">
								{vendor.category}
							</div>
						)}
					</div>
					<div
						className={cn(
							"flex items-center gap-1 px-2 py-1 text-[10px] font-medium border rounded-full",
							statusBadge.className,
						)}
					>
						<StatusIcon className="h-3 w-3" />
						{statusBadge.text}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{/* Contact information */}
				<div className="space-y-1.5">
					{vendor.email && (
						<button
							type="button"
							onClick={() => handleContact("email")}
							className="flex items-center gap-2 text-xs text-gray-700 hover:text-purple-600 transition-colors w-full"
						>
							<Mail className="h-3.5 w-3.5 flex-shrink-0" />
							<span className="truncate">{vendor.email}</span>
						</button>
					)}
					{vendor.phone && (
						<button
							type="button"
							onClick={() => handleContact("phone")}
							className="flex items-center gap-2 text-xs text-gray-700 hover:text-purple-600 transition-colors w-full"
						>
							<Phone className="h-3.5 w-3.5 flex-shrink-0" />
							<span>{vendor.phone}</span>
						</button>
					)}
					{vendor.website && (
						<button
							type="button"
							onClick={() => handleContact("website")}
							className="flex items-center gap-2 text-xs text-gray-700 hover:text-purple-600 transition-colors w-full"
						>
							<ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
							<span className="truncate">{vendor.website}</span>
						</button>
					)}
					{vendorData?.address && (
						<div className="flex items-start gap-2 text-xs text-gray-700">
							<MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
							<span className="line-clamp-2">{vendorData.address}</span>
						</div>
					)}
				</div>

				{/* Cost information */}
				{vendorData?.proposedCost !== undefined &&
					vendorData.proposedCost > 0 && (
						<div className="p-2 bg-white border border-purple-200 rounded-md">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5 text-xs text-gray-600">
									<DollarSign className="h-3.5 w-3.5" />
									Proposed Cost
								</div>
								<div className="text-sm font-bold text-gray-900">
									{formatCurrency(vendorData.proposedCost)}
								</div>
							</div>
						</div>
					)}

				{/* Notes */}
				{vendorData?.notes && (
					<div className="p-2 bg-white border border-purple-200 rounded-md">
						<div className="text-[10px] font-medium text-gray-600 mb-1">
							Notes
						</div>
						<div className="text-xs text-gray-700 line-clamp-3">
							{vendorData.notes}
						</div>
					</div>
				)}
			</CardContent>

			{showActions && (
				<CardFooter className="pt-3 flex gap-2">
					{!vendorId && !isSaved ? (
						<Button
							size="sm"
							onClick={handleSaveVendor}
							className="flex-1 h-8 bg-purple-600 hover:bg-purple-700"
						>
							<Bookmark className="h-3.5 w-3.5 mr-1" />
							Save Vendor
						</Button>
					) : (
						<Button
							size="sm"
							variant="outline"
							disabled
							className="flex-1 h-8 text-green-600 border-green-300"
						>
							<BookmarkCheck className="h-3.5 w-3.5 mr-1" />
							Saved
						</Button>
					)}
					{vendor.email && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleContact("email")}
							className="h-8"
						>
							<Mail className="h-3.5 w-3.5 mr-1" />
							Contact
						</Button>
					)}
				</CardFooter>
			)}
		</Card>
	);
}
