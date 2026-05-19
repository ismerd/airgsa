import { AdminNewsPostManager } from "@/components/dashboard/admin-news-post-manager";
import { AdminLinkedinImport } from "@/components/dashboard/admin-linkedin-import";
import { Topbar } from "@/components/dashboard/topbar";
import { getNewsPosts, newsCategories } from "@/lib/services/platform";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const posts = await getNewsPosts();

  return (
    <>
      <Topbar title="Content import" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <AdminLinkedinImport />
          <AdminNewsPostManager categories={newsCategories} initialPosts={posts} />
        </div>
      </main>
    </>
  );
}
