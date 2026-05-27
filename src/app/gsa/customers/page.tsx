"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  PackageCheck,
  Search,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TeamAccount } from "@/lib/services/team-accounts";

type Priority = "high" | "medium" | "watch";

type Customer = {
  id: string;
  customerKey: string;
  name: string;
  contactPerson: string;
  email: string;
  origin: string;
  destination: string;
  priority: Priority;
  monthlyVolume: number;
  monthlyRevenue: number;
  yieldGap: number;
  lastContact: string;
  awbNumber?: string;
  shipmentStatus?: string;
  pendingInquiries: number;
  openQuotes: number;
  assignedToEmail?: string;
  assignedToName?: string;
};

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: "danger" | "warning" | "muted" }> = {
  high: { label: "High Priority", variant: "danger" },
  medium: { label: "Medium", variant: "warning" },
  watch: { label: "Watch", variant: "muted" },
};

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.max(0, Math.floor(diff / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatRevenue(value: number): string {
  if (value >= 1000000) return `EUR ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `EUR ${(value / 1000).toFixed(0)}k`;
  return `EUR ${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [team, setTeam] = useState<TeamAccount[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [assigningKey, setAssigningKey] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gsa/customers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Customers could not be loaded");
      setCustomers(data.customers ?? []);
      setTeam(data.team ?? []);
      setCanAssign(Boolean(data.canAssign));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function assignCustomer(customer: Customer, assignedToEmail: string) {
    setAssigningKey(customer.customerKey);
    setError(null);
    try {
      const assignee = team.find((member) => member.email === assignedToEmail);
      const response = await fetch("/api/gsa/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerKey: customer.customerKey,
          customerName: customer.name,
          contactEmail: customer.email,
          assignedToEmail: assignee?.email,
          assignedToName: assignee?.name,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Customer assignment could not be saved");
      setCustomers((current) =>
        current.map((row) =>
          row.customerKey === customer.customerKey
            ? { ...row, assignedToEmail: assignee?.email, assignedToName: assignee?.name }
            : row,
        ),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAssigningKey(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers
      .filter((customer) => priorityFilter === "all" || customer.priority === priorityFilter)
      .filter((customer) =>
        !term ||
        customer.name.toLowerCase().includes(term) ||
        customer.contactPerson.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.origin.toLowerCase().includes(term) ||
        customer.destination.toLowerCase().includes(term),
      );
  }, [customers, priorityFilter, search]);

  const stats = useMemo(() => ({
    total: customers.length,
    highPriority: customers.filter((customer) => customer.priority === "high").length,
    activeShipments: customers.filter((customer) => customer.shipmentStatus === "booked").length,
    revenue: customers.reduce((sum, customer) => sum + customer.monthlyRevenue, 0),
  }), [customers]);

  const priorities: { key: Priority | "all"; label: string }[] = [
    { key: "all", label: "All Customers" },
    { key: "high", label: "High Priority" },
    { key: "medium", label: "Medium" },
    { key: "watch", label: "Watch" },
  ];

  return (
    <>
      <Topbar
        title={isLoading ? "Customers" : canAssign ? "Customer Assignment" : "My Customers"}
        subtitle={isLoading ? "Loading customer scope" : canAssign ? "Assign customer accounts to GSA operators" : "Only your assigned customer accounts and bookings"}
      />

      <main className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">{error}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<UserRound className="h-5 w-5" />} value={String(stats.total)} label="Active customers" accent="brand" />
          <StatCard icon={<TrendingDown className="h-5 w-5" />} value={String(stats.highPriority)} label="High priority" accent="danger" />
          <StatCard icon={<PackageCheck className="h-5 w-5" />} value={String(stats.activeShipments)} label="Active AWBs" accent="success" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} value={formatRevenue(stats.revenue)} label="Booked revenue" accent="warning" />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl border border-border-ui bg-surface p-1">
            {priorities.map((priority) => (
              <button
                key={priority.key}
                type="button"
                onClick={() => setPriorityFilter(priority.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  priorityFilter === priority.key ? "bg-brand text-white shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {priority.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input className="pl-9" placeholder="Search customer, email or route..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-ui py-16 text-center">
              <UserRound className="h-10 w-10 text-ink-muted/40" />
              <p className="mt-3 text-sm font-semibold text-ink-muted">
                {isLoading ? "Loading customers..." : "No customers found from current quotes or bookings."}
              </p>
              {!isLoading && (
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/gsa/quotes">Create customer quote</Link>
                </Button>
              )}
            </div>
          )}
          {filtered.map((customer) => {
            const priority = PRIORITY_CONFIG[customer.priority];
            const hasActiveShipment = customer.shipmentStatus === "booked";

            return (
              <Card key={customer.id} className="overflow-hidden">
                {customer.priority === "high" && <div className="h-1 bg-danger" />}
                {customer.priority === "medium" && <div className="h-1 bg-warning" />}

                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light">
                        <span className="text-sm font-bold text-brand">{customer.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-ink">{customer.name}</h3>
                        <p className="truncate text-xs text-ink-muted">{customer.contactPerson}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                      {customer.pendingInquiries > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                      {customer.pendingInquiries} airline approval
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border-ui bg-surface2 p-3">
                    {canAssign ? (
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                        Assigned owner
                        <Select
                          className="mt-2"
                          value={customer.assignedToEmail ?? ""}
                          disabled={assigningKey === customer.customerKey}
                          onChange={(event) => assignCustomer(customer, event.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {team.map((member) => (
                            <option key={member.email} value={member.email}>
                              {member.name} ({member.title})
                            </option>
                          ))}
                        </Select>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Owner</p>
                        <Badge variant="success">{customer.assignedToName ?? "Assigned to you"}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl border border-border-ui bg-surface2 p-3">
                    <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm font-semibold text-ink transition-colors hover:text-brand">
                      <Mail className="h-4 w-4 text-ink-muted" />
                      {customer.email}
                    </a>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
                      {customer.origin}
                      <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
                      {customer.destination}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
                      <span>{formatNumber(customer.monthlyVolume)} kg</span>
                      <span>{formatRevenue(customer.monthlyRevenue)}</span>
                      <span className={`font-semibold ${customer.yieldGap < 0 ? "text-danger" : customer.yieldGap === 0 ? "text-ink-muted" : "text-success"}`}>
                        {customer.yieldGap > 0 ? "+" : ""}{customer.yieldGap.toFixed(1)}% yield
                      </span>
                    </div>
                  </div>

                  {customer.awbNumber && (
                    <div className="mt-3 rounded-lg border border-border-ui bg-surface px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">AWB {customer.awbNumber}</p>
                      <p className={`text-xs font-semibold ${hasActiveShipment ? "text-brand" : "text-success"}`}>
                        {customer.shipmentStatus}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-muted">
                      Last activity: <span className="font-semibold text-ink">{formatDate(customer.lastContact)}</span>
                    </p>
                    <div className="flex gap-2">
                      {customer.openQuotes > 0 && (
                        <Button asChild size="sm" variant="outline">
                          <Link href="/gsa/quotes">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {customer.openQuotes} Quote{customer.openQuotes > 1 ? "s" : ""}
                          </Link>
                        </Button>
                      )}
                      {customer.awbNumber && (
                        <Button asChild size="sm" variant="outline">
                          <Link href="/gsa/shipments">Shipment</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}

function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: "brand" | "danger" | "success" | "warning";
}) {
  const colors = {
    brand: "bg-brand-light text-brand",
    danger: "bg-danger-bg text-danger",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
  };
  return (
    <Card>
      <div className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors[accent]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}
