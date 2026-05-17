"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Package,
  Plane,
  Plus,
  Search,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { EcargowareOperation } from "@/lib/integrations/ecargoware-catalog";

type Tab = "rates" | "bookings" | "tracking";
type BookingSubView = "create" | "search" | "update" | "cancel";

type ExecutionResult = {
  mode?: "live" | "mock";
  status?: number | "not-configured";
  ok?: boolean;
  response?: unknown;
  message?: string;
  error?: string;
};

type RateForm = {
  origin: string;
  destination: string;
  carrier: string;
  productType: string;
  grossWeight: string;
  pieces: string;
  flightDate: string;
};

type BookingForm = {
  awbNo: string;
  customerName: string;
  iataNo: string;
  origin: string;
  destination: string;
  flight: string;
  flightDate: string;
  grossWeight: string;
  chargeWeight: string;
  pieces: string;
  productType: string;
  commodity: string;
  stackable: string;
  cancelReturn: string;
  searchFromDate: string;
  searchToDate: string;
};

type TrackForm = {
  awbNo: string;
  awbNos: string;
};

const PRODUCT_TYPES = ["General", "Pharma", "Express", "Perishables", "Automotive", "Fashion & Apparel", "Electronics", "Dangerous Goods"];

const emptyRate: RateForm = { origin: "", destination: "", carrier: "SV", productType: "General", grossWeight: "", pieces: "", flightDate: "2026-06-01" };
const emptyBooking: BookingForm = { awbNo: "", customerName: "", iataNo: "", origin: "", destination: "", flight: "", flightDate: "2026-06-01", grossWeight: "", chargeWeight: "", pieces: "", productType: "GENERAL", commodity: "", stackable: "Y", cancelReturn: "GSA", searchFromDate: "2026-06-01", searchToDate: "2026-06-30" };
const emptyTrack: TrackForm = { awbNo: "", awbNos: "" };

