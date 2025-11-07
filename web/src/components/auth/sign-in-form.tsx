import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth";

interface SignInFormProps {
	verified?: boolean;
}

export function SignInForm({ verified = false }: SignInFormProps) {
	const navigate = useNavigate();
	const emailId = useId();
	const passwordId = useId();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEmailSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			await authClient.signIn.email({
				email,
				password,
				callbackURL: "/dashboard",
			});
			// Navigation handled by Better Auth
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Sign in failed";

			// Check if error is related to email verification
			if (errorMessage.toLowerCase().includes("verify") ||
			    errorMessage.toLowerCase().includes("verification")) {
				setError("Please verify your email address before signing in. Check your inbox for the verification link.");
			} else {
				setError(errorMessage);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setError(null);
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: "/dashboard",
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Google sign in failed");
		}
	};

	return (
		<Card className="w-full max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Sign In</CardTitle>
				<CardDescription>Sign in to your account to continue</CardDescription>
			</CardHeader>
			<CardContent>
				{verified && (
					<div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
						<p className="text-sm text-green-800 dark:text-green-200">
							✓ Email verified successfully! You can now sign in.
						</p>
					</div>
				)}
				<form onSubmit={handleEmailSignIn} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={emailId}>Email</Label>
						<Input
							id={emailId}
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={passwordId}>Password</Label>
						<Input
							id={passwordId}
							type="password"
							placeholder="Enter your password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={loading}
						/>
					</div>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<Button type="submit" className="w-full" disabled={loading}>
						{loading ? "Signing in..." : "Sign In"}
					</Button>
				</form>

				<div className="relative my-6">
					<Separator />
					<span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
						OR
					</span>
				</div>

				<Button
					type="button"
					variant="outline"
					className="w-full"
					onClick={handleGoogleSignIn}
				>
					<svg
						className="mr-2 h-4 w-4"
						viewBox="0 0 24 24"
						aria-label="Google logo"
					>
						<title>Google</title>
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					Sign in with Google
				</Button>
			</CardContent>
			<CardFooter className="flex justify-center">
				<p className="text-sm text-muted-foreground">
					Don't have an account?{" "}
					<Button
						variant="link"
						className="p-0 h-auto font-normal"
						onClick={() => navigate({ to: "/auth/sign-up" })}
					>
						Sign up
					</Button>
				</p>
			</CardFooter>
		</Card>
	);
}
