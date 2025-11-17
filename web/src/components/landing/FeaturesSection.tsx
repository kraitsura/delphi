export function FeaturesSection() {
	const features = [
		{
			title: "Agentic AI Planning",
			description:
				"Intelligent AI agents understand context, anticipate needs, and proactively help you plan every detail of your event.",
		},
		{
			title: "Group Chat Interface",
			description:
				"Collaborate naturally with your team through conversation. No complex forms or rigid workflows—just chat.",
		},
		{
			title: "Smart Automation",
			description:
				"AI detects tasks, suggests vendors, tracks budgets, and manages timelines automatically from your conversations.",
		},
		{
			title: "Real-Time Collaboration",
			description:
				"Multiple coordinators, vendors, and team members can work together seamlessly in dedicated chat rooms.",
		},
	];

	return (
		<section className="min-h-screen bg-white dark:bg-black px-6 py-24 pt-32">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-20">
					<h2 className="font-mono font-black text-5xl md:text-7xl text-black dark:text-white mb-6 uppercase tracking-tight">
						Features
					</h2>
					<p className="text-xl md:text-2xl text-black dark:text-white max-w-3xl mx-auto font-light">
						Agentic Event Planning with Collaborative Group Chat Interface
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{features.map((feature, index) => (
						<div
							key={index}
							className="border-2 border-black dark:border-white p-8 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors group"
						>
							<h3 className="font-mono font-bold text-2xl text-black dark:text-white group-hover:text-white dark:group-hover:text-black mb-4 uppercase">
								{feature.title}
							</h3>
							<p className="text-lg text-black dark:text-white group-hover:text-white dark:group-hover:text-black font-light leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
