import type { Doc, Id, TableNames } from "../../../convex/_generated/dataModel";

/**
 * Test data factories for creating mock entities
 * Use these to generate consistent test data across tests
 */

let idCounter = 0;
const generateId = <T extends TableNames>(prefix: T): Id<T> => {
	idCounter++;
	return `${prefix}_${Date.now()}_${idCounter}` as Id<T>;
};

export const factories = {
	/**
	 * Create a mock user
	 */
	user: (overrides?: Partial<Doc<"users">>): Doc<"users"> => {
		const id = overrides?._id || generateId("users");
		const now = Date.now();

		return {
			_id: id,
			_creationTime: now,
			email: `test-${id}@example.com`,
			name: "Test User",
			role: "collaborator",
			isActive: true,
			createdAt: now,
			updatedAt: now,
			preferences: {
				notifications: true,
				timezone: "America/New_York",
			},
			...overrides,
		};
	},

	/**
	 * Create a mock coordinator user
	 */
	coordinator: (overrides?: Partial<Doc<"users">>): Doc<"users"> => {
		return factories.user({
			role: "coordinator",
			name: "Coordinator User",
			...overrides,
		});
	},

	/**
	 * Create a mock event
	 */
	event: (overrides?: Partial<Doc<"events">>): Doc<"events"> => {
		const id = overrides?._id || generateId("events");
		const now = Date.now();
		const coordinatorId = overrides?.coordinatorId || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			name: "Test Event",
			type: "wedding",
			status: "planning",
			coordinatorId,
			createdBy: coordinatorId,
			budget: {
				total: 10000,
				currency: "USD",
				spent: 0,
				remaining: 10000,
				committed: 0,
			},
			guestCount: { confirmed: 0, expected: 100 },
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock room
	 */
	room: (overrides?: Partial<Doc<"rooms">>): Doc<"rooms"> => {
		const id = overrides?._id || generateId("rooms");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			eventId,
			name: "Test Room",
			type: "main",
			isArchived: false,
			allowGuestMessages: false,
			createdAt: now,
			createdBy,
			...overrides,
		};
	},

	/**
	 * Create a mock message
	 */
	message: (overrides?: Partial<Doc<"messages">>): Doc<"messages"> => {
		const id = overrides?._id || generateId("messages");
		const now = Date.now();
		const roomId = overrides?.roomId || generateId("rooms");
		const authorId = overrides?.authorId || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			roomId,
			authorId,
			text: "Test message",
			isEdited: false,
			isAIGenerated: false,
			createdAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock room participant
	 */
	roomParticipant: (
		overrides?: Partial<Doc<"roomParticipants">>,
	): Doc<"roomParticipants"> => {
		const id = overrides?._id || generateId("roomParticipants");
		const now = Date.now();
		const roomId = overrides?.roomId || generateId("rooms");
		const userId = overrides?.userId || generateId("users");
		const addedBy = overrides?.addedBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			roomId,
			userId,
			canPost: true,
			canEdit: true,
			canDelete: true,
			canManage: false,
			notificationLevel: "all",
			joinedAt: now,
			addedBy,
			...overrides,
		};
	},

	/**
	 * Create a mock event member
	 */
	eventMember: (
		overrides?: Partial<Doc<"eventMembers">>,
	): Doc<"eventMembers"> => {
		const id = overrides?._id || generateId("eventMembers");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const userId = overrides?.userId || generateId("users");
		const addedBy = overrides?.addedBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			eventId,
			userId,
			role: "collaborator",
			joinedAt: now,
			addedBy,
			...overrides,
		};
	},

	/**
	 * Create a mock event invitation
	 */
	eventInvitation: (
		overrides?: Partial<Doc<"eventInvitations">>,
	): Doc<"eventInvitations"> => {
		const id = overrides?._id || generateId("eventInvitations");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const invitedByUserId = overrides?.invitedByUserId || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			eventId,
			invitedEmail: "invited@example.com",
			invitedByUserId,
			role: "collaborator",
			status: "pending",
			token: `invite-token-${id}`,
			expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days from now
			createdAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock task
	 */
	task: (overrides?: Partial<Doc<"tasks">>): Doc<"tasks"> => {
		const id = overrides?._id || generateId("tasks");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const roomId = overrides?.roomId || generateId("rooms");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			eventId,
			roomId,
			title: "Test Task",
			status: "todo",
			priority: "medium",
			category: "other",
			createdAt: now,
			updatedAt: now,
			createdBy,
			...overrides,
		};
	},

	/**
	 * Create a mock expense
	 */
	expense: (overrides?: Partial<Doc<"expenses">>): Doc<"expenses"> => {
		const id = overrides?._id || generateId("expenses");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const paidBy = overrides?.paidBy || generateId("users");
		const createdBy = overrides?.createdBy || paidBy;

		return {
			_id: id,
			_creationTime: now,
			eventId,
			description: "Test Expense",
			amount: 100,
			currency: "USD",
			category: "other",
			paidBy,
			paidAt: now,
			createdAt: now,
			updatedAt: now,
			createdBy,
			...overrides,
		};
	},

	/**
	 * Create a mock poll
	 */
	poll: (overrides?: Partial<Doc<"polls">>): Doc<"polls"> => {
		const id = overrides?._id || generateId("polls");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			eventId,
			question: "Test Poll Question?",
			options: [
				{ id: "1", text: "Option 1" },
				{ id: "2", text: "Option 2" },
			],
			allowMultipleChoices: false,
			isClosed: false,
			createdAt: now,
			createdBy,
			...overrides,
		};
	},

	/**
	 * Create a mock poll vote
	 */
	pollVote: (overrides?: Partial<Doc<"pollVotes">>): Doc<"pollVotes"> => {
		const id = overrides?._id || generateId("pollVotes");
		const now = Date.now();
		const pollId = overrides?.pollId || generateId("polls");
		const userId = overrides?.userId || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			pollId,
			userId,
			optionIds: ["1"],
			createdAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock vendor
	 */
	vendor: (overrides?: Partial<Doc<"vendors">>): Doc<"vendors"> => {
		const id = overrides?._id || generateId("vendors");
		const now = Date.now();
		const addedBy = overrides?.addedBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			name: `Test Vendor ${idCounter}`,
			category: "catering",
			description: "Experienced event catering service",
			email: `vendor-${id}@example.com`,
			phone: "+1-555-0100",
			website: `https://vendor-${idCounter}.example.com`,
			city: "San Francisco",
			state: "CA",
			country: "USA",
			pricing: {
				min: 1000,
				max: 5000,
				currency: "USD",
				notes: "Price varies by event size",
			},
			rating: 4.5,
			reviewCount: 127,
			reviewSource: "The Knot",
			status: "researching",
			aiMetadata: {
				matchScore: 0.85,
				pros: ["Great reviews", "Flexible pricing", "Local"],
				cons: ["Limited availability in peak season"],
				specialties: ["Wedding catering", "Corporate events"],
				availability: "Available most weekends",
				searchQuery: "wedding caterer San Francisco",
				scrapedAt: now,
			},
			addedBy,
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock task group
	 */
	taskGroup: (overrides?: Partial<Doc<"taskGroups">>): Doc<"taskGroups"> => {
		const id = overrides?._id || generateId("taskGroups");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			name: `Task Group ${idCounter}`,
			description: "Group of related tasks",
			eventId,
			color: "#3B82F6",
			icon: "📋",
			order: idCounter,
			createdBy,
			createdAt: now,
			updatedAt: now,
			taskCount: 0,
			completedCount: 0,
			...overrides,
		};
	},

	/**
	 * Create a mock guest
	 */
	guest: (overrides?: Partial<Doc<"guests">>): Doc<"guests"> => {
		const id = overrides?._id || generateId("guests");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const invitedBy = overrides?.invitedBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			firstName: `Guest${idCounter}`,
			lastName: "Smith",
			email: `guest-${id}@example.com`,
			phone: "+1-555-0200",
			eventId,
			invitedBy,
			guestType: "friend",
			rsvpStatus: "pending",
			plusOneAllowed: true,
			dietaryRestrictions: ["vegetarian"],
			allergies: [],
			seatingGroup: "bride_side",
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock payment schedule
	 */
	paymentSchedule: (
		overrides?: Partial<Doc<"paymentSchedules">>,
	): Doc<"paymentSchedules"> => {
		const id = overrides?._id || generateId("paymentSchedules");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");
		const dueDate = overrides?.dueDate || now + 30 * 24 * 60 * 60 * 1000; // 30 days from now

		// Auto-calculate status based on due date
		let status: "upcoming" | "due_soon" | "overdue" | "paid" | "cancelled" =
			"upcoming";
		const daysUntilDue = (dueDate - now) / (24 * 60 * 60 * 1000);
		if (daysUntilDue < 0) {
			status = "overdue";
		} else if (daysUntilDue <= 7) {
			status = "due_soon";
		}

		return {
			_id: id,
			_creationTime: now,
			eventId,
			description: `Payment ${idCounter}`,
			amount: 1000,
			currency: "USD",
			dueDate,
			status,
			notes: "First installment payment",
			createdBy,
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock milestone
	 */
	milestone: (overrides?: Partial<Doc<"milestones">>): Doc<"milestones"> => {
		const id = overrides?._id || generateId("milestones");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			name: `Milestone ${idCounter}`,
			description: "Important planning checkpoint",
			eventId,
			category: "venue",
			targetDate: now + 60 * 24 * 60 * 60 * 1000, // 60 days from now
			status: "not_started",
			criticality: "important",
			completionCriteria: ["Venue booked", "Contract signed", "Deposit paid"],
			industryStandardTiming: "3-6 months before event",
			risks: ["Popular venues book up quickly"],
			createdBy,
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock timeline event
	 */
	timelineEvent: (
		overrides?: Partial<Doc<"timelineEvents">>,
	): Doc<"timelineEvents"> => {
		const id = overrides?._id || generateId("timelineEvents");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");
		const startTime = overrides?.startTime || now + 7 * 24 * 60 * 60 * 1000; // 7 days from now

		return {
			_id: id,
			_creationTime: now,
			name: `Timeline Event ${idCounter}`,
			description: "Event timeline activity",
			eventId,
			startTime,
			endTime: startTime + 60 * 60 * 1000, // 1 hour duration
			duration: 60,
			type: "ceremony",
			location: "Main Venue",
			status: "scheduled",
			order: idCounter,
			alertMinutesBefore: 30,
			notes: "Ensure all vendors are ready",
			createdBy,
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock announcement
	 */
	announcement: (
		overrides?: Partial<Doc<"announcements">>,
	): Doc<"announcements"> => {
		const id = overrides?._id || generateId("announcements");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			title: `Announcement ${idCounter}`,
			message: "Important event update for all guests",
			eventId,
			type: "update",
			deliveryMethod: ["email", "in_app"],
			sendToAll: true,
			status: "draft",
			deliveryStats: {
				totalSent: 0,
				delivered: 0,
				opened: 0,
				clicked: 0,
				bounced: 0,
			},
			createdBy,
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock inventory item
	 */
	inventoryItem: (overrides?: Partial<Doc<"inventory">>): Doc<"inventory"> => {
		const id = overrides?._id || generateId("inventory");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			name: `Inventory Item ${idCounter}`,
			description: "Event rental equipment",
			category: "furniture",
			eventId,
			quantity: 10,
			unit: "pieces",
			acquisitionType: "rented",
			rentalDetails: {
				pickupDate: now + 5 * 24 * 60 * 60 * 1000, // 5 days from now
				returnDate: now + 8 * 24 * 60 * 60 * 1000, // 8 days from now
				returnLocation: "Rental Company Warehouse",
				deposit: 500,
				damagePolicy: "Full replacement cost for damaged items",
			},
			costPerUnit: 25,
			totalCost: 250,
			status: "ordered",
			conditionNotes: "Excellent condition upon delivery",
			storageLocation: "Venue storage room",
			createdBy,
			createdAt: now,
			updatedAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock decision
	 */
	decision: (overrides?: Partial<Doc<"decisions">>): Doc<"decisions"> => {
		const id = overrides?._id || generateId("decisions");
		const now = Date.now();
		const eventId = overrides?.eventId || generateId("events");
		const roomId = overrides?.roomId || generateId("rooms");
		const createdBy = overrides?.createdBy || generateId("users");

		return {
			_id: id,
			_creationTime: now,
			question: `Decision Question ${idCounter}`,
			description: "Important decision for the event",
			eventId,
			roomId,
			type: "multiple_choice",
			options: [
				{
					id: "option-1",
					text: "Option A",
					votes: 3,
					voters: [],
				},
				{
					id: "option-2",
					text: "Option B",
					votes: 5,
					voters: [],
				},
			],
			status: "active",
			suggestedByAI: false,
			aiReasoning: "Based on budget and timeline constraints",
			createdBy,
			createdAt: now,
			...overrides,
		};
	},

	/**
	 * Create a mock checkpoint
	 */
	checkpoint: (overrides?: Partial<Doc<"checkpoints">>): Doc<"checkpoints"> => {
		const id = overrides?._id || generateId("checkpoints");
		const now = Date.now();
		const roomId = overrides?.roomId || generateId("rooms");

		return {
			_id: id,
			_creationTime: now,
			roomId,
			doInstanceId: `do-instance-${idCounter}`,
			checkpointId: idCounter,
			snapshot: JSON.stringify({
				messages: [],
				state: "active",
				timestamp: now,
			}),
			messageCount: 42,
			memorySize: 2048,
			checksum: `checksum-${idCounter}`,
			createdAt: now,
			...overrides,
		};
	},
};

/**
 * Create a complete test scenario with event, rooms, and participants
 */
export const createTestScenario = () => {
	const coordinator = factories.coordinator();
	const collaborator = factories.user({ role: "collaborator" });
	const guest = factories.user({ role: "guest" });

	const event = factories.event({ coordinatorId: coordinator._id });
	const mainRoom = factories.room({
		eventId: event._id,
		createdBy: coordinator._id,
		type: "main",
	});

	const coordinatorParticipant = factories.roomParticipant({
		roomId: mainRoom._id,
		userId: coordinator._id,
		canPost: true,
		canEdit: true,
		canDelete: true,
		canManage: true,
	});

	const collaboratorParticipant = factories.roomParticipant({
		roomId: mainRoom._id,
		userId: collaborator._id,
		canPost: true,
		canEdit: true,
		canDelete: true,
		canManage: false,
	});

	const guestParticipant = factories.roomParticipant({
		roomId: mainRoom._id,
		userId: guest._id,
		canPost: false,
		canEdit: false,
		canDelete: false,
		canManage: false,
	});

	return {
		users: { coordinator, collaborator, guest },
		event,
		mainRoom,
		participants: {
			coordinator: coordinatorParticipant,
			collaborator: collaboratorParticipant,
			guest: guestParticipant,
		},
	};
};
