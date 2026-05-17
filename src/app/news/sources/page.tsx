import Link from "next/link";
import { LinkedinSourceManager } from "@/components/dashboard/linkedin-source-manager";
import { buttonVariants } from "@/components/ui/button";
import { getLinkedinSources, newsCategories } from "@/lib/services/platform";

export const dynamic = "force-dynamic";

export default async function LinkedinSourcesPage() {
  const sources = await getLinkedinSources();

  return (
    <main className="min-h-screen bg-page px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <Link href="/news" className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            Cargo intelligence
          </Link>
          <Link href="/admin" className={buttonVariants({ variant: "outline" })}>Admin console</Link>
        </div>
        <div className="mt-10">
          <LinkedinSourceManager canManage={false} categories={newsCategories} initialSources={sources} />
        </div>
      </div>
    </main>
  );
}
