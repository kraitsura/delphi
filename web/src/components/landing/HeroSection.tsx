import { Link, useRouteContext } from "@tanstack/react-router";

export function HeroSection() {
  const context = useRouteContext({ from: "/" });
  const isAuthenticated = !!context.userId;

  return (
    <section className="h-screen bg-white dark:bg-black flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 relative overflow-hidden">
      {/* Accent decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 sm:top-20 left-6 sm:left-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
        <div className="absolute bottom-16 sm:bottom-20 right-6 sm:right-10 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[var(--accent)] opacity-10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10 w-full">
        {/* Logo with accent underline */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="font-mono font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-black dark:text-white tracking-tight px-4">
            DELPHI
          </h1>
          <div className="w-16 sm:w-20 lg:w-24 h-0.5 sm:h-1 bg-[var(--accent)] mx-auto mt-3 sm:mt-4 rounded-full" />
        </div>

        {/* Tagline with accent highlight */}
        <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-black dark:text-white mb-3 sm:mb-4 tracking-tight px-4">
          <span className="relative inline-block">
            AI-Powered Event Planning
            <span className="absolute bottom-0 left-0 w-full h-1.5 sm:h-2 bg-[var(--accent)] opacity-20 -z-10" />
          </span>
        </p>

        {/* Description */}
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-black dark:text-white mb-8 sm:mb-10 lg:mb-12 max-w-3xl mx-auto font-light px-4">
          Plan events effortlessly through conversation.
        </p>

        {/* CTA Buttons with accent */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
          {isAuthenticated ? (
            <Link
              to="/events"
              preload="intent"
              className="w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-3 sm:py-4 bg-[var(--accent)] text-[var(--accent-foreground)] font-mono font-bold text-xs sm:text-sm uppercase tracking-wider border-2 border-[var(--accent)] hover:bg-transparent hover:text-[var(--accent)] transition-colors shadow-lg shadow-[var(--accent)]/20"
            >
              Go to Events
            </Link>
          ) : (
            <>
              <Link
                to="/auth/sign-up"
                preload="intent"
                className="w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-3 sm:py-4 bg-[var(--accent)] text-[var(--accent-foreground)] font-mono font-bold text-xs sm:text-sm uppercase tracking-wider border-2 border-[var(--accent)] hover:bg-transparent hover:text-[var(--accent)] transition-colors shadow-lg shadow-[var(--accent)]/20"
              >
                Get Started
              </Link>
              <Link
                to="/auth/sign-in"
                search={{ verified: false, redirect: undefined }}
                preload="intent"
                className="w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-3 sm:py-4 bg-transparent text-black dark:text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
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
