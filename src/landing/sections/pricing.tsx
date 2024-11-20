import { Button } from "@/src/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Basic",
    id: "basic",
    href: "/auth",
    price: { monthly: "$29" },
    description: "Perfect for small studios just getting started with social media.",
    features: [
      "Up to 3 schedule sources",
      "Up to 2 Instagram accounts",
      "Basic design templates",
      "Manual publishing",
      "Email support at team@moovn.co",
    ],
  },
  {
    name: "Pro",
    id: "pro",
    href: "/auth",
    price: { monthly: "$79" },
    description: "For growing studios that need more flexibility and automation.",
    features: [
      "Unlimited schedule sources",
      "Unlimited Instagram accounts",
      "Premium design templates",
      "Automated publishing",
      "Google Drive integration",
      "Priority support at team@moovn.co",
      "Custom design requests",
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Choose the plan that best fits your studio&apos;s needs. All plans include a 14-day free
            trial.
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-3xl p-8 ring-1 ring-ring/10 xl:p-10">
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8">{tier.name}</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{tier.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold">{tier.price.monthly}</span>
                <span className="text-sm font-semibold leading-6">/month</span>
              </p>
              <Link href={tier.href}>
                <Button className="mt-6 w-full">
                  {tier.name === "Basic" ? "Get started" : "Upgrade now"}
                </Button>
              </Link>
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <Check className="h-6 w-5 flex-none text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
