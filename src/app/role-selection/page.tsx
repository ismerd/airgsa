import Link from "next/link";
import { Building2, Plane, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const roles = [
  { label: "Airline", href: "/airline", icon: Plane, description: "Run tenders, compare GSA partners, manage contracts, and monitor KPIs." },
  { label: "GSA", href: "/gsa", icon: Building2, description: "Find open tenders, apply to opportunities, maintain your profile, and track performance." },
  { label: "Admin", href: "/admin", icon: Shield, description: "Review platform data, manage news sources, and prepare operations governance." },
];

export default function RoleSelectionPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">AirGSA</Link>
        <h1 className="mt-10 text-4xl font-semibold text-white">Choose your workspace</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Each role opens a clickable MVP area backed by realistic mock data.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {roles.map((role) => (
            <Link key={role.label} href={role.href}>
              <Card className="h-full transition-colors hover:border-cyan-300/50 hover:bg-white/[0.09]">
                <CardContent className="p-6">
                  <role.icon className="h-8 w-8 text-cyan-300" />
                  <h2 className="mt-5 text-xl font-semibold text-white">{role.label}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{role.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
