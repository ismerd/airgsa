"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Priority = "high" | "medium" | "watch";

type Customer = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  origin: string;
  destination: string;
  priority: Priority;
  assignedTo: string;
  monthlyVolume: number;
  monthlyRevenue: number;
  yieldGap: number;
  lastContact: string;
  awbNumber?: string;
  shipmentStatus?: string;
  pendingInquiries: number;
  openQuotes: number;
};

const CUSTOMERS: Customer[] = [
  {
    id: "c-001",
    name: "DHL Express",
    contactPerson: "Thomas Müller",
    email: "thomas.mueller@dhl.com",
    phone: "+49 152 456 7890",
    origin: "MAD",
    destination: "DXB",
    priority: "high",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 82310,
    monthlyRevenue: 98385,
    yieldGap: -9.83,
    lastContact: "2026-05-13",
    awbNumber: "157-12345678",
    shipmentStatus: "In transit – Frankfurt hub",
    pendingInquiries: 1,
    openQuotes: 1,
  },
  {
    id: "c-002",
    name: "Alonso Forwarding Holding",
    contactPerson: "Carmen López",
    email: "c.lopez@alonso.es",
    phone: "+34 91 234 5678",
    origin: "MAD",
    destination: "DXB",
    priority: "high",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 73026,
    monthlyRevenue: 98385,
    yieldGap: -9.83,
    lastContact: "2026-05-14",
    awbNumber: "157-87654321",
    shipmentStatus: "Delivered – DXB",
    pendingInquiries: 0,
    openQuotes: 0,
  },
  {
    id: "c-003",
    name: "Universal Global Logistics",
    contactPerson: "Ahmed Hassan",
    email: "a.hassan@ugl.com",
    phone: "+49 69 9876 5432",
    origin: "MAD",
    destination: "DXB",
    priority: "medium",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 72035,
    monthlyRevenue: 81283,
    yieldGap: 7.73,
    lastContact: "2026-05-10",
    awbNumber: "157-11223344",
    shipmentStatus: "Booked – awaiting pickup",
    pendingInquiries: 0,
    openQuotes: 1,
  },
  {
    id: "c-004",
    name: "DSV Air & Sea",
    contactPerson: "Sofia Reyes",
    email: "s.reyes@dsv.com",
    phone: "+49 40 1234 5678",
    origin: "MAD",
    destination: "SHJ",
    priority: "high",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 52637,
    monthlyRevenue: 96125,
    yieldGap: -14.07,
    lastContact: "2026-05-08",
    awbNumber: "157-55667788",
    shipmentStatus: "In transit – SVO hub",
    pendingInquiries: 2,
    openQuotes: 1,
  },
  {
    id: "c-005",
    name: "Fashion Logistics",
    contactPerson: "Amara Diallo",
    email: "a.diallo@fashionlog.com",
    phone: "+33 1 5555 4444",
    origin: "MAD",
    destination: "CPT",
    priority: "medium",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 100970,
    monthlyRevenue: 533413,
    yieldGap: 13.9,
    lastContact: "2026-05-15",
    pendingInquiries: 0,
    openQuotes: 0,
  },
  {
    id: "c-006",
    name: "Schenker",
    contactPerson: "Henrik Larsson",
    email: "h.larsson@schenker.com",
    phone: "+49 30 8765 4321",
    origin: "MAD",
    destination: "CPT",
    priority: "watch",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 12279,
    monthlyRevenue: 73608,
    yieldGap: 1.99,
    lastContact: "2026-05-05",
    pendingInquiries: 0,
    openQuotes: 1,
  },
  {
    id: "c-007",
    name: "Tracosa",
    contactPerson: "Juan Martín",
    email: "j.martin@tracosa.es",
    phone: "+34 93 321 9876",
    origin: "MAD",
    destination: "DXB",
    priority: "medium",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 63968,
    monthlyRevenue: 94311,
    yieldGap: -5.83,
    lastContact: "2026-05-12",
    awbNumber: "157-99887766",
    shipmentStatus: "In transit – DOH hub",
    pendingInquiries: 1,
    openQuotes: 0,
  },
  {
    id: "c-008",
    name: "Globetainer Algeria",
    contactPerson: "Karim Benali",
    email: "k.benali@globetainer.dz",
    phone: "+213 21 456 789",
    origin: "ALG",
    destination: "YMQ",
    priority: "watch",
    assignedTo: "Lena Hartmann",
    monthlyVolume: 5690,
    monthlyRevenue: 13458,
    yieldGap: 0,
    lastContact: "2026-04-28",
    pendingInquiries: 0,
    openQuotes: 0,
  },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: "danger" | "warning" | "muted" }> = {
  high: { label: "High Priority", variant: "danger" },
  medium: { label: "Medium", variant: "warning" },
  watch: { label: "Watch", variant: "muted" },
};

