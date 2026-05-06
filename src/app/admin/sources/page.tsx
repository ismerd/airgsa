import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Topbar } from "@/components/dashboard/topbar";
import { linkedinSources, newsCategories } from "@/lib/services/platform";
import type { LinkedinSource } from "@/lib/types";

const columns: Column<LinkedinSource>[] = [
  { header: "Source", cell: (row) => row.name },
  { header: "URL", cell: (row) => <span className="text-cyan-100">{row.url}</span> },
  { header: "Category", cell: (row) => row.category ?? "unclassified" },
  { header: "Last import", cell: (row) => row.lastImport },
  { header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "active" : "closed"} /> },
];

export default function SourcesPage() {
  return (
    <>
      <Topbar title="Sources" subtitle="Admin" />
      <main className="px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 xl:grid-cols-[.45fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Add LinkedIn source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Company or page name" />
                <Input placeholder="LinkedIn URL" />
                <Select>
                  <option>Unclassified / manual review</option>
                  {newsCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </Select>
                <Button className="w-full">Add mock source</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Source manager</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={columns} data={linkedinSources} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
