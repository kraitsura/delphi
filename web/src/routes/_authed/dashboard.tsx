import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	BarChart3,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	DollarSign,
	Edit,
	Plus,
	Save,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_authed/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const { data: session } = useSession();
	const currentUser = useQuery(api.auth.getCurrentUser);
	const userProfile = useQuery(api.users.getMyProfile);
	const createOrUpdateProfile = useMutation(api.users.createOrUpdateProfile);

	// Ensure extended profile exists for authenticated users
	useEffect(() => {
		if (currentUser && userProfile === null) {
			createOrUpdateProfile({}).catch((error) => {
				console.error("Failed to create user profile:", error);
			});
		}
	}, [currentUser, userProfile, createOrUpdateProfile]);

	return (
		<div className="container mx-auto p-6 max-w-7xl">
			<h1 className="text-4xl font-bold mb-2">Dashboard</h1>
			<p className="text-muted-foreground mb-8">
				Test Phase 1.3: Events CRUD Operations
			</p>

			<div className="space-y-6">
				{/* Rate Limiter Demo Section */}
				<RateLimiterDemoSection />

				{/* Events CRUD Testing Section */}
				<EventsCRUDSection />

				{/* Original Info Cards in Grid */}
				<div className="grid gap-6 md:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Session Info</CardTitle>
						</CardHeader>
						<CardContent>
							{session ? (
								<div className="space-y-2 text-sm">
									<div>
										<p className="text-muted-foreground">Name</p>
										<p className="font-medium">{session.user.name || "N/A"}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Email</p>
										<p className="font-medium">{session.user.email}</p>
									</div>
								</div>
							) : (
								<p className="text-muted-foreground text-sm">Loading...</p>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Auth User</CardTitle>
						</CardHeader>
						<CardContent>
							{currentUser === undefined ? (
								<p className="text-muted-foreground text-sm">Loading...</p>
							) : currentUser === null ? (
								<p className="text-muted-foreground text-sm">No data</p>
							) : (
								<div className="space-y-2 text-sm">
									<div>
										<p className="text-muted-foreground">Email</p>
										<p className="font-medium">{currentUser.email}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Verified</p>
										<p className="font-medium">
											{currentUser.emailVerified ? "Yes" : "No"}
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-lg">User Profile</CardTitle>
						</CardHeader>
						<CardContent>
							{userProfile === undefined ? (
								<p className="text-muted-foreground text-sm">Loading...</p>
							) : userProfile === null ? (
								<p className="text-muted-foreground text-sm">Creating...</p>
							) : (
								<div className="space-y-2 text-sm">
									<div>
										<p className="text-muted-foreground">Role</p>
										<p className="font-medium capitalize">{userProfile.role}</p>
									</div>
									<div>
										<p className="text-muted-foreground">Theme</p>
										<p className="font-medium capitalize">
											{userProfile.preferences?.theme || "light"}
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function RateLimiterDemoSection() {
	const rateLimitStatus = useQuery(api.rateLimiterDemo.getRateLimitStatus);
	const testAction = useMutation(api.rateLimiterDemo.testAction);
	const resetRateLimit = useMutation(api.rateLimiterDemo.resetRateLimit);
	const [isLoading, setIsLoading] = useState(false);
	const [clickCount, setClickCount] = useState(0);

	const handleTestAction = async () => {
		setIsLoading(true);
		try {
			const result = await testAction({});
			toast.success(result.message);
			setClickCount((prev) => prev + 1);
		} catch (error: any) {
			toast.error(
				error.message || "Rate limit exceeded! Please wait before trying again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleReset = async () => {
		try {
			const result = await resetRateLimit({});
			toast.success(result.message);
			setClickCount(0);
		} catch (error: any) {
			toast.error(error.message || "Failed to reset rate limit");
		}
	};

	const isRateLimited = rateLimitStatus?.ok === false;
	const remaining = rateLimitStatus?.remaining ?? 0;
	const retryAfter = rateLimitStatus?.retryAfter ?? 0;
	const retrySeconds = Math.ceil(retryAfter / 1000);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Rate Limiter Demo 🛡️</CardTitle>
						<CardDescription>
							Test rate limiting: 10 actions/minute with burst capacity of 3
						</CardDescription>
					</div>
					<Button
						onClick={handleReset}
						size="sm"
						variant="outline"
						disabled={isLoading}
					>
						Reset Limit
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Status Display */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="border rounded-lg p-4">
						<div className="text-sm text-muted-foreground mb-1">Status</div>
						<div className="flex items-center gap-2">
							{isRateLimited ? (
								<>
									<X className="h-5 w-5 text-destructive" />
									<span className="font-semibold text-destructive">
										Rate Limited
									</span>
								</>
							) : (
								<>
									<CheckCircle2 className="h-5 w-5 text-green-600" />
									<span className="font-semibold text-green-600">OK</span>
								</>
							)}
						</div>
					</div>

					<div className="border rounded-lg p-4">
						<div className="text-sm text-muted-foreground mb-1">
							Tokens Remaining
						</div>
						<div className="text-2xl font-bold">
							{rateLimitStatus === undefined ? "..." : remaining}
						</div>
						<div className="text-xs text-muted-foreground">out of 13 total</div>
					</div>

					<div className="border rounded-lg p-4">
						<div className="text-sm text-muted-foreground mb-1">
							Actions Taken
						</div>
						<div className="text-2xl font-bold">{clickCount}</div>
						<div className="text-xs text-muted-foreground">
							this session
						</div>
					</div>
				</div>

				{/* Action Button */}
				<div className="flex flex-col items-center gap-4 p-6 border rounded-lg bg-muted/30">
					<Button
						onClick={handleTestAction}
						disabled={isLoading || isRateLimited}
						size="lg"
						className="w-full md:w-auto"
					>
						{isLoading
							? "Testing..."
							: isRateLimited
								? `Rate Limited - Wait ${retrySeconds}s`
								: `Test Rate Limit (${remaining} remaining)`}
					</Button>

					{isRateLimited && (
						<p className="text-sm text-destructive text-center">
							You've hit the rate limit! Try again in {retrySeconds} seconds, or
							click "Reset Limit" to clear it.
						</p>
					)}

					{!isRateLimited && remaining <= 3 && remaining > 0 && (
						<p className="text-sm text-amber-600 text-center">
							Warning: Only {remaining} tokens remaining before rate limit!
						</p>
					)}
				</div>

				{/* Info Section */}
				<div className="text-sm space-y-2 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
					<p className="font-semibold">How it works:</p>
					<ul className="list-disc list-inside space-y-1 text-muted-foreground">
						<li>Token bucket algorithm with 10 tokens/minute refill rate</li>
						<li>Burst capacity of 3 extra tokens (13 total capacity)</li>
						<li>
							Each action consumes 1 token - tokens refill gradually over time
						</li>
						<li>
							When you run out of tokens, you must wait for them to refill
						</li>
						<li>Reset button clears your limit for testing purposes</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}

function EventsCRUDSection() {
	const events = useQuery(api.events.listUserEvents, {});
	const [showCreateForm, setShowCreateForm] = useState(false);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Events CRUD Testing 🧪</CardTitle>
						<CardDescription>
							Test all event operations - {events?.length || 0} events total
						</CardDescription>
					</div>
					<Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
						<Plus className="h-4 w-4 mr-2" />
						{showCreateForm ? "Hide Form" : "Create Event"}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Quick Create Form */}
				{showCreateForm && (
					<QuickCreateForm onSuccess={() => setShowCreateForm(false)} />
				)}

				{/* Events List */}
				<div className="space-y-4">
					{events === undefined ? (
						<p className="text-muted-foreground text-center py-8">
							Loading events...
						</p>
					) : events.length === 0 ? (
						<p className="text-muted-foreground text-center py-8">
							No events yet. Create one above to get started!
						</p>
					) : (
						events.map((event) => <EventItem key={event._id} event={event} />)
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function QuickCreateForm({ onSuccess }: { onSuccess: () => void }) {
	const createEvent = useMutation(api.events.create);
	const [name, setName] = useState("");
	const [type, setType] = useState<
		"wedding" | "corporate" | "party" | "destination" | "other"
	>("wedding");
	const [date, setDate] = useState("");
	const [budget, setBudget] = useState("");
	const [guests, setGuests] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			await createEvent({
				name,
				type,
				date: date ? new Date(date).getTime() : undefined,
				budget: parseFloat(budget) || 0,
				expectedGuests: parseInt(guests) || 0,
			});
			toast.success("Event created! Main room auto-created.");
			setName("");
			setDate("");
			setBudget("");
			setGuests("");
			onSuccess();
		} catch (error) {
			toast.error(`Failed: ${error}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30">
			<h3 className="font-semibold mb-4">Quick Create Event</h3>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div className="space-y-2">
					<Label htmlFor="name">Event Name *</Label>
					<Input
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Sarah's Wedding"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="type">Type *</Label>
					<select
						id="type"
						value={type}
						onChange={(e) => setType(e.target.value as any)}
						className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
						required
					>
						<option value="wedding">Wedding</option>
						<option value="corporate">Corporate</option>
						<option value="party">Party</option>
						<option value="destination">Destination</option>
						<option value="other">Other</option>
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="date">Date</Label>
					<Input
						id="date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<div className="space-y-2">
					<Label htmlFor="budget">Budget ($)</Label>
					<Input
						id="budget"
						type="number"
						value={budget}
						onChange={(e) => setBudget(e.target.value)}
						placeholder="10000"
						min="0"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="guests">Expected Guests</Label>
					<Input
						id="guests"
						type="number"
						value={guests}
						onChange={(e) => setGuests(e.target.value)}
						placeholder="100"
						min="0"
					/>
				</div>
			</div>
			<div className="flex gap-2">
				<Button type="submit" disabled={loading}>
					{loading ? "Creating..." : "Create Event"}
				</Button>
				<Button type="button" variant="outline" onClick={onSuccess}>
					Cancel
				</Button>
			</div>
		</form>
	);
}

function EventItem({ event }: { event: any }) {
	const [isEditing, setIsEditing] = useState(false);
	const [showStats, setShowStats] = useState(false);
	const [expanded, setExpanded] = useState(false);

	const updateEvent = useMutation(api.events.update);
	const updateStatus = useMutation(api.events.updateStatus);
	const removeEvent = useMutation(api.events.remove);
	const stats = useQuery(
		api.events.getStats,
		showStats ? { eventId: event._id } : "skip",
	);

	const [editName, setEditName] = useState(event.name);
	const [editDescription, setEditDescription] = useState(
		event.description || "",
	);
	const [editBudget, setEditBudget] = useState(event.budget.total.toString());
	const [editGuests, setEditGuests] = useState(
		event.guestCount.expected.toString(),
	);

	const handleSaveEdit = async () => {
		try {
			await updateEvent({
				eventId: event._id,
				name: editName,
				description: editDescription || undefined,
				budget: { total: parseFloat(editBudget) },
				guestCount: { expected: parseInt(editGuests) },
			});
			toast.success("Event updated!");
			setIsEditing(false);
		} catch (error) {
			toast.error(`Failed: ${error}`);
		}
	};

	const handleStatusChange = async (newStatus: any) => {
		try {
			await updateStatus({ eventId: event._id, status: newStatus });
			toast.success(`Status updated to ${newStatus}`);
		} catch (error) {
			toast.error(`Failed: ${error}`);
		}
	};

	const handleDelete = async () => {
		if (!confirm("Delete this event? (soft delete to cancelled status)"))
			return;
		try {
			await removeEvent({ eventId: event._id });
			toast.success("Event deleted");
		} catch (error) {
			toast.error(`Failed: ${error}`);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "planning":
				return "bg-blue-100 text-blue-700";
			case "in_progress":
				return "bg-green-100 text-green-700";
			case "completed":
				return "bg-gray-100 text-gray-700";
			case "cancelled":
				return "bg-red-100 text-red-700";
			case "archived":
				return "bg-yellow-100 text-yellow-700";
			default:
				return "bg-gray-100 text-gray-700";
		}
	};

	return (
		<div className="border rounded-lg p-4 space-y-3">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex-1">
					{isEditing ? (
						<Input
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							className="font-semibold text-lg mb-2"
						/>
					) : (
						<h3 className="font-semibold text-lg">{event.name}</h3>
					)}
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="capitalize">{event.type}</span>
						<span>•</span>
						<span
							className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(event.status)}`}
						>
							{event.status.replace("_", " ")}
						</span>
					</div>
				</div>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => setExpanded(!expanded)}
				>
					{expanded ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</Button>
			</div>

			{/* Quick Info */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
				{event.date && (
					<div className="flex items-center gap-2">
						<Calendar className="h-4 w-4 text-muted-foreground" />
						<span>{new Date(event.date).toLocaleDateString()}</span>
					</div>
				)}
				<div className="flex items-center gap-2">
					<Users className="h-4 w-4 text-muted-foreground" />
					<span>
						{event.guestCount.confirmed} / {event.guestCount.expected}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<DollarSign className="h-4 w-4 text-muted-foreground" />
					<span>
						${event.budget.spent.toLocaleString()} / $
						{event.budget.total.toLocaleString()}
					</span>
				</div>
				<div className="text-xs text-muted-foreground">
					ID: {event._id.slice(0, 8)}...
				</div>
			</div>

			{/* Expanded Section */}
			{expanded && (
				<div className="space-y-4 pt-4 border-t">
					{/* Edit Form */}
					{isEditing && (
						<div className="space-y-3">
							<div className="space-y-2">
								<Label>Description</Label>
								<Textarea
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									placeholder="Event description..."
									rows={2}
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label>Budget ($)</Label>
									<Input
										type="number"
										value={editBudget}
										onChange={(e) => setEditBudget(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Expected Guests</Label>
									<Input
										type="number"
										value={editGuests}
										onChange={(e) => setEditGuests(e.target.value)}
									/>
								</div>
							</div>
						</div>
					)}

					{/* Stats */}
					{showStats && stats && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
							<div className="border rounded p-3">
								<div className="text-2xl font-bold">{stats.tasks.total}</div>
								<div className="text-xs text-muted-foreground">Tasks</div>
							</div>
							<div className="border rounded p-3">
								<div className="text-2xl font-bold text-green-600">
									{stats.tasks.completed}
								</div>
								<div className="text-xs text-muted-foreground">Completed</div>
							</div>
							<div className="border rounded p-3">
								<div className="text-2xl font-bold">{stats.rooms}</div>
								<div className="text-xs text-muted-foreground">Rooms</div>
							</div>
							<div className="border rounded p-3">
								<div className="text-2xl font-bold">{stats.participants}</div>
								<div className="text-xs text-muted-foreground">Team</div>
							</div>
						</div>
					)}

					{/* Co-Coordinators */}
					{event.coCoordinatorIds && event.coCoordinatorIds.length > 0 && (
						<div className="text-sm">
							<span className="font-medium">Co-Coordinators:</span>{" "}
							{event.coCoordinatorIds.length} added
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex flex-wrap gap-2">
						{isEditing ? (
							<>
								<Button size="sm" onClick={handleSaveEdit}>
									<Save className="h-4 w-4 mr-1" />
									Save
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setIsEditing(false)}
								>
									<X className="h-4 w-4 mr-1" />
									Cancel
								</Button>
							</>
						) : (
							<Button
								size="sm"
								variant="outline"
								onClick={() => setIsEditing(true)}
							>
								<Edit className="h-4 w-4 mr-1" />
								Edit
							</Button>
						)}

						<select
							className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
							value={event.status}
							onChange={(e) => handleStatusChange(e.target.value)}
						>
							<option value="planning">Planning</option>
							<option value="in_progress">In Progress</option>
							<option value="completed">Completed</option>
							<option value="archived">Archived</option>
							<option value="cancelled">Cancelled</option>
						</select>

						<Button
							size="sm"
							variant="outline"
							onClick={() => setShowStats(!showStats)}
						>
							<BarChart3 className="h-4 w-4 mr-1" />
							{showStats ? "Hide Stats" : "Stats"}
						</Button>

						<Button size="sm" variant="destructive" onClick={handleDelete}>
							<Trash2 className="h-4 w-4 mr-1" />
							Delete
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
