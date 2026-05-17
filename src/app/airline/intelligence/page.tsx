import Link from "next/link";
import { NewsCard } from "@/components/dashboard/news-card";
import { Topbar } from "@/components/dashboard/topbar";
import { buttonVariants } from "@/components/ui/button";
import { getNewsPosts } from "@/lib/services/platform";

export const dynamic = "force-dynamic";

export default async function AirlineIntelligencePage() {
  const posts = await getNewsPosts();

  return (
    <>
      <Topbar title="News / Cargo Intelligence" subtitle="Market signals" />
      <main className="space-y-5 p-5">
        <div className="flex justify-end">
          <Link href="/news" className={buttonVariants({ variant: "outline" })}>Open full news module</Link>
        </div>
        {posts.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {posts.map((post) => <NewsCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-border-ui bg-surface p-6 text-sm text-ink-muted">
            No imported cargo intelligence posts yet.
          </div>
        )}
      </main>
    </>
  );
}
