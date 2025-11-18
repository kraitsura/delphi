import { createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "@/components/auth/sign-in-form";
import Header from "@/components/Header";

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
		<>
			<Header />
			<div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 lg:pt-32">
				<SignInForm verified={verified} />
			</div>
		</>
	);
}
