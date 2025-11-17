/**
 * InventoryCard - Inventory management component
 *
 * Features:
 * - Display inventory items with details
 * - Quick-create form for adding items
 * - Edit and delete actions
 * - Category filtering
 * - Rental tracking
 * - Loading and empty states
 */

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	AlertCircle,
	Check,
	Edit2,
	Package,
	Plus,
	Save,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SYMBOLS } from "@/lib/fluid-ui/symbols";
import { cn } from "@/lib/utils";

export interface InventoryCardProps {
	eventId: Id<"events">;
	category?: string;
	showForm?: boolean;
	limit?: number;
}

interface InventoryItem {
	_id: Id<"inventory">;
	name: string;
	description?: string;
	category: string;
	quantity: number;
	unit: string;
	acquisitionType: string;
	costPerUnit: number;
	totalCost: number;
	status?: string;
	storageLocation?: string;
	conditionNotes?: string;
	rentalDetails?: {
		returnDate?: number;
	};
}

export function InventoryCard({
	eventId,
	category: initialCategory,
	showForm = false,
	limit,
}: InventoryCardProps) {
	const [categoryFilter, setCategoryFilter] = useState<string | undefined>(
		initialCategory,
	);
	const [showCreateForm, setShowCreateForm] = useState(showForm);
	const [editingId, setEditingId] = useState<Id<"inventory"> | null>(null);

	// Form state
	const [formData, setFormData] = useState({
		name: "",
		category: "decorations",
		quantity: 1,
		unit: "items",
		acquisitionType: "purchased",
		costPerUnit: 0,
		storageLocation: "",
	});

	// Edit state
	const [editData, setEditData] = useState<Partial<InventoryItem>>({});

	// Query inventory items
	const items = useQuery(api.inventory.listByEvent, {
		eventId,
		category: categoryFilter,
	});

	// Mutations
	const createItem = useMutation(api.inventory.create);
	const updateItem = useMutation(api.inventory.update);
	const deleteItem = useMutation(api.inventory.deleteInventoryItem);

	// Apply limit
	const displayedItems = useMemo(() => {
		if (!items) return undefined;
		return limit ? items.slice(0, limit) : items;
	}, [items, limit]);

	// Get unique categories
	const categories = useMemo(() => {
		if (!items) return [];
		return Array.from(
			new Set(items.map((item) => item.category).filter(Boolean)),
		);
	}, [items]);

	const handleCreateItem = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			toast.error("Please enter an item name");
			return;
		}

		try {
			const totalCost = formData.costPerUnit * formData.quantity;

			await createItem({
				eventId,
				name: formData.name,
				category: formData.category,
				quantity: formData.quantity,
				unit: formData.unit,
				acquisitionType: formData.acquisitionType,
				costPerUnit: formData.costPerUnit,
				totalCost,
				storageLocation: formData.storageLocation,
				createdBy: "" as any, // Will be set by auth context
			});

			toast.success(`${formData.name} added to inventory`);

			// Reset form
			setFormData({
				name: "",
				category: "decorations",
				quantity: 1,
				unit: "items",
				acquisitionType: "purchased",
				costPerUnit: 0,
				storageLocation: "",
			});
			setShowCreateForm(false);
		} catch (error) {
			toast.error("Failed to add item");
			console.error("Inventory create error:", error);
		}
	};

	const handleUpdateItem = async (itemId: Id<"inventory">) => {
		try {
			await updateItem({
				inventoryId: itemId,
				...editData,
			});

			toast.success("Item updated");
			setEditingId(null);
			setEditData({});
		} catch (error) {
			toast.error("Failed to update item");
			console.error("Inventory update error:", error);
		}
	};

	const handleDeleteItem = async (
		itemId: Id<"inventory">,
		itemName: string,
	) => {
		if (!confirm(`Delete ${itemName} from inventory?`)) return;

		try {
			await deleteItem({ inventoryId: itemId });
			toast.success(`${itemName} removed from inventory`);
		} catch (error) {
			toast.error("Failed to delete item");
			console.error("Inventory delete error:", error);
		}
	};

	const startEdit = (item: InventoryItem) => {
		setEditingId(item._id);
		setEditData({
			name: item.name,
			quantity: item.quantity,
			costPerUnit: item.costPerUnit,
			storageLocation: item.storageLocation,
			conditionNotes: item.conditionNotes,
		});
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditData({});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const isRentalDueSoon = (item: InventoryItem) => {
		if (item.acquisitionType !== "rental" || !item.rentalDetails?.returnDate) {
			return false;
		}
		const daysUntilReturn = Math.ceil(
			(item.rentalDetails.returnDate - Date.now()) / (1000 * 60 * 60 * 24),
		);
		return daysUntilReturn <= 7 && daysUntilReturn >= 0;
	};

	// Loading state
	if (items === undefined) {
		return <InventoryCardSkeleton />;
	}

	return (
		<Card className="fluid-component-card">
			<CardHeader className="fluid-component-header">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<CardTitle className="fluid-component-title">
							{SYMBOLS.BLACK_SQUARE} Inventory
						</CardTitle>
						<Badge variant="outline">{displayedItems?.length || 0} items</Badge>
					</div>

					<Button
						size="sm"
						onClick={() => setShowCreateForm(!showCreateForm)}
						className="h-7"
					>
						{showCreateForm ? (
							<>
								<X className="h-3.5 w-3.5 mr-1" />
								Cancel
							</>
						) : (
							<>
								<Plus className="h-3.5 w-3.5 mr-1" />
								Add Item
							</>
						)}
					</Button>
				</div>

				{/* Category filter */}
				{categories.length > 1 && (
					<div className="flex flex-wrap gap-2 mt-3">
						<span className="text-xs text-muted-foreground">Category:</span>
						<Button
							variant={!categoryFilter ? "default" : "outline"}
							size="sm"
							onClick={() => setCategoryFilter(undefined)}
							className="h-6 text-xs"
						>
							All
						</Button>
						{categories.map((cat) => (
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
			</CardHeader>

			<CardContent className="fluid-component-content space-y-4">
				{/* Create form */}
				{showCreateForm && (
					<form
						onSubmit={handleCreateItem}
						className="space-y-3 p-4 bg-accent/50 rounded-lg"
					>
						<div className="grid grid-cols-2 gap-3">
							<div className="col-span-2">
								<Label htmlFor="name" className="text-xs">
									Item Name
								</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									placeholder="e.g., Tables"
									className="h-8 text-sm"
									required
								/>
							</div>

							<div>
								<Label htmlFor="category" className="text-xs">
									Category
								</Label>
								<Select
									value={formData.category}
									onValueChange={(value) =>
										setFormData({ ...formData, category: value })
									}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="decorations">Decorations</SelectItem>
										<SelectItem value="rentals">Rentals</SelectItem>
										<SelectItem value="equipment">Equipment</SelectItem>
										<SelectItem value="supplies">Supplies</SelectItem>
										<SelectItem value="furniture">Furniture</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="acquisition" className="text-xs">
									Source
								</Label>
								<Select
									value={formData.acquisitionType}
									onValueChange={(value) =>
										setFormData({ ...formData, acquisitionType: value })
									}
								>
									<SelectTrigger className="h-8 text-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="purchased">Purchased</SelectItem>
										<SelectItem value="rental">Rental</SelectItem>
										<SelectItem value="borrowed">Borrowed</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="quantity" className="text-xs">
									Quantity
								</Label>
								<Input
									id="quantity"
									type="number"
									value={formData.quantity}
									onChange={(e) =>
										setFormData({
											...formData,
											quantity: parseInt(e.target.value, 10) || 0,
										})
									}
									min="1"
									className="h-8 text-sm"
									required
								/>
							</div>

							<div>
								<Label htmlFor="cost" className="text-xs">
									Cost per Unit
								</Label>
								<Input
									id="cost"
									type="number"
									step="0.01"
									value={formData.costPerUnit}
									onChange={(e) =>
										setFormData({
											...formData,
											costPerUnit: parseFloat(e.target.value) || 0,
										})
									}
									className="h-8 text-sm"
								/>
							</div>

							<div className="col-span-2">
								<Label htmlFor="location" className="text-xs">
									Storage Location (optional)
								</Label>
								<Input
									id="location"
									value={formData.storageLocation}
									onChange={(e) =>
										setFormData({
											...formData,
											storageLocation: e.target.value,
										})
									}
									placeholder="e.g., Garage, Storage unit A"
									className="h-8 text-sm"
								/>
							</div>
						</div>

						<div className="flex gap-2">
							<Button type="submit" size="sm" className="flex-1">
								<Save className="h-3.5 w-3.5 mr-1" />
								Add to Inventory
							</Button>
						</div>
					</form>
				)}

				{/* Items list */}
				{!items || items.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						<Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
						<p className="text-sm">No inventory items yet</p>
						<p className="text-xs mt-1">
							Add items to track your event inventory
						</p>
					</div>
				) : displayedItems && displayedItems.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						<p className="text-sm">No items match the current filter</p>
					</div>
				) : (
					<div className="space-y-2">
						{displayedItems?.map((item) => {
							const isEditing = editingId === item._id;
							const isDueSoon = isRentalDueSoon(item);

							return (
								<div
									key={item._id}
									className={cn(
										"p-3 rounded-lg border transition-colors",
										isDueSoon && "border-orange-300 bg-orange-50",
										!isDueSoon && "bg-card border-border",
									)}
								>
									{isEditing ? (
										// Edit mode
										<div className="space-y-2">
											<Input
												value={editData.name || ""}
												onChange={(e) =>
													setEditData({ ...editData, name: e.target.value })
												}
												className="h-7 text-sm font-medium"
											/>
											<div className="grid grid-cols-2 gap-2">
												<Input
													type="number"
													value={editData.quantity || 0}
													onChange={(e) =>
														setEditData({
															...editData,
															quantity: parseInt(e.target.value, 10) || 0,
														})
													}
													className="h-7 text-sm"
													placeholder="Quantity"
												/>
												<Input
													type="number"
													step="0.01"
													value={editData.costPerUnit || 0}
													onChange={(e) =>
														setEditData({
															...editData,
															costPerUnit: parseFloat(e.target.value) || 0,
														})
													}
													className="h-7 text-sm"
													placeholder="Cost per unit"
												/>
											</div>
											<Input
												value={editData.storageLocation || ""}
												onChange={(e) =>
													setEditData({
														...editData,
														storageLocation: e.target.value,
													})
												}
												className="h-7 text-sm"
												placeholder="Storage location"
											/>
											<div className="flex gap-2">
												<Button
													size="sm"
													onClick={() => handleUpdateItem(item._id)}
													className="flex-1 h-7"
												>
													<Check className="h-3 w-3 mr-1" />
													Save
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={cancelEdit}
													className="flex-1 h-7"
												>
													Cancel
												</Button>
											</div>
										</div>
									) : (
										// View mode
										<div>
											<div className="flex items-start justify-between gap-2 mb-2">
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<h4 className="font-medium text-sm">{item.name}</h4>
														<Badge variant="outline" className="text-xs">
															{item.category}
														</Badge>
														{item.acquisitionType === "rented" && (
															<Badge variant="secondary" className="text-xs">
																Rental
															</Badge>
														)}
														{isDueSoon && (
															<Badge variant="destructive" className="text-xs">
																<AlertCircle className="h-3 w-3 mr-1" />
																Due soon
															</Badge>
														)}
													</div>
													{item.description && (
														<p className="text-xs text-muted-foreground mt-1">
															{item.description}
														</p>
													)}
												</div>

												<div className="flex gap-1">
													<Button
														size="sm"
														variant="ghost"
														onClick={() => startEdit(item)}
														className="h-7 w-7 p-0"
													>
														<Edit2 className="h-3.5 w-3.5" />
													</Button>
													<Button
														size="sm"
														variant="ghost"
														onClick={() =>
															handleDeleteItem(item._id, item.name)
														}
														className="h-7 w-7 p-0 text-destructive"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</div>
											</div>

											<div className="grid grid-cols-2 gap-2 text-xs">
												<div className="flex items-center justify-between p-2 bg-muted/50 rounded">
													<span className="text-muted-foreground">
														Quantity
													</span>
													<span className="font-medium">
														{item.quantity} {item.unit}
													</span>
												</div>
												<div className="flex items-center justify-between p-2 bg-muted/50 rounded">
													<span className="text-muted-foreground">
														Total Cost
													</span>
													<span className="font-medium">
														{formatCurrency(item.totalCost)}
													</span>
												</div>
												{item.storageLocation && (
													<div className="col-span-2 flex items-center justify-between p-2 bg-muted/50 rounded">
														<span className="text-muted-foreground">
															Location
														</span>
														<span className="font-medium">
															{item.storageLocation}
														</span>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* Show more indicator */}
				{limit && items && items.length > limit && (
					<div className="text-center">
						<Badge variant="outline" className="text-xs">
							Showing {limit} of {items.length} items
						</Badge>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function InventoryCardSkeleton() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="fluid-component-title">
					{SYMBOLS.BLACK_SQUARE} Inventory
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24 w-full" />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export const InventoryCardMetadata = {
	name: "InventoryCard",
	description:
		"Inventory management with CRUD operations and category filtering",
	layoutRules: {
		canShare: true,
		mustSpanFull: false,
		preferredRatio: "1fr",
		minHeight: "400px",
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
			description: "Filter by category",
		},
		showForm: {
			type: "boolean",
			required: false,
			description: "Show create form by default",
		},
		limit: {
			type: "number",
			required: false,
			description: "Maximum number of items to display",
		},
	},
};
