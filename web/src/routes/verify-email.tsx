import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient, useSession } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
	beforeLoad: async ({ context }) => {
		// If not logged in, redirect to sign-in
		if (!context.userId) {
			throw redirect({
				to: "/auth/sign-in",
			});
		}

		// If email is already verified, redirect to dashboard
		if (context.user?.emailVerified) {
			throw redirect({
				to: "/dashboard",
			});
		}
	},
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const { data: session } = useSession();
	const [resending, setResending] = useState(false);
	const [resendSuccess, setResendSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleResendEmail = async () => {
		setResending(true);
		setError(null);
		setResendSuccess(false);

		try {
			// Call Better Auth's resend verification email endpoint
			await fetch("/api/auth/send-verification-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: session?.user?.email,
				}),
			});
			setResendSuccess(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to resend email");
		} finally {
			setResending(false);
		}
	};

	const handleSignOut = async () => {
		await authClient.signOut();
		window.location.href = "/auth/sign-in";
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-background">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Verify Your Email</CardTitle>
					<CardDescription>
						Please check your inbox to verify your account
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="text-center space-y-4">
						<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
							<svg
								className="w-8 h-8 text-primary"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">
								A verification email was sent to:
							</p>
							<p className="font-medium mt-1">{session?.user?.email}</p>
						</div>
						<p className="text-sm text-muted-foreground">
							Click the link in the email to verify your account and access the
							dashboard.
						</p>
					</div>

					{resendSuccess && (
						<div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
							<p className="text-sm text-green-800 dark:text-green-200">
								Verification email sent! Check your inbox.
							</p>
						</div>
					)}

					{error && (
						<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					<div className="pt-4 border-t space-y-3">
						<Button
							className="w-full"
							onClick={handleResendEmail}
							disabled={resending}
							variant="outline"
						>
							{resending ? "Sending..." : "Resend Verification Email"}
						</Button>

						<p className="text-xs text-muted-foreground text-center">
							Make sure to check your spam folder. Verification links expire
							after 24 hours.
						</p>
					</div>
				</CardContent>
				<CardFooter className="flex justify-center">
					<Button variant="link" onClick={handleSignOut}>
						Sign out and try a different email
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
