import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "GSA Network",
    price: "$490",
    description: "For regional GSAs tracking opportunities and managing applications.",
    features: ["Tender marketplace", "Company profile", "Application pipeline", "Notifications"],
  },
  {
    name: "Airline Tender Desk",
    price: "$1,900",
    description: "For cargo teams running partner selection and KPI governance.",
    features: ["Create and compare tenders", "GSA scorecards", "Contracts and KPI workspace", "Cargo intelligence feed"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For multi-region networks with workflow, governance, and data needs.",
    features: ["Role-based admin", "Railway Postgres data model", "Storage-ready documents", "OpenAI-ready architecture"],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-page px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            AirGSA
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline" })}>Login</Link>
        </div>
        <section className="py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">Pricing</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-ink md:text-6xl">Commercial cargo workflows without procurement drag.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">
            Plans map to the core airline, GSA, and admin workspaces for controlled mandate execution.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.name} className="bg-surface">
                <CardHeader>
                  <CardTitle className="text-ink">{plan.name}</CardTitle>
                  <p className="text-sm text-ink-muted">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-semibold">{plan.price}<span className="text-base font-medium text-ink-muted"> / month</span></p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-ink">
                        <Check className="h-4 w-4 text-brand" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className={buttonVariants({ className: "mt-8 w-full" })}>Choose plan</Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
