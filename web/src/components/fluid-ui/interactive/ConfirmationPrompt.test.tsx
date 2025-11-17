/**
 * ConfirmationPrompt Component Tests
 *
 * Test coverage:
 * - Rendering question and buttons
 * - Handling confirm/cancel callbacks
 * - Variant styling (default, warning, danger)
 * - Auto-focus on confirm button
 * - Keyboard shortcuts (Enter = confirm, Esc = cancel)
 * - Custom button labels
 * - Description display
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationPrompt } from "./ConfirmationPrompt";

describe("ConfirmationPrompt - Rendering", () => {
	it("renders question text", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="Are you sure you want to proceed?"
				onConfirm={onConfirm}
			/>,
		);

		expect(
			screen.getByText("Are you sure you want to proceed?"),
		).toBeInTheDocument();
	});

	it("renders default Yes/No labels when not provided", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt question="Confirm action?" onConfirm={onConfirm} />,
		);

		expect(screen.getByText("Yes")).toBeInTheDocument();
		expect(screen.getByText("No")).toBeInTheDocument();
	});

	it("renders custom button labels when provided", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="Delete this item?"
				yesLabel="Delete"
				noLabel="Cancel"
				onConfirm={onConfirm}
			/>,
		);

		expect(screen.getByText("Delete")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("renders description when provided", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="Delete this event?"
				description="This action cannot be undone. All associated data will be permanently deleted."
				onConfirm={onConfirm}
			/>,
		);

		expect(
			screen.getByText(/This action cannot be undone/),
		).toBeInTheDocument();
	});
});

describe("ConfirmationPrompt - Callbacks", () => {
	it("calls onConfirm with true when Yes button clicked", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />);

		await user.click(screen.getByText("Yes"));

		expect(onConfirm).toHaveBeenCalledWith(true);
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it("calls onConfirm with false when No button clicked", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />);

		await user.click(screen.getByText("No"));

		expect(onConfirm).toHaveBeenCalledWith(false);
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});

describe("ConfirmationPrompt - Variants", () => {
	it("applies default variant styling", () => {
		const onConfirm = vi.fn();
		const { container } = render(
			<ConfirmationPrompt
				question="Proceed?"
				variant="default"
				onConfirm={onConfirm}
			/>,
		);

		const card = container.querySelector(".border-purple-300");
		expect(card).toBeInTheDocument();
	});

	it("applies warning variant styling", () => {
		const onConfirm = vi.fn();
		const { container } = render(
			<ConfirmationPrompt
				question="Are you sure?"
				variant="warning"
				onConfirm={onConfirm}
			/>,
		);

		const card = container.querySelector(".border-yellow-300");
		expect(card).toBeInTheDocument();
	});

	it("applies danger variant styling", () => {
		const onConfirm = vi.fn();
		const { container } = render(
			<ConfirmationPrompt
				question="Delete permanently?"
				variant="danger"
				onConfirm={onConfirm}
			/>,
		);

		const card = container.querySelector(".border-red-300");
		expect(card).toBeInTheDocument();
	});

	it("uses correct button color for danger variant", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="Delete?"
				variant="danger"
				yesLabel="Delete"
				onConfirm={onConfirm}
			/>,
		);

		const deleteButton = screen.getByText("Delete");
		expect(deleteButton.className).toContain("bg-red-600");
	});
});

describe("ConfirmationPrompt - Auto-focus", () => {
	it("auto-focuses on confirm button when mounted", () => {
		const onConfirm = vi.fn();
		render(<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />);

		const yesButton = screen.getByText("Yes");
		expect(yesButton).toHaveFocus();
	});
});

describe("ConfirmationPrompt - Keyboard Shortcuts", () => {
	let cleanup: (() => void) | undefined;

	afterEach(() => {
		if (cleanup) {
			cleanup();
			cleanup = undefined;
		}
	});

	it("confirms on Enter key press", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		const result = render(
			<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />,
		);
		cleanup = result.unmount;

		await user.keyboard("{Enter}");

		expect(onConfirm).toHaveBeenCalledWith(true);
	});

	it("cancels on Escape key press", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		const result = render(
			<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />,
		);
		cleanup = result.unmount;

		await user.keyboard("{Escape}");

		expect(onConfirm).toHaveBeenCalledWith(false);
	});

	it("handles multiple key presses correctly", async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		const result = render(
			<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />,
		);
		cleanup = result.unmount;

		// Press Escape first
		await user.keyboard("{Escape}");
		expect(onConfirm).toHaveBeenCalledWith(false);

		onConfirm.mockClear();

		// Unmount and re-render to test Enter
		cleanup();
		const result2 = render(
			<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />,
		);
		cleanup = result2.unmount;

		await user.keyboard("{Enter}");
		expect(onConfirm).toHaveBeenCalledWith(true);
	});
});

describe("ConfirmationPrompt - Accessibility", () => {
	it("displays alert icon for visual context", () => {
		const onConfirm = vi.fn();
		const { container } = render(
			<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />,
		);

		// Check for SVG icon (AlertCircle from lucide-react)
		const icon = container.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("maintains focus management for keyboard users", () => {
		const onConfirm = vi.fn();
		render(<ConfirmationPrompt question="Proceed?" onConfirm={onConfirm} />);

		const yesButton = screen.getByText("Yes");
		const noButton = screen.getByText("No");

		expect(yesButton).toBeInTheDocument();
		expect(noButton).toBeInTheDocument();
		expect(yesButton).toHaveFocus();
	});
});

describe("ConfirmationPrompt - Use Cases", () => {
	it("renders destructive action confirmation", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="Delete all events?"
				description="This will permanently delete all events and cannot be undone."
				variant="danger"
				yesLabel="Delete All"
				noLabel="Keep Events"
				onConfirm={onConfirm}
			/>,
		);

		expect(screen.getByText("Delete all events?")).toBeInTheDocument();
		expect(
			screen.getByText(/permanently delete all events/),
		).toBeInTheDocument();
		expect(screen.getByText("Delete All")).toBeInTheDocument();
		expect(screen.getByText("Keep Events")).toBeInTheDocument();
	});

	it("renders warning confirmation", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="This event has unsaved changes"
				description="You have unsaved changes. Do you want to continue without saving?"
				variant="warning"
				yesLabel="Continue"
				noLabel="Go Back"
				onConfirm={onConfirm}
			/>,
		);

		expect(
			screen.getByText("This event has unsaved changes"),
		).toBeInTheDocument();
		expect(screen.getByText(/unsaved changes/)).toBeInTheDocument();
		expect(screen.getByText("Continue")).toBeInTheDocument();
		expect(screen.getByText("Go Back")).toBeInTheDocument();
	});

	it("renders simple yes/no confirmation", () => {
		const onConfirm = vi.fn();
		render(
			<ConfirmationPrompt
				question="Send invitation emails to all guests?"
				onConfirm={onConfirm}
			/>,
		);

		expect(
			screen.getByText("Send invitation emails to all guests?"),
		).toBeInTheDocument();
		expect(screen.getByText("Yes")).toBeInTheDocument();
		expect(screen.getByText("No")).toBeInTheDocument();
	});
});
