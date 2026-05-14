"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Paperclip } from "lucide-react";
import { FileDropzone, type DroppedFile } from "@/components/dashboard/file-dropzone";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TenderRouteFrequency } from "@/lib/services/tender-workflow-store";

type RouteDraft = Omit<TenderRouteFrequency, "id">;

const emptyRoute: RouteDraft = {
  origin: "",
  destination: "",
  operatingDays: "",
  frequencyPerWeek: 1,
  aircraft: "",
};

export default function CreateTenderPage() {
  const router = useRouter();
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [routes, setRoutes] = useState<RouteDraft[]>([{ ...emptyRoute }]);
  const [form, setForm] = useState({
    title: "",
    countryScope: "",
    annualTonnage: "",
    productMix: "",
    deadline: "",
    expectedStart: "",
    requirements: "",
    commercialExpectations: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(status: "draft" | "open") {
    setSaving(true);
    setError(null);

    const activeRoutes = routes
      .filter((route) => route.origin.trim() && route.destination.trim())
      .map((route, index) => ({
        ...route,
        id: `route-${index + 1}`,
        origin: route.origin.trim().toUpperCase(),
        destination: route.destination.trim().toUpperCase(),
        frequencyPerWeek: Number(route.frequencyPerWeek) || 1,
      }));
    const regions = form.countryScope
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          countryScope: form.countryScope.trim(),
          regions,
          lanes: activeRoutes.length
            ? activeRoutes.map((route) => `${route.origin}-${route.destination}`).join(", ")
            : form.countryScope.trim(),
          annualTonnage: Number(form.annualTonnage) || 0,
          productMix: form.productMix.trim(),
          deadline: form.deadline,
          expectedStart: form.expectedStart,
          status,
          requirements: form.requirements.split("\n").map((item) => item.trim()).filter(Boolean),
          commercialExpectations: form.commercialExpectations.trim(),
          routes: activeRoutes,
          attachments: files,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Tender could not be saved");
        return;
      }

      router.push("/airline/tenders");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Create tender" subtitle="Saudia Cargo" />
      <main className="p-5">
        <Card className="max-w-5xl">
          <CardHeader>
            <CardTitle>New GSA tender</CardTitle>
            <p className="text-sm text-ink-muted">
              Publish a country or lane-based request. GSAs will see open tenders in their marketplace after login.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tender title">
                <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Saudi Cargo representation Germany" />
              </Field>
              <Field label="Country / market scope">
                <Input value={form.countryScope} onChange={(event) => setForm({ ...form, countryScope: event.target.value })} placeholder="Germany, Austria, Switzerland" />
              </Field>
              <Field label="Expected annual tonnage">
                <Input value={form.annualTonnage} onChange={(event) => setForm({ ...form, annualTonnage: event.target.value })} type="number" placeholder="22000" />
              </Field>
              <Field label="Product focus">
                <Input value={form.productMix} onChange={(event) => setForm({ ...form, productMix: event.target.value })} placeholder="General cargo, pharma, express" />
              </Field>
              <Field label="Expected start">
                <Input value={form.expectedStart} onChange={(event) => setForm({ ...form, expectedStart: event.target.value })} type="date" />
              </Field>
              <Field label="Application deadline">
                <Input value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} type="date" />
              </Field>
              <Field label="Requirements" className="md:col-span-2">
                <Textarea
                  value={form.requirements}
                  onChange={(event) => setForm({ ...form, requirements: event.target.value })}
                  placeholder={"IATA / CASS capability\nLocal sales team\nMonthly KPI reporting"}
                />
              </Field>
              <Field label="Commercial expectations" className="md:col-span-2">
                <Textarea
                  value={form.commercialExpectations}
                  onChange={(event) => setForm({ ...form, commercialExpectations: event.target.value })}
                  placeholder="Describe target customers, service level, reporting, and handover expectations."
                />
              </Field>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
          <p className="text-sm font-semibold text-ink">Optional route scope</p>
          <p className="text-xs text-ink-muted">Use this only when the tender is lane-specific. Enter weekly frequency and operating days only if known.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setRoutes([...routes, { ...emptyRoute }])}>
                  <Plus className="h-4 w-4" />
                  Add route
                </Button>
              </div>
              <div className="space-y-2">
                {routes.map((route, index) => (
                  <div key={index} className="grid gap-2 rounded-lg border border-border-ui bg-surface2 p-3 md:grid-cols-[1fr_1fr_150px_1fr_1fr_auto]">
                    <Input value={route.origin} onChange={(event) => updateRoute(index, { origin: event.target.value })} placeholder="Origin, e.g. JED" />
                    <Input value={route.destination} onChange={(event) => updateRoute(index, { destination: event.target.value })} placeholder="Destination, e.g. FRA" />
                    <Input value={route.frequencyPerWeek || ""} onChange={(event) => updateRoute(index, { frequencyPerWeek: Number(event.target.value) })} type="number" min={1} max={14} placeholder="Flights / week" />
                    <Input value={route.operatingDays ?? ""} onChange={(event) => updateRoute(index, { operatingDays: event.target.value })} placeholder="Days if known, e.g. Mon/Wed/Fri" />
                    <Input value={route.aircraft ?? ""} onChange={(event) => updateRoute(index, { aircraft: event.target.value })} placeholder="Aircraft / notes" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setRoutes(routes.filter((_, itemIndex) => itemIndex !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-ink-muted" />
                <p className="text-sm font-semibold text-ink">Attachments</p>
              </div>
              <FileDropzone files={files} onChange={setFiles} hint="RFP, lane sheet, service requirements, or legal terms" />
            </section>

            {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={saving || !form.title.trim()} onClick={() => submit("open")}>
                {saving ? "Publishing..." : "Publish tender"}
              </Button>
              <Button disabled={saving || !form.title.trim()} variant="outline" onClick={() => submit("draft")}>
                Save draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );

  function updateRoute(index: number, patch: Partial<RouteDraft>) {
    setRoutes(routes.map((route, itemIndex) => (itemIndex === index ? { ...route, ...patch } : route)));
  }
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
