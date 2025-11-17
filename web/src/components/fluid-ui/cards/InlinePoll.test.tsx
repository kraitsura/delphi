/**
 * InlinePoll Component Tests
 *
 * Test coverage:
 * - Rendering question and options
 * - Single choice voting
 * - Multiple choice voting
 * - Vote submission and updates
 * - Real-time vote count updates
 * - Deadline countdown timer
 * - Expired state handling
 * - Disabled states (voted, expired, closed)
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InlinePoll } from "./InlinePoll";

// Mock Convex hooks
vi.mock("convex/react", () => ({
	useQuery: vi.fn(),
	useMutation: vi.fn(),
}));

// Mock Sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	},
}));

// Mock auth hook
vi.mock("@/lib/auth", () => ({
	useSession: vi.fn(() => ({
		data: { user: { id: "user_123", email: "test@example.com" } },
	})),
}));

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth";

const mockUseQuery = useQuery as any;
const mockUseMutation = useMutation as any;
const mockUseSession = useSession as any;

describe("InlinePoll - Rendering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseQuery.mockReturnValue(undefined);
		mockUseMutation.mockReturnValue(vi.fn());
		mockUseSession.mockReturnValue({
			data: { user: { id: "user_123", email: "test@example.com" } },
		});
	});

	it("renders poll question and options", () => {
		const props = {
			pollId: "poll_123" as any,
			question: "Which caterer should we hire?",
			options: [
				{ id: "opt1", text: "Tasty Bites" },
				{ id: "opt2", text: "Gourmet Delights" },
				{ id: "opt3", text: "Fresh Flavors" },
			],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		// Mock poll data
		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			return [];
		});

		render(<InlinePoll {...props} />);

		expect(
			screen.getByText("Which caterer should we hire?"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Tasty Bites")).toBeInTheDocument();
		expect(screen.getByLabelText("Gourmet Delights")).toBeInTheDocument();
		expect(screen.getByLabelText("Fresh Flavors")).toBeInTheDocument();
	});

	it("renders deadline countdown when deadline provided", () => {
		const futureDeadline = Date.now() + 300000; // 5 minutes from now

		const props = {
			pollId: "poll_123" as any,
			question: "Vote now!",
			options: [{ id: "opt1", text: "Option A" }],
			allowMultipleChoices: false,
			deadline: futureDeadline,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			return [];
		});

		render(<InlinePoll {...props} />);

		// Should show countdown timer
		expect(screen.getByText(/\d+:\d+/)).toBeInTheDocument();
	});

	it("displays option descriptions when provided", () => {
		const props = {
			pollId: "poll_123" as any,
			question: "Choose a venue",
			options: [
				{
					id: "opt1",
					text: "Grand Hall",
					description: "Seats 500, downtown location",
				},
			],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			return [];
		});

		render(<InlinePoll {...props} />);

		expect(
			screen.getByText("Seats 500, downtown location"),
		).toBeInTheDocument();
	});
});

describe("InlinePoll - Single Choice Voting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession.mockReturnValue({
			data: { user: { id: "user_123", email: "test@example.com" } },
		});
	});

	it("allows selecting a single option", async () => {
		const user = userEvent.setup();
		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [
				{ id: "opt1", text: "Option A" },
				{ id: "opt2", text: "Option B" },
			],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) return null; // No existing vote
			return [];
		});

		render(<InlinePoll {...props} />);

		const option1 = screen.getByLabelText("Option A");
		await user.click(option1);

		expect(option1).toBeChecked();
	});

	it("deselects previous option when selecting new one", async () => {
		const user = userEvent.setup();
		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [
				{ id: "opt1", text: "Option A" },
				{ id: "opt2", text: "Option B" },
			],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) return null;
			return [];
		});

		render(<InlinePoll {...props} />);

		const option1 = screen.getByLabelText("Option A");
		const option2 = screen.getByLabelText("Option B");

		await user.click(option1);
		expect(option1).toBeChecked();

		await user.click(option2);
		expect(option2).toBeChecked();
		expect(option1).not.toBeChecked();
	});
});

describe("InlinePoll - Multiple Choice Voting", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession.mockReturnValue({
			data: { user: { id: "user_123", email: "test@example.com" } },
		});
	});

	it("allows selecting multiple options", async () => {
		const user = userEvent.setup();
		const props = {
			pollId: "poll_123" as any,
			question: "Choose all that apply",
			options: [
				{ id: "opt1", text: "Option A" },
				{ id: "opt2", text: "Option B" },
				{ id: "opt3", text: "Option C" },
			],
			allowMultipleChoices: true,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) return null;
			return [];
		});

		render(<InlinePoll {...props} />);

		const option1 = screen.getByLabelText("Option A");
		const option2 = screen.getByLabelText("Option B");

		await user.click(option1);
		await user.click(option2);

		expect(option1).toBeChecked();
		expect(option2).toBeChecked();
	});
});

describe("InlinePoll - Vote Submission", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession.mockReturnValue({
			data: { user: { id: "user_123", email: "test@example.com" } },
		});
	});

	it("submits vote when button clicked", async () => {
		const user = userEvent.setup();
		const mockCastVote = vi.fn().mockResolvedValue({});
		mockUseMutation.mockReturnValue(mockCastVote);

		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [{ id: "opt1", text: "Option A" }],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) return null;
			return [];
		});

		render(<InlinePoll {...props} />);

		const option1 = screen.getByLabelText("Option A");
		await user.click(option1);

		const submitButton = screen.getByText("Submit Vote");
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockCastVote).toHaveBeenCalledWith({
				pollId: "poll_123",
				optionIds: ["opt1"],
			});
		});

		expect(toast.success).toHaveBeenCalledWith("Vote submitted");
	});

	it("shows error when voting without selection", async () => {
		const mockCastVote = vi.fn();
		mockUseMutation.mockReturnValue(mockCastVote);

		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [{ id: "opt1", text: "Option A" }],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) return null;
			return [];
		});

		render(<InlinePoll {...props} />);

		const submitButton = screen.getByText("Submit Vote");
		expect(submitButton).toBeDisabled();
	});
});

describe("InlinePoll - Vote Results Display", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession.mockReturnValue({
			data: { user: { id: "user_123", email: "test@example.com" } },
		});
	});

	it("shows vote counts after user has voted", () => {
		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [
				{ id: "opt1", text: "Option A" },
				{ id: "opt2", text: "Option B" },
			],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) {
				// User has voted
				return { optionIds: ["opt1"], isDeleted: false };
			}
			// Return vote data
			return [
				{ optionIds: ["opt1"], isDeleted: false },
				{ optionIds: ["opt1"], isDeleted: false },
				{ optionIds: ["opt2"], isDeleted: false },
			];
		});

		render(<InlinePoll {...props} />);

		// Should show vote counts
		expect(screen.getByText(/2 votes/)).toBeInTheDocument();
		expect(screen.getByText(/1 vote/)).toBeInTheDocument();
	});
});

describe("InlinePoll - Expired State", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSession.mockReturnValue({
			data: { user: { id: "user_123", email: "test@example.com" } },
		});
	});

	it("shows expired state when deadline passed", () => {
		const pastDeadline = Date.now() - 1000; // 1 second ago

		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [{ id: "opt1", text: "Option A" }],
			allowMultipleChoices: false,
			deadline: pastDeadline,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: false };
			if (args?.userId) return null;
			return [];
		});

		render(<InlinePoll {...props} />);

		expect(screen.getByText("Expired")).toBeInTheDocument();
		expect(screen.queryByText("Submit Vote")).not.toBeInTheDocument();
	});

	it("disables voting when poll is closed", () => {
		const props = {
			pollId: "poll_123" as any,
			question: "Choose one",
			options: [{ id: "opt1", text: "Option A" }],
			allowMultipleChoices: false,
			eventId: "event_123" as any,
			roomId: "room_123" as any,
		};

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			if (args?.pollId) return { isClosed: true };
			if (args?.userId) return null;
			return [];
		});

		render(<InlinePoll {...props} />);

		expect(screen.getByText("This poll is now closed")).toBeInTheDocument();
		expect(screen.queryByText("Submit Vote")).not.toBeInTheDocument();
	});
});
