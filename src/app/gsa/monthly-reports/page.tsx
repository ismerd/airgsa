"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Priority = "high" | "medium" | "watch";

type AccountRow = {
  id: string;
  agent: string;
  originCountry: string;
  destination: string;
  qrCw: number;
  benchmarkCw: number;
  marketCw: number;
  qrRevenue: number;
  marketRevenue: number;
  yieldGap: number;
  priority: Priority;
  assignedTo: string;
};

type TeamMember = {
  name: string;
  role: string;
  markets: string[];
};

const team: TeamMember[] = [
  { name: "Sofia Keller", role: "Key accounts", markets: ["DXB", "DOH", "MCT"] },
  { name: "Marc Vidal", role: "North Africa", markets: ["JNB", "CPT", "CAI"] },
  { name: "Nadia Rahman", role: "Express & e-commerce", markets: ["BOM", "DEL", "KHI"] },
  { name: "Jonas Richter", role: "Recovery desk", markets: ["SHJ", "AUH", "SIN"] },
];

const sampleRows: AccountRow[] = [
  {
    id: "acc-001",
    agent: "DHL EXPRESS",
    originCountry: "SPAIN",
    destination: "JNB",
    qrCw: 0,
    benchmarkCw: 114300,
    marketCw: 114300,
    qrRevenue: 0,
    marketRevenue: 339815,
    yieldGap: 0,
    priority: "high",
    assignedTo: "Marc Vidal",
  },
  {
    id: "acc-002",
    agent: "ALONSO FORWARDING HOLDING",
    originCountry: "SPAIN",
    destination: "DXB",
    qrCw: 9284,
    benchmarkCw: 73026,
    marketCw: 82310,
    qrRevenue: 10119,
    marketRevenue: 98385,
    yieldGap: -9.83,
    priority: "high",
    assignedTo: "Sofia Keller",
  },
  {
    id: "acc-003",
    agent: "UNIVERSAL GLOBAL LOGISTICS",
    originCountry: "SPAIN",
    destination: "DXB",
    qrCw: 3043,
    benchmarkCw: 72035,
    marketCw: 75078,
    qrRevenue: 3538,
    marketRevenue: 81283,
    yieldGap: 7.73,
    priority: "medium",
    assignedTo: "Sofia Keller",
  },
  {
    id: "acc-004",
    agent: "DSV AIR SEA",
    originCountry: "SPAIN",
    destination: "SHJ",
    qrCw: 1054,
    benchmarkCw: 52637,
    marketCw: 53691,
    qrRevenue: 1626,
    marketRevenue: 96125,
    yieldGap: -14.07,
    priority: "high",
    assignedTo: "Jonas Richter",
  },
  {
    id: "acc-005",
    agent: "FASHION LOGISTICS",
    originCountry: "SPAIN",
    destination: "CPT",
    qrCw: 88553,
    benchmarkCw: 100970,
    marketCw: 189523,
    qrRevenue: 266563,
    marketRevenue: 533413,
    yieldGap: 13.9,
    priority: "medium",
    assignedTo: "Marc Vidal",
  },
  {
    id: "acc-006",
    agent: "SCHENKER",
    originCountry: "SPAIN",
    destination: "CPT",
    qrCw: 23576,
    benchmarkCw: 12279,
    marketCw: 35855,
    qrRevenue: 48726,
    marketRevenue: 73608,
    yieldGap: 1.99,
    priority: "watch",
    assignedTo: "Marc Vidal",
  },
  {
    id: "acc-007",
    agent: "TRACOSA",
    originCountry: "SPAIN",
    destination: "DXB",
    qrCw: 7742,
    benchmarkCw: 63968,
    marketCw: 71710,
    qrRevenue: 9649,
    marketRevenue: 94311,
    yieldGap: -5.83,
    priority: "medium",
    assignedTo: "Sofia Keller",
  },
  {
    id: "acc-008",
    agent: "GLOBETAINER ALGERIA SARL",
    originCountry: "ALGERIA",
    destination: "YMQ",
    qrCw: 5690,
    benchmarkCw: 0,
    marketCw: 5690,
    qrRevenue: 13458,
    marketRevenue: 13458,
    yieldGap: 0,
    priority: "watch",
    assignedTo: "Nadia Rahman",
  },
];

const priorityConfig: Record<Priority, { label: string; variant: "danger" | "warning" | "muted" }> = {
  high: { label: "High", variant: "danger" },
  medium: { label: "Medium", variant: "warning" },
  watch: { label: "Watch", variant: "muted" },
};