export function CargoWorkspaceClient({ operations }: { operations: EcargowareOperation[] }) {
  const [tab, setTab] = useState<Tab>("rates");
  const [bookingView, setBookingView] = useState<BookingSubView>("create");
  const [rateForm, setRateForm] = useState<RateForm>(emptyRate);
  const [bookingForm, setBookingForm] = useState<BookingForm>(emptyBooking);
  const [trackForm, setTrackForm] = useState<TrackForm>(emptyTrack);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [confirmedCancel, setConfirmedCancel] = useState(false);

  function hasOperation(id: string) {
    return operations.some((op) => op.id === id);
  }

  async function callApi(operationId: string, payload: object) {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/ecargoware/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationId, ...payload }),
      });
      setResult((await res.json()) as ExecutionResult);
    } catch {
      setResult({ error: "Cargo system unreachable. Check your connection." });
    } finally {
      setRunning(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setResult(null);
    setConfirmedCancel(false);
  }

  function bookFromRate() {
    setBookingForm((f) => ({
      ...f,
      origin: rateForm.origin,
      destination: rateForm.destination,
      flightDate: rateForm.flightDate,
      grossWeight: rateForm.grossWeight,
      chargeWeight: rateForm.grossWeight,
      pieces: rateForm.pieces,
      productType: rateForm.productType,
    }));
    setTab("bookings");
    setBookingView("create");
    setResult(null);
  }

  function trackFromBooking(awb: string) {
    setTrackForm({ awbNo: awb, awbNos: "" });
    setTab("tracking");
    setResult(null);
  }

  const TABS: { id: Tab; label: string; sub: string; icon: ReactNode }[] = [
    { id: "rates", label: "Rates & Routes", sub: "Find capacity & pricing", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "bookings", label: "Bookings", sub: "Create, search, update", icon: <Plane className="h-4 w-4" /> },
    { id: "tracking", label: "Tracking", sub: "AWB status & milestones", icon: <Search className="h-4 w-4" /> },
  ];

  const BOOKING_VIEWS: { id: BookingSubView; label: string; danger?: boolean }[] = [
    { id: "create", label: "+ Create" },
    { id: "search", label: "Search" },
    { id: "update", label: "Update" },
    { id: "cancel", label: "Cancel", danger: true },
  ];

  return (
    <div className="space-y-5">
      {/* Daily stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Plane className="h-4 w-4" />} label="Bookings today" value="6" accent="success" />
        <StatCard icon={<Package className="h-4 w-4" />} label="Open AWBs" value="14" accent="brand" />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Rate queries" value="9" accent="brand" />
        <StatCard icon={<Zap className="h-4 w-4" />} label="Pending confirm" value="2" accent="warning" />
      </div>

      {/* Tab navigation */}
      <Card className="p-2">
        <div className="grid gap-1 sm:grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                tab === t.id
                  ? "bg-brand text-white shadow-[0_4px_14px_rgba(26,90,255,0.22)]"
                  : "text-ink-muted hover:bg-surface2 hover:text-ink"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tab === t.id ? "bg-white/15" : "bg-surface2"}`}>
                {t.icon}
              </span>
              <span>
                <span className="block text-sm font-bold">{t.label}</span>
                <span className={`block text-xs ${tab === t.id ? "text-white/70" : "text-ink-muted"}`}>{t.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* ─── RATES & ROUTES ─────────────────────────────────────── */}
      {tab === "rates" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand" />
                Rate Finder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Origin (IATA)">
                  <Input value={rateForm.origin} onChange={(e) => setRateForm((f) => ({ ...f, origin: e.target.value.toUpperCase() }))} placeholder="FRA" maxLength={3} className="font-mono uppercase" />
                </Field>
                <Field label="Destination (IATA)">
                  <Input value={rateForm.destination} onChange={(e) => setRateForm((f) => ({ ...f, destination: e.target.value.toUpperCase() }))} placeholder="JED" maxLength={3} className="font-mono uppercase" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Carrier">
                  <Input value={rateForm.carrier} onChange={(e) => setRateForm((f) => ({ ...f, carrier: e.target.value.toUpperCase() }))} placeholder="SV" maxLength={2} />
                </Field>
                <Field label="Gross weight (kg)">
                  <Input type="number" value={rateForm.grossWeight} onChange={(e) => setRateForm((f) => ({ ...f, grossWeight: e.target.value }))} placeholder="840" />
                </Field>
                <Field label="Pieces">
                  <Input type="number" value={rateForm.pieces} onChange={(e) => setRateForm((f) => ({ ...f, pieces: e.target.value }))} placeholder="18" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product type">
                  <select
                    value={rateForm.productType}
                    onChange={(e) => setRateForm((f) => ({ ...f, productType: e.target.value }))}
                    className="h-10 w-full rounded-md border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
                  >
                    {PRODUCT_TYPES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
                <Field label="Flight date">
                  <Input type="date" value={rateForm.flightDate} onChange={(e) => setRateForm((f) => ({ ...f, flightDate: e.target.value }))} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button onClick={() => callApi("rates-find-rates", { body: { carrierCode: rateForm.carrier, origin: rateForm.origin, destination: rateForm.destination, productType: rateForm.productType, grossWeight: Number(rateForm.grossWeight), chargeWeight: Number(rateForm.grossWeight), flightDate: rateForm.flightDate } })} disabled={running || !rateForm.origin || !rateForm.destination || !hasOperation("rates-find-rates")}>
                  <TrendingUp className="h-4 w-4" />
                  {running ? "Searching…" : "Find Rates"}
                </Button>
                <Button variant="outline" onClick={() => callApi("flights-find-routes", { body: { carrierCode: rateForm.carrier, origin: rateForm.origin, destination: rateForm.destination } })} disabled={running || !rateForm.origin || !rateForm.destination || !hasOperation("flights-find-routes")}>
                  <Plane className="h-4 w-4" />
                  Find Routes
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <ApiResult result={result} running={running} label="Rate results" successLabel="Rates retrieved" />
            {result?.ok && (
              <Card>
                <CardContent className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Available rates · {rateForm.origin} → {rateForm.destination}</p>
                  <div className="space-y-2">
                    {[
                      { product: "General", rate: 1.85, min: "45 kg" },
                      { product: "Express", rate: 2.40, min: "100 kg" },
                      { product: rateForm.productType !== "General" ? rateForm.productType : "Pharma", rate: 3.20, min: "45 kg" },
                    ].map((r) => (
                      <div key={r.product} className="flex items-center justify-between gap-3 rounded-lg border border-border-ui bg-surface2 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-ink">{r.product}</p>
                          <p className="text-xs text-ink-muted">min {r.min}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-ink">EUR {r.rate.toFixed(2)}/kg</span>
                          <button type="button" onClick={bookFromRate} className="rounded-md bg-brand px-2 py-1 text-[11px] font-bold text-white hover:bg-brand-dark">
                            Book
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── BOOKINGS ────────────────────────────────────────────── */}
      {tab === "bookings" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-brand" />
                Bookings
              </CardTitle>
              <div className="flex gap-1">
                {BOOKING_VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setBookingView(v.id); setResult(null); setConfirmedCancel(false); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      bookingView === v.id
                        ? v.danger ? "bg-danger text-white" : "bg-brand text-white"
                        : v.danger ? "text-danger hover:bg-danger-bg" : "text-ink-muted hover:bg-surface2 hover:text-ink"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Create */}
              {bookingView === "create" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Customer / Agent name">
                      <Input value={bookingForm.customerName} onChange={(e) => setBookingForm((f) => ({ ...f, customerName: e.target.value }))} placeholder="DHL Global Forwarding" />
                    </Field>
                    <Field label="IATA number">
                      <Input value={bookingForm.iataNo} onChange={(e) => setBookingForm((f) => ({ ...f, iataNo: e.target.value }))} placeholder="12345678901" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Origin">
                      <Input value={bookingForm.origin} onChange={(e) => setBookingForm((f) => ({ ...f, origin: e.target.value.toUpperCase() }))} placeholder="FRA" maxLength={3} className="font-mono uppercase" />
                    </Field>
                    <Field label="Destination">
                      <Input value={bookingForm.destination} onChange={(e) => setBookingForm((f) => ({ ...f, destination: e.target.value.toUpperCase() }))} placeholder="JED" maxLength={3} className="font-mono uppercase" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Flight number">
                      <Input value={bookingForm.flight} onChange={(e) => setBookingForm((f) => ({ ...f, flight: e.target.value.toUpperCase() }))} placeholder="SV170" />
                    </Field>
                    <Field label="Flight date">
                      <Input type="date" value={bookingForm.flightDate} onChange={(e) => setBookingForm((f) => ({ ...f, flightDate: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Gross weight (kg)">
                      <Input type="number" value={bookingForm.grossWeight} onChange={(e) => setBookingForm((f) => ({ ...f, grossWeight: e.target.value }))} placeholder="840" />
                    </Field>
                    <Field label="Chargeable wt (kg)">
                      <Input type="number" value={bookingForm.chargeWeight} onChange={(e) => setBookingForm((f) => ({ ...f, chargeWeight: e.target.value }))} placeholder="840" />
                    </Field>
                    <Field label="Pieces">
                      <Input type="number" value={bookingForm.pieces} onChange={(e) => setBookingForm((f) => ({ ...f, pieces: e.target.value }))} placeholder="18" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Product type">
                      <select value={bookingForm.productType} onChange={(e) => setBookingForm((f) => ({ ...f, productType: e.target.value }))} className="h-10 w-full rounded-md border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand">
                        {PRODUCT_TYPES.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Stackable">
                      <select value={bookingForm.stackable} onChange={(e) => setBookingForm((f) => ({ ...f, stackable: e.target.value }))} className="h-10 w-full rounded-md border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand">
                        <option value="Y">Yes</option>
                        <option value="N">No</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Commodity description">
                    <Textarea value={bookingForm.commodity} onChange={(e) => setBookingForm((f) => ({ ...f, commodity: e.target.value }))} placeholder="General cargo, palletized, temp controlled…" className="min-h-20" />
                  </Field>
                  <Button className="w-full" disabled={running || !bookingForm.origin || !bookingForm.destination || !bookingForm.customerName || !hasOperation("bookings-create")} onClick={() => callApi("bookings-create", { body: { origin: bookingForm.origin, destination: bookingForm.destination, grossweight: Number(bookingForm.grossWeight), chargeweight: Number(bookingForm.chargeWeight || bookingForm.grossWeight), pieces: Number(bookingForm.pieces), flight: bookingForm.flight, flightDate: bookingForm.flightDate, commodity: bookingForm.commodity || bookingForm.productType, agentName: bookingForm.customerName, iataNo: bookingForm.iataNo, productType: bookingForm.productType, stackable: bookingForm.stackable } })}>
                    <Plus className="h-4 w-4" />
                    {running ? "Creating…" : "Create Booking"}
                  </Button>
                </>
              )}

              {/* Search */}
              {bookingView === "search" && (
                <>
                  <Field label="AWB number (optional)">
                    <Input value={bookingForm.awbNo} onChange={(e) => setBookingForm((f) => ({ ...f, awbNo: e.target.value }))} placeholder="16012345678" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Origin">
                      <Input value={bookingForm.origin} onChange={(e) => setBookingForm((f) => ({ ...f, origin: e.target.value.toUpperCase() }))} placeholder="FRA" maxLength={3} className="font-mono uppercase" />
                    </Field>
                    <Field label="Destination">
                      <Input value={bookingForm.destination} onChange={(e) => setBookingForm((f) => ({ ...f, destination: e.target.value.toUpperCase() }))} placeholder="JED" maxLength={3} className="font-mono uppercase" />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Flight from">
                      <Input type="date" value={bookingForm.searchFromDate} onChange={(e) => setBookingForm((f) => ({ ...f, searchFromDate: e.target.value }))} />
                    </Field>
                    <Field label="Flight to">
                      <Input type="date" value={bookingForm.searchToDate} onChange={(e) => setBookingForm((f) => ({ ...f, searchToDate: e.target.value }))} />
                    </Field>
                  </div>
                  <Field label="IATA number (optional)">
                    <Input value={bookingForm.iataNo} onChange={(e) => setBookingForm((f) => ({ ...f, iataNo: e.target.value }))} placeholder="12345678901" />
                  </Field>
                  <Button className="w-full" disabled={running || !hasOperation("bookings-search")} onClick={() => callApi("bookings-search", { queryParams: { origin: bookingForm.origin, destination: bookingForm.destination, ...(bookingForm.awbNo && { awbNo: bookingForm.awbNo }), ...(bookingForm.iataNo && { iataNo: bookingForm.iataNo }), flightFromDate: bookingForm.searchFromDate, flightToDate: bookingForm.searchToDate } })}>
                    <Search className="h-4 w-4" />
                    {running ? "Searching…" : "Search Bookings"}
                  </Button>
                </>
              )}

              {/* Update */}
              {bookingView === "update" && (
                <>
                  <Field label="AWB number (required)">
                    <Input value={bookingForm.awbNo} onChange={(e) => setBookingForm((f) => ({ ...f, awbNo: e.target.value }))} placeholder="16012345678" />
                  </Field>
                  <p className="text-xs text-ink-muted">Only fill in the fields you want to update — empty fields are ignored.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="New flight number">
                      <Input value={bookingForm.flight} onChange={(e) => setBookingForm((f) => ({ ...f, flight: e.target.value.toUpperCase() }))} placeholder="SV170" />
                    </Field>
                    <Field label="New flight date">
                      <Input type="date" value={bookingForm.flightDate} onChange={(e) => setBookingForm((f) => ({ ...f, flightDate: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Gross weight (kg)">
                      <Input type="number" value={bookingForm.grossWeight} onChange={(e) => setBookingForm((f) => ({ ...f, grossWeight: e.target.value }))} />
                    </Field>
                    <Field label="Chargeable wt">
                      <Input type="number" value={bookingForm.chargeWeight} onChange={(e) => setBookingForm((f) => ({ ...f, chargeWeight: e.target.value }))} />
                    </Field>
                    <Field label="Pieces">
                      <Input type="number" value={bookingForm.pieces} onChange={(e) => setBookingForm((f) => ({ ...f, pieces: e.target.value }))} />
                    </Field>
                  </div>
                  <Button className="w-full" disabled={running || !bookingForm.awbNo || !hasOperation("bookings-update")} onClick={() => callApi("bookings-update", { body: { awbNo: bookingForm.awbNo, ...(bookingForm.grossWeight && { grossweight: Number(bookingForm.grossWeight) }), ...(bookingForm.chargeWeight && { chargeweight: Number(bookingForm.chargeWeight) }), ...(bookingForm.pieces && { pieces: Number(bookingForm.pieces) }), ...(bookingForm.flight && { flight: bookingForm.flight }), ...(bookingForm.flightDate && { flightDate: bookingForm.flightDate }) } })}>
                    {running ? "Saving…" : "Update Booking"}
                  </Button>
                </>
              )}

              {/* Cancel */}
              {bookingView === "cancel" && (
                <>
                  <div className="rounded-xl border border-danger/25 bg-danger-bg p-4">
                    <p className="text-sm font-semibold text-danger">Cancelling a booking releases the AWB and capacity. This cannot be undone.</p>
                  </div>
                  <Field label="AWB number">
                    <Input value={bookingForm.awbNo} onChange={(e) => setBookingForm((f) => ({ ...f, awbNo: e.target.value }))} placeholder="16012345678" />
                  </Field>
                  <Field label="Return AWB to">
                    <select value={bookingForm.cancelReturn} onChange={(e) => setBookingForm((f) => ({ ...f, cancelReturn: e.target.value }))} className="h-10 w-full rounded-md border border-border-ui bg-surface px-3 text-sm text-ink outline-none focus:border-brand">
                      <option value="GSA">GSA</option>
                      <option value="Agent">Agent</option>
                      <option value="Airline">Airline</option>
                    </select>
                  </Field>
                  {!confirmedCancel ? (
                    <Button variant="outline" className="w-full border-danger/25 text-danger hover:bg-danger-bg" disabled={!bookingForm.awbNo} onClick={() => setConfirmedCancel(true)}>
                      <X className="h-4 w-4" />
                      Confirm Cancel
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button variant="destructive" className="w-full" disabled={running || !bookingForm.awbNo || !hasOperation("bookings-cancel")} onClick={() => callApi("bookings-cancel", { body: { awbNo: bookingForm.awbNo, returnAwbTo: bookingForm.cancelReturn } })}>
                        {running ? "Cancelling…" : `Cancel AWB ${bookingForm.awbNo}`}
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setConfirmedCancel(false)}>Go back</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Booking result */}
          <div className="space-y-4">
            <ApiResult result={result} running={running} label={bookingView === "search" ? "Search results" : bookingView === "create" ? "Booking confirmation" : bookingView === "update" ? "Update status" : "Cancellation status"} successLabel={bookingView === "create" ? "Booking created" : bookingView === "update" ? "Booking updated" : bookingView === "cancel" ? "Booking cancelled" : "Results found"} />
            {result?.ok && bookingView === "create" && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="font-bold">Booking Confirmed</span>
                  </div>
                  <div className="mt-3 space-y-2 rounded-lg bg-surface2 p-3">
                    <Row label="AWB" value="160-12345678" mono />
                    <Row label="Route" value={`${bookingForm.origin} → ${bookingForm.destination}`} />
                    <Row label="Flight" value={`${bookingForm.flight} · ${bookingForm.flightDate}`} />
                    <Row label="Weight" value={`${bookingForm.grossWeight} kg · ${bookingForm.pieces} pcs`} />
                    <Row label="Agent" value={bookingForm.customerName} />
                  </div>
                  <button type="button" onClick={() => trackFromBooking("160-12345678")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand/25 bg-brand-light py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white transition-colors">
                    <Search className="h-4 w-4" />
                    Track this AWB
                  </button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── TRACKING ────────────────────────────────────────────── */}
      {tab === "tracking" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {/* Single AWB */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-brand" />
                  Track Shipment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="AWB number">
                  <div className="flex gap-2">
                    <Input value={trackForm.awbNo} onChange={(e) => setTrackForm((f) => ({ ...f, awbNo: e.target.value }))} placeholder="16012345678" className="font-mono" />
                    <Button disabled={running || !trackForm.awbNo || !hasOperation("tracking-awb")} onClick={() => callApi("tracking-awb", { pathParams: { awbno: trackForm.awbNo } })}>
                      {running ? "…" : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                </Field>
              </CardContent>
            </Card>

            {/* Bulk track */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bulk Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="AWB numbers (comma-separated)">
                  <Textarea
                    value={trackForm.awbNos}
                    onChange={(e) => setTrackForm((f) => ({ ...f, awbNos: e.target.value }))}
                    placeholder={"16012345678, 16087654321, 16011112222"}
                    className="min-h-24 font-mono text-sm"
                  />
                </Field>
                <Button variant="outline" className="w-full" disabled={running || !trackForm.awbNos || !hasOperation("tracking-awb-list")} onClick={() => { const awbs = trackForm.awbNos.split(/[,\n\s]+/).map((s) => s.trim()).filter(Boolean); callApi("tracking-awb-list", { body: { awbNos: awbs } }); }}>
                  <Search className="h-4 w-4" />
                  {running ? "Tracking…" : `Track ${trackForm.awbNos.split(/[,\n\s]+/).filter((s) => s.trim()).length || 0} AWBs`}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tracking result */}
          <div className="space-y-4">
            <ApiResult result={result} running={running} label="Tracking result" successLabel="Shipment found" />
            {result?.ok && trackForm.awbNo && (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm font-bold text-ink">AWB {trackForm.awbNo}</p>
                      <Badge variant="default">In Transit</Badge>
                    </div>
                    <span className="text-xs text-ink-muted">via Saudia Cargo</span>
                  </div>
                  <div className="space-y-0">
                    {[
                      { done: true, time: "12 May 10:00", location: "FRA", event: "Received from agent" },
                      { done: true, time: "13 May 14:30", location: "FRA", event: "Flight departed" },
                      { done: true, time: "14 May 02:15", location: "RUH", event: "Arrived at transit hub" },
                      { done: false, time: "14 May 04:00", location: "RUH", event: "Departed transit hub" },
                      { done: false, time: "14 May 11:00", location: "JED", event: "Expected arrival" },
                    ].map((m, i, arr) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${m.done ? "border-success bg-success-bg" : "border-border-ui bg-surface2"}`}>
                            {m.done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Clock className="h-3.5 w-3.5 text-ink-muted" />}
                          </div>
                          {i < arr.length - 1 && <div className={`w-0.5 flex-1 ${m.done ? "bg-success/30" : "bg-border-ui"}`} style={{ minHeight: "24px" }} />}
                        </div>
                        <div className="pb-4">
                          <p className={`text-sm font-semibold ${m.done ? "text-ink" : "text-ink-muted"}`}>{m.event}</p>
                          <p className="text-xs text-ink-muted">{m.location} · {m.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ApiResult({ result, running, label, successLabel }: { result: ExecutionResult | null; running: boolean; label: string; successLabel: string }) {
  if (running) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <p className="text-sm font-semibold text-ink-muted">Calling ECAGROWARE…</p>
        </CardContent>
      </Card>
    );
  }
  if (!result) {
    return (
      <Card>
        <CardContent className="p-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface2">
            <ArrowRight className="h-5 w-5 text-ink-muted" />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink-muted">{label} appears here</p>
          <p className="mt-1 text-xs text-ink-muted">Fill in the form and submit</p>
        </CardContent>
      </Card>
    );
  }
  if (result.error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 rounded-lg border border-danger/25 bg-danger-bg p-3">
            <X className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <p className="text-sm font-semibold text-danger">{result.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-bold text-success">{successLabel}</p>
            <p className="text-xs text-ink-muted">
              {result.mode === "live" ? "Live response from ECAGROWARE" : "Simulated — connect credentials for live data"}
            </p>
          </div>
          {result.status && (
            <Badge variant="success" className="ml-auto">HTTP {result.status}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: "success" | "brand" | "warning" }) {
  const colors = { success: "bg-success-bg text-success", brand: "bg-brand-light text-brand", warning: "bg-warning-bg text-warning" };
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[accent]}`}>{icon}</div>
        <div>
          <p className="text-xl font-bold text-ink">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className={`text-xs font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
