import Link from "next/link";
import { Database, Newspaper, ShieldCheck, Users } from "lucide-react";
import { AdminLinkedinImport } from "@/components/dashboard/admin-linkedin-import";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const items = [
  { label: "Users", value: "18", icon: Users },
  { label: "Companies", value: "11", icon: ShieldCheck },
  { label: "Imported posts", value: "124", icon: Newspaper },
  { label: "Tables ready", value: "11", icon: Database },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">AirGSA</Link>
          <Link href="/news/sources" className={buttonVariants({ variant: "outline" })}>Manage sources</Link>
        </div>
        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Admin</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Platform operations</h1>
          <p className="mt-3 max-w-2xl text-slate-300">MVP console for role governance, source management, and Supabase schema readiness.</p>
        </section>
        <div className="grid gap-5 md:grid-cols-4">
          {items.map((item) => (
            <Card key={item.label} className="bg-white text-slate-950">
              <CardContent className="p-5">
                <item.icon className="h-5 w-5 text-cyan-600" />
                <p className="mt-4 text-sm text-slate-500">{item.label}</p>
                <p className="mt-1 text-3xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <section className="mt-8">
          <AdminLinkedinImport />
        </section>
      </div>
    </main>
  );
}
