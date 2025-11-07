import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@/components/auth/sign-in-form";

export const Route = createFileRoute("/auth/sign-in")({
	component: SignInPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			verified: search.verified === "true",
			redirect: (search.redirect as string) || undefined,
		};
	},
});

function SignInPage() {
	const { verified } = Route.useSearch();

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<SignInForm verified={verified} />
		</div>
	);
}
