import Link from "next/link";
import { NewsFeed } from "@/components/dashboard/news-feed";
import { buttonVariants } from "@/components/ui/button";

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
            AirGSA
          </Link>
          <Link href="/news/sources" className={buttonVariants({ variant: "outline" })}>LinkedIn sources</Link>
        </div>
        <section className="py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Cargo intelligence</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">News feed</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Manual mock data representing imported LinkedIn posts. Filters mirror the target database category taxonomy.
          </p>
        </section>
        <NewsFeed />
      </div>
    </main>
  );
}
