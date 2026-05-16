"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, FileText, Globe2, Package, Send } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type WizardStep = 0 | 1 | 2 | 3 | 4;

type TenderWizardForm = {
  airlineName: string;
  title: string;
  region: string;
  airports: string;
  cargoTypes: string;
  expectedMonthlyTonnage: string;
  contractDuration: string;
  applicationDeadline: string;
  startDate: string;
  requiredExperience: string;
  requiredCertifications: string;
  salesExpectations: string;
  additionalNotes: string;
};

const steps = [
  { label: "Market", icon: Globe2 },
  { label: "Cargo Focus", icon: Package },
  { label: "Requirements", icon: ClipboardList },
  { label: "Commercial Expectations", icon: FileText },
  { label: "Review & Publish", icon: CheckCircle2 },
];

const initialForm: TenderWizardForm = {
  airlineName: "Saudia Cargo",
  title: "",
  region: "",
  airports: "",
  cargoTypes: "",
  expectedMonthlyTonnage: "",
  contractDuration: "",
  applicationDeadline: "",
  startDate: "",
  requiredExperience: "",
  requiredCertifications: "",
  salesExpectations: "",
  additionalNotes: "",
};

export default function CreateTenderPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<TenderWizardForm>(initialForm);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => buildPreview(form), [form]);
  const canContinue = getStepValidity(step, form);

  async function submit(status: "draft" | "open") {
    setSaving(status === "open" ? "publish" : "draft");
    setError(null);

    try {
      const regions = splitList(form.region);
      const airports = splitList(form.airports).map((airport) => airport.toUpperCase());
      const requirements = [
        ...splitList(form.requiredExperience).map((item) => `Experience: ${item}`),
        ...splitList(form.requiredCertifications).map((item) => `Certification: ${item}`),
      ];
      const commercialExpectations = [
        form.salesExpectations,
        form.contractDuration ? `Contract duration: ${form.contractDuration}` : "",
        form.additionalNotes ? `Additional notes: ${form.additionalNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
      const monthly = Number(form.expectedMonthlyTonnage) || 0;

      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          countryScope: form.region.trim(),
          regions,
          lanes: airports.length ? airports.join(", ") : form.region.trim(),
          annualTonnage: monthly * 12,
          productMix: form.cargoTypes.trim(),
          deadline: form.applicationDeadline,
          expectedStart: form.startDate,
          status,
          awardMode: "single",
          maxAwards: 1,
          commercialModel: "commission",
          requirements,
          commercialExpectations,
          routes: [],
          attachments: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Tender could not be saved");
        return;
      }

      const data = await res.json();
      router.push(`/airline/tenders/${data.tender.id}`);
    } catch {
      setError("Tender could not be saved. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Topbar title="Tender Builder" subtitle="Structured GSA tender wizard" />
      <main className="grid gap-5 p-5 xl:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Build workflow</CardTitle>
            <p className="text-sm text-ink-muted">Five steps from market scope to publish-ready preview.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = index === step;
              const done = index < step;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStep(index as WizardStep)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-brand bg-brand-light text-brand"
                      : done
                        ? "border-[#0B7A52]/20 bg-success-bg text-success"
                        : "border-border-ui bg-surface2 text-ink-muted hover:border-brand/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{index + 1}. {item.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <section className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>{steps[step].label}</CardTitle>
                  <p className="mt-1 text-sm text-ink-muted">{getStepHelper(step)}</p>
                </div>
                <Badge variant="muted">Step {step + 1} of {steps.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="airline_name">
                    <Input value={form.airlineName} onChange={(event) => update("airlineName", event.target.value)} />
                  </Field>
                  <Field label="title">
                    <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Saudi Cargo France representation" />
                  </Field>
                  <Field label="region" className="md:col-span-2">
                    <Input value={form.region} onChange={(event) => update("region", event.target.value)} placeholder="France, Benelux, DACH..." />
                  </Field>
                  <Field label="airports" className="md:col-span-2">
                    <Input value={form.airports} onChange={(event) => update("airports", event.target.value)} placeholder="CDG, LYS, JED, RUH" />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="cargo_types" className="md:col-span-2">
                    <Input value={form.cargoTypes} onChange={(event) => update("cargoTypes", event.target.value)} placeholder="pharma, perishables, general cargo, e-commerce" />
                  </Field>
                  <Field label="expected_monthly_tonnage">
                    <Input value={form.expectedMonthlyTonnage} onChange={(event) => update("expectedMonthlyTonnage", event.target.value)} type="number" placeholder="1500" />
                  </Field>
                  <Field label="contract_duration">
                    <Input value={form.contractDuration} onChange={(event) => update("contractDuration", event.target.value)} placeholder="24 months with 12-month extension option" />
                  </Field>
                  <Field label="application_deadline">
                    <Input value={form.applicationDeadline} onChange={(event) => update("applicationDeadline", event.target.value)} type="date" />
                  </Field>
                  <Field label="start_date">
                    <Input value={form.startDate} onChange={(event) => update("startDate", event.target.value)} type="date" />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="required_experience" className="md:col-span-2">
                    <Textarea value={form.requiredExperience} onChange={(event) => update("requiredExperience", event.target.value)} placeholder="10+ years cargo sales in France&#10;Existing Tier-1 forwarder relationships&#10;Airport sales presence at CDG" />
                  </Field>
                  <Field label="required_certifications" className="md:col-span-2">
                    <Textarea value={form.requiredCertifications} onChange={(event) => update("requiredCertifications", event.target.value)} placeholder="IATA CASS&#10;GDP pharma handling&#10;ISO 9001 preferred" />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <Field label="sales_expectations">
                    <Textarea value={form.salesExpectations} onChange={(event) => update("salesExpectations", event.target.value)} placeholder="Monthly sales target, account coverage, reporting rhythm, commercial proposal expectations..." />
                  </Field>
                  <Field label="additional_notes">
                    <Textarea value={form.additionalNotes} onChange={(event) => update("additionalNotes", event.target.value)} placeholder="Operational constraints, preferred launch plan, special cargo requirements..." />
                  </Field>
                </div>
              )}

              {step === 4 && <TenderPreview preview={preview} />}

              {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

              <div className="flex flex-col gap-3 border-t border-border-ui pt-5 sm:flex-row sm:justify-between">
                <Button variant="outline" disabled={step === 0 || Boolean(saving)} onClick={() => setStep((current) => Math.max(0, current - 1) as WizardStep)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {step === 4 ? (
                    <>
                      <Button variant="outline" disabled={Boolean(saving) || !form.title.trim()} onClick={() => submit("draft")}>
                        {saving === "draft" ? "Saving..." : "Save Draft"}
                      </Button>
                      <Button disabled={Boolean(saving) || !form.title.trim()} onClick={() => submit("open")}>
                        <Send className="h-4 w-4" />
                        {saving === "publish" ? "Publishing..." : "Publish Tender"}
                      </Button>
                    </>
                  ) : (
                    <Button disabled={!canContinue} onClick={() => setStep((current) => Math.min(4, current + 1) as WizardStep)}>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );

  function update(field: keyof TenderWizardForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
}

function TenderPreview({ preview }: { preview: ReturnType<typeof buildPreview> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-ui bg-surface">
      <div className="border-b border-border-ui bg-surface2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{preview.airlineName}</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">{preview.title || "Untitled tender"}</h2>
        <p className="mt-2 text-sm text-ink-muted">{preview.region || "Market not set"} - {preview.airports || "Airports not set"}</p>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <PreviewMetric label="Cargo focus" value={preview.cargoTypes || "Not set"} />
        <PreviewMetric label="Monthly tonnage" value={preview.monthlyTonnage || "Not set"} />
        <PreviewMetric label="Contract duration" value={preview.contractDuration || "Not set"} />
      </div>
      <div className="grid gap-4 border-t border-border-ui p-5 lg:grid-cols-3">
        <PreviewBlock title="Mandatory requirements" value={preview.requirements || "No mandatory requirements entered."} />
        <PreviewBlock title="Commercial expectations" value={preview.salesExpectations || "No commercial expectations entered."} />
        <PreviewBlock title="Tender intelligence summary" value={preview.intelligenceSummary} />
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-ui bg-surface2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function PreviewBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-muted">{value}</p>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function buildPreview(form: TenderWizardForm) {
  const monthlyTonnage = form.expectedMonthlyTonnage ? `${Number(form.expectedMonthlyTonnage).toLocaleString()} tons` : "";
  const intelligenceSummary = `${form.airlineName || "The airline"} is preparing a GSA tender for ${form.region || "the selected market"}. The mandate focuses on ${form.cargoTypes || "defined cargo products"} with ${monthlyTonnage || "a target monthly tonnage to be confirmed"}. Applicants should prove market coverage, airport access, sales execution, and launch readiness before award.`;
  return {
    airlineName: form.airlineName,
    title: form.title,
    region: form.region,
    airports: form.airports,
    cargoTypes: form.cargoTypes,
    monthlyTonnage,
    contractDuration: form.contractDuration,
    requirements: [form.requiredExperience, form.requiredCertifications].filter(Boolean).join("\n"),
    salesExpectations: [form.salesExpectations, form.additionalNotes].filter(Boolean).join("\n\n"),
    intelligenceSummary,
  };
}

function getStepValidity(step: WizardStep, form: TenderWizardForm) {
  if (step === 0) return Boolean(form.title.trim() && form.region.trim());
  if (step === 1) return Boolean(form.cargoTypes.trim() && form.applicationDeadline && form.startDate);
  return true;
}

function getStepHelper(step: WizardStep) {
  if (step === 0) return "Define where this GSA mandate applies and which airports matter.";
  if (step === 1) return "Set the cargo profile, monthly tonnage target, and tender timeline.";
  if (step === 2) return "Separate must-have experience and certifications from general context.";
  if (step === 3) return "Tell GSAs what a strong commercial and sales plan should prove.";
  return "Review the tender exactly as an airline team would see it before publication.";
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
