"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Package,
  Plane,
  Search,
  Send,
  X,
} from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ShipmentStatus = "booked" | "in-transit" | "arriving" | "delivered" | "delayed";

type Shipment = {
  id: string;
  awb: string;
  customer: string;
  contactEmail: string;
  origin: string;
  destination: string;
  weight: number;
  pieces: number;
  flight: string;
  departure: string;
  eta: string;
  status: ShipmentStatus;
  milestone: string;
  location: string;
};

const SHIPMENTS: Shipment[] = [
  { id: "s-001", awb: "157-12345678", customer: "DHL Express", contactEmail: "thomas.mueller@dhl.com", origin: "MAD", destination: "DXB", weight: 2450, pieces: 8, flight: "SV264", departure: "2026-05-16", eta: "2026-05-17", status: "in-transit", milestone: "Departed origin", location: "FRA hub" },
  { id: "s-002", awb: "157-55667788", customer: "DSV Air & Sea", contactEmail: "s.reyes@dsv.com", origin: "MAD", destination: "SHJ", weight: 1820, pieces: 4, flight: "SV180", departure: "2026-05-15", eta: "2026-05-17", status: "arriving", milestone: "Arrived transit hub", location: "RUH hub" },
  { id: "s-003", awb: "157-99887766", customer: "Tracosa", contactEmail: "j.martin@tracosa.es", origin: "MAD", destination: "DXB", weight: 3100, pieces: 10, flight: "SV264", departure: "2026-05-15", eta: "2026-05-18", status: "in-transit", milestone: "In transit", location: "DOH hub" },
  { id: "s-004", awb: "157-11223344", customer: "Universal Global Logistics", contactEmail: "a.hassan@ugl.com", origin: "MAD", destination: "DXB", weight: 890, pieces: 3, flight: "SV266", departure: "2026-05-17", eta: "2026-05-17", status: "arriving", milestone: "Cleared customs", location: "DXB" },
  { id: "s-005", awb: "157-87654321", customer: "Alonso Forwarding", contactEmail: "c.lopez@alonso.es", origin: "MAD", destination: "DXB", weight: 3100, pieces: 10, flight: "SV264", departure: "2026-05-14", eta: "2026-05-15", status: "delivered", milestone: "Delivered to consignee", location: "DXB" },
  { id: "s-006", awb: "157-33445566", customer: "Schenker", contactEmail: "h.larsson@schenker.com", origin: "MAD", destination: "CPT", weight: 2200, pieces: 6, flight: "SV820", departure: "2026-05-19", eta: "2026-05-21", status: "booked", milestone: "AWB issued", location: "MAD" },
  { id: "s-007", awb: "157-77889900", customer: "Fashion Logistics", contactEmail: "a.diallo@fashionlog.com", origin: "MAD", destination: "CPT", weight: 6200, pieces: 22, flight: "SV818", departure: "2026-05-16", eta: "2026-05-18", status: "delayed", milestone: "Flight delayed 6h", location: "MAD — gate delay" },
  { id: "s-008", awb: "157-22334455", customer: "DHL Express", contactEmail: "thomas.mueller@dhl.com", origin: "MAD", destination: "DXB", weight: 1600, pieces: 5, flight: "SV264", departure: "2026-05-17", eta: "2026-05-19", status: "booked", milestone: "Acceptance confirmed", location: "MAD warehouse" },
];

const STATUS: Record<ShipmentStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "muted"; icon: typeof Plane }> = {
  "booked":     { label: "Booked",         variant: "muted",    icon: Package },
  "in-transit": { label: "In Transit",     variant: "default",  icon: Plane },
  "arriving":   { label: "Arriving Today", variant: "success",  icon: CheckCircle2 },
  "delivered":  { label: "Delivered",      variant: "success",  icon: CheckCircle2 },
  "delayed":    { label: "Delayed",        variant: "danger",   icon: AlertCircle },
};

type Tab = "all" | ShipmentStatus;
type Toast = { message: string; type: "success" | "info" };
type TrackState = Record<string, "idle" | "loading" | "done">;

