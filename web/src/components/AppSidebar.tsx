import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Home, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth";

const navigationItems = [
	{
		title: "Dashboard",
		href: "/dashboard",
		icon: Home,
	},
	{
		title: "Events",
		href: "/events",
		icon: Calendar,
	},
	{
		title: "Profile",
		href: "/profile",
		icon: User,
	},
];

export function AppSidebar() {
	const { data: session } = useSession();

	const handleSignOut = async () => {
		await signOut();
	};

	// Get user initials for avatar
	const getUserInitials = () => {
		if (!session?.user?.name) return "U";
		const names = session.user.name.split(" ");
		if (names.length >= 2) {
			return `${names[0][0]}${names[1][0]}`.toUpperCase();
		}
		return session.user.name.slice(0, 2).toUpperCase();
	};

	return (
		<Sidebar>
			<SidebarHeader>
				<Link
					to="/"
					className="flex items-center gap-3 px-3 py-2 hover:bg-accent rounded-md transition-colors"
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<span className="text-lg font-bold">D</span>
					</div>
					<div className="flex flex-col">
						<span className="text-lg font-semibold">Delphi</span>
						<span className="text-xs text-muted-foreground">
							Event Planning
						</span>
					</div>
				</Link>
				<SidebarSeparator />
				{session?.user && (
					<div className="flex items-center gap-3 px-3 py-2">
						<Avatar className="h-8 w-8">
							<AvatarFallback>{getUserInitials()}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col flex-1 min-w-0">
							<span className="text-sm font-medium truncate">
								{session.user.name}
							</span>
							<span className="text-xs text-muted-foreground truncate">
								{session.user.email}
							</span>
						</div>
					</div>
				)}
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navigationItems.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild>
										<Link
											to={item.href}
											activeOptions={{ exact: item.href === "/dashboard" }}
										>
											<item.icon className="h-4 w-4" />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton onClick={handleSignOut}>
							<LogOut className="h-4 w-4" />
							<span>Sign Out</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
