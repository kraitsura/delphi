import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	// Do NOT set baseURL - auth requests go through /api/auth/* proxy
	plugins: [convexClient()],
});

// Export hooks for convenience
export const { useSession, signIn, signUp, signOut } = authClient;
