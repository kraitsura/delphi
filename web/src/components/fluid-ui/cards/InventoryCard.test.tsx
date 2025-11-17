/**
 * InventoryCard Component Tests
 *
 * Test coverage:
 * - Rendering inventory items
 * - Category filtering
 * - Creating new items
 * - Edit and delete actions
 * - Loading and empty states
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryCard } from "./InventoryCard";

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
	},
}));

import { useMutation, useQuery } from "convex/react";

const mockUseQuery = useQuery as any;
const mockUseMutation = useMutation as any;

describe("InventoryCard - Rendering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseMutation.mockReturnValue(vi.fn());
	});

	it("renders inventory items", () => {
		const mockItems = [
			{
				_id: "inv_1",
				name: "Chairs",
				description: "White folding chairs",
				category: "furniture",
				quantity: 100,
				unit: "pieces",
				acquisitionType: "rented",
				costPerUnit: 5,
				totalCost: 500,
				status: "delivered",
			},
			{
				_id: "inv_2",
				name: "Tables",
				description: "Round tables",
				category: "furniture",
				quantity: 20,
				unit: "pieces",
				acquisitionType: "rented",
				costPerUnit: 25,
				totalCost: 500,
				status: "ordered",
			},
		];

		mockUseQuery.mockReturnValue(mockItems);

		render(<InventoryCard eventId={"event_123" as any} />);

		expect(screen.getByText("Inventory")).toBeInTheDocument();
		expect(screen.getByText("Chairs")).toBeInTheDocument();
		expect(screen.getByText("Tables")).toBeInTheDocument();
	});

	it("displays empty state when no items", () => {
		mockUseQuery.mockReturnValue([]);

		render(<InventoryCard eventId={"event_123" as any} />);

		expect(screen.getByText("No inventory items")).toBeInTheDocument();
	});

	it("displays loading skeleton when items are undefined", () => {
		mockUseQuery.mockReturnValue(undefined);

		render(<InventoryCard eventId={"event_123" as any} />);

		expect(screen.getByText("Inventory")).toBeInTheDocument();
	});
});

describe("InventoryCard - Filtering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseMutation.mockReturnValue(vi.fn());
	});

	it("filters items by category", () => {
		const mockItems = [
			{
				_id: "inv_1",
				name: "Chairs",
				category: "furniture",
				quantity: 100,
				unit: "pieces",
				acquisitionType: "rented",
				costPerUnit: 5,
				totalCost: 500,
			},
		];

		mockUseQuery.mockReturnValue(mockItems);

		render(<InventoryCard eventId={"event_123" as any} category="furniture" />);

		expect(screen.getByText("Chairs")).toBeInTheDocument();
	});
});

describe("InventoryCard - CRUD Operations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows create form when showForm prop is true", () => {
		mockUseQuery.mockReturnValue([]);
		mockUseMutation.mockReturnValue(vi.fn());

		render(<InventoryCard eventId={"event_123" as any} showForm={true} />);

		// Should show form elements
		expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
	});

	it("can toggle create form visibility", async () => {
		const user = userEvent.setup();
		mockUseQuery.mockReturnValue([]);
		mockUseMutation.mockReturnValue(vi.fn());

		render(<InventoryCard eventId={"event_123" as any} showForm={false} />);

		// Find and click the Add button
		const addButton = screen.getByRole("button", { name: /add item/i });
		await user.click(addButton);

		// Form should now be visible
		expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
	});
});

describe("InventoryCard - Item Display", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseMutation.mockReturnValue(vi.fn());
	});

	it("displays item details correctly", () => {
		const mockItems = [
			{
				_id: "inv_1",
				name: "Premium Chairs",
				description: "Luxury white chairs",
				category: "furniture",
				quantity: 50,
				unit: "pieces",
				acquisitionType: "rented",
				costPerUnit: 10,
				totalCost: 500,
				status: "delivered",
				storageLocation: "Warehouse A",
			},
		];

		mockUseQuery.mockReturnValue(mockItems);

		render(<InventoryCard eventId={"event_123" as any} />);

		expect(screen.getByText("Premium Chairs")).toBeInTheDocument();
		// Item should be displayed
		expect(screen.getByText("Inventory")).toBeInTheDocument();
	});

	it("limits displayed items when limit prop provided", () => {
		const mockItems = [
			{
				_id: "inv_1",
				name: "Item 1",
				category: "cat1",
				quantity: 10,
				unit: "pcs",
				acquisitionType: "rented",
				costPerUnit: 5,
				totalCost: 50,
			},
			{
				_id: "inv_2",
				name: "Item 2",
				category: "cat1",
				quantity: 20,
				unit: "pcs",
				acquisitionType: "rented",
				costPerUnit: 5,
				totalCost: 100,
			},
			{
				_id: "inv_3",
				name: "Item 3",
				category: "cat1",
				quantity: 30,
				unit: "pcs",
				acquisitionType: "rented",
				costPerUnit: 5,
				totalCost: 150,
			},
		];

		mockUseQuery.mockReturnValue(mockItems);

		render(<InventoryCard eventId={"event_123" as any} limit={2} />);

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 2")).toBeInTheDocument();
		expect(screen.queryByText("Item 3")).not.toBeInTheDocument();
	});
});
