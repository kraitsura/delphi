/**
 * QuickActions Component Tests
 *
 * Test coverage:
 * - Rendering action buttons
 * - Handling action clicks
 * - Variant styling (primary, secondary, danger)
 * - Button grid layout
 * - Icon display
 * - Max 4 actions limit
 * - Keyboard navigation
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Trash } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { QuickActions } from "./QuickActions";

describe("QuickActions - Rendering", () => {
	it("renders action buttons with labels", () => {
		const actions = [
			{ id: "1", label: "Create Task", action: "create_task" },
			{ id: "2", label: "Add Expense", action: "add_expense" },
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		expect(screen.getByText("Create Task")).toBeInTheDocument();
		expect(screen.getByText("Add Expense")).toBeInTheDocument();
	});

	it("renders custom title when provided", () => {
		const actions = [
			{ id: "1", label: "Do Something", action: "do_something" },
		];
		const onAction = vi.fn();

		render(
			<QuickActions
				actions={actions}
				onAction={onAction}
				title="Suggested Actions"
			/>,
		);

		expect(screen.getByText("Suggested Actions")).toBeInTheDocument();
	});

	it("renders default title when not provided", () => {
		const actions = [
			{ id: "1", label: "Do Something", action: "do_something" },
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		expect(screen.getByText("Quick Actions")).toBeInTheDocument();
	});

	it("limits display to max 4 actions", () => {
		const actions = [
			{ id: "1", label: "Action 1", action: "action_1" },
			{ id: "2", label: "Action 2", action: "action_2" },
			{ id: "3", label: "Action 3", action: "action_3" },
			{ id: "4", label: "Action 4", action: "action_4" },
			{ id: "5", label: "Action 5", action: "action_5" },
			{ id: "6", label: "Action 6", action: "action_6" },
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		expect(screen.getByText("Action 1")).toBeInTheDocument();
		expect(screen.getByText("Action 4")).toBeInTheDocument();
		expect(screen.queryByText("Action 5")).not.toBeInTheDocument();
		expect(screen.queryByText("Action 6")).not.toBeInTheDocument();
	});

	it("displays icons when provided", () => {
		const actions = [
			{ id: "1", label: "Create", action: "create", icon: Plus },
			{ id: "2", label: "Delete", action: "delete", icon: Trash },
		];
		const onAction = vi.fn();

		const { container } = render(
			<QuickActions actions={actions} onAction={onAction} />,
		);

		// Check that SVG icons are rendered (lucide-react renders as SVG)
		const svgs = container.querySelectorAll("svg");
		expect(svgs.length).toBeGreaterThan(0);
	});
});

describe("QuickActions - Action Handling", () => {
	it("calls onAction with correct parameters when button clicked", async () => {
		const user = userEvent.setup();
		const actions = [
			{ id: "1", label: "Create Task", action: "create_task" },
			{ id: "2", label: "Search Vendors", action: "search_vendors" },
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		const createButton = screen.getByText("Create Task");
		await user.click(createButton);

		expect(onAction).toHaveBeenCalledWith("1", "create_task");
		expect(onAction).toHaveBeenCalledTimes(1);
	});

	it("handles multiple button clicks", async () => {
		const user = userEvent.setup();
		const actions = [
			{ id: "1", label: "Action 1", action: "action_1" },
			{ id: "2", label: "Action 2", action: "action_2" },
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		await user.click(screen.getByText("Action 1"));
		await user.click(screen.getByText("Action 2"));

		expect(onAction).toHaveBeenCalledTimes(2);
		expect(onAction).toHaveBeenNthCalledWith(1, "1", "action_1");
		expect(onAction).toHaveBeenNthCalledWith(2, "2", "action_2");
	});
});

describe("QuickActions - Variants", () => {
	it("renders primary variant correctly", () => {
		const actions = [
			{
				id: "1",
				label: "Primary Action",
				action: "primary",
				variant: "primary" as const,
			},
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		const button = screen.getByText("Primary Action");
		expect(button).toBeInTheDocument();
		// Primary should have purple background
		expect(button.className).toContain("bg-purple-600");
	});

	it("renders secondary variant correctly", () => {
		const actions = [
			{
				id: "1",
				label: "Secondary Action",
				action: "secondary",
				variant: "secondary" as const,
			},
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		const button = screen.getByText("Secondary Action");
		expect(button).toBeInTheDocument();
	});

	it("renders danger variant correctly", () => {
		const actions = [
			{
				id: "1",
				label: "Delete",
				action: "delete",
				variant: "danger" as const,
			},
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		const button = screen.getByText("Delete");
		expect(button).toBeInTheDocument();
		// Danger should have red background
		expect(button.className).toContain("bg-red-600");
	});

	it("handles mixed variants", () => {
		const actions = [
			{
				id: "1",
				label: "Create",
				action: "create",
				variant: "primary" as const,
			},
			{ id: "2", label: "Edit", action: "edit", variant: "secondary" as const },
			{
				id: "3",
				label: "Delete",
				action: "delete",
				variant: "danger" as const,
			},
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		expect(screen.getByText("Create")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
		expect(screen.getByText("Delete")).toBeInTheDocument();
	});
});

describe("QuickActions - Grid Layout", () => {
	it("uses 2-column grid for 2 actions", () => {
		const actions = [
			{ id: "1", label: "Action 1", action: "action_1" },
			{ id: "2", label: "Action 2", action: "action_2" },
		];
		const onAction = vi.fn();

		const { container } = render(
			<QuickActions actions={actions} onAction={onAction} />,
		);

		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-2");
	});

	it("uses 3-column grid for 3 actions", () => {
		const actions = [
			{ id: "1", label: "Action 1", action: "action_1" },
			{ id: "2", label: "Action 2", action: "action_2" },
			{ id: "3", label: "Action 3", action: "action_3" },
		];
		const onAction = vi.fn();

		const { container } = render(
			<QuickActions actions={actions} onAction={onAction} />,
		);

		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-3");
	});

	it("uses 2-column grid for 4 actions", () => {
		const actions = [
			{ id: "1", label: "Action 1", action: "action_1" },
			{ id: "2", label: "Action 2", action: "action_2" },
			{ id: "3", label: "Action 3", action: "action_3" },
			{ id: "4", label: "Action 4", action: "action_4" },
		];
		const onAction = vi.fn();

		const { container } = render(
			<QuickActions actions={actions} onAction={onAction} />,
		);

		const grid = container.querySelector(".grid");
		expect(grid?.className).toContain("grid-cols-2");
	});
});

describe("QuickActions - Keyboard Navigation", () => {
	it("allows keyboard navigation with Tab", async () => {
		const user = userEvent.setup();
		const actions = [
			{ id: "1", label: "Action 1", action: "action_1" },
			{ id: "2", label: "Action 2", action: "action_2" },
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		// Tab to first button
		await user.tab();
		expect(screen.getByText("Action 1")).toHaveFocus();

		// Tab to second button
		await user.tab();
		expect(screen.getByText("Action 2")).toHaveFocus();
	});

	it("allows activating buttons with Enter key", async () => {
		const user = userEvent.setup();
		const actions = [{ id: "1", label: "Action 1", action: "action_1" }];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		const button = screen.getByText("Action 1");
		button.focus();

		await user.keyboard("{Enter}");

		expect(onAction).toHaveBeenCalledWith("1", "action_1");
	});
});

describe("QuickActions - Accessibility", () => {
	it("shows description as title attribute", () => {
		const actions = [
			{
				id: "1",
				label: "Create",
				action: "create",
				description: "Create a new task",
			},
		];
		const onAction = vi.fn();

		render(<QuickActions actions={actions} onAction={onAction} />);

		const button = screen.getByText("Create");
		expect(button).toHaveAttribute("title", "Create a new task");
	});
});
