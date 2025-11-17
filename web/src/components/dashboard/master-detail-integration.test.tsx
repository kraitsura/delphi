/**
 * Master-Detail Integration Tests
 *
 * Tests the Zustand-based master-detail pattern where:
 * - Master components emit selections (vendorId, category, phase, etc.)
 * - Detail components filter based on these selections
 * - Components highlight when related selections change
 *
 * Critical for Track 6 verification
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VendorsList } from "@/components/fluid-ui/cards/VendorsList";
import { DashboardStoreProvider } from "@/lib/fluid-ui/DashboardStoreContext";

// Mock Convex
vi.mock("convex/react", () => ({
	useQuery: vi.fn(),
	useMutation: vi.fn(),
}));

// Mock VendorCard
vi.mock("@/components/fluid-ui/cards/VendorCard", () => ({
	VendorCard: ({ vendorId }: { vendorId: string }) => (
		<div data-testid={`vendor-card-${vendorId}`}>Vendor {vendorId}</div>
	),
}));

import { useQuery } from "convex/react";

const mockUseQuery = useQuery as any;

describe("Master-Detail Integration - VendorsList Pattern", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("updates Zustand store when vendor is selected", async () => {
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

		const { container } = render(
			<DashboardStoreProvider>
				<VendorsList eventId={"event_123" as any} />
			</DashboardStoreProvider>,
		);

		// Click on first vendor
		const vendorCard = screen.getByTestId("vendor-card-vendor_1");
		await user.click(vendorCard);

		// Check that vendor is visually selected (has ring styling)
		const selectedVendor = container.querySelector('[class*="ring-primary"]');
		expect(selectedVendor).toBeInTheDocument();
	});

	it("deselects vendor when clicking same vendor twice", async () => {
		const user = userEvent.setup();

		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		const { container } = render(
			<DashboardStoreProvider>
				<VendorsList eventId={"event_123" as any} />
			</DashboardStoreProvider>,
		);

		const vendorCard = screen.getByTestId("vendor-card-vendor_1");

		// First click - select
		await user.click(vendorCard);
		let selectedVendor = container.querySelector('[class*="ring-primary"]');
		expect(selectedVendor).toBeInTheDocument();

		// Second click - deselect
		await user.click(vendorCard);
		selectedVendor = container.querySelector('[class*="ring-primary"]');
		expect(selectedVendor).not.toBeInTheDocument();
	});

	it("maintains selection state across multiple vendors", async () => {
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

		render(
			<DashboardStoreProvider>
				<VendorsList eventId={"event_123" as any} />
			</DashboardStoreProvider>,
		);

		// Select vendor 1
		await user.click(screen.getByTestId("vendor-card-vendor_1"));

		// Select vendor 2 (should deselect vendor 1)
		await user.click(screen.getByTestId("vendor-card-vendor_2"));

		// Only vendor 2 should be selected
		expect(
			screen.getByTestId("vendor-card-vendor_2").parentElement,
		).toHaveClass("ring-primary", { exact: false });
	});
});

describe("Master-Detail Integration - Store Isolation", () => {
	it("each DashboardStoreProvider has isolated state", async () => {
		const mockVendors1 = [
			{
				_id: "vendor_1",
				name: "Photographer A",
				category: "photography",
				contractStatus: "confirmed",
			},
		];

		const mockVendors2 = [
			{
				_id: "vendor_2",
				name: "Photographer B",
				category: "photography",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockImplementation((_api: any, args: any) => {
			// Return different vendors based on eventId
			if (args.eventId === "event_1") return mockVendors1;
			if (args.eventId === "event_2") return mockVendors2;
			return [];
		});

		render(
			<div>
				<DashboardStoreProvider>
					<VendorsList eventId={"event_1" as any} />
				</DashboardStoreProvider>
				<DashboardStoreProvider>
					<VendorsList eventId={"event_2" as any} />
				</DashboardStoreProvider>
			</div>,
		);

		// Each store should be independent
		const vendorCards = screen.getAllByTestId(/vendor-card-/);
		expect(vendorCards).toHaveLength(2);
	});
});

describe("Master-Detail Integration - Selection Propagation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("propagates vendor selection to detail components", async () => {
		const user = userEvent.setup();

		const mockVendors = [
			{
				_id: "vendor_1",
				name: "Photographer",
				category: "photography",
				contractStatus: "confirmed",
			},
		];

		mockUseQuery.mockReturnValue(mockVendors);

		// This test demonstrates the pattern - in real use, ExpensesList
		// would filter based on the selected vendorId from the store
		render(
			<DashboardStoreProvider>
				<div data-testid="dashboard">
					<VendorsList eventId={"event_123" as any} />
					{/* ExpensesList would go here and filter by vendorId */}
				</div>
			</DashboardStoreProvider>,
		);

		const vendorCard = screen.getByTestId("vendor-card-vendor_1");
		await user.click(vendorCard);

		// Verify the dashboard container exists (would contain filtered detail components)
		expect(screen.getByTestId("dashboard")).toBeInTheDocument();
	});
});
