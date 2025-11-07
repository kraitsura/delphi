import {
	type ErrorComponentProps,
	Link,
	useRouter,
} from "@tanstack/react-router";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function ErrorBoundary({ error, reset }: ErrorComponentProps) {
	const _router = useRouter();
	const isDev = import.meta.env.DEV;

	const handleReset = () => {
		reset();
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md border-destructive">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
						<AlertCircle className="h-10 w-10 text-destructive" />
					</div>
					<CardTitle className="text-3xl font-bold">
						Oops! Something went wrong
					</CardTitle>
					<CardDescription className="text-base">
						{isDev
							? "An error occurred while rendering this page."
							: "We're sorry for the inconvenience. Please try again."}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isDev && error && (
						<div className="rounded-md bg-muted p-3 text-sm">
							<p className="font-mono text-destructive break-words">
								{error.message}
							</p>
							{error.stack && (
								<pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
									{error.stack}
								</pre>
							)}
						</div>
					)}
					<div className="flex flex-col gap-3">
						<Button onClick={handleReset} className="w-full">
							<RefreshCw className="mr-2 h-4 w-4" />
							Try Again
						</Button>
						<Button asChild variant="outline" className="w-full">
							<Link to="/dashboard">
								<Home className="mr-2 h-4 w-4" />
								Go to Dashboard
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