export default function ShipmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [tracking, setTracking] = useState<TrackState>({});
  const [notified, setNotified] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [statementOpen, setStatementOpen] = useState<Shipment | null>(null);
  const [statementSent, setStatementSent] = useState<Record<string, boolean>>({});

  function showToast(message: string, type: Toast["type"] = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleTrack(s: Shipment) {
    setTracking((t) => ({ ...t, [s.id]: "loading" }));
    setTimeout(() => {
      setTracking((t) => ({ ...t, [s.id]: "done" }));
      showToast(`AWB ${s.awb} — ${s.milestone} · ${s.location}`, "info");
    }, 1200);
  }

  function handleNotify(s: Shipment) {
    setNotified((n) => ({ ...n, [s.id]: true }));
    showToast(`Status email sent to ${s.contactEmail}`);
  }

  function handleSendStatement(s: Shipment) {
    setStatementSent((st) => ({ ...st, [s.id]: true }));
    setStatementOpen(null);
    showToast(`Delay statement sent to ${s.contactEmail}`);
  }

  const counts = useMemo(() => ({
    all: SHIPMENTS.length,
    "booked": SHIPMENTS.filter((s) => s.status === "booked").length,
    "in-transit": SHIPMENTS.filter((s) => s.status === "in-transit").length,
    "arriving": SHIPMENTS.filter((s) => s.status === "arriving").length,
    "delivered": SHIPMENTS.filter((s) => s.status === "delivered").length,
    "delayed": SHIPMENTS.filter((s) => s.status === "delayed").length,
  }), []);

  const filtered = useMemo(() =>
    SHIPMENTS
      .filter((s) => activeTab === "all" || s.status === activeTab)
      .filter((s) => !search || s.awb.includes(search) || s.customer.toLowerCase().includes(search.toLowerCase()) || s.origin.includes(search.toUpperCase()) || s.destination.includes(search.toUpperCase())),
    [activeTab, search]
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "delayed", label: "Delayed" },
    { id: "arriving", label: "Arriving Today" },
    { id: "in-transit", label: "In Transit" },
    { id: "booked", label: "Booked" },
    { id: "delivered", label: "Delivered" },
  ];

  return (
    <>
      <Topbar title="Active Shipments" subtitle="Live AWB monitor" />
      <main className="space-y-5 p-5">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active AWBs" value={String(counts["in-transit"] + counts["arriving"] + counts["booked"])} accent="brand" icon={<Package className="h-5 w-5" />} />
          <StatCard label="In Transit" value={String(counts["in-transit"])} accent="brand" icon={<Plane className="h-5 w-5" />} />
          <StatCard label="Arriving Today" value={String(counts["arriving"])} accent="success" icon={<CheckCircle2 className="h-5 w-5" />} />
          <StatCard label="Delayed" value={String(counts["delayed"])} accent={counts["delayed"] > 0 ? "danger" : "success"} icon={<AlertCircle className="h-5 w-5" />} />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-xl border border-border-ui bg-surface p-1">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === t.id ? (t.id === "delayed" ? "bg-danger text-white" : "bg-brand text-white") : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === t.id ? "bg-white/20 text-white" : "bg-surface2 text-ink-muted"}`}>
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input className="pl-9" placeholder="AWB, customer, route…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border-ui">
                    {["AWB", "Customer", "Route", "Weight", "Flight / Dep.", "Status", "ETA", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-ui">
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-muted">No shipments found</td></tr>
                  )}
                  {filtered.map((s) => {
                    const st = STATUS[s.status];
                    const Icon = st.icon;
                    const isTracking = tracking[s.id] === "loading";
                    const isTracked = tracking[s.id] === "done";
                    return (
                      <tr key={s.id} className={`transition-colors hover:bg-surface2 ${s.status === "delayed" ? "bg-danger-bg/30" : ""}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-ink">{s.awb}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{s.customer}</p>
                          <p className="text-xs text-ink-muted">{s.location}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 font-mono text-sm font-semibold text-ink">
                            {s.origin} <ArrowRight className="h-3 w-3 text-ink-muted" /> {s.destination}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {s.weight.toLocaleString()} kg<br />
                          <span className="text-xs">{s.pieces} pcs</span>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          <span className="font-semibold text-ink">{s.flight}</span><br />
                          <span className="text-xs">{s.departure}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={st.variant} className="flex w-fit items-center gap-1">
                            <Icon className="h-3 w-3" />
                            {st.label}
                          </Badge>
                          {s.status === "delayed" && (
                            <p className="mt-1 text-[11px] text-danger">{s.milestone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${s.status === "arriving" ? "text-success" : s.status === "delayed" ? "text-danger" : "text-ink"}`}>
                            {s.eta}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTrack(s)}
                              disabled={isTracking}
                              title="Track AWB"
                              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                isTracked
                                  ? "border-success/25 bg-success-bg text-success"
                                  : "border-border-ui bg-surface text-ink-muted hover:border-brand/30 hover:text-brand"
                              }`}
                            >
                              {isTracking ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" /> : isTracked ? <CheckCircle2 className="h-3 w-3" /> : <Search className="h-3 w-3" />}
                            </button>
                            {s.status !== "delivered" && (
                              <button
                                type="button"
                                onClick={() => handleNotify(s)}
                                disabled={notified[s.id]}
                                title="Notify customer"
                                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                  notified[s.id]
                                    ? "border-success/25 bg-success-bg text-success"
                                    : "border-border-ui bg-surface text-ink-muted hover:border-brand/30 hover:text-brand"
                                }`}
                              >
                                {notified[s.id] ? <CheckCircle2 className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                              </button>
                            )}
                            {s.status === "delayed" && (
                              <button
                                type="button"
                                onClick={() => setStatementOpen(s)}
                                title="Generate delay statement"
                                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                  statementSent[s.id]
                                    ? "border-success/25 bg-success-bg text-success"
                                    : "border-danger/25 bg-danger-bg text-danger hover:border-danger/50"
                                }`}
                              >
                                {statementSent[s.id] ? <CheckCircle2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-xl border px-5 py-3.5 shadow-2xl ${
          toast.type === "success" ? "border-[#0B7A52]/25 bg-success-bg text-success" : "border-brand/25 bg-brand-light text-brand"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <Clock className="h-5 w-5 shrink-0" />}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100"><X className="h-4 w-4" /></button>
        </div>
      )}

      {statementOpen && (
        <DelayStatementModal
          shipment={statementOpen}
          onSend={() => handleSendStatement(statementOpen)}
          onClose={() => setStatementOpen(null)}
        />
      )}
    </>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "brand" | "success" | "danger" }) {
  const c = { brand: "bg-brand-light text-brand", success: "bg-success-bg text-success", danger: "bg-danger-bg text-danger" };
  return (
    <Card>
      <div className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c[accent]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function DelayStatementModal({ shipment: s, onSend, onClose }: { shipment: Shipment; onSend: () => void; onClose: () => void }) {
  const today = "17 May 2026";
  const [sending, setSending] = useState(false);

  function handleSend() {
    setSending(true);
    setTimeout(() => { onSend(); }, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border-ui bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-ui px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-bg">
              <FileText className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">Operational Delay Statement</p>
              <p className="text-xs text-ink-muted">Auto-generated · PDF ready to send</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        {/* Letter preview */}
        <div className="mx-6 my-4 rounded-xl border border-border-ui bg-white p-5 font-mono text-[11px] leading-relaxed text-gray-800">
          <div className="mb-4 border-b border-gray-200 pb-3">
            <p className="text-base font-bold tracking-wide text-gray-900">SAUDIA CARGO — OPERATIONAL STATEMENT</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-gray-400">Authorized Cargo Representative · Spain</p>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <p><span className="font-semibold text-gray-500">Date:</span> {today}</p>
            <p><span className="font-semibold text-gray-500">AWB:</span> {s.awb}</p>
            <p><span className="font-semibold text-gray-500">To:</span> {s.customer}</p>
            <p><span className="font-semibold text-gray-500">Email:</span> {s.contactEmail}</p>
            <p><span className="font-semibold text-gray-500">Flight:</span> {s.flight}</p>
            <p><span className="font-semibold text-gray-500">Route:</span> {s.origin} → {s.destination}</p>
          </div>
          <p className="mb-3 font-semibold text-gray-700">Subject: Cargo Offload — Operational Delay</p>
          <p className="mb-2 text-[11px] text-gray-700">
            We hereby confirm that the above-referenced shipment could not be loaded on flight {s.flight} on {s.departure} due to <span className="font-semibold">operational reasons</span> (aircraft weight/balance restrictions — passenger load exceeded cargo allocation).
          </p>
          <p className="mb-2 text-[11px] text-gray-700">
            The shipment has been prioritized for the next available flight. Revised ETA: <span className="font-semibold">{s.eta}</span>.
          </p>
          <p className="mb-4 text-[11px] text-gray-700">
            We sincerely apologize for any inconvenience and assure you that every effort is being made to deliver your cargo at the earliest opportunity.
          </p>
          <div className="mt-4 flex items-end justify-between border-t border-gray-200 pt-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-800">Authorized Signatory</p>
              <p className="mt-3 border-b border-gray-400 pb-0.5 text-[11px] italic text-gray-500">Saudia Cargo GSA — Spain</p>
              <p className="mt-1 text-[10px] text-gray-400">AIRGSA · Cargo Representative</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-300">
              <p className="text-[9px] font-bold uppercase text-gray-400 text-center leading-tight">Official<br/>Stamp</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-border-ui px-6 py-4">
          <p className="text-xs text-ink-muted">Will be sent to <span className="font-semibold text-ink">{s.contactEmail}</span></p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 bg-danger text-white hover:bg-danger/90"
            >
              {sending ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sending ? "Sending…" : "Send to Freight Forwarder"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
