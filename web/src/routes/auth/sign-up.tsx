import { createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SignUpForm />
    </div>
  );
}
