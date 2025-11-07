import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
						<FileQuestion className="h-10 w-10 text-muted-foreground" />
					</div>
					<CardTitle className="text-3xl font-bold">
						404 - Page Not Found
					</CardTitle>
					<CardDescription className="text-base">
						The page you're looking for doesn't exist or has been moved.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Button asChild className="w-full">
						<Link to="/dashboard">
							<Home className="mr-2 h-4 w-4" />
							Go to Dashboard
						</Link>
					</Button>
					<Button asChild variant="outline" className="w-full">
						<button type="button" onClick={() => window.history.back()}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Go Back
						</button>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
