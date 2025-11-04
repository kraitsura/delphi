import { Link } from "@tanstack/react-router";

export function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      period: "forever",
      description: "Perfect for small personal events",
      features: [
        "1 active event",
        "Up to 5 collaborators",
        "Basic AI assistance",
        "Task management",
        "Budget tracking",
      ],
      cta: "Get Started",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      description: "For professional event coordinators",
      features: [
        "Unlimited events",
        "Unlimited collaborators",
        "Advanced AI agents",
        "Vendor management",
        "Budget forecasting",
        "Custom chat rooms",
        "Priority support",
      ],
      cta: "Start Free Trial",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact sales",
      description: "Tailored for organizations",
      features: [
        "Everything in Pro",
        "Custom AI training",
        "SSO & advanced security",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section className="min-h-screen bg-white dark:bg-black px-6 py-24 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-mono font-black text-5xl md:text-7xl text-black dark:text-white mb-6 uppercase tracking-tight">
            Plans
          </h2>
          <p className="text-xl md:text-2xl text-black dark:text-white max-w-3xl mx-auto font-light">
            Choose the perfect plan for your event planning needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`border-2 border-black dark:border-white p-8 flex flex-col ${
                plan.highlighted
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "bg-white dark:bg-black"
              }`}
            >
              <div className="mb-8">
                <h3
                  className={`font-mono font-bold text-2xl uppercase mb-2 ${
                    plan.highlighted
                      ? "text-white dark:text-black"
                      : "text-black dark:text-white"
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span
                    className={`font-mono font-black text-5xl ${
                      plan.highlighted
                        ? "text-white dark:text-black"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-sm font-mono ml-2 ${
                      plan.highlighted
                        ? "text-white/70 dark:text-black/70"
                        : "text-black/70 dark:text-white/70"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    plan.highlighted
                      ? "text-white/80 dark:text-black/80"
                      : "text-black/80 dark:text-white/80"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 flex-grow space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className={`flex items-start gap-2 text-sm ${
                      plan.highlighted
                        ? "text-white dark:text-black"
                        : "text-black dark:text-white"
                    }`}
                  >
                    <span className="font-mono">▪</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to="/auth/sign-up"
                preload="intent"
                className={`w-full px-8 py-4 font-mono font-bold text-sm uppercase tracking-wider text-center border-2 transition-colors ${
                  plan.highlighted
                    ? "bg-white dark:bg-black text-black dark:text-white border-white dark:border-black hover:bg-transparent dark:hover:bg-transparent hover:text-white dark:hover:text-black"
                    : "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
