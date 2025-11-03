import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { useSession } from "@/lib/auth";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

export const Route = createFileRoute("/_authed/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: session } = useSession();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const userProfile = useQuery(api.users.getMyProfile);
  const createOrUpdateProfile = useMutation(api.users.createOrUpdateProfile);

  // Ensure extended profile exists for authenticated users
  useEffect(() => {
    // Only run if user is authenticated but profile doesn't exist yet
    if (currentUser && userProfile === null) {
      createOrUpdateProfile({}).catch((error) => {
        console.error("Failed to create user profile:", error);
      });
    }
  }, [currentUser, userProfile, createOrUpdateProfile]);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
            <CardDescription>From Better Auth session</CardDescription>
          </CardHeader>
          <CardContent>
            {session ? (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="text-lg">{session.user.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-lg">{session.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    User ID
                  </p>
                  <p className="text-sm font-mono">{session.user.id}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Loading session...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Better Auth User Data</CardTitle>
            <CardDescription>From Better Auth component</CardDescription>
          </CardHeader>
          <CardContent>
            {currentUser === undefined ? (
              <p className="text-muted-foreground">Loading user data...</p>
            ) : currentUser === null ? (
              <p className="text-muted-foreground">No user data found</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Database ID
                  </p>
                  <p className="text-sm font-mono">{currentUser._id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-lg">{currentUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email Verified
                  </p>
                  <p className="text-lg">
                    {currentUser.emailVerified ? "Yes" : "No"}
                  </p>
                </div>
                {currentUser.image && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Profile Image
                    </p>
                    <img
                      src={currentUser.image}
                      alt="Profile"
                      className="w-16 h-16 rounded-full"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extended User Profile</CardTitle>
            <CardDescription>From your app's users table</CardDescription>
          </CardHeader>
          <CardContent>
            {userProfile === undefined ? (
              <p className="text-muted-foreground">Loading profile...</p>
            ) : userProfile === null ? (
              <p className="text-muted-foreground">Creating profile...</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Profile ID
                  </p>
                  <p className="text-sm font-mono">{userProfile._id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Role
                  </p>
                  <p className="text-lg capitalize">{userProfile.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Theme
                  </p>
                  <p className="text-lg capitalize">
                    {userProfile.preferences?.theme || "light"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Last Active
                  </p>
                  <p className="text-lg">
                    {userProfile.lastActiveAt
                      ? new Date(userProfile.lastActiveAt).toLocaleString()
                      : "Never"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Phase 1.2 Complete! 🎉</CardTitle>
            <CardDescription>
              User profile management is now fully implemented
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">✅ What's Working:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Email/Password + Google OAuth authentication</li>
                  <li>Automatic profile creation on signup</li>
                  <li>Extended user profiles (role, preferences, activity tracking)</li>
                  <li>Profile management UI (name, bio, location, theme, timezone)</li>
                  <li>User search with debouncing (for @mentions and invitations)</li>
                  <li>Activity tracking (updates every 5 minutes)</li>
                  <li>Account deactivation/reactivation</li>
                  <li>Protected routes with automatic redirects</li>
                  <li>Real-time updates via Convex</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🚀 Try It Out:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Click "Profile Settings" in the user menu to edit your profile</li>
                  <li>Update your name, bio, location, theme preference</li>
                  <li>Watch your lastActiveAt timestamp update automatically</li>
                  <li>Search for users (useful for future @mentions feature)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">📋 Next Phase:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Phase 1.3: Events CRUD - Create and manage events</li>
                  <li>Phase 1.4: Rooms CRUD - Create chat rooms for events</li>
                  <li>Phase 1.5: Messages - Real-time messaging in rooms</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