type Toast = { message: string };
type TrackingState = Record<string, "idle" | "sending" | "sent">;
type ReplyState = Record<string, "idle" | "sent">;

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

function formatRevenue(n: number): string {
  if (n >= 1000000) return `€${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `€${(n / 1000).toFixed(0)}k`;
  return `€${n}`;
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [tracking, setTracking] = useState<TrackingState>({});
  const [replies, setReplies] = useState<ReplyState>({});
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string) {
    setToast({ message });
    setTimeout(() => setToast(null), 4000);
  }

  function handleTrack(customer: Customer) {
    setTracking((s) => ({ ...s, [customer.id]: "sending" }));
    setTimeout(() => {
      setTracking((s) => ({ ...s, [customer.id]: "sent" }));
      showToast(`Status inquiry sent to freight forwarder (AWB: ${customer.awbNumber}) — customer will be notified automatically`);
      setTimeout(() => setTracking((s) => ({ ...s, [customer.id]: "idle" })), 8000);
    }, 1200);
  }

  function handleReplyInquiry(customer: Customer) {
    setReplies((s) => ({ ...s, [customer.id]: "sent" }));
    showToast(`Automated status email sent to ${customer.contactPerson} at ${customer.email}`);
  }

  const filtered = useMemo(() => {
    return CUSTOMERS
      .filter((c) => priorityFilter === "all" || c.priority === priorityFilter)
      .filter((c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
        c.origin.includes(search.toUpperCase()) ||
        c.destination.includes(search.toUpperCase())
      );
  }, [search, priorityFilter]);

  const stats = useMemo(() => ({
    total: CUSTOMERS.length,
    highPriority: CUSTOMERS.filter((c) => c.priority === "high").length,
    activeShipments: CUSTOMERS.filter((c) => c.awbNumber && c.shipmentStatus && !c.shipmentStatus.startsWith("Delivered")).length,
    pendingInquiries: CUSTOMERS.reduce((sum, c) => sum + c.pendingInquiries, 0),
  }), []);

  const priorities: { key: Priority | "all"; label: string }[] = [
    { key: "all", label: "All Customers" },
    { key: "high", label: "High Priority" },
    { key: "medium", label: "Medium" },
    { key: "watch", label: "Watch" },
  ];

  return (
    <>
      <Topbar title="My Customers" subtitle="Assigned customer portfolio" />

      <main className="space-y-5 p-5">
        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<UserRound className="h-5 w-5" />} value={String(stats.total)} label="Assigned Customers" accent="brand" />
          <StatCard icon={<TrendingDown className="h-5 w-5" />} value={String(stats.highPriority)} label="High Priority" accent="danger" />
          <StatCard icon={<ArrowRight className="h-5 w-5" />} value={String(stats.activeShipments)} label="Active Shipments" accent="success" />
          <StatCard icon={<MessageSquare className="h-5 w-5" />} value={String(stats.pendingInquiries)} label="Pending Inquiries" accent="warning" />
        </section>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl border border-border-ui bg-surface p-1">
            {priorities.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPriorityFilter(p.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  priorityFilter === p.key
                    ? "bg-brand text-white shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              className="pl-9"
              placeholder="Search customer or route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Customer grid */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-2">
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-ui py-16 text-center">
              <UserRound className="h-10 w-10 text-ink-muted/40" />
              <p className="mt-3 text-sm font-semibold text-ink-muted">No customers found</p>
            </div>
          )}
          {filtered.map((customer) => {
            const priority = PRIORITY_CONFIG[customer.priority];
            const trackState = tracking[customer.id] ?? "idle";
            const replyState = replies[customer.id] ?? "idle";
            const hasActiveShipment = customer.awbNumber && customer.shipmentStatus && !customer.shipmentStatus.startsWith("Delivered");

            return (
              <Card key={customer.id} className="overflow-hidden">
                {/* Priority stripe */}
                {customer.priority === "high" && (
                  <div className="h-1 bg-danger" />
                )}
                {customer.priority === "medium" && (
                  <div className="h-1 bg-warning" />
                )}

                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light">
                        <span className="text-sm font-bold text-brand">{customer.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-ink">{customer.name}</h3>
                        <p className="text-xs text-ink-muted">{customer.contactPerson}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={priority.variant}>{priority.label}</Badge>
                      {customer.pendingInquiries > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                          {customer.pendingInquiries} inquiry
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 space-y-1.5 rounded-xl border border-border-ui bg-surface2 p-3">
                    <a
                      href={`tel:${customer.phone}`}
                      className="flex items-center gap-2 text-sm font-semibold text-ink transition-colors hover:text-brand"
                    >
                      <Phone className="h-4 w-4 text-ink-muted" />
                      {customer.phone}
                    </a>
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-2 text-xs text-ink-muted transition-colors hover:text-brand"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {customer.email}
                    </a>
                  </div>

                  {/* Route + stats */}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
                      {customer.origin}
                      <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
                      {customer.destination}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
                      <span>{formatNumber(customer.monthlyVolume)} kg/mo</span>
                      <span>{formatRevenue(customer.monthlyRevenue)}/mo</span>
                      <span className={`font-semibold ${customer.yieldGap < 0 ? "text-danger" : customer.yieldGap === 0 ? "text-ink-muted" : "text-success"}`}>
                        {customer.yieldGap > 0 ? "+" : ""}{customer.yieldGap.toFixed(1)}% yield
                      </span>
                    </div>
                  </div>

                  {/* Shipment status */}
                  {customer.awbNumber && (
                    <div className="mt-3 rounded-lg border border-border-ui bg-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">AWB {customer.awbNumber}</p>
                          <p className={`text-xs font-semibold ${hasActiveShipment ? "text-brand" : "text-success"}`}>
                            {customer.shipmentStatus}
                          </p>
                        </div>
                        {hasActiveShipment && trackState !== "sent" && (
                          <button
                            type="button"
                            onClick={() => handleTrack(customer)}
                            disabled={trackState === "sending"}
                            className="shrink-0 rounded-lg border border-brand/25 bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white disabled:opacity-50"
                          >
                            {trackState === "sending" ? "Sending…" : "Ask Forwarder"}
                          </button>
                        )}
                        {trackState === "sent" && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Inquiry sent
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Last contact + actions */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-ink-muted">
                      Last contact: <span className="font-semibold text-ink">{formatDate(customer.lastContact)}</span>
                    </p>
                    <div className="flex gap-2">
                      {customer.pendingInquiries > 0 && replyState === "idle" && (
                        <Button size="sm" onClick={() => handleReplyInquiry(customer)}>
                          <Mail className="h-3.5 w-3.5" />
                          Reply to Inquiry
                        </Button>
                      )}
                      {replyState === "sent" && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Reply sent
                        </span>
                      )}
                      {customer.openQuotes > 0 && (
                        <Button size="sm" variant="outline">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {customer.openQuotes} Quote{customer.openQuotes > 1 ? "s" : ""}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-[#0B7A52]/25 bg-success-bg px-5 py-3.5 shadow-2xl">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-sm font-semibold text-success">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="ml-auto shrink-0 text-success/60 hover:text-success">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
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
