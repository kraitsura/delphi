import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "@/components/user/profile-form";

export const Route = createFileRoute("/_authed/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const profile = useQuery(api.users.getMyProfile);

	if (profile === undefined) {
		return (
			<div className="container mx-auto p-6 max-w-2xl">
				<Skeleton className="h-10 w-64 mb-8" />
				<div className="space-y-8">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-96 w-full" />
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="container mx-auto p-6 max-w-2xl">
				<h1 className="text-3xl font-bold mb-4">Profile Settings</h1>
				<Card>
					<CardContent className="pt-6">
						<p className="text-muted-foreground">
							No profile found. Please try signing out and signing back in.
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-2xl">
			<h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

			<div className="space-y-8">
				{/* Avatar Section - Placeholder for future implementation */}
				<Card>
					<CardHeader>
						<CardTitle>Profile Picture</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4">
							<div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200">
								{profile.avatar ? (
									<img
										src={profile.avatar}
										alt="Avatar"
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 text-2xl font-semibold">
										{profile.name?.charAt(0).toUpperCase() || "?"}
									</div>
								)}
							</div>
							<div className="text-sm text-muted-foreground">
								Avatar upload coming soon
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Profile Information Form */}
				<Card>
					<CardHeader>
						<CardTitle>Profile Information</CardTitle>
					</CardHeader>
					<CardContent>
						<ProfileForm profile={profile} />
					</CardContent>
				</Card>

				{/* Account Information (Read-only) */}
				<Card>
					<CardHeader>
						<CardTitle>Account Information</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Email
								</p>
								<p className="text-lg">{profile.email}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Role
								</p>
								<p className="text-lg capitalize">{profile.role}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Member since
								</p>
								<p className="text-lg">
									{new Date(profile.createdAt || 0).toLocaleDateString()}
								</p>
							</div>
							{profile.lastActiveAt && (
								<div>
									<p className="text-sm font-medium text-muted-foreground">
										Last active
									</p>
									<p className="text-lg">
										{new Date(profile.lastActiveAt).toLocaleString()}
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
