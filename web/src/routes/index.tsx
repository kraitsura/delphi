import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import Header from "@/components/Header";
import { HeroSection } from "@/components/landing/HeroSection";

export const Route = createFileRoute("/")({
	ssr: true,
	component: App,
});

function App() {
	const router = useRouter();

	useEffect(() => {
		// Eagerly prefetch features and plans routes when landing page loads
		router.preloadRoute({ to: "/features" });
		router.preloadRoute({ to: "/plans" });
	}, [router]);

	return (
		<>
			<Header />
			<HeroSection />
		</>
	);
}
