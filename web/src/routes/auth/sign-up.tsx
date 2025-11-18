import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@/components/auth/sign-up-form";
import Header from "@/components/Header";

export const Route = createFileRoute("/auth/sign-up")({
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<>
			<Header />
			<div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 lg:pt-32">
				<SignUpForm />
			</div>
		</>
	);
}
