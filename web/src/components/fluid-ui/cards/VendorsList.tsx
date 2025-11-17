/**
 * VendorsList - Master component for displaying and selecting vendors
 *
 * Features:
 * - Grid layout of VendorCard components
 * - Category and status filtering
 * - Zustand master component (emits vendorId selection)
 * - Loading and empty states
 * - Quick actions for each vendor
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { VendorCard } from "./VendorCard";

export interface VendorsListProps {
	eventId: Id<"events">;
	category?: string;
	status?: string;
	limit?: number;
	title?: string;
}

export function VendorsList({
	eventId,
	category: initialCategory,
	status: initialStatus,
	limit,
	title = "Vendors",
}: VendorsListProps) {
	// Local filter state
	const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
		initialCategory,
	);
	const [statusFilter, setStatusFilter] = useState<string | undefined>(
		initialStatus,
	);

	// Zustand: Read and write vendor selection
	const selectedVendor = useDashboardStore(
		(state) => state.selections.vendorId,
	);
	const select = useDashboardStore((state) => state.select);

	// Query vendors from Convex
	const vendors = useQuery(api.vendors.listByEvent, {
		eventId,
		category: categoryFilter,
		status: statusFilter,
	});

	// Apply limit if specified
	const displayedVendors = useMemo(() => {
		if (!vendors) return undefined;
		return limit ? vendors.slice(0, limit) : vendors;
	}, [vendors, limit]);

	// Get unique categories and statuses for filter UI
	const filterOptions = useMemo(() => {
		if (!vendors) return { categories: [], statuses: [] };

		const categories = Array.from(
			new Set(vendors.map((v) => v.category).filter(Boolean)),
		);
		const statuses = Array.from(
			new Set(vendors.map((v) => v.status).filter(Boolean)),
		);

		return { categories, statuses };
	}, [vendors]);

	const handleVendorClick = (vendorId: string) => {
		// Toggle vendor selection (click same vendor to deselect)
		const newVendor = selectedVendor === vendorId ? null : vendorId;

		// Update Zustand store with new selection
		if (newVendor) {
			select("vendorId", newVendor);
		} else {
			select("vendorId", null);
		}
	};

	const handleClearFilters = () => {
		setCategoryFilter(undefined);
		setStatusFilter(undefined);
	};

	// Loading state
	if (vendors === undefined) {
		return <VendorsListSkeleton title={title} />;
	}

	// Empty state
	if (!vendors || vendors.length === 0) {
		return <VendorsListEmpty title={title} />;
	}

	const hasFilters = categoryFilter || statusFilter;

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<CardTitle className="fluid-component-title">
							{SYMBOLS.HANDSHAKE} {title}
						</CardTitle>
						<Badge variant="outline">
							{displayedVendors?.length || 0} vendors
						</Badge>
					</div>

					{/* Filter indicator */}
					{hasFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearFilters}
							className="h-7 text-xs"
						>
							<X className="h-3 w-3 mr-1" />
							Clear filters
						</Button>
					)}
				</div>

				{/* Filter controls */}
				{filterOptions.categories.length > 1 && (
					<div className="flex flex-wrap gap-2 mt-3">
						<div className="flex items-center gap-1.5">
							<Filter className="h-3.5 w-3.5 text-muted-foreground" />
							<span className="text-xs text-muted-foreground">Category:</span>
						</div>
						<Button
							variant={!categoryFilter ? "default" : "outline"}
							size="sm"
							onClick={() => setCategoryFilter(undefined)}
							className="h-6 text-xs"
						>
							All
						</Button>
						{filterOptions.categories.map((cat) => (
							<Button
								key={cat}
								variant={categoryFilter === cat ? "default" : "outline"}
								size="sm"
								onClick={() => setCategoryFilter(cat)}
								className="h-6 text-xs"
							>
								{cat}
							</Button>
						))}
					</div>
				)}

				{filterOptions.statuses.length > 1 && (
					<div className="flex flex-wrap gap-2 mt-2">
						<div className="flex items-center gap-1.5">
							<span className="text-xs text-muted-foreground">Status:</span>
						</div>
						<Button
							variant={!statusFilter ? "default" : "outline"}
							size="sm"
							onClick={() => setStatusFilter(undefined)}
							className="h-6 text-xs"
						>
							All
						</Button>
						{filterOptions.statuses.map((status) => (
							<Button
								key={status}
								variant={statusFilter === status ? "default" : "outline"}
								size="sm"
								onClick={() => setStatusFilter(status)}
								className="h-6 text-xs"
							>
								{status}
							</Button>
						))}
					</div>
				)}
			</CardHeader>

			<CardContent className="fluid-component-content">
				{/* Vendor grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{displayedVendors?.map((vendor) => (
						<div
							key={vendor._id}
							onClick={() => handleVendorClick(vendor._id)}
							className={`cursor-pointer transition-all ${
								selectedVendor === vendor._id
									? "ring-2 ring-primary ring-offset-2 rounded-lg"
									: ""
							}`}
						>
							<VendorCard
								vendorId={vendor._id}
								eventId={eventId}
								showActions={false}
							/>
						</div>
					))}
				</div>

				{/* Show more indicator if limited */}
				{limit && vendors.length > limit && (
					<div className="mt-4 text-center">
						<Badge variant="outline" className="text-xs">
							Showing {limit} of {vendors.length} vendors
						</Badge>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function VendorsListSkeleton({ title }: { title: string }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.HANDSHAKE} {title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<Skeleton key={i} className="h-64 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function VendorsListEmpty({ title }: { title: string }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.HANDSHAKE} {title}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-12 text-center">
				<div className="flex flex-col items-center gap-2">
					<div className="text-4xl text-muted-foreground">
						{SYMBOLS.HANDSHAKE}
					</div>
					<p className="text-muted-foreground">No vendors found</p>
					<p className="text-xs text-muted-foreground">
						Ask the AI to search for vendors or add them manually
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

export const VendorsListMetadata = {
	name: "VendorsList",
	description:
		"Grid display of vendors with filtering. Master component - updates vendorId in Zustand store.",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "2fr",
		minHeight: "400px",
	},
	// Zustand integration - this is a master component
	zustand: {
		writes: ["vendorId"], // Selection keys this component updates
		reads: ["vendorId"], // Selection keys this component reads
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
		status: {
			type: "string",
			required: false,
			description: "Filter by contract status",
		},
		limit: {
			type: "number",
			required: false,
			description: "Maximum number of vendors to display",
		},
		title: {
			type: "string",
			required: false,
			description: "Card title",
		},
	},
};
