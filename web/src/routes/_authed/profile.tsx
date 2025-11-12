import { api } from "@convex/_generated/api";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileEditDialog } from "@/components/user/profile-edit-dialog";

export const Route = createFileRoute("/_authed/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const profile = useQuery(api.users.getMyProfile);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
			<div className="flex items-center justify-between mb-8">
				<h1 className="text-3xl font-bold">Profile Settings</h1>
				<Button onClick={() => setIsEditDialogOpen(true)}>
					<PencilIcon className="h-4 w-4 mr-2" />
					Edit Profile
				</Button>
			</div>

			<div className="space-y-8">
				{/* Profile Card */}
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-start gap-6">
							{/* Avatar */}
							<div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-gray-200 flex-shrink-0">
								{profile.avatar ? (
									<img
										src={profile.avatar}
										alt="Avatar"
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 text-3xl font-semibold">
										{profile.name?.charAt(0).toUpperCase() || "?"}
									</div>
								)}
							</div>

							{/* Profile Details */}
							<div className="flex-1 space-y-3">
								<div>
									<h2 className="text-2xl font-bold">{profile.name}</h2>
									<p className="text-muted-foreground">@{profile.username}</p>
								</div>

								{profile.bio && (
									<div>
										<p className="text-sm font-medium text-muted-foreground mb-1">
											Bio
										</p>
										<p className="text-sm">{profile.bio}</p>
									</div>
								)}

								{profile.location && (
									<div>
										<p className="text-sm font-medium text-muted-foreground mb-1">
											Location
										</p>
										<p className="text-sm">{profile.location}</p>
									</div>
								)}
							</div>
						</div>
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

				{/* Preferences */}
				<Card>
					<CardHeader>
						<CardTitle>Preferences</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Theme
								</p>
								<p className="text-lg capitalize">
									{profile.preferences?.theme || "Light"}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Timezone
								</p>
								<p className="text-lg">
									{profile.preferences?.timezone || "UTC"}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Notifications
								</p>
								<p className="text-lg">
									{profile.preferences?.notifications ? "Enabled" : "Disabled"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Edit Dialog */}
			<ProfileEditDialog
				profile={profile}
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
			/>
		</div>
	);
}
