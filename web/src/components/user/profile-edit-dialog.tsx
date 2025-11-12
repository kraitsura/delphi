import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileEditDialogProps {
	profile: Doc<"users">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ProfileEditDialog({
	profile,
	open,
	onOpenChange,
}: ProfileEditDialogProps) {
	const updateProfile = useMutation(api.users.updateMyProfile);

	const [name, setName] = useState(profile.name || "");
	const [username, setUsername] = useState(profile.username || "");
	const [bio, setBio] = useState(profile.bio || "");
	const [location, setLocation] = useState(profile.location || "");
	const [theme, setTheme] = useState<"light" | "dark">(
		profile.preferences?.theme || "light",
	);
	const [notifications, setNotifications] = useState(
		profile.preferences?.notifications ?? true,
	);
	const [timezone, setTimezone] = useState(
		profile.preferences?.timezone || "UTC",
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await updateProfile({
				name,
				username,
				bio,
				location,
				preferences: {
					theme,
					notifications,
					timezone,
				},
			});
			toast.success("Profile updated successfully!");
			onOpenChange(false);
		} catch (error) {
			toast.error(
				`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`,
			);
			console.error("Profile update error:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const commonTimezones = [
		{ value: "UTC", label: "UTC" },
		{ value: "America/New_York", label: "Eastern Time" },
		{ value: "America/Chicago", label: "Central Time" },
		{ value: "America/Denver", label: "Mountain Time" },
		{ value: "America/Los_Angeles", label: "Pacific Time" },
		{ value: "Europe/London", label: "London" },
		{ value: "Europe/Paris", label: "Paris" },
		{ value: "Asia/Tokyo", label: "Tokyo" },
		{ value: "Asia/Shanghai", label: "Shanghai" },
		{ value: "Australia/Sydney", label: "Sydney" },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
					<DialogDescription>
						Update your profile information and preferences
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic Information Section */}
					<div className="space-y-4">
						<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
							Basic Information
						</h3>

						{/* Name */}
						<div className="space-y-2">
							<Label htmlFor="edit-name">Name</Label>
							<Input
								id="edit-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Your name"
								required
							/>
						</div>

						{/* Username */}
						<div className="space-y-2">
							<Label htmlFor="edit-username">Username</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									@
								</span>
								<Input
									id="edit-username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="username"
									className="pl-7"
									required
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Only lowercase letters and numbers. No spaces or special
								characters.
							</p>
						</div>

						{/* Bio */}
						<div className="space-y-2">
							<Label htmlFor="edit-bio">Bio</Label>
							<textarea
								id="edit-bio"
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								placeholder="Tell us about yourself"
								className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
								maxLength={500}
							/>
							<p className="text-xs text-muted-foreground">
								{bio.length}/500 characters
							</p>
						</div>

						{/* Location */}
						<div className="space-y-2">
							<Label htmlFor="edit-location">Location</Label>
							<Input
								id="edit-location"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								placeholder="City, Country"
							/>
						</div>
					</div>

					{/* Preferences Section */}
					<div className="space-y-4 pt-4 border-t">
						<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
							Preferences
						</h3>

						{/* Theme */}
						<div className="space-y-2">
							<Label htmlFor="edit-theme">Theme Preference</Label>
							<select
								id="edit-theme"
								value={theme}
								onChange={(e) => setTheme(e.target.value as "light" | "dark")}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
							</select>
						</div>

						{/* Timezone */}
						<div className="space-y-2">
							<Label htmlFor="edit-timezone">Timezone</Label>
							<select
								id="edit-timezone"
								value={timezone}
								onChange={(e) => setTimezone(e.target.value)}
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							>
								{commonTimezones.map((tz) => (
									<option key={tz.value} value={tz.value}>
										{tz.label}
									</option>
								))}
							</select>
						</div>

						{/* Notifications */}
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="edit-notifications"
								checked={notifications}
								onChange={(e) => setNotifications(e.target.checked)}
								className="h-4 w-4 rounded border-gray-300"
							/>
							<Label htmlFor="edit-notifications" className="cursor-pointer">
								Enable notifications
							</Label>
						</div>
					</div>

					{/* Dialog Footer */}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
