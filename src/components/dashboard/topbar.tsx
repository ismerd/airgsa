import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 px-5 py-4 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">{subtitle}</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden w-72 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input className="pl-9" placeholder="Search tenders, GSAs, lanes" />
          </div>
          <Link href="/gsa/notifications" className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
