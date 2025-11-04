import { Link } from "@tanstack/react-router";
import { UserMenu } from "./auth/user-menu";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-2xl bg-white/85 dark:bg-black/85 border-b border-white/20 dark:border-white/10">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between">
        <Link to="/" preload="intent" className="flex items-center">
          <h1 className="font-mono font-black text-2xl tracking-tight text-black dark:text-white uppercase">
            DELPHI
          </h1>
        </Link>

        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
          <Link
            to="/"
            preload="intent"
            className="font-mono text-sm uppercase tracking-wider text-black dark:text-white hover:opacity-60 transition-opacity"
          >
            Home
          </Link>
          <Link
            to="/features"
            preload="intent"
            className="font-mono text-sm uppercase tracking-wider text-black dark:text-white hover:opacity-60 transition-opacity"
          >
            Features
          </Link>
          <Link
            to="/plans"
            preload="intent"
            className="font-mono text-sm uppercase tracking-wider text-black dark:text-white hover:opacity-60 transition-opacity"
          >
            Plans
          </Link>
        </nav>

        <UserMenu />
      </div>
    </header>
  );
}
