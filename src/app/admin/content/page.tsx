import { AdminLinkedinImport } from "@/components/dashboard/admin-linkedin-import";
import { Topbar } from "@/components/dashboard/topbar";

export default function ContentPage() {
  return (
    <>
      <Topbar title="Content import" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-4xl">
          <AdminLinkedinImport />
        </div>
      </main>
    </>
  );
}
