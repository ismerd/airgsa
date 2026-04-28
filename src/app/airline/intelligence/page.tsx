import Link from "next/link";
import { NewsCard } from "@/components/dashboard/news-card";
import { Topbar } from "@/components/dashboard/topbar";
import { buttonVariants } from "@/components/ui/button";
import { newsPosts } from "@/lib/services/platform";

export default function AirlineIntelligencePage() {
  return (
    <>
      <Topbar title="News / Cargo Intelligence" subtitle="Market signals" />
      <main className="space-y-5 p-5">
        <div className="flex justify-end">
          <Link href="/news" className={buttonVariants({ variant: "outline" })}>Open full news module</Link>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {newsPosts.map((post) => <NewsCard key={post.id} post={post} />)}
        </div>
      </main>
    </>
  );
}
