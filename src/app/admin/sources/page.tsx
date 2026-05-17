import { LinkedinSourceManager } from "@/components/dashboard/linkedin-source-manager";
import { Topbar } from "@/components/dashboard/topbar";
import { getLinkedinSources, newsCategories } from "@/lib/services/platform";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await getLinkedinSources();

  return (
    <>
      <Topbar title="Sources" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <LinkedinSourceManager categories={newsCategories} initialSources={sources} />
        </div>
      </main>
    </>
  );
}
