import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/verify-success")({
	component: VerifySuccessPage,
});

function VerifySuccessPage() {
	const navigate = useNavigate();

	// Auto-redirect to sign-in after 5 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			navigate({
				to: "/auth/sign-in",
				search: { verified: true, redirect: undefined },
			});
		}, 5000);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-background">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Email Verified!</CardTitle>
					<CardDescription>Your account is now active</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="text-center space-y-4">
						<div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
							<svg
								className="w-8 h-8 text-green-600 dark:text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>Success Checkmark</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div>
							<p className="font-medium">Success!</p>
							<p className="text-sm text-muted-foreground mt-2">
								Your email has been verified. You can now sign in to access your
								account.
							</p>
						</div>
					</div>

					<div className="pt-4 border-t">
						<p className="text-xs text-muted-foreground text-center">
							Redirecting to sign in page in 5 seconds...
						</p>
					</div>
				</CardContent>
				<CardFooter className="flex justify-center">
					<Button
						className="w-full"
						onClick={() =>
							navigate({
								to: "/auth/sign-in",
								search: { verified: true, redirect: undefined },
							})
						}
					>
						Sign In Now
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
