import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, useSession } from "@/lib/auth";

export function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = useSession();

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/" });
	};

	if (isPending) {
		return (
			<Button variant="ghost" size="icon" disabled>
				<User className="h-5 w-5" />
			</Button>
		);
	}

	if (!session) {
		return (
			<div className="flex gap-2">
				<Button
					variant="ghost"
					onClick={() => navigate({ to: "/auth/sign-in" })}
				>
					Sign In
				</Button>
				<Button onClick={() => navigate({ to: "/auth/sign-up" })}>
					Sign Up
				</Button>
			</div>
		);
	}

	// Get first letter of name or email for avatar
	const initial = session.user.name?.[0] || session.user.email?.[0] || "U";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="rounded-full">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
						{initial.toUpperCase()}
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">
							{session.user.name || "User"}
						</p>
						<p className="text-xs leading-none text-muted-foreground">
							{session.user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
					<LayoutDashboard className="mr-2 h-4 w-4" />
					Dashboard
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
					<Settings className="mr-2 h-4 w-4" />
					Profile Settings
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleSignOut}>
					<LogOut className="mr-2 h-4 w-4" />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
