import { Link, useRouteContext } from "@tanstack/react-router";

export function HeroSection() {
	const context = useRouteContext({ from: "/" });
	const isAuthenticated = !!context.userId;

	return (
		<section className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-6 pt-20">
			<div className="max-w-4xl mx-auto text-center">
				{/* Logo */}
				<h1 className="font-mono font-black text-7xl md:text-9xl text-black dark:text-white mb-8 tracking-tight">
					DELPHI
				</h1>

				{/* Tagline */}
				<p className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-4 tracking-tight">
					AI-Powered Event Planning
				</p>

				{/* Description */}
				<p className="text-lg md:text-xl text-black dark:text-white mb-12 max-w-2xl mx-auto font-light">
					Plan events effortlessly through conversation with our intelligent
					chat interface.
				</p>

				{/* CTA Buttons */}
				<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
					{isAuthenticated ? (
						<Link
							to="/dashboard"
							preload="intent"
							className="w-full sm:w-auto px-12 py-4 bg-black dark:bg-white text-white dark:text-black font-mono font-bold text-sm uppercase tracking-wider border-2 border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors"
						>
							Go to Dashboard
						</Link>
					) : (
						<>
							<Link
								to="/auth/sign-up"
								preload="intent"
								className="w-full sm:w-auto px-12 py-4 bg-black dark:bg-white text-white dark:text-black font-mono font-bold text-sm uppercase tracking-wider border-2 border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-colors"
							>
								Get Started
							</Link>
							<Link
								to="/auth/sign-in"
								preload="intent"
								className="w-full sm:w-auto px-12 py-4 bg-white dark:bg-black text-black dark:text-white font-mono font-bold text-sm uppercase tracking-wider border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
							>
								Sign In
							</Link>
						</>
					)}
				</div>
			</div>
		</section>
	);
}
