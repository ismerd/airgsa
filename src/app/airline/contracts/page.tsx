import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ContractRow = {
  partner: string;
  market: string;
  start: string;
  end: string;
  kpi: string;
  status: "active" | "pending";
};

const rows: ContractRow[] = [
  { partner: "BlueWing Cargo Solutions", market: "DACH", start: "Aug 1, 2026", end: "Jul 31, 2028", kpi: "77% LF / $2.38 yield", status: "active" },
  { partner: "NordicLift Aviation Services", market: "Nordics", start: "Jan 1, 2027", end: "Dec 31, 2028", kpi: "72% LF / seafood uplift", status: "pending" },
];

const columns: Column<ContractRow>[] = [
  { header: "Partner", cell: (row) => row.partner },
  { header: "Market", cell: (row) => row.market },
  { header: "Start", cell: (row) => row.start },
  { header: "End", cell: (row) => row.end },
  { header: "KPI target", cell: (row) => row.kpi },
  { header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
];

export default function ContractsPage() {
  return (
    <>
      <Topbar title="Contracts & KPI" subtitle="Partner governance" />
      <main className="p-5">
        <Card>
          <CardHeader>
            <CardTitle>Contract register</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={rows} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

