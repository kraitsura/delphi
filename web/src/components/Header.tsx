import { Link } from "@tanstack/react-router";
import { UserMenu } from "./auth/user-menu";

export default function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 backdrop-blur-2xl bg-white/85 dark:bg-black/85 border-b border-[var(--accent)]/20">
			<div className="max-w-7xl mx-auto relative flex items-center justify-between">
				<Link to="/" preload="intent" className="flex items-center group relative">
					<h1 className="font-mono font-black text-xl sm:text-2xl tracking-tight text-black dark:text-white uppercase">
						DELPHI
					</h1>
					<div className="w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300 absolute -bottom-1 left-0" />
				</Link>

				<nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6 lg:gap-8">
					<Link
						to="/"
						preload="intent"
						className="font-mono text-xs lg:text-sm uppercase tracking-wider text-black dark:text-white hover:text-[var(--accent)] transition-colors relative group"
					>
						Home
						<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300" />
					</Link>
					<Link
						to="/features"
						preload="intent"
						className="font-mono text-xs lg:text-sm uppercase tracking-wider text-black dark:text-white hover:text-[var(--accent)] transition-colors relative group"
					>
						Features
						<span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent)] group-hover:w-full transition-all duration-300" />
					</Link>
				</nav>

				<UserMenu />
			</div>
		</header>
	);
}
