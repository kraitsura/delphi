import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error("Missing environment variable: VITE_CONVEX_URL");
}

// Create Convex client with auth expectations
const convexClient = new ConvexReactClient(CONVEX_URL, {
  expectAuth: true, // Pauses queries until auth is ready
});

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
