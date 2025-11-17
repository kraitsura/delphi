import { Package, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ContactsListProps {
	isLoading?: boolean;
	isEmpty?: boolean;
	emptyMessage?: string;
	emptyIcon?: "team" | "vendor";
	children: React.ReactNode;
}

export function ContactsList({
	isLoading = false,
	isEmpty = false,
	emptyMessage = "No contacts found",
	emptyIcon = "team",
	children,
}: ContactsListProps) {
	// Loading skeleton
	if (isLoading) {
		return (
			<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
				{[1, 2, 3, 4, 5, 6].map((i) => (
					<Card
						key={i}
						className="border-2 border-black dark:border-white animate-pulse"
					>
						<CardContent className="p-0">
							<div className="border-b-2 border-black dark:border-white p-4">
								<div className="flex items-start gap-3">
									<div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0" />
									<div className="flex-1 space-y-2">
										<div className="h-4 bg-gray-300 dark:bg-gray-700 w-3/4" />
										<div className="h-3 bg-gray-300 dark:bg-gray-700 w-1/2" />
									</div>
								</div>
							</div>
							<div className="p-4 space-y-3">
								<div className="h-3 bg-gray-300 dark:bg-gray-700 w-full" />
								<div className="h-3 bg-gray-300 dark:bg-gray-700 w-full" />
								<div className="h-3 bg-gray-300 dark:bg-gray-700 w-2/3" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	// Empty state
	if (isEmpty) {
		const Icon = emptyIcon === "team" ? Users : Package;

		return (
			<div className="flex flex-col items-center justify-center py-24 px-4">
				<div className="border-2 border-black dark:border-white p-6 rounded-lg bg-gray-50 dark:bg-gray-900/50">
					<Icon className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
					<p className="text-sm text-gray-500 dark:text-gray-400 text-center font-medium">
						{emptyMessage}
					</p>
					<p className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center max-w-sm">
						{emptyIcon === "team"
							? "Contacts will appear here when you collaborate with others on events"
							: "Vendors will appear here when you add them to your events"}
					</p>
				</div>
			</div>
		);
	}

	// Grid layout for contacts
	return (
		<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>
	);
}
