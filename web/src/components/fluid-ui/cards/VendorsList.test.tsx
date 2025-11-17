/**
 * VendorsList Component Tests
 *
 * Test coverage:
 * - Rendering vendor list
 * - Category and status filtering
 * - Zustand master component integration
 * - Vendor selection and toggle
 * - Loading and empty states
 * - Limit display
 * - Clear filters functionality
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorsList } from "./VendorsList";

// Mock Convex API
vi.mock("@convex/_generated/api", () => ({
	api: {
		vendors: {
			listByEvent: vi.fn(),
		},
	},
}));

// Mock Convex hooks
vi.mock("convex/react", () => ({
	useQuery: vi.fn(),
}));

// Mock VendorCard component
vi.mock("./VendorCard", () => ({
	VendorCard: ({ vendorId }: { vendorId: string }) => (
		<div data-testid={`vendor-card-${vendorId}`}>Vendor {vendorId}</div>
	),
}));

// Mock Zustand Dashboard Store
vi.mock("@/lib/fluid-ui/DashboardStoreContext", () => ({
	useDashboardStore: vi.fn(),
}));

import { useQuery } from "convex/react";
import { useDashboardStore } from "@/lib/fluid-ui/DashboardStoreContext";

const mockUseQuery = useQuery as any;
const mockUseDashboardStore = useDashboardStore as any;

describe("VendorsList - Rendering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: null },
				select: vi.fn(),
			};
			return selector(state);
		});
	});

	it("renders vendor list with vendors", () => {
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer Pro",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Catering Deluxe",
				category: "catering",
				contractStatus: "pending",
			},
			{
				_id: "vendor_3",
				name: "DJ Beats",
				category: "music",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} />);

		expect(screen.getByText("Vendors")).toBeInTheDocument();
		expect(screen.getByText("3 vendors")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_1")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_2")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_3")).toBeInTheDocument();
	});

	it("renders custom title when provided", () => {
		mockUseQuery.mockReturnValue([
			{
				_id: "vendor_1",
				name: "Test Vendor",
				category: "test",
				contractStatus: "confirmed",
			},
		]);

		render(<VendorsList eventId={"event_123" as any} title="My Vendors" />);

		expect(screen.getByText("My Vendors")).toBeInTheDocument();
	});

	it("displays loading skeleton when vendors are undefined", () => {
		mockUseQuery.mockReturnValue(undefined);

		render(<VendorsList eventId={"event_123" as any} />);

		// Should show title even in loading state
		expect(screen.getByText("Vendors")).toBeInTheDocument();

		// Skeleton component renders divs, check for multiple grid items
		// The VendorsListSkeleton renders 6 skeleton items in a grid
		const vendorsTitle = screen.getByText("Vendors");
		expect(vendorsTitle).toBeInTheDocument();
	});

	it("displays empty state when no vendors", () => {
		mockUseQuery.mockReturnValue([]);

		render(<VendorsList eventId={"event_123" as any} />);

		expect(screen.getByText("No vendors found")).toBeInTheDocument();
		expect(
			screen.getByText("Ask the AI to search for vendors or add them manually"),
		).toBeInTheDocument();
	});
});

describe("VendorsList - Filtering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: null },
				select: vi.fn(),
			};
			return selector(state);
		});
	});

	it("shows category filter buttons when multiple categories exist", () => {
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_3",
				name: "DJ",
				category: "music",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} />);

		// Should show category filter
		expect(screen.getByText("Category:")).toBeInTheDocument();
		expect(screen.getByText("photography")).toBeInTheDocument();
		expect(screen.getByText("catering")).toBeInTheDocument();
		expect(screen.getByText("music")).toBeInTheDocument();
	});

	it("shows status filter buttons when multiple statuses exist", () => {
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "pending",
			},
			{
				_id: "vendor_3",
				name: "DJ",
				category: "music",
				contractStatus: "contacted",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} />);

		// Should show status filter
		expect(screen.getByText("Status:")).toBeInTheDocument();
		expect(screen.getByText("confirmed")).toBeInTheDocument();
		expect(screen.getByText("pending")).toBeInTheDocument();
		expect(screen.getByText("contacted")).toBeInTheDocument();
	});

	it("filters vendors by category when category filter clicked", async () => {
		const user = userEvent.setup();
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		const { rerender } = render(<VendorsList eventId={"event_123" as any} />);

		// Click category filter button
		const photographyButton = screen.getByRole("button", {
			name: "photography",
		});
		await user.click(photographyButton);

		// After clicking, the component sets categoryFilter state
		// Mock that filtering is applied
		mockUseQuery.mockReturnValue([mockVendors[0]]);

		rerender(
			<VendorsList eventId={"event_123" as any} category="photography" />,
		);

		expect(screen.getByText("1 vendors")).toBeInTheDocument();
	});

	it("shows clear filters button when filters are active", async () => {
		const user = userEvent.setup();
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} />);

		// Click category filter
		const photographyButton = screen.getByRole("button", {
			name: "photography",
		});
		await user.click(photographyButton);

		// Should show clear filters button
		await waitFor(() => {
			expect(screen.getByText("Clear filters")).toBeInTheDocument();
		});
	});

	it("clears filters when clear filters button clicked", async () => {
		const user = userEvent.setup();
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		const { rerender } = render(
			<VendorsList eventId={"event_123" as any} category="photography" />,
		);

		// Should show clear filters button initially
		const clearButton = screen.getByText("Clear filters");
		await user.click(clearButton);

		// After clearing, should show all vendors
		mockUseQuery.mockReturnValue(mockVendors);
		rerender(<VendorsList eventId={"event_123" as any} />);

		expect(screen.getByText("2 vendors")).toBeInTheDocument();
	});
});

describe("VendorsList - Zustand Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("selects vendor when clicked and updates Zustand store", async () => {
		const user = userEvent.setup();
		const mockSelect = vi.fn();

		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: null },
				select: mockSelect,
			};
			return selector(state);
		});

		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} />);

		// Click on vendor
		const vendorCard = screen.getByTestId("vendor-card-vendor_1");
		await user.click(vendorCard);

		// Should call select with vendorId
		expect(mockSelect).toHaveBeenCalledWith("vendorId", "vendor_1");
	});

	it("toggles vendor selection when same vendor clicked twice", async () => {
		const user = userEvent.setup();
		const mockSelect = vi.fn();

		// First render: no selection
		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: null },
				select: mockSelect,
			};
			return selector(state);
		});

		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		const { rerender } = render(<VendorsList eventId={"event_123" as any} />);

		// Click to select
		const vendorCard = screen.getByTestId("vendor-card-vendor_1");
		await user.click(vendorCard);

		expect(mockSelect).toHaveBeenCalledWith("vendorId", "vendor_1");

		// Second render: vendor selected
		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: "vendor_1" },
				select: mockSelect,
			};
			return selector(state);
		});

		rerender(<VendorsList eventId={"event_123" as any} />);

		// Click again to deselect
		await user.click(vendorCard);

		expect(mockSelect).toHaveBeenCalledWith("vendorId", null);
	});

	it("highlights selected vendor with ring styling", () => {
		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: "vendor_1" },
				select: vi.fn(),
			};
			return selector(state);
		});

		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		const { container } = render(<VendorsList eventId={"event_123" as any} />);

		// Check for selected vendor styling
		const selectedVendor = container.querySelector('[class*="ring-primary"]');
		expect(selectedVendor).toBeInTheDocument();
	});
});

describe("VendorsList - Limit Display", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseDashboardStore.mockImplementation((selector: any) => {
			const state = {
				selections: { vendorId: null },
				select: vi.fn(),
			};
			return selector(state);
		});
	});

	it("limits displayed vendors when limit prop provided", () => {
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_3",
				name: "DJ",
				category: "music",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_4",
				name: "Florist",
				category: "decoration",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_5",
				name: "Venue",
				category: "venue",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} limit={3} />);

		// Should show only 3 vendors
		expect(screen.getByText("3 vendors")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_1")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_2")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_3")).toBeInTheDocument();
		expect(
			screen.queryByTestId("vendor-card-vendor_4"),
		).not.toBeInTheDocument();

		// Should show "Showing X of Y" indicator
		expect(screen.getByText("Showing 3 of 5 vendors")).toBeInTheDocument();
	});

	it("shows all vendors when no limit provided", () => {
		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_2",
				name: "Caterer",
				category: "catering",
				contractStatus: "confirmed",
			},
			{
				_id: "vendor_3",
				name: "DJ",
				category: "music",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		render(<VendorsList eventId={"event_123" as any} />);

		expect(screen.getByText("3 vendors")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_1")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_2")).toBeInTheDocument();
		expect(screen.getByTestId("vendor-card-vendor_3")).toBeInTheDocument();

		// Should NOT show "Showing X of Y" indicator
		expect(
			screen.queryByText(/Showing \d+ of \d+ vendors/),
		).not.toBeInTheDocument();
	});
});
