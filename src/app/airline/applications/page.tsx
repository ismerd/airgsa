import Link from "next/link";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { applications } from "@/lib/services/platform";
import type { TenderApplication } from "@/lib/types";

const columns: Column<TenderApplication>[] = [
  {
    header: "GSA",
    cell: (row) => (
      <Link href={`/airline/gsa/${row.gsaId}`} className="font-semibold text-cyan-100 hover:text-cyan-300">
        {row.gsaName}
      </Link>
    ),
  },
  { header: "Commercial", cell: (row) => row.commercialScore },
  { header: "Network", cell: (row) => row.networkScore },
  { header: "Compliance", cell: (row) => row.complianceScore },
  { header: "Commission", cell: (row) => row.proposedCommission },
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  {
    header: "Actions",
    cell: () => (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary">Shortlist</Button>
        <Button size="sm">Accept</Button>
        <Button size="sm" variant="destructive">Reject</Button>
      </div>
    ),
  },
];

export default function ApplicationsPage() {
  return (
    <>
      <Topbar title="GSA applications" subtitle="Comparison table" />
      <main className="space-y-5 p-5">
        <Card>
          <CardHeader>
            <CardTitle>Central Europe GSA representation</CardTitle>
            <p className="text-sm text-slate-400">Compare commercial, network, and compliance fit before shortlisting or award.</p>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={applications} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
