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
		<section className="h-screen bg-white dark:bg-black px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12 relative overflow-hidden flex items-center">
			{/* Accent decorative elements */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-20 sm:top-40 right-10 sm:right-20 w-24 h-24 sm:w-40 sm:h-40 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
				<div className="absolute bottom-20 sm:bottom-40 left-10 sm:left-20 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
			</div>

			<div className="max-w-7xl mx-auto w-full relative z-10">
				<div className="text-center mb-6 sm:mb-8 lg:mb-10">
					<div className="mb-3 sm:mb-4">
						<h2 className="font-mono font-black text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-black dark:text-white uppercase tracking-tight">
							Features
						</h2>
						<div className="w-16 sm:w-20 lg:w-24 h-0.5 sm:h-1 bg-[var(--accent)] mx-auto mt-2 sm:mt-3 rounded-full" />
					</div>
					<p className="text-base sm:text-lg lg:text-xl text-black dark:text-white max-w-3xl mx-auto font-light px-4">
						<span className="relative inline-block">
							Agentic Event Planning with Collaborative Group Chat Interface
							<span className="absolute bottom-0 left-0 w-full h-1.5 sm:h-2 bg-[var(--accent)] opacity-10 -z-10" />
						</span>
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
					{features.map((feature, index) => (
						<div
							key={index}
							className="relative border-2 border-black dark:border-white p-4 sm:p-5 lg:p-6 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group overflow-hidden"
						>
							{/* Accent corner accent */}
							<div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-[var(--accent)] opacity-0 group-hover:opacity-10 transition-opacity -translate-y-6 translate-x-6 sm:-translate-y-8 sm:translate-x-8 rotate-45" />

							<h3 className="font-mono font-bold text-lg sm:text-xl lg:text-2xl text-black dark:text-white group-hover:text-[var(--accent)] mb-2 sm:mb-2.5 uppercase transition-colors relative">
								{feature.title}
								<span className="absolute -bottom-1.5 sm:-bottom-2 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-10 sm:group-hover:w-12 transition-all duration-300" />
							</h3>
							<p className="text-sm sm:text-base lg:text-lg text-black dark:text-white font-light leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