export default function GsaMonthlyReportsPage() {
  const [fileName, setFileName] = useState("");
  const [isDistributed, setIsDistributed] = useState(false);
  const [rows, setRows] = useState<AccountRow[]>(sampleRows);

  const totals = useMemo(() => {
    return rows.reduce(
      (sum, row) => ({
        qrCw: sum.qrCw + row.qrCw,
        marketCw: sum.marketCw + row.marketCw,
        qrRevenue: sum.qrRevenue + row.qrRevenue,
        marketRevenue: sum.marketRevenue + row.marketRevenue,
      }),
      { qrCw: 0, marketCw: 0, qrRevenue: 0, marketRevenue: 0 },
    );
  }, [rows]);

  const assignmentCounts = useMemo(() => {
    return team.map((member) => ({
      ...member,
      accounts: rows.filter((row) => row.assignedTo === member.name).length,
      priority: rows.filter((row) => row.assignedTo === member.name && row.priority === "high").length,
    }));
  }, [rows]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsDistributed(true);
  }

  function redistribute() {
    setRows((current) =>
      current.map((row, index) => {
        const routeOwner = team.find((member) => member.markets.includes(row.destination));
        return {
          ...row,
          assignedTo: routeOwner?.name ?? team[index % team.length].name,
        };
      }),
    );
    setIsDistributed(true);
  }

  function assignRow(rowId: string, assignedTo: string) {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, assignedTo } : row)));
  }

  return (
    <>
      <Topbar title="Monthly reports" subtitle="GSA customer allocation" />
      <main className="space-y-5 p-5">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-brand" />
                Upload monthly report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-brand/35 bg-brand-light/40 px-5 text-center transition-colors hover:border-brand">
                <UploadCloud className="h-9 w-9 text-brand" />
                <span className="mt-3 text-sm font-semibold text-ink">
                  {fileName || "Select Excel report"}
                </span>
                <span className="mt-1 text-xs text-ink-muted">.xlsx, .xls or .csv</span>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <ReportMetric label="Rows detected" value={fileName ? "14,386" : "8 sample"} />
                <ReportMetric label="Agents" value={fileName ? "921" : "8"} />
                <ReportMetric label="Month" value="Jan-26" />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={redistribute}>
                  <UsersRound className="h-4 w-4" />
                  Auto distribute customers
                </Button>
                {isDistributed && (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Customers assigned
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-brand" />
                Team workload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentCounts.map((member) => (
                <div key={member.name} className="rounded-lg border border-border-ui bg-surface2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                      <p className="text-xs text-ink-muted">{member.role}</p>
                    </div>
                    <Badge variant={member.priority > 0 ? "warning" : "muted"}>
                      {member.accounts} accounts
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.markets.map((market) => (
                      <span key={market} className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-ink-muted">
                        {market}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <ReportMetric label="QR CW" value={`${formatNumber(totals.qrCw)} kg`} />
          <ReportMetric label="Market CW" value={`${formatNumber(totals.marketCw)} kg`} />
          <ReportMetric label="QR revenue" value={formatCurrency(totals.qrRevenue)} />
          <ReportMetric label="Market revenue" value={formatCurrency(totals.marketRevenue)} />
        </section>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Customer distribution</CardTitle>
              <Button variant="outline" size="sm" onClick={redistribute}>
                <RefreshCw className="h-4 w-4" />
                Rebalance
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-ui text-xs uppercase tracking-wider text-ink-muted">
                    <th className="px-3 py-3 font-semibold">Agent group</th>
                    <th className="px-3 py-3 font-semibold">Origin</th>
                    <th className="px-3 py-3 font-semibold">Route</th>
                    <th className="px-3 py-3 text-right font-semibold">QR CW</th>
                    <th className="px-3 py-3 text-right font-semibold">Market CW</th>
                    <th className="px-3 py-3 text-right font-semibold">QR revenue</th>
                    <th className="px-3 py-3 text-right font-semibold">Yield gap</th>
                    <th className="px-3 py-3 font-semibold">Priority</th>
                    <th className="px-3 py-3 font-semibold">Assigned to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {rows.map((row) => {
                    const priority = priorityConfig[row.priority];
                    return (
                      <tr key={row.id} className="bg-surface transition-colors hover:bg-surface2">
                        <td className="px-3 py-3 font-semibold text-ink">{row.agent}</td>
                        <td className="px-3 py-3 text-ink-muted">{row.originCountry}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-ink">
                            MAD
                            <ArrowRight className="h-3 w-3 text-ink-muted" />
                            {row.destination}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-ink-muted">{formatNumber(row.qrCw)}</td>
                        <td className="px-3 py-3 text-right text-ink-muted">{formatNumber(row.marketCw)}</td>
                        <td className="px-3 py-3 text-right text-ink-muted">{formatCurrency(row.qrRevenue)}</td>
                        <td className={`px-3 py-3 text-right font-semibold ${row.yieldGap < 0 ? "text-danger" : "text-success"}`}>
                          {row.yieldGap.toFixed(1)}%
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={priority.variant}>{priority.label}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <label className="sr-only" htmlFor={`${row.id}-owner`}>
                            Assigned employee
                          </label>
                          <select
                            id={`${row.id}-owner`}
                            value={row.assignedTo}
                            onChange={(event) => assignRow(row.id, event.target.value)}
                            className="h-9 w-full rounded-md border border-border-ui bg-surface px-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15"
                          >
                            {team.map((member) => (
                              <option key={member.name} value={member.name}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-3">
          {team.map((member) => (
            <Card key={member.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserRound className="h-4 w-4 text-brand" />
                  {member.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rows
                    .filter((row) => row.assignedTo === member.name)
                    .map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-ui bg-surface2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{row.agent}</p>
                          <p className="text-xs text-ink-muted">MAD {"->"} {row.destination}</p>
                        </div>
                        <Badge variant={priorityConfig[row.priority].variant}>{priorityConfig[row.priority].label}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
