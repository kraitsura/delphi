import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/Header";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

export const Route = createFileRoute("/features")({
	ssr: true,
	component: FeaturesPage,
});

function FeaturesPage() {
	return (
		<>
			<Header />
			<div className="min-h-screen bg-white dark:bg-black overflow-y-auto">
				<FeaturesSection />
			</div>
		</>
	);
}
