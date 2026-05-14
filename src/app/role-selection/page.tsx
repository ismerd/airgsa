import Link from "next/link";
import { Building2, Plane, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const roles = [
  {
    label: "Airline",
    href: "/airline",
    icon: Plane,
    description: "Run tenders, compare GSA partners, manage contracts, and monitor cargo KPIs.",
  },
  {
    label: "GSA",
    href: "/gsa",
    icon: Building2,
    description: "Find open airline tenders, submit applications, maintain your profile, and track performance.",
  },
  {
    label: "Admin",
    href: "/admin",
    icon: Shield,
    description: "Review platform data, manage accounts, intelligence sources, and operations governance.",
  },
];

export default function RoleSelectionPage() {
  return (
    <main className="min-h-screen bg-page px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          AirGSA
        </Link>
        <h1 className="mt-10 text-4xl font-semibold text-ink">Choose your workspace</h1>
        <p className="mt-3 max-w-2xl text-ink-muted">
          Select the workspace that matches your role to access your dashboard.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Link key={role.label} href={role.href}>
              <Card className="h-full transition-colors hover:border-brand/50">
                <CardContent className="p-6">
                  <role.icon className="h-8 w-8 text-brand" />
                  <h2 className="mt-5 text-xl font-semibold text-ink">{role.label}</h2>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">{role.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
