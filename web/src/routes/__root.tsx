import {
	fetchSession,
	getCookieName,
} from "@convex-dev/better-auth/react-start";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import { scan } from "react-scan";
import { Toaster } from "sonner";
import { ErrorBoundary } from "../components/errors/error-boundary";
import { NotFound } from "../components/errors/not-found";
import { ThemeSetProvider } from "../components/theme-set-provider";
import { TooltipProvider } from "../components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

// Initialize React Scan only in development
if (typeof window !== "undefined" && import.meta.env.DEV) {
	scan({
		enabled: true,
		log: false,
	});
}

interface MyRouterContext {
	queryClient: QueryClient;
	userId?: string;
	token?: string;
	user?: {
		id: string;
		email: string;
		emailVerified: boolean;
		name?: string;
		image?: string;
	};
}

// Server function to fetch auth session
const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { createAuth } = await import("../../convex/auth");
	const { session } = await fetchSession(getRequest());
	const sessionCookieName = getCookieName(createAuth);
	const token = getCookie(sessionCookieName);
	return {
		userId: session?.user.id,
		token,
		user: session?.user ? {
			id: session.user.id,
			email: session.user.email,
			emailVerified: session.user.emailVerified,
			name: session.user.name,
			image: session.user.image,
		} : undefined,
	};
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Delphi",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	// SSR authentication
	beforeLoad: async () => {
		const { userId, token, user } = await fetchAuth();
		return { userId, token, user };
	},

	component: RootComponent,
	notFoundComponent: NotFound,
	errorComponent: ErrorBoundary,
});

function RootComponent() {
	return (
		<html lang="en" suppressHydrationWarning className="h-full">
			<head>
				<HeadContent />
			</head>
			<body className="h-full overflow-hidden">
				<div className="h-full flex flex-col">
					<ThemeSetProvider>
						<TooltipProvider>
							<Outlet />
							<Toaster position="top-right" />
							<TanStackDevtools
								config={{
									position: "bottom-right",
								}}
								plugins={[
									{
										name: "Tanstack Router",
										render: <TanStackRouterDevtoolsPanel />,
									},
									TanStackQueryDevtools,
								]}
							/>
						</TooltipProvider>
					</ThemeSetProvider>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
