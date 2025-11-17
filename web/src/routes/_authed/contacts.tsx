import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ContactsList } from "@/components/contacts/ContactsList";
import { TeamContactCard } from "@/components/contacts/TeamContactCard";
import { VendorContactCard } from "@/components/contacts/VendorContactCard";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageHeader } from "@/hooks/usePageHeader";
import { convexQuery } from "@/lib/convex-query";

export const Route = createFileRoute("/_authed/contacts")({
	loader: async ({ context }) => {
		// Prefetch both team and vendor contacts in parallel
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.contacts.listMyTeamContacts, {}),
			),
			context.queryClient.ensureQueryData(
				convexQuery(api.contacts.listMyVendorContacts, {}),
			),
		]);
	},
	component: ContactsPage,
});

function ContactsPage() {
	usePageHeader({
		title: "Contacts",
	});

	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"team" | "vendors">("team");
	const debouncedSearch = useDebounce(searchQuery, 300);

	// Fetch data (prefetched in loader)
	const { data: teamContacts } = useSuspenseQuery(
		convexQuery(api.contacts.listMyTeamContacts, {}),
	);
	const { data: vendorContacts } = useSuspenseQuery(
		convexQuery(api.contacts.listMyVendorContacts, {}),
	);

	// Filter contacts based on search
	const filteredTeamContacts = useMemo(() => {
		if (!debouncedSearch) return teamContacts;

		const query = debouncedSearch.toLowerCase();
		return teamContacts.filter(
			(contact) =>
				contact.name.toLowerCase().includes(query) ||
				contact.email.toLowerCase().includes(query) ||
				contact.events.some((event: { eventName: string }) =>
					event.eventName.toLowerCase().includes(query),
				),
		);
	}, [teamContacts, debouncedSearch]);

	const filteredVendorContacts = useMemo(() => {
		if (!debouncedSearch) return vendorContacts;

		const query = debouncedSearch.toLowerCase();
		return vendorContacts.filter(
			(vendor) =>
				vendor.name.toLowerCase().includes(query) ||
				vendor.category.toLowerCase().includes(query) ||
				vendor.eventName.toLowerCase().includes(query) ||
				vendor.email?.toLowerCase().includes(query) ||
				vendor.description?.toLowerCase().includes(query),
		);
	}, [vendorContacts, debouncedSearch]);

	return (
		<div className="container mx-auto px-4 py-6 max-w-7xl">
			<div className="mb-8">
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as "team" | "vendors")}
					className="w-full"
				>
					{/* Tabs Header with Search */}
					<div className="flex flex-col sm:flex-row gap-4 mb-6">
						<TabsList className="border-2 border-black dark:border-white p-1 bg-white dark:bg-black w-full sm:w-auto">
							<TabsTrigger
								value="team"
								className="uppercase font-bold tracking-tight text-sm data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
							>
								Team
								{teamContacts && (
									<span className="ml-2 opacity-60">
										({teamContacts.length})
									</span>
								)}
							</TabsTrigger>
							<TabsTrigger
								value="vendors"
								className="uppercase font-bold tracking-tight text-sm data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
							>
								Vendors
								{vendorContacts && (
									<span className="ml-2 opacity-60">
										({vendorContacts.length})
									</span>
								)}
							</TabsTrigger>
						</TabsList>

						{/* Search Bar */}
						<div className="relative flex-1 max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								type="search"
								placeholder={`Search ${activeTab === "team" ? "team members" : "vendors"}...`}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 border-2 border-black dark:border-white font-mono text-sm"
							/>
						</div>
					</div>

					{/* Team Contacts Tab */}
					<TabsContent value="team" className="mt-0">
						<ContactsList
							isLoading={false}
							isEmpty={filteredTeamContacts.length === 0}
							emptyMessage={
								debouncedSearch
									? "No team members found"
									: "No team contacts yet"
							}
							emptyIcon="team"
						>
							{filteredTeamContacts.map((contact) => (
								<TeamContactCard
									key={contact.userId}
									userId={contact.userId}
									name={contact.name}
									email={contact.email}
									avatar={contact.avatar}
									bio={contact.bio}
									location={contact.location}
									role={contact.role}
									events={contact.events}
									onClick={() => {
										// TODO: Navigate to profile/detail view
										console.log("View profile:", contact.userId);
									}}
								/>
							))}
						</ContactsList>
					</TabsContent>

					{/* Vendor Contacts Tab */}
					<TabsContent value="vendors" className="mt-0">
						<ContactsList
							isLoading={false}
							isEmpty={filteredVendorContacts.length === 0}
							emptyMessage={
								debouncedSearch ? "No vendors found" : "No vendor contacts yet"
							}
							emptyIcon="vendor"
						>
							{filteredVendorContacts.map((vendor) => (
								<VendorContactCard
									key={vendor.vendorId}
									vendorId={vendor.vendorId}
									name={vendor.name}
									category={vendor.category}
									description={vendor.description}
									email={vendor.email}
									phone={vendor.phone}
									website={vendor.website}
									city={vendor.city}
									state={vendor.state}
									country={vendor.country}
									rating={vendor.rating}
									status={vendor.status}
									eventId={vendor.eventId}
									eventName={vendor.eventName}
									onClick={() => {
										// TODO: Navigate to vendor detail view
										console.log("View vendor:", vendor.vendorId);
									}}
								/>
							))}
						</ContactsList>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
