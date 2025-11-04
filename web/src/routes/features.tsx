import { createFileRoute } from "@tanstack/react-router";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

export const Route = createFileRoute("/features")({
	ssr: true,
	component: FeaturesPage,
});

function FeaturesPage() {
	return (
		<div className="min-h-screen bg-white dark:bg-black">
			<FeaturesSection />
		</div>
	);
}
