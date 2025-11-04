import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserSearchProps {
	onSelectUser?: (user: {
		_id: string;
		name: string;
		email: string;
		avatar?: string;
		role: Doc<"users">["role"];
	}) => void;
	placeholder?: string;
	limit?: number;
}

export function UserSearch({
	onSelectUser,
	placeholder = "Search users by name or email...",
	limit = 10,
}: UserSearchProps) {
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300); // 300ms debounce delay

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Only search if debounced term has at least 2 characters
	const results = useQuery(
		api.users.searchByName,
		debouncedSearchTerm.length >= 2
			? { searchTerm: debouncedSearchTerm, limit }
			: "skip",
	);

	const handleSelectUser = (
		user: typeof results extends any[] ? (typeof results)[0] : never,
	) => {
		if (onSelectUser && user) {
			onSelectUser(user);
			setSearchTerm(""); // Clear search after selection
		}
	};

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<Label htmlFor="user-search">Search Users</Label>
				<Input
					id="user-search"
					type="text"
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder={placeholder}
				/>
			</div>

			{/* Search Results */}
			{searchTerm.length >= 2 && (
				<div className="border rounded-md divide-y max-h-64 overflow-y-auto">
					{results === undefined ? (
						<div className="p-3 text-sm text-muted-foreground">
							Searching...
						</div>
					) : results.length === 0 ? (
						<div className="p-3 text-sm text-muted-foreground">
							No users found
						</div>
					) : (
						results.map((user) => (
							<button
								key={user._id}
								type="button"
								onClick={() => handleSelectUser(user)}
								className="w-full p-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
							>
								{/* Avatar */}
								<div className="relative h-10 w-10 overflow-hidden rounded-full border flex-shrink-0">
									{user.avatar ? (
										<img
											src={user.avatar}
											alt={user.name}
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-600 font-semibold">
											{user.name?.charAt(0).toUpperCase() || "?"}
										</div>
									)}
								</div>

								{/* User Info */}
								<div className="flex-1 min-w-0">
									<div className="font-medium truncate">{user.name}</div>
									<div className="text-sm text-muted-foreground truncate">
										{user.email}
									</div>
								</div>

								{/* Role Badge */}
								<div className="flex-shrink-0">
									<span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 capitalize">
										{user.role}
									</span>
								</div>
							</button>
						))
					)}
				</div>
			)}

			{/* Hint */}
			{searchTerm.length > 0 && searchTerm.length < 2 && (
				<p className="text-sm text-muted-foreground">
					Type at least 2 characters to search
				</p>
			)}
		</div>
	);
}
