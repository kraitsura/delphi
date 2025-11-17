/**
 * VenueProposalCard - Displays AI-suggested venues for user review
 *
 * Allows users to:
 * - Save all suggested venues
 * - Edit individual venue details before saving
 * - Dismiss the entire proposal
 *
 * Features:
 * - Expiration timer (5 minutes)
 * - Inline editing for venue details
 * - Venue-specific fields (capacity, amenities, venue type)
 * - AI match scores and reasoning
 * - Pros/cons display
 * - Compact layout for message rendering
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	Building2,
	Check,
	CheckCircle,
	Clock,
	Edit2,
	Globe,
	Home,
	Mail,
	MapPin,
	Phone,
	Plus,
	Star,
	ThumbsDown,
	ThumbsUp,
	Trash2,
	TreePine,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VenueProposalCardProps {
	proposalId: Id<"proposals">;
	proposalType: "venue_suggestions";
	items: Array<{
		type: string;
		data: any;
		reasoning?: string;
	}>;
	expiresAt: number;
	eventId?: string;
	roomId: Id<"rooms">;
	status: "pending" | "accepted" | "rejected" | "expired";
}

interface EditableVenue {
	name: string;
	category: string;
	capacity?: number;
	venueType?: "indoor" | "outdoor" | "both";
	amenities?: string[];
	pricing?: {
		min?: number;
		max?: number;
		currency: string;
		notes?: string;
	};
	contact?: {
		email?: string;
		phone?: string;
		website?: string;
	};
	location?: {
		city?: string;
		state?: string;
	};
	rating?: number;
	reviewCount?: number;
	aiMetadata?: {
		matchScore?: number;
		pros?: string[];
		cons?: string[];
	};
}

// Common venue amenities
const COMMON_AMENITIES = [
	"Parking",
	"Catering Kitchen",
	"AV Equipment",
	"WiFi",
	"Bridal Suite",
	"Dance Floor",
	"Bar/Alcohol Service",
	"Restrooms",
	"Accessibility",
];

export function VenueProposalCard({
	proposalId,
	items,
	expiresAt,
	status,
}: VenueProposalCardProps) {
	// Query live proposal data to get current status
	const liveProposal = useQuery(api.proposals.getById, { proposalId });

	// Use live status if available, fallback to prop
	const currentStatus = liveProposal?.status || status;

	const [isEditing, setIsEditing] = useState(false);
	const [editedItems, setEditedItems] = useState<EditableVenue[]>([]);
	const [timeRemaining, setTimeRemaining] = useState<number>(0);
	const [isExpired, setIsExpired] = useState(currentStatus === "expired");
	const [isRejected, setIsRejected] = useState(currentStatus === "rejected");
	const [isAccepted, setIsAccepted] = useState(currentStatus === "accepted");
	const [createdVenues, setCreatedVenues] = useState<any[]>(
		currentStatus === "accepted" ? items.map((item) => item.data) : [],
	);
	const [showSuccessModal, setShowSuccessModal] = useState(false);

	const confirmProposal = useMutation(api.proposals.confirm);

	// Update state when live status changes
	useEffect(() => {
		if (liveProposal) {
			setIsExpired(liveProposal.status === "expired");
			setIsRejected(liveProposal.status === "rejected");
			setIsAccepted(liveProposal.status === "accepted");
			if (liveProposal.status === "accepted") {
				setCreatedVenues(items.map((item) => item.data));
			}
		}
	}, [liveProposal, items]);

	// Initialize edited items from proposal items
	useEffect(() => {
		if (items && items.length > 0) {
			const venueItems = items.map((item) => ({
				name: item.data.name || "Untitled Venue",
				category: item.data.category || "venue",
				capacity: item.data.capacity,
				venueType: item.data.venueType,
				amenities: item.data.amenities || [],
				pricing: item.data.pricing || { currency: "USD" },
				contact: item.data.contact || {},
				location: {
					city: item.data.city,
					state: item.data.state,
				},
				rating: item.data.rating,
				reviewCount: item.data.reviewCount,
				aiMetadata: item.data.aiMetadata,
			}));
			setEditedItems(venueItems);
		}
	}, [items]);

	// Expiration timer - only update if proposal is still pending
	useEffect(() => {
		const updateTimer = () => {
			const remaining = Math.max(0, expiresAt - Date.now());
			setTimeRemaining(remaining);

			// Only mark as expired if status is pending and time has run out
			if (currentStatus === "pending" && remaining === 0) {
				setIsExpired(true);
			}
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [expiresAt, currentStatus]);

	const formatTimeRemaining = (ms: number) => {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const formatPricing = (pricing?: {
		min?: number;
		max?: number;
		currency: string;
		notes?: string;
	}) => {
		if (!pricing || (!pricing.min && !pricing.max))
			return "Price not available";
		const format = (amount: number) =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: pricing.currency || "USD",
			}).format(amount);

		let priceStr = "";
		if (pricing.min && pricing.max) {
			priceStr = `${format(pricing.min)} - ${format(pricing.max)}`;
		} else if (pricing.min) {
			priceStr = `From ${format(pricing.min)}`;
		} else if (pricing.max) {
			priceStr = `Up to ${format(pricing.max)}`;
		}

		if (pricing.notes) {
			return `${priceStr} (${pricing.notes})`;
		}
		return priceStr || "Price not available";
	};

	const getVenueTypeIcon = (type?: string) => {
		switch (type) {
			case "indoor":
				return <Home className="h-3 w-3" />;
			case "outdoor":
				return <TreePine className="h-3 w-3" />;
			case "both":
				return <Building2 className="h-3 w-3" />;
			default:
				return <Building2 className="h-3 w-3" />;
		}
	};

	const handleAcceptAll = async () => {
		if (isExpired) {
			toast.error("This proposal has expired");
			return;
		}

		try {
			await confirmProposal({
				proposalId,
				action: "accept_all",
			});
			setIsAccepted(true);
			setCreatedVenues(items.map((item) => item.data));
			toast.success(
				`${items.length} venue${items.length > 1 ? "s" : ""} created successfully`,
			);
		} catch (error) {
			toast.error("Failed to create venues");
			console.error("Proposal confirmation error:", error);
		}
	};

	const handleSaveEdits = async () => {
		if (isExpired) {
			toast.error("This proposal has expired");
			return;
		}

		// Validate all venues have name and category
		const invalid = editedItems.some((venue) => !venue.name || !venue.category);
		if (invalid) {
			toast.error("All venues must have a name and category");
			return;
		}

		try {
			await confirmProposal({
				proposalId,
				action: "edit",
				editedItems: editedItems.map((venue) => ({
					type: "venue",
					data: {
						...venue,
						city: venue.location?.city,
						state: venue.location?.state,
					},
				})),
			});
			setIsAccepted(true);
			setCreatedVenues(editedItems);
			toast.success(
				`${editedItems.length} venue${editedItems.length > 1 ? "s" : ""} created with edits`,
			);
			setIsEditing(false);
		} catch (error) {
			toast.error("Failed to create venues");
			console.error("Proposal confirmation error:", error);
		}
	};

	const handleReject = async () => {
		try {
			await confirmProposal({
				proposalId,
				action: "reject",
			});
			setIsRejected(true);
			toast.info("Proposal rejected");
		} catch (error) {
			toast.error("Failed to reject proposal");
			console.error("Proposal rejection error:", error);
		}
	};

	const updateVenue = (
		index: number,
		field: keyof EditableVenue,
		value: any,
	) => {
		setEditedItems((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], [field]: value };
			return updated;
		});
	};

	const updateVenueContact = (index: number, field: string, value: string) => {
		setEditedItems((prev) => {
			const updated = [...prev];
			updated[index] = {
				...updated[index],
				contact: { ...updated[index].contact, [field]: value },
			};
			return updated;
		});
	};

	const updateVenueLocation = (index: number, field: string, value: string) => {
		setEditedItems((prev) => {
			const updated = [...prev];
			updated[index] = {
				...updated[index],
				location: { ...updated[index].location, [field]: value },
			};
			return updated;
		});
	};

	const toggleAmenity = (index: number, amenity: string) => {
		setEditedItems((prev) => {
			const updated = [...prev];
			const currentAmenities = updated[index].amenities || [];
			const hasAmenity = currentAmenities.includes(amenity);

			updated[index] = {
				...updated[index],
				amenities: hasAmenity
					? currentAmenities.filter((a) => a !== amenity)
					: [...currentAmenities, amenity],
			};
			return updated;
		});
	};

	const removeVenue = (index: number) => {
		setEditedItems((prev) => prev.filter((_, i) => i !== index));
	};

	const addVenue = () => {
		setEditedItems((prev) => [
			...prev,
			{
				name: "",
				category: "venue",
				pricing: { currency: "USD" },
				contact: {},
				location: {},
				amenities: [],
			},
		]);
	};

	if (isExpired) {
		return (
			<Card className="border-border/60 bg-muted/30 shadow-sm animate-fadeOut overflow-hidden relative w-full flex-shrink-0 min-w-0">
				{/* Expired overlay indicator */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-border via-muted-foreground/40 to-border" />

				<CardContent className="py-3 px-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Clock className="h-4 w-4" />
							<span className="text-sm font-medium">Proposal Expired</span>
						</div>
						<div className="flex items-center gap-3 text-muted-foreground">
							<div className="flex items-center gap-2 text-sm">
								<span className="font-medium">{items.length}</span>
								<span>venue{items.length > 1 ? "s" : ""}</span>
								<span>proposed</span>
							</div>
							<span className="text-xs italic opacity-70">
								Expired {formatTimeRemaining(Math.abs(Date.now() - expiresAt))}{" "}
								ago
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isRejected) {
		return (
			<Card className="border-destructive/20 bg-destructive/5 shadow-sm animate-fadeOut overflow-hidden relative w-full flex-shrink-0 min-w-0">
				{/* Rejected overlay indicator */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive/40 via-destructive/60 to-destructive/40" />

				<CardContent className="py-3 px-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-2 text-destructive/70">
							<X className="h-4 w-4" />
							<span className="text-sm font-medium">Proposal Rejected</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span className="font-medium">{items.length}</span>
							<span>venue{items.length > 1 ? "s" : ""}</span>
							<span>declined</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isAccepted) {
		return (
			<>
				<Card
					className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 shadow-sm animate-fadeOut overflow-hidden relative w-full flex-shrink-0 min-w-0 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/50 transition-all duration-200"
					onClick={() => setShowSuccessModal(true)}
				>
					{/* Success overlay indicator */}
					<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-400" />

					<CardContent className="py-3 px-4">
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-2 text-green-700 dark:text-green-400">
								<CheckCircle className="h-4 w-4" />
								<span className="text-sm font-medium">
									Venues Created Successfully
								</span>
							</div>
							<div className="flex items-center gap-3 text-green-600 dark:text-green-500">
								<div className="flex items-center gap-2 text-sm">
									<span className="font-medium">{createdVenues.length}</span>
									<span>venue{createdVenues.length > 1 ? "s" : ""}</span>
									<span>created</span>
								</div>
								<span className="text-xs opacity-70">
									Click to view details →
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Success Modal */}
				<Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
					<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<CheckCircle className="h-5 w-5 text-green-600" />
								Successfully Created Venues ({createdVenues.length})
							</DialogTitle>
						</DialogHeader>

						<div className="flex-1 overflow-y-auto space-y-3 pr-2">
							{createdVenues.map((venue, index) => (
								<div
									key={index}
									className="p-4 bg-muted/30 border border-border rounded-md"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm text-foreground">
												{venue.name || "Untitled Venue"}
											</div>
											<div className="flex items-center gap-2 mt-1.5 flex-wrap">
												{venue.venueType && (
													<span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium flex items-center gap-1">
														{getVenueTypeIcon(venue.venueType)}
														{venue.venueType}
													</span>
												)}
												{venue.capacity && (
													<div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
														<Users className="h-3 w-3" />
														<span>Up to {venue.capacity} guests</span>
													</div>
												)}
												{venue.rating && (
													<div className="flex items-center gap-0.5">
														<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
														<span className="text-[10px] text-muted-foreground">
															{venue.rating.toFixed(1)}
															{venue.reviewCount && ` (${venue.reviewCount})`}
														</span>
													</div>
												)}
											</div>
											{(venue.location?.city || venue.location?.state) && (
												<div className="flex items-center gap-1 mt-1.5">
													<MapPin className="h-3 w-3 text-muted-foreground" />
													<span className="text-[10px] text-muted-foreground">
														{[venue.location.city, venue.location.state]
															.filter(Boolean)
															.join(", ")}
													</span>
												</div>
											)}
											{venue.pricing && (
												<div className="text-xs text-muted-foreground mt-1.5">
													{formatPricing(venue.pricing)}
												</div>
											)}
											{venue.contact && (
												<div className="flex flex-wrap gap-2 mt-2">
													{venue.contact.email && (
														<a
															href={`mailto:${venue.contact.email}`}
															className="text-[10px] flex items-center gap-1 text-primary hover:underline"
														>
															<Mail className="h-2.5 w-2.5" />
															{venue.contact.email}
														</a>
													)}
													{venue.contact.phone && (
														<a
															href={`tel:${venue.contact.phone}`}
															className="text-[10px] flex items-center gap-1 text-primary hover:underline"
														>
															<Phone className="h-2.5 w-2.5" />
															{venue.contact.phone}
														</a>
													)}
													{venue.contact.website && (
														<a
															href={venue.contact.website}
															target="_blank"
															rel="noopener noreferrer"
															className="text-[10px] flex items-center gap-1 text-primary hover:underline"
														>
															<Globe className="h-2.5 w-2.5" />
															Website
														</a>
													)}
												</div>
											)}
											{venue.amenities && venue.amenities.length > 0 && (
												<div className="mt-2">
													<div className="text-[10px] font-medium text-muted-foreground mb-1">
														Amenities:
													</div>
													<div className="flex flex-wrap gap-1">
														{venue.amenities.map(
															(amenity: string, i: number) => (
																<span
																	key={i}
																	className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded"
																>
																	{amenity}
																</span>
															),
														)}
													</div>
												</div>
											)}
										</div>
										<CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
									</div>
								</div>
							))}
						</div>

						<DialogFooter>
							<Button onClick={() => setShowSuccessModal(false)}>Close</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

	return (
		<Card className="border-border/60 bg-card shadow-sm animate-fadeInUp w-full flex-shrink-0 min-w-0">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
						<Building2 className="h-4 w-4" />
						Venue Suggestions
					</CardTitle>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Clock className="h-3.5 w-3.5" />
						<span className="font-mono tabular-nums">
							{formatTimeRemaining(timeRemaining)}
						</span>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-2.5 min-h-[200px] transition-all duration-300">
				{!isEditing ? (
					// Preview mode
					<div className="space-y-3 transition-all duration-300 w-full">
						{items.map((item, index) => (
							<div
								key={index}
								className="px-4 py-3.5 bg-muted/20 border border-border/40 rounded-md hover:border-border hover:bg-muted/30 transition-all duration-200 animate-scaleIn w-full"
								style={{ animationDelay: `${index * 50}ms` }}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="font-medium text-sm text-foreground flex items-center gap-2">
											{item.data.name || "Untitled Venue"}
											{item.data.aiMetadata?.matchScore && (
												<span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-mono">
													{Math.round(item.data.aiMetadata.matchScore)}% match
												</span>
											)}
										</div>

										{/* Venue type, capacity, rating */}
										<div className="flex items-center gap-2 mt-1 flex-wrap">
											{item.data.venueType && (
												<span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
													{getVenueTypeIcon(item.data.venueType)}
													{item.data.venueType}
												</span>
											)}
											{item.data.capacity && (
												<div className="flex items-center gap-0.5 text-[10px] text-gray-600">
													<Users className="h-3 w-3" />
													<span>Up to {item.data.capacity} guests</span>
												</div>
											)}
											{item.data.rating && (
												<div className="flex items-center gap-0.5">
													<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
													<span className="text-[10px] text-gray-600">
														{item.data.rating.toFixed(1)}
														{item.data.reviewCount &&
															` (${item.data.reviewCount})`}
													</span>
												</div>
											)}
										</div>

										{/* Location */}
										{(item.data.city || item.data.state) && (
											<div className="flex items-center gap-1 mt-1">
												<MapPin className="h-3 w-3 text-gray-500" />
												<span className="text-[10px] text-gray-600">
													{[item.data.city, item.data.state]
														.filter(Boolean)
														.join(", ")}
												</span>
											</div>
										)}

										{/* Pricing */}
										<div className="text-xs text-gray-600 mt-1">
											{formatPricing(item.data.pricing)}
										</div>

										{/* Amenities */}
										{item.data.amenities && item.data.amenities.length > 0 && (
											<div className="mt-1.5">
												<div className="text-[10px] font-medium text-gray-700 mb-0.5">
													Amenities:
												</div>
												<div className="flex flex-wrap gap-1">
													{item.data.amenities
														.slice(0, 4)
														.map((amenity: string, i: number) => (
															<span
																key={i}
																className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded"
															>
																{amenity}
															</span>
														))}
													{item.data.amenities.length > 4 && (
														<span className="text-[10px] text-gray-500">
															+{item.data.amenities.length - 4} more
														</span>
													)}
												</div>
											</div>
										)}

										{/* Contact info */}
										{item.data.contact && (
											<div className="flex flex-wrap gap-2 mt-1.5">
												{item.data.contact.email && (
													<a
														href={`mailto:${item.data.contact.email}`}
														className="text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-800"
													>
														<Mail className="h-2.5 w-2.5" />
														{item.data.contact.email}
													</a>
												)}
												{item.data.contact.phone && (
													<a
														href={`tel:${item.data.contact.phone}`}
														className="text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-800"
													>
														<Phone className="h-2.5 w-2.5" />
														{item.data.contact.phone}
													</a>
												)}
												{item.data.contact.website && (
													<a
														href={item.data.contact.website}
														target="_blank"
														rel="noopener noreferrer"
														className="text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-800"
													>
														<Globe className="h-2.5 w-2.5" />
														Website
													</a>
												)}
											</div>
										)}

										{/* AI pros/cons */}
										{item.data.aiMetadata && (
											<div className="mt-2 pt-2 border-t border-purple-100 space-y-1">
												{item.data.aiMetadata.pros &&
													item.data.aiMetadata.pros.length > 0 && (
														<div className="text-[10px] text-green-700">
															<div className="flex items-center gap-1 font-medium">
																<ThumbsUp className="h-2.5 w-2.5" />
																Pros:
															</div>
															<ul className="ml-4 list-disc">
																{item.data.aiMetadata.pros.map(
																	(pro: string, i: number) => (
																		<li key={i}>{pro}</li>
																	),
																)}
															</ul>
														</div>
													)}
												{item.data.aiMetadata.cons &&
													item.data.aiMetadata.cons.length > 0 && (
														<div className="text-[10px] text-red-700">
															<div className="flex items-center gap-1 font-medium">
																<ThumbsDown className="h-2.5 w-2.5" />
																Cons:
															</div>
															<ul className="ml-4 list-disc">
																{item.data.aiMetadata.cons.map(
																	(con: string, i: number) => (
																		<li key={i}>{con}</li>
																	),
																)}
															</ul>
														</div>
													)}
											</div>
										)}
									</div>
								</div>
								{item.reasoning && (
									<div className="text-[10px] text-purple-600 mt-2 italic border-t border-purple-100 pt-2">
										💡 {item.reasoning}
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					// Edit mode
					<div className="space-y-3">
						{editedItems.map((venue, index) => (
							<div
								key={index}
								className="p-3 bg-white border border-purple-200 rounded-md space-y-2"
							>
								<div className="flex items-start gap-2">
									<div className="flex-1 space-y-2">
										{/* Name */}
										<Input
											placeholder="Venue name"
											value={venue.name}
											onChange={(e) =>
												updateVenue(index, "name", e.target.value)
											}
											className="h-8 text-sm"
										/>

										{/* Capacity and Venue Type */}
										<div className="grid grid-cols-2 gap-2">
											<Input
												placeholder="Capacity (guests)"
												type="number"
												value={venue.capacity || ""}
												onChange={(e) =>
													updateVenue(
														index,
														"capacity",
														parseInt(e.target.value, 10) || undefined,
													)
												}
												className="h-7 text-xs"
											/>
											<select
												value={venue.venueType || ""}
												onChange={(e) =>
													updateVenue(
														index,
														"venueType",
														e.target.value as
															| "indoor"
															| "outdoor"
															| "both"
															| undefined,
													)
												}
												className="h-7 text-xs border border-input rounded-md px-2"
											>
												<option value="">Venue Type</option>
												<option value="indoor">Indoor</option>
												<option value="outdoor">Outdoor</option>
												<option value="both">Both</option>
											</select>
										</div>

										{/* Location */}
										<div className="grid grid-cols-2 gap-2">
											<Input
												placeholder="City"
												value={venue.location?.city || ""}
												onChange={(e) =>
													updateVenueLocation(index, "city", e.target.value)
												}
												className="h-7 text-xs"
											/>
											<Input
												placeholder="State"
												value={venue.location?.state || ""}
												onChange={(e) =>
													updateVenueLocation(index, "state", e.target.value)
												}
												className="h-7 text-xs"
											/>
										</div>

										{/* Contact */}
										<div className="grid grid-cols-3 gap-2">
											<Input
												placeholder="Email"
												type="email"
												value={venue.contact?.email || ""}
												onChange={(e) =>
													updateVenueContact(index, "email", e.target.value)
												}
												className="h-7 text-xs"
											/>
											<Input
												placeholder="Phone"
												type="tel"
												value={venue.contact?.phone || ""}
												onChange={(e) =>
													updateVenueContact(index, "phone", e.target.value)
												}
												className="h-7 text-xs"
											/>
											<Input
												placeholder="Website"
												type="url"
												value={venue.contact?.website || ""}
												onChange={(e) =>
													updateVenueContact(index, "website", e.target.value)
												}
												className="h-7 text-xs"
											/>
										</div>

										{/* Amenities */}
										<div className="space-y-1">
											<Label className="text-[10px] text-gray-600">
												Amenities
											</Label>
											<div className="grid grid-cols-3 gap-1">
												{COMMON_AMENITIES.map((amenity) => (
													<div
														key={amenity}
														className="flex items-center gap-1.5"
													>
														<Checkbox
															id={`amenity-${index}-${amenity}`}
															checked={venue.amenities?.includes(amenity)}
															onCheckedChange={() =>
																toggleAmenity(index, amenity)
															}
															className="h-3 w-3"
														/>
														<label
															htmlFor={`amenity-${index}-${amenity}`}
															className="text-[10px] cursor-pointer"
														>
															{amenity}
														</label>
													</div>
												))}
											</div>
										</div>
									</div>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => removeVenue(index)}
										className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						))}
						<Button
							size="sm"
							variant="outline"
							onClick={addVenue}
							className="w-full h-8 text-xs"
						>
							<Plus className="h-3.5 w-3.5 mr-1" />
							Add Venue
						</Button>
					</div>
				)}
			</CardContent>

			<CardFooter className="pt-4 flex gap-2">
				{!isEditing ? (
					<>
						<Button
							size="sm"
							onClick={handleAcceptAll}
							className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 hover:scale-[1.02]"
						>
							<Check className="h-3.5 w-3.5 mr-1.5" />
							Accept All ({items.length})
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(true)}
							className="h-9 transition-all duration-150"
						>
							<Edit2 className="h-3.5 w-3.5 mr-1.5" />
							Edit
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={handleReject}
							className="h-9 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-150"
						>
							<X className="h-3.5 w-3.5 mr-1.5" />
							Reject
						</Button>
					</>
				) : (
					<>
						<Button
							size="sm"
							onClick={handleSaveEdits}
							className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-150 hover:scale-[1.02]"
						>
							<Check className="h-3.5 w-3.5 mr-1.5" />
							Save & Create ({editedItems.length})
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setIsEditing(false)}
							className="h-9 transition-all duration-150"
						>
							Cancel
						</Button>
					</>
				)}
			</CardFooter>
		</Card>
	);
}
