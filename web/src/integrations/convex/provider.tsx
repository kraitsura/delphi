import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
	throw new Error("Missing environment variable: VITE_CONVEX_URL");
}

// Create Convex client with expectAuth to pause queries until authenticated
// This prevents race conditions where Better Auth session loads before Convex validates the token
const convexClient = new ConvexReactClient(CONVEX_URL, {
	expectAuth: true,
});

// Export client for use in TanStack Query integration
export { convexClient };

export default function AppConvexProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ConvexBetterAuthProvider client={convexClient} authClient={authClient}>
			{children}
		</ConvexBetterAuthProvider>
	);
}
