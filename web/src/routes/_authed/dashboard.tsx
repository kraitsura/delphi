import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	BarChart3,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	DollarSign,
	Edit,
	History,
	Mail,
	Play,
	Plus,
	RotateCcw,
	Save,
	Send,
	Settings,
	Trash2,
	Users,
	X,
	Zap,
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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_authed/dashboard")({
	component: Dashboard,
});

function Dashboard() {
	const { data: session } = useSession();
	const currentUser = useQuery(api.auth.getCurrentUser);
	const userProfile = useQuery(api.users.getMyProfile);

	// Profile is automatically created by ProfileCreator in _authed.tsx
	// on first access to any authenticated route

	return (
		<div className="container mx-auto p-6 max-w-7xl">
			<h1 className="text-4xl font-bold mb-2">Dashboard</h1>
			<p className="text-muted-foreground mb-8">
				Test Phase 1.3: Events CRUD Operations
			</p>

			<div className="space-y-6">
				{/* Email Testing Section */}
				<EmailTestingSection />

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

// Types for action history
type ActionHistoryItem = {
	timestamp: number;
	success: boolean;
	message: string;
	remainingTokens: number;
};

type TestScenario = "single" | "burst" | "gradual";

function RateLimiterDemoSection() {
	// Session management
	const [sessionId, setSessionId] = useState<string>("");
	const [useSessionIsolation, setUseSessionIsolation] = useState(false);

	// Generate session ID on mount
	useEffect(() => {
		setSessionId(crypto.randomUUID());
	}, []);

	// Queries and mutations (session-aware)
	const rateLimitStatus = useQuery(
		api.rateLimiterDemo.getRateLimitStatusWithSession,
		useSessionIsolation ? { sessionId } : "skip",
	);
	const rateLimitStatusNoSession = useQuery(
		api.rateLimiterDemo.getRateLimitStatus,
		!useSessionIsolation ? {} : "skip",
	);
	const testActionWithSession = useMutation(
		api.rateLimiterDemo.testActionWithSession,
	);
	const resetRateLimitWithSession = useMutation(
		api.rateLimiterDemo.resetRateLimitWithSession,
	);

	// Use the appropriate status based on isolation setting
	const status = useSessionIsolation
		? rateLimitStatus
		: rateLimitStatusNoSession;

	// State management
	const [isLoading, setIsLoading] = useState(false);
	const [clickCount, setClickCount] = useState(0);
	const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
	const [showHistory, setShowHistory] = useState(false);
	const [_testScenario, _setTestScenario] = useState<TestScenario>("single");
	const [isBurstTesting, setIsBurstTesting] = useState(false);

	// Auto-reset timer
	const [autoResetEnabled, setAutoResetEnabled] = useState(false);
	const [autoResetDelay, setAutoResetDelay] = useState<30 | 60>(30);
	const [lastActivityTime, setLastActivityTime] = useState(Date.now());
	const [autoResetCountdown, setAutoResetCountdown] = useState(0);

	// Real-time countdown
	const [liveRetrySeconds, setLiveRetrySeconds] = useState(0);

	const isRateLimited = status?.ok === false;
	const remaining: number =
		typeof status?.remaining === "number" ? status.remaining : 0;
	const retryAfter: number =
		typeof status?.retryAfter === "number" ? status.retryAfter : 0;

	// Update live countdown timer
	useEffect(() => {
		if (!isRateLimited || retryAfter === 0) {
			setLiveRetrySeconds(0);
			return;
		}

		// Set initial countdown
		const initialSeconds = Math.ceil(retryAfter / 1000);
		setLiveRetrySeconds(initialSeconds);

		// Update every second
		const interval = setInterval(() => {
			setLiveRetrySeconds((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);

		return () => clearInterval(interval);
	}, [isRateLimited, retryAfter]);

	// Auto-reset timer logic
	// biome-ignore lint/correctness/useExhaustiveDependencies: handleReset is stable enough for this use case
	useEffect(() => {
		if (!autoResetEnabled) {
			setAutoResetCountdown(0);
			return;
		}

		const updateCountdown = () => {
			const elapsed = Date.now() - lastActivityTime;
			const remaining = Math.max(0, autoResetDelay * 1000 - elapsed);
			setAutoResetCountdown(Math.ceil(remaining / 1000));

			if (remaining === 0 && clickCount > 0) {
				handleReset(true);
			}
		};

		updateCountdown();
		const interval = setInterval(updateCountdown, 1000);

		return () => clearInterval(interval);
	}, [autoResetEnabled, lastActivityTime, autoResetDelay, clickCount]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			// Reset rate limit when component unmounts
			if (clickCount > 0) {
				resetRateLimitWithSession(
					useSessionIsolation ? { sessionId } : {},
				).catch(console.error);
			}
		};
	}, [clickCount, sessionId, useSessionIsolation, resetRateLimitWithSession]);

	const addToHistory = (
		success: boolean,
		message: string,
		remainingTokens: number,
	) => {
		const item: ActionHistoryItem = {
			timestamp: Date.now(),
			success,
			message,
			remainingTokens,
		};
		setActionHistory((prev) => [item, ...prev].slice(0, 10));
	};

	const handleTestAction = async () => {
		setIsLoading(true);
		setLastActivityTime(Date.now());
		try {
			const result = await testActionWithSession(
				useSessionIsolation ? { sessionId } : {},
			);
			toast.success(result.message);
			setClickCount((prev) => prev + 1);
			addToHistory(true, "Action executed", remaining - 1);
		} catch (error: any) {
			toast.error(
				error.message ||
					"Rate limit exceeded! Please wait before trying again.",
			);
			addToHistory(false, "Rate limited", remaining);
		} finally {
			setIsLoading(false);
		}
	};

	const handleReset = async (isAuto = false) => {
		try {
			const result = await resetRateLimitWithSession(
				useSessionIsolation ? { sessionId } : {},
			);
			toast.success(isAuto ? "Auto-reset triggered!" : result.message);
			setClickCount(0);
			setActionHistory([]);
			setLastActivityTime(Date.now());
		} catch (error: any) {
			toast.error(error.message || "Failed to reset rate limit");
		}
	};

	const handleBurstTest = async () => {
		setIsBurstTesting(true);
		toast.info("Running burst test: 15 rapid clicks");

		for (let i = 0; i < 15; i++) {
			await handleTestAction();
			await new Promise((resolve) => setTimeout(resolve, 200));
		}

		setIsBurstTesting(false);
		toast.success("Burst test completed!");
	};

	const handleGradualTest = async () => {
		setIsBurstTesting(true);
		toast.info("Running gradual test: 5 clicks over 10 seconds");

		for (let i = 0; i < 5; i++) {
			await handleTestAction();
			if (i < 4) await new Promise((resolve) => setTimeout(resolve, 2500));
		}

		setIsBurstTesting(false);
		toast.success("Gradual test completed!");
	};

	const progressPercent: number = (remaining / 13) * 100;
	const progressColor: string =
		remaining > 7
			? "bg-green-500"
			: remaining > 3
				? "bg-yellow-500"
				: "bg-red-500";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Advanced Rate Limiter Demo 🛡️</CardTitle>
						<CardDescription>
							Test rate limiting with session isolation, auto-reset, and
							scenarios
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button
							onClick={() => handleReset(false)}
							size="sm"
							variant="outline"
							disabled={isLoading || isBurstTesting}
						>
							<RotateCcw className="h-4 w-4 mr-1" />
							Reset
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Settings Section */}
				<div className="border rounded-lg p-4 space-y-4 bg-muted/30">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Settings className="h-4 w-4 text-muted-foreground" />
							<Label
								htmlFor="session-isolation"
								className="text-sm font-medium"
							>
								Session Isolation
							</Label>
						</div>
						<Switch
							id="session-isolation"
							checked={useSessionIsolation}
							onCheckedChange={setUseSessionIsolation}
						/>
					</div>
					{useSessionIsolation && (
						<p className="text-xs text-muted-foreground">
							Session ID: {sessionId.slice(0, 8)}... (isolated testing)
						</p>
					)}

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<Label htmlFor="auto-reset" className="text-sm font-medium">
								Auto-Reset Timer
							</Label>
						</div>
						<Switch
							id="auto-reset"
							checked={autoResetEnabled}
							onCheckedChange={setAutoResetEnabled}
						/>
					</div>
					{autoResetEnabled && (
						<div className="flex items-center gap-2">
							<select
								value={autoResetDelay}
								onChange={(e) =>
									setAutoResetDelay(parseInt(e.target.value, 10) as 30 | 60)
								}
								className="flex h-8 rounded-md border border-input bg-transparent px-3 text-sm"
							>
								<option value="30">30 seconds</option>
								<option value="60">60 seconds</option>
							</select>
							{autoResetCountdown > 0 && clickCount > 0 && (
								<span className="text-xs text-muted-foreground">
									Resets in {autoResetCountdown}s
								</span>
							)}
						</div>
					)}
				</div>

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
						{isRateLimited && liveRetrySeconds > 0 && (
							<div className="text-xs text-destructive mt-1">
								Retry in {liveRetrySeconds}s
							</div>
						)}
					</div>

					<div className="border rounded-lg p-4">
						<div className="text-sm text-muted-foreground mb-1">
							Tokens Remaining
						</div>
						<div className="text-2xl font-bold">
							{status === undefined ? "..." : remaining}
						</div>
						<div className="text-xs text-muted-foreground">out of 13 total</div>
					</div>

					<div className="border rounded-lg p-4">
						<div className="text-sm text-muted-foreground mb-1">
							Actions Taken
						</div>
						<div className="text-2xl font-bold">{clickCount}</div>
						<div className="text-xs text-muted-foreground">this session</div>
					</div>
				</div>

				{/* Progress Bar */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Token Capacity</span>
						<span className="font-medium">
							{remaining}/13 ({Math.round(progressPercent)}%)
						</span>
					</div>
					<div className="relative">
						<Progress value={progressPercent} className="h-3" />
						<div
							className={`absolute top-0 left-0 h-3 rounded-full transition-all ${progressColor}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				</div>

				{/* Test Scenarios */}
				<div className="space-y-3">
					<Label className="text-sm font-medium">Test Scenarios</Label>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<Button
							onClick={handleTestAction}
							disabled={isLoading || isRateLimited || isBurstTesting}
							className="w-full"
						>
							<Play className="h-4 w-4 mr-2" />
							Single Action
						</Button>
						<Button
							onClick={handleBurstTest}
							disabled={isLoading || isBurstTesting}
							variant="outline"
							className="w-full"
						>
							<Zap className="h-4 w-4 mr-2" />
							Burst Test (15x)
						</Button>
						<Button
							onClick={handleGradualTest}
							disabled={isLoading || isBurstTesting}
							variant="outline"
							className="w-full"
						>
							<Clock className="h-4 w-4 mr-2" />
							Gradual Test (5x)
						</Button>
					</div>
				</div>

				{/* Action History */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label className="text-sm font-medium">Action History</Label>
						<Button
							onClick={() => setShowHistory(!showHistory)}
							size="sm"
							variant="ghost"
						>
							<History className="h-4 w-4 mr-1" />
							{showHistory ? "Hide" : "Show"} ({actionHistory.length})
						</Button>
					</div>
					{showHistory && (
						<div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
							{actionHistory.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									No actions yet
								</p>
							) : (
								actionHistory.map((item, idx) => (
									<div
										key={idx}
										className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
									>
										<div className="flex items-center gap-2">
											{item.success ? (
												<CheckCircle2 className="h-3 w-3 text-green-600" />
											) : (
												<X className="h-3 w-3 text-destructive" />
											)}
											<span>{item.message}</span>
										</div>
										<div className="flex items-center gap-2 text-muted-foreground">
											<span>{item.remainingTokens} tokens</span>
											<span>
												{new Date(item.timestamp).toLocaleTimeString()}
											</span>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>

				{/* Info Section */}
				<div className="text-sm space-y-2 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
					<p className="font-semibold">Advanced Features:</p>
					<ul className="list-disc list-inside space-y-1 text-muted-foreground">
						<li>Session isolation prevents conflicts between multiple tests</li>
						<li>Real-time countdown shows exact seconds until tokens refill</li>
						<li>Visual progress bar with color-coded capacity zones</li>
						<li>Action history tracks last 10 actions with timestamps</li>
						<li>Automated test scenarios (burst, gradual)</li>
						<li>Auto-reset timer clears limits after inactivity</li>
						<li>Cleanup on unmount ensures proper test isolation</li>
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
				expectedGuests: parseInt(guests, 10) || 0,
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
				guestCount: { expected: parseInt(editGuests, 10) },
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

/**
 * Email Testing Section Component
 * Allows testing the Resend integration from the dashboard
 */
function EmailTestingSection() {
	const [emailTo, setEmailTo] = useState("");
	const [isSending, setIsSending] = useState(false);
	const sendTestEmail = useMutation(api.emails.sendTestEmail);

	const handleSendTest = async () => {
		if (!emailTo || !emailTo.includes("@")) {
			toast.error("Please enter a valid email address");
			return;
		}

		setIsSending(true);
		try {
			const result = await sendTestEmail({ to: emailTo });
			toast.success(
				`Test email sent successfully! Email ID: ${result.emailId}`,
			);
			setEmailTo("");
		} catch (error) {
			console.error("Failed to send test email:", error);
			toast.error(`Failed to send email: ${error}`);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Mail className="h-5 w-5 text-primary" />
							Email Testing (Resend Integration)
						</CardTitle>
						<CardDescription>
							Test the Resend email integration in test mode
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="grid gap-2">
						<Label htmlFor="test-email">Recipient Email</Label>
						<div className="flex gap-2">
							<Input
								id="test-email"
								type="email"
								placeholder="test@example.com or delivered@resend.dev"
								value={emailTo}
								onChange={(e) => setEmailTo(e.target.value)}
								disabled={isSending}
							/>
							<Button onClick={handleSendTest} disabled={isSending || !emailTo}>
								{isSending ? (
									<>
										<RotateCcw className="h-4 w-4 mr-2 animate-spin" />
										Sending...
									</>
								) : (
									<>
										<Send className="h-4 w-4 mr-2" />
										Send Test
									</>
								)}
							</Button>
						</div>
					</div>

					<div className="p-4 bg-muted rounded-lg space-y-2">
						<p className="text-sm font-medium">Test Mode Active</p>
						<p className="text-xs text-muted-foreground">
							Currently running in Resend test mode. Use delivered@resend.dev to
							test email delivery, or any email address to see how emails are
							formatted.
						</p>
						<p className="text-xs text-muted-foreground">
							To enable production mode, set testMode: false in convex/emails.ts
							and configure a verified domain in Resend.
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
