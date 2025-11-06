import { api } from "@convex/_generated/api";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Calendar, Home, LogOut } from "lucide-react";
import { AppSidebarProfileSkeleton } from "@/components/AppSidebarProfileSkeleton";
import { EventSidebarToolbar } from "@/components/EventSidebarToolbar";
import { EventSidebarToolbarSkeleton } from "@/components/events/EventSidebarToolbarSkeleton";
import { RoomListSkeleton } from "@/components/events/RoomListSkeleton";
import { RoomList } from "@/components/RoomList";
import { ThemeSetToggle } from "@/components/theme-set-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useEvent } from "@/contexts/EventContext";
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
		showBadge: true, // Show invitation count badge on Events
	},
];

export function AppSidebar() {
	const { data: session } = useSession();
	const params = useParams({ strict: false });
	const { event } = useEvent();

	// Detect event context from URL immediately (no async wait)
	const isOnEventRoute = "eventId" in params && params.eventId !== null;

	// Get pending invitations count for badge
	const pendingInvitations = useQuery(api.eventInvitations.listByEmail);
	const pendingCount =
		pendingInvitations?.filter((inv) => !inv.isExpired).length || 0;

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

	// Event mode: WhatsApp-like chat interface
	if (isOnEventRoute) {
		return (
			<Sidebar variant="inset" collapsible="icon">
				<SidebarHeader className="p-0">
					{/* Logo */}
					<Link
						to="/"
						className="flex items-center gap-3 px-2 py-2 h-12 overflow-hidden group-data-[collapsible=icon]:gap-0"
					>
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<span className="text-lg font-bold">D</span>
						</div>
						<div className="flex flex-col group-data-[collapsible=icon]:hidden">
							<span className="text-lg font-semibold">Delphi</span>
						</div>
					</Link>
					<SidebarSeparator className="mx-auto group-data-[collapsible=icon]:w-8 -mt-px" />

					{/* Horizontal toolbar with icons */}
					<div>
						{event ? <EventSidebarToolbar /> : <EventSidebarToolbarSkeleton />}
					</div>
				</SidebarHeader>

				{/* Room list */}
				<SidebarContent>
					{event ? <RoomList /> : <RoomListSkeleton />}
				</SidebarContent>

				<SidebarFooter
					className="pt-2 min-h-16"
					style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
				>
					<div className="h-full" />
				</SidebarFooter>
			</Sidebar>
		);
	}

	// Normal mode: Regular navigation
	return (
		<Sidebar variant="inset" collapsible="icon">
			<SidebarHeader className="p-0">
				<Link
					to="/"
					className="flex items-center gap-3 px-2 py-2 h-12 overflow-hidden group-data-[collapsible=icon]:gap-0"
				>
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<span className="text-lg font-bold">D</span>
					</div>
					<div className="flex flex-col group-data-[collapsible=icon]:hidden">
						<span className="text-lg font-semibold">Delphi</span>
					</div>
				</Link>
				<SidebarSeparator className="mx-auto group-data-[collapsible=icon]:w-8 -mt-px" />
				{session?.user ? (
					<Link
						to="/profile"
						className="flex items-center gap-3 px-2 py-2 h-12 overflow-hidden group-data-[collapsible=icon]:gap-0 hover:bg-sidebar-accent rounded-md transition-colors cursor-pointer"
					>
						<Avatar className="h-8 w-8 shrink-0">
							<AvatarFallback>{getUserInitials()}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
							<span className="text-sm font-medium truncate">
								{session.user.name}
							</span>
							<span className="text-xs text-muted-foreground truncate">
								{session.user.email}
							</span>
						</div>
					</Link>
				) : (
					<AppSidebarProfileSkeleton />
				)}
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{navigationItems.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild tooltip={item.title}>
										<Link
											to={item.href}
											activeOptions={{ exact: item.href === "/dashboard" }}
											className="flex items-center justify-between w-full"
										>
											<div className="flex items-center gap-2">
												<item.icon className="h-4 w-4" />
												<span>{item.title}</span>
											</div>
											{item.showBadge && pendingCount > 0 && (
												<Badge
													variant="default"
													className="ml-auto group-data-[collapsible=icon]:hidden h-5 min-w-[20px] px-1.5 flex items-center justify-center text-xs"
												>
													{pendingCount}
												</Badge>
											)}
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
						<ThemeSetToggle />
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
							<LogOut className="h-4 w-4" />
							<span>Sign Out</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
