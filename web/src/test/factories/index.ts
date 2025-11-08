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
				spent: 0,
				committed: 0,
			},
			guestCount: {
				expected: 100,
				confirmed: 0,
			},
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
		const createdBy = overrides?.createdBy || generateId("users");
		const assignedBy = overrides?.assignedBy || createdBy;

		return {
			_id: id,
			_creationTime: now,
			eventId,
			title: "Test Task",
			status: "not_started",
			priority: "medium",
			assignedBy,
			aiEnriched: false,
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
			paidBy,
			paidAt: now,
			createdAt: now,
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
