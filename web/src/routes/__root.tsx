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
import { Toaster } from "sonner";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";
import { NotFound } from "../components/errors/not-found";
import { ErrorBoundary } from "../components/errors/error-boundary";
import { ThemeSetProvider } from "../components/theme-set-provider";
import { TooltipProvider } from "../components/ui/tooltip";

interface MyRouterContext {
	queryClient: QueryClient;
	userId?: string;
	token?: string;
}

// Server function to fetch auth session
const fetchAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { createAuth } = await import("../../convex/auth");
	const { session } = await fetchSession(getRequest());
	const sessionCookieName = getCookieName(createAuth);
	const token = getCookie(sessionCookieName);
	return { userId: session?.user.id, token };
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
		const { userId, token } = await fetchAuth();
		return { userId, token };
	},

	component: RootComponent,
	notFoundComponent: NotFound,
	errorComponent: ErrorBoundary,
});

function RootComponent() {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
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
				<Scripts />
			</body>
		</html>
	);
}
